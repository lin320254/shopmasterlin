import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message || 'Unexpected application error.' };
  }

  render() {
    if (this.state.hasError) {
      let friendly = this.state.message;
      try {
        const parsed = JSON.parse(this.state.message);
        if (parsed?.error) {
          friendly = `${parsed.operationType?.toUpperCase() || 'DATA'} (${parsed.path || 'store'}): ${parsed.error}`;
        }
      } catch {
        // non-json error message
      }

      return (
        <div className="min-h-screen bg-[#FCF8F8] flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white border border-[#EBDADA] rounded-2xl p-8 text-center">
            <h2 className="font-display text-xl font-semibold text-[#241113] mb-2">
              Unable to complete request
            </h2>
            <p className="text-sm text-[#6A4B4E] mb-6 break-words">{friendly}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 rounded-xl bg-[#6B1D24] text-white text-sm font-medium hover:bg-[#52141A] transition-colors cursor-pointer"
            >
              Reload Storefront
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
