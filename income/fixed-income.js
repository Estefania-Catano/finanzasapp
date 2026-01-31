/*
  fixed-income.js
  Controller for Fixed Income
*/

import Store from '../js/store.js';
import { Utils } from '../js/utils.js';
import '../js/components/Navbar.js';

let modalRecibirInstance;
let selectedIncome = null;

// --- Helper Logic ---

function getNextIncomeDate(income) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const year = today.getFullYear();
  const monthIndex = today.getMonth();

  // Helper to get date for specific month
  const getDateForMonth = (y, m) => {
    const lastDay = new Date(y, m + 1, 0).getDate();
    const day = Math.min(Number(income.diaIngreso), lastDay);
    return new Date(y, m, day);
  };

  let date = getDateForMonth(year, monthIndex);

  // If date already passed, move to next month
  if (date < today) {
    date = getDateForMonth(year, monthIndex + 1);
  }

  date.setHours(0, 0, 0, 0);
  return date;
}

function isReceivedForMonth(income, monthID) {
  return (income.historialRecibidos || []).some(p => p.mes === monthID);
}

// --- Data Operations ---

function saveIncome(newIncome) {
  const incomes = Store.getFixedIncome();
  incomes.push(newIncome);
  Store.saveData("ingresosFijos", incomes);
  // Force UI Update
  renderList();
  renderAlerts();
}

function deleteIncome(id) {
  let incomes = Store.getFixedIncome();
  incomes = incomes.filter(i => String(i.id) !== String(id));
  Store.saveData("ingresosFijos", incomes);
  renderList();
  renderAlerts();
}

function registerPayment(accountId, incomeName, date, amount) {
  const accounts = Store.getAccounts();
  const account = accounts.find(c => String(c.id) === String(accountId));

  if (!account) {
    alert("Cuenta no encontrada");
    return false;
  }

  // Add transaction to account
  account.movimientos = account.movimientos || [];
  account.movimientos.push({
    fecha: date,
    tipo: "Ingreso",
    descripcion: `Ingreso Fijo: ${incomeName}`,
    valor: Number(amount)
  });

  // Update Balance
  account.saldo = Number(account.saldo || 0) + Number(amount || 0);

  Store.saveData("cuentas", accounts);
  return true;
}

// --- UI Rendering ---

// --- UI Rendering ---

function renderList() {
  const container = document.getElementById("listaIngresos");
  const incomes = Store.getFixedIncome();
  const currentMonth = Utils.getCurrentMonthID();

  container.innerHTML = "";

  if (incomes.length === 0) {
    container.innerHTML = `
              <div class="text-center p-4 text-muted">
                  <small>No hay ingresos fijos registrados.</small>
              </div>
          `;
    return;
  }

  incomes.sort((a, b) => a.diaIngreso - b.diaIngreso);

  incomes.forEach(inc => {
    const received = isReceivedForMonth(inc, currentMonth);

    const card = document.createElement("div");
    card.className = "p-3 bg-light rounded shadow-sm border-0 d-flex justify-content-between align-items-center flex-wrap gap-3";

    card.innerHTML = `
              <div>
                  <div class="fw-bold text-dark">${inc.nombre}</div>
                  <div class="small text-muted">
                      Día ${inc.diaIngreso} • ${inc.tipoValor === 'fijo' ? 'Fijo' : 'Variable'}
                  </div>
              </div>
              
              <div class="text-end">
                  <div class="fw-bold text-success mb-2">
                      ${inc.tipoValor === 'fijo' ? Utils.formatCurrency(inc.valor) : 'Variable'}
                  </div>
                  
                  <div class="d-flex gap-2 justify-content-end">
                       ${received
        ? `<span class="badge bg-success-soft text-success border border-success">Recibido</span>`
        : `<button class="btn btn-sm btn-success rounded-pill btn-recibir shadow-sm" data-id="${inc.id}">Recibir</button>`
      }
                       <button class="btn btn-sm btn-outline-info border-0 btn-historial" data-id="${inc.id}" title="Ver Historial">📜</button>
                       <button class="btn btn-sm btn-outline-danger border-0 btn-eliminar" data-id="${inc.id}">🗑️</button>
                  </div>
              </div>
          `;

    container.appendChild(card);
  });
}

