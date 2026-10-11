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
      '<div class="podium-wrap leaderboard-podium">' +
      renderPodiumPillar(top2, 2, '🥈', 170, activeQuiz.type === 'monthly' ? UI.formatUGX(70000) : 'Silver Finalist') +
      renderPodiumPillar(top1, 1, '🥇', 200, activeQuiz.type === 'monthly' ? UI.formatUGX(150000) : UI.formatUGX(50000)) +
      renderPodiumPillar(top3, 3, '🥉', 150, activeQuiz.type === 'monthly' ? UI.formatUGX(30000) : 'Bronze Finalist') +
      '</div>';

    // Leaderboard table
    var rowsHtml = lbEntries.map(function (e) {
      var isMe = user.role === 'student' && (e.regNo === user.username || e.studentName === user.name);
      var initials = UI.initials(e.studentName);
      var timeFormatted = Math.floor(e.timeSeconds / 60) + 'm ' + (e.timeSeconds % 60) + 's';
      var prizeBadge = e.prizeAmount > 0 ?
        '<span class="badge badge-green">' + icon('award') + ' ' + UI.formatUGX(e.prizeAmount) + ' (' + (e.paid ? 'Paid' : 'Pending') + ')</span>' :
        '<span class="badge badge-blue">' + esc(e.prizeStatus) + '</span>';

      return '<tr class="' + (isMe ? 'row-highlight' : '') + '">' +
        '<td data-label="Rank" style="font-weight:700;width:60px;font-size:1rem"><span class="rank-num rank-' + e.rank + '">#' + e.rank + '</span></td>' +
        '<td data-label="Competitor"><div style="display:flex;align-items:center;gap:10px">' +
        '<span class="avatar" style="width:34px;height:34px;font-size:.78rem">' + esc(initials) + '</span>' +
        '<div><strong>' + esc(e.studentName) + '</strong>' + (isMe ? ' <span class="badge badge-amber" style="font-size:0.65rem">YOU</span>' : '') +
        '<span class="cell-sub">' + esc(e.regNo) + '</span></div></div></td>' +
        '<td data-label="Score" class="num"><strong>' + e.score + '%</strong><span class="cell-sub">' + e.correctCount + '/' + e.totalQuestions + ' correct</span></td>' +
        '<td data-label="Time" class="num">' + timeFormatted + '</td>' +
        '<td data-label="Points" class="num"><strong style="color:var(--blue-700)">' + e.points + '</strong></td>' +
        '<td data-label="Prize">' + prizeBadge + '</td>' +
        '</tr>';
    }).join('');

    // Student Earnings Card
    var earningsCard = user.role === 'student' ?
      '<section class="quiz-wallet" aria-label="Prize summary">' +
      '<div class="quiz-wallet-main">' +
      '<span class="quiz-wallet-label">' + icon('wallet') + ' Prize wallet <span class="quiz-demo-tag">DEMO</span></span>' +
      '<p>Prize records from weekly challenges and monthly championships.</p>' +
      '<strong class="quiz-wallet-total">' + UI.formatUGX(totalEarnings) + '</strong>' +
      '<span class="quiz-wallet-caption">Total recorded prizes</span>' +
      '</div>' +
      '<div class="quiz-wallet-details">' +
      '<div class="quiz-wallet-detail"><span>Paid</span><strong>' + UI.formatUGX(paidEarnings) + '</strong></div>' +
      '<div class="quiz-wallet-detail"><span>Awaiting admin</span><strong>' + UI.formatUGX(pendingEarnings) + '</strong></div>' +
      '</div></section>' : '';

    var quizCtaCard = user.role === 'student' ?
      '<section class="quiz-feature">' +
      '<div class="quiz-feature-copy"><span class="quiz-feature-label">' + icon('trophy') + ' Open challenge</span>' +
      '<h2>' + esc(activeQuiz.title) + '</h2>' +
      '<p>' + esc(activeQuiz.description) + '</p>' +
      '<div class="quiz-feature-meta"><span>' + icon('clock') + ' ' + activeQuiz.durationMinutes + ' minutes</span><span>' + icon('layers') + ' ' + activeQuiz.questions.length + ' questions</span><span class="quiz-feature-prize">' + UI.formatUGX(activeQuiz.firstPrize) + ' prize</span></div></div>' +
      '<a href="#/' + user.role + '/quiz/' + activeQuiz.id + '" class="btn quiz-feature-action">' + icon('flask') + ' Start challenge</a>' +
      '</section>' : '';

    return MLS.App.pageHead('Quiz arena', 'Take clinical challenges, follow the live rankings, and track simulated prize records.') +
      earningsCard +
      quizCtaCard +
      '<section class="card leaderboard-card">' +
      '<div class="leaderboard-header"><div><span class="leaderboard-kicker">Live rankings</span><h2>' + esc(activeQuiz.type === 'monthly' ? 'Monthly championship' : 'Weekly challenge') + '</h2></div><span class="leaderboard-prize">' + UI.formatUGX(activeQuiz.type === 'monthly' ? 250000 : 50000) + ' prize pool</span></div>' +
      '<nav class="leaderboard-tabs" aria-label="Choose leaderboard">' +
      '<a href="#/' + user.role + '/leaderboard/weekly" class="leaderboard-tab' + (activeTab === 'weekly' ? ' is-active' : '') + '"' + (activeTab === 'weekly' ? ' aria-current="page"' : '') + '><span>Weekly</span><small>' + UI.formatUGX(50000) + ' first prize</small></a>' +
      '<a href="#/' + user.role + '/leaderboard/monthly" class="leaderboard-tab' + (activeTab === 'monthly' ? ' is-active' : '') + '"' + (activeTab === 'monthly' ? ' aria-current="page"' : '') + '><span>Monthly</span><small>' + UI.formatUGX(250000) + ' prize pool</small></a>' +
      '</nav>' +
      '<div class="card-body leaderboard-body">' +
      podiumHtml +
      '</div>' +
      '<div class="table-wrap">' +
      '<table class="table leaderboard-table">' +
      '<thead><tr>' +
      '<th>Rank</th><th>Competitor</th><th class="num">Score</th><th class="num">Time</th><th class="num">Points</th><th>Reward Status</th>' +
      '</tr></thead>' +
      '<tbody>' + (rowsHtml || '<tr><td colspan="6" class="empty">No submissions yet for this competition. Be the first!</td></tr>') + '</tbody>' +
      '</table></div></section>';
  }

  /* ---------- Admin Quiz & Prize Payment Management ---------- */
  function renderAdminPrizeManagement(param, user) {
    if (!user || user.role !== 'admin') {
      return MLS.App.pageHead('Admin access required') +
        UI.alertBox('error', 'Only administrators can approve quiz prize payments.') +
        '<p style="margin-top:14px"><a class="btn" href="#/' + (user ? user.role : 'login') + '/dashboard">Return to dashboard</a></p>';
    }

    var earnings = Quiz.getEarnings();
    var quizzes = Quiz.list();

    var earningsRows = earnings.map(function (e) {
      var isPaid = e.status === 'Paid';
      var payAction = isPaid ?
        '<span class="badge badge-green">' + icon('check') + ' Paid (' + esc(e.reference) + ')</span>' :
        '<button type="button" class="btn btn-sm btn-success" data-action="disbursePrize" data-eid="' + e.id + '" data-name="' + esc(e.studentName) + '" data-amt="' + e.amount + '">' + icon('award') + ' Record payment</button>';

      return '<tr>' +
        '<td data-label="Student"><strong>' + esc(e.studentName) + '</strong><span class="cell-sub">' + esc(e.regNo) + '</span></td>' +
        '<td data-label="Competition">' + esc(e.quizTitle) + '</td>' +
        '<td data-label="Prize Amount" class="num"><strong style="color:var(--green-700)">' + UI.formatUGX(e.amount) + '</strong></td>' +
        '<td data-label="Destination Account">' + esc(e.method) + '</td>' +
        '<td data-label="Status">' + (isPaid ? '<span class="badge badge-green">Disbursed</span>' : '<span class="badge badge-amber">Pending Approval</span>') + '</td>' +
        '<td data-label="" class="actions">' + payAction + '</td>' +
        '</tr>';
    }).join('');

    return MLS.App.pageHead('Admin Quiz Prize Payments', 'Administrators review quiz winners and record simulated prize payments.') +
      '<div class="grid grid-2 admin-quiz-grid" style="margin-bottom:20px">' +
      quizzes.map(function (q) {
        return '<div class="card card-pad admin-quiz-card">' +
          '<div class="admin-quiz-card-head" style="display:flex;justify-content:space-between;align-items:flex-start">' +
          '<div><span class="badge badge-blue">' + esc(q.type.toUpperCase()) + '</span>' +
          '<h3 style="margin-top:6px">' + esc(q.title) + '</h3></div>' +
          '<div class="stat-val admin-quiz-pool" style="color:var(--green-700)">' + UI.formatUGX(q.type === 'weekly' ? 50000 : 250000) + '</div></div>' +
          '<p class="muted small" style="margin:8px 0 12px">' + esc(q.description) + '</p>' +
          '<div style="display:flex;justify-content:space-between;align-items:center">' +
          '<span class="small muted">' + q.questions.length + ' questions &bull; ' + q.durationMinutes + ' mins</span>' +
          '<a href="#/admin/leaderboard" class="btn btn-sm btn-secondary">Review Submissions</a>' +
          '</div></div>';
      }).join('') +
      '</div>' +
      '<div class="card">' +
      '<div class="card-head"><h3>Administrator Payment Queue</h3><span class="badge badge-amber">' + earnings.filter(function (e) { return e.status !== 'Paid'; }).length + ' Pending</span></div>' +
      '<div class="table-wrap"><table class="table admin-payment-table">' +
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
      var user = MLS.Auth.current();
      if (!user || user.role !== 'admin') {
        UI.toast('Only administrators can approve quiz prize payments.', 'error');
        return;
      }
      var promptHtml =
        '<p>Record a simulated prize payment of <strong>' + UI.formatUGX(d.amt) + '</strong> to <strong>' + esc(d.name) + '</strong>.</p>' +
        '<div class="field" style="margin-top:12px"><label for="payout_ref">Transaction / Mobile Money Reference Code:</label>' +
        '<input type="text" id="payout_ref" value="MM-' + Date.now().toString(36).toUpperCase() + '" required>' +
        '</div>';
      UI.Modal.open({
        title: 'Approve Prize Disbursal',
        body: promptHtml,
        onSubmit: function (form) {
          var currentUser = MLS.Auth.current();
          if (!currentUser || currentUser.role !== 'admin') {
            UI.toast('Only administrators can approve quiz prize payments.', 'error');
            return false;
          }
          var input = form.querySelector('#payout_ref');
          var reference = input ? input.value.trim() : '';
          if (!reference) {
            UI.toast('Enter the payment transaction reference before approval.', 'error');
            if (input) input.focus();
            return false;
          }
          if (!Quiz.markEarningsPaid(d.eid, reference)) {
            UI.toast('The pending prize payment could not be found.', 'error');
            return false;
          }
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
    renderAdminPrizeManagement: renderAdminPrizeManagement
  };
})();
