# 🏏 Gully Cricket Tournament Web App — Development Plan

---

## 1. 📌 Overview

A full-stack web app to:

- Create and manage **gully cricket tournaments** (street-level, informal cricket)
- Register teams, assign players, distribute pools, and auto-generate fixtures
- Run matches with **ball-by-ball scoring** (including extras, wickets, strike rotation)
- Conduct **toss** before each match
- Auto-calculate **points table** and **NRR (Net Run Rate)** rankings per pool
- Progress from **pool stage → semi-finals → final / 3rd-place playoff**
- Award **Man of the Match** and **Man of the Tournament**
- **Export full tournament data** to Excel before optional data cleanup
- Support **forfeit**, **tie**, and **abandoned match** scenarios

---

## 2. 🧱 Tech Stack

### Frontend

| Concern            | Choice                        |
| ------------------ | ----------------------------- |
| Framework          | React 18+ with TypeScript     |
| State Management   | Zustand (lightweight, simple) |
| UI Library         | Tailwind CSS + shadcn/ui      |
| HTTP Client        | Axios                         |
| Routing            | React Router v6               |
| Form Handling      | React Hook Form + Zod         |
| Real-time (future) | WebSocket via `socket.io`     |

### Backend

| Concern        | Choice                                   |
| -------------- | ---------------------------------------- |
| Framework      | Django 5.x                               |
| API Layer      | Django REST Framework (DRF)              |
| Authentication | JWT (djangorestframework-simplejwt)      |
| Task Queue     | Celery + Redis (for export jobs, future) |
| CORS           | django-cors-headers                      |

### Database

| Environment | Choice     |
| ----------- | ---------- |
| Development | SQLite     |
| Production  | PostgreSQL |

### Other

| Concern      | Choice                         |
| ------------ | ------------------------------ |
| Excel Export | openpyxl (via Django)          |
| Deployment   | Docker Compose + AWS/GCP       |
| CI/CD        | GitHub Actions                 |
| API Docs     | drf-spectacular (OpenAPI 3.0)  |

---

## 3. 📂 Project Structure

```
root/
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   │   ├── common/        # Buttons, modals, cards
│   │   │   ├── match/         # Scoreboard, ball input, toss
│   │   │   ├── tournament/    # Create, list, detail views
│   │   │   └── team/          # Team cards, player lists
│   │   ├── pages/             # Route-level page components
│   │   │   ├── Home.tsx
│   │   │   ├── Login.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── TournamentDetail.tsx
│   │   │   ├── MatchLive.tsx
│   │   │   └── Scoreboard.tsx
│   │   ├── store/             # Zustand stores
│   │   ├── services/          # API call wrappers (Axios)
│   │   ├── hooks/             # Custom React hooks
│   │   ├── types/             # TypeScript interfaces & enums
│   │   └── utils/             # Helpers (NRR calc, formatting)
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── package.json
│
├── backend/
│   ├── config/                # Django settings, urls, wsgi
│   │   ├── settings/
│   │   │   ├── base.py
│   │   │   ├── dev.py
│   │   │   └── prod.py
│   │   ├── urls.py
│   │   └── wsgi.py
│   ├── apps/
│   │   ├── users/             # Auth, registration, profile
│   │   ├── tournament/        # Tournament CRUD, pools
│   │   ├── teams/             # Teams, players
│   │   ├── matches/           # Match lifecycle, toss, scheduling
│   │   ├── scoring/           # Ball-by-ball engine, innings
│   │   └── export/            # Excel export logic
│   ├── manage.py
│   └── requirements.txt
│
├── docker-compose.yml
├── .env.example
└── docs/
    └── plan.md
```

---

## 4. 🔐 Authentication

### Features

- User **signup** with email + password
- **Login** returns JWT access + refresh tokens
- Access token sent in `Authorization: Bearer <token>` header
- Refresh token flow for silent renewal
- **Role**: Only `organizer` role (single user creates & manages tournament)

### Data Model

```
User {
  id              UUID (PK)
  email           string (unique)
  username        string (unique)
  password_hash   string
  created_at      datetime
}
```

### APIs

| Method | Endpoint              | Description               |
| ------ | --------------------- | ------------------------- |
| POST   | `/api/auth/register`  | Create new user account   |
| POST   | `/api/auth/login`     | Returns JWT access+refresh|
| POST   | `/api/auth/refresh`   | Refresh access token      |
| GET    | `/api/auth/me`        | Get current user profile  |

