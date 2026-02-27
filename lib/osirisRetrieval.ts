import { getOsirisCollection } from "./mongoOsiris";

type Source = { title: string; url: string };

// helper to conditionally log
const DEBUG = process.env.OSIRIS_DEBUG === "true";
function osirisLog(...args: any[]) {
  if (DEBUG) console.log("[OSIRIS DEBUG]", ...args);
}

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
  osirisLog(`Text search returned ${docs.length} documents for query: "${query}"`);

  if (!docs || docs.length === 0) {
    osirisLog(`No documents found`);
    return { passages: [], sourcesFlat: [], confidence: 0 };
  }

  // capture topTextScore from original textScore ordering
  const topTextScore = docs[0]?.score ? Number(docs[0].score) : 0;
  osirisLog(`topTextScore: ${topTextScore}`);

  function parseISODate(s: string | undefined) {
    if (!s) return null;
    // assume YYYY-MM-DD
    const d = new Date(s + "T00:00:00Z");
    if (isNaN(d.getTime())) return null;
    return d;
  }

  // boost configuration
  const TICKER_BOOST_LIST = [
    "TSLA","NVDA","AAPL","MSFT","AMZN","META","GOOG","GOOGL","JPM","BTC","ETH",
  ];
  const CATEGORY_BOOST_MAP: Record<string, string[]> = {
    earnings: ["earnings","results","quarter","guidance"],
    macro: ["cpi","inflation","jobs","payroll","gdp","fed","rates","yields","oil","wti","brent"],
    crypto: ["bitcoin","ethereum","crypto","etf"],
    markets: ["market","s&p","sp500","index","indices"],
  };

  const queryLower = query.toLowerCase();
  const foundTickersInQuery = TICKER_BOOST_LIST.filter((t) => new RegExp(`\\b${t}\\b`, "i").test(query));

  // Apply boosts & sorting in JS
  const scored = docs
    .map((d: any) => {
      let score = d.score ? Number(d.score) : 0;

      // ticker boost: if query contains any known ticker and doc lists it
      if (foundTickersInQuery.length && Array.isArray(d.tickers)) {
        for (const t of foundTickersInQuery) {
          if (d.tickers.includes(t)) {
            score += 2;
            break;
          }
        }
      }

      // category boost based on presence of terms
      const cat = typeof d.category === "string" ? d.category.toLowerCase() : "";
      for (const [catName, terms] of Object.entries(CATEGORY_BOOST_MAP)) {
        if (terms.some((term) => queryLower.includes(term)) && cat === catName) {
          score += 1.5;
        }
      }

      return { doc: d, score };
    })
    .sort((a, b) => b.score - a.score);

  const finalList = scored;
  osirisLog(`After boosts analysis, candidate count: ${finalList.length}`);

  // keep only top 3 for passages
  const docsForPassages = finalList.slice(0, 3);
  osirisLog(`Documents for passages: ${docsForPassages.length}`);

  // Build passages with dedup by bottomLine text
  const passages: Array<{ text: string; sources: Source[]; date: string; category: string; tickers: string[] }> = [];
  const seenBottoms = new Set<string>();
  const sourcesMap = new Map<string, { id: number; title: string; url: string }>();
  let sourceId = 1;

  for (const item of docsForPassages) {
    const d = item.doc;
    const bottom = typeof d.bottomLine === "string" ? d.bottomLine.trim() : "";
    if (!bottom) {
      osirisLog(`Skipping doc without bottomLine: ${d?.title || "(no title)"}`);
      continue;
    }
    if (seenBottoms.has(bottom)) {
      osirisLog(`Skipping duplicate bottomLine passage`);
      continue;
    }
    seenBottoms.add(bottom);

    const bullets = Array.isArray(d.bulletPoints) ? d.bulletPoints.slice(0, 2).filter(Boolean) : [];
    let text = bottom;
    if (bullets.length > 0) {
      text += "\n" + bullets.map((b: string) => `- ${b}`).join("\n");
    }

    const sourcesArr: Source[] = [];
    if (Array.isArray(d.sources)) {
      for (const s of d.sources) {
        const url = s?.url || "";
        const title = s?.title || url;
        if (url) {
          if (!sourcesMap.has(url)) {
            sourcesMap.set(url, { id: sourceId++, title, url });
          }
          sourcesArr.push({ title, url });
        }
      }
    }

    passages.push({ text, sources: sourcesArr, date: d.date || "", category: d.category || "", tickers: Array.isArray(d.tickers) ? d.tickers : [] });
  }

  let sourcesFlat = Array.from(sourcesMap.values()).map((v) => ({ id: v.id, title: v.title, url: v.url }));
  if (sourcesFlat.length > 5) sourcesFlat = sourcesFlat.slice(0, 5);

  // confidence heuristic by passage count
  let confidence: number;
  switch (passages.length) {
    case 3:
      confidence = 0.85;
      break;
    case 2:
      confidence = 0.7;
      break;
    case 1:
      confidence = 0.55;
      break;
    default:
      confidence = 0;
  }

  osirisLog(`Passages built: ${passages.length}, unique URLs in sourcesFlat: ${sourcesFlat.length}, confidence: ${confidence}`);

  return { passages, sourcesFlat, confidence };
}

export default retrieveOsiris;
