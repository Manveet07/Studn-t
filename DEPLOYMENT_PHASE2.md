# Studn't Phase 2 — Local testing and Render deployment

## Architecture
- Frontend: static HTML/CSS/JavaScript; `frontend/js/api.js` uses native `fetch()` for HTTP requests.
- Backend: Express REST API in `backend/`.
- Database: MongoDB Atlas through Mongoose.
- Authentication: JWT bearer token. Token is stored in browser localStorage; application records should be stored through the backend in MongoDB.

## Local setup
1. Install Node.js 20+ and MongoDB Atlas access.
2. In `backend/`, run `npm install`.
3. Copy `.env.example` to `.env` and fill in a valid `MONGODB_URI` and a strong `JWT_SECRET`. Never commit `.env`.
4. Run `npm start` in `backend/`. API runs on `http://localhost:5000`.
5. Serve `frontend/` using VS Code Live Server (for example `http://127.0.0.1:5500`). Do not open HTML as `file://`.
6. Test `GET http://localhost:5000/api/health`.

## Deploy backend to Render
1. Push the repository to the same existing GitHub repository URL.
2. Render → New → Web Service → connect the repository. Set Root Directory to `backend`, Build Command `npm install`, Start Command `npm start`.
3. Set `MONGODB_URI`, `JWT_SECRET`, `NODE_ENV=production`, and `FRONTEND_ORIGIN` in Render Environment. `FRONTEND_ORIGIN` must be the exact origin of the deployed frontend, without a trailing path. Multiple origins can be comma-separated.
4. Deploy and check `https://YOUR-SERVICE.onrender.com/api/health`.
5. Update `frontend/js/runtime-config.js`: set `API_BASE_URL` to `https://YOUR-SERVICE.onrender.com/api`. Keep `/api`.
6. Redeploy/republish frontend and test login, signup, creating a doubt, replies, voting, profile update, leaderboard, and notifications.

## API testing
Import `postman/Studnt-Phase2.postman_collection.json` into Postman. Set `baseUrl` to the local or Render URL. Run health, register/login, protected endpoint, doubts, profile, leaderboard, events and notifications. Store the JWT returned from register/login in collection variable `token` (or use the collection's test script if enabled). Record actual responses for evaluation; do not claim a test passed without running it.

## Important
- Never commit `.env` or share MongoDB credentials/JWT secrets. If a real secret was previously pushed or shared, rotate it.
- Render free services may sleep when idle, so the first request may be slow.
- Deployment and live database verification require access to your GitHub, Render, and MongoDB Atlas accounts; these cannot be completed from the project ZIP alone.
