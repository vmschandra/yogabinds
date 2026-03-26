/* ============================================
   YogaBinds — Authentication & UI Logic
   ============================================ */

// ---- Mobile Navigation Toggle ----
function toggleNav() {
  var navLinks = document.getElementById('navLinks');
  if (navLinks) {
    navLinks.classList.toggle('active');
  }
}

// ---- Modal Management ----
function openModal(type) {
  closeModals();
  if (type === 'login') {
    var modal = document.getElementById('loginModal');
    if (modal) {
      modal.classList.add('active');
    }
  } else if (type === 'signup') {
    var modal = document.getElementById('signupModal');
    if (modal) {
      modal.classList.add('active');
    }
  }
  document.body.style.overflow = 'hidden';
}

function closeModals() {
  var overlays = document.querySelectorAll('.modal-overlay');
  overlays.forEach(function (overlay) {
    overlay.classList.remove('active');
  });
  document.body.style.overflow = '';
}

function switchModal(type) {
  closeModals();
  setTimeout(function () {
    openModal(type);
  }, 150);
}

// Close modal on overlay click (not on modal content)
document.addEventListener('click', function (e) {
  if (e.target.classList.contains('modal-overlay')) {
    closeModals();
  }
});

// Close modal on Escape key
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') {
    closeModals();
  }
});

// ---- Simple localStorage Auth ----
// NOTE: This is a front-end demo only. In production, use a real backend.

function getUsers() {
  try {
    return JSON.parse(localStorage.getItem('yogabinds_users') || '[]');
  } catch (e) {
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem('yogabinds_users', JSON.stringify(users));
}

function setCurrentUser(user) {
  localStorage.setItem('yogabinds_user', JSON.stringify(user));
}

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem('yogabinds_user') || 'null');
  } catch (e) {
    return null;
  }
}

function clearCurrentUser() {
  localStorage.removeItem('yogabinds_user');
}

// ---- Signup Handler ----
function handleSignup(e) {
  e.preventDefault();

  var name = document.getElementById('signupName').value.trim();
  var email = document.getElementById('signupEmail').value.trim().toLowerCase();
  var password = document.getElementById('signupPassword').value;

  if (!name || !email || !password) {
    alert('Please fill in all fields.');
    return;
  }

  if (password.length < 6) {
    alert('Password must be at least 6 characters long.');
    return;
  }

  var users = getUsers();

  // Check if email already exists
  var exists = users.some(function (u) {
    return u.email === email;
  });

  if (exists) {
    alert('An account with this email already exists. Please log in.');
    switchModal('login');
    return;
  }

  // Save new user
  var newUser = { name: name, email: email, password: password };
  users.push(newUser);
  saveUsers(users);

  // Set as current user
  setCurrentUser({ name: name, email: email });

  // Show success and redirect
  var successEl = document.getElementById('signupSuccess');
  if (successEl) {
    successEl.classList.add('show');
  }

  setTimeout(function () {
    closeModals();
    window.location.href = 'landing.html';
  }, 1200);
}

// ---- Login Handler ----
function handleLogin(e) {
  e.preventDefault();

  var email = document.getElementById('loginEmail').value.trim().toLowerCase();
  var password = document.getElementById('loginPassword').value;

  if (!email || !password) {
    alert('Please fill in all fields.');
    return;
  }

  var users = getUsers();

  var user = users.find(function (u) {
    return u.email === email && u.password === password;
  });

  if (!user) {
    alert('Invalid email or password. Please try again or create an account.');
    return;
  }

  // Set as current user
  setCurrentUser({ name: user.name, email: user.email });

  // Show success and redirect
  var successEl = document.getElementById('loginSuccess');
  if (successEl) {
    successEl.classList.add('show');
  }

  setTimeout(function () {
    closeModals();
    window.location.href = 'landing.html';
  }, 1200);
}

// ---- Logout Handler ----
function handleLogout() {
  clearCurrentUser();
  window.location.href = 'index.html';
}