### Validation Rules

- Email must be valid format and unique
- Password minimum 8 characters
- Username 3–30 characters, alphanumeric + underscore only

---

## 5. 🏆 Tournament Module

### Features

- Create a tournament with configurable settings
- View list of user's tournaments (paginated)
- Edit tournament (only before matches start)
- Delete tournament (with confirmation + optional export first)

### Configurable Settings

| Setting            | Type    | Constraints                  |
| ------------------ | ------- | ---------------------------- |
| Tournament Name    | string  | 3–100 chars, required        |
| Number of Teams    | integer | 4, 6, 8, 10, 12 (even only) |
| Players per Team   | integer | 2–11                         |
| Number of Pools    | integer | 1, 2, or 4                   |
| Overs per Match    | integer | 1–20                         |

### Data Model

```
Tournament {
  id              UUID (PK)
  name            string
  overs           integer
  total_teams     integer
  players_per_team integer
  pool_count      integer
  status          enum [SETUP, POOL_STAGE, KNOCKOUTS, COMPLETED]
  created_by      FK → User
  created_at      datetime
  updated_at      datetime
}
```

### Status Lifecycle

```
SETUP → POOL_STAGE → KNOCKOUTS → COMPLETED
```

- **SETUP**: Teams, players, and pools can be edited
- **POOL_STAGE**: Pool matches in progress; no team edits allowed
- **KNOCKOUTS**: Semi-finals and finals
- **COMPLETED**: Tournament over; export available; cleanup eligible

### APIs

| Method | Endpoint                    | Description              |
| ------ | --------------------------- | ------------------------ |
| POST   | `/api/tournaments/`         | Create tournament        |
| GET    | `/api/tournaments/`         | List user's tournaments  |
| GET    | `/api/tournaments/{id}/`    | Tournament detail        |
| PATCH  | `/api/tournaments/{id}/`    | Update tournament (SETUP)|
| DELETE | `/api/tournaments/{id}/`    | Delete tournament        |

---

## 6. 👥 Team & Player Management

### Features

- Create teams for a tournament
- Add players to teams (up to `players_per_team` limit)
- Edit/remove teams and players (only during SETUP)
- Validate: no duplicate player names within a team

### Data Models

```
Team {
  id              UUID (PK)
  name            string (unique per tournament)
  tournament_id   FK → Tournament
  pool_id         FK → Pool (nullable, assigned during pool distribution)
  created_at      datetime
}

Player {
  id              UUID (PK)
  name            string
  team_id         FK → Team
  created_at      datetime

  UNIQUE(name, team_id)  -- no duplicate names in same team
}
```

### APIs

| Method | Endpoint                              | Description             |
| ------ | ------------------------------------- | ----------------------- |
| POST   | `/api/tournaments/{t_id}/teams/`      | Create team             |
| GET    | `/api/tournaments/{t_id}/teams/`      | List teams              |
| PATCH  | `/api/teams/{id}/`                    | Update team             |
| DELETE | `/api/teams/{id}/`                    | Delete team             |
| POST   | `/api/teams/{team_id}/players/`       | Add player              |
| GET    | `/api/teams/{team_id}/players/`       | List players            |
| PATCH  | `/api/players/{id}/`                  | Update player           |
| DELETE | `/api/players/{id}/`                  | Remove player           |

---

## 7. 🏊 Pool Management

### Features

- Create pools for a tournament (count set during tournament creation)
- Distribute teams into pools:
  - **Manual**: Organizer assigns each team to a pool
  - **Random**: System shuffles and distributes evenly
- Each pool must have **equal number of teams** (validation enforced)

### Data Model

```
Pool {
  id              UUID (PK)
  name            string (e.g., "Pool A", "Pool B")
  tournament_id   FK → Tournament
  created_at      datetime
}
```

### Distribution Logic

```
random_assign(teams, pools):
  shuffled = shuffle(teams)
  for i, team in enumerate(shuffled):
    team.pool_id = pools[i % len(pools)].id
```

### APIs

| Method | Endpoint                                    | Description             |
| ------ | ------------------------------------------- | ----------------------- |
| GET    | `/api/tournaments/{t_id}/pools/`            | List pools              |
| POST   | `/api/tournaments/{t_id}/pools/assign/`     | Assign teams to pools   |
| POST   | `/api/tournaments/{t_id}/pools/randomize/`  | Random distribution     |

