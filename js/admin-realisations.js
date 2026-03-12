/* ============================================================
   CORSE PRO SERVICES — js/admin-realisations.js
   Module d'administration des réalisations (CRUD + photos)
   Dépend de admin-core.js (AdminCore doit être chargé avant)
   ============================================================ */
'use strict';

const AdminRealisations = (() => {

  const { esc, escBr, formatDate } = AdminCore.utils;

  /* ── État ─────────────────────────────────────────────────── */
  let estConnecte   = false;
  let projetsCache  = [];

  /* ── CSS local injecté ────────────────────────────────────── */

  function injecterCSS() {
    if (document.getElementById('admin-realisations-css')) return;
    const s = document.createElement('style');
    s.id = 'admin-realisations-css';
    s.textContent = `
      /* ── Brouillon ribbon ── */
      .post-card--brouillon { opacity: .87; }
      .brouillon-ribbon {
        position: absolute; top: 14px; right: -28px;
        background: #f59e0b; color: #fff;
        font-size: .68rem; font-weight: 800; letter-spacing: 1.5px;
        text-transform: uppercase; padding: 4px 38px;
        transform: rotate(45deg); z-index: 5;
        pointer-events: none; box-shadow: 0 2px 6px rgba(245,158,11,.4);
      }

      /* ── Grille admin (colonne simple) ── */
      .post-photos--admin {
        display: flex; flex-direction: column; gap: 6px;
        padding: 6px; height: auto !important;
      }
      .post-photos--admin .project-photo {
        height: 220px; border-radius: 6px; overflow: hidden;
      }
      .post-photos--admin .project-photo img {
        width: 100%; height: 100%; object-fit: cover;
      }

      /* ── Zone d'upload photos ── */
      .photo-upload-wrap { padding: 0 0 3px; }
      .photo-upload-label {
        display: flex; align-items: center; justify-content: center;
        gap: 6px; padding: 10px 16px; margin: 3px;
        border: 2px dashed rgba(251,239,67,.55); border-radius: 8px;
        background: rgba(251,239,67,.05); color: #999; font-size: .83rem;
        font-family: 'Inter', sans-serif; cursor: pointer; transition: all .18s;
      }
      .photo-upload-label:hover {
        border-color: #fbef43; background: rgba(251,239,67,.12); color: #555;
      }

      /* ── Overlay admin sur photo ── */
      .photo-admin-overlay {
        position: absolute; inset: 0; background: rgba(0,0,0,.52);
        display: flex; align-items: center; justify-content: center; gap: 8px;
        opacity: 0; transition: opacity .18s; z-index: 2;
        pointer-events: none;
      }
      .project-photo:hover .photo-admin-overlay { opacity: 1; pointer-events: auto; }
      .project-photo[draggable="true"] { cursor: grab; }
      .project-photo[draggable="true"]:active { cursor: grabbing; }
      .project-photo.drag-over { outline: 3px solid #fbef43; }
      .photo-btn {
        width: 32px; height: 32px; border-radius: 7px; border: none;
        cursor: pointer; display: flex; align-items: center; justify-content: center;
        font-size: 1rem; transition: transform .12s;
      }
      .photo-btn:hover { transform: scale(1.12); }
      .photo-btn--del  { background: #fee2e2; color: #991b1b; }
      .photo-btn--drag { background: rgba(255,255,255,.9); color: #333; cursor: grab; }

      /* ── Barre d'actions admin sur la page ── */
      .admin-actions-bar {
        display: flex; justify-content: flex-end;
        padding: 0 0 16px;
      }
      body.mode-visiteur .admin-actions-bar { display: none !important; }
    `;
    document.head.appendChild(s);
  }

  /* ── Utilitaires locaux ───────────────────────────────────── */

  function classeGrille(n) {
    if (n === 1) return 'post-photos--1';
    if (n === 2) return 'post-photos--2';
    if (n === 3) return 'post-photos--3';
    if (n === 4) return 'post-photos--4';
    if (n >= 5)  return 'post-photos--many';
    return '';
  }

  function urlPhoto(nom) {
    if (!nom) return '';
    return nom.startsWith('http') ? nom : `/uploads/${nom}`;
  }

  function imgPlaceholder() {
    return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25'%3E%3Crect fill='%23e5e5e5' width='100%25' height='100%25'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23aaa' font-family='sans-serif' font-size='13'%3EPhoto%3C/text%3E%3C/svg%3E";
  }

  /* ── Chargement projets ───────────────────────────────────── */

  async function chargerProjets() {
    const url = estConnecte ? '/api/projets/tous' : '/api/projets';
    const r = await fetch(url);
    if (!r.ok) throw new Error('Erreur réseau');
    return r.json();
  }

  /* ── Rendu de la liste ────────────────────────────────────── */

  function rendreProjets(projets, updateCache = true) {
    if (updateCache) projetsCache = projets;
    const liste = document.querySelector('.projects-list');
    if (!liste) return;
    liste.innerHTML = '';

    if (!projets.length) {
      liste.innerHTML = `<div class="projets-loading">
        ${estConnecte ? 'Aucun projet. Cliquez <strong>＋ Nouveau projet</strong> pour commencer.' : 'Aucune réalisation publiée pour le moment.'}
      </div>`;
      return;
    }

    projets.forEach(p => {
      const div = document.createElement('div');
      div.innerHTML = htmlCarte(p);
      const carte = div.firstElementChild;
      liste.appendChild(carte);
      attacherLightbox(carte);
      if (estConnecte) activerEdition(carte, p);
    });

    if (!estConnecte) {
      requestAnimationFrame(() => {
        liste.querySelectorAll('.post-card__more-btn').forEach(btn => {
          const textEl = btn.previousElementSibling;
          if (textEl && textEl.scrollHeight <= textEl.clientHeight + 1) {
            btn.style.display = 'none';
          }
        });
      });
    }

    if (estConnecte) majBoutonsOrdre();
  }

  /* ── HTML d'une carte ─────────────────────────────────────── */

  function htmlCarte(p) {
    const isDraft  = p.statut === 'brouillon';
    const nPhotos  = p.photos?.length ?? 0;
    const classeP  = classeGrille(nPhotos);
    const extras   = nPhotos > 4 ? nPhotos - 4 : 0;
    const metaDate = formatDate(p.date_chantier);
    const metaLieu = p.lieu || '';

    const desc = p.description || '';

    return `
<div class="project-item post-card${isDraft ? ' post-card--brouillon' : ''}"
     data-projet-id="${p.id}" data-statut="${esc(p.statut)}"
     data-description="${esc(p.description || '')}"
>

  ${isDraft ? '<div class="brouillon-ribbon">Brouillon</div>' : ''}
  ${estConnecte ? htmlToolbar(p) : ''}

  <!-- EN-TÊTE -->
  <div class="post-card__header">
    ${p.type_prestation || estConnecte ? `
      <span class="project-item__tag${estConnecte ? ' editable admin-placeholder-tag' : ''}"
            data-field="type_prestation"
            ${!p.type_prestation ? 'data-empty="1"' : ''}>
        ${esc(p.type_prestation) || (estConnecte ? '+ Type de prestation' : '')}
      </span>` : ''}
    <span class="post-card__meta">
      <span class="${estConnecte ? 'editable' : ''}" data-field="date_chantier"
            data-raw="${esc(p.date_chantier || '')}">${esc(metaDate) || (estConnecte ? '+ Date' : '')}</span>
      ${metaDate && metaLieu ? ' · ' : ''}
      <span class="${estConnecte ? 'editable' : ''}" data-field="lieu">${esc(metaLieu) || (estConnecte ? '+ Lieu' : '')}</span>
    </span>
  </div>

  <!-- CORPS -->
  <div class="post-card__body">
    <h2 class="post-card__title${estConnecte ? ' editable' : ''}" data-field="titre">
      ${esc(p.titre)}
    </h2>

    ${estConnecte ? `
      <p class="post-card__text editable" data-field="description">${escBr(desc) || '<em style="opacity:.4">+ Description…</em>'}</p>
    ` : `
      <p class="post-card__text">${escBr(desc)}</p>
      ${desc ? `<button class="post-card__more-btn" onclick="toggleDesc(this)">… En savoir plus</button>` : ''}
    `}
  </div>

  <!-- PHOTOS -->
  ${nPhotos > 0 || estConnecte ? `
  <div class="post-photos ${estConnecte ? 'post-photos--admin' : classeP}" data-photos-container="${p.id}">
    ${(p.photos || []).map((ph, i) => {
      const isLast4 = i === 3 && extras > 0;
      return `
      <div class="project-photo"
           ${estConnecte ? `draggable="true" data-photo-id="${ph.id}"` : ''}>
        <img src="${esc(urlPhoto(ph.nom_fichier))}" alt="${esc(ph.nom_fichier)}" loading="lazy"
             onerror="this.src='${imgPlaceholder()}'">
        ${isLast4 && !estConnecte ? `<div class="project-photo__badge">+${extras}</div>` : ''}
        ${estConnecte ? `
        <div class="photo-admin-overlay">
          <button class="photo-btn photo-btn--drag" title="Réordonner (glisser)">⠿</button>
          <button class="photo-btn photo-btn--del" title="Supprimer"
                  onclick="AdminRealisations.supprimerPhoto(${ph.id}, this)">🗑</button>
        </div>` : ''}
      </div>`;
    }).join('')}
  </div>
  ${estConnecte ? `
  <div class="photo-upload-wrap">
    <label class="photo-upload-label">
      <input type="file" accept=".jpg,.jpeg,.png,.webp" multiple style="display:none"
             data-upload-for="${p.id}">
      <span>＋</span><span>Ajouter des photos</span>
    </label>
  </div>` : ''}
  ` : ''}

  <!-- PIED -->
  <div class="post-card__footer">
    <button class="btn btn--accent" onclick="openOverlay()">
      Contactez-moi si vous avez le même besoin
    </button>
  </div>
</div>`;
  }

  function htmlToolbar(p) {
    const isDraft = p.statut === 'brouillon';
    return `
<div class="admin-toolbar">
  <div class="admin-toolbar__left">
    <button class="adm-btn adm-btn--move" onclick="AdminRealisations.monterProjet(${p.id})" title="Monter">↑</button>
    <button class="adm-btn adm-btn--move" onclick="AdminRealisations.descendreProjet(${p.id})" title="Descendre">↓</button>
    <span class="admin-status admin-status--${isDraft ? 'brouillon' : 'publie'}">
      ${isDraft ? '📝 Brouillon' : '✅ Publié'}
    </span>
    <span class="save-msg" id="smsg-${p.id}"></span>
  </div>
  <div class="admin-toolbar__right">
    <button class="adm-btn adm-btn--save"    onclick="AdminRealisations.sauvegarder(${p.id})">Enregistrer</button>
    ${isDraft
      ? `<button class="adm-btn adm-btn--publish" onclick="AdminRealisations.changerStatut(${p.id},'publie')">Publier</button>`
      : `<button class="adm-btn adm-btn--draft"   onclick="AdminRealisations.changerStatut(${p.id},'brouillon')">Mettre en brouillon</button>`}
    <button class="adm-btn adm-btn--delete"  onclick="AdminRealisations.supprimer(${p.id})">🗑 Supprimer</button>
  </div>
</div>`;
  }

  /* ── Lightbox ─────────────────────────────────────────────── */

  function attacherLightbox(carteEl) {
    carteEl.querySelectorAll('.project-photo').forEach((ph, i) => {
      ph.addEventListener('click', e => {
        if (e.target.closest('.photo-admin-overlay')) return;
        if (typeof openLightbox === 'function') openLightbox(carteEl, i);
      });
    });
  }

  function reattacherLightbox(carteEl) {
    // Retire les anciens listeners en remplaçant les éléments
    carteEl.querySelectorAll('.project-photo').forEach((ph, i) => {
      const clone = ph.cloneNode(true);
      ph.replaceWith(clone);
      clone.addEventListener('click', e => {
        if (e.target.closest('.photo-admin-overlay')) return;
        if (typeof openLightbox === 'function') openLightbox(carteEl, i);
      });
    });
  }

  /* ── Edition inline ───────────────────────────────────────── */

  function activerEdition(carteEl, projet) {
    // Champs éditables
    carteEl.querySelectorAll('.editable').forEach(el => {
      el.addEventListener('click', e => {
        e.stopPropagation();
        if (el.querySelector('input, textarea')) return; // déjà en édition
        ouvrirChamp(el, carteEl);
      });
    });

    // Input file upload
    const input = carteEl.querySelector(`input[data-upload-for="${projet.id}"]`);
    if (input) input.addEventListener('change', () => ajouterPhotos(projet.id, input, carteEl));

    // Drag & drop photos
    initDragDrop(carteEl, projet.id);
  }

  function ouvrirChamp(el, carteEl) {
    const field = el.dataset.field;
    let inputEl;

    if (field === 'titre') {
      inputEl = document.createElement('input');
      inputEl.type  = 'text';
      inputEl.value = el.textContent.trim();
      inputEl.className = 'post-card__title';
    }
    else if (field === 'description') {
      inputEl = document.createElement('textarea');
      inputEl.value = carteEl.dataset.description || el.textContent.trim();
      inputEl.rows  = 5;
      inputEl.className = 'post-card__text';
    }
    else if (field === 'date_chantier') {
      inputEl = document.createElement('input');
      inputEl.type  = 'date';
      inputEl.value = el.dataset.raw || '';
    }
    else if (field === 'lieu' || field === 'type_prestation') {
      inputEl = document.createElement('input');
      inputEl.type  = 'text';
      const current = el.textContent.trim();
      inputEl.value = current.startsWith('+') ? '' : current;
      inputEl.placeholder = field === 'lieu' ? 'Ex : Ajaccio, Corse du Sud' : 'Ex : Nettoyage à la vapeur';
    }
    else { return; }

    const origHTML = el.innerHTML;
    el.innerHTML = '';
    el.classList.add('is-editing');
    el.appendChild(inputEl);
    inputEl.focus();
    if (inputEl.select) inputEl.select();

    // Mise à jour live de data-description pour textarea
    if (field === 'description') {
      inputEl.addEventListener('input', () => { carteEl.dataset.description = inputEl.value; });
    }
    if (field === 'date_chantier') {
      inputEl.addEventListener('change', () => { el.dataset.raw = inputEl.value; });
    }

    // Echap → annuler
    inputEl.addEventListener('keydown', e => {
      if (e.key === 'Escape') { el.innerHTML = origHTML; el.classList.remove('is-editing'); }
      if (e.key === 'Enter' && field !== 'description') inputEl.blur();
    });

    // Blur → figer la valeur
    inputEl.addEventListener('blur', () => {
      const val = inputEl.value.trim();
      el.classList.remove('is-editing');
      if (field === 'date_chantier') {
        el.dataset.raw = val;
        el.innerHTML   = val ? formatDate(val) : (estConnecte ? '+ Date' : '');
      } else if (field === 'description') {
        carteEl.dataset.description = inputEl.value;
        el.innerHTML = escBr(inputEl.value) || '<em style="opacity:.4">+ Description…</em>';
      } else {
        el.textContent = val || (estConnecte ? `+ ${field === 'type_prestation' ? 'Type de prestation' : 'Lieu'}` : '');
        if (field === 'type_prestation') el.dataset.empty = val ? '0' : '1';
      }
    });
  }

  /* ── Lecture des champs pour la sauvegarde ────────────────── */

  function lireCarte(carteEl) {
    function texteChamp(field) {
      const el = carteEl.querySelector(`[data-field="${field}"]`);
      if (!el) return null;
      const inp = el.querySelector('input, textarea');
      if (inp) return inp.value.trim() || null;
      const t = el.textContent.trim();
      return (t.startsWith('+') || t.startsWith('…')) ? null : (t || null);
    }
    const dateEl = carteEl.querySelector('[data-field="date_chantier"]');
    const dateInp = dateEl?.querySelector('input[type="date"]');
    const dateRaw = dateInp ? dateInp.value : (dateEl?.dataset.raw || null);

    return {
      titre:           texteChamp('titre')           || 'Sans titre',
      description:     carteEl.dataset.description   || texteChamp('description') || null,
      lieu:            texteChamp('lieu'),
      date_chantier:   dateRaw || null,
      type_prestation: texteChamp('type_prestation'),
      statut:          carteEl.dataset.statut,
    };
  }

  /* ── CRUD projets ─────────────────────────────────────────── */

  async function creerProjet() {
    try {
      const r = await fetch('/api/projets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titre: 'Nouveau projet', statut: 'brouillon' }),
      });
      if (!r.ok) throw new Error();
      const projet = await r.json();
      projetsCache.unshift(projet);

      const liste = document.querySelector('.projects-list');
      if (!liste) return;
      // Vider le message "aucun projet"
      const loading = liste.querySelector('.projets-loading');
      if (loading) loading.remove();

      const div = document.createElement('div');
      div.innerHTML = htmlCarte(projet);
      const carte = div.firstElementChild;
      liste.prepend(carte);
      attacherLightbox(carte);
      activerEdition(carte, projet);

      // Scroll + focus sur le titre
      carte.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(() => {
        const titre = carte.querySelector('[data-field="titre"]');
        if (titre) titre.click();
      }, 400);
    } catch {
      alert('Impossible de créer le projet. Vérifiez votre connexion.');
    }
  }

  async function sauvegarder(projetId) {
    const carteEl = document.querySelector(`[data-projet-id="${projetId}"]`);
    if (!carteEl) return;
    const payload = lireCarte(carteEl);
    try {
      const r = await fetch(`/api/projets/${projetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error();
      const updated = await r.json();
      carteEl.dataset.description = updated.description || '';
      const idxS = projetsCache.findIndex(p => p.id === projetId);
      if (idxS !== -1) projetsCache[idxS] = { ...projetsCache[idxS], ...updated };
      afficherMsg(projetId, '✅ Enregistré', 'ok');
    } catch {
      afficherMsg(projetId, '❌ Erreur, réessayez', 'err');
    }
  }

  async function changerStatut(projetId, statut) {
    const carteEl = document.querySelector(`[data-projet-id="${projetId}"]`);
    if (!carteEl) return;
    try {
      const payload = { ...lireCarte(carteEl), statut };
      const r = await fetch(`/api/projets/${projetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error();
      const updated = await r.json();
      const idxC = projetsCache.findIndex(p => p.id === projetId);
      if (idxC !== -1) projetsCache[idxC] = { ...projetsCache[idxC], ...updated };
      // Re-render la carte avec le nouveau statut
      const div = document.createElement('div');
      div.innerHTML = htmlCarte(updated);
      const nouvelleCarte = div.firstElementChild;
      carteEl.replaceWith(nouvelleCarte);
      attacherLightbox(nouvelleCarte);
      activerEdition(nouvelleCarte, updated);
    } catch {
      afficherMsg(projetId, '❌ Erreur', 'err');
    }
  }

  async function supprimer(projetId) {
    const carteEl = document.querySelector(`[data-projet-id="${projetId}"]`);
    if (!confirm('Supprimer ce projet et toutes ses photos ? Cette action est irréversible.')) return;
    try {
      const r = await fetch(`/api/projets/${projetId}`, { method: 'DELETE' });
      if (!r.ok) throw new Error();
      projetsCache = projetsCache.filter(p => p.id !== projetId);
      carteEl.style.transition = 'opacity .3s, transform .3s';
      carteEl.style.opacity    = '0';
      carteEl.style.transform  = 'scale(.97)';
      setTimeout(() => carteEl.remove(), 320);
    } catch {
      alert('Impossible de supprimer. Réessayez.');
    }
  }

  function afficherMsg(projetId, msg, type) {
    AdminCore.afficherMsg(document.getElementById(`smsg-${projetId}`), msg, type);
  }

  /* ── Photos ───────────────────────────────────────────────── */

  async function ajouterPhotos(projetId, input, carteEl) {
    if (!input.files.length) return;
    const fd = new FormData();
    Array.from(input.files).forEach(f => fd.append('photos', f));
    try {
      const r = await fetch(`/api/projets/${projetId}/photos`, { method: 'POST', body: fd });
      if (!r.ok) throw new Error();
      const nouvellesPhotos = await r.json();
      const container = carteEl.querySelector(`[data-photos-container="${projetId}"]`);
      if (!container) return;

      // Compter les photos existantes pour ajuster la classe de grille
      const existantes = container.querySelectorAll('.project-photo').length;
      const total = existantes + nouvellesPhotos.length;
      // Mettre à jour la classe de grille (visiteur uniquement)
      if (!estConnecte) container.className = `post-photos ${classeGrille(total)}`;

      nouvellesPhotos.forEach(ph => {
        const div = document.createElement('div');
        div.innerHTML = `
          <div class="project-photo" draggable="true" data-photo-id="${ph.id}">
            <img src="${esc(urlPhoto(ph.nom_fichier))}" alt="${esc(ph.nom_fichier)}" loading="lazy"
                 onerror="this.src='${imgPlaceholder()}'">
            <div class="photo-admin-overlay">
              <button class="photo-btn photo-btn--drag" title="Réordonner">⠿</button>
              <button class="photo-btn photo-btn--del" title="Supprimer"
                      onclick="AdminRealisations.supprimerPhoto(${ph.id}, this)">🗑</button>
            </div>
          </div>`;
        const photoEl = div.firstElementChild;
        container.appendChild(photoEl);
        photoEl.addEventListener('click', e => {
          if (e.target.closest('.photo-admin-overlay')) return;
          const idx = Array.from(container.querySelectorAll('.project-photo')).indexOf(photoEl);
          if (typeof openLightbox === 'function') openLightbox(carteEl, idx);
        });
      });

      // Mettre à jour les photos dans le cache
      const idxP = projetsCache.findIndex(p => p.id === Number(projetId));
      if (idxP !== -1) projetsCache[idxP].photos = [...(projetsCache[idxP].photos || []), ...nouvellesPhotos];

      initDragDrop(carteEl, projetId);
      input.value = '';
    } catch {
      alert('Erreur lors de l\'upload. Vérifiez le format et la taille des fichiers (max 5 Mo).');
    }
  }

  async function supprimerPhoto(photoId, btnEl) {
    const photoEl = btnEl.closest('.project-photo');
    const carteEl = btnEl.closest('.project-item');
    if (!confirm('Supprimer cette photo ?')) return;
    try {
      const r = await fetch(`/api/photos/${photoId}`, { method: 'DELETE' });
      if (!r.ok) throw new Error();
      photoEl.style.transition = 'opacity .2s';
      photoEl.style.opacity    = '0';
      setTimeout(() => {
        const projetId  = Number(carteEl.dataset.projetId);
        const container = carteEl.querySelector(`[data-photos-container]`);
        photoEl.remove();
        if (container && !estConnecte) {
          const restantes = container.querySelectorAll('.project-photo').length;
          container.className = `post-photos ${classeGrille(restantes)}`;
        }
        // Mettre à jour le cache
        const idxD = projetsCache.findIndex(p => p.id === projetId);
        if (idxD !== -1) projetsCache[idxD].photos = (projetsCache[idxD].photos || []).filter(ph => ph.id !== photoId);
        if (carteEl) reattacherLightbox(carteEl);
      }, 220);
    } catch {
      alert('Impossible de supprimer la photo.');
    }
  }

  /* ── Réordonnement des cartes projet (↑ / ↓) ─────────────── */

  function monterProjet(projetId) {
    const liste = document.querySelector('.projects-list');
    const carte = liste?.querySelector(`[data-projet-id="${projetId}"]`);
    if (!carte) return;
    const prev = carte.previousElementSibling;
    if (!prev) return;
    liste.insertBefore(carte, prev);
    _syncOrdreCartes();
  }

  function descendreProjet(projetId) {
    const liste = document.querySelector('.projects-list');
    const carte = liste?.querySelector(`[data-projet-id="${projetId}"]`);
    if (!carte) return;
    const next = carte.nextElementSibling;
    if (!next) return;
    liste.insertBefore(next, carte);
    _syncOrdreCartes();
  }

  function _syncOrdreCartes() {
    const liste = document.querySelector('.projects-list');
    if (!liste) return;
    const ordreIds = Array.from(liste.querySelectorAll('.project-item[data-projet-id]'))
      .map(el => Number(el.dataset.projetId));
    projetsCache.sort((a, b) => ordreIds.indexOf(a.id) - ordreIds.indexOf(b.id));
    majBoutonsOrdre();
    _enregistrerOrdre(ordreIds);
  }

  // Désactive ↑ sur la première carte et ↓ sur la dernière
  function majBoutonsOrdre() {
    const cartes = Array.from(document.querySelectorAll('.projects-list .project-item[data-projet-id]'));
    cartes.forEach((carte, i) => {
      carte.querySelectorAll('.adm-btn--move').forEach(btn => {
        if (btn.title === 'Monter')    btn.disabled = (i === 0);
        if (btn.title === 'Descendre') btn.disabled = (i === cartes.length - 1);
      });
    });
  }

  async function _enregistrerOrdre(ordreIds) {
    const projets = ordreIds.map((id, i) => ({ id, ordre: i }));
    try {
      await fetch('/api/projets/ordre', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projets }),
      });
    } catch { /* silencieux */ }
  }

  /* ── Drag & drop réordonnement photos ─────────────────────── */

  function initDragDrop(carteEl, projetId) {
    const container = carteEl.querySelector(`[data-photos-container="${projetId}"]`);
    if (!container) return;
    AdminCore.initDragDrop(container, {
      selector: '.project-photo[draggable]',
      dragOverClass: 'drag-over',
      onDrop: () => enregistrerOrdre(projetId, container),
    });
  }

  async function enregistrerOrdre(projetId, container) {
    const photos = Array.from(container.querySelectorAll('.project-photo[data-photo-id]'))
      .map((el, i) => ({ id: Number(el.dataset.photoId), ordre: i }));
    try {
      await fetch('/api/photos/ordre', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photos }),
      });
    } catch { /* silencieux */ }
  }

  /* ── Initialisation ───────────────────────────────────────── */

  injecterCSS();

  function injecterBoutonAjouter() {
    if (document.getElementById('admin-btn-ajouter')) return;
    const liste = document.querySelector('.projects-list');
    if (!liste) return;
    const barre = document.createElement('div');
    barre.id = 'admin-btn-ajouter';
    barre.className = 'admin-actions-bar';
    barre.innerHTML = `<button class="btn btn--accent" onclick="AdminRealisations.creerProjet()">＋ Ajouter un projet</button>`;
    liste.parentNode.insertBefore(barre, liste);
  }

  AdminCore.init({
    onConnecte: async (_email) => {
      estConnecte = true;
      injecterBoutonAjouter();
      try {
        const projets = await chargerProjets();
        rendreProjets(projets);
      } catch {
        const liste = document.querySelector('.projects-list');
        if (liste) liste.innerHTML = '<div class="projets-loading">Impossible de charger les projets.</div>';
      }
    },
    onNonConnecte: async () => {
      estConnecte = false;
      try {
        const projets = await chargerProjets();
        rendreProjets(projets);
      } catch {
        const liste = document.querySelector('.projects-list');
        if (liste) liste.innerHTML = '<div class="projets-loading">Impossible de charger les projets.</div>';
      }
    },
    onToggleVisiteur: (visiteur) => {
      const realConnecte = estConnecte;
      estConnecte = !visiteur;
      rendreProjets(projetsCache);
      estConnecte = realConnecte;
    },
    onApresDeconnexion: () => {
      estConnecte = false;
      rendreProjets(projetsCache.filter(p => p.statut === 'publie'), false);
      AdminCore.gererFooterLink(false);
    },
  });

  /* ── API publique ─────────────────────────────────────────── */
  return {
    creerProjet,
    sauvegarder,
    changerStatut,
    supprimer,
    supprimerPhoto,
    ajouterPhotos,
    monterProjet,
    descendreProjet,
  };

})();
