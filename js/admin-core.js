/* ============================================================
   CORSE PRO SERVICES — js/admin-core.js
   Module socle d'administration (session, barre, CSS commun)
   ============================================================ */
'use strict';

const AdminCore = (() => {

  /* ── État ─────────────────────────────────────────────────── */
  let modeVisiteur = false;
  let _config = {};

  /* ── Utilitaires ──────────────────────────────────────────── */

  function esc(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function escBr(str) {
    return esc(str).replace(/\n/g, '<br>');
  }

  function formatDate(s) {
    if (!s) return '';
    return new Date(s + 'T00:00:00').toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  }

  /* ── Session ──────────────────────────────────────────────── */

  async function verifierSession() {
    try {
      const r = await fetch('/api/auth/status');
      return r.ok ? r.json() : { connecte: false };
    } catch { return { connecte: false }; }
  }

  /* ── CSS admin injecté ────────────────────────────────────── */

  function injecterCSS() {
    if (document.getElementById('admin-core-css')) return;
    const s = document.createElement('style');
    s.id = 'admin-core-css';
    s.textContent = `
      /* ── Barre admin ── */
      .admin-bar {
        position: fixed; top: 0; left: 0; right: 0; height: 48px;
        background: #1a1a2e; z-index: 1001;
        display: flex; align-items: center; justify-content: space-between;
        padding: 0 16px; gap: 8px;
        font-family: 'Inter', sans-serif; font-size: 0.83rem;
        color: rgba(255,255,255,0.88);
        box-shadow: 0 2px 12px rgba(0,0,0,0.35);
      }
      .admin-bar__left, .admin-bar__center, .admin-bar__right {
        display: flex; align-items: center; gap: 8px; flex-shrink: 0;
      }
      .admin-bar__center { flex: 1; justify-content: center; }
      .admin-bar__dot { width: 7px; height: 7px; border-radius: 50%; background: #4ade80; flex-shrink: 0; }
      .admin-bar__label { font-weight: 600; color: rgba(255,255,255,0.7); white-space: nowrap; }
      .admin-bar__badge {
        background: rgba(251,239,67,.18); border: 1px solid rgba(251,239,67,.35);
        color: #fbef43; padding: 2px 10px; border-radius: 100px;
        font-size: 0.76rem; white-space: nowrap; max-width: 200px;
        overflow: hidden; text-overflow: ellipsis;
      }
      .ab-btn {
        background: rgba(255,255,255,.12); border: 1px solid rgba(255,255,255,.2);
        color: rgba(255,255,255,.88); padding: 5px 12px; border-radius: 6px;
        font-size: 0.8rem; font-weight: 600; cursor: pointer;
        font-family: 'Inter', sans-serif; white-space: nowrap;
        transition: background .18s;
      }
      .ab-btn:hover { background: rgba(255,255,255,.22); }
      .ab-btn--accent { background: rgba(251,239,67,.85); color: #1a1a2e; border-color: transparent; font-weight: 700; }
      .ab-btn--accent:hover { background: #fbef43; }
      .ab-btn--danger:hover { background: rgba(248,113,113,.2); color: #fca5a5; border-color: rgba(248,113,113,.4); }

      /* ── Mode visiteur ── */
      body.mode-visiteur .admin-toolbar      { display: none !important; }
      body.mode-visiteur .editable           { cursor: default; pointer-events: none; }
      body.mode-visiteur .editable:hover     { outline: none; }
      body.mode-visiteur .photo-admin-overlay{ display: none !important; }
      body.mode-visiteur .photo-upload-wrap  { display: none !important; }
      body.mode-visiteur .post-card--brouillon { display: none !important; }
      body.mode-visiteur .footer-admin-link  { display: none !important; }

      /* ── Lien footer administration ── */
      .footer-admin-link a { color: rgba(255,255,255,.35) !important; font-size: .82rem; }
      .footer-admin-link a:hover { color: rgba(255,255,255,.6) !important; }

      /* ── Chargement ── */
      .projets-loading {
        text-align: center; padding: 64px 0;
        color: var(--text-muted, #6b7280); font-size: 1rem;
      }

      /* ── Toolbar par carte ── */
      .admin-toolbar {
        display: flex; align-items: center; justify-content: space-between;
        flex-wrap: wrap; gap: 8px;
        padding: 10px 20px; background: #faf8f0;
        border-bottom: 1px solid #ede8d0;
      }
      .admin-toolbar__left { display: flex; align-items: center; gap: 8px; }
      .admin-toolbar__right { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
      .admin-status { font-size: .82rem; font-weight: 600; }
      .admin-status--publie  { color: #166534; }
      .admin-status--brouillon { color: #b45309; }
      .save-msg {
        font-size: .8rem; font-weight: 600; padding: 3px 10px;
        border-radius: 6px; display: none;
      }
      .save-msg--ok  { color: #166534; background: #dcfce7; display: inline; }
      .save-msg--err { color: #991b1b; background: #fee2e2; display: inline; }
      .adm-btn {
        display: inline-flex; align-items: center; gap: 4px;
        padding: 6px 13px; border-radius: 6px; font-size: .8rem;
        font-weight: 600; font-family: 'Inter', sans-serif;
        cursor: pointer; border: 1px solid transparent; transition: all .18s;
      }
      .adm-btn--save    { background: #1c1c1e; color: #fbef43; }
      .adm-btn--save:hover { background: #2d2d30; }
      .adm-btn--publish { background: #dcfce7; color: #166534; border-color: #bbf7d0; }
      .adm-btn--publish:hover { background: #bbf7d0; }
      .adm-btn--draft   { background: #fef9c3; color: #854d0e; border-color: #fde68a; }
      .adm-btn--draft:hover { background: #fde68a; }
      .adm-btn--delete  { background: #fee2e2; color: #991b1b; border-color: #fecaca; }
      .adm-btn--delete:hover { background: #fecaca; }
      .adm-btn--move {
        background: rgba(0,0,0,.06); color: #555; border-color: rgba(0,0,0,.12);
        padding: 6px 9px; font-size: .85rem; line-height: 1;
      }
      .adm-btn--move:hover { background: rgba(0,0,0,.13); }
      .adm-btn--move:disabled { opacity: .3; cursor: default; }

      /* ── Champs éditables ── */
      .editable { cursor: text; border-radius: 4px; transition: outline .12s; }
      .editable:hover { outline: 2px dashed rgba(251,239,67,.7); outline-offset: 2px; }
      .editable.is-editing { outline: 2px solid #fbef43 !important; outline-offset: 2px; }
      .editable input, .editable textarea {
        width: 100%; background: #fffef0; border: none; border-radius: 4px;
        padding: 3px 6px; font-family: inherit; font-size: inherit;
        font-weight: inherit; color: inherit; line-height: inherit;
        outline: none; resize: vertical;
      }
      .editable input[type="date"] { font-size: .88rem; }
      .admin-placeholder { opacity: .45; border: 2px dashed rgba(0,0,0,.2) !important; }
    `;
    document.head.appendChild(s);
  }

  /* ── Barre d'administration ───────────────────────────────── */

  function injecterBarreAdmin(email, boutonsCentre) {
    const barre = document.createElement('div');
    barre.id        = 'admin-bar';
    barre.className = 'admin-bar';
    barre.innerHTML = `
      <div class="admin-bar__left">
        <span class="admin-bar__dot"></span>
        <span class="admin-bar__label">Mode administration</span>
        <span class="admin-bar__badge" title="${esc(email)}">${esc(email)}</span>
      </div>
      <div class="admin-bar__center">
        ${boutonsCentre || ''}
      </div>
      <div class="admin-bar__right">
        <button class="ab-btn" id="btn-toggle-visiteur" onclick="AdminCore.toggleModeVisiteur()">👁 Voir comme visiteur</button>
        <button class="ab-btn ab-btn--danger" onclick="AdminCore.seDeconnecter()">Se déconnecter</button>
      </div>`;
    document.body.prepend(barre);
    document.body.classList.add('admin-actif');

    // Décaler la navbar vers le bas
    const navbar = document.getElementById('navbar');
    if (navbar) navbar.style.top = '48px';

    // Ajuster le padding-top de la page (page-header)
    const pageHeader = document.querySelector('.page-header');
    if (pageHeader) {
      const computed = getComputedStyle(pageHeader).paddingTop;
      const base     = parseInt(computed) || 120;
      pageHeader.style.paddingTop = (base + 48) + 'px';
    }
  }

  /* ── Mode visiteur ────────────────────────────────────────── */

  function toggleModeVisiteur() {
    modeVisiteur = !modeVisiteur;
    document.body.classList.toggle('mode-visiteur', modeVisiteur);
    document.body.classList.toggle('admin-actif', !modeVisiteur);

    const btn = document.getElementById('btn-toggle-visiteur');
    if (btn) btn.textContent = modeVisiteur ? '← Repasser en mode admin' : '👁 Voir comme visiteur';

    _config.onToggleVisiteur?.(modeVisiteur);

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ── Déconnexion ──────────────────────────────────────────── */

  async function seDeconnecter() {
    await fetch('/api/auth/logout');
    document.getElementById('admin-bar')?.remove();
    document.body.classList.remove('admin-actif', 'mode-visiteur');
    const navbar = document.getElementById('navbar');
    if (navbar) navbar.style.top = '';
    const pageHeader = document.querySelector('.page-header');
    if (pageHeader) pageHeader.style.paddingTop = '';
    modeVisiteur = false;

    _config.onApresDeconnexion?.();

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ── Lien "Administration" dans le footer ─────────────────── */

  function gererFooterLink(connecte) {
    const footerContact = document.querySelector('.footer__contact-items');
    if (!footerContact) return;

    // Supprimer les liens existants pour éviter les doublons
    footerContact.querySelectorAll('.footer-admin-link').forEach(el => el.remove());

    if (!connecte) {
      const li = document.createElement('div');
      li.className = 'footer__contact-item footer-admin-link';
      li.innerHTML = `<span class="ico">🔐</span><span><a href="/admin/login" onclick="try{sessionStorage.setItem('adminRetour',window.location.pathname+window.location.search)}catch(e){}">Administration</a></span>`;
      footerContact.appendChild(li);
    }
  }

  /* ── Édition inline générique ─────────────────────────────── */

  function rendreEditable(el, config) {
    if (el.querySelector('input, textarea')) return;
    const origHTML = el.innerHTML;
    let inputEl;

    if (config.type === 'textarea') {
      inputEl = document.createElement('textarea');
      inputEl.rows = config.rows || 4;
    } else {
      inputEl = document.createElement('input');
      inputEl.type = config.type === 'date' ? 'date' : 'text';
    }

    inputEl.value = config.getValue(el);
    if (config.placeholder) inputEl.placeholder = config.placeholder;
    if (config.className)   inputEl.className   = config.className;

    el.innerHTML = '';
    el.classList.add('is-editing');
    el.appendChild(inputEl);
    inputEl.focus();
    if (inputEl.select) inputEl.select();

    if (config.onInput) {
      inputEl.addEventListener('input', () => config.onInput(inputEl.value));
    }
    inputEl.addEventListener('keydown', e => {
      if (e.key === 'Escape') { el.innerHTML = origHTML; el.classList.remove('is-editing'); }
      if (e.key === 'Enter' && config.type !== 'textarea') inputEl.blur();
    });
    inputEl.addEventListener('blur', () => {
      el.classList.remove('is-editing');
      config.setValue(el, inputEl.value);
    });
  }

  function activerEditables(conteneurEl, mapConfig) {
    conteneurEl.querySelectorAll('[data-field]').forEach(el => {
      const config = mapConfig[el.dataset.field];
      if (!config) return;
      el.classList.add('editable');
      el.addEventListener('click', e => {
        e.stopPropagation();
        rendreEditable(el, config);
      });
    });
  }

  /* ── Messages d'état ───────────────────────────────────────── */

  function afficherMsg(el, message, type, duree = 3000) {
    if (!el) return;
    el.textContent = message;
    el.className   = `save-msg save-msg--${type}`;
    setTimeout(() => { el.className = 'save-msg'; el.textContent = ''; }, duree);
  }

  /* ── Drag & drop générique ─────────────────────────────────── */

  function initDragDrop(container, options) {
    const { selector, dragOverClass = 'drag-over', onDrop } = options;
    let dragSrc = null;

    container.querySelectorAll(selector).forEach(el => {
      el.addEventListener('dragstart', e => {
        dragSrc = el;
        e.dataTransfer.effectAllowed = 'move';
        setTimeout(() => el.classList.add(dragOverClass), 0);
      });
      el.addEventListener('dragend', () => {
        dragSrc = null;
        container.querySelectorAll(selector).forEach(p => p.classList.remove(dragOverClass));
      });
      el.addEventListener('dragover', e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; });
      el.addEventListener('dragenter', () => { if (dragSrc !== el) el.classList.add(dragOverClass); });
      el.addEventListener('dragleave', () => el.classList.remove(dragOverClass));
      el.addEventListener('drop', e => {
        e.preventDefault();
        if (!dragSrc || dragSrc === el) return;
        el.classList.remove(dragOverClass);
        const all  = Array.from(container.querySelectorAll(selector));
        const iSrc = all.indexOf(dragSrc);
        const iDst = all.indexOf(el);
        if (iSrc < iDst) container.insertBefore(dragSrc, el.nextSibling);
        else             container.insertBefore(dragSrc, el);
        if (onDrop) {
          const newOrder = Array.from(container.querySelectorAll(selector))
            .map(e => Number(e.dataset.photoId || e.dataset.id));
          onDrop(newOrder);
        }
      });
    });
  }

  /* ── Init ─────────────────────────────────────────────────── */

  async function init(config) {
    _config = config || {};

    injecterCSS();

    const status = await verifierSession();

    gererFooterLink(status.connecte);

    if (status.connecte) {
      // Redirection post-login si une page d'origine a été mémorisée
      const retour = sessionStorage.getItem('adminRetour');
      if (retour && retour !== window.location.pathname) {
        sessionStorage.removeItem('adminRetour');
        window.location.href = retour;
        return;
      }
      sessionStorage.removeItem('adminRetour');
      injecterBarreAdmin(status.email, _config.boutonsCentre || '');
      await _config.onConnecte?.(status.email);
    } else {
      await _config.onNonConnecte?.();
    }
  }

  /* ── API publique ─────────────────────────────────────────── */
  return {
    init,
    verifierSession,
    injecterCSS,
    injecterBarreAdmin,
    toggleModeVisiteur,
    seDeconnecter,
    gererFooterLink,
    rendreEditable,
    activerEditables,
    afficherMsg,
    initDragDrop,
    get modeVisiteur() { return modeVisiteur; },
    utils: { esc, escBr, formatDate },
  };

})();
