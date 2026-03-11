/* ============================================================
   CORSE PRO SERVICES — script.js
   Gestion : overlay formulaire, lightbox, navigation, avis
   ============================================================ */

/* =========================================================
   PANEL AVIS GOOGLE
   ========================================================= */

const reviewsPanel    = document.getElementById('reviewsPanel');
const reviewsBackdrop = document.getElementById('reviewsBackdrop');

function openReviews() {
  if (!reviewsPanel) return;
  reviewsPanel.classList.add('open');
  reviewsBackdrop.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeReviews() {
  if (!reviewsPanel) return;
  reviewsPanel.classList.remove('open');
  reviewsBackdrop.classList.remove('open');
  document.body.style.overflow = '';
}

/* =========================================================
   OVERLAY — Formulaire de devis
   ========================================================= */

const overlayBackdrop = document.getElementById('overlayBackdrop');
const overlayForm     = document.getElementById('quoteForm');
const formBody        = document.getElementById('formBody');
const overlaySuccess  = document.getElementById('overlaySuccess');

function openOverlay(prefilledMessage) {
  if (!overlayBackdrop) return;
  resetOverlay();  // toujours repartir d'un formulaire vide
  // Pré-remplir le champ message si une prestation est précisée
  const msgInput = document.getElementById('fieldMessage');
  if (msgInput) {
    const defaultPlaceholder = 'Ex : Nettoyage vapeur de ma toiture, environ 120 m², maison à Ajaccio…';
    msgInput.placeholder = prefilledMessage || defaultPlaceholder;
  }
  overlayBackdrop.classList.add('open');
  document.body.style.overflow = 'hidden';
  // Focus sur le premier champ
  setTimeout(() => {
    const first = overlayBackdrop.querySelector('.form-control');
    if (first) first.focus();
  }, 300);
}

function closeOverlay() {
  if (!overlayBackdrop) return;
  overlayBackdrop.classList.remove('open');
  document.body.style.overflow = '';
}

function resetOverlay() {
  if (overlayForm)    overlayForm.reset();
  if (formBody)       formBody.classList.remove('hidden');
  if (overlaySuccess) overlaySuccess.classList.remove('show');
  document.querySelectorAll('.form-control').forEach(el => el.classList.remove('is-error'));
  document.querySelectorAll('.form-error-msg').forEach(el => el.classList.remove('show'));
  const msgInput = document.getElementById('fieldMessage');
  if (msgInput) msgInput.placeholder = 'Ex : Nettoyage vapeur de ma toiture, environ 120 m², maison à Ajaccio…';
}

// Fermer sur clic de l'arrière-plan
if (overlayBackdrop) {
  overlayBackdrop.addEventListener('click', function(e) {
    if (e.target === overlayBackdrop) closeOverlay();
  });
}

// Touche Echap
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    if (lightbox && lightbox.classList.contains('open')) {
      closeLightbox();
    } else if (overlayBackdrop && overlayBackdrop.classList.contains('open')) {
      closeOverlay();
    } else if (reviewsPanel && reviewsPanel.classList.contains('open')) {
      closeReviews();
    }
  }
});

/* =========================================================
   VALIDATION & SOUMISSION DU FORMULAIRE
   ========================================================= */

function showFieldError(input, errorEl, msg) {
  input.classList.add('is-error');
  errorEl.textContent = '⚠ ' + msg;
  errorEl.classList.add('show');
}

function clearFieldError(input, errorEl) {
  input.classList.remove('is-error');
  errorEl.classList.remove('show');
}

if (overlayForm) {
  overlayForm.addEventListener('submit', function(e) {
    e.preventDefault();
    let valid = true;

    // --- Nom ---
    const nameInput = document.getElementById('fieldName');
    const nameError = document.getElementById('nameError');
    if (!nameInput.value.trim()) {
      showFieldError(nameInput, nameError, 'Veuillez saisir votre nom.');
      valid = false;
    } else {
      clearFieldError(nameInput, nameError);
    }

    // --- Téléphone (format français) ---
    const phoneInput = document.getElementById('fieldPhone');
    const phoneError = document.getElementById('phoneError');
    const phoneRaw   = phoneInput.value.trim().replace(/[\s.\-()]/g, '');
    // Accepte : 0XXXXXXXXX · +33XXXXXXXXX · 0033XXXXXXXXX
    const phoneOk = /^(0[1-9]\d{8}|(\+33|0033)[1-9]\d{8})$/.test(phoneRaw);
    if (!phoneRaw) {
      showFieldError(phoneInput, phoneError, 'Veuillez saisir votre numéro de téléphone.');
      valid = false;
    } else if (!phoneOk) {
      showFieldError(phoneInput, phoneError, 'Format invalide. Ex : 06 12 34 56 78 ou +33 6 12 34 56 78');
      valid = false;
    } else {
      clearFieldError(phoneInput, phoneError);
    }

    // --- Message ---
    const msgInput = document.getElementById('fieldMessage');
    const msgError = document.getElementById('messageError');
    if (!msgInput.value.trim()) {
      showFieldError(msgInput, msgError, 'Veuillez décrire votre besoin.');
      valid = false;
    } else {
      clearFieldError(msgInput, msgError);
    }

    if (!valid) return;

    // Simulation de l'envoi
    const submitBtn = overlayForm.querySelector('.form-submit');
    submitBtn.textContent = 'Envoi en cours…';
    submitBtn.disabled = true;

    setTimeout(() => {
      formBody.classList.add('hidden');
      overlaySuccess.classList.add('show');
      submitBtn.textContent = 'Envoyer ma demande';
      submitBtn.disabled = false;
    }, 1000);
  });

  // Effacer l'erreur en temps réel dès que l'utilisateur retape
  overlayForm.querySelectorAll('.form-control').forEach(input => {
    input.addEventListener('input', function() {
      this.classList.remove('is-error');
      // Trouver l'élément d'erreur correspondant
      const next = this.parentElement.querySelector('.form-error-msg');
      if (next) next.classList.remove('show');
    });
  });
}

