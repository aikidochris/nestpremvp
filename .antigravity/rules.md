# Project: Nest (The Social Map for UK Property)

## Tech Stack (Strict)
- Frontend: Next.js 16 (App Router), Tailwind CSS 4, React-Leaflet.
- Backend: Supabase (Auth, Database, Storage, RLS).
- Language: TypeScript (Strict).

## Workflow Rules
1. **Cloud-Only Supabase:** Never suggest local Docker DBs. All SQL changes must be provided as scripts for the Cloud SQL Editor.
2. **"Calm" Design:** UI must use Glassmorphism, Teal (#007C7C) for social signals, and Coral (#E65F52) for high intent.
3. **Mobile-First:** All UI components must be fully responsive and touch-friendly.
4. **Error Handling:** Use `try/catch` blocks with `console.error` for all API fetches. Avoid generic 500 pages.

## Code Style
- Use `lucide-react` for icons.
- Prefer Server Actions over API routes where possible.
- Use `useCallback` and `AbortController` for all map fetch operations.