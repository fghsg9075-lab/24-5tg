
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';

interface Props {
  children: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center bg-slate-50 rounded-2xl border border-slate-200 m-4">
          <div className="bg-red-100 p-4 rounded-full text-red-600 mb-4 shadow-sm">
            <AlertTriangle size={32} />
          </div>
          <h2 className="text-xl font-black text-slate-800 mb-2">Something went wrong</h2>
          <p className="text-sm text-slate-500 mb-6 max-w-xs mx-auto">
            We encountered an unexpected error while loading this content.
          </p>
          
          <div className="bg-white p-3 rounded-lg border border-slate-200 text-left w-full max-w-sm mb-6 overflow-hidden">
             <p className="text-[10px] font-mono text-red-500 break-words">
                 {this.state.error?.message || "Unknown Error"}
             </p>
          </div>

          <div className="flex gap-3">
              <button 
                onClick={() => {
                    this.setState({ hasError: false, error: null });
                    if (this.props.onReset) this.props.onReset();
                    // Optional: Force reload if reset isn't enough
                    // window.location.reload();
                }}
                className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-lg hover:bg-slate-800 transition-all active:scale-95"
              >
                <ArrowLeft size={16} /> Go Back
              </button>
              
              <button
                 onClick={() => window.location.reload()}
                 className="flex items-center gap-2 px-5 py-2.5 bg-white text-slate-700 border border-slate-200 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all"
              >
                 <RefreshCw size={16} /> Reload App
              </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