function renderAlerts() {
  const container = document.getElementById("alertas");
  const incomes = Store.getFixedIncome();

  if (!container) return;
  container.innerHTML = "";

  if (incomes.length === 0) {
    container.innerHTML = `<div class="text-muted small">No hay alertas.</div>`;
    return;
  }

  let alerts = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();

  incomes.forEach(inc => {
    // Check range: Current Month (0) and Next Month (+1). 
    // Maybe also -1 just in case they forgot previous month (like Expenses)
    for (let offset = -1; offset <= 1; offset++) {
      const checkDate = new Date(currentYear, currentMonth + offset, 1);
      const checkYear = checkDate.getFullYear();
      const checkMonth = checkDate.getMonth();

      // Calculate Target Date
      const lastDayOfMonth = new Date(checkYear, checkMonth + 1, 0).getDate();
      const targetDay = Math.min(Number(inc.diaIngreso), lastDayOfMonth);
      const targetDate = new Date(checkYear, checkMonth, targetDay);
      targetDate.setHours(0, 0, 0, 0);

      // Check Start Date
      if (inc.creationDate) {
        const [cYear, cMonth, cDay] = inc.creationDate.split('-').map(Number);
        const creation = new Date(cYear, cMonth - 1, cDay);
        creation.setHours(0, 0, 0, 0);
        if (targetDate < creation) continue;
      }

      // Check if already received
      const monthID = `${checkYear}-${String(checkMonth + 1).padStart(2, '0')}`;
      if (isReceivedForMonth(inc, monthID)) continue;

      // Calculate Days
      const daysDiff = Utils.getDaysDifference(targetDate);

      // Filter:
      // 1. If overdue (days < 0), show.
      // 2. If upcoming (days >= 0), show if within 35-40 days? 
      //    We want to show next month's alert if current is paid.
      //    But avoid showing "Next Jan 2026" if we are in "Jan 2025".
      if (daysDiff > 45) continue;

      alerts.push({
        income: inc,
        date: targetDate,
        days: daysDiff,
        monthID: monthID,
        monthLabel: targetDate.toLocaleString('es-CO', { month: 'long', year: 'numeric' })
      });
    }
  });

  // Sort
  alerts.sort((a, b) => a.days - b.days);

  if (alerts.length === 0) {
    container.innerHTML = `<div class="alert alert-success border-0 small mb-0">🎉 Todo al día.</div>`;
    return;
  }

  alerts.forEach(a => {
    let alertClass = "alert-light border";
    let icon = "📌";
    let text = "";

    if (a.days < 0) {
      alertClass = "alert-danger bg-danger-subtle border-danger";
      icon = "⏳"; // Overdue income
      text = `Vencido (${Math.abs(a.days)} días)`;
    }
    else if (a.days === 0) {
      alertClass = "alert-success border-success text-success-emphasis";
      icon = "💰";
      text = "¡Recibir HOY!";
    }
    else if (a.days <= 5) {
      alertClass = "alert-warning border-warning";
      icon = "⚠️";
      text = `En ${a.days} días`;
    }
    else {
      // Future
      text = `El ${Utils.formatDate(a.date)}`;
    }

    const div = document.createElement("div");
    div.className = `alert ${alertClass} shadow-sm d-flex justify-content-between align-items-center p-2 mb-1`;

    div.innerHTML = `
              <div class="d-flex align-items-center gap-2">
                  <span class="fs-5">${icon}</span>
                  <div style="line-height: 1.2;">
                      <div class="fw-bold small">${a.income.nombre}</div>
                      <div class="text-muted" style="font-size: 0.75rem;">
                         <span class="text-uppercase fw-bold">${a.monthLabel}</span> • ${text}
                      </div>
                  </div>
              </div>
              <button class="btn btn-sm btn-success rounded-pill btn-recibir" 
                style="font-size: 0.75rem;" 
                data-id="${a.income.id}" 
                data-date="${a.date.toISOString()}"> <!-- Store date for payment -->
                  Recibir
              </button>
          `;

    container.appendChild(div);
  });
}

function loadAccountsIntoModal() {
  const select = document.getElementById("cuentaIngresoModal");
  const accounts = Store.getAccounts();

  select.innerHTML = `<option value="">Seleccione cuenta...</option>`;
  accounts.forEach(acc => {
    const opt = document.createElement("option");
    opt.value = acc.id;
    opt.textContent = `${acc.nombre} (${acc.moneda})`;
    select.appendChild(opt);
  });
}

function openModal(income, dateStr) {
  selectedIncome = income;

  const displayEl = document.getElementById("nombreIngresoModalDisplay");
  if (displayEl) displayEl.textContent = income.nombre;

  // Use the alert date if provided, otherwise today
  const defaultDate = dateStr ? new Date(dateStr) : new Date();
  // Ensure we format it as YYYY-MM-DD for the input
  document.getElementById("fechaIngresoModal").value = defaultDate.toISOString().slice(0, 10);

  loadAccountsIntoModal();

  const amountInput = document.getElementById("valorIngresoModal");
  if (income.tipoValor === 'fijo') {
    amountInput.value = income.valor;
  } else {
    amountInput.value = "";
  }

  modalRecibirInstance.show();
}

// --- Event Listeners ---

const form = document.getElementById("formIngresoFijo");
if (form) {
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("nombre").value.trim();
    const day = Number(document.getElementById("diaIngreso").value);
    const type = document.getElementById("tipoValor").value;
    const value = document.getElementById("valor").value;

    if (!name || !day) return;

    let amount = null;
    if (type === 'fijo') {
      amount = Number(value);
      if (!amount || amount <= 0) {
        alert("Ingrese un valor válido");
        return;
      }
    }

    const newIncome = {
      id: Date.now(),
      nombre: name,
      diaIngreso: day,
      tipoValor: type,
      valor: amount,
      creationDate: document.getElementById("fechaInicio").value || Utils.getTodayISO(),
      historialRecibidos: []
    };

    saveIncome(newIncome);
    form.reset();
    // Reset select default
    document.getElementById("tipoValor").dispatchEvent(new Event('change'));
  });
}

