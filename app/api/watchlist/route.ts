import { NextResponse } from "next/server";
import { auth } from "@/lib/better-auth/auth";
import { connectToDatabase } from "@/database/mongoose";
import { Watchlist } from "@/database/models/watchlist.model";
import { getQuote } from "@/lib/actions/finnhub.actions";

// helper to retrieve current user id or return null
async function getUserId(req: Request): Promise<string | null> {
  const session = await auth.api.getSession({ headers: req.headers as any });
  if (!session?.user) return null;
  return session.user.id;
}

export async function GET(req: Request) {
  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();
  try {
    const items = await Watchlist.find({ userId }).lean();

    // enrich with live quote data
    const enriched = await Promise.all(
      items.map(async (it) => {
        try {
          const q = await getQuote(it.symbol);
          return {
            symbol: it.symbol,
            company: it.company,
            addedAt: it.addedAt,
            quote: q,
          };
        } catch (err) {
          return {
            symbol: it.symbol,
            company: it.company,
            addedAt: it.addedAt,
            quote: null,
            quoteError: String(err),
          };
        }
      })
    );

    return NextResponse.json({ watchlist: enriched });
  } catch (err: any) {
    console.error("GET /api/watchlist error", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  let { symbol, company } = body || {};
  if (!symbol || typeof symbol !== "string") {
    return NextResponse.json({ error: "Missing symbol" }, { status: 400 });
  }
  symbol = symbol.trim().toUpperCase();
  if (!symbol) {
    return NextResponse.json({ error: "Invalid symbol" }, { status: 400 });
  }
  company = typeof company === "string" && company.trim() ? company.trim() : symbol;

  await connectToDatabase();
  try {
    const item = new Watchlist({ userId, symbol, company, addedAt: new Date() });
    await item.save();
    return NextResponse.json({ success: true });
  } catch (err: any) {
    // duplicate key error is fine
    if (err.code === 11000) {
      return NextResponse.json({ success: false, message: "Symbol already in watchlist" }, { status: 409 });
    }
    console.error("POST /api/watchlist error", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  let { symbol } = body || {};
  if (!symbol || typeof symbol !== "string") {
    return NextResponse.json({ error: "Missing symbol" }, { status: 400 });
  }
  symbol = symbol.trim().toUpperCase();
  await connectToDatabase();
  try {
    await Watchlist.deleteOne({ userId, symbol });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("DELETE /api/watchlist error", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
