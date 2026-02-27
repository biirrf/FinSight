"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

interface Quote {
  c?: number;
  d?: number;
  dp?: number;
  t?: number;
}

interface WatchItem {
  symbol: string;
  company: string;
  addedAt: string;
  quote?: Quote | null;
  quoteError?: string;
}

export default function Page() {
  const [watchlist, setWatchlist] = useState<WatchItem[]>([]);
  const [newSymbol, setNewSymbol] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchWatchlist() {
    try {
      const res = await fetch("/api/watchlist");
      const data = await res.json();
      if (res.ok && Array.isArray(data.watchlist)) {
        setWatchlist(data.watchlist);
      } else {
        setError(data.error || "Failed to load watchlist");
      }
    } catch (e: any) {
      console.error("fetchWatchlist error", e);
      setError("Network error");
    }
  }

  useEffect(() => {
    fetchWatchlist();
  }, []);

  async function handleAdd() {
    const symbol = newSymbol.trim().toUpperCase();
    if (!symbol) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol }),
      });
      const data = await res.json();
      if (res.ok) {
        setNewSymbol("");
        fetchWatchlist();
      } else {
        setError(data.message || data.error || "Unable to add");
      }
    } catch (e: any) {
      console.error("addSymbol error", e);
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(symbol: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/watchlist", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol }),
      });
      const data = await res.json();
      if (res.ok) {
        fetchWatchlist();
      } else {
        setError(data.error || "Unable to remove");
      }
    } catch (e: any) {
      console.error("removeSymbol error", e);
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen home-wrapper">
      <section className="w-full container">
        <div className="space-y-2 mb-6">
          <h1 className="form-title">Watchlist</h1>
          <p className="text-xs text-gray-500">Track tickers you care about.</p>
        </div>

        <div className="mb-6">
          <div className="flex gap-2">
            <input
              className="w-full bg-gray-900 text-gray-100 border border-gray-700 rounded-lg p-2 focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500/20"
              placeholder="Ticker symbol (e.g. TSLA)"
              value={newSymbol}
              onChange={(e) => setNewSymbol(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAdd();
                }
              }}
            />
            <Button className="yellow-btn" onClick={handleAdd} disabled={!newSymbol.trim() || loading}>
              Add
            </Button>
          </div>
          {error && <div className="text-red-400 text-xs mt-1">{error}</div>}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-400">
            <thead className="text-xs uppercase bg-gray-700 text-gray-300">
              <tr>
                <th className="px-4 py-2">Symbol</th>
                <th className="px-4 py-2">Price</th>
                <th className="px-4 py-2">Change</th>
                <th className="px-4 py-2">% Change</th>
                <th className="px-4 py-2">Updated</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {watchlist.map((item) => (
                <tr key={item.symbol} className="border-t border-gray-600 hover:bg-gray-800">
                  <td className="px-4 py-2 align-top">{item.symbol}</td>
                  <td className="px-4 py-2 align-top">
                    {item.quote?.c != null ? `$${item.quote.c.toFixed(2)}` : "—"}
                  </td>
                  <td className="px-4 py-2 align-top">
                    {item.quote?.d != null ? item.quote.d.toFixed(2) : "—"}
                  </td>
                  <td className="px-4 py-2 align-top">
                    {item.quote?.dp != null ? `${item.quote.dp.toFixed(2)}%` : "—"}
                  </td>
                  <td className="px-4 py-2 align-top">
                    {item.quote?.t ? new Date(item.quote.t * 1000).toLocaleTimeString() : "—"}
                  </td>
                  <td className="px-4 py-2 align-top">
                    <Button variant="ghost" size="sm" onClick={() => handleRemove(item.symbol)} disabled={loading}>
                      Remove
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4">
          <Button variant="ghost" size="sm" onClick={fetchWatchlist} disabled={loading}>
            Refresh
          </Button>
        </div>
      </section>
    </div>
  );
}
