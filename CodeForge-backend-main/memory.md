# CodeForge Backend Handoff Memory

## Project and scope

This repository is the Phase 1 backend for **CodeForge**, a LeetCode-style DSA practice platform.

- Stack: FastAPI, MongoDB via Beanie/Motor, self-hosted Judge0, Python 3.11.
- Architecture is a monolith with a feature-based `app/` layout.
- Implemented scope is **Phase 1 only**. Do not add Phase 2 or Phase 3 features unless explicitly requested.
- There are exactly three Phase 1 collections: `users`, `problems`, and `submissions`.
- Problems are inserted manually by the team; there is no admin UI, seed script, or problem-creation API.

Primary planning documents were supplied from `C:\Users\bhavy\Downloads`:

- `Project-Requirements.md`
- `Architecture.md`
- `rules.md`
- `phases.md`
- `API-Contract (1).md`

The API contract resolved the exact Phase 1 routes and shapes. All routes use the `/api` prefix and `snake_case` JSON fields.

## Implemented structure

```text
app/
├── main.py
├── config.py
├── database.py
├── core/
│   ├── security.py
│   └── dependencies.py
├── auth/
│   ├── router.py
│   ├── models.py
│   ├── schemas.py
│   └── service.py
├── users/
│   ├── router.py
│   ├── models.py
│   ├── schemas.py
│   └── service.py
├── problems/
│   ├── router.py
│   ├── models.py
│   ├── schemas.py
│   └── service.py
└── submissions/
    ├── router.py
    ├── models.py
    ├── schemas.py
    ├── service.py
    └── judge0_client.py
```

Project files include `requirements.txt`, `.gitignore`, and `DOCUMENTATION.md`.

## Implemented Phase 1 behavior

### Auth

- `POST /api/auth/register`: email/password registration.
- `POST /api/auth/login`: email/password login.
- Google and GitHub backend OAuth redirect/callback flow.
- OAuth callback creates a user when needed, issues the application JWT, and redirects to `{FRONTEND_ORIGIN}/oauth-success?token={jwt}`.
- `GET /api/auth/me`: current user.
- JWT is a single bearer access token, with a mandatory 24-hour expiry and no refresh token.
- Passwords use `passlib` with bcrypt; plaintext passwords are never stored.
- `GET /api/users/me/profile`: username, email, and distinct accepted-problem count.

### Problems

- `GET /api/problems`: authenticated list endpoint with difficulty, comma-separated tags, solved/unsolved status, and pagination.
- `GET /api/problems/{problem_id}`: authenticated detail endpoint.
- The detail response schema intentionally excludes `driver_templates` and `test_cases`. Therefore test inputs and `expected_output` cannot reach frontend responses.

### Run and submit

- `POST /api/problems/{problem_id}/run`: one custom stdin input; no persistence.
- `POST /api/problems/{problem_id}/submit`: all visible test cases; persists one submission only after Judge0 returns a terminal result.
- Supported languages and Judge0 IDs: `python` = 71, `java` = 62, `cpp` = 54.
- User code is inserted server-side into the language-specific `{{USER_CODE}}` placeholder in `driver_templates`; it is never appended after the template.
- Submit JSON-encodes each stored test case input into stdin and sends all cases in one Judge0 batch.
- The Judge0 client polls every 2 seconds for at most 30 seconds. Network/API failures or timeouts become `503` with `Judge0 service unavailable, try again later`; a timed-out/unreachable submit is not stored.
- Verdict priority: `CE`, `TLE`, `MLE`, `RE`, `WA`, then `AC`.
- Run returns raw stdout/stderr/compile output and one of: `success`, `compile_error`, `runtime_error`, `time_limit_exceeded`, `memory_limit_exceeded`. TLE/MLE were added at the user's direction after the original contract omitted them.
- `GET /api/submissions` provides authenticated history, optionally filtered by problem.
- `GET /api/submissions/{submission_id}` only returns a submission owned by the caller.
- Runtime and memory metrics are deliberately not persisted.

## Critical implementation rules

- Pydantic request and response models use `extra="forbid"` and strict field types.
- Use FastAPI's default `HTTPException` responses; do not introduce a custom error envelope.
- CORS is restricted to `FRONTEND_ORIGIN`; do not change it to `*`.
- Keep `driver_templates`, `test_cases`, and expected outputs out of every frontend-facing response. This is enforced through problem response schemas, not route-by-route omissions.
- No Phase 2/3 work: no AI, hidden cases, password reset, bookmarks, discussions, contests, leaderboards, ratings, admin routes, rate limiting, tests, CI/CD, or health endpoint.
- `.env` is ignored and must never be committed.

## Environment and startup

Required `.env` variables:

```env
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>/codeforge?retryWrites=true&w=majority
JWT_SECRET_KEY=<secret>
JWT_EXPIRY_HOURS=24
JUDGE0_API_URL=https://<judge0-host>
JUDGE0_API_KEY=<optional-token>
GOOGLE_OAUTH_CLIENT_ID=<id>
GOOGLE_OAUTH_CLIENT_SECRET=<secret>
GITHUB_OAUTH_CLIENT_ID=<id>
GITHUB_OAUTH_CLIENT_SECRET=<secret>
FRONTEND_ORIGIN=http://localhost:5173
```

`MONGODB_URI` **must include a database name** (for example `/codeforge`). The startup code calls Motor's `get_default_database()`; an URI without a database produces `ConfigurationError: No default database name defined or provided.`

Install and run:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
uvicorn app.main:app --reload
```

## Password/bcrypt fix already applied

The project initially allowed pip to install bcrypt 5.0.0. `passlib==1.7.4` is incompatible with it and registration failed during hashing with messages including:

- `module 'bcrypt' has no attribute '__about__'`
- `ValueError: password cannot be longer than 72 bytes`

Fixes made:

- `requirements.txt` explicitly pins `bcrypt==4.0.1`.
- `app/auth/schemas.py` validates password length at the request schema layer. Passwords need at least 8 characters and may not exceed 72 UTF-8 bytes, so an overlong password returns FastAPI validation `422` instead of a server `500`.
- The local `.venv` requirements were reinstalled, replacing bcrypt 5.0.0 with 4.0.1.
- Bcrypt hashing/verification and the long-password validation were manually verified successfully.

Restart Uvicorn after changing/installing dependencies.

## Documentation and verification status

`DOCUMENTATION.md` documents every endpoint, request/response shape, local setup, JWT/OAuth flow, and Judge0 driver-template harness.

Completed checks:

- Python syntax compilation of all `app/` modules passed.
- Bcrypt hash/verify passed after the compatibility fix.
- Overlong-password validation passed.

Not performed:

- No automated test suite exists by explicit project rule.
- No end-to-end Judge0 test was run because it requires the team's real Judge0 URL and manually inserted problem documents.
- No deployment was performed; deployment credentials/authority were not provided.

## Likely next manual tasks

1. Insert valid `Problem` documents directly into MongoDB. Every problem needs all three `function_signatures` and `driver_templates` values, at least one visible test case, plus valid time/memory limits.
2. Configure redirect URIs for Google and GitHub to the deployed backend callback URLs. The callback URL is derived from `request.url_for(...)`.
3. Verify each Judge0 driver parses JSON stdin and prints the exact representation expected by its stored test data.
4. Manually exercise registration/login, authenticated problem browsing, Run, Submit, history, and profile count for all three languages.
