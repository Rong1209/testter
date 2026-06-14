/* ============================================================
   CoffeMC — shared auth / API helper
   Include this BEFORE script.js on every page.
   ============================================================ */

// >>> EDIT THIS to your deployed Worker URL <<<
const API_BASE = "https://coffemc-api.chhinkimrong.workers.dev";

const AUTH_TOKEN_KEY = "coffemc_token";
const AUTH_USER_KEY = "coffemc_user";

function getToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}
function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_USER_KEY) || "null");
  } catch (e) {
    return null;
  }
}
function setSession(token, user) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}
function clearSession() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
}
function isLoggedIn() {
  return !!getToken();
}

/**
 * Wrapper around fetch() that adds the Authorization header
 * and the API_BASE prefix.
 */
async function apiFetch(path, options = {}) {
  const headers = Object.assign({}, options.headers || {});
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  return res;
}

/** Redirect to login if not authenticated, optionally remembering where to return. */
function requireLogin(returnTo) {
  if (!isLoggedIn()) {
    const target = returnTo || window.location.pathname;
    window.location.href = `login.html?next=${encodeURIComponent(target)}`;
    return false;
  }
  return true;
}

/** Redirect away if the current user isn't an admin. */
async function requireAdmin() {
  if (!requireLogin("admin.html")) return false;
  const user = getStoredUser();
  if (!user || !user.isAdmin) {
    window.location.href = "index.html";
    return false;
  }
  return true;
}

function logout() {
  clearSession();
  window.location.href = "index.html";
}

/**
 * Populate the shared nav with login/dashboard/logout links based on
 * auth state. Looks for elements with class "auth-nav-slot" (desktop
 * and mobile) and fills them in.
 */
function renderAuthNav() {
  const user = getStoredUser();
  document.querySelectorAll(".auth-nav-slot").forEach((slot) => {
    slot.innerHTML = "";

    if (user) {
      const dash = document.createElement("a");
      dash.href = "dashboard.html";
      dash.textContent = "Dashboard";
      slot.appendChild(dash);

      if (user.isAdmin) {
        const admin = document.createElement("a");
        admin.href = "admin.html";
        admin.textContent = "Admin";
        slot.appendChild(admin);
      }

      const out = document.createElement("a");
      out.href = "#";
      out.textContent = "Log out";
      out.addEventListener("click", (e) => {
        e.preventDefault();
        logout();
      });
      slot.appendChild(out);
    } else {
      const login = document.createElement("a");
      login.href = "login.html";
      login.textContent = "Log in";
      slot.appendChild(login);

      const register = document.createElement("a");
      register.href = "register.html";
      register.textContent = "Register";
      slot.appendChild(register);
    }
  });
}

document.addEventListener("DOMContentLoaded", renderAuthNav);
