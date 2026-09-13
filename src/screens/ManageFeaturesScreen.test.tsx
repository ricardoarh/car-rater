import { describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ManageFeaturesScreen } from './ManageFeaturesScreen';
import { FeaturePreferencesProvider } from '../hooks/FeaturePreferencesProvider';
import { ToastProvider } from '../components/ui/Toast';
import { CAR_FEATURES, CAR_FEATURE_KEYS } from '../constants/features';
import { settingsRepo } from '../services/settingsRepo';
import { carsRepo } from '../services/carsRepo';
import { db } from '../db/database';

function setup() {
  render(
    <ToastProvider>
      <FeaturePreferencesProvider>
        <MemoryRouter initialEntries={['/more/features']}>
          <ManageFeaturesScreen />
        </MemoryRouter>
      </FeaturePreferencesProvider>
    </ToastProvider>,
  );
  return userEvent.setup();
}

const rowLabels = () =>
  screen
    .getAllByRole('listitem')
    .map((li) => within(li).getByRole('button', { name: /^Move .* up$/ }))
    .map((b) => b.getAttribute('aria-label')!.replace(/^Move /, '').replace(/ up$/, ''));

describe('Manage Features', () => {
  it('lists every built-in feature in the shipped order to begin with', async () => {
    setup();
    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(9));
    expect(rowLabels()).toEqual(CAR_FEATURES.map((f) => f.shortLabel));
  });

  it('gives every row a keyboard-operable alternative to dragging', async () => {
    setup();
    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(9));

    // Real, named buttons — the drag handle is decoration, not the only route.
    expect(screen.getByRole('button', { name: 'Move Heated Seats down' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Move Heated Seats up' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move Climate Control down' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Remove Digital Dash' })).toBeInTheDocument();
  });

  it('moves a feature down and persists it', async () => {
    const user = setup();
    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(9));

    await user.click(screen.getByRole('button', { name: 'Move Heated Seats down' }));

    await waitFor(() =>
      expect(rowLabels().slice(0, 2)).toEqual(['CarPlay / Android Auto', 'Heated Seats']),
    );
    expect((await settingsRepo.activeFeatureOrder()).slice(0, 2)).toEqual([
      'carplayAndroidAuto',
      'heatedSeats',
    ]);
  });

  it('asks before removing, and says plainly that saved cars keep the information', async () => {
    const user = setup();
    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(9));

    await user.click(screen.getByRole('button', { name: 'Remove Digital Dash' }));

    expect(
      screen.getAllByRole('heading', { name: /Remove Digital Dash/ }).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByText(/Existing cars that already have it recorded will keep that information/i),
    ).toBeInTheDocument();
  });

  it('removing a feature leaves the cars that recorded it completely alone', async () => {
    const car = await carsRepo.create({ make: 'Lexus', model: 'LBX' }, 'saved');
    await carsRepo.toggleFeature(car.id, 'digitalDash');
    await carsRepo.toggleFeature(car.id, 'heatedSeats');

    const user = setup();
    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(9));

    await user.click(screen.getByRole('button', { name: 'Remove Digital Dash' }));
    await user.click(screen.getByRole('button', { name: 'Remove' }));

    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(8));
    expect(rowLabels()).not.toContain('Digital Dash');

    const stored = await db.cars.get(car.id);
    expect(stored!.features).toEqual(['heatedSeats', 'digitalDash']);
  });

  it('offers a way back, and restoring defaults does not touch cars', async () => {
    const car = await carsRepo.create({ make: 'Lexus', model: 'LBX' }, 'saved');
    await carsRepo.toggleFeature(car.id, 'digitalDash');
    await settingsRepo.removeFeature('digitalDash');
    await settingsRepo.removeFeature('heatedSeats');

    const user = setup();
    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(7));

    await user.click(screen.getByRole('button', { name: /Restore default features/ }));
    await user.click(screen.getByRole('button', { name: 'Restore' }));

    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(9));
    expect(await settingsRepo.activeFeatureOrder()).toEqual([...CAR_FEATURE_KEYS]);
    expect((await db.cars.get(car.id))!.features).toEqual(['digitalDash']);
  });

  it('disables Restore while nothing has been customised', async () => {
    setup();
    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(9));
    expect(screen.getByRole('button', { name: /Restore default features/ })).toBeDisabled();
  });

  it('explains itself rather than going blank when every feature is removed', async () => {
    for (const key of CAR_FEATURE_KEYS) await settingsRepo.removeFeature(key);

    setup();
    await waitFor(() =>
      expect(screen.getByText(/You’ve removed every feature/)).toBeInTheDocument(),
    );
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
    expect(screen.getByRole('button', { name: /Restore default features/ })).toBeEnabled();
  });

  it('survives rapid-fire taps without losing any of them', async () => {
    const user = setup();
    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(9));

    await user.click(screen.getByRole('button', { name: 'Move Heated Seats down' }));
    await user.click(screen.getByRole('button', { name: 'Remove Digital Dash' }));
    await user.click(screen.getByRole('button', { name: 'Remove' }));
    await user.click(screen.getByRole('button', { name: 'Move Climate Control up' }));

    await waitFor(async () => {
      const order = await settingsRepo.activeFeatureOrder();
      expect(order).toHaveLength(8);
      expect(order).not.toContain('digitalDash');
      expect(order.slice(0, 2)).toEqual(['carplayAndroidAuto', 'heatedSeats']);
      expect(order[order.length - 2]).toBe('climateControl');
    });
  });
});
