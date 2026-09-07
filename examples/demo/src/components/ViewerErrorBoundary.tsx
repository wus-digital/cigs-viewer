import { Component, type PropsWithChildren } from 'react';

export class ViewerErrorBoundary extends Component<
  PropsWithChildren,
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: unknown) {
    return {
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }

  render() {
    if (this.state.error) {
      return (
        <div className='configuration-error' role='alert'>
          <h2>Konfiguration kann nicht dargestellt werden.</h2>
          <p>{this.state.error.message}</p>
          <p>Bitte die Key-Value-Liste korrigieren und erneut anwenden.</p>
        </div>
      );
    }
    return this.props.children;
  }
}
