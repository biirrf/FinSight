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
  // robust extraction across possible shapes
  const choice = res?.choices?.[0];
  const text = choice?.message?.content || choice?.message?.content?.[0] || choice?.delta?.content || res?.outputText || JSON.stringify(res);
  return String(text);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const query = body?.query;
    if (!query) return NextResponse.json({ error: "Missing query" }, { status: 400 });

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
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) throw new Error("OPENAI_API_KEY is required in environment for OSIRIS.");
        const client = new OpenAI({ apiKey });
        const payload = {
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: generalSystem },
            { role: "user", content: query },
          ],
          temperature: 0.2,
          max_tokens: 400,
        } as any;
        const res = await client.chat.completions.create(payload);
        const choice = res?.choices?.[0];
        const text = choice?.message?.content || choice?.delta?.content || res?.outputText || JSON.stringify(res);
        const answer = String(text);
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
      return NextResponse.json({ answer: "Insufficient evidence in my sources.", mode: null, sources: [], debug: { confidence, passagesUsed: retrieval?.passages?.length ?? 0 } });
    }

    // Build strict prompt using only context passages (grounded mode)
    const passagesText = retrieval.passages
      .map((p: any, i: number) => `[[${i + 1}]] ${p.text}\nSource: ${p.sources?.[0]?.url || ""}`)
      .join("\n\n");
    const prompt = `You are a model that must answer using ONLY the provided context passages.\n\nContext:\n${passagesText}\n\nINSTRUCTIONS:\n- Use ONLY the context passages above.\n- Every factual claim must include an inline citation like [1] that refers to the numbered context passage.\n- If you cannot answer the user's query purely from the provided context, output EXACTLY: Insufficient evidence in my sources.\n- Do not invent facts or use outside knowledge.\n\nUSER QUESTION: ${query}\n\nProvide a concise answer followed by citations. If multiple passages support a claim, include multiple citations like [1][3].`;

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
      // rethrow to be handled by outer catch
      throw e;
    }

    // Helper: count sentences and whether they contain citations
    function sentencesWithoutCitations(text: string) {
      if (!text) return 0;
      // Split on sentence-ending punctuation (., ?, !) followed by space or line break
      const parts = text
        .split(/(?<=[.?!])\s+/)
        .map((s) => s.trim())
        .filter(Boolean);
      let without = 0;
      const citationRe = /\[(\d+)\]/;
      for (const p of parts) {
        // consider only parts containing letters/numbers
        if (!/[A-Za-z0-9]/.test(p)) continue;
        if (!citationRe.test(p)) without += 1;
      }
      return without;
    }

    // If generated answer has sentences lacking citations, retry once with correction prompt
    const missingBefore = sentencesWithoutCitations(generated);
    if (missingBefore > 0 && generated.trim() !== "Insufficient evidence in my sources.") {
      osirisLog(`Answer missing citations in ${missingBefore} sentence(s). Retrying once to add citations.`);
      const retryPrompt = `Add citations for every claim using only the provided sources. Do not add new facts.\n\nContext:\n${passagesText}\n\nCURRENT ANSWER:\n${generated}\n\nINSTRUCTIONS:\n- Ensure each sentence has at least one inline citation like [1] that refers to the numbered context passage.\n- If multiple passages support different facts, include multiple citations like [1][2].\n- Do not invent or add facts.\n- If you cannot add required citations using only the provided sources, output EXACTLY: Insufficient evidence in my sources.`;
      try {
        const retryGenerated = await callOpenAI(retryPrompt);
        generated = retryGenerated;
      } catch (e: any) {
        console.error("OpenAI retry error:", e);
      }
    }

    // After retry, enforce strict fallback if still missing citations
    const missingAfter = sentencesWithoutCitations(generated);
    if (missingAfter > 0) {
      osirisLog(`After retry, still missing citations in ${missingAfter} sentence(s). Returning fallback.`);
      return NextResponse.json({ answer: "Insufficient evidence in my sources.", mode: null, sources: [], debug: { confidence, passagesUsed: retrieval.passages.length } });
    }

    // Ensure strict fallback: if output doesn't contain text or contains the fallback phrase from the model, enforce the exact string
    if (!generated || generated.trim().length === 0) {
      return NextResponse.json({ answer: "Insufficient evidence in my sources.", mode: null, sources: [], debug: { confidence, passagesUsed: retrieval.passages.length } });
    }

    // If model explicitly returned the fallback string, do not return sources
    if (generated.trim() === "Insufficient evidence in my sources.") {
      return NextResponse.json({ answer: generated.trim(), mode: null, sources: [], debug: { confidence, passagesUsed: retrieval.passages.length } });
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
      if (generated.trim() === "Insufficient evidence in my sources.") {
        sourcesToReturn = [];
      }
    }

    osirisLog(`citedIds: ${Array.from(citedIds).join(",") || "(none)"}, sources after filtering: ${sourcesToReturn.length}`);

    const debug = { confidence: retrieval.confidence, passagesUsed: retrieval.passages.length, noCitations } as any;

    return NextResponse.json({ answer: generated, mode: "grounded", sources: sourcesToReturn, debug });
  } catch (err: any) {
    console.error("/api/osiris/ask error:", err);
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
