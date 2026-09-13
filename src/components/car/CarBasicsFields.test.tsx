import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CarBasicsFields } from './CarBasicsFields';
import { emptyBasics, type CarBasics } from '../../services/carBasics';

function setup(basics: Partial<CarBasics> = {}) {
  const onChange = vi.fn();
  const { container } = render(
    <CarBasicsFields
      basics={{ ...emptyBasics(), ...basics }}
      onChange={onChange}
      makesListId="makes-test"
    />,
  );
  return { onChange, container, user: userEvent.setup() };
}

describe('CarBasicsFields', () => {
  it('no longer offers a Trim / Version field', () => {
    setup();
    expect(screen.queryByLabelText(/trim/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Trim \/ Version/i)).not.toBeInTheDocument();
  });

  it('labels every new field', () => {
    setup();
    expect(screen.getByLabelText(/^Year/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Mileage/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Price/)).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: 'Transmission' })).toBeInTheDocument();
  });

  it('uses a numeric keypad for the numeric fields', () => {
    setup();
    for (const label of [/^Year/, /^Mileage/, /^Price/]) {
      expect(screen.getByLabelText(label)).toHaveAttribute('inputmode', 'numeric');
    }
  });

  it('offers Automatic and Manual as a segmented control, not a dropdown', () => {
    const { container } = setup();
    expect(container.querySelector('select')).toBeNull();
    const group = screen.getByRole('radiogroup', { name: 'Transmission' });
    const options = within(group).getAllByRole('radio');
    expect(options.map((o) => o.textContent)).toEqual(['Automatic', 'Manual']);
  });

  it('reports the selected transmission to assistive tech', () => {
    setup({ transmission: 'automatic' });
    const group = screen.getByRole('radiogroup', { name: 'Transmission' });
    expect(within(group).getByRole('radio', { name: 'Automatic' })).toBeChecked();
    expect(within(group).getByRole('radio', { name: 'Manual' })).not.toBeChecked();
  });

  it('selects a transmission', async () => {
    const { onChange, user } = setup();
    const group = screen.getByRole('radiogroup', { name: 'Transmission' });
    await user.click(within(group).getByRole('radio', { name: 'Manual' }));
    expect(onChange).toHaveBeenCalledWith({ transmission: 'manual' });
  });

  it('clears the transmission when the selected option is tapped again', async () => {
    const { onChange, user } = setup({ transmission: 'automatic' });
    const group = screen.getByRole('radiogroup', { name: 'Transmission' });
    await user.click(within(group).getByRole('radio', { name: 'Automatic' }));
    expect(onChange).toHaveBeenCalledWith({ transmission: null });
  });

  it('tells the user how to clear it, but only once something is selected', () => {
    const { onChange } = setup();
    expect(screen.queryByText('Tap again to clear.')).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('shows the clear hint when a transmission is set', () => {
    setup({ transmission: 'manual' });
    expect(screen.getByText('Tap again to clear.')).toBeInTheDocument();
  });

  it('accepts digits in the mileage field', async () => {
    const { onChange, user } = setup();
    await user.type(screen.getByLabelText(/^Mileage/), '1');
    expect(onChange).toHaveBeenCalledWith({ mileage: '1' });
  });

  it('refuses a minus sign, so mileage can never go negative', async () => {
    const { onChange, user } = setup();
    await user.type(screen.getByLabelText(/^Mileage/), '-');
    expect(onChange).toHaveBeenCalledWith({ mileage: '' });
  });

  it('refuses a minus sign in the price field too', async () => {
    const { onChange, user } = setup();
    await user.type(screen.getByLabelText(/^Price/), '-');
    expect(onChange).toHaveBeenCalledWith({ price: '' });
  });

  it('shows the units inside the fields', () => {
    setup();
    expect(screen.getByText('mi')).toBeInTheDocument();
    expect(screen.getByText('£')).toBeInTheDocument();
  });

  it('marks the optional fields as optional', () => {
    setup();
    // Make and Model are required-ish; the rest are explicitly optional.
    expect(screen.getAllByText('(optional)').length).toBeGreaterThanOrEqual(5);
  });
});
