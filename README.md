# Voyara Nigeria

Voyara is a Nigeria-focused shared-ride and traveler-connection app. The primary experience is finding intrastate and interstate rides, requesting seats, registering as a passenger or driver, connecting with registered users, and messaging them. Fares are entered and displayed in naira (NGN).

## What is in the app

- Passenger and driver sign-up. Drivers provide vehicle details; passengers can register independently.
- Nigerian state selection and Nigerian examples in ride, account, and community flows.
- Ride search by location and ride type, ride publishing for verified drivers, seat requests, and driver accept/decline actions.
- Public traveler profiles, profile photos, following, a Nigeria-focused text feed, likes, comments, and private one-to-one text messages.
- Private ID and face-photo submission from Profile. These submissions are not automatically checked; see the verification note below.
- WhatsApp-inspired conversation layout, responsive/mobile navigation, and the existing green Voyara palette.

Trip planning, AI itinerary generation, destination assistant responses, weather cards, and travel-destination marketing have been removed from the user-facing app and their API routes have been removed. The database keeps legacy planner tables for existing records, but they are no longer part of the ride-share workflow.

## Run locally

Requirements: Node.js 20+ and npm.

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open <http://localhost:3000>. Without Supabase credentials, the app can show the demo shell, but account registration, live registered-user discovery, chats, and ride listings require Supabase.

## Connect Supabase

1. Create a Supabase project and copy its project URL and public anon/publishable key into `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`. Never use a service-role key in the browser.
2. In Supabase SQL Editor, apply migrations in this order:
   - `202610260001_initial_schema.sql`
   - `202610260002_profile_trigger.sql`
   - `202610260003_trip_policy_hardening.sql`
   - `202610260004_packing_emergency.sql`
   - `202610260005_map_places.sql`
   - `202610260006_private_trip_vault.sql`
   - `202610260007_trip_collaboration.sql`
   - `202611020001_marketplace_foundation.sql`
   - `202611020002_community_foundation.sql`
   - `202611020003_profiles_chat_verification.sql`
3. In Supabase Authentication → URL Configuration, set the local Site URL to `http://localhost:3000` and add `http://localhost:3000/auth/callback` to Redirect URLs. Add production URLs when deploying.
4. Restart the dev server, create separate passenger and driver test accounts, and use **Messages → People** to find each other. Both accounts must use the same Supabase project; this shared project is how users see and contact one another.
5. Test ID uploads only with test files. Driver ride publishing stays locked until identity, licence, and vehicle status are marked verified.

## What still needs your setup or more implementation

- **Verification:** this code securely accepts and stores an ID file and a face photo in a private bucket, but it does not perform liveness checks or automated face matching. There is no reviewer/admin console, so submissions are currently private to the submitting user. Before collecting real IDs, choose an identity-verification provider, configure its server-side credentials and callbacks, create authorized reviewer roles, and define retention/deletion rules. Do not manually mark real users verified from the client.
- **Payments:** fares and seat requests are stored, but no gateway checkout, payout, refund, or dispute flow is connected. You need to choose a Nigerian payment provider and configure server-side credentials and webhook handling.
- **Chat and social:** direct text chat, follows, likes, and comments work through Supabase. Group chats, chat media, feed photo/video uploads, content moderation, push notifications, and delivery/read indicators still need implementation.
- **Operations and safety:** there is no support/admin dashboard, automated abuse review, live trip tracking, emergency dispatch, or customer-support service.
- **App stores:** this repository is a responsive Next.js web app/PWA, not a native iOS or Android project. App Store and Play Store submission requires a native wrapper or native clients, store accounts, device testing, and their review requirements.
- **Launch setup:** add production domains and email delivery, configure backups/monitoring, publish reviewed Privacy Policy and Terms, and run authorization testing with separate accounts before inviting real users.

## Checks

```bash
npm run typecheck
npm run lint
npm test
npm run build
```
