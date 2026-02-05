import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import * as functionsModule from "@/lib/inngest/functions";

const functions = Object.values(functionsModule) as any[];

export const { GET, POST, PUT } = serve(inngest, ...functions);
import { inngest } from "@/lib/inngest/client";
import { sendDailyNewsSummary, sendSignUpEmail } from "@/lib/inngest/functions";
import { serve } from "inngest/next";


export const { GET, POST, PUT } = serve({
    client: inngest,
    functions: [sendSignUpEmail, sendDailyNewsSummary],
})