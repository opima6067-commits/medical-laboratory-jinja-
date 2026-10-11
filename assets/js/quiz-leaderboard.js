/* ==========================================================================
   quiz-leaderboard.js - Weekly & Monthly Clinical Quizzes and Leaderboard
   Features:
   - Interactive timed clinical quizzes with instant scoring & feedback
   - Weekly & Monthly Leaderboard rankings with 1st, 2nd, 3rd podiums
   - Real scholarship cash prize tracking & payout status management
   ========================================================================== */
(function () {
  'use strict';
  var MLS = window.MLS, UI = MLS.UI, Store = MLS.Store, Quiz = MLS.Quiz, esc = UI.esc, icon = UI.icon;

  // Active quiz state in session
  var activeSession = {
    quizId: null,
    answers: {},
    currentIndex: 0,
    secondsLeft: 0,
    timerId: null,
    startTime: 0
  };

  /* ---------- Interactive Quiz Player ---------- */
  function renderQuizPlayer(quizId, user) {
    var q = Quiz.get(quizId) || (!quizId ? Quiz.list()[0] : null);
    if (!q) {
      return MLS.App.pageHead('Quiz Not Found') + UI.alertBox('warn', 'The selected quiz is unavailable.') +
        '<p style="margin-top:14px"><a class="btn" href="#/' + user.role + '/leaderboard">Back to Leaderboard</a></p>';
    }
    var stepMatch = /(?:\?|&)step=(\d+)/.exec(location.hash);
    var requestedIndex = stepMatch ? parseInt(stepMatch[1], 10) : null;
    if (requestedIndex !== null && requestedIndex >= q.questions.length) requestedIndex = q.questions.length - 1;

    // Initialize state if switching quizzes or first load
    if (activeSession.quizId !== q.id) {
      if (activeSession.timerId) clearInterval(activeSession.timerId);
      activeSession.quizId = q.id;
      activeSession.answers = {};
      activeSession.currentIndex = requestedIndex !== null ? requestedIndex : 0;
      activeSession.secondsLeft = q.durationMinutes * 60;
      activeSession.startTime = Date.now();

      // Start timer
      activeSession.timerId = setInterval(function () {
        activeSession.secondsLeft--;
        var timerEl = document.getElementById('quiz-timer-display');
        var barEl = document.getElementById('quiz-timer-bar');
        if (timerEl) {
          var m = Math.floor(activeSession.secondsLeft / 60);
          var s = activeSession.secondsLeft % 60;
          timerEl.textContent = (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
          if (activeSession.secondsLeft < 60) timerEl.style.color = 'var(--red-600)';
          else if (activeSession.secondsLeft < 180) timerEl.style.color = 'var(--amber-600)';
        }
        if (barEl) {
          var totalSec = q.durationMinutes * 60;
          var pct = Math.max(0, (activeSession.secondsLeft / totalSec) * 100);
          barEl.style.width = pct + '%';
        }
        if (activeSession.secondsLeft <= 0) {
          clearInterval(activeSession.timerId);
          activeSession.timerId = null;
          submitQuiz(q.id, user, true);
        }
      }, 1000);
    } else if (requestedIndex !== null) {
      activeSession.currentIndex = requestedIndex;
    }

    var idx = activeSession.currentIndex;
    var question = q.questions[idx];
    var total = q.questions.length;
    var m = Math.floor(activeSession.secondsLeft / 60);
    var s = activeSession.secondsLeft % 60;
    var timeStr = (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;

    var optionsHtml = question.options.map(function (opt, oIdx) {
      var isChecked = activeSession.answers[idx] === oIdx;
      return '<label class="quiz-option-card' + (isChecked ? ' selected' : '') + '">' +
        '<input type="radio" name="quiz_opt" value="' + oIdx + '"' + (isChecked ? ' checked' : '') +
        ' data-action="pickOption" data-qidx="' + idx + '" data-oidx="' + oIdx + '">' +
        '<span class="quiz-opt-letter">' + String.fromCharCode(65 + oIdx) + '</span>' +
        '<span class="quiz-opt-text">' + esc(opt) + '</span>' +
        '</label>';
    }).join('');

    var prevBtn = idx > 0 ?
      '<button type="button" class="btn btn-secondary" data-action="prevQuestion" data-idx="' + (idx - 1) + '">' + icon('chevron') + ' Previous</button>' : '';

    var nextOrFinishBtn = idx < total - 1 ?
      '<button type="button" class="btn" data-action="nextQuestion" data-idx="' + (idx + 1) + '">Next Question ' + icon('chevron') + '</button>' :
      '<button type="button" class="btn btn-success" data-action="finishQuiz" data-qid="' + q.id + '">' + icon('check') + ' Submit Challenge</button>';

    var progressDots = q.questions.map(function (_, dIdx) {
      var answered = activeSession.answers[dIdx] !== undefined;
      var cur = dIdx === idx;
      return '<button type="button" class="quiz-dot' + (cur ? ' active' : '') + (answered ? ' answered' : '') +
        '" data-action="jumpQuestion" data-idx="' + dIdx + '" title="Question ' + (dIdx + 1) + '">' + (dIdx + 1) + '</button>';
    }).join('');

    return '<div class="quiz-container">' +
      '<div class="card quiz-card">' +
      '<div class="quiz-head">' +
      '<div>' +
      '<div class="badge badge-amber" style="margin-bottom:6px">' + icon('award') + ' ' + esc(q.prizePool) + '</div>' +
      '<h2 style="font-size:1.25rem">' + esc(q.title) + '</h2>' +
      '<p class="muted small" style="margin:2px 0 0">' + esc(q.subject) + ' &bull; Question ' + (idx + 1) + ' of ' + total + '</p>' +
      '</div>' +
      '<div class="quiz-timer-box">' +
      '<span class="small muted" style="display:block;font-weight:600">Time Remaining</span>' +
      '<span class="quiz-timer-value" id="quiz-timer-display">' + timeStr + '</span>' +
      '</div></div>' +
      '<div class="quiz-progress-track"><div class="quiz-progress-fill" id="quiz-timer-bar" style="width:' + ((activeSession.secondsLeft / (q.durationMinutes * 60)) * 100) + '%"></div></div>' +
      '<div class="card-body quiz-body">' +
      '<div class="quiz-dots-row">' + progressDots + '</div>' +
      '<div class="quiz-question-box">' +
      '<span class="quiz-qnum">Question ' + (idx + 1) + '</span>' +
      '<h3 class="quiz-qtext">' + esc(question.text) + '</h3>' +
      '</div>' +
      '<div class="quiz-options-grid">' + optionsHtml + '</div>' +
      '</div>' +
      '<div class="card-head quiz-foot" style="border-top:1px solid var(--border);border-bottom:none">' +
      '<div><a href="#/' + user.role + '/leaderboard" class="btn btn-ghost btn-sm" data-action="exitQuiz">Exit Quiz</a></div>' +
      '<div style="display:flex;gap:10px">' + prevBtn + nextOrFinishBtn + '</div>' +
      '</div></div></div>';
  }

  function submitQuiz(quizId, user, isTimeout) {
    if (activeSession.timerId) {
      clearInterval(activeSession.timerId);
      activeSession.timerId = null;
    }
    var q = Quiz.get(quizId);
    var elapsedSeconds = Math.round((Date.now() - activeSession.startTime) / 1000);
    var student = user.role === 'student' ?
      (Store.state.students.find(function (s) { return s.email === user.email || s.regNo === user.username; }) || Store.state.students[0]) :
      Store.state.students[0];

    var result = Quiz.submitAttempt(quizId, student, activeSession.answers, elapsedSeconds);

    // Reset session
    activeSession.quizId = null;
    activeSession.answers = {};

    var modalContent =
      '<div style="text-align:center;padding:10px 0">' +
      '<div style="width:72px;height:72px;border-radius:50%;background:' + (result.score >= 80 ? 'var(--green-50)' : 'var(--blue-50)') + ';color:' + (result.score >= 80 ? 'var(--green-700)' : 'var(--blue-600)') + ';display:grid;place-items:center;margin:0 auto 16px;font-size:2rem">' +
      (result.score >= 80 ? '🏆' : '🎯') + '</div>' +
      '<h2 style="font-size:1.5rem;color:var(--navy-900)">' + (isTimeout ? 'Time Expired!' : 'Challenge Submitted!') + '</h2>' +
      '<p class="muted" style="margin-top:4px">' + esc(q.title) + '</p>' +
      '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:20px 0">' +
      '<div class="stat" style="flex-direction:column;align-items:center;padding:12px"><div class="stat-val" style="color:var(--blue-600)">' + result.score + '%</div><div class="stat-label">Accuracy</div></div>' +
      '<div class="stat" style="flex-direction:column;align-items:center;padding:12px"><div class="stat-val" style="color:var(--green-700)">#' + result.rank + '</div><div class="stat-label">Current Rank</div></div>' +
      '<div class="stat" style="flex-direction:column;align-items:center;padding:12px"><div class="stat-val" style="color:var(--navy-900)">' + result.points + '</div><div class="stat-label">Points</div></div>' +
      '</div>' +
      (result.rank === 1 ?
        '<div class="alert alert-ok" style="text-align:left;margin-bottom:18px">' + icon('award') +
        '<div><strong>🎉 Outstanding Achievement!</strong> You currently hold <strong>Rank #1</strong> and qualify for the <strong>' + esc(q.prizePool) + '</strong> reward! Your earnings will appear in your Quiz Wallet.</div></div>' :
        '<div class="alert alert-info" style="text-align:left;margin-bottom:18px">' + icon('info') +
        '<div><strong>Great Effort!</strong> You completed ' + result.correct + ' of ' + result.total + ' questions correctly in ' + Math.floor(elapsedSeconds / 60) + 'm ' + (elapsedSeconds % 60) + 's. Check the live rankings below!</div></div>'
      ) +
      '<a href="#/' + user.role + '/leaderboard" class="btn btn-block" data-modal-close>Open Live Leaderboard</a>' +
      '</div>';

    UI.Modal.open({ title: 'Quiz Results', body: modalContent });
    location.hash = '#/' + user.role + '/leaderboard';
  }

  /* ---------- Leaderboard View ---------- */
  function renderLeaderboardView(param, user) {
    var activeTab = param || 'weekly';
    var quizzes = Quiz.list();
    var activeQuiz = activeTab === 'monthly' ?
      quizzes.find(function (q) { return q.type === 'monthly'; }) || quizzes[1] :
      quizzes.find(function (q) { return q.type === 'weekly'; }) || quizzes[0];

    var lbEntries = Quiz.getLeaderboard(activeQuiz.id);
    var earnings = Quiz.getEarnings(user.role === 'student' ? user.studentRegNo || 'MLS/26/001' : null);
    var totalEarnings = earnings.reduce(function (sum, e) { return sum + e.amount; }, 0);
    var paidEarnings = earnings.filter(function (e) { return e.status === 'Paid'; }).reduce(function (sum, e) { return sum + e.amount; }, 0);
    var pendingEarnings = totalEarnings - paidEarnings;

    // Top 3 Podium
    var top1 = lbEntries[0] || null;
    var top2 = lbEntries[1] || null;
    var top3 = lbEntries[2] || null;

    function renderPodiumPillar(entry, place, medal, heightPx, prizeTag) {
      if (!entry) return '<div class="podium-col empty-col" style="height:' + heightPx + 'px"><div class="podium-empty-slot">Spot Open</div></div>';
      var initials = UI.initials(entry.studentName);
      return '<div class="podium-col place-' + place + '" style="height:' + heightPx + 'px">' +
        '<div class="podium-avatar-wrap">' +
        '<div class="avatar avatar-podium">' + esc(initials) + '</div>' +
        '<span class="podium-medal">' + medal + '</span>' +
        '</div>' +
        '<div class="podium-details">' +
        '<strong class="podium-name">' + esc(entry.studentName) + '</strong>' +
        '<span class="podium-points">' + entry.points + ' pts &bull; ' + entry.score + '%</span>' +
        '<span class="podium-time">' + Math.floor(entry.timeSeconds / 60) + 'm ' + (entry.timeSeconds % 60) + 's</span>' +
        (prizeTag ? '<span class="podium-prize-pill">' + prizeTag + '</span>' : '') +
        '</div>' +
        '<div class="podium-pedestal"><span>#' + place + '</span></div>' +
        '</div>';
    }

    var podiumHtml =
      '<div class="podium-wrap">' +
      renderPodiumPillar(top2, 2, '🥈', 220, activeQuiz.type === 'monthly' ? '$70 Prize' : 'Silver Finalist') +
      renderPodiumPillar(top1, 1, '🥇', 260, activeQuiz.type === 'monthly' ? '$150 Champion' : '$50 Cash Prize') +
      renderPodiumPillar(top3, 3, '🥉', 190, activeQuiz.type === 'monthly' ? '$30 Prize' : 'Bronze Finalist') +
      '</div>';

    // Leaderboard table
    var rowsHtml = lbEntries.map(function (e) {
      var isMe = user.role === 'student' && (e.regNo === user.username || e.studentName === user.name);
      var initials = UI.initials(e.studentName);
      var timeFormatted = Math.floor(e.timeSeconds / 60) + 'm ' + (e.timeSeconds % 60) + 's';
      var prizeBadge = e.prizeAmount > 0 ?
        '<span class="badge badge-green">' + icon('award') + ' $' + e.prizeAmount + ' Prize (' + (e.paid ? 'Paid' : 'Pending') + ')</span>' :
        '<span class="badge badge-blue">' + esc(e.prizeStatus) + '</span>';

      return '<tr class="' + (isMe ? 'row-highlight' : '') + '">' +
        '<td style="font-weight:700;width:60px;font-size:1rem"><span class="rank-num rank-' + e.rank + '">#' + e.rank + '</span></td>' +
        '<td><div style="display:flex;align-items:center;gap:10px">' +
        '<span class="avatar" style="width:34px;height:34px;font-size:.78rem">' + esc(initials) + '</span>' +
        '<div><strong>' + esc(e.studentName) + '</strong>' + (isMe ? ' <span class="badge badge-amber" style="font-size:0.65rem">YOU</span>' : '') +
        '<span class="cell-sub">' + esc(e.regNo) + '</span></div></div></td>' +
        '<td class="num"><strong>' + e.score + '%</strong><span class="cell-sub">' + e.correctCount + '/' + e.totalQuestions + ' correct</span></td>' +
        '<td class="num">' + timeFormatted + '</td>' +
        '<td class="num"><strong style="color:var(--blue-700)">' + e.points + '</strong></td>' +
        '<td>' + prizeBadge + '</td>' +
        '</tr>';
    }).join('');

    // Student Earnings Card
    var earningsCard = user.role === 'student' ?
      '<div class="card card-pad" style="margin-bottom:24px;background:linear-gradient(135deg,#0a1f3d 0%,#06111f 100%);color:#fff;border-color:rgba(255,255,255,0.1)">' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:14px">' +
      '<div>' +
      '<div class="badge badge-amber" style="margin-bottom:8px">' + icon('award') + ' Academic Quiz Wallet</div>' +
      '<h2 style="color:#fff;font-size:1.4rem">My Prize Earnings</h2>' +
      '<p style="color:#94a3b8;font-size:0.88rem;margin:2px 0 0">Cash prizes won from weekly clinical quizzes &amp; monthly championships.</p>' +
      '</div>' +
      '<div style="display:flex;gap:18px;align-items:center">' +
      '<div style="text-align:right"><div style="font-size:1.6rem;font-weight:800;color:#38bdf8">$' + totalEarnings + ' USD</div><div style="font-size:0.75rem;color:#cbd5e1">Total Prize Money Won</div></div>' +
      '</div></div>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-top:18px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.1)">' +
      '<div><div style="font-size:0.75rem;color:#94a3b8">Paid via Mobile Money</div><div style="font-size:1.1rem;font-weight:700;color:#a7f3d0">$' + paidEarnings + '</div></div>' +
      '<div><div style="font-size:0.75rem;color:#94a3b8">Pending Registrar Disbursal</div><div style="font-size:1.1rem;font-weight:700;color:#fde68a">$' + pendingEarnings + '</div></div>' +
      '<div><div style="font-size:0.75rem;color:#94a3b8">Payout Method</div><div style="font-size:0.95rem;font-weight:600;color:#e2e8f0">MTN Mobile Money</div></div>' +
      '</div></div>' : '';

    var quizCtaCard =
      '<div class="card card-pad" style="margin-bottom:20px;border-left:4px solid var(--blue-600);background:#f0f9ff">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:14px">' +
      '<div>' +
      '<span class="badge badge-amber">' + icon('award') + ' ' + esc(activeQuiz.prizePool) + '</span>' +
      '<h3 style="margin-top:6px;font-size:1.15rem">' + esc(activeQuiz.title) + '</h3>' +
      '<p class="muted small" style="margin:2px 0 0">' + esc(activeQuiz.description) + ' &bull; ' + activeQuiz.durationMinutes + ' minutes &bull; Ends in 5 days</p>' +
      '</div>' +
      '<div>' +
      '<a href="#/' + user.role + '/quiz/' + activeQuiz.id + '" class="btn" style="box-shadow:0 4px 14px rgba(2,132,199,0.3)">' +
      icon('flask') + ' Take Active Challenge Now</a>' +
      '</div></div></div>';

    return MLS.App.pageHead('Clinical Quiz Arena & Leadership', 'Weekly challenges and monthly olympiads with simulated prize tracking.') +
      earningsCard +
      quizCtaCard +
      '<div class="card" style="margin-top:20px">' +
      '<div class="card-head" style="flex-wrap:wrap;gap:12px">' +
      '<div class="seg" role="tablist">' +
      '<a href="#/' + user.role + '/leaderboard/weekly" class="btn btn-sm' + (activeTab === 'weekly' ? ' btn-primary" aria-pressed="true"' : ' btn-ghost"') + '>' + icon('calendar') + ' Weekly Challenge ($50 1st Prize)</a>' +
      '<a href="#/' + user.role + '/leaderboard/monthly" class="btn btn-sm' + (activeTab === 'monthly' ? ' btn-primary" aria-pressed="true"' : ' btn-ghost"') + '>' + icon('award') + ' Monthly Olympiad ($250 Pool)</a>' +
      '</div>' +
      '<div style="font-size:0.8125rem;color:var(--muted)">' + icon('clock') + ' Refreshes live on every quiz completion</div>' +
      '</div>' +
      '<div class="card-body" style="padding-bottom:10px">' +
      podiumHtml +
      '</div>' +
      '<div class="table-wrap">' +
      '<table class="table">' +
      '<thead><tr>' +
      '<th>Rank</th><th>Competitor</th><th class="num">Score</th><th class="num">Time</th><th class="num">Points</th><th>Reward Status</th>' +
      '</tr></thead>' +
      '<tbody>' + (rowsHtml || '<tr><td colspan="6" class="empty">No submissions yet for this competition. Be the first!</td></tr>') + '</tbody>' +
      '</table></div></div>';
  }

  /* ---------- Registrar Quiz & Prize Payout Management ---------- */
  function renderRegistrarLeaderboard(param, user) {
    var earnings = Quiz.getEarnings();
    var quizzes = Quiz.list();

    var earningsRows = earnings.map(function (e) {
      var isPaid = e.status === 'Paid';
      var payAction = isPaid ?
        '<span class="badge badge-green">' + icon('check') + ' Paid (' + esc(e.reference) + ')</span>' :
        '<button type="button" class="btn btn-sm btn-success" data-action="disbursePrize" data-eid="' + e.id + '" data-name="' + esc(e.studentName) + '" data-amt="' + e.amount + '">' + icon('award') + ' Disburse $' + e.amount + '</button>';

      return '<tr>' +
        '<td><strong>' + esc(e.studentName) + '</strong><span class="cell-sub">' + esc(e.regNo) + '</span></td>' +
        '<td>' + esc(e.quizTitle) + '</td>' +
        '<td class="num"><strong style="color:var(--green-700)">$' + e.amount + ' USD</strong></td>' +
        '<td>' + esc(e.method) + '</td>' +
        '<td>' + (isPaid ? '<span class="badge badge-green">Disbursed</span>' : '<span class="badge badge-amber">Pending Approval</span>') + '</td>' +
        '<td class="actions">' + payAction + '</td>' +
        '</tr>';
    }).join('');

    return MLS.App.pageHead('Quiz Competitions & Prize Disbursals', 'Manage weekly quiz challenges, leaderboards, and record simulated student prize payouts.') +
      '<div class="grid grid-2" style="margin-bottom:20px">' +
      quizzes.map(function (q) {
        return '<div class="card card-pad">' +
          '<div style="display:flex;justify-content:space-between;align-items:flex-start">' +
          '<div><span class="badge badge-blue">' + esc(q.type.toUpperCase()) + '</span>' +
          '<h3 style="margin-top:6px">' + esc(q.title) + '</h3></div>' +
          '<div class="stat-val" style="color:var(--green-700)">' + esc(q.prizePool) + '</div></div>' +
          '<p class="muted small" style="margin:8px 0 12px">' + esc(q.description) + '</p>' +
          '<div style="display:flex;justify-content:space-between;align-items:center">' +
          '<span class="small muted">' + q.questions.length + ' questions &bull; ' + q.durationMinutes + ' mins</span>' +
          '<a href="#/registrar/leaderboard" class="btn btn-sm btn-secondary">Review Submissions</a>' +
          '</div></div>';
      }).join('') +
      '</div>' +
      '<div class="card">' +
      '<div class="card-head"><h3>Winner Prize Payout Queue</h3><span class="badge badge-amber">' + earnings.filter(function (e) { return e.status !== 'Paid'; }).length + ' Pending</span></div>' +
      '<div class="table-wrap"><table class="table">' +
      '<thead><tr><th>Student</th><th>Competition</th><th class="num">Prize Amount</th><th>Destination Account</th><th>Status</th><th class="actions">Action</th></tr></thead>' +
      '<tbody>' + (earningsRows || '<tr><td colspan="6" class="empty">No prize disbursals pending.</td></tr>') + '</tbody>' +
      '</table></div></div>';
  }

  /* ---------- Action Handlers ---------- */
  UI.register({
    pickOption: function (d, el) {
      var qidx = parseInt(d.qidx, 10);
      var oidx = parseInt(d.oidx, 10);
      activeSession.answers[qidx] = oidx;
      document.querySelectorAll('.quiz-option-card').forEach(function (c) { c.classList.remove('selected'); });
      el.closest('.quiz-option-card').classList.add('selected');
      // Update progress dot
      var dots = document.querySelectorAll('.quiz-dot');
      if (dots[qidx]) dots[qidx].classList.add('answered');
    },
    nextQuestion: function (d) {
      activeSession.currentIndex = parseInt(d.idx, 10);
      location.hash = '#/student/quiz/' + activeSession.quizId + '?step=' + activeSession.currentIndex;
    },
    prevQuestion: function (d) {
      activeSession.currentIndex = parseInt(d.idx, 10);
      location.hash = '#/student/quiz/' + activeSession.quizId + '?step=' + activeSession.currentIndex;
    },
    jumpQuestion: function (d) {
      activeSession.currentIndex = parseInt(d.idx, 10);
      location.hash = '#/student/quiz/' + activeSession.quizId + '?step=' + activeSession.currentIndex;
    },
    finishQuiz: function (d) {
      var user = MLS.Auth.current();
      submitQuiz(d.qid, user, false);
    },
    exitQuiz: function () {
      if (activeSession.timerId) {
        clearInterval(activeSession.timerId);
        activeSession.timerId = null;
      }
      activeSession.quizId = null;
    },
    disbursePrize: function (d) {
      var promptHtml =
        '<p>Confirm scholarship prize disbursal of <strong>$' + esc(d.amt) + ' USD</strong> to <strong>' + esc(d.name) + '</strong>.</p>' +
        '<div class="field" style="margin-top:12px"><label for="payout_ref">Transaction / Mobile Money Reference Code:</label>' +
        '<input type="text" id="payout_ref" value="MM-' + Date.now().toString(36).toUpperCase() + '" required>' +
        '</div>';
      UI.Modal.open({
        title: 'Approve Prize Disbursal',
        body: promptHtml,
        onSubmit: function (form) {
          var input = form.querySelector('#payout_ref');
          Quiz.markEarningsPaid(d.eid, input ? input.value.trim() : '');
          UI.toast('Prize payment recorded successfully!', 'ok');
          MLS.App.refresh();
        }
      });
    }
  });

  window.MLS = window.MLS || {};
  window.MLS.QuizViews = {
    renderQuizPlayer: renderQuizPlayer,
    renderLeaderboardView: renderLeaderboardView,
    renderRegistrarLeaderboard: renderRegistrarLeaderboard
  };
})();
