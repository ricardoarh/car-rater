import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExtrasSection } from './ExtrasSection';
import { makeCar } from '../../services/carsRepo';
import { withDerivedScore } from '../../services/ratingService';
import type { Car } from '../../types/models';

function build(patch: Partial<Car> = {}): Car {
  return withDerivedScore({ ...makeCar({ make: 'Lexus', model: 'LBX' }), ...patch });
}

describe('ExtrasSection', () => {
  it('offers the three verdicts by their exact wording', () => {
    render(<ExtrasSection car={build()} onChange={() => {}} />);
    const group = screen.getByRole('radiogroup', { name: 'Final verdict' });
    expect(group).toBeInTheDocument();
    for (const label of ['YES', 'MAYBE', 'NO']) {
      expect(screen.getAllByRole('radio', { name: label }).length).toBeGreaterThan(0);
    }
  });

  it('selects a verdict', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ExtrasSection car={build()} onChange={onChange} />);
    const group = screen.getByRole('radiogroup', { name: 'Final verdict' });
    await user.click(within(group).getByRole('radio', { name: 'YES' }));
    expect(onChange).toHaveBeenCalledWith({ verdict: 'yes' });
  });

  it('marks the current verdict as checked', () => {
    render(<ExtrasSection car={build({ verdict: 'maybe' })} onChange={() => {}} />);
    const group = screen.getByRole('radiogroup', { name: 'Final verdict' });
    expect(within(group).getByRole('radio', { name: 'MAYBE' })).toBeChecked();
    expect(within(group).getByRole('radio', { name: 'NO' })).not.toBeChecked();
  });

  it('hides reason chips until a dealbreaker is switched on', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(<ExtrasSection car={build()} onChange={onChange} />);
    expect(screen.queryByRole('group', { name: 'Dealbreaker reasons' })).not.toBeInTheDocument();

    const group = screen.getByRole('radiogroup', { name: 'Any dealbreaker?' });
    await user.click(within(group).getByRole('radio', { name: 'YES' }));
    expect(onChange).toHaveBeenCalledWith({ dealbreaker: true });

    rerender(<ExtrasSection car={build({ dealbreaker: true })} onChange={onChange} />);
    expect(screen.getByRole('group', { name: 'Dealbreaker reasons' })).toBeInTheDocument();
  });

  it('accumulates multiple dealbreaker reasons', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <ExtrasSection
        car={build({ dealbreaker: true, dealbreakerReasons: ['rio'] })}
        onChange={onChange}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Price' }));
    expect(onChange).toHaveBeenCalledWith({ dealbreakerReasons: ['rio', 'price'] });
  });

  it('removes a reason when its chip is tapped again', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <ExtrasSection
        car={build({ dealbreaker: true, dealbreakerReasons: ['rio', 'price'] })}
        onChange={onChange}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Rio' }));
    expect(onChange).toHaveBeenCalledWith({ dealbreakerReasons: ['price'] });
  });

  it('reveals a free-text field for "Other"', () => {
    render(
      <ExtrasSection
        car={build({ dealbreaker: true, dealbreakerReasons: ['other'] })}
        onChange={() => {}}
      />,
    );
    expect(screen.getByPlaceholderText('What was it?')).toBeInTheDocument();
  });

  it('defaults Headache Potential to Unknown', () => {
    render(<ExtrasSection car={build()} onChange={() => {}} />);
    const group = screen.getByRole('radiogroup', { name: 'Headache Potential' });
    expect(within(group).getByRole('radio', { name: /Unknown/ })).toBeChecked();
  });
});
