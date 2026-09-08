const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    time: new Date().toISOString(),
    app: 'LEGIO',
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/api/feature-flags', (req, res) => {
  res.json({
    windowsInstaller: true,
    androidAPK: true,
    mobileReady: true,
    premiumMode: true,
    glassUI: true
  });
});

app.get('/api/featured', (req, res) => {
  res.json({
    product: 'LEGIO',
    versions: ['Windows', 'Android'],
    update: 'stable',
    uptime: '99.9%'
  });
});

app.post('/api/contact', (req, res) => {
  const { name, email, message } = req.body || {};
  console.log('Contact received:', { name, email, message });

  if (!email || !message) {
    return res.json({ ok: false, error: 'missing fields' });
  }

  res.json({ ok: true, message: 'Thanks — message received.' });
});

// Simple file-backed storage for requests and admin
const DATA_DIR = path.join(__dirname, 'data');
const ADMIN_FILE = path.join(DATA_DIR, 'admin.json');
const REQUESTS_FILE = path.join(DATA_DIR, 'requests.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');
const POSTS_FILE = path.join(DATA_DIR, 'posts.json');
const NOTES_FILE = path.join(DATA_DIR, 'notes.json');

function ensureDataFiles() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

  if (!fs.existsSync(REQUESTS_FILE)) fs.writeFileSync(REQUESTS_FILE, JSON.stringify([]));
  if (!fs.existsSync(SESSIONS_FILE)) fs.writeFileSync(SESSIONS_FILE, JSON.stringify([]));
  if (!fs.existsSync(POSTS_FILE)) fs.writeFileSync(POSTS_FILE, JSON.stringify([]));
  if (!fs.existsSync(NOTES_FILE)) fs.writeFileSync(NOTES_FILE, JSON.stringify([]));

  if (!fs.existsSync(ADMIN_FILE)) {
    // create default admin from env or fallback to provided default
    const adminUser = process.env.ADMIN_USER || 'sage';
    const adminPass = process.env.ADMIN_PASS || 'audia81989';
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(adminPass, salt, 100000, 32, 'sha256').toString('hex');
    const admin = { user: adminUser, salt, hash };
    fs.writeFileSync(ADMIN_FILE, JSON.stringify(admin, null, 2));
    console.log('Created default admin user');
  }
}

function readJSON(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8') || 'null') || null; }
  catch (e) { return null; }
}

function writeJSON(file, obj) {
  fs.writeFileSync(file, JSON.stringify(obj, null, 2));
}

ensureDataFiles();

// Admin login
app.post('/api/admin/login', (req, res) => {
  const { user, pass } = req.body || {};
  const admin = readJSON(ADMIN_FILE);
  if (!admin) return res.json({ ok: false, error: 'no-admin' });
  if (user !== admin.user) return res.json({ ok: false, error: 'invalid' });
  const testHash = crypto.pbkdf2Sync(pass || '', admin.salt, 100000, 32, 'sha256').toString('hex');
  if (testHash !== admin.hash) return res.json({ ok: false, error: 'invalid' });

  const token = crypto.randomBytes(24).toString('hex');
  const sessions = readJSON(SESSIONS_FILE) || [];
  sessions.push({ token, user: admin.user, createdAt: Date.now() });
  writeJSON(SESSIONS_FILE, sessions);
  return res.json({ ok: true, token });
});

app.post('/api/admin/announce', requireAdminToken, (req, res) => {
  const { text } = req.body || {};
  if (!text) return res.json({ ok: false, error: 'missing' });
  const posts = readJSON(POSTS_FILE) || [];
  const post = { id: crypto.randomBytes(6).toString('hex'), authorId: 'admin', author: 'Administrator', text, createdAt: Date.now(), admin: true };
  posts.unshift(post);
  writeJSON(POSTS_FILE, posts);
  return res.json({ ok: true, post });
});
function requireAdminToken(req, res, next) {
  const token = req.headers['x-admin-token'] || req.body.token || req.query.token;
  if (!token) return res.status(403).json({ ok: false, error: 'no-token' });
  const sessions = readJSON(SESSIONS_FILE) || [];
  const found = sessions.find((s) => s.token === token);
  if (!found) return res.status(403).json({ ok: false, error: 'invalid-token' });
  req.admin = found.user;
  next();
}

