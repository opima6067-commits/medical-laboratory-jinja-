/* ==========================================================================
   student.js - student dashboard, courses, materials, examinations, results,
   profile and help. Students only ever see PUBLISHED results.
   (In production the server must filter unpublished results; hiding them
   here is only a UI behaviour.)
   ========================================================================== */
(function () {
  'use strict';
  var MLS = window.MLS, UI = MLS.UI, Repo = MLS.Repo, Store = MLS.Store, App = MLS.App, Q = UI.Q, esc = UI.esc, icon = UI.icon;
  var NOTE_TYPES = ['Lecture Notes', 'Practical Notes', 'Reading Resources', 'Revision Materials'];

  function me(user) { return Q.student(user.refId); }
  function noProfile() { return App.pageHead('Profile not found') + UI.alertBox('warn', 'Your student record could not be found. Please contact the registrar.'); }
  function publishedResults(reg) { return Repo.list('results').filter(function (r) { return r.regNo === reg && r.published; }); }
  function pendingResults(reg) {
    var seen = {}, out = [];
    Repo.list('results').forEach(function (r) { if (r.regNo === reg && !r.published) { var k = r.courseCode + r.periodId + r.assessment; if (!seen[k]) { seen[k] = 1; out.push(r); } } });
    return out;
  }
  function examLine(e) {
    return '<div class="list-item"><div class="li-ic">' + icon('calendar') + '</div><div class="li-main"><div class="li-title">' + esc(e.title) + '</div>' +
      '<div class="small muted">' + UI.fmtDate(e.date) + ', ' + UI.fmtTime(e.time) + ' &middot; ' + esc(e.venue) + '</div></div><span class="badge badge-blue">' + UI.daysUntil(e.date) + '</span></div>';
  }
  function materialLine(m) {
    var c = Q.course(m.courseCode);
    return '<div class="list-item"><div class="li-ic">' + icon('file') + '</div><div class="li-main"><div class="li-title">' + esc(m.title) + '</div><div class="small muted">' + esc(m.courseCode) + ' &middot; ' + esc(m.category) + ' &middot; ' + UI.fmtShort(m.uploadedAt) + '</div></div>' +
      '<button type="button" class="btn btn-secondary btn-sm" data-action="openMaterial" data-id="' + esc(m.id) + '" aria-label="Open ' + esc(m.title) + '">Open</button></div>';
  }

  /* ---- dashboard ---- */
  function dashboard(p, user) {
    var s = me(user); if (!s) return noProfile();
    var per = Store.activePeriod(), courses = Q.studentCourses(s, 'sem'), codes = courses.map(function (c) { return c.code; });
    var mats = Q.materialsOf(codes), upcoming = Q.examsOf(Q.studentCourses(s, 'all').map(function (c) { return c.code; })).filter(Q.isUpcoming);
    var pub = publishedResults(s.regNo).sort(function (a, b) { return a.id < b.id ? 1 : -1; });
    var avg = pub.length ? Math.round(pub.reduce(function (t, r) { return t + UI.pct(r.marks, r.max); }, 0) / pub.length) : null;
    var notes = Q.notificationsFor('student').slice(0, 3);
    var first = s.name.split(' ')[0];
    var hero = '<section class="hero" aria-label="Student summary"><div><h1 id="page-title" tabindex="-1">Welcome, ' + esc(first) + '</h1><p>Your courses, materials and results in one place.</p>' +
      '<div class="hero-meta"><span>Reg. no. ' + esc(s.regNo) + '</span><span>' + esc(Q.progName(s.programme)) + '</span><span>Year ' + s.year + '</span><span>' + esc(per.year) + ', Semester ' + per.semester + '</span></div></div>' +
      (avg !== null ? '<div class="ring-wrap"><div class="ring" style="--p:' + avg + '" role="img" aria-label="Average of published results: ' + avg + ' percent"><span>' + avg + '%</span></div><div>Average of your<br>published results</div></div>' : '') + '</section>';
    var stats = '<div class="grid grid-stats">' + App.statCard('book', courses.length, 'Courses this semester', '#/student/courses') + App.statCard('file', mats.length, 'Learning materials', '#/student/materials') +
      App.statCard('calendar', upcoming.length, 'Upcoming examinations', '#/student/exams') + App.statCard('award', pub.length, 'Published results', '#/student/results') + '</div>';
    var links = [['courses', 'book', 'My courses'], ['leaderboard', 'trophy', 'Quizzes & Prizes'], ['materials', 'file', 'Materials'], ['exams', 'calendar', 'Examinations'], ['results', 'award', 'Results'], ['notifications', 'bell', 'Notifications'], ['profile', 'user', 'Profile']]
      .map(function (l) { return '<a class="quick-link" href="#/student/' + l[0] + '">' + icon(l[1]) + l[2] + '</a>'; }).join('');

    var activeQuiz = MLS.Quiz ? MLS.Quiz.get('quiz_w41') : null;
    var quizBanner = activeQuiz ? (
      '<div class="card" style="border-left:4px solid var(--blue-500);background:linear-gradient(135deg, rgba(2,132,199,0.08), rgba(15,23,42,0.02));padding:16px 20px;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap">' +
      '<div style="display:flex;align-items:center;gap:14px"><div style="font-size:2rem">🏆</div>' +
      '<div><div style="display:flex;align-items:center;gap:8px"><span class="badge badge-amber" style="font-weight:700">ACTIVE PRIZE QUIZ</span><span class="badge badge-green" style="font-weight:700">💵 $50 1st Place Prize</span></div>' +
      '<strong style="font-size:1.05rem;color:var(--text);display:block;margin-top:4px">' + esc(activeQuiz.title) + '</strong>' +
      '<span class="muted small">' + esc(activeQuiz.category) + ' &bull; ' + activeQuiz.questions.length + ' Questions &bull; Cash Prizes & Leaderboard</span></div></div>' +
      '<div style="display:flex;gap:10px;align-items:center">' +
      '<a class="btn btn-secondary btn-sm" href="#/student/leaderboard">' + icon('trophy') + ' Leaderboard</a>' +
      '<a class="btn btn-primary btn-sm" href="#/student/quiz?id=' + encodeURIComponent(activeQuiz.id) + '">Take Challenge &rarr;</a>' +
      '</div></div>'
    ) : '';

    return hero + '<div class="stack" style="margin-top:20px">' + stats + quizBanner + '<div class="quick-links">' + links + '</div>' +
      '<div class="grid grid-2"><div class="card"><div class="card-head"><h2>Recently uploaded materials</h2><a href="#/student/materials">View all</a></div>' + (mats.length ? mats.slice(0, 4).map(materialLine).join('') : UI.emptyState('No materials yet', 'Materials for your courses will appear here.')) + '</div>' +
      '<div class="card"><div class="card-head"><h2>Upcoming examinations</h2><a href="#/student/exams">View all</a></div>' + (upcoming.length ? upcoming.slice(0, 4).map(examLine).join('') : UI.emptyState('No upcoming examinations', 'Check back when the timetable is released.')) + '</div></div>' +
      '<div class="grid grid-2"><div class="card"><div class="card-head"><h2>Recently published results</h2><a href="#/student/results">View all</a></div>' +
      (pub.length ? pub.slice(0, 4).map(function (r) { var pc = UI.pct(r.marks, r.max); return '<div class="list-item"><div class="li-ic green">' + icon('award') + '</div><div class="li-main"><div class="li-title">' + esc(Q.courseLabel(r.courseCode)) + '</div><div class="small muted">' + esc(r.assessment) + '</div></div><strong>' + r.marks + '/' + r.max + ' (' + UI.grade(pc) + ')</strong></div>'; }).join('') : UI.emptyState('No published results', 'Results appear here after the registrar publishes them.')) + '</div>' +
      '<div class="card"><div class="card-head"><h2>Announcements</h2><a href="#/student/notifications">View all</a></div>' + notes.map(function (n) { return '<div class="list-item"><div class="li-ic">' + icon('bell') + '</div><div class="li-main"><div class="li-title">' + esc(n.title) + '</div><div class="small muted">' + UI.fmtShort(n.date) + '</div></div></div>'; }).join('') + '</div></div></div>';
  }

  /* ---- courses ---- */
  function courses(p, user) {
    var s = me(user); if (!s) return noProfile();
    var per = Store.activePeriod();
    return App.pageHead('My Courses', 'Courses for ' + esc(Q.progName(s.programme)) + ', Year ' + s.year + '. Current period: ' + esc(per.year) + ', Semester ' + per.semester + '.') +
      UI.listPage({
        id: 'st-courses', search: function (c) { return c.code + ' ' + c.title; }, searchLabel: 'Search by course code or title',
        filters: [{ key: 'scope', label: 'Show', all: 'This semester', options: [['all', 'All semesters']], default: '', test: function () { return true; } }],
        rows: function () { return Q.studentCourses(s, UI.listState('st-courses').f.scope === 'all' ? 'all' : 'sem'); },
        pageSize: 9, empty: { title: 'No courses found', msg: 'No courses are assigned to your programme and level for this semester.' },
        card: function (c) {
          var t = Q.tutor(c.tutorId), n = Q.materialCount(c.code);
          return '<article class="card course-card"><div class="code">' + esc(c.code) + ' &middot; Semester ' + c.semester + '</div><h3>' + esc(c.title) + '</h3><p class="muted small" style="margin:0">' + esc(c.description) + '</p>' +
            '<div class="meta">' + esc(t ? t.name : 'Tutor to be assigned') + ' &middot; ' + n + ' material' + (n === 1 ? '' : 's') + '</div><a class="btn btn-secondary btn-sm" href="#/student/course/' + encodeURIComponent(c.code) + '">View course</a></article>';
        }
      });
  }

  /* ---- materials ---- */
  function materials(p, user) {
    var s = me(user); if (!s) return noProfile();
    var cs = Q.studentCourses(s, 'sem'), codes = cs.map(function (c) { return c.code; });
    return App.pageHead('Learning Materials', 'Lecture notes, procedures and other files for this semester\'s courses.') +
      UI.listPage({
        id: 'st-mats', search: function (m) { return m.title + ' ' + m.description + ' ' + m.courseCode; }, searchLabel: 'Search materials',
        filters: [
          { key: 'course', label: 'Course', options: cs.map(function (c) { return [c.code, c.code + ' - ' + c.title]; }), test: function (m, v) { return m.courseCode === v; } },
          { key: 'cat', label: 'Material type', options: MLS.Shared.CATEGORIES, test: function (m, v) { return m.category === v; } }
        ],
        rows: function () { return Q.materialsOf(codes); }, pageSize: 10,
        empty: { title: 'No materials uploaded', msg: 'No learning materials have been uploaded for your courses yet. Please check again later.' },
        columns: [
          { label: 'Title', render: MLS.Shared.materialTitleCell }, { label: 'Course', render: function (m) { return esc(m.courseCode); } },
          { label: 'Type', render: function (m) { return UI.badge(m.category, 'blue'); } }, { label: 'Uploaded', render: function (m) { return UI.fmtShort(m.uploadedAt); } },
          { label: '', cls: 'actions', render: MLS.Shared.materialButtons }
        ]
      });
  }
  function notes(p, user) {
    var s = me(user); if (!s) return noProfile();
    var cs = Q.studentCourses(s, 'all'), codes = cs.map(function (c) { return c.code; });
    return App.pageHead('Notes and Resources', 'Study notes, reading lists and revision material for your programme and level.') +
      UI.listPage({
        id: 'st-notes', search: function (m) { return m.title + ' ' + m.description + ' ' + m.courseCode; }, searchLabel: 'Search notes and resources',
        filters: [{ key: 'cat', label: 'Type', options: NOTE_TYPES, test: function (m, v) { return m.category === v; } }],
        rows: function () { return Q.materialsOf(codes).filter(function (m) { return NOTE_TYPES.indexOf(m.category) >= 0; }); }, pageSize: 9,
        empty: { title: 'No notes yet', msg: 'Notes and resources will appear here when your tutors upload them.' },
        card: function (m) {
          return '<article class="card course-card"><div><span class="badge badge-blue">' + esc(m.category) + '</span></div><h3>' + esc(m.title) + '</h3><p class="muted small" style="margin:0">' + esc(m.description) + '</p>' +
            '<div class="meta">' + esc(m.courseCode) + ' &middot; ' + UI.fmtShort(m.uploadedAt) + '</div>' + MLS.Shared.materialButtons(m) + '</article>';
        }
      });
  }

  /* ---- examinations ---- */
  function exams(p, user) {
    var s = me(user); if (!s) return noProfile();
    var codes = Q.studentCourses(s, 'all').map(function (c) { return c.code; }), all = Q.examsOf(codes);
    var up = all.filter(Q.isUpcoming), past = all.filter(function (e) { return !Q.isUpcoming(e); }).reverse();
    var cards = up.length ? '<div class="grid grid-cards">' + up.map(function (e) {
      return '<article class="card card-pad"><div style="display:flex;justify-content:space-between;gap:8px"><span class="badge badge-blue">' + esc(e.courseCode) + '</span><span class="badge badge-amber">' + UI.daysUntil(e.date) + '</span></div>' +
        '<h3 style="margin:8px 0">' + esc(e.title) + '</h3><dl class="kv" style="grid-template-columns:90px 1fr"><dt>Date</dt><dd>' + UI.fmtDate(e.date) + '</dd><dt>Time</dt><dd>' + UI.fmtTime(e.time) + (e.duration ? ' (' + esc(e.duration) + ')' : '') + '</dd><dt>Venue</dt><dd>' + esc(e.venue) + '</dd>' +
        '<dt>Instructions</dt><dd>' + (e.instructions ? esc(e.instructions) : '<span class="muted">None provided</span>') + '</dd></dl></article>';
    }).join('') + '</div>' : UI.emptyState('No upcoming examinations', 'No examinations are scheduled for your courses right now.');
    return App.pageHead('Examinations', 'Timetable for ' + esc(Q.progName(s.programme)) + ', Year ' + s.year + '.', '<a class="btn btn-secondary" href="#/student/results">' + icon('award') + 'View results</a>') +
      '<div class="stack"><section aria-labelledby="up-h"><h2 id="up-h" style="margin-bottom:12px">Upcoming</h2>' + cards + '</section>' +
      '<div class="card"><div class="card-head"><h2>Past and other examinations</h2></div>' + (past.length ? UI.table([
        { label: 'Examination', render: function (e) { return '<strong>' + esc(e.title) + '</strong><span class="cell-sub">' + esc(Store.periodLabel(e.periodId)) + '</span>'; } },
        { label: 'Date', render: function (e) { return UI.fmtShort(e.date); } }, { label: 'Venue', render: function (e) { return esc(e.venue); } }, { label: 'Status', render: function (e) { return UI.badge(e.status); } }
      ], past, { caption: 'Past examinations' }) : UI.emptyState('Nothing here yet', 'Past examinations will be listed here.')) + '</div></div>';
  }

  /* ---- results (published only) ---- */
  function results(p, user) {
    var s = me(user); if (!s) return noProfile();
    var pub = publishedResults(s.regNo), pending = pendingResults(s.regNo);
    var periods = {}; pub.forEach(function (r) { periods[r.periodId] = 1; });
    var pendHtml = pending.length ? '<div class="card"><div class="card-head"><h2>Awaiting publication</h2></div>' + pending.map(function (r) {
      return '<div class="list-item"><div class="li-ic amber">' + icon('clock') + '</div><div class="li-main"><div class="li-title">' + esc(Q.courseLabel(r.courseCode)) + ' - ' + esc(r.assessment) + '</div><div class="small muted">' + esc(Store.periodLabel(r.periodId)) + '</div></div>' + UI.badge('Not yet published', 'amber') + '</div>';
    }).join('') + '<div class="card-pad small muted">Results are shown only after the registrar publishes them.</div></div>' : '';
    return App.pageHead('Examination Results', 'Only published results are shown here.') + '<div class="stack">' +
      UI.listPage({
        id: 'st-res', title: 'Published results', search: function (r) { return r.courseCode + ' ' + (Q.course(r.courseCode) || {}).title + ' ' + r.assessment; }, searchLabel: 'Search by course or assessment',
        filters: [{ key: 'period', label: 'Academic period', options: Object.keys(periods).map(function (k) { return [k, Store.periodLabel(k)]; }), test: function (r, v) { return r.periodId === v; } }],
        rows: function () { return publishedResults(s.regNo); }, pageSize: 10,
        empty: { title: 'No results published yet', msg: 'Your results have not been published yet. They will appear here once the registrar releases them.' },
        columns: [
          { label: 'Course', render: function (r) { return '<strong>' + esc(r.courseCode) + '</strong><span class="cell-sub">' + esc((Q.course(r.courseCode) || {}).title || '') + '</span>'; } },
          { label: 'Assessment', render: function (r) { return esc(r.assessment); } }, { label: 'Period', render: function (r) { return esc(Store.periodLabel(r.periodId)); } },
          { label: 'Marks', cls: 'num', render: function (r) { return r.marks + ' / ' + r.max; } }, { label: 'Percentage', cls: 'num', render: function (r) { return UI.pct(r.marks, r.max) + '%'; } },
          { label: 'Grade', render: function (r) { return '<strong>' + UI.grade(UI.pct(r.marks, r.max)) + '</strong>'; } }
        ]
      }) + pendHtml + '</div>';
  }

  /* ---- profile ---- */
  function profile(p, user) {
    var s = me(user); if (!s) return noProfile();
    var per = Store.activePeriod();
    return App.pageHead('Student Profile') + '<div class="card card-pad"><div style="display:flex;gap:16px;align-items:center;margin-bottom:18px"><div class="avatar avatar-lg">' + esc(UI.initials(s.name)) + '</div><div><h2>' + esc(s.name) + '</h2><div class="muted">' + esc(s.regNo) + '</div></div></div>' +
      '<dl class="kv"><dt>Registration number</dt><dd>' + esc(s.regNo) + '</dd><dt>Email</dt><dd>' + esc(s.email) + '</dd><dt>Programme</dt><dd>' + esc(Q.progName(s.programme)) + '</dd><dt>Academic year of study</dt><dd>Year ' + s.year + '</dd>' +
      '<dt>Current period</dt><dd>' + esc(per.year) + ', Semester ' + per.semester + '</dd><dt>Courses this semester</dt><dd>' + Q.studentCourses(s, 'sem').length + '</dd><dt>Status</dt><dd>' + UI.badge(s.status) + '</dd></dl>' +
      '<p class="muted small" style="margin-top:16px">To change your details, contact the registrar\'s office.</p></div>';
  }

  /* ---- help ---- */
  function help() {
    var faqs = [
      ['Why can I not see my results?', 'Results appear only after the registrar publishes them. If a result is awaiting publication you will see it listed without marks.'],
      ['How do I open a learning material?', 'Go to Learning Materials, find the file and select Open or Download.'],
      ['A course is missing from my list.', 'Courses are assigned by programme, year and semester. Check "All semesters" on My Courses, or contact the registrar.'],
      ['Who do I contact about my registration details?', 'The registrar\'s office manages student records.']
    ];
    return App.pageHead('Help and Support', 'Answers to common questions.') + '<div class="grid grid-2"><div class="card card-pad"><h2 style="margin-bottom:8px">Frequently asked questions</h2>' +
      faqs.map(function (f) { return '<details class="faq"><summary>' + esc(f[0]) + '</summary><p style="margin:8px 0 0">' + esc(f[1]) + '</p></details>'; }).join('') + '</div>' +
      '<div class="card card-pad"><h2 style="margin-bottom:8px">Contact support</h2><p class="muted">Demonstration form. Nothing is sent anywhere.</p><form data-submit="sendHelp" novalidate><div class="form-grid">' +
      UI.field({ name: 'topic', label: 'Topic', type: 'select', required: true, placeholder: 'Choose a topic', options: ['Courses', 'Learning materials', 'Examinations', 'Results', 'Other'], full: true }) +
      UI.field({ name: 'message', label: 'Message', type: 'textarea', required: true, rows: 4, full: true, maxlength: 500, placeholder: 'Describe the problem' }) +
      '</div><div class="form-actions"><button class="btn" type="submit">Send message</button></div></form></div></div>';
  }
  UI.register({
    sendHelp: function (d, form) {
      var r = UI.collect(form, { message: function (v) { return v.length < 10 ? 'Please write at least 10 characters.' : ''; } });
      if (!r.ok) return;
      form.reset(); UI.toast('Message recorded in the demo. In the real system it would go to the support desk.');
    }
  });

  var R = App.defineRoute;
  R('student', 'dashboard', { title: 'Dashboard', render: dashboard }); R('student', 'courses', { title: 'My Courses', render: courses });
  R('student', 'materials', { title: 'Learning Materials', render: materials }); R('student', 'notes', { title: 'Notes and Resources', render: notes });
  R('student', 'exams', { title: 'Examinations', render: exams }); R('student', 'results', { title: 'Examination Results', render: results });
  R('student', 'profile', { title: 'Student Profile', render: profile }); R('student', 'help', { title: 'Help and Support', render: help });
})();
