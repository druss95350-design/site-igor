/* ============================================================
   CORSE PRO SERVICES — passport-config.js
   Configuration Google OAuth 2.0
   ============================================================ */

const passport = require('passport');

// Sérialisation : on stocke tout l'objet user dans la session
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

// La stratégie n'est initialisée que si les clés sont présentes
const oauthPret =
  process.env.GOOGLE_CLIENT_ID    && process.env.GOOGLE_CLIENT_ID    !== 'À_REMPLIR' &&
  process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_CLIENT_SECRET !== 'À_REMPLIR';

if (oauthPret) {
  const GoogleStrategy = require('passport-google-oauth20').Strategy;

  // Liste des emails autorisés (séparés par des virgules dans .env)
  const emailsAutorises = (process.env.EMAILS_AUTORISES || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);

  passport.use(new GoogleStrategy(
    {
      clientID:     process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:  process.env.GOOGLE_CALLBACK_URL,
    },
    (accessToken, refreshToken, profile, done) => {
      const email = profile.emails?.[0]?.value?.toLowerCase();

      if (!email || !emailsAutorises.includes(email)) {
        // Email non autorisé → échec silencieux (redirection gérée dans auth.js)
        return done(null, false, { message: 'non_autorise' });
      }

      return done(null, { email, nom: profile.displayName });
    }
  ));
} else {
  console.error('❌  GOOGLE_CLIENT_ID ou GOOGLE_CLIENT_SECRET manquant dans .env');
  console.error('    → Renseignez ces deux valeurs pour activer l\'authentification Google');
}

module.exports = { oauthPret };
