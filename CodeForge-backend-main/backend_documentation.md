# CodeForge Phase 1 Backend

## Setup and local run

Use Python 3.11 or newer. Create and activate a virtual environment, then install dependencies:

```bash
pip install -r requirements.txt
```

Create a local `.env` file. It is deliberately excluded from version control.

```env
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>/<database>
JWT_SECRET_KEY=<at-least-32-character-secret>
JWT_EXPIRY_HOURS=24
JUDGE0_API_URL=https://<your-judge0-host>
JUDGE0_API_KEY=<optional-judge0-token>
GOOGLE_OAUTH_CLIENT_ID=<google-client-id>
GOOGLE_OAUTH_CLIENT_SECRET=<google-client-secret>
GITHUB_OAUTH_CLIENT_ID=<github-client-id>
GITHUB_OAUTH_CLIENT_SECRET=<github-client-secret>
FRONTEND_ORIGIN=http://localhost:5173
```

Start the server from the repository root:

```bash
uvicorn app.main:app --reload
```

MongoDB must contain manually inserted `Problem` documents before problem browsing or judging can be used. No in-app problem-management endpoint or product seed data is included by design.

All routes are prefixed with `/api`. Protected routes require `Authorization: Bearer <jwt>`. JSON uses `snake_case`; malformed or undeclared JSON fields return FastAPI validation errors. Errors use FastAPI's default `{"detail": "..."}` form.

## API

### Authentication

`POST /api/auth/register`

Request:

```json
{ "email": "user@example.com", "password": "string", "username": "string" }
```

Passwords must contain at least 8 characters and no more than 72 UTF-8 bytes, the bcrypt limit.

Response `201`:

```json
{ "id": "string", "email": "user@example.com", "username": "string", "created_at": "datetime" }
```

Returns `400` for an existing email.

`POST /api/auth/login`

Request:

```json
{ "email": "user@example.com", "password": "string" }
```

Response `200`:

```json
{ "access_token": "string", "token_type": "bearer", "user": { "id": "string", "email": "user@example.com", "username": "string" } }
```

Returns `401` for invalid credentials.

`GET /api/auth/oauth/google/login` and `GET /api/auth/oauth/github/login` redirect the browser to the respective provider.

`GET /api/auth/oauth/google/callback?code=...` and `GET /api/auth/oauth/github/callback?code=...` complete the provider exchange and redirect with HTTP 302 to:

```text
{FRONTEND_ORIGIN}/oauth-success?token={jwt}
```

The redirect construction is isolated in `app/auth/service.py` (`build_oauth_success_redirect`) so the provisional frontend handoff can be changed easily.

`GET /api/auth/me`

Response `200`:

```json
{ "id": "string", "email": "user@example.com", "username": "string" }
```

### Profile

`GET /api/users/me/profile`

Response `200`:

```json
{ "username": "string", "email": "user@example.com", "solved_count": 0 }
```

`solved_count` is the number of distinct problems for which the user has at least one `AC` submission.

### Problems

`GET /api/problems`

Optional query parameters: `difficulty` (`Easy`, `Medium`, `Hard`), `tags` (comma-separated), `status` (`solved`, `unsolved`), `page` (default `1`), and `limit` (default `20`, maximum `100`).

Response `200`:

```json
{
  "items": [{ "id": "string", "title": "string", "difficulty": "Easy", "tags": ["Array"], "solved": false }],
  "total": 0,
  "page": 1,
  "limit": 20
}
```

`GET /api/problems/{problem_id}`

Response `200`:

```json
{
  "id": "string",
  "title": "string",
  "description_markdown": "string",
  "examples": [{ "input": "string", "output": "string", "explanation": "string" }],
  "constraints": "string",
  "difficulty": "Easy",
  "tags": ["Array"],
  "function_signatures": { "python": "string", "java": "string", "cpp": "string" }
}
```

Returns `404` when the problem is absent. The response schema intentionally has no `driver_templates` or `test_cases` fields, so expected outputs cannot reach the frontend.

### Run and submit

`POST /api/problems/{problem_id}/run`

Request:

```json
{ "language": "python", "code": "string", "custom_input": "string" }
```

Response `200`:

```json
{ "stdout": "string", "stderr": "string", "compile_output": "string", "status": "success" }
```

`status` is one of `success`, `compile_error`, `runtime_error`, `time_limit_exceeded`, or `memory_limit_exceeded`. Run does not create a submission record or affect the profile.

`POST /api/problems/{problem_id}/submit`

Request:

```json
{ "language": "python", "code": "string" }
```

Response `200`:

```json
{ "submission_id": "string", "verdict": "AC", "submitted_at": "datetime" }
```

`verdict` is one of `AC`, `WA`, `TLE`, `MLE`, `RE`, or `CE`. Judge0 network failures or a 30-second polling timeout return `503` with `{"detail":"Judge0 service unavailable, try again later"}` and create no submission record.

### Submission history

`GET /api/submissions`

Optional query parameters: `problem_id`, `page` (default `1`), and `limit` (default `20`, maximum `100`). Results are always restricted to the authenticated user.

Response `200`:

```json
{
  "items": [{ "id": "string", "problem_id": "string", "language": "python", "verdict": "AC", "submitted_at": "datetime" }],
  "total": 0,
  "page": 1,
  "limit": 20
}
```

`GET /api/submissions/{submission_id}` returns the authenticated user's stored code and metadata:

```json
{ "id": "string", "problem_id": "string", "language": "python", "code": "string", "verdict": "AC", "submitted_at": "datetime" }
```

It returns `404` for a missing submission or a submission owned by someone else.

## Authentication flow

Email/password registrations store only a bcrypt hash. Login verifies that hash and issues one JWT access token whose expiry is controlled by `JWT_EXPIRY_HOURS` (set it to `24`). There are no refresh tokens. Every protected route uses the shared `get_current_user` dependency, which validates the bearer token and loads the user.

Google and GitHub use backend-handled authorization-code redirects. The backend exchanges the callback code with the provider, obtains profile data, creates an OAuth user when necessary, issues the same application JWT, and redirects to the provisional frontend token handoff route above.

## Judge0 driver-template harness

Each manually inserted problem must provide a language-specific `driver_templates` entry containing exactly one `{{USER_CODE}}` placeholder, plus a matching `function_signatures` stub. The backend replaces that placeholder with the submitted function body; it never appends code after the driver. This permits Java and C++ user code to be placed in the required class/include structure.

For submit, each test case's `input` is JSON-encoded and supplied as Judge0 stdin. The driver parses that stdin, invokes the function, and prints a result in the same representation as its stored `expected_output`. All test cases are sent together to Judge0's batch endpoint with the same combined source code. The backend polls the batch every two seconds, stopping after 30 seconds.

Judge0 results are combined in priority order: `CE`, `TLE`, `MLE`, `RE`, `WA`, then `AC`. Run uses the identical template and batch mechanism for one custom stdin payload but does not send an expected output or persist anything. Runtime and memory metrics are never stored.
