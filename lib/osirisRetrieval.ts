import { getOsirisCollection } from "./mongoOsiris";

type Source = { title: string; url: string };

export async function retrieveOsiris(query: string) {
  if (!query || !query.trim()) {
    return { passages: [], sourcesFlat: [], confidence: 0 };
  }

  const collection = await getOsirisCollection();

  // initial text search (server-side)
  const cursor = collection
    .find(
      { $text: { $search: query } },
      { projection: { score: { $meta: "textScore" }, title: 1, url: 1, date: 1, category: 1, tickers: 1, bottomLine: 1, bulletPoints: 1, sources: 1 } }
    )
    .sort({ score: { $meta: "textScore" } })
    .limit(12);

  const docs = await cursor.toArray();
  console.log(`[OSIRIS DEBUG] Text search returned ${docs.length} documents for query: "${query}"`);

  if (!docs || docs.length === 0) {
    console.log(`[OSIRIS DEBUG] No documents found`);
    return { passages: [], sourcesFlat: [], confidence: 0 };
  }

  // capture topTextScore from original textScore ordering
  const topTextScore = docs[0]?.score ? Number(docs[0].score) : 0;
  console.log(`[OSIRIS DEBUG] topTextScore: ${topTextScore}`);

  function parseISODate(s: string | undefined) {
    if (!s) return null;
    // assume YYYY-MM-DD
    const d = new Date(s + "T00:00:00Z");
    if (isNaN(d.getTime())) return null;
    return d;
  }

  const tickersInQuery = Array.from(query.matchAll(/\b[A-Z]{1,5}\b/g)).map((m) => m[0]);

  const categoryTerms = ["crypto", "earnings", "macro", "markets"];
  const queryLower = query.toLowerCase();

  // DEMO: Disable strict recency filtering. Accept all docs.
  // Apply boosts & filters in JS
  const scored = docs
    .map((d: any) => {
      // base score = textScore
      let score = d.score ? Number(d.score) : 0;

      // ticker boost
      const docTickers: string[] = Array.isArray(d.tickers) ? d.tickers : [];
      const tickerMatch = tickersInQuery.some((t) => docTickers.includes(t));
      if (tickerMatch) score += 2;

      // category boost
      const cat = typeof d.category === "string" ? d.category.toLowerCase() : "";
      for (const term of categoryTerms) {
        if (queryLower.includes(term) && cat.includes(term)) {
          score += 1.5;
        }
      }

      return { doc: d, score };
    })
    .sort((a, b) => b.score - a.score);

  const finalList = scored;
  console.log(`[OSIRIS DEBUG] After boosts analysis, candidate count: ${finalList.length}`);

  // FIXED: Do NOT filter documents during dedup. Keep all for passage construction.
  // URL deduplication happens only at sourcesFlat level via sourcesMap.
  const docsForPassages = finalList.slice(0, 6);
  console.log(`[OSIRIS DEBUG] Documents for passages: ${docsForPassages.length}`);

  // Build passages: top 6 passages; text = bottomLine + up to 2 bulletPoints
  // Keep all documents for passage construction (docsForPassages) but dedupe URLs only when building sourcesFlat
  const passages: Array<{ text: string; sources: Source[]; date: string; category: string; tickers: string[] }> = [];
  const sourcesMap = new Map<string, { id: number; title: string; url: string }>();
  let sourceId = 1;

  for (const item of docsForPassages) {
    const d = item.doc;
    const bottom = typeof d.bottomLine === "string" ? d.bottomLine.trim() : "";
    // Skip documents that do not have a bottomLine (per requirement)
    if (!bottom) {
      console.log(`[OSIRIS DEBUG] Skipping doc without bottomLine: ${d?.title || "(no title)"}`);
      continue;
    }

    const bullets = Array.isArray(d.bulletPoints) ? d.bulletPoints.slice(0, 2).filter(Boolean) : [];
    let text = bottom;
    if (bullets.length > 0) {
      text += "\n" + bullets.map((b: string) => `- ${b}`).join("\n");
    }

    // Collect sources from doc.sources (array of {title,url})
    const sourcesArr: Source[] = [];
    if (Array.isArray(d.sources)) {
      for (const s of d.sources) {
        const url = s?.url || "";
        const title = s?.title || url;
        if (url) {
          // populate the global sourcesMap used to build sourcesFlat (deduped by url)
          if (!sourcesMap.has(url)) {
            sourcesMap.set(url, { id: sourceId++, title, url });
          }
          sourcesArr.push({ title, url });
        }
      }
    }

    passages.push({ text, sources: sourcesArr, date: d.date || "", category: d.category || "", tickers: Array.isArray(d.tickers) ? d.tickers : [] });
  }

  const sourcesFlat = Array.from(sourcesMap.values()).map((v) => ({ id: v.id, title: v.title, url: v.url }));

  const confidence = topTextScore ? Math.min(1, topTextScore / 10) : 0;
  console.log(`[OSIRIS DEBUG] Passages built: ${passages.length}, unique URLs in sourcesFlat: ${sourcesFlat.length}, confidence: ${confidence}`);

  return { passages, sourcesFlat, confidence };
}

export default retrieveOsiris;
