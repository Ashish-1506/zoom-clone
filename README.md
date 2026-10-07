# Zoom Clone: Video Conferencing Platform (Scaler SDE Fullstack Assignment)

A Zoom Workplace-inspired web application for scheduling and joining meetings, managing meeting rooms, and using related collaboration tools. The frontend is built with Next.js and the API is built with FastAPI and SQLAlchemy.

> **Live Demo**
>
> Frontend: https://zoom-clone-gamma-fawn.vercel.app/  
> Backend API documentation: https://zoom-clone-backend-8727.onrender.com/docs  
> The free backend may take up to a minute to wake up on its first request.

## Screenshots

| View | Screenshot |
|---|---|
| Home | ![Home](docs/screenshots/Home.png) |
| Meetings | ![Meetings](docs/screenshots/Meetings.png) |
| Join | ![Join](docs/screenshots/join.png) |
| Meeting room | ![Meeting room](docs/screenshots/meeting.png) |
| Scheduler | ![Scheduler](docs/screenshots/scheduler.png) |
| Whiteboards | ![Whiteboards](docs/screenshots/whiteboards.png) |
| Team Chat | ![Team Chat](docs/screenshots/Team%20Chat.png) |
| Phone | ![Phone](docs/screenshots/Phone.png) |
| Settings | ![Settings](docs/screenshots/settings.png) |
| Profile | ![Profile](docs/screenshots/profile.png) |

## Features

### Core requirements

- [x] Home dashboard with a local clock, upcoming meetings, and recent meetings.
- [x] Create an instant meeting and enter its meeting room.
- [ ] Complete browser join by ID or invite link. Code parsing, existence validation, and required display-name controls exist, but the current UI cannot reliably pass the meeting passcode as described below.
- [x] Backend join endpoint validates the meeting passcode and creates a participant when supplied with a display name.
- [x] Schedule meetings with a title, description, start time, time zone, and duration.
- [x] View upcoming and recent meetings; edit and cancel scheduled meetings.
- [x] Seeded users, meetings, whiteboards, Team Chat conversations, Phone data, and Scheduler links/bookings.

### Bonus

- [x] Responsive portal and meeting-room layouts.
- [x] Host controls for muting all participants, removing participants, lowering raised hands, locking a meeting, and enabling or disabling chat.
- [x] Camera and microphone controls, screen sharing, speaker/gallery views, local recording, live captions where browser speech-recognition APIs are available, and meeting information.
- [x] Reactions, raise hand, meeting chat, and a shared meeting whiteboard.
- [x] WebRTC peer-to-peer media with WebSocket signaling.

### Extra features

- [x] Meeting chat with polling, system join/leave messages, and unread counts.
- [x] User profile editing and persisted settings.
- [x] Personal and meeting whiteboards with drawing tools and autosave.
- [x] Team Chat channels, direct messages, replies, editing, and deletion.
- [x] Zoom Phone-style keypad, call history, voicemail, and contacts. Calls are simulated and do not connect to a telephone network.
- [x] Scheduling links, availability slots, bookings, and a generated meeting for each booking.
- [x] Optional email/password signup and login with JWT bearer tokens; the seeded default user remains available without signing in.

## Tech stack

Versions below come from `frontend/package.json` and `backend/requirements.txt`. Python and Node runtime minimums are stated separately under Getting started.

| Layer | Technology | Version | Purpose |
|---|---|---:|---|
| Frontend framework | Next.js | `^16.3.8` | App Router pages and production frontend |
| Frontend UI | React / React DOM | `^19.3.0` | Client-side UI and interactions |
| Frontend language | TypeScript | `^6.0.3` | Typed frontend source |
| Styling | Tailwind CSS | `^4.3.3` | Responsive styling |
| Icons | lucide-react | `^1.52.0` | Interface icons |
| Frontend utilities | clsx | `^2.1.1` | Conditional class names |
| Backend framework | FastAPI | `0.142.2` | HTTP and WebSocket API |
| ASGI server | Uvicorn | `0.54.0` | Serves the API |
| ORM | SQLAlchemy | `2.1.3` | Database models and persistence |
| Validation/settings | Pydantic / pydantic-settings | `2.13.5` / `2.15.0` | Request/response validation and environment configuration |
| Database | SQLite | Python standard-library driver | Local/default persistence |
| Authentication | python-jose, passlib, bcrypt | `3.5.0`, `1.7.4`, `4.0.1` | JWT tokens and password hashing |
| Backend tests | pytest / httpx | `9.1.1` / `0.28.1` | API tests and reusable smoke test |
| Frontend tests | Vitest / React Testing Library | `5.0.3` / `16.3.3` | Frontend tests |

## Architecture

```mermaid
flowchart LR
    Browser[Browser]
    Frontend[Next.js frontend]
    Backend[FastAPI backend]
    Database[(SQLite)]

    Browser -->|Pages and UI| Frontend
    Frontend -->|HTTP JSON API| Backend
    Frontend <-->|WebRTC signaling over WebSocket| Backend
    Frontend <-->|Peer-to-peer media| Browser
    Backend -->|SQLAlchemy| Database
