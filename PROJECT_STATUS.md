# Project Status

## Goal

Build a web app that helps a Korean high school math tutor generate lesson summaries and homework messages from problem photos, short lesson keywords, problem numbers, and reference PDFs.

## Live Links

- Production: https://lesson-summary-mvp.vercel.app
- GitHub: https://github.com/turtle13080/lesson-summary-mvp
- Local project: `C:\Users\mose6\Documents\모세\lesson-summary-mvp`

## Stack

- Frontend: Next.js App Router, React
- Hosting: Vercel
- Auth: Supabase Auth with Google login
- Database: Supabase Postgres
- File storage: Supabase Storage
- AI: OpenAI Responses API

## Important Env Vars

Set locally in `.env.local` and in Vercel Environment Variables:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
CRON_SECRET
OPENAI_API_KEY
OPENAI_MODEL
```

`NEXT_PUBLIC_SUPABASE_URL` must be the base project URL only, for example:

```text
https://xxxxx.supabase.co
```

It must not include `/rest/v1`.

`SUPABASE_SERVICE_ROLE_KEY` and `CRON_SECRET` are server-only values. Add them to `.env.local` for local testing and to Vercel Environment Variables for production. Never expose them in client code.

## Current Features

- Google login
- Student creation and selection
- Lesson date, memo, keywords, and homework input
- Problem photo upload and clipboard paste
- Individual photo removal and clear-all photos
- AI extraction of problem text/formulas from photos
- Editable extraction JSON/text area
- Reference PDF upload to Supabase Storage
- PDF indexing through OpenAI
- PDF problem metadata storage in Supabase
- Problem number/comment input
- Matching problem comments against indexed PDF problems
- AI-generated lesson summary
- Saving generated lesson notes by student
- Recent lesson notes list
- Keep-alive endpoint for external cron monitors

## Supabase Setup

Schema file:

```text
supabase/schema.sql
```

This creates:

- `students`
- `pdf_sources`
- `pdf_problems`
- `lesson_notes`
- `problem_comments`
- private storage bucket `pdf-sources`
- RLS policies for per-user data access

Required redirect URLs:

```text
http://localhost:3000/auth/callback
https://lesson-summary-mvp.vercel.app/auth/callback
```

Google Cloud OAuth authorized redirect URI:

```text
https://mjltogezzenbyrloisgu.supabase.co/auth/v1/callback
```

## Known Issues

- OpenAI API calls fail if the API project has no quota or billing.
- Large PDFs can still be slow or fail. Current server guard asks for PDFs under 25MB or split pages.
- PDF indexing quality depends heavily on PDF scan quality and whether problem numbers are machine-readable.
- Some Korean text in older local files became mojibake from earlier terminal encoding, but the active Next.js app files should be reviewed if UI text looks broken.
- Error messages are still mostly browser alerts.
- No dedicated student detail page yet.
- No search/filter page for old lesson notes yet.
- No background job system for long PDF indexing yet.

## Keep-Alive Bot

Endpoint:

```text
GET https://lesson-summary-mvp.vercel.app/api/keepalive?secret=<CRON_SECRET>
```

Behavior:

- Returns `401` if the `secret` query parameter does not match `CRON_SECRET`.
- Uses `SUPABASE_SERVICE_ROLE_KEY` server-side only.
- Sends a lightweight `head` select query to the `students` table.
- Returns `{ ok: true, supabase: "ok" }` when Supabase responds successfully.

External scheduler:

- Preferred service: FastCron or another monitor that supports random intervals.
- Configure a GET request to the keep-alive URL.
- Target cadence: randomly between 5 and 10 minutes.
- Fallback: 5-minute fixed interval with random delay if true random interval is unavailable.

## Recent Important Commits

- `2153773` Prepare Next.js Supabase deployment
- `86c9284` Avoid large JSON payloads for PDF indexing
- `920c396` Add image removal controls

## Common Commands

```powershell
cd C:\Users\mose6\Documents\모세\lesson-summary-mvp
npm run dev
npm run build
git status
git add .
git commit -m "message"
git push
```

## Suggested Next Work

1. Fix any mojibake UI text if it appears in production.
2. Improve OpenAI quota/billing error display.
3. Add student detail page with lesson history.
4. Add lesson note search and filters.
5. Improve PDF indexing by splitting large PDFs into pages or ranges.
6. Add progress/status UI for PDF indexing.
