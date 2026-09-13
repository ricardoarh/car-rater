import { describe, expect, it } from 'vitest';
import { basicsToPatch, carToBasics, emptyBasics } from './carBasics';
import { carsRepo, makeCar } from './carsRepo';

describe('carToBasics', () => {
  it('turns stored numbers into editable digit strings', () => {
    const basics = carToBasics({
      ...makeCar(),
      year: 2024,
      mileage: 12500,
      price: 16995,
      transmission: 'automatic',
    });
    expect(basics.year).toBe('2024');
    expect(basics.mileage).toBe('12500');
    expect(basics.price).toBe('16995');
    expect(basics.transmission).toBe('automatic');
  });

  it('leaves unset fields empty rather than showing a zero', () => {
    const basics = carToBasics(makeCar());
    expect(basics.year).toBe('');
    expect(basics.mileage).toBe('');
    expect(basics.price).toBe('');
    expect(basics.transmission).toBeNull();
  });

  it('shows a genuine zero as "0", not as empty', () => {
    const basics = carToBasics({ ...makeCar(), mileage: 0, price: 0 });
    expect(basics.mileage).toBe('0');
    expect(basics.price).toBe('0');
  });
});

describe('basicsToPatch', () => {
  it('converts digit strings back into numbers', () => {
    const patch = basicsToPatch({
      ...emptyBasics(),
      make: 'Lexus',
      model: 'LBX',
      year: '2024',
      mileage: '12500',
      price: '16995',
      transmission: 'manual',
    });
    expect(patch.year).toBe(2024);
    expect(patch.mileage).toBe(12500);
    expect(patch.price).toBe(16995);
    expect(patch.transmission).toBe('manual');
  });

  it('sends undefined for empty optional numbers', () => {
    const patch = basicsToPatch(emptyBasics());
    expect(patch.mileage).toBeUndefined();
    expect(patch.price).toBeUndefined();
    expect(patch.transmission).toBeUndefined();
    expect(patch.year).toBeNull();
  });

  it('trims the make and model', () => {
    const patch = basicsToPatch({ ...emptyBasics(), make: '  Mini ', model: ' Cooper ' });
    expect(patch.make).toBe('Mini');
    expect(patch.model).toBe('Cooper');
  });

  it('never includes trim, so a legacy value is left alone by an edit', () => {
    expect('trim' in basicsToPatch(emptyBasics())).toBe(false);
  });
});

describe('editing a car that still carries a legacy trim', () => {
  it('keeps the stored trim even though the form no longer has the field', async () => {
    const car = await carsRepo.create({
      make: 'Lexus',
      model: 'LBX',
      trim: 'Premium Plus',
    });

    await carsRepo.update(
      car.id,
      basicsToPatch({
        ...emptyBasics(),
        make: 'Lexus',
        model: 'LBX',
        year: '2024',
        mileage: '12500',
        price: '16995',
        transmission: 'automatic',
      }),
    );

    const stored = await carsRepo.get(car.id);
    expect(stored?.trim).toBe('Premium Plus');
    expect(stored?.mileage).toBe(12500);
    expect(stored?.price).toBe(16995);
    expect(stored?.transmission).toBe('automatic');
  });
});
