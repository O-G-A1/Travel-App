# Voyara

A premium, responsive travel planning MVP built with Next.js, TypeScript, Tailwind CSS 4, shadcn/ui primitives, and Supabase. The visual system combines reusable accessible UI components with Voyara’s travel-focused styling. Without Supabase credentials, the app runs in clearly labeled **browser demo mode**. With Supabase configured, authenticated records are stored in the user's project and protected by row-level security.

## What works now

- Responsive dashboard and mobile navigation, light/dark appearance toggle.
- Create and delete trips with destination and dates. In cloud mode, trip records are owner-scoped in Supabase.
- Add, edit, and remove day-by-day itinerary items and categorized expenses; in cloud mode they are stored in Supabase and in demo mode they persist in this browser. Budget totals derive from entered expense records.
- Contextual assistant UI and server endpoint. Without credentials, it explains how to configure an AI provider. With an OpenAI-compatible API, it returns clearly bounded planning suggestions.
- AI itinerary drafts using destination, dates, budget, currency, travel style, interests, and group size. Results are schema-validated, saved into the editable schedule, and marked as suggestions to verify. This needs the optional server-side AI configuration.
- PWA shell caching and an account-scoped offline copy of essential cloud trip, itinerary, and packing data on devices that have loaded those records. Map tiles, expenses, contacts, and other live-provider data are not cached offline.
- Private emergency contacts, categorized packing lists, saved places, trip reminders, trip journals, and private document uploads; reminders only fire while Voyara is open (no background push service is configured).
- Initial relational Supabase schema with RLS policies for profiles, trips, collaborators, itinerary, expenses, packing, emergency contacts, saved places, documents, journal entries, and reminders.

The dashboard’s illustrative destination imagery is from Unsplash. Weather currently shows present conditions only, not a forecast for future trip dates. Map tiles and explicit location search use Geoapify with OpenStreetMap data; the map stays disconnected until a key is configured. Booking inventory is not connected. Budget category amounts are planning estimates. When Supabase variables are configured, email/password registration, sign-in, sign-out, email confirmation, and password reset are enabled. Without them, the app remains in browser demo mode. Cloud trips, itinerary items, expenses, packing lists, reminders, journal entries, and document metadata use Supabase RLS; trusted contacts are private to the account owner. Trip documents use a private Supabase Storage bucket, a 15 MB upload limit, an allowlist of file types, and short-lived signed read URLs. Photo attachments in journals are not implemented.

## Local development

Requirements: Node.js 20+ and npm.

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open http://localhost:3000. Leave optional keys blank to use demo mode. `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` are available.

## Environment variables

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase project URL and public anon key. Both values enable authentication and RLS-protected cloud data. Never put a service role key in client-visible variables.
- `AI_API_BASE_URL`, `AI_API_KEY`, `AI_MODEL`: Optional server-only OpenAI-compatible chat completions provider. Set the base URL without `/chat/completions`; keep the secret server-side. Assistant input is schema-validated, capped at 20 requests per in-memory IP window, times out after 20 seconds, and handles provider failures. The in-memory limit is best-effort and resets on serverless cold starts; production should use a shared rate limiter.
- `WEATHER_API_KEY`: optional server-only WeatherAPI.com credential. The current-condition card remains unavailable until configured and states this clearly. Live data is cached for an hour and visibly attributed; the free plan permits commercial use but requires attribution and a user-facing safety disclaimer. The WeatherAPI key is not sent to the browser.
- `NEXT_PUBLIC_GEOAPIFY_API_KEY`: optional public map key used by the browser to load OSM-based map tiles. Restrict this key to allowed domains in Geoapify. The same key is used server-side for user-initiated place searches.
- `NEXT_PUBLIC_ANALYTICS_ENDPOINT`: reserved; no analytics events are sent by this MVP.
- Currency conversion uses Frankfurter’s public API, which requires no key and publishes daily reference rates; conversions are estimates rather than bank rates. WeatherAPI.com receives the destination only when you request a weather check. Currency rate requests include only currency codes.
- `NEXT_PUBLIC_APP_NAME`: optional display name override; defaults to Voyara.

## Supabase setup

1. Create a Supabase project (the free plan is sufficient for development).
2. In the project SQL editor, apply these files in order: `202610260001_initial_schema.sql`, `202610260002_profile_trigger.sql`, `202610260003_trip_policy_hardening.sql`, `202610260004_packing_emergency.sql`, `202610260005_map_places.sql`, `202610260006_private_trip_vault.sql`, and `202610260007_trip_collaboration.sql`. If you previously applied 001–005, run only 006 and 007 now. If you applied through 006, run only 007.
3. In Supabase **Authentication → URL Configuration**, set Site URL to `http://localhost:3000` and add `http://localhost:3000/auth/callback` to Redirect URLs. After deployment, add your production callback URL too.
4. Copy the Project URL and anon/publishable key into the matching fields in `.env.local`, restart `npm run dev`, and create an account. Do not send credentials in chat or commit `.env.local`.
5. Email confirmation uses `/auth/callback`; password recovery uses `/auth/callback` and `/auth/update-password`. Once signed in, trips, itinerary items, expenses, packing lists, reminders, journal entries, and documents are cloud records protected by RLS. Emergency contacts and saved places are scoped to your user account.

