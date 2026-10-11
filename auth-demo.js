/* ==========================================================================
   auth-demo.js - DEMONSTRATION ONLY login.

   This is NOT real authentication. Credentials are fictional, visible in the
   page source, and the "session" is a sessionStorage flag anyone can edit.
   In production, sign-in, sessions and role checks must be performed by a
   trusted backend (see docs/backend-roadmap.md). Replace Auth.login() with a
   call to that backend and remove the demo users from demo-data.js.
   ========================================================================== */
(function () {
  'use strict';
  var MLS = window.MLS, Repo = MLS.Repo, Store = MLS.Store;

  var Auth = {
    /** Returns { ok, user?, error? } after checking the fictional demo accounts. */
    login: function (identifier, password) {
      var id = String(identifier || '').trim().toLowerCase();
      var u = Repo.list('users').find(function (x) { return x.email.toLowerCase() === id; });
      if (!u || u.password !== password) return { ok: false, error: 'The email or password is not correct. Use one of the demo accounts shown on this page.' };
      Store.session.set({ userId: u.id, role: u.role, at: Date.now() });
      return { ok: true, user: u };
    },
    logout: function () { Store.session.clear(); },
    /** The signed-in demo user (or null). */
    current: function () {
      var s = Store.session.get();
      if (!s) return null;
      var u = Repo.get('users', s.userId);
      return u ? { id: u.id, role: u.role, name: u.name, email: u.email, refId: u.refId } : null;
    }
  };
  MLS.Auth = Auth;
})();
