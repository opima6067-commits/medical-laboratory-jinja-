/* ==========================================================================
   shared-views.js - pieces used by more than one role:
   course details, notifications and learning-material open/download actions.
   ========================================================================== */
(function () {
  'use strict';
  var MLS = window.MLS, UI = MLS.UI, Repo = MLS.Repo, Store = MLS.Store, App = MLS.App, Q = UI.Q, esc = UI.esc, icon = UI.icon;
  var CATEGORIES = ['Lecture Notes', 'Practical Notes', 'Laboratory Procedures', 'Presentations', 'Revision Materials', 'Reading Resources', 'Other'];

  /* ---- material files ---- */
  function materialFile(m) {
    if (m.sample) return { blob: UI.sampleMaterialBlob(m), name: m.fileName };
    var f = Store.files[m.id];
    return f ? { url: f.url, name: f.name } : null;
  }
  function materialButtons(m) {
    return '<div class="btn-row" style="justify-content:flex-end"><button type="button" class="btn btn-secondary btn-sm" data-action="openMaterial" data-id="' + esc(m.id) + '" aria-label="Open ' + esc(m.title) + '">' + icon('eye') + 'Open</button>' +
      '<button type="button" class="btn btn-secondary btn-sm" data-action="downloadMaterial" data-id="' + esc(m.id) + '" aria-label="Download ' + esc(m.title) + '">' + icon('download') + 'Download</button></div>';
  }
  function fileNote(m) {
    if (m.sample) return '';
    return Store.files[m.id] ? '<span class="cell-sub">File held in this browser session only</span>' : '<span class="cell-sub">Demo file not retained after refresh</span>';
  }
  function materialTitleCell(m) { return '<strong>' + esc(m.title) + '</strong><span class="cell-sub">' + esc(m.description || m.fileName) + '</span>' + fileNote(m); }

  UI.register({
    openMaterial: function (d) {
      var m = Repo.get('materials', d.id), f = m && materialFile(m);
      if (!f) { UI.toast('This demo file was only kept for the browser session in which it was added. Real file storage arrives in the backend phase.', 'warn'); return; }
      var url = f.url || URL.createObjectURL(f.blob);
      var w = window.open(url, '_blank', 'noopener');
      if (!w) UI.toast('Your browser blocked the new tab. Use Download instead.', 'warn');
      if (!f.url) setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
    },
    downloadMaterial: function (d) {
      var m = Repo.get('materials', d.id), f = m && materialFile(m);
      if (!f) { UI.toast('This demo file was only kept for the browser session in which it was added.', 'warn'); return; }
      if (f.blob) UI.downloadBlob(f.blob, f.name);
      else { var a = document.createElement('a'); a.href = f.url; a.download = f.name; document.body.appendChild(a); a.click(); a.remove(); }
    },
    readNotif: function (d) {
      var u = MLS.Auth.current(), r = Store.state.readNotifs[u.id] || (Store.state.readNotifs[u.id] = []);
      if (r.indexOf(d.id) < 0) r.push(d.id); Repo.save(); App.refresh();
    },
    markAllRead: function () {
      var u = MLS.Auth.current();
      Store.state.readNotifs[u.id] = Q.notificationsFor(u.role).map(function (n) { return n.id; }); Repo.save();
      UI.toast('All notifications marked as read.'); App.refresh();
    }
  });

  /* ---- course details (student, tutor and registrar) ---- */
  function courseDetail(code, user) {
    var c = Q.course(code), role = user.role, home = '#/' + role + '/';
    if (!c) return App.pageHead('Course not found') + UI.alertBox('warn', 'That course does not exist. It may have been removed.') + '<p style="margin-top:16px"><a class="btn" href="' + home + 'courses">Back to courses</a></p>';
    var allowed = true;
    if (role === 'student') { var s = Q.student(user.refId); allowed = !!s && c.programme === s.programme && c.year === s.year; }
    if (role === 'tutor') allowed = c.tutorId === user.refId;
    if (!allowed) return App.pageHead('Course not available') + UI.alertBox('error', 'This course is not part of your ' + (role === 'student' ? 'programme and level' : 'assigned courses') + '. In the real system the server would refuse this request.') + '<p style="margin-top:16px"><a class="btn" href="' + home + 'courses">Back to courses</a></p>';
    var t = Q.tutor(c.tutorId), mats = Q.materialsOf([c.code]), exams = Q.examsOf([c.code]);
    var actions = role === 'tutor' ? '<a class="btn" href="#/tutor/upload/' + esc(c.code) + '">' + icon('upload') + 'Upload material</a>' :
      role === 'registrar' ? '<button type="button" class="btn" data-action="editCourse" data-code="' + esc(c.code) + '">' + icon('edit') + 'Edit course</button>' : '';
    var emptyAction = role === 'tutor' ? '<a class="btn" href="#/tutor/upload/' + esc(c.code) + '">Upload the first material</a>' : '';
    var enrolled = Repo.list('students').filter(function (s) { return s.programme === c.programme && s.year === c.year && s.status === 'Active'; }).length;
    var kv = '<dl class="kv"><dt>Programme</dt><dd>' + esc(Q.progName(c.programme)) + '</dd><dt>Level</dt><dd>Year ' + c.year + ', Semester ' + c.semester + '</dd>' +
      '<dt>Tutor</dt><dd>' + esc(t ? t.name : 'Not assigned') + (t ? '<span class="cell-sub">' + esc(t.email) + '</span>' : '') + '</dd><dt>Status</dt><dd>' + UI.badge(c.status) + '</dd>' +
      '<dt>Learning materials</dt><dd>' + mats.length + '</dd>' + (role === 'registrar' ? '<dt>Active students at this level</dt><dd>' + enrolled + '</dd>' : '') + '</dl>';
    var examList = exams.length ? exams.map(function (e) {
      return '<div class="list-item"><div class="li-ic">' + icon('calendar') + '</div><div class="li-main"><div class="li-title">' + esc(e.title) + '</div><div class="small muted">' + UI.fmtDate(e.date) + ' at ' + UI.fmtTime(e.time) + ', ' + esc(e.venue) + '</div></div>' + UI.badge(e.status) + '</div>';
    }).join('') : '<div class="empty" style="padding:24px">No examinations scheduled for this course.</div>';
    return App.pageHead(c.title, esc(c.code) + ' &middot; ' + esc(Q.progName(c.programme)), actions) +
      '<div class="stack"><div class="grid grid-2"><div class="card card-pad"><h2 style="margin-bottom:8px">About this course</h2><p>' + esc(c.description) + '</p>' + kv + '</div>' +
      '<div class="card"><div class="card-head"><h2>Examinations</h2></div>' + examList + '</div></div>' +
      UI.listPage({
        id: 'cd-mat', title: 'Learning materials', search: function (m) { return m.title + ' ' + m.description; }, searchLabel: 'Search materials',
        filters: [{ key: 'cat', label: 'Type', options: CATEGORIES, test: function (m, v) { return m.category === v; } }],
        rows: function () { return Q.materialsOf([c.code]); }, pageSize: 8,
        empty: { title: 'No materials yet', msg: 'No learning materials have been uploaded for this course yet. Please check again later.', action: emptyAction },
        columns: [
          { label: 'Title', render: materialTitleCell }, { label: 'Type', render: function (m) { return UI.badge(m.category, 'blue'); } },
          { label: 'Uploaded', render: function (m) { return UI.fmtShort(m.uploadedAt); } }, { label: '', cls: 'actions', render: materialButtons }
        ]
      }) + '</div>';
  }
  ['student', 'tutor', 'registrar'].forEach(function (role) {
    App.defineRoute(role, 'course', {
      title: function (p) { var c = Q.course(p); return c ? c.code + ' - ' + c.title : 'Course details'; }, nav: 'courses',
      crumbs: function (p) { return [['Home', '#/' + role + '/dashboard'], ['Courses', '#/' + role + '/courses'], [p]]; },
      render: courseDetail
    });
  });

  /* ---- notifications (student and tutor) ---- */
  function notificationsView(user) {
    var read = Store.state.readNotifs[user.id] || [], list = Q.notificationsFor(user.role);
    var items = list.length ? list.map(function (n) {
      var isNew = read.indexOf(n.id) < 0;
      return '<div class="list-item"><div class="li-ic ' + (isNew ? 'amber' : '') + '">' + icon('bell') + '</div><div class="li-main"><div class="li-title">' + esc(n.title) + ' ' + (isNew ? UI.badge('New', 'amber') : '') + '</div>' +
        '<div>' + esc(n.body) + '</div><div class="small muted">' + UI.fmtDate(n.date) + '</div></div>' +
        (isNew ? '<button type="button" class="btn btn-secondary btn-sm" data-action="readNotif" data-id="' + esc(n.id) + '">Mark as read</button>' : '') + '</div>';
    }).join('') : UI.emptyState('No notifications', 'You are all caught up.');
    return App.pageHead('Notifications', 'Academic announcements and updates.', list.length ? '<button type="button" class="btn btn-secondary" data-action="markAllRead">' + icon('check') + 'Mark all as read</button>' : '') +
      '<div class="card">' + items + '</div>';
  }
  ['student', 'tutor'].forEach(function (role) { App.defineRoute(role, 'notifications', { title: 'Notifications', render: notificationsView }); });

  MLS.Shared = { CATEGORIES: CATEGORIES, materialButtons: materialButtons, materialTitleCell: materialTitleCell, materialFile: materialFile };
})();
