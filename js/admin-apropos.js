/* ============================================================
   CORSE PRO SERVICES — js/admin-apropos.js
   Administration inline de la page À propos
   Dépend de admin-core.js (AdminCore doit être chargé avant)
   ============================================================ */
'use strict';

const AdminApropos = (() => {

  const { esc } = AdminCore.utils;

  /* ── État ─────────────────────────────────────────────────── */
  let estConnecte         = false;
  let donneesPresentation = null;
  let donneesValeurs      = [];
  let quillInstance       = null;

  /* ── CSS local ────────────────────────────────────────────── */

  function injecterCSS() {
    if (document.getElementById('admin-apropos-css')) return;
    const s = document.createElement('style');
    s.id = 'admin-apropos-css';
    s.textContent = `
      /* ── Certifications : bouton supprimer ── */
      .certif-del-btn {
        background: none; border: none; cursor: pointer;
        font-size: .9rem; padding: 0 4px; opacity: .45;
        transition: opacity .15s; flex-shrink: 0; line-height: 1;
      }
      .certif-del-btn:hover { opacity: 1; }

      /* ── Cartes valeurs : drag & bouton supprimer ── */
      .value-card[draggable="true"] { cursor: grab; position: relative; }
      .value-card[draggable="true"]:active { cursor: grabbing; }
      .value-card.drag-over { outline: 3px solid #fbef43; }
      .valeur-del-btn {
        position: absolute; top: 10px; right: 10px;
        background: #fee2e2; color: #991b1b; border: none;
        border-radius: 6px; padding: 3px 8px; font-size: .8rem;
        cursor: pointer; opacity: 0; transition: opacity .15s;
      }
      .value-card:hover .valeur-del-btn { opacity: 1; }

      /* ── Zones save ── */
      .apropos-save-area {
        display: flex; align-items: center; gap: 10px;
        margin-top: 20px; flex-wrap: wrap;
      }
      .apropos-valeurs-bar {
        display: flex; align-items: center; justify-content: flex-end;
        gap: 10px; padding: 14px 0; flex-wrap: wrap;
      }

      /* ── Éditeur Quill ── */
      #quill-editor-wrap {
        border-radius: 8px; overflow: hidden; margin-bottom: 16px;
      }
      #quill-editor {
        min-height: 400px;
        font-family: inherit; font-size: 1rem; line-height: 1.7;
      }
      .ql-toolbar  { background: #faf8f0; border-color: #ede8d0 !important; }
      .ql-container { border-color: #ede8d0 !important; }

      /* ── Styles partagés : éditeur + rendu visiteur ── */
      .ql-editor h2,
      #apropos-contenu-html h2 {
        font-size: 1.4rem; font-weight: 700; margin: 1.2em 0 .5em; line-height: 1.25;
      }
      .ql-editor h3,
      #apropos-contenu-html h3 {
        font-size: 1.1rem; font-weight: 700; margin: 1em 0 .4em; line-height: 1.25;
      }
      .ql-editor,
      #apropos-contenu-html {
        line-height: 1.7; font-size: 1rem;
      }
      #apropos-contenu-html > *:first-child { margin-top: 0; }
      .ql-editor > *:first-child { margin-top: 0 !important; }
      #apropos-contenu-html p { margin-bottom: 1em; }
      #apropos-contenu-html p:last-child { margin-bottom: 0; }
      #apropos-contenu-html ol,
      #apropos-contenu-html ul { padding-left: 1.5em; margin-bottom: 1em; }
      #apropos-contenu-html li { margin-bottom: .3em; }
      .ql-editor blockquote,
      #apropos-contenu-html blockquote {
        border-left: 3px solid #fbef43; margin: 1.2em 0;
        padding: .6em 1.2em; color: var(--text-muted, #6b7280); font-style: italic;
      }

      /* ── Annule la grille parente (about-full__inner) ── */
      .about-full__inner { display: block; }

      /* ── Layout présentation : texte gauche / photo droite ── */
      .apropos-layout {
        display: grid;
        grid-template-columns: 2fr 1fr;
        gap: 48px;
        align-items: start;
        margin-bottom: 32px;
      }
      @media (max-width: 900px) {
        .apropos-layout { grid-template-columns: 1fr; gap: 28px; }
        .apropos-layout__aside { order: -1; }
      }

      /* ── Photo de présentation ── */
      .apropos-photo-wrap {
        position: relative;
        border-radius: var(--radius, 12px);
        overflow: hidden;
        box-shadow: var(--shadow-hover, 0 8px 32px rgba(0,0,0,.14));
      }
      .apropos-photo-wrap img {
        width: 100%; height: 340px; object-fit: cover; display: block;
      }
      .apropos-photo-placeholder {
        width: 100%; height: 240px;
        background: var(--bg-light, #faf8f0);
        border: 2px dashed #d1d5db;
        border-radius: var(--radius, 12px);
        display: flex; align-items: center; justify-content: center;
        color: var(--text-muted, #6b7280); font-size: 0.9rem; text-align: center;
      }
      .apropos-photo-overlay {
        position: absolute; inset: 0; background: rgba(0,0,0,.52);
        display: flex; align-items: center; justify-content: center;
        opacity: 0; transition: opacity .18s; z-index: 2;
        pointer-events: none;
      }
      .apropos-photo-wrap:hover .apropos-photo-overlay { opacity: 1; pointer-events: auto; }
      .apropos-photo-btn {
        background: rgba(255,255,255,.9); color: #1c1c1e; border: none;
        border-radius: 8px; padding: 8px 16px; font-size: .85rem; font-weight: 600;
        cursor: pointer; font-family: 'Inter', sans-serif; transition: background .15s;
        display: inline-flex; align-items: center; gap: 6px;
      }
      .apropos-photo-btn:hover { background: #fff; }

      /* ── Certifications sous la photo (colonne droite) ── */
      .about-full__certifs {
        background: var(--bg-light, #faf8f0);
        border-radius: var(--radius, 12px);
        padding: 22px;
        margin-top: 20px;
      }
      .about-full__certifs h3 { font-size: 1rem; margin-bottom: 14px; }

      /* ── Masqué en mode visiteur ── */
      body.mode-visiteur .apropos-save-area   { display: none !important; }
      body.mode-visiteur .apropos-valeurs-bar { display: none !important; }
      body.mode-visiteur .valeur-del-btn      { display: none !important; }
      body.mode-visiteur .certif-del-btn      { display: none !important; }
      body.mode-visiteur #btn-add-certif      { display: none !important; }
      body.mode-visiteur .apropos-photo-overlay  { display: none !important; }
      body.mode-visiteur .apropos-photo-placeholder .apropos-photo-btn { display: none !important; }
    `;
    document.head.appendChild(s);
  }

  /* ── Chargement ───────────────────────────────────────────── */

  async function chargerEtRendreContenu() {
    try {
      const [rP, rV] = await Promise.all([
        fetch('/api/apropos/presentation'),
        fetch('/api/apropos/valeurs'),
      ]);
      if (!rP.ok || !rV.ok) throw new Error();
      donneesPresentation = await rP.json();
      donneesValeurs      = await rV.json();
    } catch {
      donneesPresentation = null;
      donneesValeurs      = [];
    }
    rendrePresentation(donneesPresentation);
    rendreValeurs(donneesValeurs);
  }

  /* ── Utilitaire : lire un champ (input ouvert ou texte) ───── */

  function lireChamp(conteneur, field) {
    const el = conteneur.querySelector(`[data-field="${field}"]`);
    if (!el) return '';
    const inp = el.querySelector('input, textarea');
    return inp ? inp.value.trim() : el.textContent.trim();
  }

  /* ══════════════════════════════════════════════════════════
     PRÉSENTATION
     ══════════════════════════════════════════════════════════ */

  function rendrePresentation(data) {
    quillInstance = null;
    const container = document.getElementById('apropos-presentation');
    if (!container) return;

    if (!data) {
      container.innerHTML = '<div class="projets-loading">Impossible de charger le contenu.</div>';
      return;
    }

    const isAdmin = estConnecte;

    const certifHTML = (data.certifications || []).map((c, i) => `
      <li style="display:flex; gap:10px; font-size:0.88rem; color:var(--text-muted); align-items:flex-start;">
        <span style="flex-shrink:0;">✅</span>
        <span ${isAdmin ? `class="editable" data-field="certif_${i}"` : ''}>${esc(c)}</span>
        ${isAdmin ? `<button class="certif-del-btn" title="Supprimer">🗑</button>` : ''}
      </li>`
    ).join('');

    const photoHTML = (() => {
      if (data.photo_filename) {
        return `
          <div class="apropos-photo-wrap">
            <img src="/uploads/${esc(data.photo_filename)}" alt="Photo de présentation">
            ${isAdmin ? `
            <div class="apropos-photo-overlay">
              <label class="apropos-photo-btn">
                📷 Changer la photo
                <input type="file" accept=".jpg,.jpeg,.png,.webp" style="display:none" id="input-photo-apropos">
              </label>
            </div>` : ''}
          </div>`;
      }
      if (isAdmin) {
        return `
          <div class="apropos-photo-placeholder">
            <div>
              <div style="font-size:2rem; margin-bottom:10px;">🖼️</div>
              <label class="apropos-photo-btn">
                Ajouter une photo
                <input type="file" accept=".jpg,.jpeg,.png,.webp" style="display:none" id="input-photo-apropos">
              </label>
            </div>
          </div>`;
      }
      return '';
    })();

    container.innerHTML = `
      <div class="apropos-layout">
        <div class="apropos-layout__main">
          ${isAdmin
            ? `<div id="apropos-contenu-html" style="display:none"></div>
               <div id="quill-editor-wrap"><div id="quill-editor"></div></div>`
            : `<div id="apropos-contenu-html">${data.contenu_html || ''}</div>`}
          ${isAdmin ? `
            <div class="apropos-save-area">
              <span class="save-msg" id="msg-presentation"></span>
              <button class="adm-btn adm-btn--save" id="btn-save-presentation">Enregistrer la présentation</button>
            </div>` : ''}
        </div>
        <div class="apropos-layout__aside">
          ${photoHTML}
          <div class="about-full__certifs">
            <h3>Certifications &amp; formations</h3>
            <ul data-certif-list style="display:flex; flex-direction:column; gap:10px; list-style:none; padding:0; margin:0;">
              ${certifHTML}
            </ul>
            ${isAdmin ? `<button class="adm-btn adm-btn--publish" id="btn-add-certif" style="margin-top:12px;">＋ Certification</button>` : ''}
          </div>
        </div>
      </div>`;

    if (!isAdmin) return;

    /* ── Quill ── */
    initQuill(data.contenu_html);

    /* ── Upload photo ── */
    const inputPhoto = document.getElementById('input-photo-apropos');
    if (inputPhoto) {
      inputPhoto.addEventListener('change', async () => {
        const file = inputPhoto.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('photo', file);
        try {
          const r = await fetch('/api/apropos/photo', { method: 'POST', body: formData });
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          const result = await r.json();
          donneesPresentation = { ...donneesPresentation, photo_filename: result.photo_filename };
          rendrePresentation(donneesPresentation);
        } catch (e) {
          alert(`Erreur upload photo : ${e.message}`);
        }
      });
    }

    /* ── Certifications editables ── */
    const editConfig = {};
    (data.certifications || []).forEach((_, i) => {
      editConfig[`certif_${i}`] = {
        type: 'text',
        getValue: el => el.textContent.trim(),
        setValue: (el, val) => { el.textContent = val || ''; },
      };
    });
    AdminCore.activerEditables(container, editConfig);

    /* ── Supprimer une certification ── */
    container.querySelectorAll('.certif-del-btn').forEach(btn => {
      btn.addEventListener('click', () => btn.closest('li').remove());
    });

    /* ── Ajouter une certification ── */
    document.getElementById('btn-add-certif')?.addEventListener('click', () => {
      const list = container.querySelector('[data-certif-list]');
      if (!list) return;
      const idx     = list.querySelectorAll('li').length;
      const li      = document.createElement('li');
      li.style.cssText = 'display:flex; gap:10px; font-size:0.88rem; color:var(--text-muted); align-items:flex-start;';
      const check   = document.createElement('span');
      check.style.flexShrink = '0';
      check.textContent = '✅';
      const spanText = document.createElement('span');
      spanText.dataset.field = `certif_${idx}`;
      const delBtn   = document.createElement('button');
      delBtn.className = 'certif-del-btn';
      delBtn.title = 'Supprimer';
      delBtn.textContent = '🗑';
      delBtn.addEventListener('click', () => li.remove());
      li.append(check, spanText, delBtn);
      list.appendChild(li);
      AdminCore.rendreEditable(spanText, {
        type: 'text',
        getValue: el => el.textContent.trim(),
        setValue: (el, val) => { el.textContent = val || ''; },
      });
    });

    /* ── Enregistrer la présentation ── */
    document.getElementById('btn-save-presentation')?.addEventListener('click', sauvegarderPresentation);
  }

  function initQuill(contenuHtml) {
    if (!document.getElementById('quill-editor-wrap')) return;
    quillInstance = new Quill('#quill-editor', {
      theme: 'snow',
      modules: {
        toolbar: [
          ['bold', 'italic', 'underline'],
          [{ header: [2, 3, false] }],
          [{ list: 'ordered' }, { list: 'bullet' }],
          ['blockquote'],
          ['clean'],
        ],
      },
    });
    quillInstance.clipboard.dangerouslyPasteHTML(contenuHtml || '');
  }

  function lirePresentation() {
    const container = document.getElementById('apropos-presentation');
    if (!container) return null;

    const certifications = [];
    container.querySelectorAll('[data-certif-list] li').forEach(li => {
      const textEl = li.querySelector('[data-field]');
      if (!textEl) return;
      const inp = textEl.querySelector('input, textarea');
      const val = inp ? inp.value.trim() : textEl.textContent.trim();
      if (val) certifications.push(val);
    });

    return {
      contenu_html: quillInstance ? quillInstance.root.innerHTML : '',
      certifications,
    };
  }

  async function sauvegarderPresentation() {
    const msgEl = document.getElementById('msg-presentation');
    if (!quillInstance) {
      AdminCore.afficherMsg(msgEl, '❌ Éditeur non prêt', 'err');
      return;
    }
    const payload = lirePresentation();
    if (!payload) return;
    try {
      const r = await fetch('/api/apropos/presentation', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      donneesPresentation = await r.json();
      AdminCore.afficherMsg(msgEl, '✅ Enregistré', 'ok');
    } catch (e) {
      console.error('Échec sauvegarde présentation :', e);
      AdminCore.afficherMsg(msgEl, `❌ ${e.message || 'Erreur, réessayez'}`, 'err');
    }
  }

  /* ══════════════════════════════════════════════════════════
     VALEURS
     ══════════════════════════════════════════════════════════ */

  function htmlCarteValeur(v) {
    const isAdmin = estConnecte;
    return `
<div class="value-card" data-valeur-id="${v.id}"${isAdmin ? ' draggable="true"' : ''}>
  ${isAdmin ? `<button class="valeur-del-btn" title="Supprimer cette valeur">🗑</button>` : ''}
  <div class="value-card__icon${isAdmin ? ' editable' : ''}" data-field="icone">${esc(v.icone || '')}</div>
  <h3 ${isAdmin ? 'class="editable" ' : ''}data-field="titre">${esc(v.titre || '')}</h3>
  <p ${isAdmin ? 'class="editable" ' : ''}data-field="texte">${esc(v.texte || '')}</p>
</div>`;
  }

  function configEditablesValeur() {
    return {
      icone: { type: 'text',     getValue: el => el.textContent.trim(), setValue: (el, val) => { el.textContent = val || ''; } },
      titre: { type: 'text',     getValue: el => el.textContent.trim(), setValue: (el, val) => { el.textContent = val || ''; } },
      texte: { type: 'textarea', rows: 4, getValue: el => el.textContent.trim(), setValue: (el, val) => { el.textContent = val || ''; } },
    };
  }

  function attacherCarteValeur(carteEl) {
    AdminCore.activerEditables(carteEl, configEditablesValeur());
    carteEl.querySelector('.valeur-del-btn')?.addEventListener('click', () => {
      supprimerValeur(Number(carteEl.dataset.valeurId), carteEl);
    });
  }

  function rendreValeurs(valeurs) {
    const container = document.getElementById('apropos-valeurs');
    if (!container) return;
    const isAdmin = estConnecte;

    // Nettoyer la barre précédente
    document.getElementById('admin-valeurs-bar')?.remove();

    container.innerHTML = '';

    if (!valeurs.length && !isAdmin) {
      container.innerHTML = '<p style="text-align:center; color:var(--text-muted)">Aucune valeur publiée.</p>';
      return;
    }

    valeurs.forEach(v => {
      const div = document.createElement('div');
      div.innerHTML = htmlCarteValeur(v);
      container.appendChild(div.firstElementChild);
    });

    if (!isAdmin) return;

    // Activer édition sur chaque carte
    container.querySelectorAll('.value-card[data-valeur-id]').forEach(carteEl => {
      attacherCarteValeur(carteEl);
    });

    // Barre add + save
    const barre = document.createElement('div');
    barre.id        = 'admin-valeurs-bar';
    barre.className = 'apropos-valeurs-bar';
    barre.innerHTML = `
      <span class="save-msg" id="msg-valeurs"></span>
      <button class="adm-btn adm-btn--publish" id="btn-add-valeur">＋ Ajouter une valeur</button>
      <button class="adm-btn adm-btn--save"    id="btn-save-valeurs">Enregistrer les valeurs</button>`;
    container.insertAdjacentElement('afterend', barre);

    document.getElementById('btn-add-valeur')?.addEventListener('click', ajouterValeur);
    document.getElementById('btn-save-valeurs')?.addEventListener('click', sauvegarderValeurs);

    // Drag & drop ordre
    AdminCore.initDragDrop(container, {
      selector: '.value-card[draggable]',
      dragOverClass: 'drag-over',
      onDrop: (ordreIds) => {
        const valeurs = ordreIds.map((id, i) => ({ id, ordre: i }));
        fetch('/api/apropos/valeurs/ordre', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ valeurs }),
        }).catch(() => {});
      },
    });
  }

  async function ajouterValeur() {
    try {
      const r = await fetch('/api/apropos/valeurs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ icone: '⭐', titre: 'Nouvelle valeur', texte: '' }),
      });
      if (!r.ok) throw new Error();
      const valeur = await r.json();

      const container = document.getElementById('apropos-valeurs');
      const div = document.createElement('div');
      div.innerHTML = htmlCarteValeur(valeur);
      const carte = div.firstElementChild;
      container.appendChild(carte);
      attacherCarteValeur(carte);

      carte.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      setTimeout(() => carte.querySelector('[data-field="titre"]')?.click(), 350);
    } catch {
      alert('Impossible de créer la valeur. Vérifiez votre connexion.');
    }
  }

  async function supprimerValeur(valeurId, carteEl) {
    if (!confirm('Supprimer cette valeur ?')) return;
    try {
      const r = await fetch(`/api/apropos/valeurs/${valeurId}`, { method: 'DELETE' });
      if (!r.ok) throw new Error();
      carteEl.style.transition = 'opacity .3s, transform .3s';
      carteEl.style.opacity    = '0';
      carteEl.style.transform  = 'scale(.97)';
      setTimeout(() => carteEl.remove(), 320);
    } catch {
      alert('Impossible de supprimer cette valeur.');
    }
  }

  async function sauvegarderValeurs() {
    const container = document.getElementById('apropos-valeurs');
    const msgEl     = document.getElementById('msg-valeurs');
    const cartes    = Array.from(container.querySelectorAll('.value-card[data-valeur-id]'));
    try {
      const resultats = await Promise.all(cartes.map(carte =>
        fetch(`/api/apropos/valeurs/${Number(carte.dataset.valeurId)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            icone: lireChamp(carte, 'icone'),
            titre: lireChamp(carte, 'titre'),
            texte: lireChamp(carte, 'texte'),
          }),
        })
      ));
      if (resultats.some(r => !r.ok)) throw new Error();
      AdminCore.afficherMsg(msgEl, '✅ Enregistré', 'ok');
    } catch {
      AdminCore.afficherMsg(msgEl, '❌ Erreur, réessayez', 'err');
    }
  }

  /* ── Initialisation ───────────────────────────────────────── */

  injecterCSS();

  AdminCore.init({
    boutonsCentre: '',
    onConnecte: async () => {
      estConnecte = true;
      await chargerEtRendreContenu();
    },
    onNonConnecte: async () => {
      estConnecte = false;
      await chargerEtRendreContenu();
    },
    onToggleVisiteur: (visiteur) => {
      estConnecte = !visiteur;
      chargerEtRendreContenu();
    },
    onApresDeconnexion: () => {
      estConnecte = false;
      chargerEtRendreContenu();
      AdminCore.gererFooterLink(false);
    },
  });

  /* ── API publique ─────────────────────────────────────────── */
  return {};

})();