The migrations enable RLS and scope records to trip owners and listed members. Saved places and emergency contacts are user-scoped. Collaboration uses seven-day, single-use invitation links restricted to the entered email; the owner shares the link manually because no email service is configured. Trip documents use a private bucket and short-lived signed URLs. No service-role access is used by the app.

## Journey marketplace foundation

Apply `supabase/migrations/202611020001_marketplace_foundation.sql` after the existing migrations. It is additive and leaves planner records intact. It creates driver onboarding status, vehicle records, intrastate/interstate journey listings, stops, passenger booking requests, reviews, user reports, and user blocks. RLS limits booking visibility to the passenger and journey driver; driver verification fields are protected from self-editing. A database function accepts bookings while reserving seat capacity atomically.

The Journeys screen currently supports authenticated journey discovery, onboarding record creation, publishing form validation, passenger seat requests, and driver accept/decline and passenger cancellation workflows. Accepting reserves capacity atomically; direct edits to booking state are not granted to client roles. Publishing is intentionally unavailable until an operator/provider verifies driver identity, licence, and vehicle. No verification provider, admin review workflow, passenger/driver direct payment, payment gateway, GPS tracking, SMS/email notifications, or driver bank details are configured by this foundation. This release does not claim to monitor journeys or dispatch emergencies.

Production integrations to configure in later phases: a server-side identity/document verification provider, maps/geocoding and routing service, location update transport (typically authenticated realtime/WebSocket), push/email/SMS delivery, private media storage, and a subscription payment gateway. Provider secrets must stay server-side; never put payment or identity-provider secret keys in `NEXT_PUBLIC_*` variables. Supabase credentials enable persistence and authentication; without them, marketplace requests show a connection/sign-in state instead of sample inventory.

## Marketplace delivery roadmap

1. **Platform/data foundation (this release):** additive marketplace tables, RLS, driver verification gates, journey discovery/publishing, seat requests, response/cancel actions, and migration/setup documentation.
2. **Driver verification and operations:** admin role model and dashboard, secure document upload bucket, provider callbacks/webhooks, identity/licence/vehicle review queue, driver subscriptions, and auditable actions.
3. **Payments and communications:** booking payment instructions visible only to accepted participants, confirmation/dispute flows, optional subscription checkout, and transactional notifications.
4. **Journey safety:** route geometry and multiple-stop editing, consented live location with expiry, ETA updates, passenger/admin monitoring, journey sharing, and emergency/report escalation.
5. **Social network:** profiles/follows, feed posts and media, likes/comments, groups, direct messaging, discovery, blocking, and content reporting/moderation.
6. **Launch hardening:** shared rate limits, observability, data export/deletion, migration/RLS integration tests, mobile-device QA, retention policies, and production deployment review.

The existing project is a responsive web application; it is not a native iOS/Android app. This marketplace release has not yet implemented those later phases, and it has not been connected to a live Supabase project, so apply the migration and exercise policies with separate passenger/driver accounts before pilot use.

## AI adapter

The routes at `app/api/assistant/route.ts` and `app/api/itinerary/generate/route.ts` use a provider-independent OpenAI-compatible chat completions contract. They only call a provider when all three AI variables are set. The itinerary endpoint validates structured JSON and date bounds before it can be saved. Neither route calls live search or claims real-time results. Validate provider compatibility and privacy/data retention terms before sending user content to a provider.

## Deploy to Vercel

Import the repository into Vercel, use the Next.js preset, configure environment variables, then deploy. Keep AI secrets server-only. Optional integration variables can remain unset. The app can also deploy with zero recurring service spend using demo mode; Vercel/Supabase free-tier quotas and terms may change. Images currently load from Unsplash at runtime.

## Security, privacy, and production gaps

Security headers are set in `next.config.ts`. Legal templates live in `docs/privacy-policy-template.md` and `docs/terms-template.md`; they are drafts requiring legal review. Before commercial launch, replace in-memory API rate limits with a shared store, exercise RLS and Storage policies with real Supabase users, add error monitoring and account deletion, and review legal/privacy disclosures. WeatherAPI terms require provider attribution and a user-facing disclaimer; exchange estimates use public daily reference rates and may differ from card or bank rates. This MVP has no analytics by default and stores browser demo data until the user clears site storage.

## Implementation scope

This product is being implemented in phases. The current MVP includes registration/sign-in, profile settings, cloud trip data, day-by-day itinerary editing, AI itinerary drafts, expenses, current destination weather, daily currency conversion, map search and saved places, packing lists, reminders, trusted contacts, trip journals, private document storage, collaborative planning with email-bound invitation links, and offline access to previously loaded trip/itinerary/packing data. Remaining product work includes journal photo attachments, account deletion/export, and expanded end-to-end authorization tests. No live forecast for future trip dates or booking inventory is claimed.