---

## 8. 📅 Match Scheduling

### Features

- Auto-generate **round-robin fixtures** within each pool
- Optionally allow **manual fixture creation**
- Match statuses track lifecycle

### Match Status Lifecycle

```
SCHEDULED → TOSS → IN_PROGRESS → INNINGS_BREAK → IN_PROGRESS → COMPLETED
                                                              → FORFEITED
                                                              → ABANDONED
```

### Data Model

```
Match {
  id              UUID (PK)
  tournament_id   FK → Tournament
  team1_id        FK → Team
  team2_id        FK → Team
  pool_id         FK → Pool (nullable — null for knockout matches)
  stage           enum [POOL, SEMI_FINAL, THIRD_PLACE, FINAL]
  match_number    integer (sequential within tournament)
  status          enum [SCHEDULED, TOSS, IN_PROGRESS, INNINGS_BREAK, COMPLETED, FORFEITED, ABANDONED]
  toss_winner_id  FK → Team (nullable)
  toss_decision   enum [BAT, BOWL] (nullable)
  winner_id       FK → Team (nullable)
  mom_player_id   FK → Player (nullable)  -- Man of the Match
  created_at      datetime
  updated_at      datetime
}
```

### Round-Robin Generation Logic

```python
# For each pool, generate all unique pairings
def generate_pool_fixtures(pool):
    teams = pool.teams.all()
    fixtures = []
    for i in range(len(teams)):
        for j in range(i + 1, len(teams)):
            fixtures.append((teams[i], teams[j]))
    return fixtures
```

### APIs

| Method | Endpoint                                    | Description                |
| ------ | ------------------------------------------- | -------------------------- |
| POST   | `/api/tournaments/{t_id}/matches/generate/` | Auto-generate fixtures     |
| GET    | `/api/tournaments/{t_id}/matches/`          | List all matches           |
| GET    | `/api/matches/{id}/`                        | Match detail               |
| PATCH  | `/api/matches/{id}/`                        | Update match (status, etc) |

---

## 9. 🎲 Toss

### Flow

1. Match status changes to `TOSS`
2. Organizer records:
   - **Toss winner** (team1 or team2)
   - **Decision** (BAT or BOWL)
3. System determines batting/bowling order for Innings 1
4. Match status → `IN_PROGRESS`

### API

| Method | Endpoint                    | Description       |
| ------ | --------------------------- | ----------------- |
| POST   | `/api/matches/{id}/toss/`   | Record toss result|

**Request Body:**
```json
{
  "toss_winner_id": "uuid-of-team",
  "decision": "BAT"
}
```

---

## 10. 🏟️ Match Engine (Core Logic)

### Innings Model

Each match has **exactly 2 innings**.

```
Innings {
  id              UUID (PK)
  match_id        FK → Match
  innings_number  integer (1 or 2)
  batting_team_id FK → Team
  bowling_team_id FK → Team
  total_runs      integer (default 0)
  total_wickets   integer (default 0)
  total_overs     decimal (e.g., 4.3 = 4 overs 3 balls)
  extras          integer (default 0)
  is_completed    boolean (default false)
  created_at      datetime
}
```

### Innings Completion Conditions

An innings ends when **any** of these is true:

- All overs are bowled (`total_overs == tournament.overs`)
- All wickets fallen (`total_wickets == players_per_team - 1`)
- Batting team **declares** (optional, unlikely in gully cricket)
- **2nd innings only**: Target is chased successfully

### Ball-by-Ball Model

```
Ball {
  id              UUID (PK)
  innings_id      FK → Innings
  over_number     integer (0-indexed internally, display as 1-indexed)
  ball_number     integer (legal ball count within the over: 1–6)
  runs_scored     integer (runs off bat: 0, 1, 2, 3, 4, 6)
  is_wide         boolean (default false)
  is_noball       boolean (default false)
  is_wicket       boolean (default false)
  is_boundary     boolean (default false — true if runs_scored is 4 or 6)
  extra_runs      integer (default 0 — additional runs on wide/noball)
  total_runs      integer (computed: runs_scored + extra_runs + wide_penalty + noball_penalty)
  wicket_type     enum [null, BOWLED, CAUGHT, RUN_OUT, STUMPED, HIT_WICKET]
  striker_id      FK → Player
  non_striker_id  FK → Player
  bowler_id       FK → Player
  fielder_id      FK → Player (nullable — for CAUGHT, RUN_OUT, STUMPED)
  dismissed_player_id  FK → Player (nullable — who got out)
  timestamp       datetime
}
```