// User requests entry — added to pending list
app.post('/api/request-access', (req, res) => {
  const { name, code } = req.body || {};
  if (!name) return res.json({ ok: false, error: 'missing_name' });
  const requests = readJSON(REQUESTS_FILE) || [];
  const id = crypto.randomBytes(8).toString('hex');
  const item = { id, name, code: code || '', status: 'pending', createdAt: Date.now() };
  requests.push(item);
  writeJSON(REQUESTS_FILE, requests);
  return res.json({ ok: true, id });
});

app.get('/api/entry-status', (req, res) => {
  const { id } = req.query || {};
  if (!id) return res.json({ ok: false, error: 'missing_id' });
  const requests = readJSON(REQUESTS_FILE) || [];
  const item = requests.find((r) => r.id === id);
  if (!item) return res.json({ ok: false, error: 'not_found' });
  return res.json({ ok: true, status: item.status });
});

// Admin endpoints to list and approve/reject
app.get('/api/admin/requests', requireAdminToken, (req, res) => {
  const requests = readJSON(REQUESTS_FILE) || [];
  return res.json({ ok: true, requests });
});

app.post('/api/admin/approve', requireAdminToken, (req, res) => {
  const { id } = req.body || {};
  if (!id) return res.json({ ok: false, error: 'missing_id' });
  const requests = readJSON(REQUESTS_FILE) || [];
  const idx = requests.findIndex((r) => r.id === id);
  if (idx === -1) return res.json({ ok: false, error: 'not_found' });
  requests[idx].status = 'approved';
  requests[idx].processedAt = Date.now();
  // generate access token for approved request
  const accessToken = crypto.randomBytes(20).toString('hex');
  requests[idx].accessToken = accessToken;
  requests[idx].accessExpires = Date.now() + 1000 * 60 * 60 * 24; // 24h
  writeJSON(REQUESTS_FILE, requests);
  return res.json({ ok: true });
});

app.post('/api/admin/reject', requireAdminToken, (req, res) => {
  const { id } = req.body || {};
  if (!id) return res.json({ ok: false, error: 'missing_id' });
  const requests = readJSON(REQUESTS_FILE) || [];
  const idx = requests.findIndex((r) => r.id === id);
  if (idx === -1) return res.json({ ok: false, error: 'not_found' });
  requests[idx].status = 'rejected';
  requests[idx].processedAt = Date.now();
  writeJSON(REQUESTS_FILE, requests);
  return res.json({ ok: true });
});

// Provide access token for an approved request
app.get('/api/access-token', (req, res) => {
  const { id } = req.query || {};
  if (!id) return res.json({ ok: false, error: 'missing_id' });
  const requests = readJSON(REQUESTS_FILE) || [];
  const item = requests.find((r) => r.id === id);
  if (!item) return res.json({ ok: false, error: 'not_found' });
  if (item.status !== 'approved' || !item.accessToken) return res.json({ ok: false, error: 'not_approved' });
  if (item.accessExpires && Date.now() > item.accessExpires) return res.json({ ok: false, error: 'expired' });
  return res.json({ ok: true, token: item.accessToken, expires: item.accessExpires });
});

function validateAccessToken(id, token) {
  if (!id || !token) return null;
  const requests = readJSON(REQUESTS_FILE) || [];
  const item = requests.find((r) => r.id === id && r.accessToken === token && r.status === 'approved');
  if (!item) return null;
  if (item.accessExpires && Date.now() > item.accessExpires) return null;
  return item;
}

// Validate access token for secret page
app.get('/api/validate-access', (req, res) => {
  const { id, token } = req.query || {};
  if (!id || !token) return res.json({ ok: false, error: 'missing' });
  const requests = readJSON(REQUESTS_FILE) || [];
  const item = requests.find((r) => r.id === id && r.accessToken === token);
  if (!item) return res.json({ ok: false, error: 'invalid' });
  if (item.accessExpires && Date.now() > item.accessExpires) return res.json({ ok: false, error: 'expired' });
  return res.json({ ok: true, id: item.id, name: item.name });
});

