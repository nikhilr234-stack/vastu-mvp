"use client";

import { useState } from "react";

export default function Home() {
  const [output, setOutput] = useState<any>(null);

  async function handleGenerate() {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        facing: "east",
        bedrooms: 2,
        plot: { width: 30, height: 40 },
      }),
    });

    const data = await res.json();
    setOutput(data);
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>Vastu Planning Tool</h1>

      <button onClick={handleGenerate}>
        Generate
      </button>

      <pre style={{
        marginTop: 20,
        background: "#111",
        color: "#0f0",
        padding: 16
      }}>
        {JSON.stringify(output, null, 2)}
      </pre>
    </div>
  );
}

