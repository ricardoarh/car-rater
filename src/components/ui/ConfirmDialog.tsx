import { useState } from 'react';
import { Sheet } from './Sheet';
import { Button } from './Button';
import './ConfirmDialog.css';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  body: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  /** When set, the user must type this word before confirming. */
  requirePhrase?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  requirePhrase,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [typed, setTyped] = useState('');
  const ready = !requirePhrase || typed.trim().toUpperCase() === requirePhrase.toUpperCase();

  const close = () => {
    setTyped('');
    onCancel();
  };

  return (
    <Sheet open={open} onClose={close} variant="dialog" title={title}>
      <div className="confirm">
        <h2 className="confirm__title">{title}</h2>
        <p className="confirm__body">{body}</p>
        {requirePhrase && (
          <label className="confirm__phrase">
            <span>
              Type <strong>{requirePhrase}</strong> to confirm
            </span>
            <input
              className="field__input"
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
            />
          </label>
        )}
        <div className="confirm__actions">
          <Button variant="quiet" onClick={close} full>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? 'danger' : 'primary'}
            onClick={() => {
              setTyped('');
              onConfirm();
            }}
            disabled={!ready}
            full
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
