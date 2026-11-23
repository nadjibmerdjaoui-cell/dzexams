# Easy School

Easy School is an Arabic-first platform for browsing and downloading Algerian school PDF resources.

## Application location

The Next.js application is in `dzexams_downloader/`. When configuring a deployment provider, set its **Root Directory** to `dzexams_downloader`.

## Requirements

- Node.js 20 or later
- npm

## Local development

```bash
cd dzexams_downloader
npm ci
npm run dev
```

The development server uses port 4028.

## Production

```bash
cd dzexams_downloader
npm ci
npm run build
npm run start
```

The production server listens on port 4028.

## Environment variables

Configure the required environment variables in your hosting provider. At minimum, the Supabase integration expects:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Add payment-provider and AI service credentials only in the hosting provider's encrypted environment-variable settings. Never commit secrets or real `.env` files.

## Database

Supabase schema migrations are in `dzexams_downloader/supabase/migrations/`. Review and apply them to the intended Supabase project before enabling production features.

## Deployment checklist

1. Set the deployment root directory to `dzexams_downloader`.
2. Use `npm ci` for dependency installation.
3. Use `npm run build` for the build command.
4. Configure environment variables securely.
5. Apply reviewed Supabase migrations.
6. Verify authentication, PDF storage/downloads, subscriptions, and payment webhooks in a test environment before launch.
