import { Link } from 'react-router-dom';
import { Button } from '../ui/Button';
import './ScreenStates.css';

export function ScreenLoading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="screen">
      <div className="screen-state" role="status" aria-live="polite">
        <span className="screen-state__spinner" aria-hidden="true" />
        <span className="visually-hidden">{label}</span>
      </div>
    </div>
  );
}

export function CarMissing() {
  return (
    <div className="screen screen-enter">
      <div className="screen-state screen-state--message">
        <h1 className="screen-state__title">We can’t find that car</h1>
        <p className="screen-state__body">
          It may have been deleted, or the link is out of date.
        </p>
        <Link to="/cars">
          <Button>Back to My Cars</Button>
        </Link>
      </div>
    </div>
  );
}

export function ErrorState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="screen screen-enter">
      <div className="screen-state screen-state--message" role="alert">
        <h1 className="screen-state__title">{title}</h1>
        <p className="screen-state__body">{body}</p>
        {action}
      </div>
    </div>
  );
}
