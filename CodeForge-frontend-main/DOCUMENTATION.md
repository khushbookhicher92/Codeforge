# CodeForge Frontend 

This document covers the frontend's file structure, how each page talks to the
backend, the authentication flow, Run/Submit behavior, setup instructions, and
known Phase 1 limitations. It mirrors the level of detail in the backend's
`DOCUMENTATION.md`.

## Setup and local run

```bash
npm install
```

Create `.env` in the project root (already present in this delivery, shown
here for reference):

```env
VITE_API_BASE_URL=http://localhost:8000
```

This must point at wherever the FastAPI backend is running. The backend's
`FRONTEND_ORIGIN` env var must in turn match wherever this app is served
(Vite's default dev server is `http://localhost:5173`) — CORS will reject
requests otherwise.

Start the dev server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

## File structure

```
src/
├── main.jsx                        # React entry point, wraps App in StrictMode + BrowserRouter
├── App.jsx                         # Route definitions, protected-route wiring, auth hydration on load
├── index.css                       # Tailwind import
├── assets/                         # Images (unchanged)
├── api/
│   ├── client.js                    # axios instance: base URL, bearer token injection,
│   │                                 # error normalization, 401 handler registration
│   ├── auth.js                      # register, login, /auth/me, OAuth redirect helpers
│   ├── users.js                     # profile fetch
│   ├── problems.js                  # problem list + detail
│   └── submissions.js               # run, submit, history list + detail
├── store/
│   └── authStore.js                 # Zustand: user, isAuthenticated, isHydrating, login/register/
│                                     # logout/hydrate/setTokenFromOAuth
├── auth/
│   ├── AuthPage.jsx                  # Login/signup form (visuals unchanged, now wired to real auth)
│   └── OAuthSuccessPage.jsx          # Lands at /oauth-success?token=..., stores token, redirects
├── problems/
│   └── ProblemsPage.jsx              # Problem list, difficulty filter, client-side title search
├── submissions/
│   └── SubmissionPage.jsx            # Editor, Run/Submit, console (Testcase/Result tabs)
├── profile/
│   └── ProfilePage.jsx               # New — username, email, solved count
├── history/
│   └── SubmissionHistoryPage.jsx     # New — submission list, expandable to view submitted code
├── components/
│   ├── NavBar.jsx                    # Trimmed nav (Problems/History/Profile/Logout or Login)
│   ├── LoadingSpinner.jsx            # Shared, theme-matched (light + dark variants)
│   └── ErrorMessage.jsx              # Shared, theme-matched (error + warning tones)
└── routes/
    └── ProtectedRoute.jsx            # Redirects to /login if not authenticated (after hydration)
```

## Pages and their API calls

| Page | Route | Calls |
|---|---|---|
| `AuthPage` | `/login` | `POST /api/auth/register`, `POST /api/auth/login` |
| `OAuthSuccessPage` | `/oauth-success` | none directly — reads `?token=`, then `GET /api/auth/me` via the store |
| `ProblemsPage` | `/problems` (protected) | `GET /api/problems` |
| `SubmissionPage` | `/submit/:problemId` (protected) | `GET /api/problems/{id}`, `POST /api/problems/{id}/run`, `POST /api/problems/{id}/submit` |
| `ProfilePage` | `/profile` (protected) | `GET /api/users/me/profile` |
| `SubmissionHistoryPage` | `/submissions` (protected) | `GET /api/submissions`, `GET /api/submissions/{id}` (on row expand) |

`/` redirects to `/problems` if authenticated, or `/login` otherwise, once
hydration has finished.

## Authentication flow

- **Token storage:** a single JWT is stored in `localStorage` under the key
  `codeforge_token` (see `api/client.js`).
- **On app load:** `App.jsx` calls `authStore.hydrate()` once. If a token is
  present, it's verified by calling `GET /api/auth/me` — token *presence*
  alone is never trusted. A valid response populates `user` and sets
  `isAuthenticated = true`; a failure (expired/invalid/missing) clears the
  stored token.
- **Protected routes:** `ProtectedRoute` shows a spinner while hydration is in
  flight, then either renders its children or redirects to `/login` — this
  avoids incorrectly bouncing a logged-in user to the login page during a
  page refresh, before hydration has had a chance to complete.
- **Login/Register:** `AuthPage` posts to `/api/auth/login` or
  `/api/auth/register`. Registration doesn't return a token by contract, so
  on success the store immediately calls `login()` with the same credentials
  to get the user signed in in one step.
- **Mid-session expiry:** any authenticated API call that comes back `401`
  triggers a global handler (registered in `authStore.js` via
  `registerUnauthorizedHandler`) that clears the token and flips
  `isAuthenticated` to `false`, which `ProtectedRoute` reacts to on the next
  render by redirecting to `/login`.
- **OAuth (Google/GitHub):** the existing buttons in `AuthPage` are wired as
  plain browser redirects (`window.location.href`, not `fetch`/`axios`) to
  `GET /api/auth/oauth/{provider}/login`. The backend owns the entire
  redirect + callback exchange and eventually 302s the browser to
  `{FRONTEND_ORIGIN}/oauth-success?token={jwt}`. `OAuthSuccessPage` reads
  `token` from the query string, stores it, verifies it via `/auth/me`
  (through `authStore.setTokenFromOAuth`), then redirects to `/problems`.
  This handoff mechanism is provisional per `API-Contract.md` — if the
  backend team switches to an httpOnly-cookie handoff instead, only
  `OAuthSuccessPage` and the two redirect functions in `api/auth.js` need to
  change.

## Run vs Submit

- **Run** (`POST /api/problems/{id}/run`) sends `{ language, code,
  custom_input }`. The "Testcase" tab in the console now holds an editable
  custom-input textarea (pre-filled from the first example, but freely
  editable) — this replaced the old mock's read-only sample-case picker,
  since the real endpoint executes against exactly one custom input rather
  than the problem's stored test cases. The result shows raw `stdout`,
  `stderr`, `compile_output`, and `status`
  (`success | compile_error | runtime_error | time_limit_exceeded |
  memory_limit_exceeded`) with no comparison against any "expected" value.
- **Submit** (`POST /api/problems/{id}/submit`) sends `{ language, code }`
  and returns only `{ submission_id, verdict, submitted_at }` — a single
  aggregate verdict (`AC | WA | TLE | MLE | RE | CE`), not a per-test-case
  breakdown. The Result tab shows one verdict badge; there's no "3/5 test
  cases passed" detail because the backend doesn't return one in Phase 1.
- **Judge0 unavailable:** both endpoints can return `503` with
  `{"detail": "Judge0 service unavailable, try again later"}`. This is caught
  specifically (checked via HTTP status, not string-matching the message) and
  shown via `ErrorMessage` with `tone="warning"`, which renders in amber —
  visually distinct from the red WA/RE verdict styling, so it's never
  confused with a judged wrong answer.
- Both calls are synchronous/blocking on the backend (it waits out the full
  Judge0 batch-and-poll cycle before responding), so the UI shows a spinner
  in the Result tab for the duration of the request.

## Known Phase 1 limitations

- **No per-test-case Submit breakdown.** The old mock UI showed pass/fail per
  sample case with expected vs. actual output. The real `/submit` contract
  only returns an aggregate verdict. Flagged in `phases.md` as a later-phase
  backend change (adding a `results: [{test_case_index, verdict}]` array).
- **No free-text problem search on the backend.** The search box in
  `ProblemsPage` filters client-side across whatever page of results was
  already fetched; it is not a server-side query parameter.
- **Submission history shows raw `problem_id`, not problem titles.** The
  `/api/submissions` response only includes `problem_id`; resolving titles
  would require an additional lookup per problem and was left out for Phase
  1 to avoid N+1 calls against a small, ungraded feature.
- **JavaScript is not a supported submission language.** Only Python, Java,
  and C++ are offered, matching the backend's Judge0 language mapping.
- Bookmarks, discussions, contests/leaderboards/ratings, and AI features
  (roadmap, adaptive difficulty, hint chatbot) have been removed from the
  navigation entirely — they are either fully out of scope for this project
  or deferred to a later phase, and no "coming soon" placeholders were kept.
- No automated test suite, per the project's Phase 1 rules.

## Notable dependencies added

- `axios` — HTTP client for all backend calls (`api/*.js`).
- `zustand` — global auth state (`store/authStore.js`), consistent with the
  rest of the stack.
- `jwt-decode` — installed for potential client-side token inspection, though
  the current hydration flow verifies tokens against `GET /api/auth/me`
  rather than decoding them locally.
