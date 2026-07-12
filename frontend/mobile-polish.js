
/* NAXORA Institute OS — Part 36 Mobile Responsive Polish */
(function () {
  const MOBILE_MAX = 900;
  const currentFile = (location.pathname.split('/').pop() || 'index.html').toLowerCase();

  function pageLabel() {
    const title = document.querySelector('.topbar h1')?.textContent?.trim();
    if (title) return title;
    if (currentFile === 'index.html') return 'Login / Signup';
    return currentFile.replace('.html', '').replace(/-/g, ' ').replace(/\b\w/g, s => s.toUpperCase());
  }

  function closeMenu() {
    document.body.classList.remove('mobile-menu-open');
    document.querySelector('.mobile-menu-btn')?.setAttribute('aria-expanded', 'false');
  }

  function openMenu() {
    document.body.classList.add('mobile-menu-open');
    document.querySelector('.mobile-menu-btn')?.setAttribute('aria-expanded', 'true');
  }

  function toggleMenu() {
    document.body.classList.contains('mobile-menu-open') ? closeMenu() : openMenu();
  }

  function ensureMobileShell() {
    const sidebar = document.querySelector('.sidebar');
    if (!document.body.classList.contains('dashboard-body') || !sidebar) return;
    if (document.querySelector('.mobile-topbar')) return;

    const topbar = document.createElement('div');
    topbar.className = 'mobile-topbar';
    topbar.innerHTML = `
      <button class="mobile-menu-btn" type="button" aria-label="Open menu" aria-expanded="false">☰</button>
      <div class="mobile-title"><strong>NAXORA OS</strong><span>${pageLabel()}</span></div>
      <div class="mobile-mini-pill">Part 36</div>
    `;

    const overlay = document.createElement('div');
    overlay.className = 'mobile-sidebar-overlay';
    overlay.setAttribute('aria-hidden', 'true');

    const bottom = document.createElement('nav');
    bottom.className = 'mobile-bottom-nav';
    const items = [
      ['dashboard.html', '🏠', 'Home'],
      ['students.html', '🎓', 'Students'],
      ['fees.html', '💰', 'Fees'],
      ['enquiries.html', '📞', 'Leads'],
      ['reports.html', '📊', 'Reports'],
    ];
    bottom.innerHTML = items.map(([href, icon, label]) => {
      const active = currentFile === href || (currentFile === '' && href === 'dashboard.html') ? ' active' : '';
      return `<a class="${active}" href="${href}"><span>${icon}</span>${label}</a>`;
    }).join('');

    document.body.prepend(overlay);
    document.body.prepend(topbar);
    document.body.appendChild(bottom);

    topbar.querySelector('.mobile-menu-btn').addEventListener('click', toggleMenu);
    overlay.addEventListener('click', closeMenu);
    sidebar.addEventListener('click', (event) => {
      const link = event.target.closest('a');
      if (link && window.innerWidth <= MOBILE_MAX) closeMenu();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeMenu();
    });

    // Swipe left to close sidebar on phones.
    let startX = 0;
    sidebar.addEventListener('touchstart', (event) => { startX = event.touches[0]?.clientX || 0; }, { passive: true });
    sidebar.addEventListener('touchmove', (event) => {
      const x = event.touches[0]?.clientX || 0;
      if (startX && startX - x > 70 && window.innerWidth <= MOBILE_MAX) closeMenu();
    }, { passive: true });
  }

  function markActiveSidebarLink() {
    document.querySelectorAll('.sidebar nav a').forEach((a) => {
      const href = (a.getAttribute('href') || '').split('#')[0].toLowerCase();
      if (href && href === currentFile) a.classList.add('active');
    });
  }

  function improveWideBlocks() {
    document.querySelectorAll('table').forEach((table) => {
      if (table.parentElement?.classList.contains('mobile-table-wrap')) return;
      const wrap = document.createElement('div');
      wrap.className = 'mobile-table-wrap';
      table.parentNode.insertBefore(wrap, table);
      wrap.appendChild(table);
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    ensureMobileShell();
    markActiveSidebarLink();
    improveWideBlocks();
    window.addEventListener('resize', () => {
      if (window.innerWidth > MOBILE_MAX) closeMenu();
    });
  });
})();
