/*
  Navbar.js
  Web Component for navigation.
  Logic:
  - On Index (Dashboard): Hidden (User prefers icon navigation).
  - On Internal Pages: Shows a "Back to Dashboard" button.
*/

class NavBar extends HTMLElement {
  connectedCallback() {
    const currentPath = window.location.pathname;

    // Check if we are on the index page
    // Local dev paths might vary (e.g. /index.html or /), so check for "index.html" or root "/"
    // Also ensure we don't catch internal pages inadvertently
    const isIndex = currentPath.endsWith("index.html") || currentPath.endsWith("/") || currentPath.endsWith("finanzasapp/");

    // Determine relative path to root for the link
    // If we are deep (e.g. accounts/Balance/balance.html), we need ../../
    // If we are shallow (e.g. income/fixed-income.html), we need ../

    let backLink = "";
    if (currentPath.includes("/accounts/Balance/") ||
      currentPath.includes("/accounts/Create/") ||
      currentPath.includes("/accounts/movement/")) {
      backLink = "../../index.html";
    } else if (currentPath.includes("/income/") || currentPath.includes("/expenses/") ||
      currentPath.includes("/variableMovements/") || currentPath.includes("/accountsPayable/") ||
      currentPath.includes("/accountsReceivable/")) {
      backLink = "../index.html";
    } else {
      backLink = "./index.html";
    }

    if (isIndex) {
      // User requested NO top menu on index.
      this.innerHTML = "";
      return;
    }

    // Render Back Button Navbar for internal pages
    this.innerHTML = `
      <nav class="navbar navbar-dark px-3 shadow-sm mb-4" style="background-color: var(--color-primary, #0d5123); border-radius: 0 0 1rem 1rem;">
          <div class="container-fluid">
            <a class="btn btn-outline-light btn-sm d-flex align-items-center gap-2" href="${backLink}">
              <span class="fs-5">←</span>
              <span class="fw-bold">Volver al Inicio</span>
            </a>
            
            <span class="navbar-brand mb-0 h1 fs-6 opacity-75">
              FinanzasApp
            </span>
          </div>
      </nav>
      `;
  }
}

// Register Component
customElements.define('app-navbar', NavBar);

// Auto-inject
document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("navbar-container");
  if (container) {
    container.innerHTML = "<app-navbar></app-navbar>";
  }
});
