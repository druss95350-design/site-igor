/* ============================================================
   CORSE PRO SERVICES — routes/projets.js
   CRUD projets + upload/gestion photos
   Exports : routerProjets  → monté sur /api/projets
             routerPhotos   → monté sur /api/photos
   ============================================================ */

const express  = require('express');
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
const { getDB }          = require('../database');
const { estAuthentifie } = require('./auth');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

/* ─── Configuration Multer ───────────────────────────────── */

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const unicite = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    const ext     = path.extname(file.originalname).toLowerCase();
    cb(null, `photo-${unicite}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const typesAcceptes = ['.jpg', '.jpeg', '.png', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (typesAcceptes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Type de fichier non autorisé. Formats acceptés : jpg, jpeg, png, webp.'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 Mo max par photo
});

/* ─── Utilitaire : projet + photos ──────────────────────── */

function getProjetAvecPhotos(id) {
  const db = getDB();
  const projet = db.prepare('SELECT * FROM projets WHERE id = ?').get(id);
  if (!projet) return null;
  projet.photos = db.prepare(
    'SELECT * FROM photos WHERE projet_id = ? ORDER BY ordre ASC'
  ).all(id);
  return projet;
}

/* ============================================================
   ROUTER PROJETS  (/api/projets)
   ============================================================ */

const routerProjets = express.Router();

/* ─── GET /api/projets ──────────────────────────────────────
   Tous les projets publiés avec leurs photos — route publique
   ─────────────────────────────────────────────────────────── */
routerProjets.get('/', (req, res) => {
  const db = getDB();
  const projets = db.prepare(
    "SELECT * FROM projets WHERE statut = 'publie' ORDER BY ordre ASC, date_chantier DESC"
  ).all();
  projets.forEach(p => {
    p.photos = db.prepare(
      'SELECT * FROM photos WHERE projet_id = ? ORDER BY ordre ASC'
    ).all(p.id);
  });
  res.json(projets);
});

/* ─── GET /api/projets/tous ─────────────────────────────────
   Tous les projets (publiés + brouillons) — route protégée
   ⚠️  Doit être défini AVANT /:id pour éviter le conflit de route
   ─────────────────────────────────────────────────────────── */
routerProjets.get('/tous', estAuthentifie, (req, res) => {
  const db = getDB();
  const projets = db.prepare(
    'SELECT * FROM projets ORDER BY ordre ASC, date_creation DESC'
  ).all();
  projets.forEach(p => {
    p.photos = db.prepare(
      'SELECT * FROM photos WHERE projet_id = ? ORDER BY ordre ASC'
    ).all(p.id);
  });
  res.json(projets);
});

/* ─── PUT /api/projets/ordre ────────────────────────────────
   Mettre à jour l'ordre des projets — route protégée
   Body : { projets: [{ id, ordre }, ...] }
   ⚠️  Doit être défini AVANT /:id pour éviter le conflit de route
   ─────────────────────────────────────────────────────────── */
routerProjets.put('/ordre', estAuthentifie, (req, res) => {
  const { projets } = req.body;
  if (!Array.isArray(projets) || projets.length === 0) {
    return res.status(400).json({ erreur: 'Format invalide. Attendu : { projets: [{ id, ordre }] }' });
  }
  const db = getDB();
  const update = db.prepare('UPDATE projets SET ordre = ? WHERE id = ?');
  const transaction = db.transaction(() => {
    projets.forEach(({ id, ordre }) => update.run(ordre, id));
  });
  transaction();
  res.json({ mis_a_jour: projets.length });
});

/* ─── GET /api/projets/:id ──────────────────────────────────
   Un projet avec ses photos — route publique
   ─────────────────────────────────────────────────────────── */
routerProjets.get('/:id', (req, res) => {
  const projet = getProjetAvecPhotos(req.params.id);
  if (!projet) return res.status(404).json({ erreur: 'Projet introuvable.' });
  res.json(projet);
});

/* ─── POST /api/projets ─────────────────────────────────────
   Créer un projet — route protégée
   Body : { titre, description, lieu, date_chantier, statut }
   ─────────────────────────────────────────────────────────── */
routerProjets.post('/', estAuthentifie, (req, res) => {
  const { titre, description, lieu, date_chantier, statut, type_prestation } = req.body;
  if (!titre?.trim()) {
    return res.status(400).json({ erreur: 'Le champ "titre" est obligatoire.' });
  }
  const db = getDB();
  const result = db.prepare(`
    INSERT INTO projets (titre, description, lieu, date_chantier, statut, type_prestation)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    titre.trim(),
    description      || null,
    lieu             || null,
    date_chantier    || null,
    ['publie', 'brouillon'].includes(statut) ? statut : 'brouillon',
    type_prestation  || null
  );
  res.status(201).json(getProjetAvecPhotos(result.lastInsertRowid));
});

/* ─── PUT /api/projets/:id ──────────────────────────────────
   Modifier un projet — route protégée
   ─────────────────────────────────────────────────────────── */
routerProjets.put('/:id', estAuthentifie, (req, res) => {
  const db = getDB();
  const existant = db.prepare('SELECT id FROM projets WHERE id = ?').get(req.params.id);
  if (!existant) return res.status(404).json({ erreur: 'Projet introuvable.' });

  const { titre, description, lieu, date_chantier, statut, type_prestation } = req.body;
  if (!titre?.trim()) {
    return res.status(400).json({ erreur: 'Le champ "titre" est obligatoire.' });
  }

  db.prepare(`
    UPDATE projets
    SET titre = ?, description = ?, lieu = ?, date_chantier = ?, statut = ?,
        type_prestation = ?, date_modification = datetime('now')
    WHERE id = ?
  `).run(
    titre.trim(),
    description     || null,
    lieu            || null,
    date_chantier   || null,
    ['publie', 'brouillon'].includes(statut) ? statut : 'brouillon',
    type_prestation || null,
    req.params.id
  );

  res.json(getProjetAvecPhotos(req.params.id));
});

