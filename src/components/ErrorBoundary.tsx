import React from 'react';
import { AlertTriangle, RefreshCw, Music } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="w-screen h-screen flex flex-col items-center justify-center p-6 bg-neutral-950 text-neutral-100 select-none">
          <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl flex flex-col items-center text-center gap-4 animate-in zoom-in-95">
            <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-white">Une erreur inattendue est survenue</h2>
              <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed">
                Le lecteur a rencontré une interruption temporaire. Vos morceaux et données restent en sécurité.
              </p>
            </div>

            {this.state.error && (
              <div className="w-full bg-neutral-950/80 border border-neutral-800 rounded-xl p-3 text-left">
                <p className="text-[11px] font-mono text-red-400 break-words line-clamp-3">
                  {this.state.error.message || 'Erreur interne de rendu'}
                </p>
              </div>
            )}

            <div className="flex items-center gap-3 w-full mt-2">
              <button
                type="button"
                onClick={() => this.setState({ hasError: false, error: null })}
                className="flex-1 px-4 py-2.5 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-white transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <Music className="w-4 h-4 text-emerald-400" />
                <span>Réessayer</span>
              </button>

              <button
                type="button"
                onClick={this.handleReset}
                className="flex-1 px-4 py-2.5 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-neutral-950 transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-md"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Recharger l'app</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
