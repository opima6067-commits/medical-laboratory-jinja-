/* ==========================================================================
   store.js - central demonstration state + a small "repository" layer.

   IMPORTANT: localStorage is NOT a secure database. It holds only fictional
   demo records. Uploaded files are kept as temporary in-memory object URLs
   (they vanish on refresh) and are never written to localStorage.

   BACKEND SEAM: every view reads/writes through MLS.Repo (list/get/insert/
   update/remove). In the backend phase these functions become API calls and
   the browser state goes away.
   ========================================================================== */
(function () {
  'use strict';
  var KEY = 'mlsPortalDemo.v2';
  var SESSION_KEY = 'mlsPortalSession.v2';
  var REMEMBER_KEY = 'mlsPortalRemember.v2';
  var PK = { students: 'regNo', tutors: 'id', courses: 'code', programmes: 'code', periods: 'id', materials: 'id', exams: 'id', results: 'id', notifications: 'id', users: 'id' };
  var state;
  var files = {}; // materialId -> { url, name } temporary, in-memory only

  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); return true; } catch (e) { return false; }
  }
  function fresh() { state = window.MLS_SEED_BUILDER(); persist(); return state; }
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var s = JSON.parse(raw);
        if (s && s.version === 1 && s.courses && s.students && s.users && s.users.some(function (u) { return u.role === 'admin'; })) {
          if (s.settings && s.settings.institutionName === 'Medical Laboratory School (Demo)') {
            s.settings.institutionName = 'National Institute of Medical Laboratory Sciences';
            persist();
          }
          state = s; return state;
        }
      }
    } catch (e) { /* fall through to fresh seed */ }
    return fresh();
  }
  function uid(prefix) { return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); }

  var Repo = {
    list: function (coll) { return state[coll]; },
    get: function (coll, key) { var k = PK[coll]; return state[coll].find(function (r) { return r[k] === key; }) || null; },
    insert: function (coll, rec) { state[coll].push(rec); persist(); return rec; },
    update: function (coll, key, patch) {
      var r = Repo.get(coll, key); if (!r) return null; Object.assign(r, patch); persist(); return r;
    },
    remove: function (coll, key) {
      var k = PK[coll], i = state[coll].findIndex(function (r) { return r[k] === key; });
      if (i < 0) return false; state[coll].splice(i, 1); persist(); return true;
    },
    removeWhere: function (coll, fn) { state[coll] = state[coll].filter(function (r) { return !fn(r); }); persist(); },
    save: persist
  };

  var Store = {
    init: load,
    get state() { return state; },
    uid: uid,
    reset: function () { Object.keys(files).forEach(function (k) { try { URL.revokeObjectURL(files[k].url); } catch (e) {} delete files[k]; }); fresh(); },
    files: files,
    log: function (text) { state.activity.unshift({ at: new Date().toISOString().slice(0, 10), text: text }); state.activity = state.activity.slice(0, 15); persist(); },
    activePeriod: function () { return Repo.get('periods', state.settings.activePeriodId) || state.periods[0]; },
    periodLabel: function (id) { var p = Repo.get('periods', id); return p ? p.year + ' - Semester ' + p.semester : (id || 'Unknown period'); },
    session: {
      get: function () { try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)); } catch (e) { return null; } },
      set: function (s) { sessionStorage.setItem(SESSION_KEY, JSON.stringify(s)); },
      clear: function () { sessionStorage.removeItem(SESSION_KEY); }
    },
    remember: {
      get: function () { try { return localStorage.getItem(REMEMBER_KEY) || ''; } catch (e) { return ''; } },
      set: function (v) { try { if (v) localStorage.setItem(REMEMBER_KEY, v); else localStorage.removeItem(REMEMBER_KEY); } catch (e) {} }
    }
  };

  window.MLS = window.MLS || {};
  window.MLS.Repo = Repo;
  window.MLS.Store = Store;
})();
