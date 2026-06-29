# Mini HCM — Node.js + Express Backend

Server-side processing for the Mini HCM Time Tracking system. It records
attendance punches and computes **regular hours, overtime (OT), night
differential (ND), lateness, and undertime**, persisting daily summaries to
Firestore via the Firebase **Admin** SDK.

> Note: this server cannot run inside the Figma Make preview (which is
> frontend-only). Run it locally or deploy it (Render / Railway / Fly / a VM)
> after downloading the project.

## 1. Get a service account key

1. Firebase Console → ⚙️ **Project Settings → Service accounts**
2. **Generate new private key** → downloads a JSON file
3. Save it as `server/serviceAccountKey.json`
   *(or set `GOOGLE_APPLICATION_CREDENTIALS` to its path — see `.env.example`)*

## 2. Install & run

```bash
cd server
npm install
npm run dev      # http://localhost:4000
```

You should see `✅ Mini HCM server running on http://localhost:4000`.

## 3. Point the frontend at the server

In the **project root** (not /server), create a `.env` file:

```
VITE_API_BASE=http://localhost:4000
```

Restart the frontend dev server. The React app will now route all punch
operations and reports through Express. If `VITE_API_BASE` is left empty, the
frontend talks to Firestore directly (handy for the preview).

## API

| Method | Endpoint                | Purpose                                   |
|--------|-------------------------|-------------------------------------------|
| GET    | `/api/health`           | Liveness check                            |
| POST   | `/api/punch-in`         | `{ userId, date }` → create punch         |
| POST   | `/api/punch-out`        | `{ punchId }` → close punch + compute      |
| PUT    | `/api/punch/:id`        | `{ punchIn, punchOut }` → edit + recompute |
| DELETE | `/api/punch/:id`        | Delete a punch                            |
| GET    | `/api/users`            | All user profiles                         |
| GET    | `/api/punches`          | All attendance records                    |
| GET    | `/api/punches/:userId`  | One employee's records                    |
| GET    | `/api/summary`          | All daily summaries                       |

Computation lives in `compute.ts` and is mirrored on the frontend at
`src/app/firebase/compute.ts`.