/* ─── DELETE /api/projets/:id ───────────────────────────────
   Supprimer un projet + ses photos (fichiers inclus) — protégé
   ─────────────────────────────────────────────────────────── */
routerProjets.delete('/:id', estAuthentifie, (req, res) => {
  const db = getDB();
  const existant = db.prepare('SELECT id FROM projets WHERE id = ?').get(req.params.id);
  if (!existant) return res.status(404).json({ erreur: 'Projet introuvable.' });

  // Supprimer les fichiers physiques
  const photos = db.prepare(
    'SELECT nom_fichier FROM photos WHERE projet_id = ?'
  ).all(req.params.id);
  photos.forEach(({ nom_fichier }) => {
    const fichier = path.join(UPLOADS_DIR, nom_fichier);
    if (fs.existsSync(fichier)) fs.unlinkSync(fichier);
  });

  // Supprime aussi les photos en cascade (ON DELETE CASCADE)
  db.prepare('DELETE FROM projets WHERE id = ?').run(req.params.id);
  res.json({ supprime: true, id: Number(req.params.id) });
});

/* ─── POST /api/projets/:id/photos ─────────────────────────
   Uploader des photos pour un projet — route protégée
   Champ form-data : "photos" (multi-fichiers)
   ─────────────────────────────────────────────────────────── */
routerProjets.post('/:id/photos', estAuthentifie, (req, res) => {
  upload.array('photos', 20)(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ erreur: `Erreur d'upload : ${err.message}` });
    } else if (err) {
      return res.status(400).json({ erreur: err.message });
    }

    const db = getDB();
    const projet = db.prepare('SELECT id FROM projets WHERE id = ?').get(req.params.id);
    if (!projet) return res.status(404).json({ erreur: 'Projet introuvable.' });

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ erreur: 'Aucun fichier reçu.' });
    }

    // Ordre de départ = max actuel + 1
    const { maxOrdre } = db.prepare(
      'SELECT COALESCE(MAX(ordre), -1) AS maxOrdre FROM photos WHERE projet_id = ?'
    ).get(req.params.id);

    const insertPhoto = db.prepare(
      'INSERT INTO photos (projet_id, nom_fichier, ordre) VALUES (?, ?, ?)'
    );
    const photosCreees = [];

    req.files.forEach((file, i) => {
      const result = insertPhoto.run(req.params.id, file.filename, maxOrdre + 1 + i);
      photosCreees.push({
        id:          result.lastInsertRowid,
        projet_id:   Number(req.params.id),
        nom_fichier: file.filename,
        ordre:       maxOrdre + 1 + i,
      });
    });

    res.status(201).json(photosCreees);
  });
});

/* ============================================================
   ROUTER PHOTOS  (/api/photos)
   ============================================================ */

const routerPhotos = express.Router();

/* ─── DELETE /api/photos/:id ────────────────────────────────
   Supprimer une photo (fichier + entrée BDD) — protégée
   ─────────────────────────────────────────────────────────── */
routerPhotos.delete('/:id', estAuthentifie, (req, res) => {
  const db = getDB();
  const photo = db.prepare('SELECT * FROM photos WHERE id = ?').get(req.params.id);
  if (!photo) return res.status(404).json({ erreur: 'Photo introuvable.' });

  const fichier = path.join(UPLOADS_DIR, photo.nom_fichier);
  if (fs.existsSync(fichier)) fs.unlinkSync(fichier);

  db.prepare('DELETE FROM photos WHERE id = ?').run(req.params.id);
  res.json({ supprime: true, id: Number(req.params.id) });
});

/* ─── PUT /api/photos/ordre ─────────────────────────────────
   Mettre à jour l'ordre des photos d'un projet — protégée
   Body : { photos: [{ id, ordre }, ...] }
   ⚠️  Doit être défini AVANT /:id pour éviter le conflit de route
   ─────────────────────────────────────────────────────────── */
routerPhotos.put('/ordre', estAuthentifie, (req, res) => {
  const { photos } = req.body;
  if (!Array.isArray(photos) || photos.length === 0) {
    return res.status(400).json({ erreur: 'Format invalide. Attendu : { photos: [{ id, ordre }] }' });
  }

  const db = getDB();
  const updateOrdre = db.prepare('UPDATE photos SET ordre = ? WHERE id = ?');
  const transaction = db.transaction(() => {
    photos.forEach(({ id, ordre }) => updateOrdre.run(ordre, id));
  });
  transaction();

  res.json({ mis_a_jour: photos.length });
});

/* ─── GET /api/photos/:id ───────────────────────────────────
   Récupérer les infos d'une photo — public
   ─────────────────────────────────────────────────────────── */
routerPhotos.get('/:id', (req, res) => {
  const db = getDB();
  const photo = db.prepare('SELECT * FROM photos WHERE id = ?').get(req.params.id);
  if (!photo) return res.status(404).json({ erreur: 'Photo introuvable.' });
  res.json(photo);
});

module.exports = { routerProjets, routerPhotos };
