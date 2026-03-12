/* ============================================================
   CORSE PRO SERVICES — server.js
   Point d'entrée du backend
   ============================================================ */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

// ── Vérification des variables d'environnement critiques ────
if (!process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID === 'À_REMPLIR') {
  console.error('❌  GOOGLE_CLIENT_ID manquant dans .env — authentification Google désactivée');
  console.error('    → Récupérez votre Client ID sur https://console.cloud.google.com');
}
if (!process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET === 'À_REMPLIR') {
  console.error('❌  GOOGLE_CLIENT_SECRET manquant dans .env — authentification Google désactivée');
  console.error('    → Récupérez votre Client Secret sur https://console.cloud.google.com');
}
if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET === 'une_chaine_aleatoire_longue_a_remplacer_par_quelque_chose_de_secret') {
  console.warn('⚠️   SESSION_SECRET non personnalisé — pensez à le changer avant la mise en production');
}

const express  = require('express');
const session  = require('express-session');
const passport = require('passport');
const cors     = require('cors');
const path     = require('path');
const fs       = require('fs');

const { initialiserDB }              = require('./database');
const { routerProjets, routerPhotos } = require('./routes/projets');
const routesAuth                     = require('./routes/auth');
const routerApropos                  = require('./routes/apropos');

// Charger la config Passport (stratégie Google)
require('./passport-config');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Créer le dossier uploads s'il n'existe pas ───────────────
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// ── Middlewares globaux ──────────────────────────────────────
app.use(cors({
  origin:      `http://localhost:${PORT}`,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Sessions ─────────────────────────────────────────────────
app.use(session({
  secret:            process.env.SESSION_SECRET || 'fallback_secret',
  resave:            false,
  saveUninitialized: false,
  cookie: {
    secure:   false,          // Passer à true en production (HTTPS)
    httpOnly: true,
    maxAge:   24 * 60 * 60 * 1000, // 24 heures
  },
}));

// ── Passport ─────────────────────────────────────────────────
app.use(passport.initialize());
app.use(passport.session());

// ── Fichiers statiques ───────────────────────────────────────
// Frontend HTML/CSS/JS (racine du projet)
app.use(express.static(path.join(__dirname, '..')));
// Photos uploadées accessibles via /uploads/nom_du_fichier.jpg
app.use('/uploads', express.static(UPLOADS_DIR));

// ── Routes admin ─────────────────────────────────────────────
app.get('/admin/login', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'admin', 'login.html'));
});
app.get('/admin', (_req, res) => {
  res.redirect('/realisations.html');
});

// ── Routes API ───────────────────────────────────────────────
app.use('/api/auth',    routesAuth);
app.use('/api/projets', routerProjets);
app.use('/api/photos',  routerPhotos);
app.use('/api',         routerApropos);

// ── Démarrage ────────────────────────────────────────────────
initialiserDB();

app.listen(PORT, () => {
  console.log(`✅ Serveur démarré sur http://localhost:${PORT}`);
});
