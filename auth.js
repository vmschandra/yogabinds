/* ============================================
   YogaBinds — UI Logic
   ============================================ */

// ---- Mobile Navigation Toggle ----
function toggleNav() {
  var navLinks = document.getElementById('navLinks');
  if (navLinks) {
    navLinks.classList.toggle('active');
  }
}

// ---- Login / Signup Modal Controls ----
function openLoginModal(e) {
  if (e) e.preventDefault();
  document.getElementById('loginModal').classList.add('active');
}

function closeLoginModal() {
  document.getElementById('loginModal').classList.remove('active');
}

function openSignupModal() {
  document.getElementById('signupModal').classList.add('active');
}

function closeSignupModal() {
  document.getElementById('signupModal').classList.remove('active');
}

function switchToSignup(e) {
  e.preventDefault();
  closeLoginModal();
  openSignupModal();
}

function switchToLogin(e) {
  e.preventDefault();
  closeSignupModal();
  openLoginModal();
}
