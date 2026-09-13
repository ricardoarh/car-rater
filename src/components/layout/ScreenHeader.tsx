import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { BackIcon } from './Icons';
import './ScreenHeader.css';

export interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  /** Second line rendered in the same display weight (e.g. "Lexus LBX"). */
  titleLine2?: string;
  onBack?: () => void;
  backTo?: string;
  action?: ReactNode;
  /** Small car thumbnail shown on the right, as in the concept. */
  aside?: ReactNode;
}

export function ScreenHeader({
  title,
  titleLine2,
  subtitle,
  onBack,
  backTo,
  action,
  aside,
}: ScreenHeaderProps) {
  const navigate = useNavigate();
  const showBack = Boolean(onBack || backTo);

  return (
    <header className="screen-header">
      {(showBack || action) && (
        <div className="screen-header__bar">
          {showBack ? (
            <button
              type="button"
              className="screen-header__back"
              onClick={() => (onBack ? onBack() : navigate(backTo ?? '/'))}
              aria-label="Go back"
            >
              <BackIcon />
            </button>
          ) : (
            <span />
          )}
          {action}
        </div>
      )}
      <div className="screen-header__main">
        <div className="screen-header__text">
          <h1 className="screen-header__title">
            {title}
            {titleLine2 && (
              <>
                {/* The break is visual; the accessible name still reads
                    "Rate This Car Lexus LBX" as one phrase. */}
                <br />
                <span>{titleLine2}</span>
              </>
            )}
          </h1>
          {subtitle && <p className="screen-header__subtitle">{subtitle}</p>}
        </div>
        {aside && <div className="screen-header__aside">{aside}</div>}
      </div>
    </header>
  );
}
