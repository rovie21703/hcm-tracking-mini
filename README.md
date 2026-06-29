# 🕒 Mini HCM (Human Capital Management) Time Tracking Prototype

A modern, responsive, and robust **Human Capital Management (HCM) Time Tracking System** designed for employee time-logging and attendance reporting. This repository contains both the **React + Vite Frontend** and a **Node.js + Express Backend**, integrating seamlessly with **Firebase Authentication** and **Google Cloud Firestore**.

---

## ✨ Features

- **🔐 Secure Authentication:** User sign-up and log-in powered by **Firebase Auth**.
- **⏱️ Smart Time Punching:** Seamless punch-in/punch-out functionality.
- **📊 Real-time Computations:** Automatically calculates:
  - Regular Hours worked
  - Overtime (OT)
  - Night Differential (ND)
  - Lateness & Undertime
- **🖥️ Monitor Dashboard:** Comprehensive supervisor/admin screen to monitor employee attendance logs, summaries, and profiles.
- **⚙️ Flexible Architecture:** Dual-mode setup (Frontend-only talking to Firestore directly, or powered by the Node/Express backend).

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** React with TypeScript (built using Vite)
- **Styling:** Vanilla CSS & Tailwind CSS / shadcn/ui components
- **Database/Auth:** Firebase Client SDK (Auth & Firestore)

### Backend (Optional but recommended)
- **Runtime:** Node.js
- **Server Framework:** Express
- **Database Integration:** Firebase Admin SDK

---

## 📁 Repository Structure

```text
├── guidelines/            # Coding & UI guidelines
├── server/                # Node.js + Express backend server
│   ├── compute.ts         # Server-side punch calculation logic
│   ├── firebaseAdmin.ts   # Firebase Admin initialization
│   └── index.ts           # Express entrypoint
├── src/                   # React frontend application
│   ├── app/
│   │   ├── components/    # Reusable UI components
│   │   ├── firebase/      # Client API, Config, & Logic
│   │   └── screens/       # Application views (Monitor, App dashboard)
│   └── main.tsx           # React entry point
├── DEPLOY.md              # Deployment guide for Vercel
└── README.md              # This file
```

---

## 🚀 Quick Start

### 1. Frontend Setup & Run

1. Install dependencies:
   ```bash
   npm install
   ```

2. Setup environment variables by copying `.env.example`:
   ```bash
   cp .env.example .env
   ```
   If using the Express backend, set:
   ```env
   VITE_API_BASE=http://localhost:4000
   ```
   *(If `VITE_API_BASE` is left blank, the frontend will communicate directly with Firestore.)*

3. Run the development server:
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:5173`.

### 2. Backend Setup & Run (Optional)

1. Navigate to the server folder and install dependencies:
   ```bash
   cd server
   npm install
   ```

2. Add your Firebase Service Account JSON file as `server/serviceAccountKey.json`. (See [Firebase Console](https://console.firebase.google.com/) -> Project Settings -> Service Accounts -> Generate new private key).

3. Set up environment variables for the server:
   ```bash
   cp .env.example .env
   ```

4. Run the Express dev server:
   ```bash
   npm run dev
   ```
   The backend will run on `http://localhost:4000`.

---

## 🔌 API Reference (Backend)

The Express backend exposes the following REST endpoints:

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Liveness check |
| `POST` | `/api/punch-in` | Initiates a punch-in for a user |
| `POST` | `/api/punch-out` | Completes a punch-out and computes durations |
| `PUT` | `/api/punch/:id` | Modifies an existing punch and recomputes stats |
| `DELETE`| `/api/punch/:id` | Deletes a punch record |
| `GET` | `/api/users` | Lists all employee profiles |
| `GET` | `/api/punches` | Lists all attendance logs |
| `GET` | `/api/summary` | Lists daily aggregated attendance summaries |

---

## ☁️ Deployment

For a detailed step-by-step walkthrough on how to deploy this application to Vercel and other cloud providers, please refer to [DEPLOY.md](file:///home/rovie/Downloads/hcm%20prototype/DEPLOY.md).