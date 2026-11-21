# VibeLedger — Full-stack skill-swap platform

VibeLedger is a student/creator community for peer-to-peer micro-skill exchange, lightweight mentorship, project proof, peer attestations, and reputation built through completed collaborations.

## Tech stack
- Frontend: HTML5, CSS3, vanilla JavaScript
- Backend: Node.js + Express
- Authentication: express-session + bcryptjs password hashing
- Persistence: JSON database file at `data/db.json` (created automatically)

## Run locally
1. Install **Node.js 18 or newer**.
2. Extract this ZIP and open the `VibeLedger_FullStack` folder in VS Code.
3. Open a terminal in that folder and run:
   ```bash
   npm install
   npm start
   ```
4. Open `http://localhost:3000`.

No Python is required.

## Demo account
- Email: `mira@example.com`
- Password: `demo123`

Other seeded accounts:
- `aarav@example.com` / `demo123`
- `zoya@example.com` / `demo123`
- `riya@example.com` / `demo123`
- `dev@example.com` / `demo123`
- `ananya@example.com` / `demo123`
- `kabir@example.com` / `demo123`

New accounts can be registered through the website.

## Included features
- Register, sign in, sign out, password hashing, session-based authentication
- Editable profile, teach/learn skill lists, location, bio
- Search/discover creators and skills
- Connect/disconnect peers
- Browse your connections and connect with suggested community members
- Receive in-app notifications for new connections, swap requests and decisions, and project attestations
- Earn daily dashboard points for the quiz, sharing projects and updates, connecting, and completing swaps
- Add project ideas and starter code to portfolio entries; open project details from the portfolio
- Propose skill swaps, accept/decline requests, mark accepted swaps complete
- Community updates and kudos/likes
- Publish project proof with skill tags and optional project URL
- Peer attestations for another member's proof
- Peer reviews for completed swaps and average reputation
- Dashboard stats, responsive layout, demo data

## Important notes / production hardening
This is a learning/demo project, not a production-ready decentralized protocol:
- The “trust graph” is stored centrally in a JSON file; it is **not blockchain-based** and signatures are not cryptographically verified.
- JSON-file persistence is suitable for a local demo, not concurrent production traffic. For a deployed version, use PostgreSQL/SQLite and database migrations.
- Before public deployment, set a long random `SESSION_SECRET`, use HTTPS, secure cookies, CSRF protection, rate limiting, input validation, and a persistent session store. Configure `cookie.secure=true` behind HTTPS.
- Seeded demo passwords are intentionally simple; do not reuse them in a real deployment.
- This version does not include real-time chat, email notifications, or an installed PWA service worker.

## Folder structure
```text
VibeLedger_FullStack/
├── server.js
├── package.json
├── README.md
├── data/                 # db.json is created on first run
└── public/
    ├── index.html
    ├── css/style.css
    └── js/app.js
```


## If demo login says "Email or password is incorrect"
This updated version restores missing demo accounts in an existing `data/db.json` when the server starts. Stop the server with `Ctrl+C`, then run:
```powershell
npm.cmd install
npm.cmd start
```
Sign in with `mira@example.com` and `demo123`. Run commands from the folder that contains `package.json`.


## Added features: Resume upload + real-time updates
- Open **Your profile** and upload a PDF, DOC, or DOCX resume (up to 5 MB).
- Your resume is stored privately on the server and can be viewed/downloaded while signed in.
- Socket.IO broadcasts shared data changes so other connected browser sessions refresh the dashboard/feed.
- Real-time updates require the Node.js server to stay running; the app is not publicly hosted by default.
- Install dependencies with `npm.cmd install`, then start with `npm.cmd start` in PowerShell.


## Professional networking interface
The interface now uses a LinkedIn-inspired professional networking style: a compact navigation rail, global people/skills search, professional profile, activity feed, connections, skill-exchange cards, and resume section. It is an original design and is not affiliated with LinkedIn.

### Resume
Open **My profile & resume** and upload PDF/DOC/DOCX (max 5 MB). The server stores the file in the local `uploads` folder. Only signed-in sessions can request a resume download.

### Real-time behavior
Socket.IO notifies connected browsers when the server data changes. This is real-time within the running Node.js server, not public hosting. For production, configure HTTPS, a durable database, secure session secret/cookies, and managed file storage.

## Deploy to Render
This application requires a Node.js host; GitHub Pages cannot run its Express API, sessions, or Socket.IO server. The included `render.yaml` configures a Render web service and a persistent disk for the JSON database and uploaded resumes.

1. Push this folder to the GitHub repository you want to deploy.
2. In Render, choose **New → Blueprint**, connect that GitHub repository, and use `render.yaml` as the Blueprint path.
3. Review the Blueprint and create the service. It uses a paid 0.5 CPU / 512 MB instance and a 1 GB persistent disk; Render will generate the `SESSION_SECRET`.
4. Wait for the first deploy, then open the service URL. The `/api/health` endpoint is used for health checks.

The persistent disk keeps the JSON database and resumes across restarts and deploys. The app uses a JSON file for persistence and is intended for a single server instance; it is not suitable for scaling to multiple instances or production workloads with concurrent users.
