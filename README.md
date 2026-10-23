# MICE Operations & Event Management Suite (MERN + Redux Toolkit)

An enterprise-grade **MICE (Meetings, Incentives, Conferences, and Exhibitions)** Event & Operations Management platform built with **React 19**, **Redux Toolkit**, **Node.js / Express 5**, and **MongoDB / Mongoose**.

---

## Key Engineering Highlights

- **Multi-View Workspace (`Grid` • `Kanban Board` • `Timeline`):** Switch seamlessly between paginated cards, a 3-stage operational Kanban board (`Pending` → `In Progress` → `Completed`), and a chronological schedule view.
- **Live Portfolio KPI & Budget Aggregation:** Real-time calculation of total MICE events, active operations, attendee capacity utilization (`registered` vs. `expected`), and proportional budget allocation across **Meetings**, **Incentives**, **Conferences**, and **Exhibitions**.
- **Debounced Multi-Field Search (`300ms`):** Custom [`useDebounce`](frontend/src/hooks/useDebounce.js) hook prevents unnecessary network requests while searching across event titles, venues, client sponsors, and lead coordinators.
- **Interactive Operational Checklists & Event Cloning:** Track sub-tasks directly on event cards with live progress calculation, or clone recurring MICE events in one click.
- **1-Click Demo Portfolio Seeder & CSV Reporting:** Populate realistic enterprise MICE data via `POST /api/tasks/seed` and export filtered portfolios to `.csv`.
- **Persistent Dark / Light Theme:** CSS custom-property theming persisted in `localStorage`.

---

## System Architecture

```
d:\Projects\CRUD
├── backend/
│   ├── controllers/
│   │   └── taskController.js   # CRUD + KPI aggregation + Demo seeder
│   ├── models/
│   │   └── Task.js             # Mongoose schema (MICE fields + checklists)
│   ├── routes/
│   │   └── taskRoutes.js       # Express REST router
│   ├── server.js               # Express 5 app + health check + error middleware
│   └── package.json
└── frontend/
    ├── src/
    │   ├── app/
    │   │   └── store.js        # Redux Toolkit store configuration
    │   ├── features/tasks/
    │   │   └── taskSlice.js    # Async thunks & state slice
    │   ├── hooks/
    │   │   └── useDebounce.js  # 300ms debounce hook
    │   ├── App.jsx             # MICE Operations dashboard UI
    │   ├── App.css             # Responsive light/dark design system
    │   └── main.jsx            # React 19 root provider
    └── package.json
```

---

## REST API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Service health check |
| `GET` | `/api/tasks` | List events (`?search=&category=&status=&priority=&sortBy=&page=&limit=`) + live `stats` |
| `POST` | `/api/tasks` | Create a new MICE event |
| `POST` | `/api/tasks/seed` | Seed 6 realistic enterprise MICE events |
| `PUT` | `/api/tasks/:id` | Update event details, status, or checklist items |
| `DELETE` | `/api/tasks/:id` | Permanently delete a MICE event |

---

## Quick Start

### 1. Start the Backend (`port 5000`)
```bash
cd backend
npm install
npm run dev
```

### 2. Start the Frontend (`port 5173`)
```bash
cd frontend
npm install
npm run dev
```

Once open, click **✨ Seed Demo Portfolio** in the top navigation bar to populate sample MICE events immediately.

