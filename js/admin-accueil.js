/* ============================================================
   CORSE PRO SERVICES — js/admin-accueil.js
   Administration inline de la page d'accueil
   Dépend de admin-core.js (AdminCore doit être chargé avant)
   ============================================================ */
'use strict';

const AdminAccueil = (() => {

  const { esc, escBr } = AdminCore.utils;

  /* ── État ─────────────────────────────────────────────────── */
  let estConnecte    = false;
  let quillInstance  = null;
  let donneesAccueil = null;

  /* ── CSS local ────────────────────────────────────────────── */

  function injecterCSS() {
    if (document.getElementById('admin-accueil-css')) return;
    const s = document.createElement('style');
    s.id = 'admin-accueil-css';
    s.textContent = `
      /* ── Édition inline hero : fond transparent ── */
      .hero__content .editable input,
      .hero__content .editable textarea {
        background: transparent;
        color: inherit;
        caret-color: #fbef43;
      }

      /* ── Styles partagés : éditeur + rendu visiteur ── */
      .ql-editor h2,
      #whois-contenu h2 {
        font-size: 1.4rem; font-weight: 700; margin: 1.2em 0 .5em; line-height: 1.25;
      }
      .ql-editor h3,
      #whois-contenu h3 {
        font-size: 1.1rem; font-weight: 700; margin: 1em 0 .4em; line-height: 1.25;
      }
      .ql-editor,
      #whois-contenu {
        line-height: 1.7; font-size: 1rem;
      }
      #whois-contenu > *:first-child { margin-top: 0; }
      .ql-editor > *:first-child { margin-top: 0 !important; }
      #whois-contenu p { margin-bottom: 1em; }
      #whois-contenu p:last-child { margin-bottom: 0; }
      #whois-contenu ol,
      #whois-contenu ul { padding-left: 1.5em; margin-bottom: 1em; }
      #whois-contenu li { margin-bottom: .3em; }
      .ql-editor blockquote,
      #whois-contenu blockquote {
        border-left: 3px solid #fbef43; margin: 1.2em 0;
        padding: .6em 1.2em; color: var(--text-muted, #6b7280); font-style: italic;
        font-family: 'Playfair Display', serif; font-size: 1.1rem;
      }

      /* ── Éditeur Quill whois ── */
      #whois-quill-wrap {
        border-radius: 8px; overflow: hidden; margin-bottom: 0;
      }
      #whois-quill-editor {
        min-height: 200px;
        font-family: inherit; font-size: 1rem; line-height: 1.7;
      }
      .ql-toolbar  { background: #faf8f0; border-color: #ede8d0 !important; }
      .ql-container { border-color: #ede8d0 !important; }

      /* ── Message save hero ── */
      #hero-save-msg {
        font-size: .8rem; font-weight: 600; padding: 3px 10px;
        border-radius: 6px; display: none;
      }
      #hero-save-msg.save-msg--ok  { color: #166534; background: rgba(220,252,231,.9); display: inline; }
      #hero-save-msg.save-msg--err { color: #991b1b; background: rgba(254,226,226,.9); display: inline; }

      /* ── Overlay photo qui suis-je ── */
      .about-preview__image .whois-photo-overlay {
        position: absolute; inset: 0;
        background: rgba(0,0,0,.52);
        display: flex; align-items: center; justify-content: center;
        opacity: 0; transition: opacity .18s; z-index: 2;
        pointer-events: none;
      }
      .about-preview__image:hover .whois-photo-overlay { opacity: 1; pointer-events: auto; }
      .whois-photo-btn {
        background: rgba(255,255,255,.9); color: #1c1c1e; border: none;
        border-radius: 8px; padding: 8px 16px; font-size: .85rem; font-weight: 600;
        cursor: pointer; font-family: 'Inter', sans-serif; transition: background .15s;
        display: inline-flex; align-items: center; gap: 6px;
      }
      .whois-photo-btn:hover { background: #fff; }

      /* ── Zone save whois ── */
      #whois-save-wrap {
        display: flex; align-items: center; gap: 12px; margin-top: 12px;
      }

      /* ── Mode visiteur ── */
      body.mode-visiteur .whois-photo-overlay { display: none !important; }
      body.mode-visiteur #hero-save-msg       { display: none !important; }
      body.mode-visiteur #whois-save-wrap     { display: none !important; }
    `;
    document.head.appendChild(s);
  }

  /* ── Chargement ───────────────────────────────────────────── */

  async function chargerEtRendreContenu() {
    try {
      const r = await fetch('/api/accueil');
      if (!r.ok) throw new Error();
      donneesAccueil = await r.json();
    } catch {
      donneesAccueil = null;
    }
    rendreHero(donneesAccueil);
    rendreWhois(donneesAccueil);
  }

  /* ══════════════════════════════════════════════════════════
     HERO
     ══════════════════════════════════════════════════════════ */

  function rendreHero(data) {
    const h1      = document.querySelector('h1[data-field="hero_titre"]');
    const tagline = document.querySelector('[data-field="hero_tagline"]');

    if (data) {
      if (h1      && !h1.querySelector('input, textarea'))
        h1.innerHTML = escBr(data.hero_titre || '');
      if (tagline && !tagline.querySelector('input, textarea'))
        tagline.innerHTML = escBr(data.hero_tagline || '');
    }

    if (!estConnecte) return;

    // Injecter le message save si absent
    if (!document.getElementById('hero-save-msg')) {
      const heroActions = document.querySelector('.hero__actions');
      if (heroActions) {
        const msgEl = document.createElement('span');
        msgEl.id = 'hero-save-msg';
        heroActions.insertAdjacentElement('beforebegin', msgEl);
      }
    }

    // N'attacher les listeners qu'une seule fois
    const heroContent = document.querySelector('.hero__content');
    if (!heroContent || heroContent.dataset.editablesInit) return;
    heroContent.dataset.editablesInit = '1';

    AdminCore.activerEditables(heroContent, {
      hero_titre: {
        type: 'textarea',
        rows: 3,
        getValue: el => el.innerText.trim(),
        setValue: (el, val) => {
          el.innerHTML = escBr(val.trim());
          sauvegarderHero();
        },
      },
      hero_tagline: {
        type: 'textarea',
        rows: 2,
        getValue: el => el.innerText.trim(),
        setValue: (el, val) => {
          el.innerHTML = escBr(val.trim());
          sauvegarderHero();
        },
      },
    });
  }

  async function sauvegarderHero() {
    const h1      = document.querySelector('h1[data-field="hero_titre"]');
    const tagline = document.querySelector('[data-field="hero_tagline"]');
    const msgEl   = document.getElementById('hero-save-msg');

    const hero_titre    = h1      ? h1.innerText.trim()      : (donneesAccueil?.hero_titre    || '');
    const hero_tagline  = tagline ? tagline.innerText.trim()  : (donneesAccueil?.hero_tagline  || '');

    try {
      const r = await fetch('/api/accueil', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hero_titre,
          hero_tagline,
          whois_contenu_html: donneesAccueil?.whois_contenu_html || '',
        }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      donneesAccueil = await r.json();
      AdminCore.afficherMsg(msgEl, '✅ Enregistré', 'ok', 2000);
    } catch {
      AdminCore.afficherMsg(msgEl, '❌ Erreur', 'err', 2000);
    }
  }

  /* ══════════════════════════════════════════════════════════
     QUI SUIS-JE ?
     ══════════════════════════════════════════════════════════ */

  function rendreWhois(data) {
    const contenuEl  = document.getElementById('whois-contenu');
    const quillWrap  = document.getElementById('whois-quill-wrap');
    const btnSave    = document.getElementById('btn-save-whois');
    const photoImg   = document.getElementById('whois-photo');
    const saveWrap   = document.getElementById('whois-save-wrap');

    // Mettre à jour la photo
    if (photoImg && data?.whois_photo) {
      const src = (data.whois_photo.startsWith('assets/') || data.whois_photo.startsWith('http'))
        ? data.whois_photo
        : `/uploads/${data.whois_photo}`;
      photoImg.src = src;
    }

    if (!estConnecte) {
      if (contenuEl) { contenuEl.innerHTML = data?.whois_contenu_html || ''; contenuEl.style.display = ''; }
      if (quillWrap) quillWrap.style.display = 'none';
      if (saveWrap)  saveWrap.style.display = 'none';
      return;
    }

    // Mode admin
    if (contenuEl) contenuEl.style.display = 'none';
    if (quillWrap) quillWrap.style.display = '';
    if (saveWrap)  saveWrap.style.display = '';
    if (btnSave)   btnSave.style.display = '';

    initQuill(data?.whois_contenu_html || '');
    activerPhotoOverlay(photoImg);

    btnSave?.removeEventListener('click', sauvegarderWhois);
    btnSave?.addEventListener('click', sauvegarderWhois);
  }

  function initQuill(contenuHtml) {
    if (!document.getElementById('whois-quill-editor')) return;
    if (quillInstance) {
      quillInstance.clipboard.dangerouslyPasteHTML(contenuHtml || '');
      return;
    }
    quillInstance = new Quill('#whois-quill-editor', {
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
    quillInstance.blur();
  }

  function activerPhotoOverlay(photoImg) {
    if (!photoImg) return;
    const container = photoImg.closest('.about-preview__image');
    if (!container || container.querySelector('.whois-photo-overlay')) return;

    const overlay = document.createElement('div');
    overlay.className = 'whois-photo-overlay';
    overlay.innerHTML = `
      <label class="whois-photo-btn">
        📷 Changer la photo
        <input type="file" accept=".jpg,.jpeg,.png,.webp" style="display:none" id="input-photo-whois">
      </label>`;
    container.appendChild(overlay);

    document.getElementById('input-photo-whois')?.addEventListener('change', async () => {
      const inp  = document.getElementById('input-photo-whois');
      const file = inp?.files[0];
      if (!file) return;
      const formData = new FormData();
      formData.append('photo', file);
      try {
        const r = await fetch('/api/accueil/photo', { method: 'POST', body: formData });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const result = await r.json();
        donneesAccueil = { ...donneesAccueil, whois_photo: result.whois_photo };
        photoImg.src = `/uploads/${result.whois_photo}`;
      } catch (e) {
        alert(`Erreur upload photo : ${e.message}`);
      }
    });
  }

  async function sauvegarderWhois() {
    const msgEl = document.getElementById('whois-save-msg');
    if (!quillInstance) {
      AdminCore.afficherMsg(msgEl, '❌ Éditeur non prêt', 'err');
      return;
    }
    const h1      = document.querySelector('h1[data-field="hero_titre"]');
    const tagline = document.querySelector('[data-field="hero_tagline"]');
    try {
      const r = await fetch('/api/accueil', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hero_titre:         h1      ? h1.innerText.trim()     : (donneesAccueil?.hero_titre    || ''),
          hero_tagline:       tagline ? tagline.innerText.trim() : (donneesAccueil?.hero_tagline  || ''),
          whois_contenu_html: quillInstance.root.innerHTML,
        }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      donneesAccueil = await r.json();
      AdminCore.afficherMsg(msgEl, '✅ Enregistré', 'ok');
    } catch (e) {
      AdminCore.afficherMsg(msgEl, `❌ ${e.message || 'Erreur, réessayez'}`, 'err');
    }
  }

  /* ── Initialisation ───────────────────────────────────────── */

  injecterCSS();

  AdminCore.init({
    boutonsCentre: '',
    onConnecte: async () => {
      estConnecte = true;
      await chargerEtRendreContenu();
      // Quill prend le focus et scrolle — on annule après le rendu
      requestAnimationFrame(() => {
        quillInstance?.blur();
        window.scrollTo(0, 0);
      });
    },
    onNonConnecte: async () => {
      estConnecte = false;
      await chargerEtRendreContenu();
    },
    onToggleVisiteur: (visiteur) => {
      estConnecte = !visiteur;
      if (donneesAccueil) {
        rendreHero(donneesAccueil);
        rendreWhois(donneesAccueil);
      } else {
        chargerEtRendreContenu();
      }
    },
    onApresDeconnexion: () => {
      estConnecte = false;
      chargerEtRendreContenu();
      AdminCore.gererFooterLink(false);
    },
  });

  return {};

})();
