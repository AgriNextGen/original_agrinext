import { createRoot } from "react-dom/client";
import "./index.css";

function isMissingConfig(): string[] {
  const missing: string[] = [];
  if (!import.meta.env.VITE_SUPABASE_URL) missing.push("VITE_SUPABASE_URL");
  if (
    !import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY &&
    !import.meta.env.VITE_SUPABASE_ANON_KEY
  )
    missing.push("VITE_SUPABASE_PUBLISHABLE_KEY");
  return missing;
}

const root = createRoot(document.getElementById("root")!);
const missing = isMissingConfig();

if (missing.length > 0 && import.meta.env.MODE === "production") {
  root.render(
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, sans-serif",
        backgroundColor: "#f8fafc",
        padding: "2rem",
      }}
    >
      <div
        style={{
          maxWidth: "28rem",
          textAlign: "center",
          color: "#334155",
        }}
      >
        <div
          style={{
            fontSize: "2.5rem",
            marginBottom: "1rem",
          }}
        >
          &#9888;
        </div>
        <h1
          style={{
            fontSize: "1.25rem",
            fontWeight: 600,
            marginBottom: "0.5rem",
          }}
        >
          Configuration Error
        </h1>
        <p style={{ fontSize: "0.95rem", lineHeight: 1.6 }}>
          The application is not properly configured. Please contact the
          administrator or check the deployment environment variables.
        </p>
      </div>
    </div>
  );
} else {
  import("./App.tsx").then(({ default: App }) => {
    root.render(<App />);
  });
}
