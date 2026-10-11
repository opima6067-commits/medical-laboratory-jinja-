/* ==========================================================================
   registrar.js - registrar dashboard and administrative pages:
   students, tutors, courses, programmes, academic periods, examinations,
   results management, materials overview, announcements, reports, settings.

   All changes happen in browser-side demo state. In production every one of
   these operations must be an authenticated, authorised, audited API call.
   ========================================================================== */
(function () {
  'use strict';
  var MLS = window.MLS, UI = MLS.UI, Repo = MLS.Repo, Store = MLS.Store, App = MLS.App, Q = UI.Q, esc = UI.esc, icon = UI.icon, Modal = UI.Modal;
  var R = App.defineRoute, btn = function (action, attrs, label, ic, cls) {
    return '<button type="button" class="btn ' + (cls || 'btn-secondary btn-sm') + '" data-action="' + action + '" ' + attrs + '>' + (ic ? icon(ic) : '') + label + '</button>';
  };
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  function progOptions(onlyActive) { return Repo.list('programmes').filter(function (p) { return !onlyActive || p.status === 'Active'; }).map(function (p) { return [p.code, p.code + ' - ' + p.name]; }); }
  function courseOptions() { return Repo.list('courses').map(function (c) { return [c.code, c.code + ' - ' + c.title]; }); }
  function periodOptions() { return Repo.list('periods').map(function (p) { return [p.id, Store.periodLabel(p.id)]; }); }
  function tutorOptions() { return Repo.list('tutors').filter(function (t) { return t.status === 'Active'; }).map(function (t) { return [t.id, t.name]; }); }
  function awaiting() { return Q.resultGroups().filter(function (g) { return g.status !== 'Published'; }); }
  var YEARS = [['1', 'Year 1'], ['2', 'Year 2'], ['3', 'Year 3'], ['4', 'Year 4']];
  var SEMS = [['1', 'Semester 1'], ['2', 'Semester 2']];

  /* ---------------------------- dashboard ---------------------------- */
  function dashboard() {
    var p = Store.activePeriod(), up = Repo.list('exams').filter(Q.isUpcoming).sort(function (a, b) { return a.date < b.date ? -1 : 1; }), wait = awaiting();
    var progs = Repo.list('programmes').filter(function (x) { return x.status === 'Active'; }).length;
    var stats = '<div class="grid grid-stats">' + App.statCard('cap', Repo.list('students').length, 'Demonstration students', '#/registrar/students') + App.statCard('users', Repo.list('tutors').length, 'Tutors', '#/registrar/tutors') +
      App.statCard('book', Repo.list('courses').length, 'Courses', '#/registrar/courses') + App.statCard('layers', progs, 'Active programmes', '#/registrar/programmes') +
      App.statCard('clock', p.year, 'Academic year, Semester ' + p.semester, '#/registrar/periods') + App.statCard('calendar', up.length, 'Upcoming examinations', '#/registrar/exams') +
      App.statCard('award', wait.length, 'Result sets awaiting publication', '#/registrar/results') + App.statCard('file', Repo.list('materials').length, 'Learning materials', '#/registrar/materials') + '</div>';
    var quick = '<div class="card card-pad"><h2 style="margin-bottom:12px">Quick actions</h2><div class="btn-row">' + btn('editStudent', '', 'Add student', 'plus', 'btn') + btn('editCourse', '', 'Create course', 'plus') + btn('editExam', '', 'Schedule examination', 'calendar') +
      '<a class="btn btn-secondary" href="#/registrar/import">' + icon('upload') + 'Import results</a><a class="btn btn-secondary" href="#/registrar/results">' + icon('award') + 'Publish results</a></div></div>';
    return App.pageHead('Registrar Dashboard', 'Overview of academic records for ' + esc(Store.periodLabel(p.id)) + '.') + '<div class="stack">' + stats + quick +
      '<div class="grid grid-2"><div class="card"><div class="card-head"><h2>Results awaiting publication</h2><a href="#/registrar/results">Manage</a></div>' + (wait.length ? wait.slice(0, 5).map(function (g) {
        return '<div class="list-item"><div class="li-ic amber">' + icon('clock') + '</div><div class="li-main"><div class="li-title">' + esc(Q.courseLabel(g.courseCode)) + '</div><div class="small muted">' + esc(g.assessment) + ' &middot; ' + esc(Store.periodLabel(g.periodId)) + ' &middot; ' + g.count + ' records</div></div>' + UI.badge(g.status, 'amber') + '</div>';
      }).join('') : UI.emptyState('Nothing waiting', 'All imported results have been published.')) + '</div>' +
      '<div class="card"><div class="card-head"><h2>Recently updated records</h2></div>' + Store.state.activity.slice(0, 6).map(function (a) { return '<div class="list-item"><div class="li-ic">' + icon('check') + '</div><div class="li-main">' + esc(a.text) + '<div class="small muted">' + UI.fmtShort(a.at) + '</div></div></div>'; }).join('') + '</div></div>' +
      '<div class="card"><div class="card-head"><h2>Upcoming examinations</h2><a href="#/registrar/exams">All examinations</a></div>' + (up.length ? up.slice(0, 5).map(function (e) {
        return '<div class="list-item"><div class="li-ic">' + icon('calendar') + '</div><div class="li-main"><div class="li-title">' + esc(e.title) + '</div><div class="small muted">' + UI.fmtDate(e.date) + ', ' + UI.fmtTime(e.time) + ' &middot; ' + esc(e.venue) + '</div></div><span class="badge badge-blue">' + UI.daysUntil(e.date) + '</span></div>';
      }).join('') : UI.emptyState('No upcoming examinations', 'Schedule an examination to see it here.')) + '</div></div>';
  }

  /* ---------------------------- students ---------------------------- */
  function students() {
    return App.pageHead('Student Management', 'Students are identified by their unique registration number, never by name alone.', btn('editStudent', '', 'Add student', 'plus', 'btn')) + UI.listPage({
      id: 'rg-students', search: function (s) { return [s.regNo, s.name, s.programme, Q.progName(s.programme), 'year ' + s.year].join(' '); }, searchLabel: 'Search by reg. number, name, programme or level',
      filters: [{ key: 'prog', label: 'Programme', options: progOptions(), test: function (s, v) { return s.programme === v; } }, { key: 'year', label: 'Year', options: YEARS, test: function (s, v) { return String(s.year) === v; } },
        { key: 'status', label: 'Status', options: ['Active', 'Deferred', 'Suspended', 'Graduated'], test: function (s, v) { return s.status === v; } }],
      rows: function () { return Repo.list('students'); }, pageSize: 10, empty: { title: 'No students', msg: 'Add a demonstration student to get started.' },
      columns: [{ label: 'Reg. number', render: function (s) { return '<a href="#/registrar/student/' + encodeURIComponent(s.regNo) + '"><strong>' + esc(s.regNo) + '</strong></a>'; } },
        { label: 'Name', render: function (s) { return esc(s.name) + '<span class="cell-sub">' + esc(s.email) + '</span>'; } }, { label: 'Programme', render: function (s) { return esc(s.programme); } },
        { label: 'Level', render: function (s) { return 'Year ' + s.year; } }, { label: 'Status', render: function (s) { return UI.badge(s.status); } },
        { label: '', cls: 'actions', render: function (s) { return '<div class="btn-row" style="justify-content:flex-end"><a class="btn btn-secondary btn-sm" href="#/registrar/student/' + encodeURIComponent(s.regNo) + '" aria-label="View ' + esc(s.name) + ' ' + esc(s.regNo) + '">View</a>' + btn('editStudent', 'data-reg="' + esc(s.regNo) + '" aria-label="Edit ' + esc(s.name) + ' ' + esc(s.regNo) + '"', 'Edit', 'edit') + '</div>'; } }]
    });
  }
  function studentProfile(reg) {
    var s = Q.student(reg);
    if (!s) return App.pageHead('Student not found') + UI.alertBox('warn', 'No student has that registration number.') + '<p style="margin-top:16px"><a class="btn" href="#/registrar/students">Back to students</a></p>';
    var cs = Q.studentCourses(s, 'all'), res = Repo.list('results').filter(function (r) { return r.regNo === s.regNo; });
    return App.pageHead(s.name, esc(s.regNo), btn('editStudent', 'data-reg="' + esc(s.regNo) + '"', 'Edit student', 'edit', 'btn')) + '<div class="stack"><div class="card card-pad"><dl class="kv"><dt>Registration number</dt><dd>' + esc(s.regNo) + '</dd><dt>Email</dt><dd>' + esc(s.email) + '</dd>' +
      '<dt>Programme</dt><dd>' + esc(Q.progName(s.programme)) + '</dd><dt>Level</dt><dd>Year ' + s.year + '</dd><dt>Status</dt><dd>' + UI.badge(s.status) + '</dd></dl></div>' +
      '<div class="card"><div class="card-head"><h2>Courses at this level</h2></div>' + (cs.length ? UI.table([{ label: 'Course', render: function (c) { return '<a href="#/registrar/course/' + encodeURIComponent(c.code) + '">' + esc(c.code) + '</a> ' + esc(c.title); } }, { label: 'Semester', render: function (c) { return c.semester; } }, { label: 'Tutor', render: function (c) { return esc(Q.tutorName(c.tutorId)); } }], cs) : UI.emptyState('No courses', 'No courses are assigned to this programme and level.')) + '</div>' +
      '<div class="card"><div class="card-head"><h2>Result records</h2></div>' + (res.length ? UI.table([{ label: 'Course', render: function (r) { return esc(r.courseCode); } }, { label: 'Assessment', render: function (r) { return esc(r.assessment); } }, { label: 'Period', render: function (r) { return esc(Store.periodLabel(r.periodId)); } },
        { label: 'Marks', cls: 'num', render: function (r) { return r.marks + ' / ' + r.max; } }, { label: 'Visible to student', render: function (r) { return UI.badge(r.published ? 'Published' : 'Unpublished'); } }], res) : UI.emptyState('No result records', 'No results have been recorded for this student.')) + '</div></div>';
  }
  function openStudent(reg) {
    var s = reg ? Q.student(reg) : null, v = s || { regNo: '', name: '', email: '', programme: 'DMLS', year: 1, status: 'Active' };
    Modal.open({
      title: s ? 'Edit student' : 'Add demonstration student', submitLabel: s ? 'Save changes' : 'Add student',
      body: '<div class="form-grid">' + UI.field({ name: 'regNo', label: 'Registration number', required: true, value: v.regNo, readonly: !!s, placeholder: 'MLS/26/009', help: s ? 'The registration number cannot be changed.' : 'Format: 3 capital letters / 2-digit year / 3 digits' }) +
        UI.field({ name: 'name', label: 'Full name', required: true, value: v.name, maxlength: 80 }) + UI.field({ name: 'email', label: 'Email', type: 'email', required: true, value: v.email }) +
        UI.field({ name: 'programme', label: 'Programme', type: 'select', required: true, options: progOptions(!s), value: v.programme }) + UI.field({ name: 'year', label: 'Year of study', type: 'select', required: true, options: YEARS, value: String(v.year) }) +
        UI.field({ name: 'status', label: 'Status', type: 'select', required: true, options: ['Active', 'Deferred', 'Suspended', 'Graduated'], value: v.status }) + '</div><p class="small muted">Use fictional details only.</p>',
      onSubmit: function (form) {
        var r = UI.collect(form, {
          regNo: function (x) { x = x.toUpperCase(); return !/^[A-Z]{3}\/\d{2}\/\d{3}$/.test(x) ? 'Use the format MLS/26/009.' : (!s && Q.student(x) ? 'This registration number already exists.' : ''); },
          name: function (x) { return x.length < 3 ? 'Enter the full name.' : ''; }, email: function (x) { return EMAIL.test(x) ? '' : 'Enter a valid email address.'; }
        });
        if (!r.ok) return false;
        var x = r.values, rec = { regNo: x.regNo.toUpperCase(), name: x.name, email: x.email, programme: x.programme, year: +x.year, status: x.status };
        if (s) { Repo.update('students', s.regNo, rec); Store.log('Student ' + rec.regNo + ' updated'); UI.toast('Student ' + rec.regNo + ' updated.'); }
        else { Repo.insert('students', rec); Store.log('Student ' + rec.regNo + ' added'); UI.toast('Student ' + rec.name + ' (' + rec.regNo + ') added.'); }
        App.refresh();
      }
    });
  }

  /* ---------------------------- tutors ---------------------------- */
  function tutors() {
    return App.pageHead('Tutor Management', 'Tutor directory and course assignments.', btn('editTutor', '', 'Add tutor', 'plus', 'btn')) + UI.listPage({
      id: 'rg-tutors', search: function (t) { return [t.staffNo, t.name, t.email, t.department].join(' '); }, searchLabel: 'Search tutors',
      filters: [{ key: 'status', label: 'Status', options: ['Active', 'Inactive'], test: function (t, v) { return t.status === v; } }],
      rows: function () { return Repo.list('tutors'); }, pageSize: 10, empty: { title: 'No tutors', msg: 'Add a demonstration tutor.' },
      columns: [{ label: 'Tutor', render: function (t) { return '<strong>' + esc(t.name) + '</strong><span class="cell-sub">' + esc(t.staffNo) + ' &middot; ' + esc(t.email) + '</span>'; } }, { label: 'Department', render: function (t) { return esc(t.department); } },
        { label: 'Assigned courses', render: function (t) { var cs = Q.tutorCourses(t.id); return cs.length ? cs.map(function (c) { return '<a href="#/registrar/course/' + encodeURIComponent(c.code) + '">' + esc(c.code) + '</a>'; }).join(', ') : '<span class="muted">None</span>'; } },
        { label: 'Status', render: function (t) { return UI.badge(t.status); } },
        { label: '', cls: 'actions', render: function (t) { return '<div class="btn-row" style="justify-content:flex-end">' + btn('assignCourses', 'data-id="' + esc(t.id) + '" aria-label="Assign courses to ' + esc(t.name) + '"', 'Assign courses', 'book') + btn('editTutor', 'data-id="' + esc(t.id) + '" aria-label="Edit ' + esc(t.name) + '"', 'Edit', 'edit') + '</div>'; } }]
    });
  }
  function openTutor(id) {
    var t = id ? Q.tutor(id) : null, v = t || { staffNo: '', name: '', email: '', department: '', status: 'Active' };
    Modal.open({
      title: t ? 'Edit tutor' : 'Add demonstration tutor', submitLabel: t ? 'Save changes' : 'Add tutor',
      body: '<div class="form-grid">' + UI.field({ name: 'staffNo', label: 'Staff number', required: true, value: v.staffNo, placeholder: 'TUT-005' }) + UI.field({ name: 'name', label: 'Full name', required: true, value: v.name }) +
        UI.field({ name: 'email', label: 'Email', type: 'email', required: true, value: v.email }) + UI.field({ name: 'department', label: 'Department', required: true, value: v.department }) +
        UI.field({ name: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'], value: v.status, required: true }) + '</div>',
      onSubmit: function (form) {
        var r = UI.collect(form, {
          staffNo: function (x) { var dup = Repo.list('tutors').some(function (o) { return o.staffNo.toLowerCase() === x.toLowerCase() && (!t || o.id !== t.id); }); return dup ? 'This staff number is already used.' : ''; },
          name: function (x) { return x.length < 3 ? 'Enter the full name.' : ''; }, email: function (x) { return EMAIL.test(x) ? '' : 'Enter a valid email address.'; }
        });
        if (!r.ok) return false;
        var x = r.values;
        if (t) { Repo.update('tutors', t.id, { staffNo: x.staffNo, name: x.name, email: x.email, department: x.department, status: x.status }); Store.log('Tutor ' + x.name + ' updated'); UI.toast('Tutor updated.'); }
        else { Repo.insert('tutors', { id: Store.uid('t'), staffNo: x.staffNo, name: x.name, email: x.email, department: x.department, status: x.status }); Store.log('Tutor ' + x.name + ' added'); UI.toast('Tutor ' + x.name + ' added.'); }
        App.refresh();
      }
    });
  }
  function openAssign(id) {
    var t = Q.tutor(id); if (!t) return;
    var list = Repo.list('courses').filter(function (c) { return c.status !== 'Archived'; }).map(function (c) {
      var other = c.tutorId && c.tutorId !== t.id ? ' (currently ' + Q.tutorName(c.tutorId) + ')' : '';
      return '<label class="check"><input type="checkbox" name="courses" value="' + esc(c.code) + '"' + (c.tutorId === t.id ? ' checked' : '') + '><span>' + esc(c.code + ' - ' + c.title) + '<span class="muted small">' + esc(other) + '</span></span></label>';
    }).join('');
    Modal.open({
      title: 'Assign courses to ' + t.name, submitLabel: 'Save assignments',
      body: '<p class="muted">Ticked courses are assigned to this tutor. Selecting a course that belongs to another tutor reassigns it.</p><div class="check-list" role="group" aria-label="Courses">' + list + '</div>',
      onSubmit: function (form) {
        var picked = Array.prototype.filter.call(form.elements.courses, function (e) { return e.checked; }).map(function (e) { return e.value; });
        Repo.list('courses').forEach(function (c) {
          if (picked.indexOf(c.code) >= 0) c.tutorId = t.id; else if (c.tutorId === t.id) c.tutorId = '';
        });
        Repo.save(); Store.log('Course assignments updated for ' + t.name); UI.toast('Assignments saved: ' + picked.length + ' course' + (picked.length === 1 ? '' : 's') + ' for ' + t.name + '.'); App.refresh();
      }
    });
  }

  /* ---------------------------- courses ---------------------------- */
  function courses() {
    return App.pageHead('Course Management', 'Create courses and assign them to programmes, levels, semesters and tutors.', btn('editCourse', '', 'Create course', 'plus', 'btn')) + UI.listPage({
      id: 'rg-courses', search: function (c) { return c.code + ' ' + c.title; }, searchLabel: 'Search by course code or title',
      filters: [{ key: 'prog', label: 'Programme', options: progOptions(), test: function (c, v) { return c.programme === v; } }, { key: 'year', label: 'Year', options: YEARS, test: function (c, v) { return String(c.year) === v; } },
        { key: 'sem', label: 'Semester', options: SEMS, test: function (c, v) { return String(c.semester) === v; } }, { key: 'status', label: 'Status', options: ['Active', 'Inactive', 'Archived'], test: function (c, v) { return c.status === v; } }],
      rows: function () { return Repo.list('courses'); }, pageSize: 10, empty: { title: 'No courses', msg: 'Create a course to get started.' },
      columns: [{ label: 'Course', render: function (c) { return '<a href="#/registrar/course/' + encodeURIComponent(c.code) + '"><strong>' + esc(c.code) + '</strong></a><span class="cell-sub">' + esc(c.title) + '</span>'; } }, { label: 'Programme', render: function (c) { return esc(c.programme); } },
        { label: 'Level', render: function (c) { return 'Year ' + c.year + ', Sem ' + c.semester; } }, { label: 'Tutor', render: function (c) { return esc(Q.tutorName(c.tutorId)); } },
        { label: 'Materials', cls: 'num', render: function (c) { return Q.materialCount(c.code); } }, { label: 'Status', render: function (c) { return UI.badge(c.status); } },
        { label: '', cls: 'actions', render: function (c) { return '<div class="btn-row" style="justify-content:flex-end"><a class="btn btn-secondary btn-sm" href="#/registrar/course/' + encodeURIComponent(c.code) + '" aria-label="View ' + esc(c.code) + '">View</a>' + btn('editCourse', 'data-code="' + esc(c.code) + '" aria-label="Edit ' + esc(c.code) + '"', 'Edit', 'edit') + '</div>'; } }]
    });
  }
  function openCourse(code) {
    var c = code ? Q.course(code) : null, v = c || { code: '', title: '', description: '', programme: 'DMLS', year: 1, semester: 1, tutorId: '', status: 'Active' };
    Modal.open({
      title: c ? 'Edit course' : 'Create course', submitLabel: c ? 'Save changes' : 'Create course', wide: true,
      body: '<div class="form-grid">' + UI.field({ name: 'code', label: 'Course code', required: true, value: v.code, readonly: !!c, placeholder: 'MLT301', help: c ? 'The course code cannot be changed.' : '3 capital letters and 3 digits' }) + UI.field({ name: 'title', label: 'Course title', required: true, value: v.title }) +
        UI.field({ name: 'description', label: 'Description', type: 'textarea', value: v.description, full: true, maxlength: 300 }) + UI.field({ name: 'programme', label: 'Programme', type: 'select', required: true, options: progOptions(!c), value: v.programme }) +
        UI.field({ name: 'year', label: 'Academic year or level', type: 'select', required: true, options: YEARS, value: String(v.year) }) + UI.field({ name: 'semester', label: 'Semester', type: 'select', required: true, options: SEMS, value: String(v.semester) }) +
        UI.field({ name: 'tutorId', label: 'Assigned tutor', type: 'select', placeholder: 'Unassigned', options: tutorOptions(), value: v.tutorId }) + UI.field({ name: 'status', label: 'Course status', type: 'select', required: true, options: ['Active', 'Inactive', 'Archived'], value: v.status }) + '</div>',
      onSubmit: function (form) {
        var r = UI.collect(form, {
          code: function (x) { x = x.toUpperCase(); return !/^[A-Z]{3}\d{3}$/.test(x) ? 'Use 3 capital letters and 3 digits, e.g. MLT301.' : (!c && Q.course(x) ? 'This course code already exists.' : ''); },
          title: function (x) { return x.length < 3 ? 'Enter the course title.' : ''; }
        });
        if (!r.ok) return false;
        var x = r.values, rec = { code: x.code.toUpperCase(), title: x.title, description: x.description || '', programme: x.programme, year: +x.year, semester: +x.semester, tutorId: x.tutorId || '', status: x.status };
        if (c) { Repo.update('courses', c.code, rec); Store.log('Course ' + rec.code + ' updated'); UI.toast('Course ' + rec.code + ' updated.'); }
        else { Repo.insert('courses', rec); Store.log('Course ' + rec.code + ' created'); UI.toast('Course ' + rec.code + ' created.'); }
        App.refresh();
      }
    });
  }

  /* ---------------------------- programmes ---------------------------- */
  function programmes() {
    return App.pageHead('Programme Management', 'Programmes group courses by level and semester.', btn('editProgramme', '', 'Add programme', 'plus', 'btn')) + UI.listPage({
      id: 'rg-progs', rows: function () { return Repo.list('programmes'); }, pageSize: 10,
      columns: [{ label: 'Programme', render: function (p) { return '<strong>' + esc(p.name) + '</strong><span class="cell-sub">' + esc(p.code) + '</span>'; } }, { label: 'Duration', render: function (p) { return p.years + ' years'; } },
        { label: 'Courses', cls: 'num', render: function (p) { return Repo.list('courses').filter(function (c) { return c.programme === p.code; }).length; } }, { label: 'Students', cls: 'num', render: function (p) { return Repo.list('students').filter(function (s) { return s.programme === p.code; }).length; } },
        { label: 'Status', render: function (p) { return UI.badge(p.status); } },
        { label: '', cls: 'actions', render: function (p) { return '<div class="btn-row" style="justify-content:flex-end">' + btn('viewProgramme', 'data-code="' + esc(p.code) + '" aria-label="View courses in ' + esc(p.code) + '"', 'View courses', 'book') + btn('editProgramme', 'data-code="' + esc(p.code) + '" aria-label="Edit ' + esc(p.code) + '"', 'Edit', 'edit') + '</div>'; } }]
    });
  }
  function openProgramme(code) {
    var p = code ? Q.programme(code) : null, v = p || { code: '', name: '', years: 3, status: 'Active', description: '' };
    Modal.open({
      title: p ? 'Edit programme' : 'Add programme', submitLabel: p ? 'Save changes' : 'Add programme',
      body: '<div class="form-grid">' + UI.field({ name: 'code', label: 'Programme code', required: true, value: v.code, readonly: !!p, placeholder: 'BMLS' }) + UI.field({ name: 'years', label: 'Duration (years)', type: 'number', required: true, value: v.years, min: 1, max: 6 }) +
        UI.field({ name: 'name', label: 'Programme name', required: true, value: v.name, full: true }) + UI.field({ name: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'], value: v.status, required: true }) +
        UI.field({ name: 'description', label: 'Description', type: 'textarea', value: v.description, full: true, maxlength: 300 }) + '</div>',
      onSubmit: function (form) {
        var r = UI.collect(form, {
          code: function (x) { x = x.toUpperCase(); return !/^[A-Z]{2,6}$/.test(x) ? 'Use 2 to 6 capital letters.' : (!p && Q.programme(x) ? 'This programme code already exists.' : ''); },
          years: function (x) { return !(+x >= 1 && +x <= 6) ? 'Enter a duration from 1 to 6 years.' : ''; }, name: function (x) { return x.length < 3 ? 'Enter the programme name.' : ''; }
        });
        if (!r.ok) return false;
        var x = r.values, rec = { code: x.code.toUpperCase(), name: x.name, years: +x.years, status: x.status, description: x.description || '' };
        if (p) { Repo.update('programmes', p.code, rec); UI.toast('Programme updated.'); } else { Repo.insert('programmes', rec); UI.toast('Programme ' + rec.code + ' added.'); }
        Store.log('Programme ' + rec.code + (p ? ' updated' : ' added')); App.refresh();
      }
    });
  }

  /* ---------------------------- academic periods ---------------------------- */
  function periods() {
    var active = Store.state.settings.activePeriodId;
    var rows = Repo.list('periods').slice().sort(function (a, b) { return a.start < b.start ? 1 : -1; });
    var t = UI.today();
    return App.pageHead('Academic Year and Semester Management', 'The active period is shown on course, examination and results screens.', btn('editPeriod', '', 'Add period', 'plus', 'btn')) +
      '<div class="card">' + UI.table([
        { label: 'Period', render: function (p) { return '<strong>' + esc(p.year) + ', Semester ' + p.semester + '</strong>'; } },
        { label: 'Dates', render: function (p) { return UI.fmtShort(p.start) + ' to ' + UI.fmtShort(p.end); } },
        { label: 'Timing', render: function (p) { return UI.badge(p.end < t ? 'Past' : p.start > t ? 'Upcoming' : 'In progress', p.end < t ? '' : 'blue'); } },
        { label: 'Records', render: function (p) { return Repo.list('exams').filter(function (e) { return e.periodId === p.id; }).length + ' exams, ' + Repo.list('results').filter(function (r) { return r.periodId === p.id; }).length + ' results'; } },
        { label: 'Demo status', render: function (p) { return p.id === active ? '<span class="badge badge-green">' + icon('check') + 'Active period</span>' : '<span class="badge">Not active</span>'; } },
        { label: '', cls: 'actions', render: function (p) { return p.id === active ? '' : btn('setPeriod', 'data-id="' + esc(p.id) + '" aria-label="Make ' + esc(p.year + ' semester ' + p.semester) + ' the active period"', 'Make active', 'check'); } }
      ], rows, { caption: 'Academic periods' }) + '</div>';
  }
  function openPeriod() {
    Modal.open({
      title: 'Add academic period', submitLabel: 'Add period',
      body: '<div class="form-grid">' + UI.field({ name: 'year', label: 'Academic year', required: true, placeholder: '2027/2028', help: 'Format: 2027/2028' }) + UI.field({ name: 'semester', label: 'Semester', type: 'select', required: true, options: SEMS }) +
        UI.field({ name: 'start', label: 'Start date', type: 'date', required: true }) + UI.field({ name: 'end', label: 'End date', type: 'date', required: true }) + '</div>',
      onSubmit: function (form) {
        var r = UI.collect(form, {
          year: function (x) { var m = /^(\d{4})\/(\d{4})$/.exec(x); return !m || +m[2] !== +m[1] + 1 ? 'Use consecutive years such as 2027/2028.' : ''; },
          end: function (x, v) { return v.start && x <= v.start ? 'The end date must be after the start date.' : ''; }
        });
        if (!r.ok) return false;
        var x = r.values, id = 'P' + x.year.slice(2, 4) + x.year.slice(7, 9) + 'S' + x.semester;
        if (Repo.get('periods', id)) { UI.setFieldError(form, 'year', 'This academic period already exists.'); return false; }
        Repo.insert('periods', { id: id, year: x.year, semester: +x.semester, start: x.start, end: x.end }); Store.log('Academic period ' + x.year + ' S' + x.semester + ' added'); UI.toast('Academic period added.'); App.refresh();
      }
    });
  }

  /* ---------------------------- examinations ---------------------------- */
  function exams() {
    return App.pageHead('Examination Management', 'Schedule examinations. Students see the title, date, time, venue and instructions.', btn('editExam', '', 'Schedule examination', 'plus', 'btn')) + UI.listPage({
      id: 'rg-exams', search: function (e) { return [e.title, e.courseCode, e.venue].join(' '); }, searchLabel: 'Search by title, course or venue',
      filters: [{ key: 'status', label: 'Status', options: ['Scheduled', 'Completed', 'Postponed', 'Cancelled'], test: function (e, v) { return e.status === v; } }, { key: 'course', label: 'Course', options: courseOptions(), test: function (e, v) { return e.courseCode === v; } },
        { key: 'period', label: 'Academic period', options: periodOptions(), test: function (e, v) { return e.periodId === v; } }],
      rows: function () { return Repo.list('exams').slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; }); }, pageSize: 10, empty: { title: 'No examinations', msg: 'Schedule an examination to get started.' },
      columns: [{ label: 'Examination', render: function (e) { return '<strong>' + esc(e.title) + '</strong><span class="cell-sub">' + esc(Store.periodLabel(e.periodId)) + '</span>'; } }, { label: 'Course', render: function (e) { return esc(e.courseCode); } },
        { label: 'Date and time', render: function (e) { return UI.fmtShort(e.date) + '<span class="cell-sub">' + UI.fmtTime(e.time) + '</span>'; } }, { label: 'Venue', render: function (e) { return esc(e.venue); } }, { label: 'Status', render: function (e) { return UI.badge(e.status); } },
        { label: '', cls: 'actions', render: function (e) { return '<div class="btn-row" style="justify-content:flex-end">' + btn('editExam', 'data-id="' + esc(e.id) + '" aria-label="Edit ' + esc(e.title) + '"', 'Edit', 'edit') + btn('deleteExam', 'data-id="' + esc(e.id) + '" aria-label="Delete ' + esc(e.title) + '"', 'Delete', 'trash') + '</div>'; } }]
    });
  }
  function openExam(id) {
    var e = id ? Repo.get('exams', id) : null, v = e || { title: '', courseCode: '', periodId: Store.activePeriod().id, date: '', time: '09:00', venue: '', duration: '', instructions: '', status: 'Scheduled' };
    Modal.open({
      title: e ? 'Edit examination' : 'Schedule examination', submitLabel: e ? 'Save changes' : 'Create examination', wide: true,
      body: '<div class="form-grid">' + UI.field({ name: 'title', label: 'Examination title', required: true, value: v.title, full: true }) + UI.field({ name: 'courseCode', label: 'Course', type: 'select', required: true, placeholder: 'Select a course', options: courseOptions(), value: v.courseCode }) +
        UI.field({ name: 'periodId', label: 'Academic period', type: 'select', required: true, options: periodOptions(), value: v.periodId }) + UI.field({ name: 'date', label: 'Date', type: 'date', required: true, value: v.date }) + UI.field({ name: 'time', label: 'Time', type: 'time', required: true, value: v.time }) +
        UI.field({ name: 'venue', label: 'Venue', required: true, value: v.venue }) + UI.field({ name: 'duration', label: 'Duration', value: v.duration, placeholder: '2 hours' }) +
        UI.field({ name: 'status', label: 'Status', type: 'select', required: true, options: ['Scheduled', 'Completed', 'Postponed', 'Cancelled'], value: v.status }) + UI.field({ name: 'instructions', label: 'Instructions', type: 'textarea', value: v.instructions, full: true, maxlength: 300 }) + '</div>',
      onSubmit: function (form) {
        var r = UI.collect(form, { title: function (x) { return x.length < 3 ? 'Enter the examination title.' : ''; } }); if (!r.ok) return false;
        var x = r.values, rec = { title: x.title, courseCode: x.courseCode, periodId: x.periodId, date: x.date, time: x.time, venue: x.venue, duration: x.duration, instructions: x.instructions, status: x.status };
        if (e) { Repo.update('exams', e.id, rec); UI.toast('Examination updated.'); } else { rec.id = Store.uid('e'); Repo.insert('exams', rec); UI.toast('Examination scheduled for ' + UI.fmtShort(rec.date) + '.'); }
        Store.log('Examination "' + rec.title + '" ' + (e ? 'updated' : 'scheduled')); App.refresh();
      }
    });
  }

  /* ---------------------------- results management ---------------------------- */
  function resultRows(key) { return Q.groupRecords(key); }
  function results() {
    var withResults = {}; Repo.list('results').forEach(function (r) { withResults[r.courseCode] = 1; });
    var years = {}; Repo.list('periods').forEach(function (p) { years[p.year] = 1; });
    return App.pageHead('Examination Results Management', 'Imported results stay unpublished until you explicitly publish them. Students never see unpublished results.', '<a class="btn" href="#/registrar/import">' + icon('upload') + 'Import from Excel</a>') + UI.listPage({
      id: 'rg-results', search: function (g) { return g.courseCode + ' ' + g.assessment; }, searchLabel: 'Search by course or assessment',
      filters: [{ key: 'prog', label: 'Programme', options: progOptions(), test: function (g, v) { var c = Q.course(g.courseCode); return c && c.programme === v; } },
        { key: 'course', label: 'Course', options: Object.keys(withResults).map(function (c) { return [c, Q.courseLabel(c)]; }), test: function (g, v) { return g.courseCode === v; } },
        { key: 'year', label: 'Academic year', options: Object.keys(years), test: function (g, v) { var p = Repo.get('periods', g.periodId); return p && p.year === v; } },
        { key: 'sem', label: 'Semester', options: SEMS, test: function (g, v) { var p = Repo.get('periods', g.periodId); return p && String(p.semester) === v; } },
        { key: 'status', label: 'Status', options: ['Published', 'Unpublished', 'Partly published'], test: function (g, v) { return g.status === v; } }],
      rows: function () { return Q.resultGroups().sort(function (a, b) { return a.status === 'Published' ? 1 : -1; }); }, pageSize: 10, empty: { title: 'No result records', msg: 'Import results from an Excel file to see them here.', action: '<a class="btn" href="#/registrar/import">Import results</a>' },
      columns: [{ label: 'Course', render: function (g) { return '<strong>' + esc(g.courseCode) + '</strong><span class="cell-sub">' + esc((Q.course(g.courseCode) || {}).title || 'Unknown course') + '</span>'; } }, { label: 'Assessment', render: function (g) { return esc(g.assessment); } },
        { label: 'Period', render: function (g) { return esc(Store.periodLabel(g.periodId)); } }, { label: 'Records', cls: 'num', render: function (g) { return g.count; } },
        { label: 'Status', render: function (g) { return g.status === 'Partly published' ? '<span class="badge badge-amber">' + icon('clock') + 'Partly published</span>' : UI.badge(g.status); } },
        { label: '', cls: 'actions', render: function (g) {
          var k = 'data-key="' + esc(g.key) + '"';
          return '<div class="btn-row" style="justify-content:flex-end">' + btn('reviewResults', k + ' aria-label="Review ' + esc(g.courseCode + ' ' + g.assessment) + '"', 'Review', 'eye') + btn('previewResults', k, 'Student preview', 'user') +
            (g.status === 'Published' ? btn('unpublishResults', k + ' aria-label="Unpublish ' + esc(g.courseCode + ' ' + g.assessment) + '"', 'Unpublish', 'x') : btn('publishResults', k + ' aria-label="Publish ' + esc(g.courseCode + ' ' + g.assessment) + '"', 'Publish', 'check', 'btn btn-success btn-sm')) + '</div>';
        } }]
    });
  }
  function reviewResults(key) {
    var recs = resultRows(key), p = key.split('|'), shown = recs.slice(0, 100);
    Modal.open({
      title: 'Review: ' + p[0] + ', ' + p[2], wide: true,
      body: '<p class="muted">' + esc(Store.periodLabel(p[1])) + ' &middot; ' + recs.length + ' records</p>' + UI.table([
        { label: 'Reg. number', render: function (r) { return esc(r.regNo); } }, { label: 'Student', render: function (r) { var s = Q.student(r.regNo); return esc(s ? s.name : 'Unknown student'); } },
        { label: 'Marks', cls: 'num', render: function (r) { return r.marks + ' / ' + r.max; } }, { label: '%', cls: 'num', render: function (r) { return UI.pct(r.marks, r.max); } }, { label: 'Grade', render: function (r) { return UI.grade(UI.pct(r.marks, r.max)); } },
        { label: 'Status', render: function (r) { return UI.badge(r.published ? 'Published' : 'Unpublished'); } }], shown, { caption: 'Result records' }) + (recs.length > shown.length ? '<p class="small muted">Showing the first ' + shown.length + ' of ' + recs.length + ' records.</p>' : '')
    });
  }
  function studentView(recs, reg) {
    var s = Q.student(reg), mine = recs.filter(function (r) { return r.regNo === reg; });
    return '<div class="preview-box"><p class="small muted" style="margin-bottom:8px">Preview of what ' + esc(s ? s.name : reg) + ' will see after publication. Unpublished records are never shown to students.</p>' +
      UI.table([{ label: 'Course', render: function (r) { return esc(Q.courseLabel(r.courseCode)); } }, { label: 'Assessment', render: function (r) { return esc(r.assessment); } }, { label: 'Marks', cls: 'num', render: function (r) { return r.marks + ' / ' + r.max; } },
        { label: 'Percentage', cls: 'num', render: function (r) { return UI.pct(r.marks, r.max) + '%'; } }, { label: 'Grade', render: function (r) { return '<strong>' + UI.grade(UI.pct(r.marks, r.max)) + '</strong>'; } }], mine, { caption: 'Student view' }) + '</div>';
  }
  function setPublished(key, value) {
    var recs = resultRows(key); recs.forEach(function (r) { r.published = value; }); Repo.save();
    var p = key.split('|'); Store.log('Results ' + p[0] + ' ' + p[2] + (value ? ' published' : ' unpublished'));
    UI.toast((value ? 'Published ' : 'Unpublished ') + recs.length + ' result' + (recs.length === 1 ? '' : 's') + ' for ' + p[0] + ', ' + p[2] + '.'); App.refresh();
  }

  /* ---------------------------- materials overview ---------------------------- */
  function materials() {
    return App.pageHead('Learning Materials Overview', 'Review materials uploaded across all courses.') + UI.listPage({
      id: 'rg-mats', search: function (m) { return m.title + ' ' + m.description + ' ' + m.courseCode; }, searchLabel: 'Search materials',
      filters: [{ key: 'course', label: 'Course', options: courseOptions(), test: function (m, v) { return m.courseCode === v; } }, { key: 'cat', label: 'Type', options: MLS.Shared.CATEGORIES, test: function (m, v) { return m.category === v; } },
        { key: 'tutor', label: 'Tutor', options: tutorOptions(), test: function (m, v) { return m.tutorId === v; } }],
      rows: function () { return Q.materialsOf(Repo.list('courses').map(function (c) { return c.code; })); }, pageSize: 10, empty: { title: 'No materials', msg: 'No learning materials have been uploaded yet.' },
      columns: [{ label: 'Title', render: MLS.Shared.materialTitleCell }, { label: 'Course', render: function (m) { return esc(m.courseCode); } }, { label: 'Tutor', render: function (m) { return esc(Q.tutorName(m.tutorId)); } },
        { label: 'Type', render: function (m) { return UI.badge(m.category, 'blue'); } }, { label: 'Uploaded', render: function (m) { return UI.fmtShort(m.uploadedAt); } },
        { label: '', cls: 'actions', render: function (m) { return '<div class="btn-row" style="justify-content:flex-end">' + btn('openMaterial', 'data-id="' + esc(m.id) + '" aria-label="Open ' + esc(m.title) + '"', 'Open', 'eye') + btn('deleteMaterial', 'data-id="' + esc(m.id) + '" aria-label="Remove ' + esc(m.title) + '"', 'Remove', 'trash') + '</div>'; } }]
    });
  }

  /* ---------------------------- announcements ---------------------------- */
  function announcements(p, user) {
    var all = Repo.list('notifications').slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; }), read = Store.state.readNotifs[user.id] || [];
    var form = '<form data-submit="postAnnouncement" novalidate><div class="form-grid">' + UI.field({ name: 'title', label: 'Title', required: true, maxlength: 100, full: true }) +
      UI.field({ name: 'audience', label: 'Audience', type: 'select', required: true, options: [['all', 'Everyone'], ['student', 'Students only'], ['tutor', 'Tutors only']], value: 'all' }) +
      UI.field({ name: 'body', label: 'Message', type: 'textarea', required: true, rows: 3, maxlength: 400, full: true }) + '</div><div class="form-actions"><button class="btn" type="submit">' + icon('megaphone') + 'Post announcement</button></div></form>';
    return App.pageHead('Announcements and Notifications', 'Post announcements that appear in student and tutor notifications.', '<button type="button" class="btn btn-secondary" data-action="markAllRead">' + icon('check') + 'Mark mine as read</button>') +
      '<div class="stack"><div class="card card-pad"><h2 style="margin-bottom:12px">New announcement</h2>' + form + '</div><div class="card"><div class="card-head"><h2>All announcements</h2></div>' + all.map(function (n) {
        var isNew = (n.audience === 'all' || n.audience === 'registrar') && read.indexOf(n.id) < 0;
        return '<div class="list-item"><div class="li-ic' + (isNew ? ' amber' : '') + '">' + icon('bell') + '</div><div class="li-main"><div class="li-title">' + esc(n.title) + ' ' + UI.badge({ all: 'Everyone', student: 'Students', tutor: 'Tutors', registrar: 'Registrar' }[n.audience], 'blue') + (isNew ? ' ' + UI.badge('New', 'amber') : '') + '</div><div>' + esc(n.body) + '</div><div class="small muted">' + UI.fmtDate(n.date) + '</div></div>' +
          btn('deleteNotif', 'data-id="' + esc(n.id) + '" aria-label="Delete announcement ' + esc(n.title) + '"', 'Delete', 'trash') + '</div>';
      }).join('') + '</div></div>';
  }

  /* ---------------------------- reports ---------------------------- */
  function bars(rows) {
    var max = Math.max.apply(null, rows.map(function (r) { return r[1]; }).concat([1]));
    return rows.map(function (r) { return '<div class="bar-row"><span>' + esc(r[0]) + '</span><div class="bar" aria-hidden="true"><span style="width:' + Math.round(r[1] / max * 100) + '%"></span></div><strong>' + r[1] + (r[2] || '') + '</strong></div>'; }).join('') || '<p class="muted">No data.</p>';
  }
  function reports() {
    var st = Repo.list('students'), perProg = Repo.list('programmes').map(function (p) { return [p.code + ' - ' + p.name, st.filter(function (s) { return s.programme === p.code; }).length]; });
    var perCourse = Repo.list('courses').map(function (c) { return [c.code + ' ' + c.title, Q.materialCount(c.code)]; });
    var perf = {}; Repo.list('results').filter(function (r) { return r.published; }).forEach(function (r) { var o = perf[r.courseCode] || (perf[r.courseCode] = { n: 0, sum: 0, pass: 0 }); var pc = UI.pct(r.marks, r.max); o.n++; o.sum += pc; if (pc >= 50) o.pass++; });
    var perfRows = Object.keys(perf).map(function (k) { return [k, Math.round(perf[k].sum / perf[k].n), '%']; });
    var passRows = Object.keys(perf).map(function (k) { return [k, Math.round(perf[k].pass / perf[k].n * 100), '%']; });
    var exp = function (kind, label) { return btn('exportCsv', 'data-kind="' + kind + '"', label, 'download'); };
    return App.pageHead('Reports', 'Summaries of the demonstration data. Exports are generated in your browser.') + '<div class="stack"><div class="card card-pad"><h2 style="margin-bottom:12px">Export CSV</h2><div class="btn-row">' + exp('students', 'Students') + exp('courses', 'Courses') + exp('exams', 'Examinations') + exp('results', 'Results (all records)') + '</div></div>' +
      '<div class="grid grid-2"><div class="card card-pad"><h2>Students per programme</h2>' + bars(perProg) + '</div><div class="card card-pad"><h2>Materials per course</h2>' + bars(perCourse) + '</div>' +
      '<div class="card card-pad"><h2>Average mark by course (published only)</h2>' + bars(perfRows) + '</div><div class="card card-pad"><h2>Pass rate by course, 50% or more (published only)</h2>' + bars(passRows) + '</div></div></div>';
  }

  /* ---------------------------- profile and settings ---------------------------- */
  function profile(p, user) {
    return App.pageHead('Registrar Profile') + '<div class="card card-pad"><div style="display:flex;gap:16px;align-items:center;margin-bottom:18px"><div class="avatar avatar-lg">' + esc(UI.initials(user.name)) + '</div><div><h2>' + esc(user.name) + '</h2><div class="muted">Registrar</div></div></div>' +
      '<dl class="kv"><dt>Email</dt><dd>' + esc(user.email) + '</dd><dt>Role</dt><dd>Registrar (administrative access in this demo)</dd><dt>Active period</dt><dd>' + esc(Store.periodLabel(Store.activePeriod().id)) + '</dd></dl></div>';
  }
  function settings() {
    var s = Store.state.settings;
    return App.pageHead('System Settings', 'Demonstration settings. Real settings will live on the server.') + '<div class="stack"><div class="card card-pad"><h2 style="margin-bottom:12px">General</h2><form data-submit="saveSettings" novalidate><div class="form-grid">' +
      UI.field({ name: 'institutionName', label: 'Institution display name', required: true, value: s.institutionName, maxlength: 80 }) + UI.field({ name: 'activePeriodId', label: 'Active academic period', type: 'select', required: true, options: periodOptions(), value: s.activePeriodId }) +
      UI.field({ name: 'maxFileMB', label: 'Maximum upload size (MB)', type: 'number', required: true, value: s.maxFileMB, min: 1, max: 10, help: 'Applies to tutor uploads in this demo.' }) + '</div><div class="form-actions"><button class="btn" type="submit">Save settings</button></div></form></div>' +
      '<div class="card card-pad"><h2 style="margin-bottom:8px">Demonstration data</h2><p class="muted">Changes you make are kept in this browser only (localStorage) and are not shared with other devices. Uploaded files are held in memory and disappear on refresh.</p>' +
      '<div class="btn-row">' + btn('exportDemo', '', 'Download demo data (JSON)', 'download') + btn('resetDemo', '', 'Reset demo data', 'trash', 'btn btn-danger') + '</div></div>' +
      '<div class="card card-pad"><h2 style="margin-bottom:8px">What is real and what is simulated</h2><ul style="display:grid;gap:6px"><li>' + icon('check') + ' Working in the browser: navigation, search, filters, forms, validation, tables, Excel parsing and import preview, publishing.</li>' +
      '<li>' + icon('alert') + ' Simulated: sign-in, role enforcement, file storage, notifications delivery and multi-user data sharing.</li></ul>' + UI.alertBox('warn', 'A production system needs a trusted backend for authentication, role-based access, a database, private file storage, server-side import validation and audit logs.') + '</div></div>';
  }

  /* ---------------------------- actions ---------------------------- */
  UI.register({
    editStudent: function (d) { openStudent(d.reg); }, editTutor: function (d) { openTutor(d.id); }, assignCourses: function (d) { openAssign(d.id); },
    editCourse: function (d) { openCourse(d.code); }, editProgramme: function (d) { openProgramme(d.code); }, editPeriod: openPeriod, editExam: function (d) { openExam(d.id); },
    viewProgramme: function (d) {
      var p = Q.programme(d.code), cs = Repo.list('courses').filter(function (c) { return c.programme === d.code; });
      Modal.open({ title: 'Courses in ' + p.name, wide: true, body: cs.length ? UI.table([{ label: 'Course', render: function (c) { return '<a href="#/registrar/course/' + encodeURIComponent(c.code) + '" data-modal-close>' + esc(c.code) + '</a> ' + esc(c.title); } }, { label: 'Level', render: function (c) { return 'Year ' + c.year + ', Sem ' + c.semester; } }, { label: 'Tutor', render: function (c) { return esc(Q.tutorName(c.tutorId)); } }], cs) : UI.emptyState('No courses yet', 'No courses are assigned to this programme.') });
    },
    setPeriod: function (d) {
      UI.confirm({ title: 'Change the active period?', html: '<p>Set <strong>' + esc(Store.periodLabel(d.id)) + '</strong> as the active demonstration period. Course lists for students will follow its semester.</p>', confirmLabel: 'Make active' }).then(function (ok) {
        if (!ok) return; Store.state.settings.activePeriodId = d.id; Repo.save(); Store.log('Active period set to ' + Store.periodLabel(d.id)); UI.toast('Active period is now ' + Store.periodLabel(d.id) + '.'); App.refresh();
      });
    },
    deleteExam: function (d) {
      var e = Repo.get('exams', d.id); if (!e) return;
      UI.confirm({ title: 'Delete this examination?', html: '<p><strong>' + esc(e.title) + '</strong> will be removed and students will no longer see it.</p>', confirmLabel: 'Delete examination', danger: true }).then(function (ok) {
        if (!ok) return; Repo.remove('exams', e.id); Store.log('Examination "' + e.title + '" deleted'); UI.toast('Examination deleted.'); App.refresh();
      });
    },
    reviewResults: function (d) { reviewResults(d.key); },
    previewResults: function (d) {
      var recs = resultRows(d.key), regs = recs.map(function (r) { return r.regNo; });
      Modal.open({ title: 'Student preview', wide: true, body: '<div class="field"><label for="prev-sel">Student</label><select id="prev-sel" data-change="previewStudent" data-key="' + esc(d.key) + '">' +
        regs.map(function (r) { var s = Q.student(r); return '<option value="' + esc(r) + '">' + esc(r + ' - ' + (s ? s.name : 'Unknown')) + '</option>'; }).join('') + '</select></div><div id="prev-region" style="margin-top:14px">' + (regs.length ? studentView(recs, regs[0]) : '') + '</div>' });
    },
    previewStudent: function (d, el) { var region = document.getElementById('prev-region'); if (region) region.innerHTML = studentView(resultRows(d.key), el.value); },
    publishResults: function (d) {
      var recs = resultRows(d.key), p = d.key.split('|'), unknown = recs.filter(function (r) { return !Q.student(r.regNo); }).length;
      UI.confirm({ title: 'Publish these results?', confirmLabel: 'Publish results', html: '<p>You are about to publish <strong>' + recs.length + '</strong> result' + (recs.length === 1 ? '' : 's') + ' for <strong>' + esc(Q.courseLabel(p[0])) + '</strong>, ' + esc(p[2]) + ' (' + esc(Store.periodLabel(p[1])) + ').</p><p>Each student will be able to see their own marks immediately. ' + (unknown ? '<strong>' + unknown + ' record(s) belong to unknown registration numbers.</strong> ' : '') + 'You can unpublish later.</p>' }).then(function (ok) { if (ok) setPublished(d.key, true); });
    },
    unpublishResults: function (d) {
      UI.confirm({ title: 'Unpublish these results?', html: '<p>Students will no longer see these results until they are published again.</p>', confirmLabel: 'Unpublish', danger: true }).then(function (ok) { if (ok) setPublished(d.key, false); });
    },
    postAnnouncement: function (d, form) {
      var r = UI.collect(form, { title: function (x) { return x.length < 3 ? 'Enter a title of at least 3 characters.' : ''; }, body: function (x) { return x.length < 5 ? 'Enter a message.' : ''; } }); if (!r.ok) return;
      Repo.insert('notifications', { id: Store.uid('n'), audience: r.values.audience, title: r.values.title, body: r.values.body, date: UI.today() }); Store.log('Announcement "' + r.values.title + '" posted'); UI.toast('Announcement posted.'); App.refresh();
    },
    deleteNotif: function (d) {
      var n = Repo.get('notifications', d.id); if (!n) return;
      UI.confirm({ title: 'Delete this announcement?', html: '<p><strong>' + esc(n.title) + '</strong> will be removed for everyone.</p>', confirmLabel: 'Delete', danger: true }).then(function (ok) { if (ok) { Repo.remove('notifications', n.id); UI.toast('Announcement deleted.'); App.refresh(); } });
    },
    exportCsv: function (d) {
      var rows;
      if (d.kind === 'students') rows = [['Registration number', 'Name', 'Email', 'Programme', 'Year', 'Status']].concat(Repo.list('students').map(function (s) { return [s.regNo, s.name, s.email, s.programme, s.year, s.status]; }));
      else if (d.kind === 'courses') rows = [['Code', 'Title', 'Programme', 'Year', 'Semester', 'Tutor', 'Status']].concat(Repo.list('courses').map(function (c) { return [c.code, c.title, c.programme, c.year, c.semester, Q.tutorName(c.tutorId), c.status]; }));
      else if (d.kind === 'exams') rows = [['Title', 'Course', 'Period', 'Date', 'Time', 'Venue', 'Status']].concat(Repo.list('exams').map(function (e) { return [e.title, e.courseCode, Store.periodLabel(e.periodId), e.date, e.time, e.venue, e.status]; }));
      else rows = [['Registration number', 'Course', 'Period', 'Assessment', 'Marks', 'Maximum', 'Published']].concat(Repo.list('results').map(function (r) { return [r.regNo, r.courseCode, Store.periodLabel(r.periodId), r.assessment, r.marks, r.max, r.published ? 'Yes' : 'No']; }));
      UI.downloadBlob(new Blob([UI.toCSV(rows)], { type: 'text/csv' }), 'demo-' + d.kind + '.csv'); UI.toast('Export created (fictional demo data).');
    },
    saveSettings: function (d, form) {
      var r = UI.collect(form, { maxFileMB: function (x) { return !(+x >= 1 && +x <= 10) ? 'Enter a size from 1 to 10 MB.' : ''; } }); if (!r.ok) return;
      Object.assign(Store.state.settings, { institutionName: r.values.institutionName, activePeriodId: r.values.activePeriodId, maxFileMB: +r.values.maxFileMB }); Repo.save(); Store.log('System settings saved'); UI.toast('Settings saved.'); App.refresh();
    },
    exportDemo: function () {
      var copy = JSON.parse(JSON.stringify(Store.state)); delete copy.users;
      UI.downloadBlob(new Blob([JSON.stringify(copy, null, 2)], { type: 'application/json' }), 'mls-demo-data.json'); UI.toast('Demo data downloaded.');
    },
    resetDemo: function () {
      UI.confirm({ title: 'Reset all demonstration data?', html: '<p>All changes you made (students, courses, uploads, imported results and settings) will be erased and the original fictional data restored.</p>', confirmLabel: 'Reset demo data', danger: true }).then(function (ok) {
        if (!ok) return; Store.reset(); if (MLS.ImportFlow) MLS.ImportFlow.reset(); UI.toast('Demonstration data was reset.'); App.refresh();
      });
    }
  });

  R('registrar', 'dashboard', { title: 'Registrar Dashboard', render: dashboard });
  R('registrar', 'students', { title: 'Student Management', render: students });
  R('registrar', 'student', { title: function (p) { var s = Q.student(p); return s ? s.name : 'Student profile'; }, nav: 'students', crumbs: function (p) { return [['Home', '#/registrar/dashboard'], ['Students', '#/registrar/students'], [p]]; }, render: studentProfile });
  R('registrar', 'tutors', { title: 'Tutor Management', render: tutors }); R('registrar', 'courses', { title: 'Course Management', render: courses });
  R('registrar', 'programmes', { title: 'Programme Management', render: programmes }); R('registrar', 'periods', { title: 'Academic Periods', render: periods });
  R('registrar', 'exams', { title: 'Examination Management', render: exams }); R('registrar', 'results', { title: 'Results Management', render: results });
  R('registrar', 'materials', { title: 'Learning Materials Overview', render: materials }); R('registrar', 'announcements', { title: 'Announcements', render: announcements });
  R('registrar', 'reports', { title: 'Reports', render: reports }); R('registrar', 'profile', { title: 'Registrar Profile', render: profile }); R('registrar', 'settings', { title: 'System Settings', render: settings });
})();
