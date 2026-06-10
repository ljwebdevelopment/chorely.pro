# Deploying Chorely

## Why not GitHub Pages

GitHub Pages serves static files only. Chorely is a dynamic Next.js application and depends on server-side functionality that cannot run on a static host:

- **Server actions** — every form in the app (chores, completions, approvals, payouts, reminders, account management) posts to a Next.js server action in `src/lib/actions.ts`.
- **API routes** — `/api/stripe/checkout`, `/api/stripe/portal`, and `/api/stripe/webhook` create checkout sessions and receive Stripe webhook events; `/api/notifications/poll` serves the notification bridge.
- **Middleware** — `src/proxy.ts` refreshes Supabase auth sessions and guards protected routes on every request.
- **Server-rendered pages** — the dashboard, child view, and all account pages render per-user data with `force-dynamic`; they cannot be exported as HTML.
- **Secrets** — the Supabase service-role key and Stripe secret key must live on a server. A static export would either break (no server) or leak nothing because the features simply wouldn't exist.

`next export` would fail outright on the API routes and server actions. The correct platform is **Vercel** (first-party Next.js hosting; the free Hobby tier is sufficient to start, Pro if this is a commercial product).

## Deploy to Vercel (one-time setup, ~10 minutes)

1. **Import the repo**: at [vercel.com/new](https://vercel.com/new), import `ljwebdevelopment/chorely.pro`. Vercel auto-detects Next.js; no build settings need changing.

2. **Set environment variables** (Project → Settings → Environment Variables, all in Production; copy values from your local `.env.local`):

   | Variable | Value |
   | --- | --- |
   | `NEXT_PUBLIC_SITE_URL` | `https://chorely.pro` |
   | `NEXT_PUBLIC_SUPABASE_URL` | your Supabase project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key (secret) |
   | `STRIPE_SECRET_KEY` | Stripe live secret key |
   | `STRIPE_WEBHOOK_SECRET` | from step 5 below |
   | `STRIPE_PRICE_ID` | the $6/month live price ID |
   | `STRIPE_PORTAL_RETURN_URL` | `https://chorely.pro/account/billing` |

3. **Connect chorely.pro**: Project → Settings → Domains → add `chorely.pro` (and `www.chorely.pro`, redirecting to the apex). At your DNS registrar, set:
   - `A` record for `chorely.pro` → `76.76.21.21`
   - `CNAME` for `www` → `cname.vercel-dns.com`

   Vercel provisions HTTPS automatically once DNS propagates.

4. **Update Supabase auth URLs**: Supabase Dashboard → Authentication → URL Configuration → set Site URL to `https://chorely.pro` and add `https://chorely.pro/auth/callback` to Redirect URLs (keep the localhost entries for development).

5. **Create the Stripe webhook**: Stripe Dashboard → Developers → Webhooks → Add endpoint `https://chorely.pro/api/stripe/webhook` with events `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`. Copy the signing secret into `STRIPE_WEBHOOK_SECRET` on Vercel and redeploy.

6. **Deploy**: every push to `main` deploys automatically. Pull requests get preview URLs.

## Post-deploy smoke test

1. Visit `https://chorely.pro` — landing page loads over HTTPS.
2. Sign up, confirm the verification email arrives, and complete checkout with a live card (you can refund it).
3. Run through onboarding, complete and approve a chore, and confirm the earnings ledger updates.
4. On a phone, add the app to the home screen (the FAQ-page instructions) and confirm it opens standalone with the Chorely icon.
5. On the Household Notes page, enable browser notifications and confirm a completion fires one.

## Notes

- The PWA service worker (`public/sw.js`) is served with `Cache-Control: must-revalidate` (configured in `next.config.ts`) so installed apps pick up new deploys promptly.
- Push notifications are local browser notifications (fired while a Chorely tab or installed PWA is open). True background Web Push would additionally need VAPID keys and a subscription store — a possible follow-up, not required for launch.
