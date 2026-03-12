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
      li.innerHTML = `<span class="ico">🔐</span><span><a href="/admin/login">Administration</a></span>`;
      footerContact.appendChild(li);
    }
  }

  /* ── Init ─────────────────────────────────────────────────── */

  async function init(config) {
    _config = config || {};

    injecterCSS();

    const status = await verifierSession();

    gererFooterLink(status.connecte);

    if (status.connecte) {
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
    get modeVisiteur() { return modeVisiteur; },
    utils: { esc, escBr, formatDate },
  };

})();
