document.addEventListener('DOMContentLoaded', function () {
  const navLinks = document.querySelectorAll('.nav-links a');
  navLinks.forEach((link) => {
    if (location.pathname.endsWith(link.getAttribute('href')) || link.getAttribute('href') === location.pathname.split('/').pop()) {
      link.classList.add('active');
    }

    link.addEventListener('click', () => {
      navLinks.forEach((item) => item.classList.remove('active'));
      link.classList.add('active');
      const nav = document.querySelector('.nav-links');
      const toggle = document.querySelector('.nav-toggle');
      if (nav && nav.classList.contains('open')) {
        nav.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  });

  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.nav-links');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(isOpen));
    });
  }

  const form = document.getElementById('contactForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form));
      const statusEl = document.getElementById('formStatus');
      statusEl.textContent = 'sending...';
      try {
        const res = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        const body = await res.json();
        if (body.ok) statusEl.textContent = 'Thanks — message sent.';
        else statusEl.textContent = 'Error sending message.';
      } catch (err) {
        statusEl.textContent = 'Network error.';
      }
    });
  }

  const serverStatus = document.getElementById('serverStatus');
  if (serverStatus) {
    fetch('/api/status')
      .then((r) => r.json())
      .then((j) => {
        serverStatus.textContent = JSON.stringify(j, null, 2);
      })
      .catch(() => {
        serverStatus.textContent = 'offline';
      });
  }

  const cards = document.querySelectorAll('.feature-card, .stat-card, .download-card, .stack-card');
  cards.forEach((card, index) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(18px)';
    card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';

    setTimeout(() => {
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    }, 120 * index + 150);
  });

  // Admin login and panel handlers
  const adminForm = document.getElementById('adminLoginForm');
  async function fetchRequestsList() {
    const listEl = document.getElementById('requestsList');
    if (!listEl) return;
    const token = localStorage.getItem('lpsec_admin_token');
    if (!token) { listEl.textContent = 'Autentificați-vă pentru a vedea cererile.'; return; }
    try {
      const res = await fetch('/api/admin/requests', { headers: { 'x-admin-token': token } });
      const j = await res.json();
      if (!j.ok) { listEl.textContent = 'Eroare la preluare.'; return; }
      if (!j.requests.length) { listEl.textContent = 'Nu există solicitări.'; return; }
      listEl.innerHTML = '';
      j.requests.forEach(r => {
        const row = document.createElement('div');
        row.className = 'request-row';
        row.innerHTML = `<strong>${r.name}</strong> — <em>${r.status}</em> <button data-id="${r.id}" class="approve">Aprobă</button> <button data-id="${r.id}" class="reject">Respinge</button>`;
        listEl.appendChild(row);
      });
      // wire buttons
      listEl.querySelectorAll('button.approve').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-id');
          await fetch('/api/admin/approve', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-token': localStorage.getItem('lpsec_admin_token') }, body: JSON.stringify({ id }) });
          fetchRequestsList();
        });
      });
      listEl.querySelectorAll('button.reject').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-id');
          await fetch('/api/admin/reject', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-token': localStorage.getItem('lpsec_admin_token') }, body: JSON.stringify({ id }) });
          fetchRequestsList();
        });
      });
    } catch (e) { listEl.textContent = 'Eroare rețea.'; }
  }

  if (adminForm) {
    adminForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(adminForm));
      const res = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const j = await res.json();
      if (j.ok && j.token) {
        localStorage.setItem('lpsec_admin_token', j.token);
        // redirect to modern dashboard
        location.href = 'admin-dashboard.html';
      } else {
        alert('Eroare autentificare');
      }
    });
    // try to fetch if token exists
    if (localStorage.getItem('lpsec_admin_token')) {
      // if on admin.html redirect to dashboard
      if (location.pathname.endsWith('admin.html')) location.href = 'admin-dashboard.html';
      else fetchRequestsList();
    }
  }

  // Request access form
  const requestForm = document.getElementById('requestForm');
  if (requestForm) {
    requestForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(requestForm));
      const statusEl = document.getElementById('requestStatus');
      statusEl.textContent = 'Trimitere…';
      try {
        const res = await fetch('/api/request-access', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        const j = await res.json();
        if (j.ok && j.id) {
          statusEl.textContent = 'Cererea trimisă. Redirecționare…';
          location.href = 'waiting.html?id=' + encodeURIComponent(j.id);
        } else {
          statusEl.textContent = 'Eroare trimitere.';
        }
      } catch (e) { statusEl.textContent = 'Eroare rețea.'; }
    });
  }
});
