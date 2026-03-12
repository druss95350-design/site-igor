/* ============================================================
   CORSE PRO SERVICES — routes/accueil.js
   CRUD accueil (hero + qui suis-je)
   Monté sur /api via app.use('/api', routerAccueil)
   ============================================================ */

const express  = require('express');
const multer   = require('multer');
const path     = require('path');
const { getDB }          = require('../database');
const { estAuthentifie } = require('./auth');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

/* ─── Multer ─────────────────────────────────────────────── */

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const unicite = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    const ext     = path.extname(file.originalname).toLowerCase();
    cb(null, `accueil-${unicite}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const ok = ['.jpg', '.jpeg', '.png', '.webp'];
  if (ok.includes(path.extname(file.originalname).toLowerCase())) cb(null, true);
  else cb(new Error('Type non autorisé. Formats acceptés : jpg, jpeg, png, webp.'));
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

/* ─── Router ─────────────────────────────────────────────── */

const router = express.Router();

/* ── GET /api/accueil — public ──────────────────────────── */
router.get('/accueil', (req, res) => {
  const row = getDB().prepare('SELECT * FROM accueil WHERE id = 1').get();
  if (!row) return res.status(404).json({ erreur: 'Données introuvables.' });
  res.json(row);
});

/* ── PUT /api/accueil — protégé ─────────────────────────── */
router.put('/accueil', estAuthentifie, (req, res) => {
  const { hero_titre, hero_tagline, whois_contenu_html } = req.body;
  const db = getDB();
  db.prepare(`
    UPDATE accueil SET hero_titre = ?, hero_tagline = ?, whois_contenu_html = ? WHERE id = 1
  `).run(
    hero_titre        ?? null,
    hero_tagline      ?? null,
    whois_contenu_html ?? null
  );
  res.json(db.prepare('SELECT * FROM accueil WHERE id = 1').get());
});

/* ── POST /api/accueil/photo — protégé ──────────────────── */
router.post('/accueil/photo', estAuthentifie, (req, res) => {
  upload.single('photo')(req, res, (err) => {
    if (err instanceof multer.MulterError) return res.status(400).json({ erreur: `Erreur d'upload : ${err.message}` });
    if (err)       return res.status(400).json({ erreur: err.message });
    if (!req.file) return res.status(400).json({ erreur: 'Aucun fichier reçu.' });

    getDB().prepare('UPDATE accueil SET whois_photo = ? WHERE id = 1').run(req.file.filename);
    res.json({ whois_photo: req.file.filename });
  });
});

module.exports = router;
