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
