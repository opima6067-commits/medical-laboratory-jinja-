/* ==========================================================================
   app.js - hash router, role-based application shell and the shared login.

   Routing uses URL hashes (#/student/dashboard) so the site works on
   Cloudflare Pages (or any static host) without redirect rules.
   Role checks here only control what the UI shows. They are NOT security:
   the real backend must enforce permissions (see docs/backend-roadmap.md).
   ========================================================================== */
(function () {
  'use strict';
  var MLS = window.MLS, UI = MLS.UI, Store = MLS.Store, Auth = MLS.Auth, Q = UI.Q, esc = UI.esc, icon = UI.icon;
  var routes = {}, lastRouteKey = null;

  var ROLE_LABEL = { student: 'Student', tutor: 'Tutor', registrar: 'Registrar', admin: 'Admin' };
  var NOTIF_PAGE = { student: 'notifications', tutor: 'notifications', registrar: 'announcements', admin: 'announcements' };
  var NAV = {
    student: [
      { page: 'dashboard', label: 'Dashboard', icon: 'home' }, { page: 'courses', label: 'My Courses', icon: 'book' },
      { page: 'leaderboard', label: 'Quizzes & Leaderboard', icon: 'trophy' },
      { page: 'materials', label: 'Learning Materials', icon: 'file' }, { page: 'notes', label: 'Notes and Resources', icon: 'layers' },
      { page: 'exams', label: 'Examinations', icon: 'calendar' }, { page: 'results', label: 'Examination Results', icon: 'award' },
      { page: 'notifications', label: 'Notifications', icon: 'bell', badge: true }, { page: 'profile', label: 'Student Profile', icon: 'user' },
      { page: 'help', label: 'Help and Support', icon: 'help' }
    ],
    tutor: [
      { page: 'dashboard', label: 'Dashboard', icon: 'home' }, { page: 'courses', label: 'My Assigned Courses', icon: 'book' },
      { page: 'leaderboard', label: 'Quizzes & Leaderboard', icon: 'trophy' },
      { page: 'upload', label: 'Upload Materials', icon: 'upload' }, { page: 'manage', label: 'Manage Materials', icon: 'file' },
      { page: 'exams', label: 'Examination Information', icon: 'calendar' }, { page: 'notifications', label: 'Notifications', icon: 'bell', badge: true },
      { page: 'profile', label: 'Tutor Profile', icon: 'user' }
    ],
    registrar: [
      { page: 'dashboard', label: 'Dashboard', icon: 'home' },
      { group: 'People' }, { page: 'students', label: 'Students', icon: 'cap' }, { page: 'tutors', label: 'Tutors', icon: 'users' },
      { group: 'Academics' }, { page: 'programmes', label: 'Programmes', icon: 'layers' }, { page: 'courses', label: 'Courses', icon: 'book' }, { page: 'periods', label: 'Academic Periods', icon: 'clock' },
      { group: 'Examinations' }, { page: 'exams', label: 'Examinations', icon: 'calendar' }, { page: 'results', label: 'Results Management', icon: 'award' }, { page: 'import', label: 'Excel Results Import', icon: 'upload' },
      { group: 'Prizes & Challenges' }, { page: 'leaderboard', label: 'Quizzes & Disbursals', icon: 'trophy' },
      { group: 'Content and communication' }, { page: 'materials', label: 'Learning Materials', icon: 'file' }, { page: 'announcements', label: 'Announcements', icon: 'megaphone', badge: true },
      { group: 'System' }, { page: 'reports', label: 'Reports', icon: 'chart' }, { page: 'settings', label: 'System Settings', icon: 'settings' }
    ],
    admin: [
      { page: 'dashboard', label: 'Dashboard', icon: 'home' },
      { group: 'People' }, { page: 'users', label: 'Users & Roles', icon: 'users' }, { page: 'students', label: 'Students', icon: 'cap' }, { page: 'tutors', label: 'Tutors', icon: 'users' },
      { group: 'Academics' }, { page: 'programmes', label: 'Programmes', icon: 'layers' }, { page: 'courses', label: 'Courses', icon: 'book' }, { page: 'periods', label: 'Academic Periods', icon: 'clock' },
      { group: 'Prizes & Challenges' }, { page: 'leaderboard', label: 'Quizzes & Disbursals', icon: 'trophy' },
      { group: 'System' }, { page: 'settings', label: 'System Settings', icon: 'settings' }, { page: 'announcements', label: 'Announcements', icon: 'megaphone', badge: true }
    ]
  };

  /** Register a page. def: { title, nav (sidebar page to highlight), crumbs(param), render(param, user) -> html } */
  function defineRoute(role, page, def) { routes[role + '/' + page] = def; }
  function go(path) { location.hash = '#/' + path; }
  function redirect(path) { history.replaceState(null, '', '#/' + path); render(); }
  function pageHead(title, sub, actions) {
    return '<div class="page-head"><div><h1 id="page-title" tabindex="-1">' + esc(title) + '</h1>' + (sub ? '<p>' + sub + '</p>' : '') + '</div>' + (actions ? '<div class="page-actions">' + actions + '</div>' : '') + '</div>';
  }
  function statCard(ic, value, label, href) {
    var inner = '<div class="stat-ic">' + icon(ic) + '</div><div><div class="stat-val">' + esc(value) + '</div><div class="stat-label">' + esc(label) + '</div></div>';
    return href ? '<a class="card stat" href="' + href + '" style="text-decoration:none;color:inherit">' + inner + '</a>' : '<div class="card stat">' + inner + '</div>';
  }

  var BOTTOM_NAV = {
    student: [
      { page: 'dashboard', label: 'Dashboard', icon: 'home' },
      { page: 'courses', label: 'Courses', icon: 'book' },
      { page: 'leaderboard', label: 'Quizzes', icon: 'trophy' },
      { page: 'exams', label: 'Exams', icon: 'calendar' },
      { page: 'results', label: 'Results', icon: 'award' },
      { page: 'notifications', label: 'Alerts', icon: 'bell', badge: true }
    ],
    tutor: [
      { page: 'dashboard', label: 'Dashboard', icon: 'home' },
      { page: 'courses', label: 'Courses', icon: 'book' },
      { page: 'leaderboard', label: 'Quizzes', icon: 'trophy' },
      { page: 'manage', label: 'Materials', icon: 'file' },
      { page: 'exams', label: 'Exams', icon: 'calendar' },
      { page: 'notifications', label: 'Alerts', icon: 'bell', badge: true }
    ],
    registrar: [
      { page: 'dashboard', label: 'Dashboard', icon: 'home' },
      { page: 'students', label: 'Students', icon: 'cap' },
      { page: 'leaderboard', label: 'Quizzes', icon: 'trophy' },
      { page: 'results', label: 'Results', icon: 'award' },
      { page: 'import', label: 'Import', icon: 'upload' },
      { page: 'announcements', label: 'News', icon: 'megaphone', badge: true }
    ],
    admin: [
      { page: 'dashboard', label: 'Dashboard', icon: 'home' },
      { page: 'users', label: 'Users', icon: 'users' },
      { page: 'leaderboard', label: 'Quizzes', icon: 'trophy' },
      { page: 'courses', label: 'Courses', icon: 'book' },
      { page: 'settings', label: 'Settings', icon: 'settings' },
      { page: 'announcements', label: 'News', icon: 'megaphone', badge: true }
    ]
  };

  /* ---------- shell ---------- */
  function shell(user, navPage, title, crumbs, content) {
    var items = NAV[user.role], unread = Q.unread(user), base = '#/' + user.role + '/';
    var nav = items.map(function (it) {
      if (it.group) return '<div class="nav-group">' + esc(it.group) + '</div>';
      var cur = it.page === navPage ? ' aria-current="page"' : '';
      return '<a class="nav-link" href="' + base + it.page + '"' + cur + '>' + icon(it.icon) + '<span>' + esc(it.label) + '</span>' +
        (it.badge && unread ? '<span class="count" aria-label="' + unread + ' unread">' + unread + '</span>' : '') + '</a>';
    }).join('');
    var p = Store.activePeriod();
    var crumbHtml = crumbs.map(function (c, i) { return c[1] && i < crumbs.length - 1 ? '<a href="' + c[1] + '">' + esc(c[0]) + '</a>' : '<span' + (i === crumbs.length - 1 ? ' aria-current="page"' : '') + '>' + esc(c[0]) + '</span>'; }).join(' / ');
    var helpItem = user.role === 'student' ? '<a class="menu-item" href="' + base + 'help">' + icon('help') + 'Help & Support</a>' : '';
    var setItem = user.role === 'registrar' ? '<a class="menu-item" href="' + base + 'settings">' + icon('settings') + 'System Settings</a>' : '';

    var bTabs = (BOTTOM_NAV[user.role] || []).map(function (it) {
      var cur = it.page === navPage ? ' aria-current="page"' : '';
      return '<a class="bottom-tab-item mobile-tab-item" href="' + base + it.page + '"' + cur + '>' +
        icon(it.icon) + '<span>' + esc(it.label) + '</span>' +
        (it.badge && unread ? '<span class="tab-badge">' + unread + '</span>' : '') +
        '</a>';
    }).join('');
    var bottomNav = '<nav class="app-bottom-nav mobile-bottom-nav" aria-label="Portal bottom navigation"><div class="bottom-nav-tabs mobile-bottom-tabs">' + bTabs + '</div></nav>';

    var online = typeof navigator !== 'undefined' && 'onLine' in navigator ? navigator.onLine : true;
    var canInstall = window.MLS_PWA && window.MLS_PWA.canInstall && !window.MLS_PWA.isStandalone;

    return '<div class="app" id="app-root"><a class="skip-link" href="#main">Skip to main content</a>' +
      '<aside class="sidebar" id="sidebar" aria-label="Main navigation">' +
      '<a class="sidebar-brand" href="' + base + 'dashboard"><img src="assets/images/institution-logo-placeholder.svg" alt="Institution Crest"><div><strong>' + esc(Store.state.settings.institutionName) + '</strong><span>Academic Management Portal</span></div></a>' +
      '<div class="sidebar-role">' + icon('user') + '<span>Signed in as <strong>' + ROLE_LABEL[user.role] + '</strong></span></div>' +
      '<nav class="sidebar-nav" aria-label="' + ROLE_LABEL[user.role] + ' menu">' + nav + '</nav>' +
      '<div class="sidebar-foot"><span>' + icon('flask') + ' Clinical Academic MLS</span><button type="button" class="demo-chip" data-action="demoInfo" style="font-size:0.68rem">Demo Mode</button></div></aside>' +
      '<div class="sidebar-backdrop" data-action="closeNav"></div>' +
      '<div class="main"><header class="topbar">' +
      '<button type="button" class="btn btn-icon menu-toggle" data-action="toggleNav" aria-controls="sidebar" aria-expanded="false" aria-label="Open navigation menu">' + icon('menu') + '</button>' +
      '<div class="topbar-title"><div class="crumbs" aria-label="Breadcrumb">' + crumbHtml + '</div></div>' +
      '<div class="topbar-actions">' +
      '<button type="button" class="demo-chip" data-action="demoInfo" title="Click for environment details"><span style="width:6px;height:6px;border-radius:50%;background:#0284c7;display:inline-block"></span>Demo Mode</button>' +
      '<span class="topbar-period" title="Active academic period">' + icon('clock') + esc(p.year + ' - Sem ' + p.semester) + '</span>' +
      '<span class="status-pill ' + (online ? 'online' : 'offline') + '" id="network-status-pill" title="' + (online ? 'Connected to network' : 'Using cached offline records') + '"><span class="dot"></span>' + (online ? 'Online' : 'Offline') + '</span>' +
      '<button type="button" class="btn btn-sm btn-secondary" data-pwa-install data-action="installApp" id="header-pwa-install" style="' + (canInstall ? '' : 'display:none') + '" title="Install as standalone application">' + icon('download') + '<span>Install App</span></button>' +
      '<a class="btn btn-icon" href="' + base + NOTIF_PAGE[user.role] + '" aria-label="Notifications' + (unread ? ', ' + unread + ' unread' : '') + '">' + icon('bell') +
      (unread ? '<span class="count" style="background:#f59e0b;color:#fff;border-radius:999px;font-size:.7rem;font-weight:700;padding:1px 6px;margin-left:-8px;align-self:flex-start">' + unread + '</span>' : '') + '</a>' +
      '<div class="menu-wrap"><button type="button" class="btn btn-secondary" data-action="toggleMenu" aria-haspopup="true" aria-expanded="false" id="user-menu-btn"><span class="avatar" style="width:28px;height:28px;font-size:.75rem">' + esc(UI.initials(user.name)) + '</span><span class="sr-only">Account menu for </span>' + esc(user.name.split(' ')[0] === 'Dr.' || user.name.split(' ')[0] === 'Mr.' || user.name.split(' ')[0] === 'Ms.' ? user.name.split(' ').slice(0, 2).join(' ') : user.name.split(' ')[0]) + '</button>' +
      '<div class="menu" id="user-menu" hidden><div class="menu-head"><strong>' + esc(user.name) + '</strong><small>' + ROLE_LABEL[user.role] + ' &bull; Fictional Account</small></div>' +
      '<a class="menu-item" href="' + base + 'profile">' + icon('user') + 'My Profile</a>' + setItem + helpItem +
      '<button type="button" class="menu-item" data-pwa-install data-action="installApp" id="menu-pwa-install" style="' + (canInstall ? '' : 'display:none') + '">' + icon('download') + 'Install Standalone App</button>' +
      '<button type="button" class="menu-item" data-action="demoInfo">' + icon('info') + 'About Environment</button>' +
      '<button type="button" class="menu-item" data-action="logout" style="color:var(--red-600)">' + icon('logout') + 'Sign out</button></div></div></div></header>' +
      '<main class="content" id="main" tabindex="-1">' + content + '</main>' +
      '<footer class="app-footer"><div><strong>' + esc(Store.state.settings.institutionName) + '</strong> &bull; Standalone PWA Portal</div><div><button type="button" class="btn btn-ghost btn-sm" data-action="demoInfo">' + icon('info') + 'Environment Details</button></div></footer>' +
      bottomNav + '</div></div>';
  }

  /* ---------- login ---------- */
  function renderLogin() {
    var remembered = Store.remember.get();
    document.title = 'Sign in - ' + Store.state.settings.institutionName;
    document.getElementById('app').innerHTML =
      '<div class="login"><section class="login-brand" aria-label="About the portal"><div><img src="assets/images/institution-logo-placeholder.svg" alt="Institution Crest">' +
      '<h1>' + esc(Store.state.settings.institutionName) + '</h1><p>Integrated academic management portal for courses, curriculum materials, clinical laboratory timetables, and official examination results.</p></div>' +
      '<ul class="login-points"><li>' + icon('check') + '<span>Role-based dashboards for Students, Faculty Tutors, Registrars &amp; Administrators</span></li><li>' + icon('check') + '<span>Offline-ready progressive web application with fast standalone installation</span></li><li>' + icon('check') + '<span>Official examination results publishing workflow with strict validation</span></li></ul>' +
      '<div style="font-size:0.8rem;color:#94a3b8;display:flex;align-items:center;gap:8px">' + icon('flask') + '<span>Clinical Laboratory Information Architecture</span></div></section>' +
      '<section class="login-panel"><div class="login-card"><h2>Welcome back</h2><p class="muted">Sign in with your academic credentials or select a demonstration account below.</p>' +
      '<div id="login-error"></div>' +
      '<p id="role-label" class="small" style="font-weight:600;margin:16px 0 0;color:var(--navy-900)">Quick Demo Personas (Select to autofill):</p>' +
      '<div class="role-tiles" role="group" aria-labelledby="role-label">' +
      ['student', 'tutor', 'registrar', 'admin'].map(function (r) { return '<button type="button" class="role-tile" data-action="pickRole" data-role="' + r + '" aria-pressed="false">' + icon(r === 'student' ? 'cap' : r === 'tutor' ? 'users' : r === 'registrar' ? 'settings' : 'shield') + ROLE_LABEL[r] + '</button>'; }).join('') + '</div>' +
      '<form data-submit="login" novalidate>' +
      '<div class="stack" style="--g:14px">' + UI.field({ name: 'identifier', label: 'Email or username', type: 'text', required: true, value: remembered, autocomplete: 'username', placeholder: 'name@demo.mls.test' }) +
      '<div class="field"><label for="f_password">Password <span class="req" aria-hidden="true">*</span></label><div class="pw-wrap"><input id="f_password" name="password" type="password" required data-label="Password" autocomplete="current-password" aria-describedby="f_password_err">' +
      '<button type="button" class="pw-toggle" data-action="togglePw" aria-label="Show password" aria-pressed="false">' + icon('eye') + '</button></div><p class="field-error" id="f_password_err" role="alert"></p></div>' +
      '<div class="check"><input type="checkbox" id="remember" name="remember"' + (remembered ? ' checked' : '') + '><label for="remember" style="margin:0;font-weight:400;color:var(--muted)">Remember credentials on this device</label></div>' +
      '<button type="submit" class="btn btn-block" id="login-btn">Sign in to Portal</button></div></form>' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:14px;font-size:0.875rem"><a href="#/login" data-action="forgot">Forgot credentials?</a><button type="button" class="btn btn-ghost btn-sm" data-action="demoInfo">' + icon('info') + 'About Portal</button></div>' +
      '<div class="login-demo-notice">' + icon('info') + '<div><strong>Demonstration Mode:</strong> Select any persona above to automatically populate test credentials and experience the role-specific workspace.</div></div>' +
      '</div></section></div>';
  }

  /* ---------- rendering ---------- */
  function render() {
    var app = document.getElementById('app');
    var parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(function (s) { try { return decodeURIComponent(s); } catch (e) { return s; } });
    var user = Auth.current();
    if (Store.session.get() && !user) { Store.session.clear(); }
    if (!user) {
      if (parts[0] !== 'login') { history.replaceState(null, '', '#/login'); }
      lastRouteKey = 'login'; renderLogin(); return;
    }
    if (!parts.length || parts[0] === 'login') { redirect(user.role + '/dashboard'); return; }

    var role = parts[0], page = parts[1] || 'dashboard', param = parts.slice(2).join('/');
    var key = parts.join('/');
    if (key !== lastRouteKey) { UI.resetLists(); }
    var navigated = key !== lastRouteKey; lastRouteKey = key;

    var html, navPage = page, title, crumbs;
    if (role !== user.role) {
      title = 'Access restricted'; navPage = '';
      crumbs = [['Home', '#/' + user.role + '/dashboard'], [title]];
      html = pageHead('Access restricted') + UI.alertBox('error', '<strong>You do not have access to that area.</strong><br>You are signed in as ' + ROLE_LABEL[user.role] + '. This page belongs to a different role. In the real system, the server would reject this request regardless of the address typed.') +
        '<p style="margin-top:16px"><a class="btn" href="#/' + user.role + '/dashboard">Back to my dashboard</a></p>';
    } else if (!routes[role + '/' + page]) {
      title = 'Page not found'; navPage = '';
      crumbs = [['Home', '#/' + role + '/dashboard'], [title]];
      html = pageHead('Page not found') + UI.alertBox('warn', 'We could not find that page. Use the menu to continue, or return to your dashboard.') +
        '<p style="margin-top:16px"><a class="btn" href="#/' + role + '/dashboard">Go to dashboard</a></p>';
    } else {
      var def = routes[role + '/' + page];
      title = typeof def.title === 'function' ? def.title(param) : def.title;
      navPage = def.nav || page;
      crumbs = def.crumbs ? def.crumbs(param) : [['Home', '#/' + role + '/dashboard'], [title]];
      try { html = def.render(param, user); }
      catch (err) { console.error(err); html = pageHead('Something went wrong') + UI.alertBox('error', 'This page could not be displayed. Please go back and try again.'); }
    }
    document.title = title + ' - ' + Store.state.settings.institutionName;
    var scrollY = window.scrollY;
    app.innerHTML = shell(user, navPage, title, crumbs, html);
    if (navigated) { window.scrollTo(0, 0); var h = document.getElementById('page-title'); if (h) h.focus({ preventScroll: true }); }
    else window.scrollTo(0, scrollY);
  }
  function refresh() { render(); }

  /* ---------- global actions ---------- */
  function closeNav() {
    var r = document.getElementById('app-root'); if (!r) return; r.classList.remove('nav-open');
    var b = r.querySelector('.menu-toggle'); if (b) { b.setAttribute('aria-expanded', 'false'); }
  }
  function closeMenu() {
    var m = document.getElementById('user-menu'); if (!m || m.hidden) return;
    m.hidden = true; var b = document.getElementById('user-menu-btn'); if (b) b.setAttribute('aria-expanded', 'false');
  }
  UI.register({
    toggleNav: function (d, el) { var r = document.getElementById('app-root'); var open = r.classList.toggle('nav-open'); el.setAttribute('aria-expanded', open ? 'true' : 'false'); if (open) { var l = r.querySelector('.nav-link'); if (l) l.focus(); } },
    closeNav: closeNav,
    toggleMenu: function (d, el) { var m = document.getElementById('user-menu'); m.hidden = !m.hidden; el.setAttribute('aria-expanded', m.hidden ? 'false' : 'true'); },
    logout: function () { Auth.logout(); closeMenu(); redirect('login'); },
    pickRole: function (d) {
      var u = Store.state.users.find(function (x) { return x.role === d.role; });
      document.querySelectorAll('.role-tile').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.role === d.role ? 'true' : 'false'); });
      var f = document.querySelector('form[data-submit="login"]');
      f.elements.identifier.value = u.email; f.elements.password.value = u.password;
      UI.setFieldError(f, 'identifier', ''); UI.setFieldError(f, 'password', '');
      document.getElementById('login-error').innerHTML = '';
    },
    togglePw: function (d, el) {
      var i = document.getElementById('f_password'), show = i.type === 'password';
      i.type = show ? 'text' : 'password'; el.setAttribute('aria-pressed', show ? 'true' : 'false'); el.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
      el.innerHTML = icon(show ? 'lock' : 'eye');
    },
    forgot: function (d, el, e) {
      e.preventDefault();
      UI.Modal.open({ title: 'Password help', body: '<p>This is a demonstration, so there is no password reset. Use the demo account buttons on the sign-in page to fill in the fictional credentials.</p><p class="muted">In the real system, password recovery will be handled by the institution\'s authentication service.</p>' });
    },
    login: function (d, form) {
      var res = UI.collect(form, { identifier: function (v) { return v.length < 3 ? 'Enter your email or username.' : ''; } });
      var errBox = document.getElementById('login-error'); errBox.innerHTML = '';
      if (!res.ok) { errBox.innerHTML = UI.alertBox('error', 'Please fix the highlighted fields and try again.'); return; }
      var btn = document.getElementById('login-btn'); btn.disabled = true; btn.innerHTML = '<span class="spinner" aria-hidden="true"></span> Signing in...';
      setTimeout(function () {
        var r = Auth.login(res.values.identifier, form.elements.password.value);
        if (!r.ok) { btn.disabled = false; btn.textContent = 'Sign in'; errBox.innerHTML = UI.alertBox('error', esc(r.error)); return; }
        Store.remember.set(form.elements.remember.checked ? res.values.identifier : '');
        redirect(r.user.role + '/dashboard');
      }, 500);
    },
    installApp: function () {
      if (window.MLS_PWA && window.MLS_PWA.promptInstall) {
        window.MLS_PWA.promptInstall();
      }
    },
    demoInfo: function () {
      var content =
        '<div style="font-size:0.92rem;color:var(--text);line-height:1.6">' +
        '<p><strong>' + esc(Store.state.settings.institutionName) + '</strong> is configured in an interactive demonstration &amp; academic evaluation environment.</p>' +
        '<div class="pwa-step-box" style="margin:14px 0">' +
        '<span class="pwa-step-num" style="background:var(--blue-600)">1</span>' +
        '<div><strong>PWA Standalone &amp; Offline Ready:</strong> The entire portal (curriculum, timetables, and grading rules) is cached locally and works seamlessly even when disconnected from the internet.</div>' +
        '</div>' +
        '<div class="pwa-step-box" style="margin-bottom:14px">' +
        '<span class="pwa-step-num" style="background:var(--green-600)">2</span>' +
        '<div><strong>Multi-Role Workspaces:</strong> You can switch instantly between Student, Faculty Tutor, Registrar, and Administrator personas using the Sign In page.</div>' +
        '</div>' +
        '<div class="pwa-step-box" style="margin-bottom:16px">' +
        '<span class="pwa-step-num" style="background:var(--navy-800)">3</span>' +
        '<div><strong>Production Architecture:</strong> Fully prepared for backend REST/GraphQL API integration with PostgreSQL database (see <code>docs/backend-roadmap.md</code>).</div>' +
        '</div>' +
        '<p class="muted small" style="margin:0">All fictional data created or modified is preserved in your device\'s local storage.</p>' +
        '</div>';
      UI.dialog('Demonstration Portal Details', content, '<button type="button" class="btn" data-action="closeDlg">Got it</button>');
    }
  });
  function adminTable(title, cols, rows) {
    var headings = cols.map(function (c) { return '<th>' + esc(c) + '</th>'; }).join('');
    var body = rows.map(function (row) { return '<tr>' + row.map(function (cell) { return '<td>' + esc(cell) + '</td>'; }).join('') + '</tr>'; }).join('');
    return '<div class="card" style="padding:0;overflow:hidden;margin-top:16px"><div style="padding:16px 20px;border-bottom:1px solid var(--border, #dfe5ec)"><strong>' + esc(title) + '</strong></div><div style="overflow:auto"><table style="width:100%;border-collapse:collapse;min-width:420px"><thead><tr>' + headings + '</tr></thead><tbody>' + body + '</tbody></table></div></div>';
  }

  defineRoute('admin', 'dashboard', {
    title: 'Admin Dashboard',
    render: function () {
      var students = Store.state.students.length, tutors = Store.state.tutors.length, courses = Store.state.courses.length, programmes = Store.state.programmes.length;
      var cards = [
        { ic: 'cap', value: students, label: 'Students', href: '#/admin/students' },
        { ic: 'users', value: tutors, label: 'Tutors', href: '#/admin/tutors' },
        { ic: 'book', value: courses, label: 'Courses', href: '#/admin/courses' },
        { ic: 'layers', value: programmes, label: 'Programmes', href: '#/admin/programmes' }
      ];
      var grid = cards.map(function (c) { return '<a class="card stat" href="' + c.href + '" style="text-decoration:none;color:inherit"><div class="stat-ic">' + icon(c.ic) + '</div><div><div class="stat-val">' + esc(c.value) + '</div><div class="stat-label">' + esc(c.label) + '</div></div></a>'; }).join('');
      return pageHead('Admin Dashboard', 'System overview for institutional operations and demo controls.') + '<div class="stat-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px;">' + grid + '</div>' +
        '<div class="card" style="margin-top:16px;padding:18px"><strong>Administration notes</strong><p class="muted" style="margin:8px 0 0">This demo keeps a single login screen but now recognises the administrative role and exposes the same protected-area flow used by other roles. Production authentication remains simulated and never stores real credentials.</p></div>';
    }
  });

  defineRoute('admin', 'users', {
    title: 'Users and Roles',
    render: function () {
      var rows = Store.state.users.map(function (u) { return [ROLE_LABEL[u.role] || 'Unknown', u.name, u.email]; });
      return pageHead('Users and Roles', 'Demo accounts and role assignment overview.') + adminTable('Demo user list', ['Role', 'Name', 'Email'], rows);
    }
  });

  defineRoute('admin', 'students', {
    title: 'Students',
    render: function () {
      var rows = Store.state.students.slice(0, 8).map(function (s) { return [s.regNo, s.name, s.programme, String(s.year)]; });
      return pageHead('Students', 'Current student register overview.') + adminTable('Student register', ['Registration', 'Name', 'Programme', 'Year'], rows);
    }
  });

  defineRoute('admin', 'tutors', {
    title: 'Tutors',
    render: function () {
      var rows = Store.state.tutors.slice(0, 8).map(function (t) { return [t.staffNo, t.name, t.department, t.status]; });
      return pageHead('Tutors', 'Assigned academic staff details and statuses.') + adminTable('Tutor directory', ['Staff No', 'Name', 'Department', 'Status'], rows);
    }
  });

  defineRoute('admin', 'programmes', {
    title: 'Programmes',
    render: function () {
      var rows = Store.state.programmes.map(function (p) { return [p.code, p.name, p.status]; });
      return pageHead('Programmes', 'Qualification types and current programme status.') + adminTable('Programme register', ['Code', 'Programme', 'Status'], rows);
    }
  });

  defineRoute('admin', 'courses', {
    title: 'Courses',
    render: function () {
      var rows = Store.state.courses.slice(0, 10).map(function (c) { return [c.code, c.title, c.programme, 'Y' + c.year + ' / S' + c.semester]; });
      return pageHead('Courses', 'Academic course catalogue and assignment context.') + adminTable('Course catalogue', ['Code', 'Title', 'Programme', 'Year/Sem'], rows);
    }
  });

  defineRoute('admin', 'periods', {
    title: 'Academic Periods',
    render: function () {
      var rows = Store.state.periods.map(function (p) { return [p.year, 'Semester ' + p.semester, p.start, p.end]; });
      return pageHead('Academic Periods', 'Active and historical academic windows.') + adminTable('Academic periods', ['Year', 'Semester', 'Start', 'End'], rows);
    }
  });

  defineRoute('admin', 'settings', {
    title: 'System Settings',
    render: function () {
      return pageHead('System Settings', 'Demo system controls and institution configuration.') + '<div class="card" style="padding:18px"><p class="muted">This prototype keeps the current browser-only demo behaviour. Production settings such as password policies and audit logs would live in the backend and secure data layer.</p><div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:12px"><a class="btn btn-secondary" href="#/admin/dashboard">Back to dashboard</a><button type="button" class="btn" data-action="logout">Sign out</button></div></div>';
    }
  });

  defineRoute('admin', 'announcements', {
    title: 'Announcements',
    render: function () {
      var announcements = Store.state.announcements || [];
      var rows = announcements.slice(0, 8).map(function (a) { return [a.title || 'Announcement', a.date || '', a.target || 'All']; });
      return pageHead('Announcements', 'Communication records and class-wide updates.') + adminTable('Announcements log', ['Title', 'Date', 'Audience'], rows || [['No announcements available', '', '']]);
    }
  });

  /* ---------- Quiz & Leaderboard Routes ---------- */
  defineRoute('student', 'leaderboard', {
    title: 'Quizzes & Leaderboard',
    nav: 'leaderboard',
    render: function (param, user) {
      return MLS.QuizViews ? MLS.QuizViews.renderLeaderboardView(param, user) : '<div class="card card-pad">Loading quizzes...</div>';
    }
  });
  defineRoute('student', 'quiz', {
    title: 'Clinical Quiz Challenge',
    nav: 'leaderboard',
    render: function (param, user) {
      return MLS.QuizViews ? MLS.QuizViews.renderQuizPlayer(param, user) : '<div class="card card-pad">Loading quiz...</div>';
    }
  });
  defineRoute('tutor', 'leaderboard', {
    title: 'Quizzes & Student Leaderboard',
    nav: 'leaderboard',
    render: function (param, user) {
      return MLS.QuizViews ? MLS.QuizViews.renderLeaderboardView(param, user) : '<div class="card card-pad">Loading quizzes...</div>';
    }
  });
  defineRoute('registrar', 'leaderboard', {
    title: 'Quizzes & Prize Disbursals',
    nav: 'leaderboard',
    render: function (param, user) {
      return MLS.QuizViews ? MLS.QuizViews.renderRegistrarLeaderboard(param, user) : '<div class="card card-pad">Loading prize disbursals...</div>';
    }
  });
  defineRoute('admin', 'leaderboard', {
    title: 'Quizzes & Prize Disbursals',
    nav: 'leaderboard',
    render: function (param, user) {
      return MLS.QuizViews ? MLS.QuizViews.renderRegistrarLeaderboard(param, user) : '<div class="card card-pad">Loading prize disbursals...</div>';
    }
  });

  document.addEventListener('click', function (e) {
    if (!e.target.closest('.menu-wrap')) closeMenu();
    if (e.target.closest('.sidebar .nav-link, .sidebar-brand')) closeNav();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeMenu(); closeNav(); }
  });

  window.addEventListener('hashchange', render);
  document.addEventListener('DOMContentLoaded', function () { Store.init(); render(); });

  MLS.App = { defineRoute: defineRoute, go: go, redirect: redirect, refresh: refresh, pageHead: pageHead, statCard: statCard, ROLE_LABEL: ROLE_LABEL };
})();
