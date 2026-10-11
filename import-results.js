/* ==========================================================================
   import-results.js - Excel/CSV results import workflow (registrar).

   Stages:  1 Select file  ->  2 Validate and preview  ->  3 Confirm import
            ->  4 Review and publish (publishing is a separate, explicit action)

   The .xlsx reader below is a small dependency-free parser (ZIP + XML using
   browser built-ins: DecompressionStream and DOMParser), so no external
   library or CDN is needed. It reads the FIRST worksheet of an .xlsx file.
   Legacy .xls files are not supported - save as .xlsx or .csv.

   SECURITY: browser-side validation is a convenience only. The production
   backend must re-validate every row, authenticate the registrar, enforce
   permissions, write an audit log and control when results become visible.
   ========================================================================== */
(function () {
  'use strict';
  var MLS = window.MLS, UI = MLS.UI, Repo = MLS.Repo, Store = MLS.Store, App = MLS.App, Q = UI.Q, esc = UI.esc, icon = UI.icon;
  var MAX_BYTES = 8 * 1024 * 1024, PAGE = 25;

  /* ---------------- file readers ---------------- */
  async function inflateRaw(u8) {
    var stream = new Blob([u8]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }
  function readZipIndex(buf) {
    var u8 = new Uint8Array(buf), dv = new DataView(buf), i = u8.length - 22, files = {};
    for (; i >= Math.max(0, u8.length - 65557); i--) { if (dv.getUint32(i, true) === 0x06054b50) break; }
    if (i < 0 || dv.getUint32(i, true) !== 0x06054b50) throw new Error('Not a valid .xlsx file.');
    var count = dv.getUint16(i + 10, true), off = dv.getUint32(i + 16, true), dec = new TextDecoder();
    for (var n = 0; n < count; n++) {
      if (dv.getUint32(off, true) !== 0x02014b50) break;
      var nlen = dv.getUint16(off + 28, true), elen = dv.getUint16(off + 30, true), clen = dv.getUint16(off + 32, true);
      files[dec.decode(u8.subarray(off + 46, off + 46 + nlen))] = { method: dv.getUint16(off + 10, true), csize: dv.getUint32(off + 20, true), lho: dv.getUint32(off + 42, true) };
      off += 46 + nlen + elen + clen;
    }
    return { u8: u8, dv: dv, files: files };
  }
  async function zipText(zip, name) {
    var e = zip.files[name]; if (!e) return null;
    var nlen = zip.dv.getUint16(e.lho + 26, true), elen = zip.dv.getUint16(e.lho + 28, true), start = e.lho + 30 + nlen + elen;
    var data = zip.u8.subarray(start, start + e.csize);
    if (e.method === 8) data = await inflateRaw(data); else if (e.method !== 0) throw new Error('Unsupported compression in the workbook.');
    return new TextDecoder('utf-8').decode(data);
  }
  function xml(text) { return new DOMParser().parseFromString(text, 'application/xml'); }
  function els(node, tag) { return Array.prototype.slice.call(node.getElementsByTagNameNS('*', tag)); }
  function colIndex(ref) { var m = /^([A-Z]+)/.exec(ref || ''), n = 0; if (!m) return 0; for (var i = 0; i < m[1].length; i++) n = n * 26 + (m[1].charCodeAt(i) - 64); return n - 1; }

  async function readXlsx(buf) {
    var zip = readZipIndex(buf), shared = [];
    var sst = await zipText(zip, 'xl/sharedStrings.xml');
    if (sst) shared = els(xml(sst), 'si').map(function (si) { return els(si, 't').map(function (t) { return t.textContent; }).join(''); });
    var sheetPath = 'xl/worksheets/sheet1.xml', wb = await zipText(zip, 'xl/workbook.xml'), rels = await zipText(zip, 'xl/_rels/workbook.xml.rels');
    if (wb && rels) {
      var first = els(xml(wb), 'sheet')[0];
      if (first) {
        var rid = first.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id') || first.getAttribute('r:id');
        var rel = els(xml(rels), 'Relationship').filter(function (r) { return r.getAttribute('Id') === rid; })[0];
        if (rel) { var t = rel.getAttribute('Target'); sheetPath = t.charAt(0) === '/' ? t.slice(1) : 'xl/' + t.replace(/^\.\//, ''); }
      }
    }
    var sheet = await zipText(zip, sheetPath);
    if (!sheet) throw new Error('The workbook has no readable worksheet.');
    var table = [];
    els(xml(sheet), 'row').forEach(function (row) {
      var r = parseInt(row.getAttribute('r'), 10) - 1, cells = [];
      if (isNaN(r)) r = table.length;
      els(row, 'c').forEach(function (c) {
        var idx = colIndex(c.getAttribute('r')), t = c.getAttribute('t'), v = c.getElementsByTagNameNS('*', 'v')[0], val = '';
        if (t === 'inlineStr') val = els(c, 't').map(function (x) { return x.textContent; }).join('');
        else if (v) val = t === 's' ? (shared[parseInt(v.textContent, 10)] || '') : v.textContent;
        cells[idx] = String(val).trim();
      });
      for (var k = 0; k < cells.length; k++) if (cells[k] === undefined) cells[k] = '';
      while (table.length < r) table.push([]);
      table[r] = cells;
    });
    return table;
  }
  function readCsv(text) {
    text = text.replace(/^\uFEFF/, '');
    var first = text.split(/\r?\n/)[0] || '', delim = (first.match(/;/g) || []).length > (first.match(/,/g) || []).length ? ';' : ',';
    var rows = [], row = [], cur = '', q = false;
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      if (q) { if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
      else if (ch === '"') q = true;
      else if (ch === delim) { row.push(cur.trim()); cur = ''; }
      else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cur.trim()); rows.push(row); row = []; cur = ''; }
      else cur += ch;
    }
    if (cur !== '' || row.length) { row.push(cur.trim()); rows.push(row); }
    return rows;
  }

  /* ---------------- validation ---------------- */
  var COLUMNS = [
    { key: 'regNo', label: 'Student Registration Number', required: true, alias: ['studentregistrationnumber', 'registrationnumber', 'regno', 'regnumber', 'studentregno', 'studentid'] },
    { key: 'name', label: 'Student Name', required: false, alias: ['studentname', 'name', 'fullname'] },
    { key: 'course', label: 'Course Code', required: true, alias: ['coursecode', 'course'] },
    { key: 'year', label: 'Academic Year', required: true, alias: ['academicyear', 'acadyear', 'year'] },
    { key: 'semester', label: 'Semester', required: true, alias: ['semester', 'sem'] },
    { key: 'assessment', label: 'Assessment Name', required: true, alias: ['assessmentname', 'assessment', 'assessmenttype'] },
    { key: 'marks', label: 'Marks', required: true, alias: ['marks', 'mark', 'score'] },
    { key: 'max', label: 'Maximum Marks', required: true, alias: ['maximummarks', 'maxmarks', 'maxmark', 'totalmarks', 'outof'] }
  ];
  function norm(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }
  function num(s) { s = String(s).trim().replace(',', '.'); return /^-?\d+(\.\d+)?$/.test(s) ? parseFloat(s) : NaN; }

  /** Pure validation of a 2-D table (array of rows) against a data snapshot. Exported for testing. */
  function analyse(table, data) {
    var hIdx = -1, map = {}, i;
    for (i = 0; i < table.length; i++) { if (table[i] && table[i].some(function (c) { return String(c || '').trim() !== ''; })) { hIdx = i; break; } }
    if (hIdx < 0) return { fatal: 'The file is empty.' };
    table[hIdx].forEach(function (h, ci) { COLUMNS.forEach(function (c) { if (map[c.key] === undefined && c.alias.indexOf(norm(h)) >= 0) map[c.key] = ci; }); });
    var missing = COLUMNS.filter(function (c) { return c.required && map[c.key] === undefined; }).map(function (c) { return c.label; });
    if (missing.length) return { fatal: 'Missing required column' + (missing.length > 1 ? 's' : '') + ': ' + missing.join(', ') + '.', missing: missing };
    var students = {}, courses = {}, periods = {}, existing = {}, seen = {};
    data.students.forEach(function (s) { students[s.regNo.toUpperCase()] = s; });
    data.courses.forEach(function (c) { courses[c.code.toUpperCase()] = c; });
    data.periods.forEach(function (p) { periods[p.year + '|' + p.semester] = p; });
    data.results.forEach(function (r) { existing[r.regNo + '|' + r.courseCode + '|' + r.periodId + '|' + r.assessment.toLowerCase()] = r; });
    var rows = [];
    for (i = hIdx + 1; i < table.length; i++) {
      var line = table[i] || [];
      if (!line.some(function (c) { return String(c || '').trim() !== ''; })) continue;
      var g = function (k) { return map[k] === undefined ? '' : String(line[map[k]] == null ? '' : line[map[k]]).trim(); };
      var rec = { row: i + 1, regNo: g('regNo').toUpperCase(), name: g('name'), course: g('course').toUpperCase(), year: g('year').replace(/\s+/g, '').replace(/[-\u2013]/g, '/'), semester: g('semester'), assessment: g('assessment'), marksRaw: g('marks'), maxRaw: g('max'), errors: [], warns: [], kinds: {} };
      var err = function (kind, msg) { rec.errors.push(msg); rec.kinds[kind] = true; };
      if (!rec.regNo) err('incomplete', 'Registration number is empty.');
      if (!rec.course) err('incomplete', 'Course code is empty.');
      if (!rec.assessment) err('incomplete', 'Assessment name is empty.');
      var semNum = parseInt((rec.semester.match(/\d+/) || [''])[0], 10);
      if (!rec.year || isNaN(semNum)) err('period', 'Academic period information is missing (year and semester are required).');
      var period = (!rec.year || isNaN(semNum)) ? null : periods[rec.year + '|' + semNum];
      if (rec.year && !isNaN(semNum) && !period) err('period', 'Unknown academic period: ' + rec.year + ', Semester ' + semNum + '.');
      rec.periodId = period ? period.id : '';
      rec.marks = num(rec.marksRaw); rec.max = num(rec.maxRaw);
      if (rec.marksRaw === '') err('marks', 'Marks are missing.');
      else if (isNaN(rec.marks)) err('marks', 'Marks "' + rec.marksRaw + '" is not a number.');
      else if (rec.marks < 0) err('marks', 'Marks are below zero.');
      if (rec.maxRaw === '' || isNaN(rec.max) || rec.max <= 0) err('marks', 'Maximum marks are missing or invalid.');
      else if (!isNaN(rec.marks) && rec.marks > rec.max) err('marks', 'Marks (' + rec.marks + ') exceed the maximum (' + rec.max + ').');
      var stu = rec.regNo ? students[rec.regNo] : null, crs = rec.course ? courses[rec.course] : null;
      if (rec.regNo && !stu) err('unknownStudent', 'Unknown registration number ' + rec.regNo + '.');
      if (rec.course && !crs) err('unknownCourse', 'Unknown course code ' + rec.course + '.');
      if (stu && rec.name && rec.name.toLowerCase() !== stu.name.toLowerCase()) rec.warns.push('Name differs from the student record (' + stu.name + '). The row was matched by registration number.');
      if (stu && crs && (stu.programme !== crs.programme || stu.year !== crs.year)) rec.warns.push('This student is not at the programme and level assigned to this course.');
      if (rec.regNo && rec.course && rec.periodId && rec.assessment) {
        var key = rec.regNo + '|' + rec.course + '|' + rec.periodId + '|' + rec.assessment.toLowerCase();
        if (seen[key]) err('duplicate', 'Duplicate of row ' + seen[key] + ' (same student, course, period and assessment).'); else seen[key] = rec.row;
        var ex = existing[key];
        if (ex && ex.published) err('conflict', 'A published result already exists for this record. Unpublish it first.');
        else if (ex) rec.warns.push('An unpublished result already exists and will be replaced.');
        rec.key = key;
      }
      rec.status = rec.errors.length ? 'error' : rec.warns.length ? 'warning' : 'valid';
      rows.push(rec);
    }
    var cnt = function (k) { return rows.filter(function (r) { return r.kinds[k]; }).length; };
    return {
      rows: rows, summary: {
        total: rows.length, valid: rows.filter(function (r) { return r.status !== 'error'; }).length, errors: rows.filter(function (r) { return r.status === 'error'; }).length, duplicates: cnt('duplicate'),
        unknownStudents: cnt('unknownStudent'), unknownCourses: cnt('unknownCourse'), badMarks: cnt('marks'), incomplete: cnt('incomplete') + cnt('period'), warnings: rows.filter(function (r) { return r.status === 'warning'; }).length, conflicts: cnt('conflict')
      }
    };
  }

  /* ---------------- flow state ---------------- */
  var imp;
  function reset() { imp = { stage: 1, fileName: '', error: '', loading: false, rows: [], summary: null, filter: 'all', page: 1, done: null }; }
  reset();
  function snapshot() { return { students: Repo.list('students'), courses: Repo.list('courses'), periods: Repo.list('periods'), results: Repo.list('results') }; }

  /* ---------------- views ---------------- */
  function stepsHtml() {
    var names = ['Select file', 'Validate and preview', 'Confirm import', 'Review and publish'];
    return '<ol class="steps" aria-label="Import progress" style="list-style:none;padding:0">' + names.map(function (n, i) {
      var cls = imp.stage === i + 1 ? 'active' : imp.stage > i + 1 ? 'done' : '';
      return '<li class="step ' + cls + '"' + (cls === 'active' ? ' aria-current="step"' : '') + '><b>' + (cls === 'done' ? icon('check') : i + 1) + '</b>' + n + '</li>';
    }).join('') + '</ol>';
  }
  function stage1() {
    var colRows = COLUMNS.map(function (c) { return '<tr><td data-label="Column"><strong>' + esc(c.label) + '</strong></td><td data-label="Required">' + (c.required ? 'Yes' : 'Optional') + '</td></tr>'; }).join('');
    return '<div class="grid grid-2"><div class="card card-pad"><h2 style="margin-bottom:12px">Choose a file</h2>' + (imp.error ? UI.alertBox('error', esc(imp.error)) + '<div style="height:12px"></div>' : '') +
      (imp.loading ? '<div class="alert alert-info"><span class="spinner" style="border-color:rgba(10,35,66,.3);border-top-color:#0a2342"></span><div>Reading and checking <strong>' + esc(imp.fileName) + '</strong>...</div></div>' :
        '<div class="dropzone">' + icon('upload') + '<p style="margin:8px 0"><strong>Choose an Excel (.xlsx) or CSV file</strong></p><p class="small muted">Read in your browser. Nothing is uploaded to a server. Maximum 8 MB.</p>' +
        '<label for="imp-file" class="sr-only">Results spreadsheet</label><input type="file" id="imp-file" accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" data-change="impFile"></div>') +
      '<p class="small muted" style="margin-top:12px">Results are matched to students by <strong>registration number</strong>, never by name.</p></div>' +
      '<div class="card card-pad"><h2 style="margin-bottom:8px">Template and format</h2><p class="muted">Use these column headings in the first row of the first worksheet.</p>' +
      '<div class="table-wrap"><table class="table"><thead><tr><th>Column</th><th>Required</th></tr></thead><tbody>' + colRows + '</tbody></table></div>' +
      '<div class="btn-row" style="margin-top:14px"><a class="btn btn-secondary btn-sm" href="assets/templates/results-import-template.xlsx" download>' + icon('download') + 'Excel template</a>' +
      '<a class="btn btn-secondary btn-sm" href="assets/templates/results-import-sample-with-errors.xlsx" download>' + icon('download') + 'Sample with errors</a>' +
      '<button type="button" class="btn btn-secondary btn-sm" data-action="impTemplateCsv">' + icon('download') + 'CSV template</button></div>' +
      '<p class="small muted" style="margin-top:10px">Academic Year looks like 2026/2027 and Semester like 1 or 2. The period must exist under Academic Periods. Legacy .xls files are not supported.</p></div></div>';
  }
  function statBox(label, val, kind) {
    return '<div class="card card-pad" style="padding:12px 14px"><div class="stat-val"' + (kind && val ? ' style="color:var(--' + kind + ')"' : '') + '>' + val + '</div><div class="stat-label">' + esc(label) + '</div></div>';
  }
  function stage2() {
    var s = imp.summary, f = imp.filter;
    var rows = imp.rows.filter(function (r) { return f === 'all' || (f === 'error' && r.status === 'error') || (f === 'warning' && r.status === 'warning') || (f === 'valid' && r.status !== 'error'); });
    var pages = Math.max(1, Math.ceil(rows.length / PAGE)); if (imp.page > pages) imp.page = pages;
    var slice = rows.slice((imp.page - 1) * PAGE, imp.page * PAGE);
    var seg = [['all', 'All rows'], ['error', 'Errors (' + s.errors + ')'], ['warning', 'Warnings (' + s.warnings + ')'], ['valid', 'Importable (' + s.valid + ')']].map(function (x) { return '<button type="button" data-action="impFilter" data-f="' + x[0] + '" aria-pressed="' + (f === x[0]) + '">' + x[1] + '</button>'; }).join('');
    return '<div class="stack"><div class="alert alert-info">' + icon('info') + '<div><strong>Nothing has been imported yet.</strong> File: ' + esc(imp.fileName) + '. Review the checks below, then confirm to import the valid rows. Rows with errors are never imported.</div></div>' +
      '<div class="grid grid-stats">' + statBox('Total rows', s.total) + statBox('Valid rows', s.valid, 'green-700') + statBox('Rows with errors', s.errors, 'red-700') + statBox('Duplicate rows', s.duplicates, 'red-700') +
      statBox('Unknown registration numbers', s.unknownStudents, 'red-700') + statBox('Unknown course codes', s.unknownCourses, 'red-700') + statBox('Invalid or missing marks', s.badMarks, 'red-700') + statBox('Incomplete rows', s.incomplete, 'red-700') + '</div>' +
      '<div class="card"><div class="card-head"><h2>Preview</h2><div class="seg" role="group" aria-label="Filter preview rows">' + seg + '</div></div>' +
      (slice.length ? UI.table([
        { label: 'Row', cls: 'num', render: function (r) { return r.row; } }, { label: 'Reg. number', render: function (r) { return esc(r.regNo || '(empty)'); } }, { label: 'Student name', render: function (r) { return esc(r.name); } },
        { label: 'Course', render: function (r) { return esc(r.course || '(empty)'); } }, { label: 'Period', render: function (r) { return esc(r.year) + (r.semester ? ', S' + esc(r.semester.replace(/\D/g, '') || r.semester) : ''); } }, { label: 'Assessment', render: function (r) { return esc(r.assessment); } },
        { label: 'Marks', cls: 'num', render: function (r) { return esc(r.marksRaw) + ' / ' + esc(r.maxRaw); } },
        { label: 'Result', render: function (r) {
          var b = r.status === 'error' ? UI.badge('Error') : r.status === 'warning' ? UI.badge('Warning') : UI.badge('Valid');
          return b + (r.errors.concat(r.warns).map(function (m) { return '<span class="cell-sub" style="color:' + (r.errors.indexOf(m) >= 0 ? 'var(--red-700)' : 'var(--amber-700)') + '">' + esc(m) + '</span>'; }).join(''));
        } }
      ], slice, { caption: 'Import preview', rowClass: function (r) { return r.status === 'error' ? 'row-error' : r.status === 'warning' ? 'row-warn' : ''; } }) : UI.emptyState('No rows in this view', 'Choose a different filter.')) +
      '<div class="pager"><span>Showing ' + (rows.length ? (imp.page - 1) * PAGE + 1 : 0) + '-' + Math.min(rows.length, imp.page * PAGE) + ' of ' + rows.length + '</span>' + (pages > 1 ? '<div class="btn-row"><button type="button" class="btn btn-secondary btn-sm" data-action="impPage" data-dir="-1"' + (imp.page <= 1 ? ' disabled' : '') + '>Previous</button><span style="align-self:center">Page ' + imp.page + ' of ' + pages + '</span><button type="button" class="btn btn-secondary btn-sm" data-action="impPage" data-dir="1"' + (imp.page >= pages ? ' disabled' : '') + '>Next</button></div>' : '') + '</div></div>' +
      '<div class="inline-actions"><button type="button" class="btn btn-secondary" data-action="impReset">Cancel and choose another file</button>' + (s.errors ? '<button type="button" class="btn btn-secondary" data-action="impErrorCsv">' + icon('download') + 'Download error report</button>' : '') +
      '<button type="button" class="btn" data-action="impConfirm"' + (s.valid ? '' : ' disabled') + '>' + icon('check') + 'Import ' + s.valid + ' valid row' + (s.valid === 1 ? '' : 's') + '</button></div></div>';
  }
  function stage3() {
    var d = imp.done;
    return '<div class="stack">' + UI.alertBox('ok', '<strong>Import complete (demonstration).</strong> The valid rows were added to the demo state. They are <strong>not published</strong>, so students cannot see them yet.') +
      '<div class="grid grid-stats">' + statBox('New result records', d.inserted, 'green-700') + statBox('Unpublished records replaced', d.updated) + statBox('Rows skipped because of errors', d.skipped, 'red-700') + statBox('Result sets affected', d.keys.length) + '</div>' +
      (d.skipped ? UI.alertBox('warn', d.skipped + ' row' + (d.skipped === 1 ? ' was' : 's were') + ' not imported. Download the error report, correct the spreadsheet and import it again.') : '') +
      '<div class="inline-actions"><button type="button" class="btn btn-secondary" data-action="impReset">Import another file</button>' + (d.skipped ? '<button type="button" class="btn btn-secondary" data-action="impErrorCsv">' + icon('download') + 'Download error report</button>' : '') +
      '<button type="button" class="btn" data-action="impNext">Review and publish</button></div></div>';
  }
  function stage4() {
    var keys = imp.done.keys, groups = Q.resultGroups().filter(function (g) { return keys.indexOf(g.key) >= 0; });
    return '<div class="stack">' + UI.alertBox('warn', '<strong>Publishing is a separate step.</strong> Review each result set, then publish it. Students see a result only after it is published.') +
      '<div class="card"><div class="card-head"><h2>Imported result sets</h2><a href="#/registrar/results">Open Results Management</a></div>' + (groups.length ? UI.table([
        { label: 'Course', render: function (g) { return '<strong>' + esc(g.courseCode) + '</strong><span class="cell-sub">' + esc((Q.course(g.courseCode) || {}).title || '') + '</span>'; } }, { label: 'Assessment', render: function (g) { return esc(g.assessment); } },
        { label: 'Period', render: function (g) { return esc(Store.periodLabel(g.periodId)); } }, { label: 'Records', cls: 'num', render: function (g) { return g.count; } },
        { label: 'Status', render: function (g) { return g.status === 'Partly published' ? '<span class="badge badge-amber">' + icon('clock') + 'Partly published</span>' : UI.badge(g.status); } },
        { label: '', cls: 'actions', render: function (g) {
          var k = 'data-key="' + esc(g.key) + '"';
          return '<div class="btn-row" style="justify-content:flex-end"><button type="button" class="btn btn-secondary btn-sm" data-action="reviewResults" ' + k + '>' + icon('eye') + 'Review</button>' +
            (g.status === 'Published' ? '<button type="button" class="btn btn-secondary btn-sm" data-action="unpublishResults" ' + k + '>Unpublish</button>' : '<button type="button" class="btn btn-success btn-sm" data-action="publishResults" ' + k + '>' + icon('check') + 'Publish</button>') + '</div>';
        } }], groups, { caption: 'Imported result sets' }) : UI.emptyState('Nothing to review', 'The imported result sets are no longer available.')) + '</div>' +
      UI.alertBox('info', '<strong>Demonstration only.</strong> This workflow runs entirely in your browser. In production the backend must independently validate every uploaded row, authenticate the registrar, enforce permissions, keep an audit log and control when results become visible. Browser-side checks are never a security boundary.') +
      '<div><button type="button" class="btn btn-secondary" data-action="impReset">Start a new import</button></div></div>';
  }
  function view() {
    var body = imp.stage === 1 ? stage1() : imp.stage === 2 ? stage2() : imp.stage === 3 ? stage3() : stage4();
    return App.pageHead('Excel Results Import', 'Check a spreadsheet, import the valid rows, then publish separately.') + stepsHtml() + body;
  }

  /* ---------------- actions ---------------- */
  async function handleFile(file) {
    imp.error = ''; imp.fileName = file.name;
    var ext = (file.name.split('.').pop() || '').toLowerCase();
    if (ext === 'xls') { imp.error = 'Legacy .xls files are not supported. Open the file in Excel and save it as .xlsx or .csv.'; return App.refresh(); }
    if (ext !== 'xlsx' && ext !== 'csv') { imp.error = 'Please choose an .xlsx or .csv file.'; return App.refresh(); }
    if (file.size > MAX_BYTES) { imp.error = 'The file is larger than 8 MB. Split it into smaller files.'; return App.refresh(); }
    if (file.size === 0) { imp.error = 'The file is empty.'; return App.refresh(); }
    imp.loading = true; App.refresh();
    try {
      var table = ext === 'csv' ? readCsv(await file.text()) : await readXlsx(await file.arrayBuffer());
      var res = analyse(table, snapshot());
      imp.loading = false;
      if (res.fatal) { imp.error = res.fatal + ' Download the template to see the expected columns.'; return App.refresh(); }
      if (!res.rows.length) { imp.error = 'The file has a header row but no data rows.'; return App.refresh(); }
      imp.rows = res.rows; imp.summary = res.summary; imp.stage = 2; imp.filter = res.summary.errors ? 'error' : 'all'; imp.page = 1;
      UI.toast('File checked: ' + res.summary.valid + ' valid and ' + res.summary.errors + ' with errors. Nothing has been imported yet.', res.summary.errors ? 'warn' : 'ok');
    } catch (e) {
      console.error(e); imp.loading = false;
      imp.error = 'The file could not be read. Make sure it is a valid .xlsx or .csv file and is not password protected.';
    }
    App.refresh();
  }
  UI.register({
    impFile: function (d, input) { var f = input.files && input.files[0]; if (f) handleFile(f); },
    impReset: function () { reset(); App.refresh(); },
    impFilter: function (d) { imp.filter = d.f; imp.page = 1; App.refresh(); },
    impPage: function (d) { imp.page += +d.dir; App.refresh(); },
    impNext: function () { imp.stage = 4; App.refresh(); },
    impConfirm: function () {
      var s = imp.summary;
      UI.confirm({ title: 'Import valid rows?', confirmLabel: 'Import ' + s.valid + ' rows',
        html: '<p><strong>' + s.valid + '</strong> valid row' + (s.valid === 1 ? '' : 's') + ' will be added to the demonstration data.</p>' + (s.errors ? '<p><strong>' + s.errors + '</strong> row' + (s.errors === 1 ? ' has' : 's have') + ' errors and will <strong>not</strong> be imported.</p>' : '') + '<p>Imported results stay <strong>unpublished</strong> until you publish them.</p>' }).then(function (ok) {
        if (!ok) return;
        var ins = 0, upd = 0, keys = [];
        imp.rows.forEach(function (r) {
          if (r.status === 'error') return;
          var existing = Repo.list('results').find(function (x) { return x.regNo === r.regNo && x.courseCode === r.course && x.periodId === r.periodId && x.assessment.toLowerCase() === r.assessment.toLowerCase(); });
          if (existing) { existing.marks = r.marks; existing.max = r.max; existing.published = false; upd++; }
          else { Repo.list('results').push({ id: Store.uid('r'), regNo: r.regNo, courseCode: r.course, periodId: r.periodId, assessment: r.assessment, marks: r.marks, max: r.max, published: false }); ins++; }
          var gk = r.course + '|' + r.periodId + '|' + (existing ? existing.assessment : r.assessment); if (keys.indexOf(gk) < 0) keys.push(gk);
        });
        Repo.save(); Store.log('Imported ' + (ins + upd) + ' result records from ' + imp.fileName + ' (unpublished)');
        imp.done = { inserted: ins, updated: upd, skipped: s.errors, keys: keys }; imp.stage = 3;
        UI.toast('Imported ' + (ins + upd) + ' rows. They are not published.'); App.refresh();
      });
    },
    impErrorCsv: function () {
      var rows = [['Row', 'Registration number', 'Course', 'Academic year', 'Semester', 'Assessment', 'Marks', 'Maximum', 'Problems']];
      imp.rows.filter(function (r) { return r.status === 'error'; }).forEach(function (r) { rows.push([r.row, r.regNo, r.course, r.year, r.semester, r.assessment, r.marksRaw, r.maxRaw, r.errors.join(' | ')]); });
      UI.downloadBlob(new Blob([UI.toCSV(rows)], { type: 'text/csv' }), 'import-error-report.csv');
    },
    impTemplateCsv: function () {
      var p = Store.activePeriod(), rows = [COLUMNS.map(function (c) { return c.label; })];
      rows.push(['MLS/26/001', 'Sarah Namulondo', 'MLT101', p.year, p.semester, 'CAT 2', 21, 30]); rows.push(['MLS/26/002', 'John Ssemwanga', 'MLT101', p.year, p.semester, 'CAT 2', 24, 30]);
      UI.downloadBlob(new Blob([UI.toCSV(rows)], { type: 'text/csv' }), 'results-import-template.csv');
    }
  });

  App.defineRoute('registrar', 'import', { title: 'Excel Results Import', render: view });
  MLS.ImportFlow = { reset: reset, analyse: analyse, readCsv: readCsv, readXlsx: readXlsx };
})();
