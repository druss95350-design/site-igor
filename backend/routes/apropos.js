/* ============================================================
   CORSE PRO SERVICES — routes/apropos.js
   CRUD à propos (présentation singleton + valeurs + photo)
   Monté sur /api via app.use('/api', routerApropos)
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
    cb(null, `apropos-${unicite}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const ok = ['.jpg', '.jpeg', '.png', '.webp'];
  if (ok.includes(path.extname(file.originalname).toLowerCase())) cb(null, true);
  else cb(new Error('Type non autorisé. Formats acceptés : jpg, jpeg, png, webp.'));
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

/* ─── Utilitaire : parse les colonnes JSON ───────────────── */

function parseRow(row) {
  if (!row) return null;
  row.certifications = JSON.parse(row.certifications || '[]');
  return row;
}

/* ─── Router ─────────────────────────────────────────────── */

const router = express.Router();

/* ── GET /api/apropos/presentation — public ─────────────── */
router.get('/apropos/presentation', (req, res) => {
  const row = getDB().prepare('SELECT * FROM apropos_presentation WHERE id = 1').get();
  if (!row) return res.status(404).json({ erreur: 'Données introuvables.' });
  res.json(parseRow(row));
});

/* ── PUT /api/apropos/presentation — protégé ────────────── */
router.put('/apropos/presentation', estAuthentifie, (req, res) => {
  const { contenu_html, certifications } = req.body;
  const db = getDB();

  if (contenu_html) {
    db.prepare(`
      UPDATE apropos_presentation SET contenu_html = ?, certifications = ? WHERE id = 1
    `).run(contenu_html, JSON.stringify(certifications || []));
  } else {
    db.prepare(`
      UPDATE apropos_presentation SET certifications = ? WHERE id = 1
    `).run(JSON.stringify(certifications || []));
  }

  res.json(parseRow(db.prepare('SELECT * FROM apropos_presentation WHERE id = 1').get()));
});

/* ── POST /api/apropos/photo — protégé ──────────────────── */
router.post('/apropos/photo', estAuthentifie, (req, res) => {
  upload.single('photo')(req, res, (err) => {
    if (err instanceof multer.MulterError) return res.status(400).json({ erreur: `Erreur d'upload : ${err.message}` });
    if (err)       return res.status(400).json({ erreur: err.message });
    if (!req.file) return res.status(400).json({ erreur: 'Aucun fichier reçu.' });

    getDB().prepare('UPDATE apropos_presentation SET photo_filename = ? WHERE id = 1').run(req.file.filename);
    res.json({ photo_filename: req.file.filename });
  });
});

/* ── GET /api/apropos/valeurs — public ──────────────────── */
router.get('/apropos/valeurs', (req, res) => {
  res.json(getDB().prepare('SELECT * FROM apropos_valeurs ORDER BY ordre ASC').all());
});

/* ── POST /api/apropos/valeurs — protégé ────────────────────
   ⚠️  Défini AVANT /:id pour éviter le conflit de route
   ─────────────────────────────────────────────────────────── */
router.post('/apropos/valeurs', estAuthentifie, (req, res) => {
  const { icone, titre, texte } = req.body;
  const db = getDB();
  const { maxOrdre } = db.prepare(
    'SELECT COALESCE(MAX(ordre), -1) AS maxOrdre FROM apropos_valeurs'
  ).get();
  const result = db.prepare(
    'INSERT INTO apropos_valeurs (icone, titre, texte, ordre) VALUES (?, ?, ?, ?)'
  ).run(icone || '⭐', titre || 'Nouvelle valeur', texte || '', maxOrdre + 1);
  res.status(201).json(db.prepare('SELECT * FROM apropos_valeurs WHERE id = ?').get(result.lastInsertRowid));
});

/* ── PUT /api/apropos/valeurs/ordre — protégé ───────────────
   ⚠️  Défini AVANT /:id pour éviter le conflit de route
   Body : { valeurs: [{ id, ordre }, ...] }
   ─────────────────────────────────────────────────────────── */
router.put('/apropos/valeurs/ordre', estAuthentifie, (req, res) => {
  const { valeurs } = req.body;
  if (!Array.isArray(valeurs) || valeurs.length === 0) {
    return res.status(400).json({ erreur: 'Format invalide. Attendu : { valeurs: [{ id, ordre }] }' });
  }
  const db  = getDB();
  const upd = db.prepare('UPDATE apropos_valeurs SET ordre = ? WHERE id = ?');
  db.transaction(() => valeurs.forEach(({ id, ordre }) => upd.run(ordre, id)))();
  res.json({ mis_a_jour: valeurs.length });
});

/* ── PUT /api/apropos/valeurs/:id — protégé ─────────────── */
router.put('/apropos/valeurs/:id', estAuthentifie, (req, res) => {
  const db = getDB();
  if (!db.prepare('SELECT id FROM apropos_valeurs WHERE id = ?').get(req.params.id)) {
    return res.status(404).json({ erreur: 'Valeur introuvable.' });
  }
  const { icone, titre, texte } = req.body;
  db.prepare('UPDATE apropos_valeurs SET icone = ?, titre = ?, texte = ? WHERE id = ?')
    .run(icone || null, titre || null, texte || null, req.params.id);
  res.json(db.prepare('SELECT * FROM apropos_valeurs WHERE id = ?').get(req.params.id));
});

/* ── DELETE /api/apropos/valeurs/:id — protégé ──────────── */
router.delete('/apropos/valeurs/:id', estAuthentifie, (req, res) => {
  const db = getDB();
  if (!db.prepare('SELECT id FROM apropos_valeurs WHERE id = ?').get(req.params.id)) {
    return res.status(404).json({ erreur: 'Valeur introuvable.' });
  }
  db.prepare('DELETE FROM apropos_valeurs WHERE id = ?').run(req.params.id);
  res.json({ supprime: true, id: Number(req.params.id) });
});

module.exports = router;
