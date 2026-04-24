import React from "react";

/**
 * Global error boundary. Catches render errors and shows a friendly
 * fallback with option to reload or copy error details for bug reports.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null, copied: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary]", error, info);
    this.setState({ info });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleCopy = async () => {
    const details = `${this.state.error?.toString() || "Unknown error"}\n\n${this.state.info?.componentStack || ""}`;
    try {
      await navigator.clipboard.writeText(details);
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 1800);
    } catch {
      /* noop */
    }
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500">
            <i className="fas fa-triangle-exclamation text-2xl" />
          </div>
          <h1 className="text-xl font-black text-slate-900">Terjadi Kesalahan</h1>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
            Aplikasi mengalami masalah yang tidak terduga. Silakan muat ulang halaman.
            Jika masalah berlanjut, salin detail error dan laporkan ke admin.
          </p>

          {this.state.error && (
            <pre className="mt-4 max-h-40 overflow-auto rounded-xl bg-slate-50 p-3 text-[11px] text-slate-600 ring-1 ring-slate-200">
              {this.state.error.toString()}
            </pre>
          )}

          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <button
              onClick={this.handleReload}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            >
              <i className="fas fa-rotate-right text-xs" />
              Muat Ulang
            </button>
            <button
              onClick={this.handleCopy}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <i className={`fas ${this.state.copied ? "fa-check text-emerald-500" : "fa-copy"} text-xs`} />
              {this.state.copied ? "Tersalin" : "Salin Error"}
            </button>
          </div>
        </div>
      </div>
    );
  }
}
