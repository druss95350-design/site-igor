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

  // ── Tables à propos ──────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS apropos_presentation (
      id             INTEGER PRIMARY KEY,
      titre_1        TEXT,
      paragraphes_1  TEXT,
      citation       TEXT,
      titre_2        TEXT,
      paragraphes_2  TEXT,
      stat_1_num     TEXT, stat_1_label TEXT,
      stat_2_num     TEXT, stat_2_label TEXT,
      stat_3_num     TEXT, stat_3_label TEXT,
      stat_4_num     TEXT, stat_4_label TEXT,
      photo_filename TEXT,
      certifications TEXT
    );

    CREATE TABLE IF NOT EXISTS apropos_valeurs (
      id     INTEGER PRIMARY KEY AUTOINCREMENT,
      icone  TEXT,
      titre  TEXT,
      texte  TEXT,
      ordre  INTEGER DEFAULT 0
    );
  `);

  // Seed apropos_presentation (ligne unique id = 1)
  if (db.prepare('SELECT COUNT(*) AS n FROM apropos_presentation').get().n === 0) {
    db.prepare(`
      INSERT INTO apropos_presentation (
        id, titre_1, paragraphes_1, citation, titre_2, paragraphes_2,
        stat_1_num, stat_1_label, stat_2_num, stat_2_label,
        stat_3_num, stat_3_label, stat_4_num, stat_4_label,
        photo_filename, certifications
      ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'Un artisan né et formé en Corse',
      JSON.stringify([
        "Je m'appelle Igor. Je suis né à Ajaccio il y a quarante ans, dans une famille où l'on apprenait à faire les choses bien du premier coup. Mon père était maçon, ma mère tenait la maison avec une rigueur que j'admire encore aujourd'hui. C'est peut-être là qu'est née ma conception du travail bien fait.",
        "Après un CAP en maintenance des bâtiments, j'ai travaillé pendant plusieurs années pour une entreprise de nettoyage industriel sur le continent. C'est là que j'ai découvert les techniques de nettoyage à la vapeur — une méthode qui m'a immédiatement convaincu par son efficacité et son respect de l'environnement. Pas de produits chimiques agressifs, une action mécanique puissante, des résultats spectaculaires sur tous types de surfaces.",
        "En 2010, j'ai décidé de rentrer en Corse. L'île me manquait. Ses paysages, ses gens, son rythme. J'ai créé Corse Pro Services avec une idée simple : proposer des prestations de qualité, réalisées sérieusement, à des particuliers et des professionnels qui méritent mieux que les solutions bâclées.",
      ]),
      '"Je ne suis pas une entreprise. Je suis un artisan. Quand je me déplace chez vous, c\'est moi qui travaille — pas un employé que je n\'aurais pas formé moi-même. C\'est cette promesse que je tiens depuis quinze ans."',
      'Une spécialisation qui fait la différence',
      JSON.stringify([
        "Au fil des années, j'ai développé trois axes de spécialisation complémentaires. Le nettoyage à la vapeur est au cœur de tout ce que je fais : façades, toitures, allées, terrasses — la vapeur traite en profondeur sans agresser les matériaux.",
        "L'entretien de climatisation à la vapeur est devenu une de mes prestations les plus demandées. En Corse, les climatiseurs tournent à plein régime l'été. Un appareil mal entretenu consomme jusqu'à 30 % d'énergie en plus et disperse des bactéries dans l'air. Mon passage annuel vous garantit un appareil propre, performant et sain.",
        "Enfin, les travaux acrobatiques en hauteur me permettent d'intervenir là où les autres ne vont pas. Formé aux techniques de cordage et titulaire des certifications nécessaires, j'interviens sur des toitures à forte pente, des clochers, des falaises ou tout bâtiment dont l'accès est rendu impossible par le terrain.",
      ]),
      '15+', "ans d'expérience",
      '300+', 'chantiers réalisés',
      '4,8', '/ 5 sur Google',
      '100%', 'artisan solo certifié',
      'https://picsum.photos/seed/igor-portrait/600/700',
      JSON.stringify([
        'Travaux en hauteur par cordage (CQP)',
        'Entretien de systèmes de climatisation',
        "Fluides frigorigènes — attestation d'aptitude",
        'SIRET enregistré — artisan indépendant',
        'Assurance décennale et RC Pro',
      ])
    );
    console.log('✅ Données à propos initialisées');
  }

  // Seed apropos_valeurs
  if (db.prepare('SELECT COUNT(*) AS n FROM apropos_valeurs').get().n === 0) {
    const insV = db.prepare('INSERT INTO apropos_valeurs (icone, titre, texte, ordre) VALUES (?, ?, ?, ?)');
    db.transaction(() => {
      [
        ['🤝', 'Honnêteté', "Je vous dis ce que je vois, ce qui est faisable, et ce que ça coûtera. Sans exagérer le travail ni minimiser les contraintes. Un devis signé est un engagement tenu.", 0],
        ['🎯', 'Rigueur', "Chaque détail compte. Je ne considère un chantier comme terminé que quand le résultat est à la hauteur de ce que j'aurais voulu pour ma propre maison.", 1],
        ['🌿', "Respect de l'environnement", "La vapeur, c'est de l'eau. Pas de produits chimiques, pas de ruissellement pollué. Je travaille proprement, sur votre propriété et sur l'île que j'aime.", 2],
        ['📞', 'Proximité & disponibilité', "Je réponds à mes appels. Je rappelle si je suis sur un chantier. Je suis joignable, réactif, et je prends le temps d'expliquer ce que je fais et pourquoi.", 3],
        ['🔒', 'Sécurité avant tout', "Tous mes équipements sont certifiés et régulièrement contrôlés. Je ne prends aucun risque inutile — ni pour moi, ni pour vos biens, ni pour les personnes autour du chantier.", 4],
        ['🏝️', 'Ancrage local', "Je vis ici, je travaille ici, mes clients sont mes voisins. Cette relation de confiance, construite au fil des années, est le cœur de mon activité.", 5],
      ].forEach(([icone, titre, texte, ordre]) => insV.run(icone, titre, texte, ordre));
    })();
    console.log('✅ Valeurs à propos initialisées');
  }

  // ── Migration : ajouter contenu_html à apropos_presentation ──
  try {
    db.exec('ALTER TABLE apropos_presentation ADD COLUMN contenu_html TEXT');
  } catch { /* colonne déjà présente */ }

  // Peupler contenu_html depuis les anciennes colonnes si vide
  const rowApropos = db.prepare('SELECT * FROM apropos_presentation WHERE id = 1').get();
  if (rowApropos && !rowApropos.contenu_html) {
    const p1 = JSON.parse(rowApropos.paragraphes_1 || '[]');
    const p2 = JSON.parse(rowApropos.paragraphes_2 || '[]');
    const htmlConstitue = [
      rowApropos.titre_1 ? `<h2>${rowApropos.titre_1}</h2>` : '',
      p1.map(p => `<p>${p}</p>`).join(''),
      rowApropos.citation ? `<blockquote>${rowApropos.citation}</blockquote>` : '',
      rowApropos.titre_2 ? `<h2>${rowApropos.titre_2}</h2>` : '',
      p2.map(p => `<p>${p}</p>`).join(''),
    ].join('');
    db.prepare('UPDATE apropos_presentation SET contenu_html = ? WHERE id = 1').run(htmlConstitue);
    console.log('✅ contenu_html à propos initialisé depuis anciennes colonnes');
  }

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
