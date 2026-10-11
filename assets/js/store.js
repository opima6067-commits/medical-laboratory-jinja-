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
  var PK = { students: 'regNo', tutors: 'id', courses: 'code', programmes: 'code', periods: 'id', materials: 'id', exams: 'id', results: 'id', notifications: 'id', users: 'id', quizzes: 'id', leaderboard: 'id', earnings: 'id' };
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
          }
          // Seed quiz & leaderboard collections if missing from earlier session
          if (!s.quizzes || !s.leaderboard || !s.earnings) {
            var freshData = window.MLS_SEED_BUILDER();
            s.quizzes = s.quizzes || freshData.quizzes;
            s.leaderboard = s.leaderboard || freshData.leaderboard;
            s.earnings = s.earnings || freshData.earnings;
          }
          persist();
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

  var Quiz = {
    get: function (id) {
      return (state.quizzes || []).find(function (q) { return q.id === id; }) || null;
    },
    list: function () {
      return state.quizzes || [];
    },
    getLeaderboard: function (quizId) {
      var entries = (state.leaderboard || []).filter(function (l) { return l.quizId === quizId; });
      entries.sort(function (a, b) {
        if (b.points !== a.points) return b.points - a.points;
        return a.timeSeconds - b.timeSeconds;
      });
      return entries;
    },
    submitAttempt: function (quizId, student, answers, timeSeconds) {
      var q = Quiz.get(quizId);
      if (!q) return null;
      var correct = 0;
      q.questions.forEach(function (quest, idx) {
        if (answers[idx] === quest.correct) correct++;
      });
      var total = q.questions.length;
      var pct = Math.round((correct / total) * 100);
      var speedBonus = Math.max(0, 100 - Math.floor(timeSeconds / 3));
      var points = (correct * 180) + speedBonus;

      var existing = state.leaderboard.find(function (l) { return l.quizId === quizId && l.regNo === student.regNo; });
      if (existing) {
        if (points > existing.points) {
          existing.score = pct;
          existing.correctCount = correct;
          existing.timeSeconds = timeSeconds;
          existing.points = points;
          existing.date = new Date().toISOString().slice(0, 10);
        }
      } else {
        existing = {
          id: uid('lb'),
          quizId: quizId,
          regNo: student.regNo,
          studentName: student.name,
          score: pct,
          correctCount: correct,
          totalQuestions: total,
          timeSeconds: timeSeconds,
          points: points,
          rank: 99,
          prizeStatus: 'Participant',
          prizeAmount: 0,
          paid: false,
          date: new Date().toISOString().slice(0, 10)
        };
        state.leaderboard.push(existing);
      }

      var entries = Quiz.getLeaderboard(quizId);
      entries.forEach(function (e, idx) {
        e.rank = idx + 1;
        if (q.type === 'weekly') {
          if (e.rank === 1) {
            e.prizeStatus = '1st Place Winner ($50 Cash Prize)';
            e.prizeAmount = 50;
            if (!state.earnings.some(function (ern) { return ern.quizId === quizId && ern.regNo === e.regNo; })) {
              state.earnings.unshift({
                id: uid('ern'),
                regNo: e.regNo,
                studentName: e.studentName,
                quizId: quizId,
                quizTitle: q.title,
                amount: 50,
                status: 'Pending Approval',
                method: 'Mobile Money (+256 772 123456)',
                date: new Date().toISOString().slice(0, 10),
                reference: 'WINNER-' + Date.now().toString(36).toUpperCase()
              });
            }
          } else if (e.rank === 2) {
            e.prizeStatus = '2nd Place Finalist';
          } else if (e.rank === 3) {
            e.prizeStatus = '3rd Place Finalist';
          } else {
            e.prizeStatus = 'Top ' + e.rank + ' Competitor';
          }
        } else if (q.type === 'monthly') {
          if (e.rank === 1) {
            e.prizeStatus = 'Grand Champion ($150 Cash Prize)';
            e.prizeAmount = 150;
          } else if (e.rank === 2) {
            e.prizeStatus = '2nd Place ($70 Cash Prize)';
            e.prizeAmount = 70;
          } else if (e.rank === 3) {
            e.prizeStatus = '3rd Place ($30 Cash Prize)';
            e.prizeAmount = 30;
          } else {
            e.prizeStatus = 'Top ' + e.rank + ' Olympiad Scholar';
          }
        }
      });

      Store.log(student.name + ' scored ' + pct + '% in ' + q.title + ' (Rank #' + existing.rank + ')');
      persist();
      return { score: pct, correct: correct, total: total, points: points, rank: existing.rank, prizeStatus: existing.prizeStatus };
    },
    getEarnings: function (regNo) {
      return (state.earnings || []).filter(function (e) { return !regNo || e.regNo === regNo; });
    },
    markEarningsPaid: function (id, method) {
      var item = state.earnings.find(function (e) { return e.id === id; });
      if (!item) return false;
      item.status = 'Paid';
      if (method) item.method = method;
      item.paidAt = new Date().toISOString().slice(0, 10);
      var lb = state.leaderboard.find(function (l) { return l.quizId === item.quizId && l.regNo === item.regNo; });
      if (lb) lb.paid = true;
      Store.log('Registrar marked $' + item.amount + ' prize paid to ' + item.studentName);
      persist();
      return true;
    }
  };

  window.MLS = window.MLS || {};
  window.MLS.Repo = Repo;
  window.MLS.Store = Store;
  window.MLS.Quiz = Quiz;
})();
