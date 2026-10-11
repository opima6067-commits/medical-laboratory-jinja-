/* ==========================================================================
   ui.js - reusable UI helpers (icons, toasts, dialogs, forms, tables,
   searchable/filterable/paginated lists) and common data queries.
   Everything that touches the DOM user-supplied text goes through esc().
   ========================================================================== */
(function () {
  'use strict';
  var MLS = window.MLS, Repo = MLS.Repo, Store = MLS.Store;

  /* ---------- basic helpers ---------- */
  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  var ICONS = {
    home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
    book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 21V5"/>',
    file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h6"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    award: '<circle cx="12" cy="9" r="6"/><path d="M8.5 14 7 22l5-3 5 3-1.5-8"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 20a2 2 0 0 0 4 0"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.5 3-6 7-6s7 2.5 7 6"/><circle cx="17" cy="9" r="2.5"/><path d="M17 14c3 0 5 2 5 5"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>',
    upload: '<path d="M12 16V4M7 9l5-5 5 5M4 16v4h16v-4"/>',
    download: '<path d="M12 4v12M7 11l5 5 5-5M4 20h16"/>',
    chart: '<path d="M4 20V4M4 20h16M8 16v-5M12 16V8M16 16v-8"/>',
    megaphone: '<path d="M3 11v3a1 1 0 0 0 1 1h3l8 4V6L7 10H4a1 1 0 0 0-1 1z"/><path d="M19 9a4 4 0 0 1 0 6"/>',
    cap: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    logout: '<path d="M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4"/><path d="M16 8l4 4-4 4M20 12H9"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13 7l4 4"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/>',
    eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    check: '<path d="M5 12l5 5L20 7"/>',
    alert: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.01"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17v.01"/>',
    layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.01"/>',
    lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    flask: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3M8 15h8"/>',
    chevron: '<path d="M9 6l6 6-6 6"/>'
  };
  function icon(name) {
    return '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + (ICONS[name] || '') + '</svg>';
  }
  var BADGES = {
    Active: ['green', 'check'], Published: ['green', 'check'], Completed: ['green', 'check'], Imported: ['green', 'check'], Valid: ['green', 'check'],
    Scheduled: ['blue', 'calendar'], Current: ['blue', 'clock'],
    Unpublished: ['amber', 'clock'], Deferred: ['amber', 'clock'], Postponed: ['amber', 'clock'], Warning: ['amber', 'alert'], Draft: ['amber', 'clock'],
    Inactive: ['', 'clock'], Archived: ['', 'clock'], Graduated: ['blue', 'cap'],
    Cancelled: ['red', 'alert'], Suspended: ['red', 'alert'], Error: ['red', 'alert'], Duplicate: ['red', 'alert']
  };
  function badge(text, kindOverride) {
    var b = BADGES[text] || ['', ''];
    var kind = kindOverride !== undefined ? kindOverride : b[0];
    return '<span class="badge' + (kind ? ' badge-' + kind : '') + '">' + (b[1] ? icon(b[1]) : '') + esc(text) + '</span>';
  }
  function fmtDate(iso) {
    if (!iso) return '-';
    var d = new Date(String(iso).slice(0, 10) + 'T12:00:00');
    if (isNaN(d)) return esc(iso);
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  }
  function fmtShort(iso) {
    var d = new Date(String(iso).slice(0, 10) + 'T12:00:00');
    return isNaN(d) ? '-' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  function fmtTime(t) {
    if (!t) return '';
    var p = t.split(':'), h = +p[0], m = p[1] || '00';
    return (h % 12 || 12) + ':' + m + ' ' + (h >= 12 ? 'PM' : 'AM');
  }
  function today() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function daysUntil(iso) {
    var a = new Date(today() + 'T12:00:00'), b = new Date(String(iso).slice(0, 10) + 'T12:00:00');
    var n = Math.round((b - a) / 864e5);
    if (n === 0) return 'Today'; if (n === 1) return 'Tomorrow'; if (n > 1) return 'In ' + n + ' days';
    return Math.abs(n) + (n === -1 ? ' day ago' : ' days ago');
  }
  function grade(p) { return p >= 80 ? 'A' : p >= 70 ? 'B+' : p >= 60 ? 'B' : p >= 50 ? 'C' : p >= 40 ? 'D' : 'F'; }
  function pct(m, max) { return max > 0 ? Math.round((m / max) * 1000) / 10 : 0; }
  function initials(name) { return String(name || '?').replace(/^(Dr|Mr|Ms|Mrs|Prof)\.?\s+/i, '').split(/\s+/).filter(function (w) { return /^[A-Za-z]/.test(w); }).slice(0, 2).map(function (w) { return w[0]; }).join('').toUpperCase(); }
  function emptyState(title, msg, action) {
    return '<div class="empty">' + icon('layers') + '<h3>' + esc(title) + '</h3><p>' + esc(msg || '') + '</p>' + (action || '') + '</div>';
  }
  function alertBox(kind, html) {
    var ic = { info: 'info', warn: 'alert', error: 'alert', ok: 'check' }[kind];
    return '<div class="alert alert-' + kind + '" role="' + (kind === 'error' ? 'alert' : 'note') + '">' + icon(ic) + '<div>' + html + '</div></div>';
  }
  function downloadBlob(blob, name) {
    var url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }
  function toCSV(rows) {
    return rows.map(function (r) {
      return r.map(function (c) { c = c == null ? '' : String(c); return /[",\n\r]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c; }).join(',');
    }).join('\r\n');
  }
  function makePdf(title, lines) {
    var clean = function (s) { return String(s).replace(/[^\x20-\x7E]/g, '?').replace(/[\\()]/g, '\\$&'); };
    var content = 'BT /F1 20 Tf 60 740 Td (' + clean(title) + ') Tj ET\n', y = 700;
    lines.forEach(function (l) { content += 'BT /F1 12 Tf 60 ' + y + ' Td (' + clean(l) + ') Tj ET\n'; y -= 22; });
    var objs = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
      '<< /Length ' + content.length + ' >>\nstream\n' + content + 'endstream', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
    var out = '%PDF-1.4\n', offs = [];
    objs.forEach(function (o, i) { offs.push(out.length); out += (i + 1) + ' 0 obj\n' + o + '\nendobj\n'; });
    var x = out.length;
    out += 'xref\n0 ' + (objs.length + 1) + '\n0000000000 65535 f \n' + offs.map(function (o) { return String(o).padStart(10, '0') + ' 00000 n \n'; }).join('') +
      'trailer\n<< /Size ' + (objs.length + 1) + ' /Root 1 0 R >>\nstartxref\n' + x + '\n%%EOF';
    return new Blob([out], { type: 'application/pdf' });
  }

  /* ---------- actions registry & global delegated events ---------- */
  var Actions = {};
  function register(map) { Object.assign(Actions, map); }

  /* ---------- toasts ---------- */
  function toast(msg, kind, ms) {
    var box = document.getElementById('toasts');
    if (!box) { box = document.createElement('div'); box.id = 'toasts'; box.className = 'toasts'; box.setAttribute('role', 'status'); box.setAttribute('aria-live', 'polite'); document.body.appendChild(box); }
    var t = document.createElement('div');
    kind = kind || 'ok';
    t.className = 'toast ' + kind;
    t.innerHTML = icon(kind === 'ok' ? 'check' : kind === 'error' || kind === 'warn' ? 'alert' : 'info') + '<span>' + esc(msg) + '</span>';
    box.appendChild(t);
    setTimeout(function () { t.remove(); }, ms || (kind === 'error' ? 7000 : 4500));
  }

  /* ---------- dialogs ---------- */
  var dlg, cdlg, current = null, confirmResolve = null;
  function ensureDialogs() {
    if (dlg) return;
    dlg = document.createElement('dialog'); dlg.setAttribute('aria-labelledby', 'modal-title'); document.body.appendChild(dlg);
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!current || !current.onSubmit) return;
      if (current.onSubmit(e.target) !== false) dlg.close();
    });
    dlg.addEventListener('click', function (e) { if (e.target.closest('[data-modal-close]')) dlg.close(); });
    cdlg = document.createElement('dialog'); cdlg.setAttribute('aria-labelledby', 'confirm-title'); document.body.appendChild(cdlg);
    cdlg.addEventListener('click', function (e) {
      var b = e.target.closest('[data-confirm]');
      if (b) { var r = confirmResolve; confirmResolve = null; cdlg.close(); if (r) r(b.dataset.confirm === '1'); }
    });
    cdlg.addEventListener('close', function () { if (confirmResolve) { var r = confirmResolve; confirmResolve = null; r(false); } });
  }
  var Modal = {
    open: function (o) {
      ensureDialogs(); current = o;
      dlg.className = o.wide ? 'wide' : '';
      dlg.innerHTML = '<form method="dialog" novalidate><div class="dlg-head"><h2 id="modal-title">' + esc(o.title) + '</h2>' +
        '<button type="button" class="btn btn-icon" data-modal-close aria-label="Close dialog">' + icon('x') + '</button></div>' +
        '<div class="dlg-body">' + o.body + '</div>' +
        '<div class="dlg-foot"><button type="button" class="btn btn-secondary" data-modal-close>' + esc(o.cancelLabel || (o.onSubmit ? 'Cancel' : 'Close')) + '</button>' +
        (o.onSubmit ? '<button type="submit" class="btn' + (o.danger ? ' btn-danger' : '') + '">' + esc(o.submitLabel || 'Save') + '</button>' : '') + '</div></form>';
      dlg.showModal();
      var first = dlg.querySelector('input:not([readonly]):not([type=hidden]), select, textarea');
      if (first) first.focus();
    },
    close: function () { if (dlg && dlg.open) dlg.close(); }
  };
  function confirmDialog(o) {
    ensureDialogs();
    cdlg.innerHTML = '<div class="dlg-head"><h2 id="confirm-title">' + esc(o.title) + '</h2></div><div class="dlg-body">' + (o.html || '<p>' + esc(o.message) + '</p>') + '</div>' +
      '<div class="dlg-foot"><button type="button" class="btn btn-secondary" data-confirm="0">Cancel</button><button type="button" class="btn' + (o.danger ? ' btn-danger' : '') + '" data-confirm="1">' + esc(o.confirmLabel || 'Confirm') + '</button></div>';
    return new Promise(function (resolve) { confirmResolve = resolve; cdlg.showModal(); cdlg.querySelector('[data-confirm="0"]').focus(); });
  }

  /* ---------- forms ---------- */
  function optHtml(opts, sel) {
    return opts.map(function (o) {
      var v = Array.isArray(o) ? o[0] : o, l = Array.isArray(o) ? o[1] : o;
      return '<option value="' + esc(v) + '"' + (String(v) === String(sel) ? ' selected' : '') + '>' + esc(l) + '</option>';
    }).join('');
  }
  function field(o) {
    var id = 'f_' + o.name, v = o.value == null ? '' : o.value;
    var attrs = ' id="' + id + '" name="' + esc(o.name) + '" data-label="' + esc(o.label) + '"' + (o.required ? ' required aria-required="true"' : '') +
      (o.readonly ? ' readonly' : '') + (o.disabled ? ' disabled' : '') + ' aria-describedby="' + id + '_err' + (o.help ? ' ' + id + '_help' : '') + '"';
    var c;
    if (o.type === 'select') {
      c = '<select' + attrs + '>' + (o.placeholder !== undefined ? '<option value="">' + esc(o.placeholder) + '</option>' : '') + optHtml(o.options || [], v) + '</select>';
    } else if (o.type === 'textarea') {
      c = '<textarea' + attrs + ' rows="' + (o.rows || 3) + '"' + (o.maxlength ? ' maxlength="' + o.maxlength + '"' : '') + (o.placeholder ? ' placeholder="' + esc(o.placeholder) + '"' : '') + '>' + esc(v) + '</textarea>';
    } else {
      c = '<input' + attrs + ' type="' + (o.type || 'text') + '" value="' + esc(v) + '"' + (o.placeholder ? ' placeholder="' + esc(o.placeholder) + '"' : '') +
        (o.accept ? ' accept="' + esc(o.accept) + '"' : '') + (o.min != null ? ' min="' + o.min + '"' : '') + (o.max != null ? ' max="' + o.max + '"' : '') +
        (o.maxlength ? ' maxlength="' + o.maxlength + '"' : '') + (o.autocomplete ? ' autocomplete="' + o.autocomplete + '"' : '') + (o.dataChange ? ' data-change="' + o.dataChange + '"' : '') + '>';
    }
    return '<div class="field' + (o.full ? ' full' : '') + '"><label for="' + id + '">' + esc(o.label) + (o.required ? ' <span class="req" aria-hidden="true">*</span><span class="sr-only">(required)</span>' : '') + '</label>' + c +
      (o.help ? '<p class="field-help" id="' + id + '_help">' + esc(o.help) + '</p>' : '') + '<p class="field-error" id="' + id + '_err" role="alert"></p></div>';
  }
  function setFieldError(form, name, msg) {
    var el = form.elements[name]; if (!el) return;
    el = el.length && !el.tagName ? el[0] : el;
    var err = document.getElementById(el.id + '_err');
    if (err) err.textContent = msg || '';
    if (msg) el.setAttribute('aria-invalid', 'true'); else el.removeAttribute('aria-invalid');
  }
  /** Validate a form: required attributes plus optional custom rules {name: fn(value, values) -> message}. */
  function collect(form, rules) {
    var values = {}, errors = {};
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name || el.disabled) return;
      if (el.type === 'file') { values[el.name] = el.files && el.files[0] ? el.files[0] : null; }
      else if (el.type === 'checkbox') { values[el.name] = values[el.name] || []; if (el.checked) values[el.name].push(el.value); }
      else values[el.name] = typeof el.value === 'string' ? el.value.trim() : el.value;
    });
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name || el.disabled || el.type === 'checkbox') return;
      var v = values[el.name], msg = '';
      var empty = el.type === 'file' ? !v : !v;
      if (el.required && empty) msg = (el.dataset.label || 'This field') + ' is required.';
      else if (!empty && rules && rules[el.name]) msg = rules[el.name](v, values) || '';
      if (msg) errors[el.name] = msg;
      setFieldError(form, el.name, msg);
    });
    var first = Object.keys(errors)[0];
    if (first) { var f = form.elements[first]; if (f && f.focus) f.focus(); }
    return { ok: !first, values: values, errors: errors };
  }

  /* ---------- tables & list pages ---------- */
  function table(cols, rows, o) {
    o = o || {};
    return '<div class="table-wrap"><table class="table"><caption class="sr-only">' + esc(o.caption || 'Data table') + '</caption><thead><tr>' +
      cols.map(function (c) { return '<th scope="col" class="' + (c.cls || '') + '">' + esc(c.label) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      rows.map(function (r) {
        var rc = o.rowClass ? o.rowClass(r) : '';
        return '<tr' + (rc ? ' class="' + rc + '"' : '') + '>' + cols.map(function (c) {
          return '<td data-label="' + esc(c.label) + '" class="' + (c.cls || '') + '">' + '<div class="td-c">' + (c.render ? c.render(r) : esc(r[c.key])) + '</div></td>';
        }).join('') + '</tr>';
      }).join('') + '</tbody></table></div>';
  }
  var LP = {}, LPS = {};
  function resetLists() { LPS = {}; }
  function lpBody(id) {
    var c = LP[id], st = LPS[id], rows = c.rows();
    if (c.search && st.q) { var q = st.q.toLowerCase(); rows = rows.filter(function (r) { return c.search(r).toLowerCase().indexOf(q) >= 0; }); }
    (c.filters || []).forEach(function (f) { var v = st.f[f.key]; if (v !== '' && v != null) rows = rows.filter(function (r) { return f.test(r, v); }); });
    var total = rows.length, size = c.pageSize || 10, pages = Math.max(1, Math.ceil(total / size));
    if (st.page > pages) st.page = pages;
    var slice = rows.slice((st.page - 1) * size, st.page * size), body;
    var emp = c.empty || { title: 'Nothing to show', msg: 'No records match your search or filters.' };
    if (!total) body = emptyState(emp.title, st.q || hasFilter(st) ? 'No records match your search or filters. Try clearing them.' : emp.msg, emp.action);
    else if (c.card) body = '<div class="card-body"><div class="grid grid-cards">' + slice.map(c.card).join('') + '</div></div>';
    else body = table(c.columns, slice, { caption: c.title || 'Results', rowClass: c.rowClass });
    var from = total ? (st.page - 1) * size + 1 : 0, to = Math.min(total, st.page * size);
    var pager = '<div class="pager"><span>' + (total ? 'Showing ' + from + '-' + to + ' of ' + total : '0 records') + '</span>' + (pages > 1 ?
      '<div class="btn-row"><button type="button" class="btn btn-secondary btn-sm" data-lp-page="' + id + '" data-dir="-1"' + (st.page <= 1 ? ' disabled' : '') + '>Previous</button>' +
      '<span style="align-self:center">Page ' + st.page + ' of ' + pages + '</span>' +
      '<button type="button" class="btn btn-secondary btn-sm" data-lp-page="' + id + '" data-dir="1"' + (st.page >= pages ? ' disabled' : '') + '>Next</button></div>' : '') + '</div>';
    return body + pager;
  }
  function hasFilter(st) { return Object.keys(st.f).some(function (k) { return st.f[k] !== '' && st.f[k] != null && st.f[k] !== st.d[k]; }); }
  /** Render a card containing a toolbar (search + filters), a table or card grid, and a pager. */
  function listPage(cfg) {
    var st = LPS[cfg.id] || (LPS[cfg.id] = { q: '', f: {}, d: {}, page: 1 });
    (cfg.filters || []).forEach(function (f) { if (!(f.key in st.f)) { st.f[f.key] = f.default == null ? '' : f.default; st.d[f.key] = st.f[f.key]; } });
    LP[cfg.id] = cfg;
    var tb = '<div class="toolbar">' + (cfg.search ? '<div class="search field"><label class="sr-only" for="lp-' + cfg.id + '-q">' + esc(cfg.searchLabel || 'Search') + '</label>' + icon('search') +
      '<input type="search" id="lp-' + cfg.id + '-q" data-lp-q="' + cfg.id + '" value="' + esc(st.q) + '" placeholder="' + esc(cfg.searchLabel || 'Search') + '" autocomplete="off"></div>' : '') +
      (cfg.filters || []).map(function (f) {
        return '<div class="field"><label class="small muted" for="lp-' + cfg.id + '-' + f.key + '">' + esc(f.label) + '</label><select id="lp-' + cfg.id + '-' + f.key + '" data-lp-f="' + cfg.id + '" data-key="' + f.key + '">' +
          '<option value="">' + esc(f.all || 'All') + '</option>' + optHtml(f.options, st.f[f.key]) + '</select></div>';
      }).join('') + (cfg.toolbarExtra || '') + '</div>';
    return '<div class="card">' + (cfg.title ? '<div class="card-head"><h2>' + esc(cfg.title) + '</h2>' + (cfg.headExtra || '') + '</div>' : '') +
      (cfg.search || (cfg.filters && cfg.filters.length) ? tb : '') + '<div id="lp-' + cfg.id + '" aria-live="polite">' + lpBody(cfg.id) + '</div></div>';
  }
  function listState(id) { return LPS[id] || { q: '', f: {}, page: 1 }; }
  function refreshList(id) { var el = document.getElementById('lp-' + id); if (el && LP[id]) el.innerHTML = lpBody(id); }

  document.addEventListener('input', function (e) {
    var t = e.target;
    if (t.dataset && t.dataset.lpQ) { LPS[t.dataset.lpQ].q = t.value; LPS[t.dataset.lpQ].page = 1; refreshList(t.dataset.lpQ); }
    else if (t.dataset && t.dataset.input && Actions[t.dataset.input]) Actions[t.dataset.input](t.dataset, t, e);
  });
  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t.dataset && t.dataset.lpF) { var s = LPS[t.dataset.lpF]; s.f[t.dataset.key] = t.value; s.page = 1; refreshList(t.dataset.lpF); }
    else if (t.dataset && t.dataset.change && Actions[t.dataset.change]) Actions[t.dataset.change](t.dataset, t, e);
  });
  document.addEventListener('click', function (e) {
    var p = e.target.closest('[data-lp-page]');
    if (p) { LPS[p.dataset.lpPage].page += +p.dataset.dir; refreshList(p.dataset.lpPage); return; }
    var a = e.target.closest('[data-action]');
    if (a && Actions[a.dataset.action]) { Actions[a.dataset.action](a.dataset, a, e); }
  });
  document.addEventListener('submit', function (e) {
    var f = e.target;
    if (f.dataset && f.dataset.submit && Actions[f.dataset.submit]) { e.preventDefault(); Actions[f.dataset.submit](f.dataset, f, e); }
  });

  /* ---------- common data queries (shared by all roles) ---------- */
  var Q = {
    course: function (code) { return Repo.get('courses', code); },
    tutor: function (id) { return Repo.get('tutors', id); },
    student: function (reg) { return Repo.get('students', reg); },
    programme: function (code) { return Repo.get('programmes', code); },
    courseLabel: function (code) { var c = Repo.get('courses', code); return c ? c.code + ' - ' + c.title : code; },
    progName: function (code) { var p = Repo.get('programmes', code); return p ? p.name : code; },
    tutorName: function (id) { var t = Repo.get('tutors', id); return t ? t.name : 'Unassigned'; },
    studentCourses: function (s, scope) {
      var p = Store.activePeriod();
      return Repo.list('courses').filter(function (c) {
        return c.programme === s.programme && c.year === s.year && c.status === 'Active' && (scope === 'all' || c.semester === p.semester);
      });
    },
    tutorCourses: function (id) { return Repo.list('courses').filter(function (c) { return c.tutorId === id; }); },
    materialsOf: function (codes) { return Repo.list('materials').filter(function (m) { return codes.indexOf(m.courseCode) >= 0; }).sort(function (a, b) { return b.uploadedAt < a.uploadedAt ? -1 : 1; }); },
    materialCount: function (code) { return Repo.list('materials').filter(function (m) { return m.courseCode === code; }).length; },
    examsOf: function (codes) { return Repo.list('exams').filter(function (e) { return codes.indexOf(e.courseCode) >= 0; }).sort(function (a, b) { return a.date < b.date ? -1 : 1; }); },
    isUpcoming: function (e) { return e.status === 'Scheduled' && e.date >= today(); },
    notificationsFor: function (role) { return Repo.list('notifications').filter(function (n) { return n.audience === 'all' || n.audience === role; }).sort(function (a, b) { return a.date < b.date ? 1 : -1; }); },
    unread: function (user) {
      var read = Store.state.readNotifs[user.id] || [];
      return Q.notificationsFor(user.role).filter(function (n) { return read.indexOf(n.id) < 0; }).length;
    },
    /** Result groups = one published/unpublished decision per course + period + assessment. */
    resultGroups: function () {
      var map = {};
      Repo.list('results').forEach(function (r) {
        var k = r.courseCode + '|' + r.periodId + '|' + r.assessment;
        var g = map[k] || (map[k] = { key: k, courseCode: r.courseCode, periodId: r.periodId, assessment: r.assessment, count: 0, published: 0 });
        g.count++; if (r.published) g.published++;
      });
      return Object.keys(map).map(function (k) { var g = map[k]; g.status = g.published === g.count ? 'Published' : g.published === 0 ? 'Unpublished' : 'Partly published'; return g; });
    },
    groupRecords: function (key) { var p = key.split('|'); return Repo.list('results').filter(function (r) { return r.courseCode === p[0] && r.periodId === p[1] && r.assessment === p[2]; }); }
  };
  function sampleMaterialBlob(m) {
    var c = Q.course(m.courseCode);
    return makePdf(m.title, ['Course: ' + (c ? c.code + ' - ' + c.title : m.courseCode), 'Category: ' + m.category, 'Uploaded: ' + m.uploadedAt, '', m.description || '',
      '', 'This is a demonstration file generated in your browser.', 'It is not a real course document.']);
  }

  MLS.UI = {
    esc: esc, icon: icon, badge: badge, fmtDate: fmtDate, fmtShort: fmtShort, fmtTime: fmtTime, today: today, daysUntil: daysUntil, grade: grade, pct: pct, initials: initials,
    emptyState: emptyState, alertBox: alertBox, downloadBlob: downloadBlob, toCSV: toCSV, makePdf: makePdf, sampleMaterialBlob: sampleMaterialBlob,
    toast: toast, Modal: Modal, confirm: confirmDialog, field: field, collect: collect, setFieldError: setFieldError, optHtml: optHtml,
    table: table, listPage: listPage, refreshList: refreshList, listState: listState, resetLists: resetLists, register: register, Actions: Actions, Q: Q
  };
})();
