"use client"

import React, { useState } from "react";
import { Button } from "@/components/ui/button";

interface EvalRow {
  query: string;
  mode?: string | null;
  citations?: boolean;
  sourcesCount?: number;
  confidence?: number | null;
  latency?: number | null;
  answer?: string;
  running?: boolean;
}

const PRESET_QUERIES: string[] = [
  "What happened with TSLA earnings?",
  "Summarise NVDA earnings",
  "CPI trend in my sources",
  "Fed signals in my sources",
  "Oil prices in my sources",
  "Bitcoin update in my sources",
  "What is CPI?",
  "What is GDP?",
  "How do interest rates affect markets?",
  "Is inflation good or bad?",
];

export default function Page() {
  const [rows, setRows] = useState<EvalRow[]>(
    PRESET_QUERIES.map((q) => ({ query: q }))
  );

  async function runRow(idx: number) {
    setRows((rs) => {
      const copy = [...rs];
      copy[idx].running = true;
      return copy;
    });
    const start = performance.now();
    try {
      const res = await fetch("/api/osiris/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: rows[idx].query }),
      });
      const data = await res.json();
      const end = performance.now();
      setRows((rs) => {
        const copy = [...rs];
        copy[idx] = {
          ...copy[idx],
          mode: data.mode ?? null,
          citations: /\[\d+\]/.test(data.answer || ""),
          sourcesCount: Array.isArray(data.sources) ? data.sources.length : 0,
          confidence: data?.debug?.confidence ?? null,
          latency: Math.round(end - start),
          answer: data.answer || "",
          running: false,
        };
        return copy;
      });
    } catch (err) {
      setRows((rs) => {
        const copy = [...rs];
        copy[idx].running = false;
        copy[idx].answer = "Error";
        return copy;
      });
    }
  }

  return (
    <div className="flex min-h-screen home-wrapper">
      <section className="w-full container">
        <div className="space-y-2 mb-12">
          <h1 className="form-title">OSIRIS Evaluation</h1>
          <p className="text-xs text-gray-500">
            Run a set of predetermined queries against the OSIRIS API to measure
            mode, citations, sources, confidence and latency.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-400">
            <thead className="text-xs uppercase bg-gray-700 text-gray-300">
              <tr>
                <th className="px-4 py-2">Query</th>
                <th className="px-4 py-2">Mode</th>
                <th className="px-4 py-2">Citations?</th>
                <th className="px-4 py-2">Sources</th>
                <th className="px-4 py-2">Confidence</th>
                <th className="px-4 py-2">Latency (ms)</th>
                <th className="px-4 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={idx} className="border-t border-gray-600 hover:bg-gray-800">
                  <td className="px-4 py-2 align-top">{r.query}</td>
                  <td className="px-4 py-2 align-top">{r.mode || "-"}</td>
                  <td className="px-4 py-2 align-top">{r.citations ? "yes" : "no"}</td>
                  <td className="px-4 py-2 align-top">{r.sourcesCount ?? "-"}</td>
                  <td className="px-4 py-2 align-top">
                    {r.confidence !== null && r.confidence !== undefined
                      ? Math.round(r.confidence * 100) + "%"
                      : "-"}
                  </td>
                  <td className="px-4 py-2 align-top">{r.latency ?? "-"}</td>
                  <td className="px-4 py-2 align-top">
                    <Button
                      size="sm"
                      disabled={r.running}
                      onClick={() => runRow(idx)}
                    >
                      {r.running ? "…" : "Run"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-8">
          {rows.map((r, idx) => r.answer ? (
            <details key={idx} className="mb-4">
              <summary className="cursor-pointer text-gray-300">
                Answer for query {idx + 1} (click to expand)
              </summary>
              <pre className="whitespace-pre-wrap text-gray-100 p-3 bg-gray-800 rounded">{r.answer}</pre>
            </details>
          ) : null)}
        </div>
      </section>
    </div>
  );
}
