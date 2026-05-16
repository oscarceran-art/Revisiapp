# Revisia — Personal AI Revision Helper

## Original problem statement
> I have a claude api key with 5 pounds on it and i want to use it to run haiku 4.5 as a ai revision helper. i want a simple website that i can access from anywhere that is fully vibecoded as i have no experience. and i want it to have a simplistic modern and sleek design with no top bar but a side bar. white main colour with black accents. nice aesthetic round font like fraunces. i want it to have a chat as main feature along with a worksheet generator that makes the worksheets exportable and also on the actual app itself. i want them to be able to add subjects so the chats can have context and supply relevant information. i am willing to spend 5 pound max to develop this website but would prefer to use free tools. i don't care how it is hosted because only im using it so as long as it works. also add way for me to customise the worksheets like maybe a full mock or just a couple questions and difficulty etc etc.

## User personas
- Single user (the owner). No authentication required.

## Core requirements (static)
- Sidebar-only layout (no top bar), white + black, Fraunces font.
- Chat (main feature) — Claude Haiku 4.5 via user's own Anthropic key.
- Subjects library — create, edit, upload notes (.txt/.pdf/.docx), used as context.
- Worksheet generator — customisable: subject, topic, number of questions (3–30), difficulty (easy/medium/hard/mixed), question style (MCQ/short/long/mixed = full mock), extra instructions.
- In-app worksheet viewer with show/hide answers and PDF export (questions-only & with answers).

## Architecture
- Backend: FastAPI + Motor (MongoDB) + emergentintegrations LlmChat with Anthropic `claude-haiku-4-5-20251001`. PDF/DOCX parsing via pypdf and python-docx.
- Frontend: React + Tailwind + Phosphor icons + jsPDF + sonner toasts. Fraunces font via Google Fonts.
- Routes: `/chat`, `/chat/:id`, `/subjects`, `/worksheets`.

## What's been implemented (2026-02)
- ✅ Backend endpoints: `/api/health`, subjects CRUD + file upload, chat sessions/messages, `/api/chat/send`, worksheets generate/list/get/delete.
- ✅ Frontend: sidebar layout, chat with sessions rail and subject selector, subjects editor with file upload, worksheet generator with paper-style viewer and PDF export.
- ✅ Subject context flows into both chat and worksheet generation.
- ✅ Tested end-to-end (8/8 backend tests passing including real Claude calls and subject-context grounding).

## Prioritized backlog
- P1: Reorder logger declaration in `server.py` (minor robustness — not blocking).
- P2: Markdown rendering in worksheet questions (currently plain text — fine for now).
- P2: Drag-and-drop file upload on subjects page.
- P2: Worksheet "retake mode" — hide answers, score user input.

## Next tasks
- None blocking. App is fully functional.