### Ball Event Logic (Detailed)

#### Normal Delivery (no extras, no wicket)

```
Input: runs_scored = {0, 1, 2, 3, 4, 6}
Effects:
  - Add runs_scored to innings.total_runs
  - Add runs_scored to striker's batting stats
  - Increment legal ball count
  - If runs_scored is 4 or 6 → mark is_boundary = true
  - If runs_scored is odd → swap striker/non-striker
  - If ball_number == 6 → end over, swap striker/non-striker, change bowler
```

#### Wide Ball

```
Effects:
  - +1 penalty run to innings.total_runs
  - +1 to innings.extras
  - Ball does NOT count as legal delivery (ball_number stays same)
  - Additional runs (e.g., 4 wides) added as extra_runs
  - Striker may optionally be changed (UI toggle)
  - total_runs = 1 (penalty) + extra_runs
```

#### No Ball

```
Effects:
  - +1 penalty run to innings.total_runs
  - +1 to innings.extras
  - Ball does NOT count as legal delivery
  - Batter CAN score runs off the no-ball (runs_scored)
  - runs_scored credited to batter's stats
  - total_runs = 1 (penalty) + runs_scored + extra_runs
  - Normal strike rotation rules apply on runs_scored
  - Next ball is a FREE HIT (wicket not possible except run out)
```

#### Wicket

```
Input: wicket_type, fielder_id (if applicable), dismissed_player_id
Effects:
  - innings.total_wickets += 1
  - dismissed_player marked as OUT in batting order
  - New batter comes in (replaces dismissed player)
  - If wicket_type == CAUGHT → runs_scored = 0 (runs off bat don't count)
  - If wicket_type == RUN_OUT → runs before run-out ARE counted
  - Ball is legal delivery (counts toward over) unless on a no-ball/wide
  - Check if innings should end (all out)
```

> **Note on gully cricket**: Only these wicket types are included: **Bowled, Caught, Run Out, Stumped, Hit Wicket**. LBW is excluded (no umpire DRS in gully cricket!).

### Strike Rotation Rules

| Event                  | Striker Changes? |
| ---------------------- | ---------------- |
| 0 runs (dot ball)      | No               |
| 1, 3 runs              | Yes              |
| 2, 4, 6 runs           | No               |
| End of over (ball 6)   | Yes              |
| Wide (0 extra runs)    | No               |
| Wide (1+ extra runs)   | Odd = yes        |
| Wicket (caught/bowled) | New batter in    |

### Over Management

- Each over = 6 **legal** deliveries
- Wides and no-balls are **not** legal deliveries
- At end of over:
  - Automatically swap strike
  - Prompt to select next bowler
  - Same bowler **cannot** bowl consecutive overs

### Innings Break

- After Innings 1 completes → match status = `INNINGS_BREAK`
- Display **target** = Innings 1 total + 1
- Organizer starts Innings 2 → match status = `IN_PROGRESS`

### Match Result Logic

```
After both innings complete:

if team2.total_runs > team1.total_runs:
    winner = team2
    result = "Team2 won by {wickets_remaining} wickets"

elif team1.total_runs > team2.total_runs:
    winner = team1
    result = "Team1 won by {run_difference} runs"

elif team1.total_runs == team2.total_runs:
    result = "TIE"
    # In pool stage: both teams get 1 point
    # In knockouts: SUPER OVER (see Section 14)
```

### Forfeit

- Either team can forfeit before or during a match
- Forfeiting team **loses**; opposing team gets full **2 points**
- Match status → `FORFEITED`

### APIs

| Method | Endpoint                              | Description                      |
| ------ | ------------------------------------- | -------------------------------- |
| POST   | `/api/matches/{id}/start-innings/`    | Start innings (set batting order)|
| POST   | `/api/matches/{id}/ball/`             | Record a ball event              |
| POST   | `/api/matches/{id}/undo-ball/`        | Undo last ball (correction)      |
| POST   | `/api/matches/{id}/end-innings/`      | Manually end innings             |
| POST   | `/api/matches/{id}/forfeit/`          | Forfeit match                    |
| GET    | `/api/matches/{id}/scorecard/`        | Full scorecard for the match     |

**Ball Event Request Body Examples:**

