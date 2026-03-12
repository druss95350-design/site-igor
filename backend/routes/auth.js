/* ============================================================
   CORSE PRO SERVICES — routes/auth.js
   Authentification Google OAuth 2.0 + middleware de protection
   ============================================================ */

const express  = require('express');
const passport = require('passport');
const router   = express.Router();

/* ─── Middleware de protection ──────────────────────────────
   À importer dans les routes protégées :
   const { estAuthentifie } = require('./auth');
   ─────────────────────────────────────────────────────────── */
function estAuthentifie(req, res, next) {
  if (req.isAuthenticated()) return next();
  return res.status(401).json({ erreur: 'Non authentifié. Veuillez vous connecter.' });
}

/* ─── GET /api/auth/google ──────────────────────────────────
   Lance le flux OAuth : redirige vers la page de connexion Google
   ─────────────────────────────────────────────────────────── */
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

/* ─── GET /api/auth/google/callback ────────────────────────
   Google redirige ici après connexion
   ─────────────────────────────────────────────────────────── */
router.get('/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/admin/login?erreur=non_autorise',
    session: true,
  }),
  (req, res) => {
    res.redirect('/realisations.html');
  }
);

/* ─── GET /api/auth/logout ──────────────────────────────────
   Détruit la session et redirige vers la page de login
   ─────────────────────────────────────────────────────────── */
router.get('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy(() => {
      const retour = req.headers.referer || '/realisations.html';
      res.redirect(retour);
    });
  });
});

/* ─── GET /api/auth/status ──────────────────────────────────
   Vérifie si une session valide existe
   Retourne : { connecte: true/false, email: "..." }
   ─────────────────────────────────────────────────────────── */
router.get('/status', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ connecte: true, email: req.user.email, nom: req.user.nom });
  } else {
    res.json({ connecte: false, email: null });
  }
});

module.exports = router;
module.exports.estAuthentifie = estAuthentifie;
