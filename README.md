# 🚀 RoomSync — Conference Room Booking System

A full-stack conference room booking system built with React (Vite) + Node.js/Express.

---

## ✅ STEP-BY-STEP SETUP (macOS / MacBook)

### Step 1 — Install Node.js

Download the **LTS version** from: https://nodejs.org/en

After install, verify in Terminal:
```bash
node -v    # should print v18.x or higher
npm -v     # should print 9.x or higher
```

### Step 2 — Fix npm Permission Errors (if needed)

If you ever see `EACCES` errors:
```bash
sudo chown -R $(whoami) ~/.npm
```

### Step 3 — Navigate to Project

Unzip / place this folder, then open Terminal:
```bash
cd path/to/conference-booking-system
```

---

## 🖥️ Backend Setup (Node.js + Express)

```bash
cd server
npm install
node server.js
```

Backend runs at: **http://localhost:5000**

To run with auto-reload during development:
```bash
npx nodemon server.js
```

---

## 💻 Frontend Setup (React + Vite)

Open a **second Terminal tab/window**:

```bash
cd client
npm install
npm run dev
```

Frontend runs at: **http://localhost:5173**

---

## ▶️ Running Both Together

| Terminal | Command | URL |
|----------|---------|-----|
| Terminal 1 | `cd server && node server.js` | http://localhost:5000 |
| Terminal 2 | `cd client && npm run dev` | http://localhost:5173 |

Open your browser to **http://localhost:5173**

---

## 🔐 Login Credentials

| Role | Email | Password |
|------|-------|----------|
| **Admin** | admin@conference.com | admin123 |
| **User** | user@conference.com | user123 |

---

## 🗂️ Project Structure

```
conference-booking-system/
├── server/
│   ├── controllers/
│   │   ├── bookingController.js   # Booking CRUD + conflict detection
│   │   ├── roomController.js      # Room availability
│   │   └── authController.js      # Login
│   ├── models/
│   │   └── store.js               # In-memory data store (replace with MongoDB)
│   ├── routes/
│   │   ├── bookings.js
│   │   ├── rooms.js
│   │   └── auth.js
│   ├── middleware/
│   │   └── auth.js                # requireAuth, requireAdmin
│   └── server.js                  # Express entry point
│
└── client/
    └── src/
        ├── pages/
        │   ├── LoginPage.jsx
        │   ├── DashboardPage.jsx
        │   ├── BookRoomPage.jsx       # 3-step booking flow
        │   ├── MyRequestsPage.jsx
        │   ├── AdminPanelPage.jsx     # Approve / Reject
        │   └── RoomsPage.jsx          # Availability + Timeline
        ├── components/
        │   └── Layout.jsx             # Sidebar navigation
        ├── context/
        │   └── AuthContext.jsx        # Auth state
        ├── utils/
        │   └── api.js                 # Axios instance
        ├── App.jsx                    # Router + routes
        ├── main.jsx
        └── index.css                  # Full design system
```

---

## 🌐 API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/auth/login | — | Login |
| GET | /api/rooms | user | List rooms (with availability check) |
| GET | /api/bookings | user | All bookings (filterable) |
| POST | /api/bookings | user | Create booking request |
| GET | /api/bookings/stats | admin | Dashboard stats |
| PUT | /api/bookings/:id | admin | Approve / Reject |
| DELETE | /api/bookings/:id | admin | Delete booking |

---

## 🔄 Upgrading to MongoDB

Replace `server/models/store.js` with Mongoose models:

```bash
cd server
npm install mongoose
```

Then update each controller to use `await Booking.find(...)` etc.

---

## 🎨 Features

- ✅ **3-step booking flow** — Details → Room Selection → Confirm
- ✅ **Real-time conflict detection** — rooms auto-checked for availability
- ✅ **Admin panel** — approve/reject with remarks, filters, search
- ✅ **Role-based access** — admin vs user views
- ✅ **Dashboard** — stats, today's schedule, room usage chart
- ✅ **Rooms page** — visual timeline, schedule per room
- ✅ **My Requests** — filter by status, search bookings
- ✅ **Dark premium UI** — custom design system, smooth animations
