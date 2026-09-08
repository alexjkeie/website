const express = require('express');
const path = require('path');

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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
