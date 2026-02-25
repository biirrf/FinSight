# FinSight – AI Financial Intelligence Dashboard

## Overview

FinSight is an AI-powered financial intelligence dashboard with an integrated OSIRIS RAG (Retrieval-Augmented Generation) system for contextual research and citation-backed answers.

## Features

- Interactive market dashboard and stock pages
- Watchlists and user authentication
- OSIRIS RAG system for contextual retrieval and citations
- Background job/event integration with Inngest

## OSIRIS (RAG System)

OSIRIS provides retrieval-augmented responses by querying indexed documents and combining them with foundation-model answers. It returns citations for traceability and is integrated into the dashboard for research workflows.

## Tech Stack

- Next.js (App Router)
- TypeScript
- MongoDB (Mongoose)
- OpenAI (or compatible LLM providers)
- Inngest (background events)
- Nodemailer for email flows

## Architecture Overview

The application uses a Next.js frontend (app directory) with server-side components and API routes. OSIRIS handles retrieval and prompt orchestration in the `lib/osiris` and `lib/inngest` modules. Persistent data is stored in MongoDB.

## Installation

1. Clone the repository
2. Install dependencies: `npm install`
3. Create a `.env` file from `.env.example` and fill values (do NOT commit secrets)
4. Run development: `npm run dev`

## Environment Variables Required

Fill these in a local `.env` (do not commit):
- NODE_ENV
- NEXT_PUBLIC_BASE_URL
- MONGODB_URI
- BETTER_AUTH_SECRET
- BETTER_AUTH_URL
- GEMINI_API_KEY
- OPENAI_API_KEY
- NODEMAILER_EMAIL
- NODEMAILER_PASSWORD
- INNGEST_EVENT_KEY
- NEXT_PUBLIC_FINNHUB_API_KEY

## Academic Context

This project is a Final Year Project demonstrating a practical OSIRIS RAG integration with an interactive dashboard for financial intelligence.
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
