import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DuplicateSheet } from './DuplicateSheet';
import { makeCar } from '../../services/carsRepo';
import { DEFAULT_DUPLICATE_OPTIONS } from '../../services/duplicateService';
import type { Car } from '../../types/models';

function build(patch: Partial<Car> = {}): Car {
  return { ...makeCar({ make: 'Lexus', model: 'LBX' }), ...patch };
}

function setup(patch: Partial<Car> = {}, busy = false) {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  render(
    <DuplicateSheet
      open
      car={build(patch)}
      busy={busy}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />,
  );
  return { onConfirm, onCancel, user: userEvent.setup() };
}

const OPTION_NAMES = ['Mileage', 'Price', 'Photos', 'Comments', 'Verdict / Dealbreaker'];

describe('the duplicate sheet', () => {
  it('says what it is about to do', () => {
    setup();
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Duplicate this car?');
    expect(
      screen.getByText('Create a new car using this one as a starting point.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Lexus LBX')).toBeInTheDocument();
  });

  it('offers exactly the five extras, all off', () => {
    setup();
    const options = screen
      .getAllByRole('button')
      .filter((b) => b.hasAttribute('aria-pressed'));
    expect(options.map((o) => o.textContent?.split('Usually')[0].trim())).toHaveLength(5);
    for (const name of OPTION_NAMES) {
      expect(screen.getByRole('button', { name: new RegExp(`^${name.replace(/\//g, '\\/')}`) }))
        .toHaveAttribute('aria-pressed', 'false');
    }
  });

  it('exposes them as one labelled group', () => {
    setup();
    expect(screen.getByRole('group', { name: 'Copy these too' })).toBeInTheDocument();
  });

  it('confirms with nothing selected by default', async () => {
    const { onConfirm, user } = setup();
    await user.click(screen.getByRole('button', { name: 'Create Duplicate' }));
    expect(onConfirm).toHaveBeenCalledWith(DEFAULT_DUPLICATE_OPTIONS);
  });

  it('passes only the extras the user turned on', async () => {
    const { onConfirm, user } = setup();
    await user.click(screen.getByRole('button', { name: /^Photos/ }));
    await user.click(screen.getByRole('button', { name: /^Mileage/ }));
    await user.click(screen.getByRole('button', { name: 'Create Duplicate' }));

    expect(onConfirm).toHaveBeenCalledWith({
      mileage: true,
      price: false,
      photos: true,
      comments: false,
      verdict: false,
    });
  });

  it('a second tap turns an extra back off', async () => {
    const { onConfirm, user } = setup();
    const photos = screen.getByRole('button', { name: /^Photos/ });
    await user.click(photos);
    expect(photos).toHaveAttribute('aria-pressed', 'true');
    await user.click(photos);
    expect(photos).toHaveAttribute('aria-pressed', 'false');
    await user.click(screen.getByRole('button', { name: 'Create Duplicate' }));
    expect(onConfirm).toHaveBeenCalledWith(DEFAULT_DUPLICATE_OPTIONS);
  });

  it('is operable from the keyboard alone', async () => {
    const { onConfirm, user } = setup();
    // The sheet moves focus to its first control shortly after opening; let
    // that happen before driving the keyboard, or it lands mid-test.
    await waitFor(() => expect(document.activeElement).not.toBe(document.body));

    const photos = screen.getByRole('button', { name: /^Photos/ });
    photos.focus();
    await user.keyboard(' ');
    expect(photos).toHaveAttribute('aria-pressed', 'true');

    const confirm = screen.getByRole('button', { name: 'Create Duplicate' });
    confirm.focus();
    expect(confirm).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(onConfirm).toHaveBeenCalledWith({ ...DEFAULT_DUPLICATE_OPTIONS, photos: true });
  });

  it('can be cancelled', async () => {
    const { onCancel, onConfirm, user } = setup();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('locks the controls while a duplication is in flight', () => {
    setup({}, true);
    expect(screen.getByRole('button', { name: 'Duplicating…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(screen.getByRole('button', { name: /^Photos/ })).toBeDisabled();
  });
});