```json
// Normal delivery: 4 runs
{
  "runs_scored": 4,
  "striker_id": "uuid",
  "non_striker_id": "uuid",
  "bowler_id": "uuid"
}

// Wide with 1 extra run
{
  "runs_scored": 0,
  "is_wide": true,
  "extra_runs": 1,
  "striker_id": "uuid",
  "non_striker_id": "uuid",
  "bowler_id": "uuid"
}

// Wicket: caught
{
  "runs_scored": 0,
  "is_wicket": true,
  "wicket_type": "CAUGHT",
  "dismissed_player_id": "uuid",
  "fielder_id": "uuid-of-catcher",
  "striker_id": "uuid",
  "non_striker_id": "uuid",
  "bowler_id": "uuid"
}
```

---

## 11. 🧮 Scoring & Player Statistics

### Batting Stats (per player per innings)

| Stat           | Calculation                              |
| -------------- | ---------------------------------------- |
| Runs           | Sum of `runs_scored` where player is striker |
| Balls Faced    | Count of legal deliveries faced          |
| 4s             | Count of `is_boundary` AND runs_scored=4 |
| 6s             | Count of `is_boundary` AND runs_scored=6 |
| Strike Rate    | (Runs / Balls Faced) × 100              |
| Out/Not Out    | Whether player was dismissed             |

### Bowling Stats (per player per innings)

| Stat           | Calculation                                          |
| -------------- | ---------------------------------------------------- |
| Overs Bowled   | Legal deliveries / 6 (display as X.Y format)        |
| Runs Conceded  | Sum of total_runs on balls bowled                    |
| Wickets        | Count of wickets taken (excluding run outs)          |
| Economy Rate   | Runs Conceded / Overs Bowled                         |
| Wides          | Count of wides bowled                                |
| No Balls       | Count of no-balls bowled                             |

### Fielding Stats (per player per tournament)

| Stat     | Calculation                                     |
| -------- | ----------------------------------------------- |
| Catches  | Count of CAUGHT wickets where player is fielder |
| Run Outs | Count of RUN_OUT where player is fielder        |
| Stumpings| Count of STUMPED where player is fielder        |

### Points System (Player Performance Rating)

Used for **Man of the Match** and **Man of the Tournament** calculation:

| Action         | Points |
| -------------- | ------ |
| Run scored     | 1      |
| Boundary (4)   | 1 bonus (total 5 per 4) |
| Six (6)        | 2 bonus (total 8 per 6) |
| Wicket taken   | 10     |
| Catch taken    | 5      |
| Run out (fielder)| 5    |
| Stumping       | 5      |

**Man of the Match**: Highest point total in that match.
**Man of the Tournament**: Highest cumulative point total across all matches.

> Tie-breaker for awards: Higher batting strike rate → More wickets → Alphabetical name.

---

## 12. 📊 Points Table & Rankings

### Pool Points Table

Each pool has its own points table. Columns:

| Column   | Description                                  |
| -------- | -------------------------------------------- |
| Pos      | Position (rank)                              |
| Team     | Team name                                    |
| P        | Matches Played                               |
| W        | Wins                                         |
| L        | Losses                                       |
| T        | Ties                                         |
| NR       | No Result (abandoned)                        |
| Pts      | Points (Win=2, Tie=1, Loss=0, NR=0)         |
| NRR      | Net Run Rate                                 |

### NRR Calculation

```
NRR = (Total Runs Scored / Total Overs Faced)
    - (Total Runs Conceded / Total Overs Bowled)
```

**Important edge cases:**

- If a team is **bowled out** (all out), overs faced = **full allocated overs** (not actual overs bowled). This is the standard cricket rule — being all out in 3.2 overs in a 5-over match means overs faced = 5.0 for NRR.
- Forfeited matches: The non-forfeiting team's NRR is not affected (match excluded from NRR calc), but they get 2 points.
- Abandoned matches: Excluded from NRR calculation.

### Ranking Sort Order

1. **Points** (descending)
2. **NRR** (descending)
3. **Wins** (descending)
4. **Head-to-head result** (if two teams are still tied)

---

## 13. 🔁 Tournament Progression

### Pool Stage → Knockouts Transition

1. All pool matches must be **COMPLETED** (or FORFEITED/ABANDONED)
2. Organizer clicks **"End Pool Stage"**
3. System calculates final standings per pool
4. **Top teams advance** based on pool count:

