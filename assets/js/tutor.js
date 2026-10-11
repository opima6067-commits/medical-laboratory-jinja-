/* ==========================================================================
   tutor.js - tutor dashboard, assigned courses, material upload/management.

   Tutor restrictions (assigned courses only) are simulated in the UI here.
   The real backend MUST enforce them on every request.
   Uploaded files are held as temporary in-memory object URLs: they work until
   the page is refreshed, and are never stored in localStorage.
   ========================================================================== */
(function () {
  'use strict';
  var MLS = window.MLS, UI = MLS.UI, Repo = MLS.Repo, Store = MLS.Store, App = MLS.App, Q = UI.Q, esc = UI.esc, icon = UI.icon;
  var ALLOWED_EXT = ['pdf', 'png', 'jpg', 'jpeg', 'webp'];

  function me(user) { return Q.tutor(user.refId); }
  function myCodes(user) { return Q.tutorCourses(user.refId).map(function (c) { return c.code; }); }

  function dashboard(p, user) {
    var t = me(user), courses = Q.tutorCourses(user.refId), codes = courses.map(function (c) { return c.code; });
    var mine = Repo.list('materials').filter(function (m) { return m.tutorId === user.refId; }).sort(function (a, b) { return b.uploadedAt < a.uploadedAt ? -1 : 1; });
    var upcoming = Q.examsOf(codes).filter(Q.isUpcoming);
    var updated = courses.map(function (c) { var ms = Q.materialsOf([c.code]); return { c: c, last: ms.length ? ms[0].uploadedAt : '' }; }).sort(function (a, b) { return a.last < b.last ? 1 : -1; }).slice(0, 4);
    var news = Q.notificationsFor('tutor').slice(0, 3);
    return App.pageHead('Welcome, ' + esc(t ? t.name : user.name), 'Your assigned courses and materials for ' + esc(Store.periodLabel(Store.activePeriod().id)) + '.', '<a class="btn" href="#/tutor/upload">' + icon('upload') + 'Upload material</a>') +
      '<div class="stack"><div class="grid grid-stats">' + App.statCard('book', courses.length, 'Assigned courses', '#/tutor/courses') + App.statCard('file', mine.length, 'Materials uploaded', '#/tutor/manage') +
      App.statCard('calendar', upcoming.length, 'Upcoming examinations', '#/tutor/exams') + App.statCard('bell', Q.unread(user), 'Unread notifications', '#/tutor/notifications') + '</div>' +
      '<div class="quick-links"><a class="quick-link" href="#/tutor/upload">' + icon('upload') + 'Upload material</a><a class="quick-link" href="#/tutor/manage">' + icon('file') + 'Manage materials</a><a class="quick-link" href="#/tutor/courses">' + icon('book') + 'My courses</a><a class="quick-link" href="#/tutor/exams">' + icon('calendar') + 'Examinations</a></div>' +
      '<div class="grid grid-2"><div class="card"><div class="card-head"><h2>Recently uploaded materials</h2><a href="#/tutor/manage">Manage</a></div>' + (mine.length ? mine.slice(0, 4).map(function (m) {
        return '<div class="list-item"><div class="li-ic">' + icon('file') + '</div><div class="li-main"><div class="li-title">' + esc(m.title) + '</div><div class="small muted">' + esc(m.courseCode) + ' &middot; ' + esc(m.category) + ' &middot; ' + UI.fmtShort(m.uploadedAt) + '</div></div></div>';
      }).join('') : UI.emptyState('No uploads yet', 'Upload your first learning material.', '<a class="btn" href="#/tutor/upload">Upload material</a>')) + '</div>' +
      '<div class="card"><div class="card-head"><h2>Recently updated courses</h2></div>' + (updated.length ? updated.map(function (u) {
        return '<div class="list-item"><div class="li-ic">' + icon('book') + '</div><div class="li-main"><div class="li-title"><a href="#/tutor/course/' + encodeURIComponent(u.c.code) + '">' + esc(u.c.code + ' - ' + u.c.title) + '</a></div><div class="small muted">' + (u.last ? 'Last material ' + UI.fmtShort(u.last) : 'No materials yet') + '</div></div></div>';
      }).join('') : UI.emptyState('No assigned courses', 'The registrar has not assigned courses to you yet.')) + '</div></div>' +
      '<div class="card"><div class="card-head"><h2>Announcements</h2><a href="#/tutor/notifications">View all</a></div>' + news.map(function (n) { return '<div class="list-item"><div class="li-ic">' + icon('bell') + '</div><div class="li-main"><div class="li-title">' + esc(n.title) + '</div><div class="small muted">' + esc(n.body) + '</div></div></div>'; }).join('') + '</div></div>';
  }

  function courses(p, user) {
    var progs = {}; Q.tutorCourses(user.refId).forEach(function (c) { progs[c.programme] = 1; });
    return App.pageHead('My Assigned Courses', 'Courses the registrar has assigned to you.') + UI.listPage({
      id: 'tu-courses', search: function (c) { return c.code + ' ' + c.title; }, searchLabel: 'Search by code or title',
      filters: [{ key: 'prog', label: 'Programme', options: Object.keys(progs).map(function (k) { return [k, Q.progName(k)]; }), test: function (c, v) { return c.programme === v; } },
        { key: 'sem', label: 'Semester', options: [['1', 'Semester 1'], ['2', 'Semester 2']], test: function (c, v) { return String(c.semester) === v; } }],
      rows: function () { return Q.tutorCourses(user.refId); }, pageSize: 9,
      empty: { title: 'No assigned courses', msg: 'You have no assigned courses yet. Contact the registrar.' },
      card: function (c) {
        var n = Q.materialCount(c.code);
        return '<article class="card course-card"><div class="code">' + esc(c.code) + ' &middot; Year ' + c.year + ', Semester ' + c.semester + '</div><h3>' + esc(c.title) + '</h3><p class="muted small" style="margin:0">' + esc(Q.progName(c.programme)) + '</p>' +
          '<div class="meta">' + n + ' material' + (n === 1 ? '' : 's') + ' &middot; ' + UI.badge(c.status) + '</div><div class="btn-row"><a class="btn btn-secondary btn-sm" href="#/tutor/course/' + encodeURIComponent(c.code) + '">Course details</a><a class="btn btn-sm" href="#/tutor/upload/' + encodeURIComponent(c.code) + '">Upload</a></div></article>';
      }
    });
  }

  function upload(param, user) {
    var cs = Q.tutorCourses(user.refId).filter(function (c) { return c.status === 'Active'; });
    if (!cs.length) return App.pageHead('Upload Learning Materials') + UI.alertBox('warn', 'You have no active assigned courses, so you cannot upload materials yet.');
    var mine = Repo.list('materials').filter(function (m) { return m.tutorId === user.refId; }).sort(function (a, b) { return b.uploadedAt < a.uploadedAt ? -1 : 1; }).slice(0, 5);
    var form = '<form data-submit="uploadMaterial" novalidate><div class="form-grid">' +
      UI.field({ name: 'course', label: 'Course', type: 'select', required: true, placeholder: 'Select an assigned course', options: cs.map(function (c) { return [c.code, c.code + ' - ' + c.title]; }), value: param || '', full: true }) +
      UI.field({ name: 'title', label: 'Material title', required: true, maxlength: 120, placeholder: 'e.g. Introduction to Blood Film Staining' }) +
      UI.field({ name: 'category', label: 'Category', type: 'select', required: true, placeholder: 'Choose a category', options: MLS.Shared.CATEGORIES }) +
      UI.field({ name: 'description', label: 'Short description', type: 'textarea', maxlength: 250, rows: 3, full: true, help: 'Optional. Up to 250 characters.' }) +
      UI.field({ name: 'file', label: 'File', type: 'file', required: true, accept: '.pdf,.png,.jpg,.jpeg,.webp', full: true, dataChange: 'fileChosen', help: 'PDF, PNG, JPG or WebP. Maximum ' + Store.state.settings.maxFileMB + ' MB.' }) +
      '</div><p class="small" id="file-name" aria-live="polite" style="margin:8px 0 0">No file selected.</p><div class="form-actions"><a class="btn btn-secondary" href="#/tutor/manage">Cancel</a><button type="submit" class="btn">' + icon('upload') + 'Upload material</button></div></form>';
    return App.pageHead('Upload Learning Materials', 'Add a file to one of your assigned courses.') + '<div class="stack">' +
      UI.alertBox('info', '<strong>Demonstration upload.</strong> The file is kept only in this browser tab and disappears when you refresh. Permanent, private file storage will be added in the backend phase.') +
      '<div class="card card-pad">' + form + '</div>' +
      '<div class="card"><div class="card-head"><h2>Your latest uploads</h2><a href="#/tutor/manage">Manage all</a></div>' + (mine.length ? mine.map(function (m) {
        return '<div class="list-item"><div class="li-ic green">' + icon('file') + '</div><div class="li-main"><div class="li-title">' + esc(m.title) + '</div><div class="small muted">' + esc(m.courseCode) + ' &middot; ' + esc(m.category) + ' &middot; ' + UI.fmtShort(m.uploadedAt) + '</div></div></div>';
      }).join('') : UI.emptyState('No uploads yet', 'Materials you upload will be listed here.')) + '</div></div>';
  }

  function ext(name) { var i = name.lastIndexOf('.'); return i < 0 ? '' : name.slice(i + 1).toLowerCase(); }
  UI.register({
    fileChosen: function (d, input) {
      var f = input.files && input.files[0], n = document.getElementById('file-name');
      if (n) n.textContent = f ? 'Selected: ' + f.name + ' (' + Math.max(1, Math.round(f.size / 1024)) + ' KB)' : 'No file selected.';
    },
    uploadMaterial: function (d, form) {
      var user = MLS.Auth.current(), max = Store.state.settings.maxFileMB;
      var r = UI.collect(form, {
        title: function (v) { return v.length < 3 ? 'Title must be at least 3 characters.' : ''; },
        course: function (v) { return myCodes(user).indexOf(v) < 0 ? 'You can only upload to courses assigned to you.' : ''; },
        file: function (f) { return ALLOWED_EXT.indexOf(ext(f.name)) < 0 ? 'Choose a PDF, PNG, JPG or WebP file.' : f.size > max * 1048576 ? 'The file is larger than ' + max + ' MB.' : f.size === 0 ? 'The file is empty.' : ''; }
      });
      if (!r.ok) { UI.toast('The upload was not submitted. Please fix the highlighted fields.', 'error'); return; }
      var v = r.values, id = Store.uid('m');
      Store.files[id] = { url: URL.createObjectURL(v.file), name: v.file.name };
      Repo.insert('materials', { id: id, courseCode: v.course, title: v.title, description: v.description || '', category: v.category, tutorId: user.refId, uploadedAt: UI.today(), fileName: v.file.name, mime: v.file.type, sample: false });
      Store.log('Material "' + v.title + '" added to ' + v.course);
      UI.toast('"' + v.title + '" was added to ' + v.course + ' (demo upload).');
      App.refresh();
    },
    editMaterial: function (d) {
      var m = Repo.get('materials', d.id), user = MLS.Auth.current(); if (!m) return;
      if (!canManage(m, user)) { UI.toast('You can only manage materials for your assigned courses.', 'error'); return; }
      UI.Modal.open({
        title: 'Edit material', submitLabel: 'Save changes',
        body: '<div class="form-grid">' + UI.field({ name: 'title', label: 'Title', required: true, value: m.title, full: true }) + UI.field({ name: 'category', label: 'Category', type: 'select', required: true, options: MLS.Shared.CATEGORIES, value: m.category, full: true }) +
          UI.field({ name: 'description', label: 'Description', type: 'textarea', value: m.description, full: true, maxlength: 250 }) + '</div>',
        onSubmit: function (form) {
          var r = UI.collect(form, { title: function (v) { return v.length < 3 ? 'Title must be at least 3 characters.' : ''; } }); if (!r.ok) return false;
          Repo.update('materials', m.id, { title: r.values.title, category: r.values.category, description: r.values.description });
          Store.log('Material "' + r.values.title + '" updated'); UI.toast('Material updated.'); App.refresh();
        }
      });
    },
    deleteMaterial: function (d) {
      var m = Repo.get('materials', d.id), user = MLS.Auth.current(); if (!m) return;
      if (!canManage(m, user)) { UI.toast('You can only manage materials for your assigned courses.', 'error'); return; }
      UI.confirm({ title: 'Delete this material?', html: '<p><strong>' + esc(m.title) + '</strong> will be removed from ' + esc(m.courseCode) + '. Students will no longer see it.</p>', confirmLabel: 'Delete material', danger: true }).then(function (ok) {
        if (!ok) return;
        var f = Store.files[m.id]; if (f) { URL.revokeObjectURL(f.url); delete Store.files[m.id]; }
        Repo.remove('materials', m.id); Store.log('Material "' + m.title + '" deleted'); UI.toast('Material deleted.'); App.refresh();
      });
    }
  });
  function canManage(m, user) { if (user.role === 'registrar') return true; return user.role === 'tutor' && myCodes(user).indexOf(m.courseCode) >= 0; }

  function manage(p, user) {
    var codes = myCodes(user);
    return App.pageHead('Manage Learning Materials', 'Edit or remove materials in your assigned courses.', '<a class="btn" href="#/tutor/upload">' + icon('upload') + 'Upload material</a>') + UI.listPage({
      id: 'tu-mats', search: function (m) { return m.title + ' ' + m.description; }, searchLabel: 'Search your materials',
      filters: [{ key: 'course', label: 'Course', options: codes.map(function (c) { return [c, Q.courseLabel(c)]; }), test: function (m, v) { return m.courseCode === v; } },
        { key: 'cat', label: 'Type', options: MLS.Shared.CATEGORIES, test: function (m, v) { return m.category === v; } }],
      rows: function () { return Q.materialsOf(codes); }, pageSize: 10,
      empty: { title: 'No materials', msg: 'There are no materials in your courses yet.', action: '<a class="btn" href="#/tutor/upload">Upload material</a>' },
      columns: [{ label: 'Title', render: MLS.Shared.materialTitleCell }, { label: 'Course', render: function (m) { return esc(m.courseCode); } }, { label: 'Type', render: function (m) { return UI.badge(m.category, 'blue'); } },
        { label: 'Uploaded', render: function (m) { return UI.fmtShort(m.uploadedAt); } },
        { label: '', cls: 'actions', render: function (m) { return '<div class="btn-row" style="justify-content:flex-end"><button type="button" class="btn btn-secondary btn-sm" data-action="openMaterial" data-id="' + esc(m.id) + '" aria-label="Open ' + esc(m.title) + '">Open</button>' +
          '<button type="button" class="btn btn-secondary btn-sm" data-action="editMaterial" data-id="' + esc(m.id) + '" aria-label="Edit ' + esc(m.title) + '">' + icon('edit') + 'Edit</button>' +
          '<button type="button" class="btn btn-secondary btn-sm" data-action="deleteMaterial" data-id="' + esc(m.id) + '" aria-label="Delete ' + esc(m.title) + '" style="color:var(--red-700)">' + icon('trash') + 'Delete</button></div>'; } }]
    });
  }

  function exams(p, user) {
    var rows = Q.examsOf(myCodes(user));
    return App.pageHead('Examination Information', 'Examinations for your assigned courses (read only).') + '<div class="card">' + (rows.length ? UI.table([
      { label: 'Examination', render: function (e) { return '<strong>' + esc(e.title) + '</strong><span class="cell-sub">' + esc(Store.periodLabel(e.periodId)) + '</span>'; } },
      { label: 'Course', render: function (e) { return esc(e.courseCode); } }, { label: 'Date and time', render: function (e) { return UI.fmtShort(e.date) + ', ' + UI.fmtTime(e.time); } },
      { label: 'Venue', render: function (e) { return esc(e.venue); } }, { label: 'Status', render: function (e) { return UI.badge(e.status); } }
    ], rows, { caption: 'Examinations' }) : UI.emptyState('No examinations', 'No examinations are scheduled for your courses.')) + '</div>';
  }

  function profile(p, user) {
    var t = me(user); if (!t) return App.pageHead('Tutor Profile') + UI.alertBox('warn', 'Your tutor record could not be found.');
    var cs = Q.tutorCourses(t.id);
    return App.pageHead('Tutor Profile') + '<div class="card card-pad"><div style="display:flex;gap:16px;align-items:center;margin-bottom:18px"><div class="avatar avatar-lg">' + esc(UI.initials(t.name)) + '</div><div><h2>' + esc(t.name) + '</h2><div class="muted">' + esc(t.staffNo) + '</div></div></div>' +
      '<dl class="kv"><dt>Staff number</dt><dd>' + esc(t.staffNo) + '</dd><dt>Email</dt><dd>' + esc(t.email) + '</dd><dt>Department</dt><dd>' + esc(t.department) + '</dd><dt>Status</dt><dd>' + UI.badge(t.status) + '</dd>' +
      '<dt>Assigned courses</dt><dd>' + (cs.length ? cs.map(function (c) { return '<a href="#/tutor/course/' + encodeURIComponent(c.code) + '">' + esc(c.code) + '</a> ' + esc(c.title); }).join('<br>') : 'None') + '</dd></dl></div>';
  }

  var R = App.defineRoute;
  R('tutor', 'dashboard', { title: 'Dashboard', render: dashboard }); R('tutor', 'courses', { title: 'My Assigned Courses', render: courses });
  R('tutor', 'upload', { title: 'Upload Learning Materials', render: upload }); R('tutor', 'manage', { title: 'Manage Learning Materials', render: manage });
  R('tutor', 'exams', { title: 'Examination Information', render: exams }); R('tutor', 'profile', { title: 'Tutor Profile', render: profile });
})();
