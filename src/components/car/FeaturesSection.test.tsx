import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FeatureChips, FeaturesSection } from './FeaturesSection';
import { makeCar } from '../../services/carsRepo';
import { CAR_FEATURES, CAR_FEATURE_BY_KEY } from '../../constants/features';
import type { CarFeature } from '../../constants/features';
import { FeaturePreferencesContext } from '../../hooks/feature-preferences-context';
import type { Car, CarFeatureKey } from '../../types/models';

function build(patch: Partial<Car> = {}): Car {
  return { ...makeCar(), ...patch };
}

function setup(patch: Partial<Car> = {}) {
  const handlers = {
    onToggle: vi.fn(),
    onAddCustom: vi.fn(),
    onRenameCustom: vi.fn(),
    onRemoveCustom: vi.fn(),
  };
  render(<FeaturesSection car={build(patch)} {...handlers} />);
  return { ...handlers, user: userEvent.setup() };
}

describe('FeaturesSection', () => {
  it('offers exactly the nine built-in features', () => {
    setup();
    const chips = screen
      .getAllByRole('button')
      .filter((b) => b.hasAttribute('aria-pressed'));
    expect(chips).toHaveLength(9);
    expect(chips.map((c) => c.textContent)).toEqual(
      CAR_FEATURES.map((f) => f.shortLabel),
    );
  });

  it('uses real buttons that expose pressed state, not colour alone', () => {
    setup({ features: ['heatedSeats'] });
    const on = screen.getByRole('button', { name: 'Heated Seats' });
    expect(on.tagName).toBe('BUTTON');
    expect(on).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Cruise Control' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('carries the full meaning as a tooltip where the chip is abbreviated', () => {
    setup();
    expect(
      screen.getByRole('button', { name: 'CarPlay / Android Auto' }),
    ).toHaveAttribute('title', 'Apple CarPlay / Android Auto');
  });

  it('toggles a feature on tap', async () => {
    const { onToggle, user } = setup();
    await user.click(screen.getByRole('button', { name: 'Parking Sensors' }));
    expect(onToggle).toHaveBeenCalledWith('parkingSensors');
  });

  it('toggles the same feature off again', async () => {
    const { onToggle, user } = setup({ features: ['parkingSensors'] });
    await user.click(screen.getByRole('button', { name: 'Parking Sensors' }));
    expect(onToggle).toHaveBeenCalledWith('parkingSensors');
  });

  it('is keyboard operable', async () => {
    const { onToggle, user } = setup();
    screen.getByRole('button', { name: 'Heated Seats' }).focus();
    await user.keyboard('{Enter}');
    expect(onToggle).toHaveBeenCalledWith('heatedSeats');
    await user.keyboard(' ');
    expect(onToggle).toHaveBeenCalledTimes(2);
  });

  it('shows a checkmark on selected chips only', () => {
    const { container } = render(
      <FeaturesSection
        car={build({ features: ['heatedSeats'] })}
        onToggle={() => {}}
        onAddCustom={() => {}}
        onRenameCustom={() => {}}
        onRemoveCustom={() => {}}
      />,
    );
    const selected = screen.getByRole('button', { name: 'Heated Seats' });
    const unselected = screen.getByRole('button', { name: 'Digital Dash' });
    expect(selected.querySelector('svg')).not.toBeNull();
    expect(unselected.querySelector('svg')).toBeNull();
    expect(container.querySelectorAll('.feature-chip.is-on')).toHaveLength(1);
  });

  describe('custom features', () => {
    it('adds one through the sheet', async () => {
      const { onAddCustom, user } = setup();
      await user.click(screen.getByRole('button', { name: /Add custom feature/ }));
      await user.type(screen.getByLabelText('What does it have?'), 'Panoramic Roof');
      await user.click(screen.getByRole('button', { name: 'Add' }));
      expect(onAddCustom).toHaveBeenCalledWith('Panoramic Roof');
    });

    it('will not add a blank name', async () => {
      const { onAddCustom, user } = setup();
      await user.click(screen.getByRole('button', { name: /Add custom feature/ }));
      expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled();
      expect(onAddCustom).not.toHaveBeenCalled();
    });

    it('lists existing custom features as selected chips', () => {
      render(
        <FeaturesSection
          car={build({ customFeatures: ['Panoramic Roof', 'Premium Sound'] })}
          onToggle={() => {}}
          onAddCustom={() => {}}
          onRenameCustom={() => {}}
          onRemoveCustom={() => {}}
        />,
      );
      const list = screen.getByRole('list', { name: 'Custom features' });
      expect(within(list).getAllByRole('listitem')).toHaveLength(2);
      expect(within(list).getByText('Panoramic Roof')).toBeInTheDocument();
    });

    it('removes one', async () => {
      const { onRemoveCustom, user } = setup({ customFeatures: ['Panoramic Roof'] });
      await user.click(screen.getByRole('button', { name: 'Remove Panoramic Roof' }));
      expect(onRemoveCustom).toHaveBeenCalledWith('Panoramic Roof');
    });

    it('renames one', async () => {
      const { onRenameCustom, user } = setup({ customFeatures: ['Premium Sound'] });
      await user.click(screen.getByRole('button', { name: 'Premium Sound — rename' }));
      const input = screen.getByLabelText('What does it have?');
      await user.clear(input);
      await user.type(input, 'Harman Kardon');
      await user.click(screen.getByRole('button', { name: 'Rename' }));
      expect(onRenameCustom).toHaveBeenCalledWith('Premium Sound', 'Harman Kardon');
    });

    it('stops offering more once the cap is reached', () => {
      setup({
        customFeatures: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'],
      });
      expect(screen.queryByRole('button', { name: /Add custom feature/ })).toBeNull();
    });
  });
});

