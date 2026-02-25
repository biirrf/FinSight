import { NextResponse } from "next/server";
import retrieveOsiris from "../../../../lib/osirisRetrieval";
import OpenAI from "openai";

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

    // DEMO: Lowered confidence threshold from 0.2 to 0.05 for stability
    if (!retrieval || retrieval.confidence < 0.05 || !retrieval.passages || retrieval.passages.length === 0) {
      return NextResponse.json({ answer: "Insufficient evidence in my sources.", sources: [] });
    }

    // Build strict prompt using only context passages
    const passagesText = retrieval.passages
      .map((p: any, i: number) => `[[${i + 1}]] ${p.text}\nSource: ${p.sources?.[0]?.url || ""}`)
      .join("\n\n");

    const prompt = `You are a model that must answer using ONLY the provided context passages.\n\nContext:\n${passagesText}\n\nINSTRUCTIONS:\n- Use ONLY the context passages above.\n- Every factual claim must include an inline citation like [1] that refers to the numbered context passage.\n- If you cannot answer the user's query purely from the provided context, output EXACTLY: Insufficient evidence in my sources.\n- Do not invent facts or use outside knowledge.\n\nUSER QUESTION: ${query}\n\nProvide a concise answer followed by citations. If multiple passages support a claim, include multiple citations like [1][3].`;

    let generated: string;
    try {
      generated = await callOpenAI(prompt);
    } catch (e: any) {
      const msg = String(e?.message || e || "").toLowerCase();
      const status = e?.status || e?.statusCode || null;
      console.error("OpenAI call error:", e);
      if (status === 429 || msg.includes("quota") || msg.includes("exceeded") || msg.includes("rate limit")) {
        return NextResponse.json({ answer: "OpenAI quota error.", sources: [] });
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
      console.log(`[OSIRIS DEBUG] Answer missing citations in ${missingBefore} sentence(s). Retrying once to add citations.`);
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
      console.log(`[OSIRIS DEBUG] After retry, still missing citations in ${missingAfter} sentence(s). Returning fallback.`);
      return NextResponse.json({ answer: "Insufficient evidence in my sources.", sources: [] });
    }

    // Ensure strict fallback: if output doesn't contain text or contains the fallback phrase from the model, enforce the exact string
    if (!generated || generated.trim().length === 0) {
      return NextResponse.json({ answer: "Insufficient evidence in my sources.", sources: [] });
    }

    // If model explicitly returned the fallback string, do not return sources
    if (generated.trim() === "Insufficient evidence in my sources.") {
      return NextResponse.json({ answer: generated.trim(), sources: [] });
    }

    // Compose sources list to return (use retrieval.sourcesFlat)
    const sourcesFlat = retrieval.sourcesFlat || [];
    console.log(`[OSIRIS DEBUG] sourcesFlat length before filtering: ${sourcesFlat.length}`);

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

    console.log(`[OSIRIS DEBUG] citedIds: ${Array.from(citedIds).join(",") || "(none)"}, sources after filtering: ${sourcesToReturn.length}`);

    const debug = { confidence: retrieval.confidence, passagesUsed: retrieval.passages.length, noCitations } as any;

    return NextResponse.json({ answer: generated, sources: sourcesToReturn, debug });
  } catch (err: any) {
    console.error("/api/osiris/ask error:", err);
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
