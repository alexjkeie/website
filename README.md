# Nova Studio (local)

Simple static site with a minimal Express backend for local development.

Run locally:

```bash
cd website
npm install
npm start
# open http://localhost:3000
```

Endpoints:
- `GET /api/status` — returns server status
- `POST /api/contact` — accepts JSON {name,email,message}
