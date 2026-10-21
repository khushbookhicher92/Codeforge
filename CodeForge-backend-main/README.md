# CodeForge Backend

The backend service for **CodeForge**, an online coding platform that provides user authentication, coding-problem management, code execution, solution judging, and submission history.

The backend is built with **FastAPI** and uses **MongoDB** for persistence and **Judge0** for executing and evaluating submitted code.

## ✨ Features

* 🔐 Email/password authentication
* 🌐 Google OAuth authentication
* 🐙 GitHub OAuth authentication
* 🔑 JWT-based authorization
* 👤 User profiles and solved-problem tracking
* 📚 Coding problem listing and filtering
* 💻 Code execution through Judge0
* 🚀 Solution submission and judging
* 📊 Submission verdicts
* 📜 User-specific submission history
* 🔒 Protected API endpoints
* ⚡ Asynchronous FastAPI application
* 📄 Automatic interactive API documentation through FastAPI

## 🛠️ Tech Stack

| Technology | Purpose                      |
| ---------- | ---------------------------- |
| Python     | Backend language             |
| FastAPI    | REST API framework           |
| MongoDB    | Database                     |
| Judge0     | Code execution and judging   |
| JWT        | Authentication               |
| bcrypt     | Password hashing             |
| OAuth 2.0  | Google/GitHub authentication |
| Uvicorn    | ASGI server                  |

## 📁 Project Structure

```text
app/
├── main.py
├── auth/
│   ├── ...
│   └── service.py
├── users/
│   ├── ...
│   └── ...
├── problems/
│   ├── ...
│   └── ...
├── submissions/
│   ├── ...
│   └── ...
└── ...

requirements.txt
.env
DOCUMENTATION.md
```

The exact implementation details and API contracts are documented in [`DOCUMENTATION.md`](./DOCUMENTATION.md).

## 🚀 Getting Started

### Prerequisites

Make sure you have:

* Python **3.11+**
* MongoDB database
* Judge0 instance/API access
* Google OAuth credentials *(optional)*
* GitHub OAuth credentials *(optional)*

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
cd YOUR_REPOSITORY
```

### 2. Create a virtual environment

#### Linux / macOS

```bash
python3 -m venv .venv
source .venv/bin/activate
```

#### Windows

```powershell
python -m venv .venv
.venv\Scripts\activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure environment variables

Create a `.env` file in the project root:

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

> **Important:** Never commit `.env` or expose JWT secrets, database credentials, Judge0 tokens, or OAuth client secrets.

A recommended `.gitignore` entry is:

```gitignore
.env
.env.*
!.env.example
.venv/
__pycache__/
*.pyc
```

For sharing the required configuration with other developers, create an `.env.example` file containing placeholder values.

## ▶️ Running the Backend

Start the FastAPI development server from the repository root:

```bash
uvicorn app.main:app --reload
```

The API will normally be available at:

```text
http://localhost:8000
```

FastAPI automatically provides interactive API documentation at:

```text
http://localhost:8000/docs
```

and an alternative ReDoc interface at:

```text
http://localhost:8000/redoc
```

## 🗄️ Database Setup

CodeForge uses MongoDB to store:

* Users
* Coding problems
* Submissions

Problems must currently be inserted into MongoDB manually.

There is no in-app problem-management endpoint or automatic product seed data in Phase 1.

A problem must contain the information required by the Judge0 driver-template system before it can be used for execution and judging.

## 🔗 API Overview

All API routes use the `/api` prefix.

### Authentication

```text
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me

GET /api/auth/oauth/google/login
GET /api/auth/oauth/google/callback

GET /api/auth/oauth/github/login
GET /api/auth/oauth/github/callback
```

### Profile

```text
GET /api/users/me/profile
```

### Problems

```text
GET /api/problems
GET /api/problems/{problem_id}
```

Supported problem filters include:

* Difficulty
* Tags
* Solved/unsolved status
* Pagination

### Code Execution

```text
POST /api/problems/{problem_id}/run
POST /api/problems/{problem_id}/submit
```

### Submission History

```text
GET /api/submissions
GET /api/submissions/{submission_id}
```

For complete request and response schemas, see [`DOCUMENTATION.md`](./DOCUMENTATION.md).

## 🔐 Authentication

CodeForge uses **JWT bearer authentication**.

The authentication flow is:

```text
                Login / Register
                       │
                       ▼
                FastAPI Backend
                       │
                       ▼
                Verify Password
                       │
                       ▼
                  JWT Token
                       │
                       ▼
              Frontend / Client
                       │
                       │ Authorization:
                       │ Bearer <token>
                       ▼
             Protected API Routes
```

Passwords are never stored directly. They are hashed using bcrypt.

There are currently no refresh tokens.

JWT expiration is controlled by:

```env
JWT_EXPIRY_HOURS=24
```

Protected routes use the shared authentication dependency to validate the JWT and load the authenticated user.

## 🌐 OAuth Authentication

CodeForge supports:

* Google OAuth
* GitHub OAuth

The backend handles the OAuth authorization-code exchange.

