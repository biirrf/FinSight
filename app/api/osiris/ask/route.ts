import { NextResponse } from "next/server";
import retrieveOsiris from "../../../../lib/osirisRetrieval";
import OpenAI from "openai";

const DEBUG = process.env.OSIRIS_DEBUG === "true";
function osirisLog(...args: any[]) {
  if (DEBUG) console.log("[OSIRIS DEBUG]", ...args);
}

async function callOpenAI(prompt: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is required in environment for OSIRIS.");
  const client = new OpenAI({ apiKey });

  const payload = {
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.1,
    max_tokens: 800,
  } as any;

  const res = await client.chat.completions.create(payload);
  // robust extraction across possible response shapes
  try {
    const anyRes: any = res;
    const choice: any = anyRes?.choices?.[0];
    let text: any = undefined;
    if (choice) {
      if (choice.message && (typeof choice.message.content === "string" || Array.isArray(choice.message.content))) {
        text = Array.isArray(choice.message.content) ? choice.message.content.join("") : choice.message.content;
      } else if (choice.delta && typeof choice.delta.content === "string") {
        text = choice.delta.content;
      }
    }
    if (!text && typeof anyRes.outputText === "string") text = anyRes.outputText;
    if (!text) text = JSON.stringify(res);
    return String(text);
  } catch (e) {
    return JSON.stringify(res);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const query = body?.query;
    if (!query) return NextResponse.json({ error: "Missing query" }, { status: 400 });

    // 1) force-clean explanation when user mentions OSIRIS in query
    if (/\bosiris\b/i.test(query)) {
      const answer = `General knowledge response (not from stored OSIRIS sources).

OSIRIS is a Retrieval-Augmented Generation (RAG) system designed for financial intelligence. It answers questions using a structured corpus of stored market summaries, earnings updates, and macroeconomic data.

When sufficient evidence exists in its stored summaries, OSIRIS provides grounded answers with explicit source citations and a confidence score. If no relevant stored evidence is found, it will explicitly state that insufficient evidence exists.

To use OSIRIS:
• Ask about markets, earnings, macro trends, or crypto to receive source-backed answers.
• Ask general finance questions (e.g. “What is CPI?”) for concise explanatory responses.
• If OSIRIS cannot find evidence in its corpus, it will refuse rather than fabricate.

OSIRIS does not browse the web in real time.`;
      return NextResponse.json({ answer, mode: "general", sources: [], debug: { confidence: 0, passagesUsed: 0 } });
    }

    const retrieval = await retrieveOsiris(query);

    // Intent classification for general/definition queries
    function isDefinitionQuery(q: string) {
      if (!q) return false;
      const s = q.trim().toLowerCase();
      const defPrefixes = [
        "what is",
        "define",
        "explain",
        "meaning of",
        "difference between",
        "how does",
        "what does",
      ];
      for (const p of defPrefixes) if (s.startsWith(p) || s.includes(" " + p + " ")) return true;

      const terms = [
        "cpi",
        "gdp",
        "p/e",
        "pe ratio",
        "pe",
        "inflation",
        "yield",
        "etf",
        "bonds",
        "rate cuts",
        "dividend",
        "eps",
        "roe",
        "roa",
        "beta",
      ];
      for (const t of terms) {
        const re = new RegExp("\\b" + t.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&") + "\\b", "i");
        if (re.test(q)) return true;
      }
      return false;
    }

    function explicitSourceRequest(q: string) {
      if (!q) return false;
      const s = q.toLowerCase();
      const phrases = ["in my sources", "according to osiris", "from the corpus", "from stored summaries", "in our sources", "in stored summaries", "according to our sources"];
      return phrases.some((p) => s.includes(p));
    }

    const GROUNDED_THRESHOLD = 0.05;

    const hasPassages = !!(retrieval && retrieval.passages && retrieval.passages.length > 0);
    const confidence = retrieval?.confidence ?? 0;

    const isDef = isDefinitionQuery(query);
    const wantsSources = explicitSourceRequest(query);

    // Mode selection rules:
    // - If query is a definition/general question and user did NOT explicitly ask for sources -> GENERAL mode
    // - Else (non-definition OR explicit source request): require grounded retrieval (passages + confidence >= threshold), otherwise refuse
    if (isDef && !wantsSources) {
      // GENERAL mode: answer using general knowledge (no citations)
      const generalSystem = `You are a concise and accurate finance explainer. Answer the user's question directly using general knowledge. Do NOT invent facts. Do NOT provide citations or sources. At the top of the response add exactly one line: "General knowledge response (not from stored OSIRIS sources)." If the user asks for a value judgement (e.g. "is it good", "is that bad", "should I"), explain what the measure means, what high/low values imply, trade-offs and caveats (e.g. consumers vs markets), and suggest a clarifying question when appropriate. Keep answers concise (2-6 sentences).`;
      try {
        const answer = await callOpenAI(generalSystem + "\n\n" + query);
        return NextResponse.json({ answer, mode: "general", sources: [], debug: { confidence, passagesUsed: retrieval?.passages?.length ?? 0 } });
      } catch (e: any) {
        console.error("OpenAI general mode error:", e);
        return NextResponse.json({ answer: "OpenAI error in general mode.", mode: "general", sources: [], debug: { confidence, passagesUsed: retrieval?.passages?.length ?? 0 } });
      }
    }

    // For grounded mode, require passages and confidence threshold
    const inGrounded = hasPassages && confidence >= GROUNDED_THRESHOLD;
    if (!inGrounded) {
      // Refuse when we cannot provide grounded answer for non-definition or explicit-source requests
      return NextResponse.json({ answer: "No relevant evidence found in the current corpus. OSIRIS does not generate answers without stored support.", mode: null, sources: [], debug: { confidence, passagesUsed: retrieval?.passages?.length ?? 0, retrievalDetails: [] } });
    }

    // Build strict prompt using only context passages (grounded mode)
    const passagesText = retrieval.passages
      .map((p: any, i: number) => `[[${i + 1}]] ${p.text}\nSource: ${p.sources?.[0]?.url || ""}`)
      .join("\n\n");

    // Ask for a concise cited answer using only provided passages.
    const prompt = `You are a model that must answer using ONLY the provided context passages.\n\nContext:\n${passagesText}\n\nINSTRUCTIONS:\n- Use ONLY the context passages above.\n- Answer the USER QUESTION in concise sentences.\n- EVERY sentence must include at least one inline citation like [1] or [1][2] referring to the numbered context passages above.\n- Do not include any trailing uncited sentence or extra commentary.\n- If you cannot produce a cited answer using only the provided passages, output EXACTLY: Insufficient evidence in my sources.\n\nUSER QUESTION: ${query}`;

    // (general fallback handled earlier) continue with grounded generation

    let generated: string;
    try {
      generated = await callOpenAI(prompt);
    } catch (e: any) {
      const msg = String(e?.message || e || "").toLowerCase();
      const status = e?.status || e?.statusCode || null;
      console.error("OpenAI call error:", e);
      if (status === 429 || msg.includes("quota") || msg.includes("exceeded") || msg.includes("rate limit")) {
        return NextResponse.json({ answer: "OpenAI quota error.", mode: null, sources: [], debug: { confidence, passagesUsed: retrieval?.passages?.length ?? 0 } });
      }
      throw e;
    }

    // citation helpers
    function hasAtLeastOneCitation(text: string) {
      return /\[(\d+)\]/.test(text);
    }

    function sentencesMissingCitations(text: string) {
      const parts = text
        .split(/(?<=[.?!])\s+/)
        .map((s) => s.trim())
        .filter(Boolean);

      let without = 0;

      for (const p of parts) {
        if (!/[A-Za-z0-9]/.test(p)) continue;
        if (!/\[(\d+)\]/.test(p)) without += 1;
      }

      return without;
    }

    const missingBefore = sentencesMissingCitations(generated);

    if (!hasAtLeastOneCitation(generated) || missingBefore > 0) {
      osirisLog("Answer missing citations. Retrying once.");

      const retryPrompt = `Add inline citations like [1] using ONLY the provided context.
Do not add new facts.
Ensure every sentence contains at least one citation.
If not possible, output EXACTLY: Insufficient evidence in my sources.

Context:
${passagesText}

CURRENT ANSWER:
${generated}`;

      try {
        generated = await callOpenAI(retryPrompt);
      } catch (e: any) {
        console.error("Retry failed:", e);
      }
    }

    const missingAfter = sentencesMissingCitations(generated);

    if (!hasAtLeastOneCitation(generated) || missingAfter > 0) {
      osirisLog("Still missing citations after retry. Returning fallback.");
      return NextResponse.json({
        answer: "No relevant evidence found in the current corpus. OSIRIS does not generate answers without stored support.",
        mode: null,
        sources: [],
        debug: { confidence, passagesUsed: retrieval.passages.length, retrievalDetails: retrieval.retrievalDetails || [] }
      });
    }

    // Ensure strict fallback: if output doesn't contain text or contains the fallback phrase from the model, enforce the exact string
    if (!generated || generated.trim().length === 0) {
      return NextResponse.json({ answer: "No relevant evidence found in the current corpus. OSIRIS does not generate answers without stored support.", mode: null, sources: [], debug: { confidence, passagesUsed: retrieval.passages.length, retrievalDetails: retrieval.retrievalDetails || [] } });
    }

    // If model explicitly returned the fallback string, do not return sources
    if (generated.trim() === "Insufficient evidence in my sources." || generated.trim() === "No relevant evidence found in the current corpus. OSIRIS does not generate answers without stored support.") {
      return NextResponse.json({ answer: "No relevant evidence found in the current corpus. OSIRIS does not generate answers without stored support.", mode: null, sources: [], debug: { confidence, passagesUsed: retrieval.passages.length, retrievalDetails: retrieval.retrievalDetails || [] } });
    }

    // Compose sources list to return (use retrieval.sourcesFlat)
    const sourcesFlat = retrieval.sourcesFlat || [];
    osirisLog(`sourcesFlat length before filtering: ${sourcesFlat.length}`);

    // Parse citations from the generated answer like [1], [2]
    const citedIds = new Set<number>();
    const citationRegex = /\[(\d+)\]/g;
    let m: RegExpExecArray | null;
    while ((m = citationRegex.exec(generated)) !== null) {
      const id = Number(m[1]);
      if (!isNaN(id)) citedIds.add(id);
    }

    let sourcesToReturn = sourcesFlat;
    let noCitations = false;
    if (citedIds.size > 0) {
      // Filter sourcesFlat to only include cited ids, preserve ordering by id
      sourcesToReturn = sourcesFlat.filter((s) => citedIds.has(s.id)).sort((a, b) => a.id - b.id);
    } else {
      // No citations found in generated answer
      noCitations = true;
      // If answer is the strict fallback, ensure no sources are returned
      if (generated.trim() === "Insufficient evidence in my sources." || generated.trim() === "No relevant evidence found in the current corpus. OSIRIS does not generate answers without stored support.") {
        sourcesToReturn = [];
      }
    }

    osirisLog(`citedIds: ${Array.from(citedIds).join(",") || "(none)"}, sources after filtering: ${sourcesToReturn.length}`);

    const debug = { confidence: retrieval.confidence, passagesUsed: retrieval.passages.length, noCitations, retrievalDetails: retrieval.retrievalDetails || [] } as any;

    return NextResponse.json({ answer: generated, mode: "grounded", sources: sourcesToReturn, debug });
  } catch (err: any) {
    console.error("/api/osiris/ask error:", err);
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
