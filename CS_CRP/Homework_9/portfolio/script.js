/* ─────────────────────────────────────────────────
   script.js — Portfolio Interactive Enhancements
   ───────────────────────────────────────────────── */

(function () {
  'use strict';

  // ═══════════════════════════════════════════════
  // 1. NAVBAR — scroll shrink + active link tracking
  // ═══════════════════════════════════════════════
  const navbar   = document.getElementById('navbar');
  const navLinks = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('section[id]');

  function onScroll() {
    if (window.scrollY > 20) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }

    let currentId = '';
    sections.forEach((sec) => {
      const top = sec.getBoundingClientRect().top;
      if (top <= 120) currentId = sec.id;
    });

    navLinks.forEach((link) => {
      const href = link.getAttribute('href').replace('#', '');
      link.classList.toggle('active', href === currentId);
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ═══════════════════════════════════════════════
  // 2. MOBILE MENU toggle
  // ═══════════════════════════════════════════════
  const navToggle  = document.getElementById('navToggle');
  const navLinksEl = document.getElementById('navLinks');

  if (navToggle && navLinksEl) {
    navToggle.addEventListener('click', () => {
      const isOpen = navLinksEl.classList.toggle('open');
      navToggle.classList.toggle('open', isOpen);
      navToggle.setAttribute('aria-expanded', isOpen);
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    navLinksEl.querySelectorAll('a:not(.nav-cta)').forEach((link) => {
      link.addEventListener('click', () => {
        navLinksEl.classList.remove('open');
        navToggle.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });

    document.addEventListener('click', (e) => {
      if (!navbar.contains(e.target) && navLinksEl.classList.contains('open')) {
        navLinksEl.classList.remove('open');
        navToggle.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      }
    });
  }

  // ═══════════════════════════════════════════════
  // 3. SMOOTH SCROLLING
  // ═══════════════════════════════════════════════
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      const target = document.querySelector(targetId);
      if (!target) return;

      e.preventDefault();
      const navH = navbar ? navbar.offsetHeight : 68;
      const top  = target.getBoundingClientRect().top + window.pageYOffset - navH;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });

  // ═══════════════════════════════════════════════
  // 4. CONTACT MODAL
  // ═══════════════════════════════════════════════
  const modalOverlay = document.getElementById('contactModal');
  const modalClose   = document.getElementById('modalClose');
  const navCta       = document.querySelector('.nav-cta');

  function openModal() {
    modalOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    // Focus the close button for accessibility
    setTimeout(() => modalClose && modalClose.focus(), 50);
  }

  function closeModal() {
    modalOverlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  // Open on "Get in Touch" nav button
  if (navCta && modalOverlay) {
    navCta.addEventListener('click', (e) => {
      e.preventDefault();
      // Close mobile menu first if open
      if (navLinksEl && navLinksEl.classList.contains('open')) {
        navLinksEl.classList.remove('open');
        navToggle && navToggle.classList.remove('open');
        document.body.style.overflow = '';
        // Brief delay so menu closes before modal opens
        setTimeout(openModal, 180);
      } else {
        openModal();
      }
    });
  }

  // Close on × button
  if (modalClose) {
    modalClose.addEventListener('click', closeModal);
  }

  // Close on overlay click (outside the box)
  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeModal();
    });
  }

  // Close on Esc key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalOverlay && modalOverlay.classList.contains('open')) {
      closeModal();
    }
  });

  // ═══════════════════════════════════════════════
  // 5. COPY EMAIL BUTTON
  // ═══════════════════════════════════════════════
  const copyBtn = document.getElementById('copyEmailBtn');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const email = 'hoiqbal1020@gmail.com';

      navigator.clipboard.writeText(email).then(() => {
        const label = copyBtn.querySelector('.copy-label');
        copyBtn.classList.add('copied');
        label.textContent = 'Copied!';

        setTimeout(() => {
          copyBtn.classList.remove('copied');
          label.textContent = 'Copy';
        }, 2200);
      }).catch(() => {
        // Fallback for older browsers
        const ta = document.createElement('textarea');
        ta.value = email;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);

        const label = copyBtn.querySelector('.copy-label');
        copyBtn.classList.add('copied');
        label.textContent = 'Copied!';
        setTimeout(() => {
          copyBtn.classList.remove('copied');
          label.textContent = 'Copy';
        }, 2200);
      });
    });
  }

  // ═══════════════════════════════════════════════
  // 6. SCROLL REVEAL (Intersection Observer)
  // ═══════════════════════════════════════════════
  const revealEls = document.querySelectorAll(
    '.about-grid, .about-image-wrapper, .about-info, .project-card, .section-header'
  );

  revealEls.forEach((el) => el.classList.add('reveal'));

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );

  revealEls.forEach((el) => observer.observe(el));

  // ═══════════════════════════════════════════════
  // 7. PROJECT CARD staggered reveal
  // ═══════════════════════════════════════════════
  const projectCards = document.querySelectorAll('.project-card');
  projectCards.forEach((card, i) => {
    card.style.transitionDelay = `${i * 0.1}s`;
  });

  // ═══════════════════════════════════════════════
  // 8. CURSOR — white circle / glow background REMOVED
  // ═══════════════════════════════════════════════
  // (Cursor glow element intentionally removed per design update.)

  // ═══════════════════════════════════════════════
  // 9. DYNAMIC YEAR in footer
  // ═══════════════════════════════════════════════
  const footerCopy = document.querySelector('.footer-copy');
  if (footerCopy) {
    footerCopy.textContent = `© ${new Date().getFullYear()} Hamza Owais. All rights reserved.`;
  }

  // ═══════════════════════════════════════════════
  // 10. PAGE LOAD entrance guard
  // ═══════════════════════════════════════════════
  window.addEventListener('load', () => {
    document.body.classList.add('loaded');
  });

})();

