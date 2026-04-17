# 🏏 Gully Cricket Tournament App

A full-stack web app featuring a **Cinematic Spectator Mode** for viewing live gully cricket tournaments. Includes ball-by-ball live scoring, dynamic scorecards, NRR-based rankings, and comprehensive organizer tools.

## Quick Start (Local Development — no Docker)

### 1. Clone & set up the virtual environment

```powershell
# From the project root
python -m venv venv
venv\Scripts\Activate.ps1      # Windows PowerShell
# source venv/bin/activate     # macOS / Linux
pip install -r requirements.txt
```

### 2. Run the Django backend

```powershell
cd backend
$env:DJANGO_SETTINGS_MODULE = "config.settings.dev"   # PowerShell
# export DJANGO_SETTINGS_MODULE=config.settings.dev   # macOS / Linux
python manage.py migrate
python manage.py createsuperuser   # optional — creates admin account
python manage.py runserver
```

Backend available at: `http://localhost:8000`  
Swagger docs at: `http://localhost:8000/api/docs/`

> Dev uses **SQLite** — no database setup required.

### 3. Run the React frontend

Open a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Frontend available at: `http://localhost:5173`

---

### Docker (Production only)

```bash
cp .env.example .env
# Edit .env with your secrets
docker-compose up --build
```

App will be available at `http://localhost` (Nginx serves frontend, proxies API to backend).

## Architecture

```
Browser → Nginx (:80)
            ├── /           → React SPA (static files)
            ├── /api/*      → Django + Gunicorn (:8000)
            └── /admin/*    → Django Admin
                                  └── PostgreSQL (:5432)
```

## Project Structure

```
├── backend/                # Django REST API
│   ├── config/             # Settings (base/dev/prod), URLs, WSGI
│   └── apps/
│       ├── users/          # Auth (JWT register/login/refresh)
│       ├── tournament/     # Tournament + Pool models & APIs
│       ├── teams/          # Team + Player models & APIs
│       ├── matches/        # Match + Innings + scheduling + toss
│       ├── scoring/        # Ball-by-ball engine + scorecard
│       └── export/         # Excel export (openpyxl)
├── frontend/               # React + TypeScript + Vite
│   └── src/
│       ├── pages/          # Route-level page components
│       │   ├── public/     # Spectator Views (No Auth, Cinematic UI)
│       │   │   ├── Home.tsx
│       │   │   ├── PublicTournament.tsx
│       │   │   └── MatchCenter.tsx
│       │   └── admin/      # Organizer Views (Auth Required)
│       │       ├── Dashboard.tsx
│       │       ├── ManageTournament.tsx
│       │       └── MatchScoring.tsx
│       ├── store/          # Zustand auth store
│       ├── services/       # Axios API client
│       └── types/          # TypeScript interfaces
├── nginx/                  # Nginx config for Docker
├── Dockerfile.backend      # Python 3.12 + Gunicorn
├── Dockerfile.frontend     # Node build + Nginx serve
├── docker-compose.yml      # Full stack orchestration
└── docs/
    └── PROGRESS.md         # Development progress tracker
```

## API Documentation

Run the backend and visit: `http://localhost:8000/api/docs/` (Swagger UI)

## Progress

See [docs/PROGRESS.md](docs/PROGRESS.md) for the detailed development tracker.