```text
Frontend
   │
   ▼
/api/auth/oauth/{provider}/login
   │
   ▼
OAuth Provider
   │
   ▼
Callback
   │
   ▼
Backend exchanges authorization code
   │
   ▼
Create/find user
   │
   ▼
Issue CodeForge JWT
   │
   ▼
Redirect to frontend
   │
   ▼
/oauth-success?token=<jwt>
```

The OAuth redirect construction is isolated in the authentication service so that the token handoff mechanism can be changed in the future.

## ⚙️ Code Execution & Judge0

CodeForge uses **Judge0** to execute user-submitted code.

The backend currently supports:

* Python
* Java
* C++

### Run

The `/run` endpoint executes code against one custom input.

It does **not** create a submission record.

Possible execution statuses:

```text
success
compile_error
runtime_error
time_limit_exceeded
memory_limit_exceeded
```

### Submit

The `/submit` endpoint evaluates a solution against the problem's stored test cases.

Possible verdicts:

```text
AC   Accepted
WA   Wrong Answer
TLE  Time Limit Exceeded
MLE  Memory Limit Exceeded
RE   Runtime Error
CE   Compilation Error
```

The backend sends all test cases to Judge0 using its batch execution endpoint and polls for results every two seconds.

The polling process stops after 30 seconds.

## 🧩 Judge0 Driver Templates

Each problem uses language-specific driver templates.

A template must contain exactly one:

```text
{{USER_CODE}}
```

placeholder.

The backend replaces this placeholder with the user's submitted function code.

This allows submissions to be inserted into the required language-specific structure.

For example:

```text
Driver Template
      │
      ├── imports/includes
      ├── class/function structure
      │
      ├── {{USER_CODE}}
      │
      └── execution logic
               │
               ▼
             Judge0
```

The system currently uses this approach to support function-based problems in Python, Java, and C++.

## 📊 Submission Verdict Logic

When multiple test cases produce different results, the backend combines them using the following priority:

```text
CE
 ↓
TLE
 ↓
MLE
 ↓
RE
 ↓
WA
 ↓
AC
```

For example, if one test case produces `WA` and another produces `TLE`, the final submission verdict is:

```text
TLE
```

Runtime and memory metrics from Judge0 are not currently persisted.

## 🔒 API Security

Protected endpoints require:

```http
Authorization: Bearer <jwt>
```

The backend:

* Validates JWT tokens
* Loads the authenticated user
* Restricts submission history to the authenticated user
* Prevents users from accessing submissions belonging to other users
* Hashes passwords using bcrypt
* Keeps secrets in environment variables

Malformed or undeclared request fields are rejected by FastAPI validation.

API errors follow FastAPI's standard format:

```json
{
  "detail": "Error message"
}
```

## 🔗 Frontend Integration

The CodeForge frontend communicates with this backend through REST APIs.

Default local configuration:

```text
Frontend: http://localhost:5173
Backend:  http://localhost:8000
```

The backend's CORS configuration uses:

```env
FRONTEND_ORIGIN=http://localhost:5173
```

The frontend must use the backend URL:

```env
VITE_API_BASE_URL=http://localhost:8000
```

Both values must be configured correctly for browser requests to work.

## 🏗️ Architecture

```text
┌──────────────────────┐
│   CodeForge Frontend │
│        React         │
└──────────┬───────────┘
           │
           │ REST / JSON
           ▼
┌──────────────────────┐
│   FastAPI Backend    │
│                      │
│ ┌──────────────────┐ │
│ │ Authentication   │ │
│ │ Problems         │ │
│ │ Submissions      │ │
│ │ User Profiles    │ │
│ └──────────────────┘ │
└───────┬────────┬─────┘
        │        │
        │        │
        ▼        ▼
┌────────────┐ ┌──────────────┐
│  MongoDB   │ │    Judge0    │
│            │ │              │
│ Users      │ │ Code         │
│ Problems   │ │ Execution    │
│ Submissions│ │ Judging      │
└────────────┘ └──────────────┘
```

## ⚠️ Phase 1 Limitations

The current backend intentionally has a limited feature set.

* Problems must be inserted manually into MongoDB
* No problem-management API
* No refresh tokens
* No per-test-case submission results in the API response
* Runtime and memory metrics are not persisted
* Judge0 failures/timeouts return `503`
* No automated product seed data
* Only Python, Java, and C++ submissions are supported
* AI features are not included
* Contests, leaderboards, discussions, bookmarks, and ratings are not included

These features can be introduced in later development phases.

## 📖 Documentation

For complete API contracts and implementation details, see:

**[`DOCUMENTATION.md`](./DOCUMENTATION.md)**

The documentation covers:

* Complete API request/response schemas
* Authentication flows
* OAuth implementation
* Problem schemas
* Run/Submit behavior
* Judge0 driver-template architecture
* Submission history
* Error behavior

## 📌 Project Status

**Phase 1 — Development**

The current backend provides the core services required for the CodeForge coding workflow:

```text
Authentication
      ↓
Problem Discovery
      ↓
Code Execution
      ↓
Solution Submission
      ↓
Judging
      ↓
Submission History
```

Future phases can extend the platform with additional competitive-programming and AI-powered features.

## 📄 License

This project is currently intended for educational and development purposes.

Add the appropriate license information here if the project is distributed publicly.
