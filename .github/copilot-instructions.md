#
Project: Zoom Web App Clone (Scaler SDE Fullstack Assignment)

## Goal

Build a functional clone of the Zoom web app. The UI and UX must match the real Zoom web app as closely as possible (layout, colors, spacing, icons, typography, hover and focus states, interactions). Evaluation criteria: functionality, UI/UX similarity, database design, code quality, modularity, and the developer's ability to explain every line.

## Stack

- Frontend: Next.js 14+ (App Router), TypeScript (strict), Tailwind CSS, lucide-react icons. Behaves as a client-side single page application.

- Backend: Python 3.11+, FastAPI, SQLAlchemy 2.0, Pydantic v2, Uvicorn.

- Database: SQLite (file: backend/zoom.db). Schema: users, meetings, participants, chat_messages.

## Core features

Landing dashboard, instant meeting, join meeting (by ID or invite link, display name required, validate existence), schedule meeting (title, description, date and time, duration, auto-generated link, stored in DB, shown in Upcoming). Bonus: responsive design, host controls (mute all, remove participant).

## Product rules

- No login is required. A seeded default user with id 1 is always the logged-in user.

- Meeting ID: 11 random digits, unique, displayed as 3-4-4 groups (for example 123 4567 8901). Stored without spaces.

- Invite link format: {FRONTEND_URL}/j/{meeting_code}?pwd={passcode}

- All datetimes are stored in UTC and displayed in the user's local time zone.

## Design tokens (approximate Zoom values, refine against screenshots)

- Primary blue #0B5CFF, hover #0845BF, light blue background #E8F0FF

- New Meeting orange #FF742E, hover #E6621F

- Page background #FFFFFF with light gray #F5F7FA panels, border #E4E6EB, text #232333, muted text #6E7377

- Meeting room background #1C1C1C, toolbar #232323, danger red #E02828, success green #2E8B57

- Font: Lato (fallback Inter, system sans-serif). Rounded corners 8px for cards, 6px for buttons.

## Code rules

- TypeScript strict, no any. React function components and hooks only. Components under about 150 lines; split otherwise.

- Backend layers: routers (HTTP only), services (business logic), models (SQLAlchemy), schemas (Pydantic). No business logic inside routers.

- No hard-coded URLs or secrets; use environment variables (NEXT_PUBLIC_API_URL, FRONTEND_URL, DATABASE_URL).

- Every screen handles loading, empty and error states.

- Add short, useful comments and docstrings that explain WHY the code does something, because the developer must explain it in an interview.

- Use meaningful names, consistent formatting, and no dead code or console.log leftovers.
