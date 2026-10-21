# CodeForge Frontend

A modern React frontend for **CodeForge**, an online coding platform where users can browse programming problems, write and execute code, submit solutions, and track their submission history.

The frontend is built with **React, Vite, Tailwind CSS, Axios, Zustand, and React Router** and communicates with a FastAPI backend.

## ✨ Features

* 🔐 User registration and login
* 🔑 JWT-based authentication
* 🌐 Google and GitHub OAuth authentication
* 📚 Browse coding problems
* 🔎 Search and filter problems by difficulty
* 💻 Code editor with language selection
* ▶️ Run code against custom input
* 🚀 Submit solutions for judging
* 📊 View submission verdicts
* 📜 Submission history with submitted code
* 👤 User profile with solved-problem count
* 🌓 Light and dark theme support
* 🔒 Protected routes and automatic authentication hydration
* ⚠️ Clear handling of authentication, execution, and backend errors

## 🛠️ Tech Stack

| Technology   | Purpose                           |
| ------------ | --------------------------------- |
| React        | UI development                    |
| Vite         | Development server and build tool |
| Tailwind CSS | Styling                           |
| React Router | Client-side routing               |
| Axios        | Backend API communication         |
| Zustand      | Global authentication state       |
| JWT          | Authentication                    |
| FastAPI      | Backend API                       |
| Judge0       | Code execution and judging        |

## 📁 Project Structure

```text
src/
├── main.jsx
├── App.jsx
├── index.css
│
├── api/
│   ├── client.js
│   ├── auth.js
│   ├── users.js
│   ├── problems.js
│   └── submissions.js
│
├── store/
│   └── authStore.js
│
├── auth/
│   ├── AuthPage.jsx
│   └── OAuthSuccessPage.jsx
│
├── problems/
│   └── ProblemsPage.jsx
│
├── submissions/
│   └── SubmissionPage.jsx
│
├── profile/
│   └── ProfilePage.jsx
│
├── history/
│   └── SubmissionHistoryPage.jsx
│
├── components/
│   ├── NavBar.jsx
│   ├── LoadingSpinner.jsx
│   └── ErrorMessage.jsx
│
└── routes/
    └── ProtectedRoute.jsx
```

For a detailed explanation of the architecture and individual files, see [`DOCUMENTATION.md`](./DOCUMENTATION.md).

## 🚀 Getting Started

### Prerequisites

Make sure you have:

* Node.js
* npm
* A running CodeForge FastAPI backend

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
cd YOUR_REPOSITORY
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the project root:

```env
VITE_API_BASE_URL=http://localhost:8000
```

`VITE_API_BASE_URL` should point to the running CodeForge backend.

The backend must also allow requests from the frontend origin. For the default Vite development server:

```text
http://localhost:5173
```

The backend's `FRONTEND_ORIGIN` should therefore be configured accordingly.

### 4. Start the development server

```bash
npm run dev
```

The application will normally be available at:

```text
http://localhost:5173
```

### 5. Build for production

```bash
npm run build
```

## 🔗 Application Routes

| Route                | Access    | Description                   |
| -------------------- | --------- | ----------------------------- |
| `/login`             | Public    | Login and registration        |
| `/oauth-success`     | Public    | OAuth authentication callback |
| `/problems`          | Protected | Browse coding problems        |
| `/submit/:problemId` | Protected | Write, run, and submit code   |
| `/profile`           | Protected | View user profile             |
| `/submissions`       | Protected | View submission history       |

The root route (`/`) automatically redirects authenticated users to `/problems` and unauthenticated users to `/login`.

## 🔐 Authentication

CodeForge uses JWT-based authentication.

The frontend:

1. Stores the JWT in `localStorage`.
2. Verifies the token with `/api/auth/me` when the application loads.
3. Maintains authentication state using Zustand.
4. Protects authenticated routes with `ProtectedRoute`.
5. Automatically logs the user out when an authenticated API request returns `401`.
6. Supports Google and GitHub OAuth through backend redirects.

The stored token uses the following key:

```text
codeforge_token
```

> **Security note:** This project currently uses `localStorage` for JWT storage. This is suitable for the current Phase 1 implementation but may be replaced with an httpOnly-cookie-based authentication flow in a future version.

## 💻 Code Execution

CodeForge provides two different actions:

### Run

Users can execute their code against custom input.

```http
POST /api/problems/{id}/run
```

The request contains:

```json
{
  "language": "python",
  "code": "...",
  "custom_input": "..."
}
```

The result can contain:

* `stdout`
* `stderr`
* `compile_output`
* `status`

Possible execution statuses include:

```text
success
compile_error
runtime_error
time_limit_exceeded
memory_limit_exceeded
```

### Submit

Users can submit their solution for judging.

```http
POST /api/problems/{id}/submit
```

The backend returns an aggregate verdict:

```text
AC   Accepted
WA   Wrong Answer
TLE  Time Limit Exceeded
MLE  Memory Limit Exceeded
RE   Runtime Error
CE   Compilation Error
```

The frontend intentionally does not display per-test-case results because the current backend API returns only an aggregate verdict.

## 🧑‍💻 Supported Languages

The current Phase 1 implementation supports:

* Python
* Java
* C++

JavaScript submissions are currently not supported.

## 📡 Backend API

The frontend communicates with the CodeForge FastAPI backend through endpoints including:

```text
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me

GET  /api/problems
GET  /api/problems/{id}

POST /api/problems/{id}/run
POST /api/problems/{id}/submit

GET  /api/users/me/profile

GET  /api/submissions
GET  /api/submissions/{id}
```

## ⚠️ Phase 1 Limitations

The current version intentionally has a limited feature set.

* No per-test-case submission breakdown
* Problem search is client-side only
* Submission history displays `problem_id` instead of problem titles
* JavaScript submissions are not supported
* No bookmarks
* No discussions
* No contests or leaderboards
* No ratings
* No AI hints/chatbot
* No automated test suite

These features may be introduced in later phases.

## 📦 Dependencies

Main frontend dependencies include:

```text
react
react-router-dom
axios
zustand
jwt-decode
```

The project uses Vite for development and production builds.

## 🏗️ Architecture

```text
                    ┌──────────────────┐
                    │   CodeForge UI   │
                    │      React       │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │   Axios Client   │
                    │ JWT + API Calls  │
                    └────────┬─────────┘
                             │
                    HTTP / REST API
                             │
                    ┌────────▼─────────┐
                    │  FastAPI Backend │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │      Judge0      │
                    │ Code Execution   │
                    └──────────────────┘
```

Authentication state is managed independently through Zustand:

```text
Login / OAuth
     │
     ▼
 JWT Token
     │
     ▼
 Zustand Auth Store
     │
     ▼
 Protected Routes
     │
     ▼
Authenticated API Requests
```

## 📖 Documentation

For detailed information about:

* File-by-file architecture
* API communication
* Authentication flow
* Run/Submit behavior
* OAuth implementation
* Error handling
* Phase 1 design decisions

see:

**[`DOCUMENTATION.md`](./DOCUMENTATION.md)**

## 📌 Project Status

**Phase 1 — Development**

The current release focuses on the core coding-platform workflow:

> **Authenticate → Browse Problems → Write Code → Run → Submit → View History**

Additional platform features can be added in future phases.

## 📄 License

This project is currently intended for educational and development purposes.
Add your project's license information here if the repository will be distributed publicly.
