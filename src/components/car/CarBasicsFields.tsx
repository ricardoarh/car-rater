import { COMMON_MAKES, POWERTRAINS, TRANSMISSIONS } from '../../constants/app';
import type { Transmission } from '../../types/models';
import type { CarBasics } from '../../services/carBasics';
import { NumberField, TextField } from '../ui/Field';
import { SegmentedControl } from '../ui/SegmentedControl';
import './CarBasicsFields.css';

export interface CarBasicsFieldsProps {
  basics: CarBasics;
  onChange: (patch: Partial<CarBasics>) => void;
  /** Unique per screen so two datalists never collide. */
  makesListId: string;
  /** Rendered between the numeric fields and the optional extras. */
  photos?: React.ReactNode;
}

export function CarBasicsFields({
  basics,
  onChange,
  makesListId,
  photos,
}: CarBasicsFieldsProps) {
  const thisYear = new Date().getFullYear();

  return (
    <>
      <datalist id={makesListId}>
        {COMMON_MAKES.map((make) => (
          <option value={make} key={make} />
        ))}
      </datalist>

      <TextField
        label="Make"
        placeholder="Lexus"
        value={basics.make}
        listId={makesListId}
        autoCapitalize="words"
        autoComplete="off"
        enterKeyHint="next"
        onChange={(event) => onChange({ make: event.target.value })}
      />

      <TextField
        label="Model"
        placeholder="LBX"
        value={basics.model}
        autoCapitalize="words"
        autoComplete="off"
        enterKeyHint="next"
        onChange={(event) => onChange({ model: event.target.value })}
      />

      <div className="basics-row basics-row--year">
        <NumberField
          label="Year"
          optional
          placeholder={String(thisYear)}
          value={basics.year}
          maxDigits={4}
          onChange={(digits) => onChange({ year: digits })}
        />
        <div className="field">
          <span className="field__label" id={`${makesListId}-transmission-label`}>
            Transmission <span className="field__optional">(optional)</span>
          </span>
          <SegmentedControl<Transmission>
            label="Transmission"
            options={TRANSMISSIONS.map((option) => ({
              value: option.value,
              label: option.label,
            }))}
            value={basics.transmission}
            onChange={(value) => onChange({ transmission: value })}
            clearable
            onClear={() => onChange({ transmission: null })}
            variant="compact"
          />
          {basics.transmission && (
            <p className="field__hint">Tap again to clear.</p>
          )}
        </div>
      </div>

      <div className="basics-row basics-row--money">
        <NumberField
          label="Mileage"
          optional
          placeholder="12500"
          suffix="mi"
          value={basics.mileage}
          maxDigits={7}
          onChange={(digits) => onChange({ mileage: digits })}
        />
        <NumberField
          label="Price"
          optional
          placeholder="16995"
          prefix="£"
          value={basics.price}
          maxDigits={8}
          onChange={(digits) => onChange({ price: digits })}
        />
      </div>

      {photos}

      <fieldset className="add-car__powertrain">
        <legend>
          Powertrain <span className="field__optional">(optional)</span>
        </legend>
        <div className="chips">
          {POWERTRAINS.map((option) => {
            const on = basics.powertrain === option.value;
            return (
              <button
                key={option.value}
                type="button"
                className={`chip${on ? ' is-on' : ''}`}
                aria-pressed={on}
                onClick={() => onChange({ powertrain: on ? null : option.value })}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <TextField
        label="Anything else?"
        optional
        placeholder="e.g. colour, one owner, full service history…"
        value={basics.notes}
        maxLength={140}
        onChange={(event) => onChange({ notes: event.target.value })}
      />
    </>
  );
}
