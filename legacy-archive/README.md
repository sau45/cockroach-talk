# CockroachTalk Legacy Archive

This directory contains the original, pre-migration legacy codebase of **CockroachTalk** archived on **September 24, 2026**.

## Purpose & Status

- **Status**: ARCHIVED & INERT
- **Reference Only**: This code is retained strictly for architectural reference, historical context, and rollback verification.
- **Not in Active Execution**: None of the files in this directory are bundled, built, or executed by either the modern Next.js frontend (`/frontend`) or the Express + TypeScript backend (`/backend`).

## What Was Migrated

| Legacy Path | Migrated Destination | Description |
|---|---|---|
| `server.js` | `backend/src/server.ts`, `backend/src/sockets/*` | Monolithic Node/Express server & Socket.io handlers |
| `routes/comments.js` | `backend/src/routes/comments.routes.ts`, `backend/src/controllers/comments.controller.ts` | REST API routes and business logic |
| `models/Comment.js`, `models/Vote.js` | `backend/src/models/Comment.ts`, `backend/src/models/Vote.ts` | Mongoose database models |
| `data/rooms.json` | `backend/src/services/rooms.service.ts`, `frontend/app/junctions/page.tsx` | Room data and state junction listings |
| `emojis.txt` | `frontend/components/chat/EmojiPickerPopover.tsx` | Integrated `emoji-picker-react` package |
| `css/*` | `frontend/styles/globals.css`, `frontend/tailwind.config.ts` | Neo-Brutalist CSS & Tailwind design tokens |
| `js/components/*` | `frontend/components/onboarding/*`, `frontend/components/profile/*` | Age gate modal & Profile customizer |
| `js/pages/room.js` | `frontend/app/(chat)/room/[roomId]/page.tsx`, `frontend/hooks/useRoom.ts` | Live voice & text room page |
| `js/pages/threadedComments.js` | `frontend/components/chat/ChatWindow.tsx`, `MessageBubble.tsx` | Real-time chat & voting |
| `js/pages/junctions.js` | `frontend/app/junctions/page.tsx` | State junctions directory |
| `js/pages/admin.js` | `frontend/app/admin/page.tsx`, `backend/src/controllers/admin.controller.ts` | Moderation & security panel |
| `js/webrtcStub.js` | `frontend/hooks/useWebRTC.ts`, `backend/src/sockets/webrtc.handlers.ts` | WebRTC audio/video calling & screen share |
| `*.html` | `frontend/app/*` | Next.js App Router modern pages |
