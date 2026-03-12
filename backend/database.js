/* ============================================================
   CORSE PRO SERVICES — database.js
   Initialisation SQLite avec better-sqlite3
   ============================================================ */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'database.sqlite');

let db;

function getDB() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');   // Meilleures performances en lecture
    db.pragma('foreign_keys = ON');    // Respect des clés étrangères
  }
  return db;
}

function initialiserDB() {
  const db = getDB();

  // ── Création des tables ──────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS projets (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      titre             TEXT    NOT NULL,
      description       TEXT,
      lieu              TEXT,
      date_chantier     DATE,
      statut            TEXT    DEFAULT 'brouillon'
                                CHECK(statut IN ('publie', 'brouillon')),
      date_creation     DATETIME DEFAULT (datetime('now')),
      date_modification DATETIME DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS photos (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      projet_id   INTEGER NOT NULL REFERENCES projets(id) ON DELETE CASCADE,
      nom_fichier TEXT    NOT NULL,
      ordre       INTEGER DEFAULT 0
    );
  `);

  // ── Migration : ajouter type_prestation si la colonne n'existe pas ──
  try {
    db.exec('ALTER TABLE projets ADD COLUMN type_prestation TEXT');
  } catch { /* colonne déjà présente */ }

  // ── Migration : ajouter ordre si la colonne n'existe pas ──
  let ordreNouvelle = false;
  try {
    db.exec('ALTER TABLE projets ADD COLUMN ordre INTEGER DEFAULT 0');
    ordreNouvelle = true;
  } catch { /* colonne déjà présente */ }
  if (ordreNouvelle) {
    // Initialise l'ordre selon l'ID croissant
    db.exec('UPDATE projets SET ordre = (SELECT COUNT(*) FROM projets p2 WHERE p2.id <= projets.id)');
  }

  console.log('✅ Base de données initialisée');

  // ── Données de démarrage (insérées uniquement si la base est vide) ──
  const count = db.prepare('SELECT COUNT(*) AS n FROM projets').get().n;

  if (count === 0) {
    const insertProjet = db.prepare(`
      INSERT INTO projets (titre, description, lieu, date_chantier, statut, type_prestation)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const insertPhoto = db.prepare(`
      INSERT INTO photos (projet_id, nom_fichier, ordre)
      VALUES (?, ?, ?)
    `);

    const seed = db.transaction(() => {
      // Projet 1 — publié — 4 photos
      const p1 = insertProjet.run(
        'Nettoyage vapeur de toiture en tuiles canal & hydrofuge',
        'Maison individuelle à Ajaccio. La toiture en tuiles canal présentait d\'importantes traces de mousse et lichens accumulés sur plus de 20 ans. Nettoyage intégral à la vapeur basse pression + application d\'un traitement hydrofuge longue durée.',
        'Ajaccio, Corse du Sud',
        '2024-10-08',
        'publie',
        'Nettoyage à la vapeur'
      );
      ['toit-avant.jpg', 'toit-vapeur.jpg', 'toit-apres.jpg', 'toit-hydrofuge.jpg']
        .forEach((f, i) => insertPhoto.run(p1.lastInsertRowid, f, i));

      // Projet 2 — publié — 3 photos
      const p2 = insertProjet.run(
        'Entretien vapeur d\'une installation multi-split professionnelle',
        'Immeuble de bureaux à Bastia, 8 unités intérieures et 2 condensateurs extérieurs. Nettoyage complet à la vapeur, désinfection des filtres, purge des bacs de condensat et traitement antifongique. Réalisé un samedi pour ne pas perturber l\'activité.',
        'Bastia, Haute-Corse',
        '2024-06-12',
        'publie',
        'Entretien de climatisation'
      );
      ['clim-avant.jpg', 'clim-nettoyage.jpg', 'clim-apres.jpg']
        .forEach((f, i) => insertPhoto.run(p2.lastInsertRowid, f, i));

      // Projet 3 — brouillon — 5 photos
      const p3 = insertProjet.run(
        'Ravalement façade granite + traitement anti-humidité',
        'Bâtiment XIXe siècle à Corte. Façade en granite local noircie par des décennies de pollution et d\'humidité. Nettoyage vapeur basse pression pour traiter la pierre sans risque d\'érosion. Application d\'un traitement hydrofuge et anti-efflorescence. Accès partiel par cordage.',
        'Corte, Haute-Corse',
        '2024-03-14',
        'brouillon',
        'Nettoyage à la vapeur'
      );
      ['facade-avant.jpg', 'facade-nettoyage.jpg', 'facade-detail.jpg', 'facade-apres.jpg', 'facade-fin.jpg']
        .forEach((f, i) => insertPhoto.run(p3.lastInsertRowid, f, i));
    });

    seed();

    const total = db.prepare('SELECT COUNT(*) AS n FROM projets').get().n;
    console.log(`✅ ${total} projets insérés en base de données (données initiales)`);
  } else {
    console.log(`✅ ${count} projets en base de données`);
  }
}

module.exports = { getDB, initialiserDB };
