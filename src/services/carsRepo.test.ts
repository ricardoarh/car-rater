import { describe, expect, it } from 'vitest';
import { carsRepo, makeCar } from './carsRepo';
import { db } from '../db/database';
import { CAR_FEATURE_KEYS, MAX_CUSTOM_FEATURES } from '../constants/features';
import type { DealbreakerReason } from '../types/models';

describe('carsRepo', () => {
  it('adds a car and reads it back', async () => {
    const car = await carsRepo.create({ make: 'Lexus', model: 'LBX', trim: 'Premium Plus' });
    const stored = await carsRepo.get(car.id);
    expect(stored?.make).toBe('Lexus');
    expect(stored?.model).toBe('LBX');
    expect(stored?.trim).toBe('Premium Plus');
    expect(stored?.status).toBe('draft');
    expect(stored?.overallScore).toBeNull();
  });

  it('trims whitespace from the basics', async () => {
    const car = await carsRepo.create({ make: '  Mini ', model: ' Cooper ' });
    expect(car.make).toBe('Mini');
    expect(car.model).toBe('Cooper');
  });

  it('updates a car and bumps updatedAt', async () => {
    const car = await carsRepo.create({ make: 'Audi', model: 'Q2' });
    const before = car.updatedAt;
    await new Promise((r) => setTimeout(r, 2));
    const updated = await carsRepo.update(car.id, { trim: 'S line' });
    expect(updated?.trim).toBe('S line');
    expect(updated!.updatedAt).toBeGreaterThanOrEqual(before);
  });

  it('recalculates the overall score whenever a rating changes', async () => {
    const car = await carsRepo.create({ make: 'Lexus', model: 'LBX' });
    await carsRepo.setRating(car.id, 'cuteness', 5);
    await carsRepo.setRating(car.id, 'comfyness', 5);
    await carsRepo.setRating(car.id, 'techonologia', 4);
    await carsRepo.setRating(car.id, 'vroomFactor', 3);
    await carsRepo.setRating(car.id, 'rioApproved', 5);
    await carsRepo.setRating(car.id, 'unexpectedFactor', 4);
    let stored = await carsRepo.get(car.id);
    expect(stored?.ratingIncomplete).toBe(true);

    await carsRepo.setRating(car.id, 'value', 4);
    stored = await carsRepo.get(car.id);
    expect(stored?.overallScore).toBe(4.3);
    expect(stored?.ratingIncomplete).toBe(false);
  });

  it('clears a rating back to null', async () => {
    const car = await carsRepo.create({ make: 'Mini', model: 'Cooper' });
    await carsRepo.setRating(car.id, 'cuteness', 5);
    expect((await carsRepo.get(car.id))?.overallScore).toBe(5);
    await carsRepo.setRating(car.id, 'cuteness', null);
    expect((await carsRepo.get(car.id))?.overallScore).toBeNull();
  });

  it('stores each verdict', async () => {
    for (const verdict of ['yes', 'maybe', 'no'] as const) {
      const car = await carsRepo.create({ make: 'X', model: verdict });
      await carsRepo.update(car.id, { verdict });
      expect((await carsRepo.get(car.id))?.verdict).toBe(verdict);
    }
  });

  it('stores dealbreakers with multiple reasons and can turn them off again', async () => {
    const car = await carsRepo.create({ make: 'Audi', model: 'Q2' });
    const reasons: DealbreakerReason[] = ['rio', 'comfort', 'other'];
    await carsRepo.update(car.id, {
      dealbreaker: true,
      dealbreakerReasons: reasons,
      dealbreakerComment: 'Boot lip is far too high',
    });
    let stored = await carsRepo.get(car.id);
    expect(stored?.dealbreaker).toBe(true);
    expect(stored?.dealbreakerReasons).toEqual(reasons);
    expect(stored?.dealbreakerComment).toBe('Boot lip is far too high');

    await carsRepo.update(car.id, { dealbreaker: false, dealbreakerReasons: [] });
    stored = await carsRepo.get(car.id);
    expect(stored?.dealbreaker).toBe(false);
    expect(stored?.dealbreakerReasons).toEqual([]);
  });

  it('a dealbreaker does not change the overall score', async () => {
    const car = await carsRepo.create({ make: 'Audi', model: 'Q2' });
    await carsRepo.setRating(car.id, 'cuteness', 4);
    const before = (await carsRepo.get(car.id))?.overallScore;
    await carsRepo.update(car.id, { dealbreaker: true });
    expect((await carsRepo.get(car.id))?.overallScore).toBe(before);
  });

  it('deletes a car along with its photos', async () => {
    const car = await carsRepo.create({ make: 'Mini', model: 'Countryman' });
    await db.photos.add({
      id: 'p1',
      carId: car.id,
      blob: new Blob(['x']),
      thumb: new Blob(['x']),
      width: 10,
      height: 10,
      caption: '',
      order: 0,
      createdAt: Date.now(),
    });
    await carsRepo.remove(car.id);
    expect(await carsRepo.get(car.id)).toBeUndefined();
    expect(await db.photos.where('carId').equals(car.id).count()).toBe(0);
  });

  describe('drafts', () => {
    it('finalise promotes a draft to saved', async () => {
      const car = await carsRepo.create({ make: 'Lexus', model: 'LBX' });
      expect(await carsRepo.count()).toBe(0);
      await carsRepo.finalise(car.id);
      expect((await carsRepo.get(car.id))?.status).toBe('saved');
      expect(await carsRepo.count()).toBe(1);
    });

    it('restores the most recent draft', async () => {
      await carsRepo.create({ make: 'Old', model: 'One' });
      await new Promise((r) => setTimeout(r, 3));
      const newer = await carsRepo.create({ make: 'New', model: 'Two' });
      expect((await carsRepo.latestDraft())?.id).toBe(newer.id);
    });

    it('prunes empty drafts so duplicates never pile up', async () => {
      await carsRepo.create({});
      await carsRepo.create({});
      const keep = await carsRepo.create({ make: 'Lexus', model: 'LBX' });
      const removed = await carsRepo.pruneEmptyDrafts(keep.id);
      expect(removed).toBe(2);
      const drafts = await db.cars.where('status').equals('draft').toArray();
      expect(drafts).toHaveLength(1);
      expect(drafts[0].id).toBe(keep.id);
    });

    it('never prunes a draft that has content', async () => {
      const rated = await carsRepo.create({});
      await carsRepo.setRating(rated.id, 'cuteness', 4);
      expect(await carsRepo.pruneEmptyDrafts()).toBe(0);
    });

    it('keeps autosaved progress across a simulated reopen', async () => {
      const car = await carsRepo.create({ make: 'Lexus', model: 'LBX' });
      await carsRepo.setRating(car.id, 'rioApproved', 5);
      await carsRepo.update(car.id, { comments: 'Rio fits easily' });

      // Simulate the app being closed and reopened.
      db.close();
      await db.open();

      const restored = await carsRepo.latestDraft();
      expect(restored?.id).toBe(car.id);
      expect(restored?.ratings.rioApproved).toBe(5);
      expect(restored?.comments).toBe('Rio fits easily');
    });
  });

  describe('mileage, price and transmission', () => {
    it('saves and reads back the new optional fields', async () => {
      const car = await carsRepo.create({ make: 'Lexus', model: 'LBX' });
      await carsRepo.update(car.id, {
        mileage: 12500,
        price: 16995,
        transmission: 'automatic',
      });
      const stored = await carsRepo.get(car.id);
      expect(stored?.mileage).toBe(12500);
      expect(stored?.price).toBe(16995);
      expect(stored?.transmission).toBe('automatic');
    });

    it('stores both transmissions', async () => {
      for (const transmission of ['automatic', 'manual'] as const) {
        const car = await carsRepo.create({ make: 'X', model: transmission });
        await carsRepo.update(car.id, { transmission });
        expect((await carsRepo.get(car.id))?.transmission).toBe(transmission);
      }
    });

    it('returns transmission to unset', async () => {
      const car = await carsRepo.create({ make: 'Mini', model: 'Cooper' });
      await carsRepo.update(car.id, { transmission: 'manual' });
      expect((await carsRepo.get(car.id))?.transmission).toBe('manual');
      await carsRepo.update(car.id, { transmission: undefined });
      expect((await carsRepo.get(car.id))?.transmission).toBeUndefined();
    });

    it('clears mileage and price back to unset', async () => {
      const car = await carsRepo.create({ make: 'Audi', model: 'Q2' });
      await carsRepo.update(car.id, { mileage: 42000, price: 22500 });
      await carsRepo.update(car.id, { mileage: undefined, price: undefined });
      const stored = await carsRepo.get(car.id);
      expect(stored?.mileage).toBeUndefined();
      expect(stored?.price).toBeUndefined();
    });

    it('keeps a mileage of zero, which is a real reading', async () => {
      const car = await carsRepo.create({ make: 'BYD', model: 'Dolphin' });
      await carsRepo.update(car.id, { mileage: 0 });
      expect((await carsRepo.get(car.id))?.mileage).toBe(0);
    });

    it('none of the new fields touch the overall score', async () => {
      const car = await carsRepo.create({ make: 'Lexus', model: 'LBX' });
      await carsRepo.setRating(car.id, 'cuteness', 4);
      const before = (await carsRepo.get(car.id))?.overallScore;
      await carsRepo.update(car.id, {
        mileage: 90000,
        price: 4995,
        transmission: 'manual',
      });
      expect((await carsRepo.get(car.id))?.overallScore).toBe(before);
    });

    it('a new car starts with all three unset', async () => {
      const car = await carsRepo.create({ make: 'Kia', model: 'EV3' });
      expect(car.mileage).toBeUndefined();
      expect(car.price).toBeUndefined();
      expect(car.transmission).toBeUndefined();
    });
  });

  describe('features', () => {
    it('selects and deselects a built-in feature', async () => {
      const car = await carsRepo.create({ make: 'Lexus', model: 'LBX' });
      await carsRepo.toggleFeature(car.id, 'heatedSeats');
      expect((await carsRepo.get(car.id))?.features).toEqual(['heatedSeats']);
      await carsRepo.toggleFeature(car.id, 'heatedSeats');
      expect((await carsRepo.get(car.id))?.features).toEqual([]);
    });

    it('stores features in config order however they were tapped', async () => {
      const car = await carsRepo.create({ make: 'Lexus', model: 'LBX' });
      await carsRepo.toggleFeature(car.id, 'climateControl');
      await carsRepo.toggleFeature(car.id, 'heatedSeats');
      expect((await carsRepo.get(car.id))?.features).toEqual([
        'heatedSeats',
        'climateControl',
      ]);
    });

    it('survives closing and reopening the database', async () => {
      const car = await carsRepo.create({ make: 'Lexus', model: 'LBX' });
      await carsRepo.toggleFeature(car.id, 'parkingSensors');
      await carsRepo.addCustomFeature(car.id, 'Panoramic Roof');

      db.close();
      await db.open();

      const restored = await carsRepo.get(car.id);
      expect(restored?.features).toEqual(['parkingSensors']);
      expect(restored?.customFeatures).toEqual(['Panoramic Roof']);
    });

    it('adds, renames and removes a custom feature', async () => {
      const car = await carsRepo.create({ make: 'Mini', model: 'Cooper' });
      await carsRepo.addCustomFeature(car.id, 'Panoramic Roof');
      await carsRepo.addCustomFeature(car.id, 'Premium Sound');
      expect((await carsRepo.get(car.id))?.customFeatures).toEqual([
        'Panoramic Roof',
        'Premium Sound',
      ]);

      await carsRepo.renameCustomFeature(car.id, 'Premium Sound', 'Harman Kardon');
      expect((await carsRepo.get(car.id))?.customFeatures).toEqual([
        'Panoramic Roof',
        'Harman Kardon',
      ]);

      await carsRepo.removeCustomFeature(car.id, 'Panoramic Roof');
      expect((await carsRepo.get(car.id))?.customFeatures).toEqual(['Harman Kardon']);
    });

    it('ignores a blank custom feature and refuses a duplicate', async () => {
      const car = await carsRepo.create({ make: 'Audi', model: 'Q2' });
      await carsRepo.addCustomFeature(car.id, '   ');
      expect((await carsRepo.get(car.id))?.customFeatures ?? []).toEqual([]);

      await carsRepo.addCustomFeature(car.id, '360 Camera');
      await carsRepo.addCustomFeature(car.id, '360 camera');
      expect((await carsRepo.get(car.id))?.customFeatures).toEqual(['360 Camera']);
    });

    it('caps the number of custom features', async () => {
      const car = await carsRepo.create({ make: 'Audi', model: 'A1' });
      for (let i = 0; i < MAX_CUSTOM_FEATURES + 4; i += 1) {
        await carsRepo.addCustomFeature(car.id, `Extra ${i}`);
      }
      expect((await carsRepo.get(car.id))?.customFeatures).toHaveLength(
        MAX_CUSTOM_FEATURES,
      );
    });

    it('editing an existing saved car keeps everything else intact', async () => {
      const car = await carsRepo.create(
        { make: 'Lexus', model: 'LBX', trim: 'Premium Plus' },
        'saved',
      );
      await carsRepo.setRating(car.id, 'cuteness', 5);
      await carsRepo.update(car.id, {
        verdict: 'yes',
        comments: 'Rio fits easily',
        mileage: 12500,
      });
      await carsRepo.toggleFeature(car.id, 'digitalDash');

      const stored = await carsRepo.get(car.id);
      expect(stored?.features).toEqual(['digitalDash']);
      expect(stored?.ratings.cuteness).toBe(5);
      expect(stored?.verdict).toBe('yes');
      expect(stored?.comments).toBe('Rio fits easily');
      expect(stored?.mileage).toBe(12500);
      expect(stored?.trim).toBe('Premium Plus');
    });

    it('features never touch the overall score', async () => {
      const car = await carsRepo.create({ make: 'Lexus', model: 'LBX' });
      await carsRepo.setRating(car.id, 'cuteness', 4);
      const before = await carsRepo.get(car.id);
      for (const key of CAR_FEATURE_KEYS) {
        await carsRepo.toggleFeature(car.id, key);
      }
      await carsRepo.addCustomFeature(car.id, 'Panoramic Roof');
      const after = await carsRepo.get(car.id);
      expect(after?.features).toHaveLength(9);
      expect(after?.overallScore).toBe(before?.overallScore);
      expect(after?.ratingIncomplete).toBe(before?.ratingIncomplete);
    });

    it('a car created today has no feature lists at all', async () => {
      const car = await carsRepo.create({ make: 'Kia', model: 'EV3' });
      expect(car.features).toBeUndefined();
      expect(car.customFeatures).toBeUndefined();
    });
  });

  it('does not lose a field when two autosaves overlap', async () => {
    // Tapping a star and typing in a field back-to-back fires two
    // read-modify-writes at once; neither may clobber the other.
    const car = await carsRepo.create({ make: 'Lexus', model: 'LBX' });
    await Promise.all([
      carsRepo.update(car.id, { euroNcapStars: 5 }),
      carsRepo.update(car.id, { euroNcapYear: 2024 }),
      carsRepo.update(car.id, { headachePotential: 'low' }),
      carsRepo.setRating(car.id, 'cuteness', 5),
    ]);
    const stored = await carsRepo.get(car.id);
    expect(stored?.euroNcapStars).toBe(5);
    expect(stored?.euroNcapYear).toBe(2024);
    expect(stored?.headachePotential).toBe('low');
    expect(stored?.ratings.cuteness).toBe(5);
  });

  it('does not lose transmission, mileage or price when saves overlap', async () => {
    // The scenario from the brief: tap Automatic, type a mileage, type a price
    // and tap a star, all faster than any one write can complete.
    const car = await carsRepo.create({ make: 'Lexus', model: 'LBX', trim: 'Premium Plus' });
    await Promise.all([
      carsRepo.update(car.id, { transmission: 'automatic' }),
      carsRepo.update(car.id, { mileage: 12500 }),
      carsRepo.update(car.id, { price: 16995 }),
      carsRepo.update(car.id, { year: 2024 }),
      carsRepo.setRating(car.id, 'rioApproved', 5),
      carsRepo.update(car.id, { comments: 'Rio fits easily' }),
    ]);

    const stored = await carsRepo.get(car.id);
    expect(stored?.transmission).toBe('automatic');
    expect(stored?.mileage).toBe(12500);
    expect(stored?.price).toBe(16995);
    expect(stored?.year).toBe(2024);
    expect(stored?.ratings.rioApproved).toBe(5);
    expect(stored?.comments).toBe('Rio fits easily');
    // And the legacy value nobody is editing any more is still intact.
    expect(stored?.trim).toBe('Premium Plus');
  });

  it('keeps every rapid feature tap, even mixed with other edits', async () => {
    // The scenario from the brief: four chips and two other fields, all tapped
    // faster than any single write can complete.
    const car = await carsRepo.create({ make: 'Lexus', model: 'LBX' });
    await Promise.all([
      carsRepo.toggleFeature(car.id, 'heatedSeats'),
      carsRepo.toggleFeature(car.id, 'parkingSensors'),
      carsRepo.toggleFeature(car.id, 'cruiseControl'),
      carsRepo.toggleFeature(car.id, 'climateControl'),
      carsRepo.addCustomFeature(car.id, 'Panoramic Roof'),
      carsRepo.update(car.id, { mileage: 12500 }),
      carsRepo.setRating(car.id, 'rioApproved', 5),
    ]);

    const stored = await carsRepo.get(car.id);
    expect(stored?.features).toEqual([
      'heatedSeats',
      'parkingSensors',
      'cruiseControl',
      'climateControl',
    ]);
    expect(stored?.customFeatures).toEqual(['Panoramic Roof']);
    expect(stored?.mileage).toBe(12500);
    expect(stored?.ratings.rioApproved).toBe(5);
  });

  it('survives tapping the same chip repeatedly', async () => {
    const car = await carsRepo.create({ make: 'Mini', model: 'Cooper' });
    // An odd number of toggles must leave it on, an even number off.
    await Promise.all(
      Array.from({ length: 7 }, () => carsRepo.toggleFeature(car.id, 'digitalDash')),
    );
    expect((await carsRepo.get(car.id))?.features).toEqual(['digitalDash']);
  });

  it('clears everything', async () => {
    await carsRepo.create({ make: 'A', model: 'B' }, 'saved');
    await carsRepo.clearAll();
    expect(await carsRepo.all()).toHaveLength(0);
  });

  it('makeCar produces a complete, empty record', () => {
    const car = makeCar();
    expect(Object.values(car.ratings).every((v) => v === null)).toBe(true);
    expect(car.headachePotential).toBe('unknown');
    expect(car.euroNcapStars).toBeNull();
    expect(car.verdict).toBeNull();
    expect(car.coverPhotoId).toBeNull();
    expect(car.ratingIncomplete).toBe(true);
  });
});
