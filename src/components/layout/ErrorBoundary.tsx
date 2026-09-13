import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '../ui/Button';
import { ErrorState } from './ScreenStates';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Last line of defence. The user sees a plain apology and a way out —
 * never a stack trace. The details go to the console for us.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Car Rater crashed:', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <ErrorState
        title="Something went wrong"
        body="Your saved cars are safe. Reloading usually sorts it out."
        action={
          <Button
            onClick={() => {
              this.setState({ hasError: false });
              window.location.hash = '#/';
              window.location.reload();
            }}
          >
            Reload Car Rater
          </Button>
        }
      />
    );
  }
}
