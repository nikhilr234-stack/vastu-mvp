"use client";

import { useState } from "react";

export default function Page() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    const res = await fetch("/api/generate");
    const data = await res.json();
    setResult(data);
    setLoading(false);
  }

  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>Vastu Planning Tool</h1>

      <button
        onClick={generate}
        style={{
          padding: "10px 16px",
          fontSize: 16,
          cursor: "pointer",
          marginTop: 12,
        }}
      >
        {loading ? "Generating…" : "Generate"}
      </button>

      {result && (
        <pre
          style={{
            marginTop: 20,
            background: "#111",
            color: "#0f0",
            padding: 16,
          }}
        >
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </main>
  );
}