describe('FeatureChips (read-only)', () => {
  it('shows only the features the car actually has', () => {
    render(<FeatureChips car={build({ features: ['heatedSeats', 'digitalDash'] })} />);
    expect(screen.getByText('Heated Seats')).toBeInTheDocument();
    expect(screen.getByText('Digital Dash')).toBeInTheDocument();
    expect(screen.queryByText('Cruise Control')).not.toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('includes custom features in the same section', () => {
    render(
      <FeatureChips
        car={build({ features: ['heatedSeats'], customFeatures: ['Panoramic Roof'] })}
      />,
    );
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('Panoramic Roof')).toBeInTheDocument();
  });

  it('says so plainly when nothing is recorded', () => {
    render(<FeatureChips car={build()} />);
    expect(screen.getByText('No features recorded.')).toBeInTheDocument();
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
  });
});

/*
 * With a customised checklist. The user has removed Digital Dash and Climate
 * Control and moved Cruise Control to the top; a car rated earlier still has
 * Digital Dash against it.
 */
const CUSTOM: CarFeature[] = [
  'cruiseControl',
  'heatedSeats',
  'carplayAndroidAuto',
  'reversingCamera',
  'parkingSensors',
  'keylessEntryStart',
  'automaticLightsWipers',
].map((key) => CAR_FEATURE_BY_KEY[key as CarFeatureKey]);

function withPrefs(ui: React.ReactNode) {
  return render(
    <FeaturePreferencesContext.Provider
      value={{
        activeFeatures: CUSTOM,
        activeOrder: CUSTOM.map((f) => f.key),
        ready: true,
      }}
    >
      {ui}
    </FeaturePreferencesContext.Provider>,
  );
}

describe('a customised feature checklist', () => {
  it('offers only the active features, in the user’s order', () => {
    withPrefs(
      <FeaturesSection
        car={build()}
        onToggle={vi.fn()}
        onAddCustom={vi.fn()}
        onRenameCustom={vi.fn()}
        onRemoveCustom={vi.fn()}
      />,
    );
    const chips = screen
      .getAllByRole('button')
      .filter((b) => b.hasAttribute('aria-pressed'));
    expect(chips).toHaveLength(7);
    expect(chips[0]).toHaveAccessibleName('Cruise Control');
    expect(
      screen.queryByRole('button', { name: 'Digital Dash' }),
    ).not.toBeInTheDocument();
  });

  it('still shows a retired selection on the car’s profile', () => {
    withPrefs(
      <FeatureChips
        car={build({ features: ['heatedSeats', 'digitalDash'], customFeatures: ['Tow Bar'] })}
      />,
    );
    expect(screen.getByText('Heated Seats')).toBeInTheDocument();
    expect(screen.getByText('Digital Dash')).toBeInTheDocument();
    expect(screen.getByText('Tow Bar')).toBeInTheDocument();
    // …and says why it is not on the checklist, for anyone not seeing colour.
    expect(screen.getByText(/no longer on your checklist/)).toBeInTheDocument();
  });

  it('does not claim a car has nothing when all it has is retired', () => {
    withPrefs(<FeatureChips car={build({ features: ['digitalDash'] })} />);
    expect(screen.queryByText('No features recorded.')).not.toBeInTheDocument();
    expect(screen.getByText('Digital Dash')).toBeInTheDocument();
  });
});