/* =========================================================
   NAVIGATION
   ========================================================= */

const navbar    = document.getElementById('navbar');
const hamburger = document.getElementById('hamburger');
const navMenu   = document.getElementById('navMenu');

// Menu hamburger (mobile)
if (hamburger && navMenu) {
  hamburger.addEventListener('click', function() {
    const open = navMenu.classList.toggle('open');
    hamburger.classList.toggle('active', open);
    hamburger.setAttribute('aria-expanded', open);
  });

  // Fermer le menu en cliquant sur un lien
  navMenu.querySelectorAll('.navbar__link').forEach(link => {
    link.addEventListener('click', () => {
      navMenu.classList.remove('open');
      hamburger.classList.remove('active');
    });
  });
}

// Classe "scrolled" pour ombre renforcée
if (navbar) {
  window.addEventListener('scroll', function() {
    navbar.classList.toggle('scrolled', window.scrollY > 50);
  }, { passive: true });
}

// Mettre en surbrillance le lien actif
(function highlightActiveLink() {
  const page = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.navbar__link').forEach(link => {
    const href = link.getAttribute('href');
    if (href === page || (page === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });
})();

/* =========================================================
   LIGHTBOX
   ========================================================= */

const lightbox        = document.getElementById('lightbox');
const lightboxImg     = document.getElementById('lightboxImg');
const lightboxCounter = document.getElementById('lightboxCounter');

let lbImages = [];   // { src, alt }
let lbIndex  = 0;

function openLightbox(projectEl, startIndex) {
  const imgs = Array.from(projectEl.querySelectorAll('.project-photo img'));
  lbImages = imgs.map(img => ({ src: img.src, alt: img.alt || '' }));
  lbIndex  = startIndex;
  renderLightboxImage();
  lightbox.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  lightbox.classList.remove('open');
  document.body.style.overflow = '';
}

function lightboxPrev() {
  lbIndex = (lbIndex - 1 + lbImages.length) % lbImages.length;
  renderLightboxImage();
}

function lightboxNext() {
  lbIndex = (lbIndex + 1) % lbImages.length;
  renderLightboxImage();
}

function renderLightboxImage() {
  if (!lightboxImg || lbImages.length === 0) return;
  lightboxImg.style.opacity = '0';
  setTimeout(() => {
    lightboxImg.src = lbImages[lbIndex].src;
    lightboxImg.alt = lbImages[lbIndex].alt;
    lightboxImg.style.opacity = '1';
  }, 100);
  if (lightboxCounter) {
    lightboxCounter.textContent = (lbIndex + 1) + ' / ' + lbImages.length;
  }
}

// Fermer lightbox sur clic de fond
if (lightbox) {
  lightbox.addEventListener('click', function(e) {
    if (e.target === lightbox) closeLightbox();
  });
}

// Navigation clavier déjà gérée via keydown (Echap, flèches)
document.addEventListener('keydown', function(e) {
  if (!lightbox || !lightbox.classList.contains('open')) return;
  if (e.key === 'ArrowLeft')  lightboxPrev();
  if (e.key === 'ArrowRight') lightboxNext();
});

// Attacher les clics sur les photos au chargement du DOM
document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('.project-item').forEach(project => {
    project.querySelectorAll('.project-photo').forEach((photo, i) => {
      photo.addEventListener('click', () => openLightbox(project, i));
    });
  });
});

/* =========================================================
   ANIMATIONS AU SCROLL (Intersection Observer léger)
   ========================================================= */

document.addEventListener('DOMContentLoaded', function() {
  const els = document.querySelectorAll(
    '.service-card, .project-item, .article-card, .value-card'
  );

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.style.opacity   = '1';
          e.target.style.transform = 'translateY(0)';
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12 });

    els.forEach(el => {
      el.style.opacity   = '0';
      el.style.transform = 'translateY(28px)';
      el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
      io.observe(el);
    });
  }
});