// Member features: posts and notes
app.post('/api/member/post', (req, res) => {
  const { id, token, text } = req.body || {};
  if (!text) return res.json({ ok: false, error: 'missing_text' });
  const user = validateAccessToken(id, token);
  if (!user) return res.json({ ok: false, error: 'invalid' });
  const posts = readJSON(POSTS_FILE) || [];
  const postId = crypto.randomBytes(6).toString('hex');
  const post = { id: postId, authorId: user.id, author: user.name, text, createdAt: Date.now(), admin: false };
  posts.unshift(post);
  writeJSON(POSTS_FILE, posts);
  return res.json({ ok: true, post });
});

app.get('/api/member/posts', (req, res) => {
  const { id, token } = req.query || {};
  const user = validateAccessToken(id, token);
  if (!user) return res.json({ ok: false, error: 'invalid' });
  const posts = readJSON(POSTS_FILE) || [];
  return res.json({ ok: true, posts });
});

app.post('/api/member/note', (req, res) => {
  const { id, token, note } = req.body || {};
  if (!note) return res.json({ ok: false, error: 'missing_note' });
  const user = validateAccessToken(id, token);
  if (!user) return res.json({ ok: false, error: 'invalid' });
  const notes = readJSON(NOTES_FILE) || [];
  const noteObj = { id: crypto.randomBytes(6).toString('hex'), ownerId: user.id, owner: user.name, note, createdAt: Date.now() };
  notes.unshift(noteObj);
  writeJSON(NOTES_FILE, notes);
  return res.json({ ok: true, note: noteObj });
});

app.get('/api/member/notes', (req, res) => {
  const { id, token } = req.query || {};
  const user = validateAccessToken(id, token);
  if (!user) return res.json({ ok: false, error: 'invalid' });
  const notes = readJSON(NOTES_FILE) || [];
  const mine = notes.filter(n => n.ownerId === user.id);
  return res.json({ ok: true, notes: mine });
});

// members list for approved users
app.get('/api/members', (req, res) => {
  const { id, token } = req.query || {};
  const user = validateAccessToken(id, token);
  if (!user) return res.json({ ok: false, error: 'invalid' });
  const requests = readJSON(REQUESTS_FILE) || [];
  const members = requests.filter(r => r.status === 'approved').map(r => ({ id: r.id, name: r.name }));
  return res.json({ ok: true, members });
});

// Admin: export requests
app.get('/api/admin/export', requireAdminToken, (req, res) => {
  const requests = readJSON(REQUESTS_FILE) || [];
  res.json({ ok: true, requests });
});

// Admin: revoke access token
app.post('/api/admin/revoke', requireAdminToken, (req, res) => {
  const { id } = req.body || {};
  if (!id) return res.json({ ok: false, error: 'missing_id' });
  const requests = readJSON(REQUESTS_FILE) || [];
  const idx = requests.findIndex((r) => r.id === id);
  if (idx === -1) return res.json({ ok: false, error: 'not_found' });
  delete requests[idx].accessToken;
  delete requests[idx].accessExpires;
  requests[idx].status = 'revoked';
  writeJSON(REQUESTS_FILE, requests);
  return res.json({ ok: true });
});

// Admin: change password
app.post('/api/admin/change-pass', requireAdminToken, (req, res) => {
  const { oldPass, newPass } = req.body || {};
  if (!oldPass || !newPass) return res.json({ ok: false, error: 'missing' });
  const admin = readJSON(ADMIN_FILE);
  if (!admin) return res.json({ ok: false, error: 'no-admin' });
  const testHash = crypto.pbkdf2Sync(oldPass, admin.salt, 100000, 32, 'sha256').toString('hex');
  if (testHash !== admin.hash) return res.json({ ok: false, error: 'invalid' });
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(newPass, salt, 100000, 32, 'sha256').toString('hex');
  const newAdmin = { user: admin.user, salt, hash };
  writeJSON(ADMIN_FILE, newAdmin);
  return res.json({ ok: true });
});

// Admin: list posts
app.get('/api/admin/posts', requireAdminToken, (req, res) => {
  const posts = readJSON(POSTS_FILE) || [];
  return res.json({ ok: true, posts });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
