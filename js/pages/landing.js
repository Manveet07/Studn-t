/* ============================================================
   landing.js — Landing Page Controller
   Initializes the shared sphere background + wires CTAs.
   Handles the login/signup choice popup and Netflix-style
   bubble transition.
   ============================================================ */

import { initSphereBackground } from '../sphere-bg.js';

// ── CTA Navigation Wiring ──
function initCTAs() {
  const getStartedBtn = document.getElementById('landing-get-started');
  const popup = document.getElementById('choice-popup');
  const backdrop = document.getElementById('choice-backdrop');
  const closeBtn = document.getElementById('choice-close');
  const loginBtn = document.getElementById('choice-login');
  const signupBtn = document.getElementById('choice-signup');

  function openPopup() {
    popup.style.display = 'flex';
    // Re-trigger animations
    const card = popup.querySelector('.choice-popup__card');
    const bd = popup.querySelector('.choice-popup__backdrop');
    card.style.animation = 'none';
    bd.style.animation = 'none';
    void card.offsetWidth;
    card.style.animation = '';
    bd.style.animation = '';
  }

  function closePopup() {
    popup.style.display = 'none';
  }

  // Bubble transition: spawns an orb that zooms to fill the screen
  function bubbleTransition(targetUrl) {
    const overlay = document.getElementById('bubble-transition');
    overlay.style.display = 'flex';
    // Remove old orb, create fresh one for animation replay
    const orb = document.getElementById('transition-orb');
    orb.style.animation = 'none';
    void orb.offsetWidth;
    orb.style.animation = '';

    // After the orb covers the screen, navigate
    setTimeout(() => {
      window.location.href = targetUrl;
    }, 650);
  }

  if (getStartedBtn) {
    getStartedBtn.addEventListener('click', openPopup);
  }

  if (backdrop) backdrop.addEventListener('click', closePopup);
  if (closeBtn) closeBtn.addEventListener('click', closePopup);

  if (loginBtn) {
    loginBtn.addEventListener('click', () => {
      closePopup();
      bubbleTransition('login.html');
    });
  }

  if (signupBtn) {
    signupBtn.addEventListener('click', () => {
      closePopup();
      bubbleTransition('signup.html');
    });
  }
}

// ── Init ──
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initSphereBackground();
    initCTAs();
  });
} else {
  initSphereBackground();
  initCTAs();
}
