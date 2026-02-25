"use client"

import React, { useState, useRef } from "react"
import { Button } from "@/components/ui/button"

const EXAMPLES = [
  {
    id: "tsla",
    label: "TSLA earnings",
    desc: "Summarise what our stored sources say about Tesla’s latest results.",
    question: "Summarise what our stored sources say about Tesla’s latest results.",
  },
  {
    id: "bitcoin",
    label: "Bitcoin update",
    desc: "Pull crypto highlights from the summaries and cite sources.",
    question: "Pull crypto highlights from the stored summaries and cite sources.",
  },
  {
    id: "fed",
    label: "Fed signals",
    desc: "What did the Fed indicate recently in our sources?",
    question: "What did the Fed indicate recently in our stored summaries?",
  },
  {
    id: "cpi",
    label: "CPI trend",
    desc: "Explain CPI-related notes from the stored summaries.",
    question: "Explain CPI-related notes from the stored summaries.",
  },
]

export default function Page() {
  const [query, setQuery] = useState("")
  const [answer, setAnswer] = useState<string | null>(null)
  const [sources, setSources] = useState<Array<{ id: number; title: string; url: string }>>([])
  const [confidence, setConfidence] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  async function ask(q?: string) {
    const payloadQuery = (q ?? query).trim()
    if (!payloadQuery) return
    setLoading(true)
    setAnswer(null)
    setSources([])
    setConfidence(null)
    try {
      const res = await fetch("/api/osiris/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: payloadQuery }),
      })
      const data = await res.json()
      if (data?.answer) setAnswer(data.answer)
      if (Array.isArray(data?.sources)) setSources(data.sources)
      if (data?.debug?.confidence !== undefined) setConfidence(data.debug.confidence)
    } catch (err) {
      setAnswer("Error calling API")
    } finally {
      setLoading(false)
    }
  }

  function clearAll() {
    setQuery("")
    setAnswer(null)
    setSources([])
    setConfidence(null)
  }

  // derive cited ids from answer text (if present)
  const citedIds = React.useMemo(() => {
    if (!answer) return [] as number[]
    const re = /\[(\d+)\]/g
    const ids: number[] = []
    let m: RegExpExecArray | null
    while ((m = re.exec(answer))) {
      const n = Number(m[1])
      if (!Number.isNaN(n)) ids.push(n)
    }
    return Array.from(new Set(ids))
  }, [answer])

  const filteredSources = React.useMemo(() => {
    if (!citedIds.length) return sources
    return sources.filter((s) => citedIds.includes(s.id))
  }, [sources, citedIds])

  return (
    <div className="flex min-h-screen home-wrapper">
      <section className="w-full container">
        <div className="space-y-2 mb-12">
          <h1 className="form-title">OSIRIS</h1>
          <p className="text-xs text-gray-500">Ask questions about markets, earnings, and trends. OSIRIS answers only from stored summaries with citations.</p>
        </div>

        <section className="w-full space-y-8 home-section mt-6">
          {/* Full-width Ask card */}
          <div className="w-full">
            <div className="bg-gray-800 border border-gray-600 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-100 mb-4">Ask OSIRIS</h3>
              <div className="space-y-4">
                <textarea
                  id="osirisQuery"
                  ref={textareaRef}
                  className="w-full bg-gray-900 text-gray-100 border border-gray-700 rounded-lg p-4 resize-none focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500/20 placeholder:text-gray-600"
                  style={{
                    minHeight: "110px",
                    lineHeight: "1.6",
                    fontFamily: "inherit",
                  }}
                  placeholder="Ask about TSLA earnings, Bitcoin trends, Fed signals, CPI changes, or any market topic…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      ask()
                    }
                  }}
                />

                <div className="flex items-center justify-end gap-3">
                  <Button variant="ghost" onClick={clearAll} className="text-gray-400 hover:text-gray-200">
                    Clear
                  </Button>
                  <Button className="yellow-btn" onClick={() => ask()} disabled={loading || !query.trim()}>
                    {loading ? (
                      <>
                        <span className="animate-spin mr-2">⚙️</span>
                        Asking…
                      </>
                    ) : (
                      "Ask"
                    )}
                  </Button>
                </div>

                <div className="pt-2">
                  <div className="text-xs text-gray-400 mb-3 font-medium">Try a sample query</div>
                  <div className="flex flex-wrap gap-4">
                    {EXAMPLES.map((ex) => (
                      <button
                        key={ex.id}
                        onClick={() => {
                          setQuery(ex.question)
                          setTimeout(() => textareaRef.current?.focus(), 50)
                        }}
                        className="text-xs px-4 py-2.5 rounded-full border border-gray-600 text-gray-300 bg-gray-900 hover:bg-gray-800 hover:border-yellow-500/60 hover:text-yellow-400 hover:shadow-sm transition-all duration-150 cursor-pointer"
                      >
                        {ex.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 2-column grid: Answer (2/3), Sources (1/3) */}
          <div className="grid w-full gap-8 grid-cols-3 mt-10">
            <div className="col-span-2">
              <div className="bg-gray-800 border border-gray-600 border-t border-t-yellow-500/15 rounded-xl p-7">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-semibold text-gray-100">AI Response</h3>
                  {confidence !== null && answer && answer !== "Insufficient evidence in my sources." && (
                    <div className="text-xs px-3 py-1.5 rounded-full border border-gray-700 bg-gray-900/50 text-gray-400">
                      Confidence: {Math.round(Number(confidence) * 100)}%
                    </div>
                  )}
                </div>

                {answer === null ? (
                  <div className="text-gray-500 text-sm">Ask a question to get started.</div>
                ) : answer === "Insufficient evidence in my sources." ? (
                  <div className="text-gray-400 text-sm">
                    <div>No supporting evidence found in stored summaries.</div>
                    <div className="mt-2 text-xs text-gray-500">Try a different query or pick a quick example.</div>
                  </div>
                ) : (
                  <div className="text-gray-100 leading-relaxed text-base" style={{ whiteSpace: "pre-wrap", lineHeight: "1.7" }}>{answer}</div>
                )}
              </div>
            </div>

            {/* Sources card - only render if sources exist */}
            {filteredSources.length > 0 && (
            <div className="col-span-1">
              <div className="bg-gray-800 border border-gray-600 rounded-xl p-7">
                <h3 className="text-lg font-bold text-gray-100 mb-4">Sources</h3>
                <ul className="space-y-0">
                  {filteredSources.map((s, idx) => {
                    let host = ""
                    try {
                      host = new URL(s.url).hostname
                    } catch (e) {
                      host = s.url
                    }
                    return (
                      <li key={s.id} className={idx > 0 ? "border-t border-gray-700 pt-3 mt-3" : ""}>
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noreferrer"
                          className="block p-3 rounded-lg hover:bg-gray-700/60 transition-colors duration-150 cursor-pointer"
                        >
                          <div className="font-bold text-gray-100 text-sm hover:text-yellow-400 transition-colors duration-150">{s.title}</div>
                          <div className="text-xs text-gray-500 mt-1">{host}</div>
                        </a>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </div>
            )}
          </div>
        </section>
      </section>
    </div>
  )
}
