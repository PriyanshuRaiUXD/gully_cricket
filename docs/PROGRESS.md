# 🏏 Gully Cricket — Progress Tracker

## Phase 1: Project Setup & Auth ✅

| Task | Status | Notes |
|------|--------|-------|
| Backend folder structure | ✅ Done | Django project with 6 apps |
| Frontend folder structure | ✅ Done | React + TypeScript + Vite |
| Requirements files (base/dev/prod) | ✅ Done | Split by environment |
| Django settings (base/dev/prod) | ✅ Done | WhiteNoise, JWT, CORS configured |
| Django URL routing | ✅ Done | All apps wired in config/urls.py |
| Custom User model (UUID + email login) | ✅ Done | apps/users/ |
| Auth API (register, login, refresh, me) | ✅ Done | JWT via simplejwt |
| Frontend auth store (Zustand + persist) | ✅ Done | Token auto-attach via Axios interceptor |
| Login page | ✅ Done | With error handling |
| Register page | ✅ Done | With validation feedback |
| Protected routes | ✅ Done | ProtectedRoute component in App.tsx |
| Landing page | ✅ Done | Home.tsx with login/signup links |
| Docker setup (backend + frontend + db) | ✅ Done | docker-compose.yml with Postgres, Gunicorn, Nginx |
| Nginx config | ✅ Done | SPA routing + API proxy |
| Environment config (.env.example) | ✅ Done | All secrets externalized |
| .gitignore / .dockerignore | ✅ Done | |

## Phase 2: Tournament, Teams & Pools ✅

| Task | Status | Notes |
|------|--------|-------|
| Tournament model | ✅ Done | UUID PK, status lifecycle, soft delete |
| Tournament CRUD API | ✅ Done | List/Create/Detail/Update/Delete |
| Tournament serializer + validation | ✅ Done | Overs 1-20, teams even ≥4, pools 1/2/4 |
| Pool model + auto-creation | ✅ Done | Created on tournament create |
| Pool list + randomize API | ✅ Done | Random team distribution |
| Team model | ✅ Done | Unique name per tournament |
| Player model | ✅ Done | Unique name per team |
| Team/Player CRUD APIs | ✅ Done | With capacity checks |
| Dashboard page | ✅ Done | Tournament list + logout |

## Phase 3: Match Scheduling & Toss ✅

| Task | Status | Notes |
|------|--------|-------|
| Match model | ✅ Done | Full status lifecycle, stages, toss fields |
| Innings model | ✅ Done | Per-match with totals tracking |
| Match list + detail APIs | ✅ Done | With select_related for performance |
| Round-robin fixture generation | ✅ Done | All pool combos, auto transition to POOL_STAGE |
| Toss API | ✅ Done | Records winner + decision, creates both innings |
| Forfeit API | ✅ Done | Winner assigned, status → FORFEITED |

## Phase 4: Match Engine & Live Scoring ✅

| Task | Status | Notes |
|------|--------|-------|
| Ball model | ✅ Done | Full event tracking: extras, wickets, free hit |
| Scoring engine (engine.py) | ✅ Done | record_ball() with all logic |
| Wide logic | ✅ Done | +1 penalty, no legal ball count |
| No-ball logic | ✅ Done | +1 penalty + bat runs, free hit next ball |
| Free hit enforcement | ✅ Done | Only run-out allowed on free hit |
| Wicket logic | ✅ Done | Bowled, Caught, Run Out, Stumped, Hit Wicket |
| Strike rotation | ✅ Done | Odd runs swap, over-end swap |
| Over management | ✅ Done | 6 legal balls per over |
| Innings completion | ✅ Done | All out / overs done / target chased |
| Match result (win by runs/wickets/tie) | ✅ Done | _finalize_match() |
| Undo last ball | ✅ Done | Reverses totals + recalcs overs |
| Start 2nd innings API | ✅ Done | Returns target |
| Scorecard API | ✅ Done | Full ball-by-ball data |
| Ball input serializer + validation | ✅ Done | Wicket type, fielder rules |

## Phase 5: Data Export ✅

| Task | Status | Notes |
|------|--------|-------|
| Excel export (openpyxl) | ✅ Done | Multi-sheet: Summary, Teams, Matches, Batting, Bowling |
| Export API | ✅ Done | GET /tournaments/{id}/export/ |

## Pending Phases

### Phase 5b: Points Table & Rankings
- [ ] NRR calculation logic
- [ ] Points table API per pool
- [ ] Standings endpoint
- [ ] Scoreboard UI page

### Phase 6: Knockouts & Super Over
- [ ] Pool → knockout transition
- [ ] Knockout bracket generation
- [ ] Super over model + API
- [ ] Bracket UI

### Phase 7: Awards
- [ ] MOM auto-calculation
- [ ] MOM override API
- [ ] MOT calculation

### Phase 8: Frontend Pages (remaining)
- [ ] Tournament create form
- [ ] Tournament detail page
- [ ] Team/player management UI
- [ ] Match list page
- [ ] Live scoring page (ball input panel)
- [ ] Scorecard display page
- [ ] Export & cleanup page

### Phase 9: Testing & Polish
- [ ] Backend unit tests (scoring, NRR, results)
- [ ] Backend integration tests (match flow)
- [ ] Frontend component tests
- [ ] Responsive design
- [ ] Error handling & loading states
