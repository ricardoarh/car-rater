import { useId } from 'react';
import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react';
import { digitsOnly } from '../../utils/format';
import './Field.css';

interface BaseProps {
  label: string;
  hint?: string;
  optional?: boolean;
  children?: ReactNode;
}

export function FieldShell({
  label,
  hint,
  optional,
  htmlFor,
  children,
}: BaseProps & { htmlFor?: string }) {
  return (
    <div className="field">
      <label className="field__label" htmlFor={htmlFor}>
        {label}
        {optional && <span className="field__optional"> (optional)</span>}
      </label>
      {children}
      {hint && <p className="field__hint">{hint}</p>}
    </div>
  );
}

export type TextFieldProps = BaseProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, 'children'> & { listId?: string };

export function TextField({ label, hint, optional, listId, ...rest }: TextFieldProps) {
  const id = useId();
  return (
    <FieldShell label={label} hint={hint} optional={optional} htmlFor={id}>
      <input id={id} className="field__input" list={listId} {...rest} />
    </FieldShell>
  );
}

export type NumberFieldProps = BaseProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, 'children' | 'onChange' | 'value' | 'type'> & {
    /** Digits only, as typed. Empty string means "not set". */
    value: string;
    onChange: (digits: string) => void;
    /** Rendered inside the field, before the value — e.g. "£". */
    prefix?: string;
    /** Rendered inside the field, after the value — e.g. "mi". */
    suffix?: string;
    maxDigits?: number;
  };

/**
 * A whole-number field for mileage and price.
 *
 * It is a text input with `inputMode="numeric"` rather than `type="number"`
 * on purpose: it brings up the numeric keypad on a phone, has no spinner to
 * mis-tap, does not change on scroll, and — because every keystroke is
 * filtered to digits — cannot hold a negative, a decimal or `1e5`.
 */
export function NumberField({
  label,
  hint,
  optional,
  value,
  onChange,
  prefix,
  suffix,
  maxDigits = 9,
  ...rest
}: NumberFieldProps) {
  const id = useId();
  return (
    <FieldShell label={label} hint={hint} optional={optional} htmlFor={id}>
      <div className="field__control">
        {prefix && (
          <span className="field__affix field__affix--prefix" aria-hidden="true">
            {prefix}
          </span>
        )}
        <input
          id={id}
          className="field__input field__input--bare num"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={value}
          onChange={(event) => onChange(digitsOnly(event.target.value, maxDigits))}
          {...rest}
        />
        {suffix && (
          <span className="field__affix field__affix--suffix" aria-hidden="true">
            {suffix}
          </span>
        )}
      </div>
    </FieldShell>
  );
}

export type TextAreaFieldProps = BaseProps &
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'children'> & {
    counter?: { value: number; max: number };
  };

export function TextAreaField({
  label,
  hint,
  optional,
  counter,
  ...rest
}: TextAreaFieldProps) {
  const id = useId();
  return (
    <FieldShell label={label} hint={hint} optional={optional} htmlFor={id}>
      <textarea id={id} className="field__input field__input--area" {...rest} />
      {counter && (
        <p className="field__counter num" aria-live="polite">
          {counter.value}/{counter.max}
        </p>
      )}
    </FieldShell>
  );
}
