'use server'

import { inngest } from '@/lib/inngest/client';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Temporary debugging route to test if Inngest events reach the cloud.
 * Endpoint: GET/POST /api/inngest-test
 * Returns: { success: boolean, message: string, eventSent: object }
 */
export async function GET(request: NextRequest) {
  try {
    const timestamp = new Date().toISOString();
    const testData = {
      email: `test-${Date.now()}@finsight-debug.com`,
      userId: `test-user-${Date.now()}`,
      timestamp,
      environment: process.env.VERCEL_ENV || 'local',
    };

    console.log('[Inngest Test] Sending debug/test event:', testData);

    const eventSent = await inngest.send({
      name: 'debug/test',
      data: testData,
    });

    console.log('[Inngest Test] Event sent successfully:', eventSent);

    return NextResponse.json(
      {
        success: true,
        message: 'debug/test event sent to Inngest Cloud',
        eventSent,
        testData,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Inngest Test] Failed to send event:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to send debug/test event',
        error: errorMessage,
        eventKey: process.env.INNGEST_EVENT_KEY ? 'configured' : 'missing',
        apiKey: process.env.INNGEST_API_KEY ? 'configured' : 'missing',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