const tipoValorSelect = document.getElementById("tipoValor");
if (tipoValorSelect) {
  tipoValorSelect.addEventListener("change", function () {
    const input = document.getElementById("valor");
    const help = document.getElementById("ayudaValor");
    if (this.value === 'variable') {
      input.value = "";
      input.disabled = true;
      help.textContent = "Se define al recibir";
    } else {
      input.disabled = false;
      help.textContent = "Obligatorio";
    }
  });
}

// Delegation
// --- History Logic ---
let modalHistorialInstance;

function viewHistory(id) {
  const incomes = Store.getFixedIncome();
  const inc = incomes.find(i => String(i.id) === String(id));
  if (!inc) return;

  document.getElementById("historialTitulo").textContent = inc.nombre;
  const list = document.getElementById("listaHistorial");
  list.innerHTML = "";

  const pagos = inc.historialRecibidos || [];

  if (pagos.length === 0) {
    list.innerHTML = `<div class="text-muted text-center small">No hay ingresos registrados aún.</div>`;
  } else {
    // Sort Date Desc
    pagos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    pagos.forEach(p => {
      const item = document.createElement("div");
      item.className = "d-flex justify-content-between align-items-center p-2 bg-light rounded border-start border-4 border-success";
      item.innerHTML = `
                <div>
                   <div class="fw-bold small">${Utils.formatDate(new Date(p.fecha))}</div>
                   <div class="text-muted" style="font-size: 0.7rem">Mes: ${p.mes}</div>
                </div>
                <div class="fw-bold text-success">${Utils.formatCurrency(p.valor)}</div>
            `;
      list.appendChild(item);
    });
  }

  modalHistorialInstance.show();
}

// Init
document.addEventListener("DOMContentLoaded", () => {
  const modalEl = document.getElementById("modalRecibir");
  if (modalEl) modalRecibirInstance = new bootstrap.Modal(modalEl);

  const modalHistEl = document.getElementById("modalHistorial");
  if (modalHistEl) modalHistorialInstance = new bootstrap.Modal(modalHistEl);

  renderList();
  renderAlerts();
});

document.addEventListener("click", (e) => {
  // Delete
  if (e.target.closest(".btn-eliminar")) {
    const btn = e.target.closest(".btn-eliminar");
    if (confirm("¿Eliminar este ingreso?")) {
      deleteIncome(btn.getAttribute("data-id"));
    }
  }

  // Historial
  if (e.target.closest(".btn-historial")) {
    const id = e.target.closest(".btn-historial").getAttribute("data-id");
    viewHistory(id);
  }

  // Recibir
  if (e.target.closest(".btn-recibir")) {
    const btn = e.target.closest(".btn-recibir");
    const id = btn.getAttribute("data-id");

    // Capture the specific alert date (if it exists)
    const dateStr = btn.getAttribute("data-date");

    const incomes = Store.getFixedIncome();
    const inc = incomes.find(i => String(i.id) === String(id));

    if (inc) openModal(inc, dateStr);
  }
});

// Modal Save
const btnGuardarIngreso = document.getElementById("btnGuardarIngreso");
if (btnGuardarIngreso) {
  btnGuardarIngreso.addEventListener("click", () => {
    if (!selectedIncome) return;

    const accountId = document.getElementById("cuentaIngresoModal").value;
    const date = document.getElementById("fechaIngresoModal").value;
    const amountVal = document.getElementById("valorIngresoModal").value;

    if (!accountId) { alert("Seleccione cuenta"); return; }
    if (!amountVal || Number(amountVal) <= 0) { alert("Valor inválido"); return; }

    // Register logic
    if (registerPayment(accountId, selectedIncome.nombre, date, amountVal)) {

      // Update History
      const allIncomes = Store.getFixedIncome();
      const inc = allIncomes.find(i => String(i.id) === String(selectedIncome.id));

      if (inc) {
        // Calculate next month ID for this income
        const nextDate = getNextIncomeDate(inc);
        // But wait, getNextIncomeDate calculates for *next* due. 
        // We want to record it for the month we are paying. 
        // Simple logic: Use the month of the selected Date in modal.

        let paymentDate = new Date(date);
        const monthID = `${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, '0')}`;

        inc.historialRecibidos = inc.historialRecibidos || [];
        inc.historialRecibidos.push({
          mes: monthID,
          fecha: date,
          valor: Number(amountVal),
          cuentaId: accountId
        });

        Store.saveData("ingresosFijos", allIncomes);
      }

      modalRecibirInstance.hide();
      selectedIncome = null;
      renderList();
      renderAlerts();

      alert("¡Ingreso recibido exitosamente!");
    }
  });
}
