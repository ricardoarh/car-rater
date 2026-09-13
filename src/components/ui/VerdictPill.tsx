import type { Verdict } from '../../types/models';
import { VERDICT_LABEL } from '../../constants/app';
import './VerdictPill.css';

export function VerdictPill({
  verdict,
  size = 'md',
}: {
  verdict: Verdict | null;
  size?: 'sm' | 'md';
}) {
  if (!verdict) {
    return (
      <span className={`verdict verdict--none verdict--${size}`}>
        <span aria-hidden="true" className="verdict__dot" />
        Not set
      </span>
    );
  }
  return (
    <span className={`verdict verdict--${verdict} verdict--${size}`}>
      {VERDICT_LABEL[verdict]}
    </span>
  );
}

export function DealbreakerFlag({ withText = false }: { withText?: boolean }) {
  return (
    <span className="dealbreaker-flag" title="Dealbreaker">
      <span aria-hidden="true">🚩</span>
      <span className={withText ? '' : 'visually-hidden'}>Dealbreaker</span>
    </span>
  );
}
