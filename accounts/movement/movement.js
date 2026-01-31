/*
  movement.js
  Controller for displaying account movements
*/

import Store from '../../js/store.js';
import { Utils } from '../../js/utils.js';
import '../../js/components/Navbar.js';

function getQueryParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

function renderMovements(movimientos) {
  const container = document.getElementById("listaMovimientos");
  container.innerHTML = "";

  if (!movimientos || movimientos.length === 0) {
    container.innerHTML = `
            <div class="text-center py-5 text-muted">
                <div class="fs-1 mb-2">🍃</div>
                No hay movimientos registrados en esta cuenta.
            </div>
        `;
    return;
  }

  // Sort by date desc
  movimientos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  movimientos.forEach(m => {
    const isIngreso = m.tipo === 'Ingreso' || m.tipo === 'Saldo inicial';
    const isEgreso = m.tipo === 'Egreso';

    const colorClass = isIngreso ? 'text-success' : (isEgreso ? 'text-danger' : 'text-dark');
    const icon = isIngreso ? 'in' : (isEgreso ? 'out' : 'circle');
    const sign = isIngreso ? '+' : (isEgreso ? '-' : '');

    const item = document.createElement("div");
    item.className = "d-flex justify-content-between align-items-center p-3 border-bottom";

    item.innerHTML = `
            <div class="d-flex align-items-center gap-3">
                <div class="rounded-circle bg-light d-flex align-items-center justify-content-center" style="width: 40px; height: 40px;">
                    <span class="${colorClass} fs-5">
                       ${isIngreso ? '↓' : '↑'}
                    </span>
                </div>
                <div>
                    <div class="fw-bold text-dark">${m.descripcion || m.tipo}</div>
                    <div class="small text-muted">${Utils.formatDate(m.fecha)}</div>
                </div>
            </div>
            <div class="fw-bold ${colorClass}">
                ${sign}${Utils.formatCurrency(m.valor)}
            </div>
        `;
    container.appendChild(item);
  });
}

function init() {
  const accountId = getQueryParam("cuenta");

  if (!accountId) {
    alert("Cuenta no especificada");
    window.location.href = "../Balance/balance.html";
    return;
  }

  const accounts = Store.getAccounts();
  const account = accounts.find(c => String(c.id) === String(accountId));

  if (!account) {
    alert("Cuenta no encontrada");
    window.location.href = "../Balance/balance.html";
    return;
  }

  // Update Header
  document.getElementById("nombreCuenta").textContent = account.nombre;
  document.getElementById("tipoCuenta").textContent = `${account.tipo} - ${account.moneda}`;
  document.getElementById("saldoCuenta").textContent = Utils.formatCurrency(account.saldo);

  // Render Movements
  renderMovements(account.movimientos);

  // Filter Logic
  document.getElementById("filtro").addEventListener("input", (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = (account.movimientos || []).filter(m =>
      (m.descripcion || "").toLowerCase().includes(term) ||
      (m.tipo || "").toLowerCase().includes(term)
    );
    renderMovements(filtered);
  });
}

document.addEventListener("DOMContentLoaded", init);
