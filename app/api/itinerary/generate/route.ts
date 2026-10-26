import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isItineraryWithinTrip } from '@/lib/itinerary-core.js';

const requestSchema = z.object({
  destination: z.string().trim().min(1).max(120),
  country: z.string().trim().max(120).optional(),
  startDate: z.string().date(),
  endDate: z.string().date(),
  budget: z.number().nonnegative().max(10_000_000),
  currency: z.string().length(3),
  travelStyle: z.string().trim().max(80),
  interests: z.array(z.string().trim().max(60)).max(12),
  groupSize: z.number().int().min(1).max(30),
});

const outputSchema = z.object({
  activities: z.array(z.object({
    date: z.string().date(),
    time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    title: z.string().trim().min(2).max(120),
    place: z.string().trim().max(160),
  })).min(1).max(30),
});

const windows = new Map<string, { count: number; reset: number }>();

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const now = Date.now();
  const window = windows.get(ip);
  if (window && window.reset > now && window.count >= 5) {
    return NextResponse.json({ error: 'Please wait a minute before drafting another itinerary.' }, { status: 429 });
  }
  windows.set(ip, !window || window.reset < now ? { count: 1, reset: now + 60_000 } : { count: window.count + 1, reset: window.reset });

  let input;
  try {
    const parsed = requestSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: 'Check the trip dates and planning details, then try again.' }, { status: 400 });
    input = parsed.data;
  } catch {
    return NextResponse.json({ error: 'Please send valid trip details.' }, { status: 400 });
  }
  if (input.endDate < input.startDate) return NextResponse.json({ error: 'The return date must follow the start date.' }, { status: 400 });
  const days = Math.floor((Date.parse(`${input.endDate}T12:00:00Z`) - Date.parse(`${input.startDate}T12:00:00Z`)) / 86_400_000) + 1;
  if (days > 30) return NextResponse.json({ error: 'AI itinerary drafts are limited to trips of 30 days.' }, { status: 400 });

  const { AI_API_BASE_URL: base, AI_API_KEY: key, AI_MODEL: model } = process.env;
  if (!base || !key || !model) return NextResponse.json({ error: 'AI itinerary drafting is not connected. Add AI_API_BASE_URL, AI_API_KEY, and AI_MODEL on the server.' }, { status: 503 });
  try {
    const response = await fetch(`${base.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model, temperature: 0.4, max_tokens: 1800, response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'Create a practical, relaxed travel itinerary draft. Return JSON only in shape {"activities":[{"date":"YYYY-MM-DD","time":"HH:MM","title":"...","place":"..."}]}. Use only dates within the supplied trip, at most 3 activities per day, sensible gaps, and no invented opening hours, prices, reservations, or live availability. State place names as ideas to verify. Spread activities across the trip.' },
          { role: 'user', content: JSON.stringify({ ...input, dayCount: days }) },
        ],
      }),
      signal: AbortSignal.timeout(25_000),
    });
    if (!response.ok) return NextResponse.json({ error: response.status === 429 ? 'The AI provider is busy. Try again shortly.' : 'The configured AI provider could not draft this itinerary.' }, { status: 502 });
    const json = await response.json();
    const content = json?.choices?.[0]?.message?.content;
    const decoded = typeof content === 'string' ? JSON.parse(content) : null;
    const parsedOutput = outputSchema.safeParse(decoded);
    if (!parsedOutput.success || !isItineraryWithinTrip(parsedOutput.data.activities, input.startDate, input.endDate)) {
      return NextResponse.json({ error: 'The AI provider returned an itinerary we could not validate. Please try again.' }, { status: 502 });
    }
    return NextResponse.json(parsedOutput.data);
  } catch {
    return NextResponse.json({ error: 'Could not reach the AI provider. Check its server URL and try again.' }, { status: 502 });
  }
}