| Pools | Teams per Pool (example) | Advancement                              |
| ----- | ------------------------ | ---------------------------------------- |
| 1     | All teams in 1 pool      | Top 4 → Semi-finals                     |
| 2     | Half each                | Top 2 per pool → Semi-finals            |
| 4     | Quarter each             | Top 1 per pool → Semi-finals            |

### Knockout Bracket

```
Semi-Final 1:  Pool A #1  vs  Pool B #2
Semi-Final 2:  Pool B #1  vs  Pool A #2

(For single pool: #1 vs #4, #2 vs #3)

3rd Place Match:  Loser SF1  vs  Loser SF2
Final:            Winner SF1 vs  Winner SF2
```

### Knockout Match Rules

- **No NRR** — direct winner-takes-all
- In case of a **tie** → **Super Over** (see below)
- Organizer selects Man of the Match after each knockout game

---

## 14. ⚡ Super Over (Tie-Breaker for Knockouts)

### When

- A knockout match (semi-final, final, 3rd place) ends in a **tie**

### Rules

1. Each team bats for **1 over** (6 balls)
2. Each team sends **2 batters** and selects **1 bowler**
3. Team that scored more runs in the super over **wins**
4. If still tied → **sudden death**: one ball each until one team scores more

### Data Model

```
SuperOver {
  id            UUID (PK)
  match_id      FK → Match
  round         integer (1 for first super over, 2+ for sudden death)
  team1_runs    integer
  team2_runs    integer
  winner_id     FK → Team (nullable)
}
```

### API

| Method | Endpoint                                | Description        |
| ------ | --------------------------------------- | ------------------|
| POST   | `/api/matches/{id}/super-over/start/`   | Start super over  |
| POST   | `/api/matches/{id}/super-over/ball/`    | Record super over ball |

---

## 15. 🏅 Awards System

### Man of the Match (MOM)

- Calculated **automatically** at match end using player performance points
- Organizer can **override** the selection via UI
- Stored in `Match.mom_player_id`

### Man of the Tournament (MOT)

- Calculated when tournament status → `COMPLETED`
- Highest cumulative performance points across all matches
- Stored in tournament export; displayed on tournament summary page

### API

| Method | Endpoint                                  | Description             |
| ------ | ----------------------------------------- | ----------------------- |
| GET    | `/api/matches/{id}/mom/`                  | Get MOM recommendation  |
| PATCH  | `/api/matches/{id}/mom/`                  | Override MOM selection   |
| GET    | `/api/tournaments/{id}/mot/`              | Get MOT calculation     |

---

## 16. 📤 Data Export

### Features

- Export **complete tournament data** to a multi-sheet Excel file (.xlsx)
- Available once tournament status = `COMPLETED` (also available during tournament)

### Excel Sheets

| Sheet Name       | Contents                                                    |
| ---------------- | ----------------------------------------------------------- |
| Summary          | Tournament name, dates, winner, MOT                         |
| Teams            | All teams with player rosters                               |
| Pool Standings   | Final points table per pool                                 |
| Match Results    | All matches with scores, winners, MOM                       |
| Batting Stats    | Per-player batting: runs, balls, SR, 4s, 6s across matches  |
| Bowling Stats    | Per-player bowling: overs, runs, wickets, economy           |
| Fielding Stats   | Catches, run outs, stumpings per player                     |
| Ball-by-Ball     | Complete ball-by-ball log for every match                    |

### API

| Method | Endpoint                              | Description                |
| ------ | ------------------------------------- | -------------------------- |
| GET    | `/api/tournaments/{id}/export/`       | Download Excel file        |

---

## 17. 🧹 Data Cleanup Strategy

### Rule

Tournament data is **temporary** — designed for one-time events.

### Flow

```
Tournament reaches COMPLETED status
         │
         ▼
   Prompt: "Download Excel before deleting?"
         │
    ┌────┴─────┐
    ▼          ▼
 Download    Skip
    │          │
    ▼          ▼
  "Confirm delete tournament data?"
         │
         ▼
   Soft-delete (mark as deleted, retain for 7 days)
         │
         ▼
   Permanent deletion (cron job / Celery task)
```

### Implementation

- **Soft delete**: Set `Tournament.is_deleted = true` and `deleted_at = now()`
- **Hard delete**: Background task purges tournaments where `deleted_at < now() - 7 days`
- User can **restore** within the 7-day window

---

