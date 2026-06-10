import { Component, type ReactNode } from "react";

interface State {
  error: Error | null;
}

export class GlobalErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: unknown) {
    console.error("GlobalErrorBoundary caught:", error, info);
  }

  reset = () => {
    this.setState({ error: null });
    if (typeof location !== "undefined") location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;
    const message = this.state.error.message || "Unknown error";
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        padding: "1.5rem", fontFamily: "system-ui, -apple-system, sans-serif",
        background: "var(--background, #fafafa)", color: "var(--foreground, #111)",
      }}>
        <div style={{ maxWidth: "28rem", width: "100%", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.25rem", margin: "0 0 0.5rem", fontWeight: 600 }}>This page didn't load</h1>
          <p style={{ color: "#6b7280", margin: "0 0 1.5rem", wordBreak: "break-word" }}>{message}</p>
          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", flexWrap: "wrap" }}>
            <button
              onClick={this.reset}
              style={{ padding: "0.5rem 1rem", borderRadius: "0.375rem", background: "#111", color: "#fff", border: 0, cursor: "pointer", font: "inherit" }}
            >
              Try again
            </button>
            <a
              href="/"
              style={{ padding: "0.5rem 1rem", borderRadius: "0.375rem", background: "#fff", color: "#111", border: "1px solid #d1d5db", textDecoration: "none", font: "inherit" }}
            >
              Go home
            </a>
          </div>
        </div>
      </div>
    );
  }
}
