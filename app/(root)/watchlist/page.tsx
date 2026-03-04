"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";

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

type SortKey = "symbol" | "price" | "change" | "changePercent" | "updated";
type SortDir = "asc" | "desc";

// Simple SVG sparkline component
interface SparklineProps {
  data: number[];
  color: "emerald" | "rose";
  width?: number;
  height?: number;
}

function Sparkline({ data, color, width = 60, height = 20 }: SparklineProps) {
  if (!data || data.length === 0) {
    return (
      <svg width={width} height={height} className="block">
        <line x1={0} y1={height / 2} x2={width} y2={height / 2} stroke="currentColor" strokeWidth="0.5" opacity="0.2" />
      </svg>
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((val, idx) => {
    const x = (idx / (data.length - 1)) * width;
    const y = height - ((val - min) / range) * height * 0.8 - height * 0.1;
    return [x, y];
  });

  const pathD = points.map((p, idx) => `${idx === 0 ? "M" : "L"} ${p[0]} ${p[1]}`).join(" ");
  const fillPath = `M ${points[0][0]} ${points[0][1]} ${points.map((p, idx) => `${idx === 0 ? "" : "L"} ${p[0]} ${p[1]}`).join(" ")} L ${points[points.length - 1][0]} ${height} L ${points[0][0]} ${height} Z`;

  const colorClass = color === "emerald" ? "text-emerald-400" : "text-rose-400";
  const fillColor = color === "emerald" ? "rgba(16, 185, 129, 0.1)" : "rgba(244, 63, 94, 0.1)";

  return (
    <svg width={width} height={height} className={`block ${colorClass}`} viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <linearGradient id={`grad-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color === "emerald" ? "rgba(16, 185, 129, 0.15)" : "rgba(244, 63, 94, 0.15)"} />
          <stop offset="100%" stopColor={color === "emerald" ? "rgba(16, 185, 129, 0)" : "rgba(244, 63, 94, 0)"} />
        </linearGradient>
      </defs>
      <path d={fillPath} fill={`url(#grad-${color})`} />
      <path d={pathD} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export default function Page() {
  const [watchlist, setWatchlist] = useState<WatchItem[]>([]);
  const [newSymbol, setNewSymbol] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("changePercent");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  async function fetchWatchlist() {
    try {
      setLoading(true);
      const res = await fetch("/api/watchlist");
      const data = await res.json();
      if (res.ok && Array.isArray(data.watchlist)) {
        setWatchlist(data.watchlist);
        setError(null);
      } else {
        setError(data.error || "Failed to load watchlist");
      }
    } catch (e: any) {
      console.error("fetchWatchlist error", e);
      setError("Network error");
    } finally {
      setLoading(false);
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
        await fetchWatchlist();
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
    try {
      const res = await fetch("/api/watchlist", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol }),
      });
      const data = await res.json();
      if (res.ok) {
        await fetchWatchlist();
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

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const sortedWatchlist = useMemo(() => {
    const sorted = [...watchlist].sort((a, b) => {
      let aVal: any, bVal: any;

      switch (sortKey) {
        case "symbol":
          aVal = a.symbol;
          bVal = b.symbol;
          break;
        case "price":
          aVal = a.quote?.c ?? -Infinity;
          bVal = b.quote?.c ?? -Infinity;
          break;
        case "change":
          aVal = a.quote?.d ?? -Infinity;
          bVal = b.quote?.d ?? -Infinity;
          break;
        case "changePercent":
          aVal = a.quote?.dp ?? -Infinity;
          bVal = b.quote?.dp ?? -Infinity;
          break;
        case "updated":
          aVal = a.quote?.t ?? 0;
          bVal = b.quote?.t ?? 0;
          break;
      }

      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [watchlist, sortKey, sortDir]);

  const renderSortIndicator = (key: SortKey) => {
    if (sortKey !== key) return "";
    return sortDir === "asc" ? " ↑" : " ↓";
  };

  // TODO: Connect real sparkline data from API (e.g., intraday 24h points)
  const mockSparklineData = (changePercent: number | undefined): number[] => {
    if (!changePercent) return [];
    const trend = changePercent > 0 ? "up" : "down";
    const points = Array.from({ length: 24 }, (_, i) => {
      const noise = (Math.random() - 0.5) * 2;
      return trend === "up" ? i + noise : 24 - i + noise;
    });
    return points;
  };

  return (
    <div className="flex min-h-screen home-wrapper">
      <section className="w-full container">
        {/* Header */}
        <div className="space-y-2 mb-8">
          <h1 className="form-title">Watchlist</h1>
          <p className="text-xs text-white/50">Track tickers you care about.</p>
        </div>

        {/* Command Bar */}
        <div className="mb-8">
          <div className="relative">
            <div className="flex items-center h-10 px-3 bg-black/40 border border-white/10 rounded-xl focus-within:border-[#F5C84B] transition-colors duration-200">
              <svg
                className="w-4 h-4 text-white/40 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                className="flex-1 bg-transparent text-sm text-white/90 placeholder-white/40 focus:outline-none"
                placeholder="Start typing a ticker..."
                value={newSymbol}
                onChange={(e) => setNewSymbol(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAdd();
                  }
                }}
              />
              <button
                onClick={handleAdd}
                disabled={!newSymbol.trim() || loading}
                className="ml-2 px-4 h-7 rounded-lg bg-[#F5C84B] text-black font-semibold text-xs hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Add
              </button>
            </div>
            <p className="text-xs text-white/50 mt-2">Add tickers like TSLA, AAPL, NVDA</p>
          </div>
          {error && <div className="text-rose-400 text-xs mt-2">{error}</div>}
        </div>

        {/* Empty state */}
        {!loading && watchlist.length === 0 && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <p className="text-white/50 text-sm mb-3">No tickers in your watchlist yet.</p>
              <p className="text-white/30 text-xs">Add your first ticker using the search bar above.</p>
            </div>
          </div>
        )}

        {/* Table */}
        {watchlist.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/5 backdrop-blur-md shadow-2xl">
            <table className="w-full">
              <thead className="sticky top-0 bg-white/[0.03] border-b border-white/10 z-10">
                <tr>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-widest font-semibold text-white/50 cursor-pointer hover:text-white/70 transition-colors" onClick={() => handleSort("symbol")}>
                    Symbol {renderSortIndicator("symbol")}
                  </th>
                  <th className="px-4 py-3 text-right text-xs uppercase tracking-widest font-semibold text-white/50 cursor-pointer hover:text-white/70 font-mono transition-colors" onClick={() => handleSort("price")}>
                    Price {renderSortIndicator("price")}
                  </th>
                  <th className="px-4 py-3 text-right text-xs uppercase tracking-widest font-semibold text-white/50 cursor-pointer hover:text-white/70 font-mono transition-colors" onClick={() => handleSort("change")}>
                    Change {renderSortIndicator("change")}
                  </th>
                  <th className="px-4 py-3 text-right text-xs uppercase tracking-widest font-semibold text-white/50 cursor-pointer hover:text-white/70 font-mono transition-colors" onClick={() => handleSort("changePercent")}>
                    % Change {renderSortIndicator("changePercent")}
                  </th>
                  <th className="px-4 py-3 text-center text-xs uppercase tracking-widest font-semibold text-white/50">Trend</th>
                  <th className="px-4 py-3 text-right text-xs uppercase tracking-widest font-semibold text-white/50 font-mono">Volume</th>
                  <th className="px-4 py-3 text-right text-xs uppercase tracking-widest font-semibold text-white/50 font-mono">Market Cap</th>
                  <th className="px-4 py-3 text-right text-xs uppercase tracking-widest font-semibold text-white/50 cursor-pointer hover:text-white/70 transition-colors" onClick={() => handleSort("updated")}>
                    Updated {renderSortIndicator("updated")}
                  </th>
                  <th className="px-4 py-3 text-right text-xs uppercase tracking-widest font-semibold text-white/50">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <>
                    {[...Array(3)].map((_, i) => (
                      <tr key={`skeleton-${i}`} className="border-b border-white/10">
                        <td className="px-4 py-3">
                          <div className="h-4 w-16 bg-white/10 rounded animate-pulse" />
                        </td>
                        {[...Array(8)].map((_, j) => (
                          <td key={`skeleton-cell-${j}`} className="px-4 py-3 text-right">
                            <div className="h-4 w-20 bg-white/10 rounded animate-pulse" />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </>
                )}
                {!loading &&
                  sortedWatchlist.map((item) => {
                    const changePercent = item.quote?.dp ?? 0;
                    const isPositive = (item.quote?.d ?? 0) >= 0;
                    const changeColor = isPositive ? "text-emerald-400 bg-emerald-500/10" : "text-rose-400 bg-rose-500/10";
                    const sparklineData = mockSparklineData(changePercent);

                    return (
                      <tr key={item.symbol} className="border-b border-white/10 hover:bg-white/5 transition-colors group">
                        {/* Symbol */}
                        <td className="px-4 py-3">
                          <Link href={`/stocks/${item.symbol}`} className="text-sm font-semibold text-white/90 hover:text-[#F5C84B] transition-colors block">
                            {item.symbol}
                          </Link>
                          <div className="text-xs text-white/30 mt-1">Equity</div>
                        </td>

                        {/* Price */}
                        <td className="px-4 py-3 text-right">
                          <div className="font-mono text-sm text-white/90">
                            {item.quote?.c != null ? `$${item.quote.c.toFixed(2)}` : "—"}
                          </div>
                          <div className="text-xs text-white/40 mt-0.5">USD</div>
                        </td>

                        {/* Change (No background) */}
                        <td className={`px-4 py-3 text-right font-mono text-sm ${
                          isPositive ? "text-emerald-400" : "text-rose-400"
                        }`}>
                          {item.quote?.d != null ? (
                            <>
                              {item.quote.d > 0 ? "+" : ""}
                              {item.quote.d.toFixed(2)}
                            </>
                          ) : (
                            "—"
                          )}
                        </td>

                        {/* % Change (Pill) */}
                        <td className="px-4 py-3 text-right">
                          {item.quote?.dp != null ? (
                            <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-medium ${isPositive ? "text-emerald-400 bg-emerald-500/10" : "text-rose-400 bg-rose-500/10"}`}>
                              {item.quote.dp > 0 ? "+" : ""}
                              {item.quote.dp.toFixed(2)}%
                            </span>
                          ) : (
                            <span className="text-white/40">—</span>
                          )}
                        </td>

                        {/* Trend (Sparkline) */}
                        <td className="px-4 py-3 text-center">
                          {sparklineData.length > 0 ? (
                            <Sparkline data={sparklineData} color={isPositive ? "emerald" : "rose"} width={60} height={20} />
                          ) : (
                            <span className="text-white/20 text-xs">—</span>
                          )}
                        </td>

                        {/* Volume */}
                        <td className="px-4 py-3 text-right font-mono text-sm text-white/70">
                          {/* TODO: Map volume from API response */}—
                        </td>

                        {/* Market Cap */}
                        <td className="px-4 py-3 text-right font-mono text-sm text-white/70">
                          {/* TODO: Map market cap from API response */}—
                        </td>

                        {/* Updated */}
                        <td className="px-4 py-3 text-right text-xs text-white/50">
                          {item.quote?.t ? new Date(item.quote.t * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Link href={`/stocks/${item.symbol}`} className="p-2 rounded-lg border border-white/10 hover:bg-white/5 transition-colors" title="View">
                              <svg className="w-4 h-4 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </Link>
                            <button onClick={() => handleRemove(item.symbol)} disabled={loading} className="p-2 rounded-lg border border-white/10 hover:bg-rose-500/10 transition-colors disabled:opacity-50" title="Remove">
                              <svg className="w-4 h-4 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}

        {/* Refresh button */}
        {watchlist.length > 0 && (
          <div className="mt-4">
            <button
              onClick={() => fetchWatchlist()}
              disabled={loading}
              className="text-xs text-white/50 hover:text-white/90 transition-colors disabled:opacity-50"
            >
              ↻ Refresh
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