## 18. 📱 Pages & UI Flow

### Page Map

```
/                        → Landing page (public)
/login                   → Login
/register                → Sign up
/dashboard               → User's tournament list
/tournaments/new         → Create tournament form
/tournaments/:id         → Tournament overview (pools, standings, bracket)
/tournaments/:id/teams   → Team & player management
/tournaments/:id/matches → Match list with status
/matches/:id             → Match detail / scorecard
/matches/:id/live        → Ball-by-ball scoring interface
/matches/:id/toss        → Toss screen
/tournaments/:id/export  → Export & cleanup page
```

### Live Scoring Page (`/matches/:id/live`) — Key UI Elements

1. **Header**: Team names, score (e.g., `Team A: 45/3 (4.2 ov)`)
2. **Current batters**: Striker (highlighted) and non-striker with individual scores
3. **Current bowler**: Name, over figures, economy
4. **Ball input panel**: Buttons for 0, 1, 2, 3, 4, 6, WD, NB, WICKET
5. **This over**: Visual ball-by-ball display (e.g., `1 . 4 W 2 1`)
6. **Undo button**: Revert last ball
7. **Required run rate** (2nd innings): Dynamic calculation
8. **Recent overs summary**: Collapsible section

---

## 19. ⚙️ Full API Summary

### Auth
```
POST   /api/auth/register/
POST   /api/auth/login/
POST   /api/auth/refresh/
GET    /api/auth/me/
```

### Tournaments
```
POST   /api/tournaments/
GET    /api/tournaments/
GET    /api/tournaments/{id}/
PATCH  /api/tournaments/{id}/
DELETE /api/tournaments/{id}/
```

### Teams & Players
```
POST   /api/tournaments/{t_id}/teams/
GET    /api/tournaments/{t_id}/teams/
PATCH  /api/teams/{id}/
DELETE /api/teams/{id}/
POST   /api/teams/{team_id}/players/
GET    /api/teams/{team_id}/players/
PATCH  /api/players/{id}/
DELETE /api/players/{id}/
```

### Pools
```
GET    /api/tournaments/{t_id}/pools/
POST   /api/tournaments/{t_id}/pools/assign/
POST   /api/tournaments/{t_id}/pools/randomize/
```

### Matches
```
POST   /api/tournaments/{t_id}/matches/generate/
GET    /api/tournaments/{t_id}/matches/
GET    /api/matches/{id}/
PATCH  /api/matches/{id}/
POST   /api/matches/{id}/toss/
POST   /api/matches/{id}/start-innings/
POST   /api/matches/{id}/ball/
POST   /api/matches/{id}/undo-ball/
POST   /api/matches/{id}/end-innings/
POST   /api/matches/{id}/forfeit/
GET    /api/matches/{id}/scorecard/
```

### Super Over
```
POST   /api/matches/{id}/super-over/start/
POST   /api/matches/{id}/super-over/ball/
```

### Scoreboard & Rankings
```
GET    /api/tournaments/{t_id}/standings/
GET    /api/tournaments/{t_id}/standings/{pool_id}/
```

### Awards
```
GET    /api/matches/{id}/mom/
PATCH  /api/matches/{id}/mom/
GET    /api/tournaments/{id}/mot/
```

### Export
```
GET    /api/tournaments/{id}/export/
```

---

## 20. 🚀 Development Phases

### Phase 1: Project Setup & Auth (Week 1)

- [ ] Initialize Django backend with DRF
- [ ] Initialize React frontend with TypeScript + Tailwind
- [ ] Docker Compose for local dev (backend + frontend + db)
- [ ] User registration & login with JWT
- [ ] Protected route middleware (frontend)
- [ ] Basic landing page & dashboard shell

### Phase 2: Tournament, Teams & Pools (Week 2)

- [ ] Tournament CRUD APIs + frontend forms
- [ ] Team & player management (CRUD)
- [ ] Pool creation and assignment (manual + random)
- [ ] Tournament detail page with pool visualization
- [ ] Validation: team count, player limits, pool balance

### Phase 3: Match Scheduling & Toss (Week 3)

- [ ] Round-robin fixture generation
- [ ] Match list page with status badges
- [ ] Toss flow (UI + API)
- [ ] Match detail page (scorecard shell)

### Phase 4: Match Engine & Live Scoring (Week 3–4)

