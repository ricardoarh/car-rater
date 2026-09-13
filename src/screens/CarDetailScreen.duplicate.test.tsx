import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { CarDetailScreen } from './CarDetailScreen';
import { ToastProvider } from '../components/ui/Toast';
import { carsRepo } from '../services/carsRepo';
import { db } from '../db/database';
import type { Car } from '../types/models';

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="where">{location.pathname}</div>;
}

async function seedCar(): Promise<Car> {
  const car = await carsRepo.create({ make: 'Lexus', model: 'LBX' }, 'saved');
  await carsRepo.setRating(car.id, 'cuteness', 5);
  await carsRepo.toggleFeature(car.id, 'heatedSeats');
  return (await carsRepo.update(car.id, {
    year: 2024,
    transmission: 'automatic',
    mileage: 12_500,
    price: 16_995,
    verdict: 'yes',
    comments: 'Way nicer inside than expected.',
  }))!;
}

function setup(car: Car) {
  render(
    <ToastProvider>
      <MemoryRouter initialEntries={[`/car/${car.id}`]}>
        <LocationProbe />
        <Routes>
          <Route path="/car/:id" element={<CarDetailScreen />} />
          <Route path="/car/:id/edit" element={<p>Edit screen</p>} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>,
  );
  return userEvent.setup();
}

describe('Duplicate Car on the car profile', () => {
  it('offers the action without competing with Edit', async () => {
    const car = await seedCar();
    setup(car);

    const duplicate = await screen.findByRole('button', { name: 'Duplicate Car' });
    expect(duplicate).toBeInTheDocument();
    // Edit is still the primary call to action; Duplicate is secondary.
    expect(screen.getByRole('button', { name: 'Edit this car' }).className).toContain(
      'btn--primary',
    );
    expect(duplicate.className).toContain('btn--secondary');
  });

  it('asks before doing anything', async () => {
    const car = await seedCar();
    const user = setup(car);

    await user.click(await screen.findByRole('button', { name: 'Duplicate Car' }));

    expect(screen.getByRole('dialog')).toHaveAccessibleName('Duplicate this car?');
    // Nothing has been created just by opening the sheet.
    expect(await db.cars.count()).toBe(1);
  });

  it('creates the copy and goes straight to editing it', async () => {
    const car = await seedCar();
    const user = setup(car);

    await user.click(await screen.findByRole('button', { name: 'Duplicate Car' }));
    await user.click(screen.getByRole('button', { name: 'Create Duplicate' }));

    await waitFor(() => expect(screen.getByText('Edit screen')).toBeInTheDocument());

    const cars = await db.cars.toArray();
    expect(cars).toHaveLength(2);
    const copy = cars.find((c) => c.id !== car.id)!;
    expect(screen.getByTestId('where').textContent).toBe(`/car/${copy.id}/edit`);
    expect(screen.getByText('Car duplicated')).toBeInTheDocument();

    // Defaults applied, original untouched.
    expect(copy.make).toBe('Lexus');
    expect(copy.ratings.cuteness).toBe(5);
    expect(copy.features).toEqual(['heatedSeats']);
    expect(copy.mileage).toBeUndefined();
    expect(copy.comments).toBe('');
    expect(copy.verdict).toBeNull();
    expect((await db.cars.get(car.id))!.mileage).toBe(12_500);
  });

  it('honours the opt-in extras', async () => {
    const car = await seedCar();
    const user = setup(car);

    await user.click(await screen.findByRole('button', { name: 'Duplicate Car' }));
    await user.click(screen.getByRole('button', { name: /^Mileage/ }));
    await user.click(screen.getByRole('button', { name: /^Price/ }));
    await user.click(screen.getByRole('button', { name: 'Create Duplicate' }));

    await waitFor(async () => expect(await db.cars.count()).toBe(2));
    const copy = (await db.cars.toArray()).find((c) => c.id !== car.id)!;
    expect(copy.mileage).toBe(12_500);
    expect(copy.price).toBe(16_995);
    // Still not the ones that were left off.
    expect(copy.comments).toBe('');
    expect(copy.verdict).toBeNull();
  });

  it('backing out changes nothing', async () => {
    const car = await seedCar();
    const user = setup(car);

    await user.click(await screen.findByRole('button', { name: 'Duplicate Car' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(await db.cars.count()).toBe(1);
    expect(screen.getByTestId('where').textContent).toBe(`/car/${car.id}`);
  });

  it('forgets last time’s choices when reopened', async () => {
    const car = await seedCar();
    const user = setup(car);

    await user.click(await screen.findByRole('button', { name: 'Duplicate Car' }));
    await user.click(screen.getByRole('button', { name: /^Photos/ }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Duplicate Car' }));
    expect(screen.getByRole('button', { name: /^Photos/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });
});
