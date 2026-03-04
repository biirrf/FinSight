import { NextResponse } from "next/server";
import getOsirisCollection from "../../../../lib/mongoOsiris";

export async function GET() {
  try {
    const col = await getOsirisCollection();

    const totalDocs = await col.countDocuments();

    // Aggregate categories counts
    const categoriesAgg = await col
      .aggregate([
        { $match: { category: { $exists: true, $ne: null } } },
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ])
      .toArray();

    const categories = categoriesAgg.map((c: any) => ({ name: c._id || "(unknown)", count: c.count }));

    // Aggregate tickers (assumes `tickers` is an array field on documents)
    const tickersAgg = await col
      .aggregate([
        { $match: { tickers: { $exists: true, $ne: null } } },
        { $unwind: "$tickers" },
        { $group: { _id: { $toUpper: "$tickers" }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 100 },
      ])
      .toArray();

    const tickers = tickersAgg.map((t: any) => ({ ticker: String(t._id), count: t.count }));

    // Build deterministic suggested queries (12-20 max)
    const suggestions: string[] = [];

    // Add top tickers -> phrasing: Summarise what the stored summaries say about <TICKER>.
    const maxTickerSuggestions = 10;
    for (let i = 0; i < Math.min(tickers.length, maxTickerSuggestions); i++) {
      const t = tickers[i].ticker;
      suggestions.push(`Summarise what the stored summaries say about ${t}.`);
    }

    // Map some category keywords to preferred phrasings
    const categoryPhraseMap: { [k: string]: string } = {
      cpi: "Summarise what the stored summaries say about CPI and inflation.",
      inflation: "Summarise what the stored summaries say about CPI and inflation.",
      rate: "Summarise what the stored summaries say about bonds and yields.",
      bond: "Summarise what the stored summaries say about bonds and yields.",
      yield: "Summarise what the stored summaries say about bonds and yields.",
      etf: "Summarise what the stored summaries say about ETF flows.",
      flow: "Summarise what the stored summaries say about ETF flows.",
      market: "Summarise what the stored summaries say about markets and flows.",
    } as any;

    // Add category-based suggestions
    const usedPhrases = new Set<string>(suggestions);
    for (let i = 0; i < Math.min(categories.length, 10); i++) {
      const cat = String(categories[i].name || "");
      const lower = cat.toLowerCase();
      let phrase: string | undefined = undefined;
      for (const key of Object.keys(categoryPhraseMap)) {
        if (lower.includes(key)) {
          phrase = categoryPhraseMap[key];
          break;
        }
      }
      if (!phrase) {
        phrase = `Summarise what the stored summaries say about ${cat}.`;
      }
      if (!usedPhrases.has(phrase)) {
        suggestions.push(phrase);
        usedPhrases.add(phrase);
      }
      if (suggestions.length >= 18) break;
    }

    // Ensure between 12-20 suggestions: if too few, add some generic prompts
    const genericPrompts = [
      "Summarise what the stored summaries say about macroeconomic trends.",
      "Summarise what the stored summaries say about sector rotation.",
      "Summarise what the stored summaries say about Fed policy and rate expectations.",
      "Summarise what the stored summaries say about commodity prices.",
      "Summarise what the stored summaries say about currency moves.",
    ];

    let gi = 0;
    while (suggestions.length < 12 && gi < genericPrompts.length) {
      if (!usedPhrases.has(genericPrompts[gi])) {
        suggestions.push(genericPrompts[gi]);
        usedPhrases.add(genericPrompts[gi]);
      }
      gi++;
    }

    // Cap at 20
    const suggestedGroundedQueries = suggestions.slice(0, 20);

    return NextResponse.json({ totalDocs, categories, tickers, suggestedGroundedQueries });
  } catch (err: any) {
    console.error("/api/osiris/coverage error:", err);
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
