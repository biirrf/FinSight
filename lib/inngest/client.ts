import { Inngest } from "inngest";

const INNGEST_EVENT_KEY = process.env.INNGEST_EVENT_KEY ?? process.env.NEXT_PUBLIC_INNGEST_EVENT_KEY;
const INNGEST_API_KEY = process.env.INNGEST_API_KEY ?? process.env.NEXT_PUBLIC_INNGEST_API_KEY;

if (!INNGEST_EVENT_KEY && !INNGEST_API_KEY) {
    console.warn('Inngest: missing INNGEST_EVENT_KEY / INNGEST_API_KEY - events may fail with 401 (Event key not found)');
}

export const inngest = new Inngest({
    id: "fin-sight",
    eventKey: INNGEST_EVENT_KEY,
    apiKey: INNGEST_API_KEY,
    ai: { gemini: { apiKey: process.env.GEMINI_API_KEY ?? undefined } }
});