- [ ] Innings and Ball models
- [ ] Ball-by-ball recording API with all event types
- [ ] Strike rotation logic
- [ ] Over management (bowler change, over summary)
- [ ] Live scoring UI (ball input panel, current batters, bowler stats)
- [ ] Undo last ball
- [ ] Innings completion detection
- [ ] Match result calculation
- [ ] 2nd innings target display

### Phase 5: Points Table & Rankings (Week 5)

- [ ] Points table calculation engine
- [ ] NRR calculation with edge cases (all-out rule, forfeits)
- [ ] Pool standings API
- [ ] Scoreboard UI with sortable tables
- [ ] Head-to-head tie-breaker logic

### Phase 6: Knockouts & Super Over (Week 5–6)

- [ ] Pool → knockout transition logic
- [ ] Knockout bracket generation (semi-finals, final, 3rd place)
- [ ] Bracket visualization UI
- [ ] Super over implementation (tie-breaker)
- [ ] Tournament completion flow

### Phase 7: Awards, Export & Cleanup (Week 6)

- [ ] MOM auto-calculation + override UI
- [ ] MOT calculation
- [ ] Excel export with multi-sheet workbook
- [ ] Soft delete + restore
- [ ] Background cleanup task
- [ ] Export confirmation flow UI

### Phase 8: Polish & Testing (Week 7)

- [ ] Unit tests: scoring engine, NRR, strike rotation, result logic
- [ ] Integration tests: full match flow, tournament lifecycle
- [ ] API tests: auth, CRUD, edge cases
- [ ] Frontend: responsive design audit
- [ ] Error handling & loading states
- [ ] Input validation (frontend Zod schemas + backend serializers)

---

## 21. 🧪 Testing Strategy

### Unit Tests (Backend — pytest + Django TestCase)

| Module         | Test Cases                                                   |
| -------------- | ------------------------------------------------------------ |
| Scoring Engine | Dot ball, singles, boundaries, extras (wide/noball), wickets |
| Strike Logic   | Odd runs swap, even stay, over-end swap, wicket replacement  |
| NRR Calculator | Normal case, all-out case, forfeits excluded, ties           |
| Points Table   | Win/loss/tie points, sort order, head-to-head               |
| Match Result   | Win by runs, win by wickets, tie, forfeit                   |
| Super Over     | Normal result, tied super over → sudden death               |
| Awards         | MOM calculation, tie-breaker logic                          |

### Integration Tests

| Flow                | Coverage                                              |
| ------------------- | ----------------------------------------------------- |
| Full Match          | Toss → Innings 1 → Break → Innings 2 → Result        |
| Tournament Lifecycle| Setup → Pool Stage → Knockouts → Completed → Export   |
| Pool Advancement    | 1-pool, 2-pool, 4-pool scenarios                     |

### Frontend Tests (Vitest + React Testing Library)

- Component rendering tests
- Ball input panel interaction tests
- Score display updates
- Form validation tests

---

## 22. 🧠 Future Enhancements

- **Live Scoring via WebSockets**: Real-time score updates for spectators
- **Mobile App**: React Native companion app for scoring on-field
- **Player Profiles**: Career stats across multiple tournaments
- **Tournament Sharing**: Public link for spectators to view live scores
- **Cloud Save**: Optional persistent storage instead of deletion
- **Commentary Engine**: Auto-generated ball-by-ball text commentary
- **Multiple Formats**: Support different tournament formats (league, double elimination)
- **Umpire Mode**: Separate read-only view for neutral umpire

---

## 23. 📌 Dev Environment & Config

### Environment Variables (`.env`)

```env
# Backend
DJANGO_SECRET_KEY=your-secret-key
DJANGO_DEBUG=true
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1
DATABASE_URL=sqlite:///db.sqlite3
JWT_ACCESS_TOKEN_LIFETIME=60        # minutes
JWT_REFRESH_TOKEN_LIFETIME=1440     # minutes (24 hours)
CORS_ALLOWED_ORIGINS=http://localhost:5173

# Frontend
VITE_API_BASE_URL=http://localhost:8000/api
```

### Key Commands

```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate          # Linux/Mac
venv\Scripts\activate             # Windows
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver

# Frontend
cd frontend
npm install
npm run dev

# Docker (full stack)
docker-compose up --build
```

### Database Migrations

```bash
python manage.py makemigrations
python manage.py migrate
```

### Running Tests

```bash
# Backend
pytest --cov=apps

# Frontend
npm run test
```