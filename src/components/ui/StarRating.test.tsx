import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StarRating } from './StarRating';

describe('StarRating', () => {
  it('exposes an accessible radio group with five options', () => {
    render(<StarRating label="Cuteness" value={null} onChange={() => {}} />);
    const group = screen.getByRole('radiogroup', { name: 'Cuteness' });
    expect(group).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(5);
  });

  it('reports the selected star to assistive tech', () => {
    render(<StarRating label="Comfyness" value={4} onChange={() => {}} />);
    expect(screen.getByRole('radio', { name: '4 stars' })).toBeChecked();
    expect(screen.getByRole('radio', { name: '3 stars' })).not.toBeChecked();
  });

  it('selects a rating on click', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<StarRating label="Vroom Factor" value={null} onChange={onChange} />);
    await user.click(screen.getByRole('radio', { name: '5 stars' }));
    expect(onChange).toHaveBeenCalledWith(5);
  });

  it('clears the rating when the selected star is tapped again', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<StarRating label="Techonologia" value={3} onChange={onChange} />);
    await user.click(screen.getByRole('radio', { name: '3 stars' }));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('is keyboard operable with arrow keys and number keys', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(
      <StarRating label="Rio Approved" value={2} onChange={onChange} />,
    );
    await user.tab();
    await user.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenLastCalledWith(3);

    rerender(<StarRating label="Rio Approved" value={2} onChange={onChange} />);
    await user.keyboard('{ArrowLeft}');
    expect(onChange).toHaveBeenLastCalledWith(1);

    await user.keyboard('5');
    expect(onChange).toHaveBeenLastCalledWith(5);
  });

  it('renders as a static image when read only', () => {
    render(<StarRating label="$$" value={4} readOnly />);
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: /\$\$: 4 out of 5/ })).toBeInTheDocument();
  });

  it('says so when nothing is rated', () => {
    render(<StarRating label="Cuteness" value={null} readOnly />);
    expect(screen.getByRole('img', { name: /not rated/ })).toBeInTheDocument();
  });
});
