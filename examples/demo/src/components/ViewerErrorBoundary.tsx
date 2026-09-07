import { Component, type PropsWithChildren } from 'react';
import { headingStyles, paragraphStyles } from '../utilities.js';

type Props = PropsWithChildren<{ resetKey: string }>;
interface State {
  error: Error | null;
  resetKey: string;
}

export class ViewerErrorBoundary extends Component<Props, State> {
  state: State = { error: null, resetKey: this.props.resetKey };

  static getDerivedStateFromProps(props: Props, state: State) {
    return props.resetKey !== state.resetKey
      ? { error: null, resetKey: props.resetKey }
      : null;
  }

  static getDerivedStateFromError(error: unknown) {
    return {
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }

  render() {
    if (this.state.error) {
      return (
        <div className='configuration-error p-6 text-[#a61919]' role='alert'>
          <h2 className={headingStyles}>Konfiguration kann nicht dargestellt werden.</h2>
          <p className={paragraphStyles}>{this.state.error.message}</p>
          <p className={paragraphStyles}>Bitte die Key-Value-Liste korrigieren und erneut anwenden.</p>
        </div>
      );
    }
    return this.props.children;
  }
}
