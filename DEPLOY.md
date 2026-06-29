# Deploying Mini HCM to Vercel

The project has two parts that deploy separately:

1. **Frontend** (React + Vite) → Vercel
2. **Backend** (Node.js + Express, in `/server`) → Render / Railway / Fly / a VM
   *(Express is a long-running server, so it does not belong on Vercel's static
   frontend project. The frontend can also run without it by talking to
   Firestore directly — see the root `README` / `src/app/firebase/api.ts`.)*

---

## 1. Add `index.html` (one-time)

This file is required by Vite to build but is auto-generated inside the Figma
Make preview, so it isn't included. Create **`index.html`** in the project root
with exactly this content:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Mini HCM — Time Tracking</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`src/main.tsx` and `vercel.json` are already included.

## 2. Verify the build locally

```bash
npm install
npm run build      # outputs to /dist
npm run preview    # optional: serve the built app
```

## 3. Deploy the frontend to Vercel

1. Push the project to GitHub.
2. In Vercel, **New Project → Import** the repo.
3. Vercel auto-detects Vite (the included `vercel.json` sets build command
   `vite build`, output `dist`, and SPA rewrites).
4. Add **Environment Variables** (Project → Settings → Environment Variables):

   | Name            | Value                                  | Notes                                   |
   |-----------------|----------------------------------------|-----------------------------------------|
   | `VITE_API_BASE` | `https://your-express-server.com`      | Leave empty to use Firestore directly   |

   The Firebase **web** config lives in `src/app/firebase/config.ts`. If you
   prefer not to commit it, you can refactor those values to read from
   `import.meta.env.VITE_FIREBASE_*` and add them as env vars too.
5. **Deploy.**

## 4. Deploy the Express backend (optional)

See `server/README.md`. Host it on Render/Railway/Fly, set its service-account
credentials there, then point the frontend's `VITE_API_BASE` at its public URL.

## 5. Firebase setup reminders

- Authentication → enable **Email/Password**.
- Firestore → create the database.
- In **Authentication → Settings → Authorized domains**, add your Vercel domain
  (e.g. `your-app.vercel.app`) so login works in production.
