/*
  balance.js
  Controller for Accounts Balance
*/

import Store from '../../js/store.js';
import { Utils } from '../../js/utils.js';
import '../../js/components/Navbar.js';

function calculateTotal(cuentas) {
  return cuentas.reduce((acc, c) => acc + (Number(c.saldo) || 0), 0);
}

function createAccountCard(cuenta) {
  const card = document.createElement("div");
  // Simple clean card inside accordion
  card.className = "card-premium mb-3 border-0 shadow-sm";

  card.innerHTML = `
    <div class="card-body d-flex justify-content-between align-items-center flex-wrap gap-2">
      <div>
        <h6 class="mb-1 fw-bold text-dark">${cuenta.nombre}</h6>
        <span class="badge bg-light text-secondary border">${cuenta.tipo}</span>
        <span class="badge bg-light text-secondary border">${cuenta.moneda}</span>
      </div>

      <div class="text-end">
        <h5 class="fw-bold text-primary mb-1">${Utils.formatCurrency(cuenta.saldo)}</h5>

        <button class="btn btn-sm btn-outline-primary rounded-pill btn-ver-movimientos px-3"
          data-id="${cuenta.id}">
          Ver Movimientos
        </button>
      </div>
    </div>
  `;

  return card;
}

function renderList(cuentas, containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";

  if (cuentas.length === 0) {
    container.innerHTML = `
        <div class="text-center py-3 text-muted">
            <small>No hay cuentas en esta categoría.</small>
        </div>
    `;
    return;
  }

  cuentas.forEach((cuenta) => {
    container.appendChild(createAccountCard(cuenta));
  });
}

function updateBalance() {
  const accounts = Store.getAccounts();

  const solidarias = accounts.filter(c => c.categoria === "solidaria");
  const bancarias = accounts.filter(c => c.categoria === "bancaria");
  const inversiones = accounts.filter(c => c.categoria === "inversion");
  const efectivos = accounts.filter(c => c.categoria === "efectivo");

  // Render Lists
  renderList(solidarias, "listaSolidaria");
  renderList(bancarias, "listaBancaria");
  renderList(inversiones, "listaInversion");
  renderList(efectivos, "listaEfectivo");

  // Totals
  const totalSolidaria = calculateTotal(solidarias);
  const totalBancaria = calculateTotal(bancarias);
  const totalInversion = calculateTotal(inversiones);
  const totalEfectivo = calculateTotal(efectivos);

  document.getElementById("totalSolidaria").textContent = Utils.formatCurrency(totalSolidaria);
  document.getElementById("totalBancaria").textContent = Utils.formatCurrency(totalBancaria);
  document.getElementById("totalInversion").textContent = Utils.formatCurrency(totalInversion);
  document.getElementById("totalEfectivo").textContent = Utils.formatCurrency(totalEfectivo);

  const totalGeneral = totalSolidaria + totalBancaria + totalInversion + totalEfectivo;
  document.getElementById("totalGeneral").textContent = Utils.formatCurrency(totalGeneral);
}

// Navigation to Movements
document.addEventListener("click", function (e) {
  if (e.target.classList.contains("btn-ver-movimientos")) {
    const accountId = e.target.getAttribute("data-id");
    // Redirect to specific movement page
    window.location.href = `../movement/movement.html?cuenta=${accountId}`;
  }
});

// Init
document.addEventListener("DOMContentLoaded", updateBalance);

