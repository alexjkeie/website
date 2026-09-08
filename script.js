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
});
