/*
  fixed-expenses.js
  Controller for Fixed Expenses
*/

import Store from '../js/store.js';
import { Utils } from '../js/utils.js';
import '../js/components/Navbar.js';

let modalPagarInstance;
let selectedExpense = null;
let selectedDate = null; // Store the specific date of the alert being paid

// --- Helper Logic ---

function isPaidForMonth(expense, monthID) {
  return (expense.historialPagos || []).some(p => p.mes === monthID);
}

// --- Data Operations ---

function saveExpense(newExpense) {
  const expenses = Store.getFixedExpenses();
  expenses.push(newExpense);
  Store.saveData("gastosFijos", expenses);
  renderList();
  renderAlerts();
}

function deleteExpense(id) {
  let expenses = Store.getFixedExpenses();
  expenses = expenses.filter(i => String(i.id) !== String(id));
  Store.saveData("gastosFijos", expenses);
  renderList();
  renderAlerts();
}

function registerPayment(accountId, expenseName, date, amount, monthID) {
  const accounts = Store.getAccounts();
  const account = accounts.find(c => String(c.id) === String(accountId));

  if (!account) {
    alert("Cuenta no encontrada");
    return false;
  }

  // Add transaction
  account.movimientos = account.movimientos || [];
  account.movimientos.push({
    fecha: date,
    tipo: "Egreso",
    descripcion: `Pago Fijo: ${expenseName} (${monthID})`,
    valor: Number(amount)
  });
  account.saldo = Number(account.saldo) - Number(amount);

  Store.saveData("cuentas", accounts);
  return true;
}

// --- UI Rendering ---

function renderList() {
  const container = document.getElementById("listaGastos");
  const expenses = Store.getFixedExpenses();

  if (!container) return;
  container.innerHTML = "";

  if (expenses.length === 0) {
    container.innerHTML = `<div class="text-center text-muted p-4">No tienes gastos fijos registrados.</div>`;
    return;
  }

  expenses.sort((a, b) => a.diaPago - b.diaPago);

  expenses.forEach(exp => {
    const card = document.createElement("div");
    card.className = "p-3 bg-light rounded shadow-sm border-0 mb-3";

    card.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <div class="fw-bold text-dark fs-5">${exp.nombre}</div>
                    <div class="small text-secondary">Día de pago: ${exp.diaPago}</div>
                </div>
                <div class="text-end">
                    <div class="fw-bold text-danger fs-5">$${Number(exp.valor).toLocaleString()}</div>
                    <div class="d-flex justify-content-end gap-1 mt-1">
                        <button class="btn btn-sm btn-outline-info border-0 btn-historial" data-id="${exp.id}" title="Ver Historial">📜</button>
                        <button class="btn btn-sm btn-outline-secondary border-0 btn-eliminar" data-id="${exp.id}" title="Eliminar">🗑️</button>
                    </div>
                </div>
            </div>
        `;

    container.appendChild(card);
  });
}

function renderAlerts() {
  const container = document.getElementById("alertas");
  const expenses = Store.getFixedExpenses();

  if (!container) return;
  container.innerHTML = "";

  if (expenses.length === 0) {
    container.innerHTML = `<div class="alert alert-success border-0 small mb-0">🎉 No tienes gastos pendientes.</div>`;
    return;
  }

  let alerts = [];
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth(); // 0-indexed

  expenses.forEach(exp => {
    // Loop from -3 to +1 relative to current month
    for (let offset = -3; offset <= 1; offset++) {
      const checkDate = new Date(currentYear, currentMonth + offset, 1);
      const checkYear = checkDate.getFullYear();
      const checkMonth = checkDate.getMonth();

      // Calculate Due Date for this specific month
      const lastDayOfMonth = new Date(checkYear, checkMonth + 1, 0).getDate();
      const dueDay = Math.min(Number(exp.diaPago), lastDayOfMonth);
      const dueDate = new Date(checkYear, checkMonth, dueDay);

      // Skip if before creation date
      if (exp.creationDate) {
        // Parse "YYYY-MM-DD" explicitly to local time 
        const [cYear, cMonth, cDay] = exp.creationDate.split('-').map(Number);
        const creation = new Date(cYear, cMonth - 1, cDay);
        creation.setHours(0, 0, 0, 0);

        // Also normalize dueDate to midnight just in case
        dueDate.setHours(0, 0, 0, 0);

        if (dueDate < creation) continue;
      }

      // Check if paid
      const monthID = `${checkYear}-${String(checkMonth + 1).padStart(2, '0')}`;
      if (isPaidForMonth(exp, monthID)) continue;

      // Calculate days remaining
      const daysDiff = Utils.getDaysDifference(dueDate);

      alerts.push({
        expense: exp,
        date: dueDate,
        days: daysDiff,
        monthID: monthID,
        monthLabel: dueDate.toLocaleString('es-CO', { month: 'long', year: 'numeric' })
      });
    }
  });

  // Sort: Overdue first (negative days), then immediate (0), then future
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
      icon = "❌";
      text = `Vencido (${Math.abs(a.days)} días)`;
    }
    else if (a.days === 0) {
      alertClass = "alert-danger border-danger text-danger-emphasis";
      icon = "🚨";
      text = "Vence HOY";
    }
    else if (a.days <= 5) {
      alertClass = "alert-warning border-warning";
      icon = "⚠️";
      text = `Vence en ${a.days} días`;
    }
    else {
      // Future
      text = `Vence el ${Utils.formatDate(a.date)}`;
    }

    const div = document.createElement("div");
    div.className = `alert ${alertClass} shadow-sm d-flex justify-content-between align-items-center p-2 mb-1`;

    div.innerHTML = `
          <div class="d-flex align-items-center gap-2">
              <span class="fs-5">${icon}</span>
              <div style="line-height: 1.2;">
                  <div class="fw-bold small">${a.expense.nombre}</div>
                  <div class="text-muted" style="font-size: 0.75rem;">
                     <span class="text-uppercase fw-bold">${a.monthLabel}</span> • ${text}
                  </div>
              </div>
          </div>
          <button class="btn btn-sm btn-danger rounded-pill btn-pagar" style="font-size: 0.75rem;" 
              data-id="${a.expense.id}" data-month="${a.monthID}" data-date="${a.date.toISOString()}">
              Pagar
          </button>
      `;
    container.appendChild(div);
  });
}

function loadAccountsIntoModal() {
  const select = document.getElementById("cuentaPagoModal");
  const accounts = Store.getAccounts();

  select.innerHTML = `<option value="">Seleccione cuenta...</option>`;
  accounts.forEach(acc => {
    const opt = document.createElement("option");
    opt.value = acc.id;
    opt.textContent = `${acc.nombre} (${acc.moneda})`;
    select.appendChild(opt);
  });
}

function openModal(expense, dateStr) {
  selectedExpense = expense;
  selectedDate = new Date(dateStr);

  const displayEl = document.getElementById("nombreGastoModalDisplay");
  if (displayEl) displayEl.textContent = `${expense.nombre} (${Utils.formatDate(selectedDate)})`;

  document.getElementById("fechaPagoModal").value = new Date().toISOString().slice(0, 10);
  loadAccountsIntoModal();

  const amountInput = document.getElementById("valorPagoModal");
  if (expense.tipoValor === 'fijo') {
    amountInput.value = expense.valor;
  } else {
    amountInput.value = "";
  }

  modalPagarInstance.show();
}

// --- Event Listeners ---

const form = document.getElementById("formGastoFijo");
if (form) {
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("nombre").value.trim();
    const day = Number(document.getElementById("diaPago").value);
    const type = document.getElementById("tipoValor").value;
    const value = document.getElementById("valor").value;
    const startDateInput = document.getElementById("fechaInicio").value;

    if (!name || !day) return;

    let amount = null;
    if (type === 'fijo') {
      amount = Number(value);
      if (!amount || amount <= 0) {
        alert("Ingrese un valor válido");
        return;
      }
    }

    // Use user-provided key date OR default to today
    const creationDate = startDateInput ? startDateInput : Utils.getTodayISO();

    const newExpense = {
      id: Date.now(),
      nombre: name,
      diaPago: day,
      tipoValor: type,
      valor: amount,
      creationDate: creationDate,
      historialPagos: []
    };

    saveExpense(newExpense);
    form.reset();
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
      help.style.display = "block";
    } else {
      input.disabled = false;
      help.style.display = "none";
    }
  });
}

// --- History Logic ---
let modalHistorialInstance;

function viewHistory(id) {
  const expenses = Store.getFixedExpenses();
  const exp = expenses.find(e => String(e.id) === String(id));
  if (!exp) return;

  document.getElementById("historialTitulo").textContent = exp.nombre;
  const list = document.getElementById("listaHistorial");
  list.innerHTML = "";

  const pagos = exp.historialPagos || [];

  if (pagos.length === 0) {
    list.innerHTML = `<div class="text-muted text-center small">No hay pagos registrados aún.</div>`;
  } else {
    // Sort Date Desc
    pagos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    pagos.forEach(p => {
      const item = document.createElement("div");
      item.className = "d-flex justify-content-between align-items-center p-2 bg-light rounded border-start border-4 border-danger";
      item.innerHTML = `
                <div>
                   <div class="fw-bold small">${Utils.formatDate(new Date(p.fecha))}</div>
                   <div class="text-muted" style="font-size: 0.7rem">Mes: ${p.mes}</div>
                </div>
                <div class="fw-bold text-danger">${Utils.formatCurrency(p.valor)}</div>
            `;
      list.appendChild(item);
    });
  }

  modalHistorialInstance.show();
}


// Init
document.addEventListener("DOMContentLoaded", () => {
  const modalEl = document.getElementById("modalPagar");
  if (modalEl) modalPagarInstance = new bootstrap.Modal(modalEl);

  const modalHistEl = document.getElementById("modalHistorial");
  if (modalHistEl) modalHistorialInstance = new bootstrap.Modal(modalHistEl);

  renderList();
  renderAlerts();
});

document.addEventListener("click", (e) => {
  if (e.target.closest(".btn-eliminar")) {
    const id = e.target.closest(".btn-eliminar").getAttribute("data-id");
    if (confirm("¿Eliminar este gasto fijo?")) {
      deleteExpense(id);
    }
  }

  if (e.target.closest(".btn-historial")) {
    const id = e.target.closest(".btn-historial").getAttribute("data-id");
    viewHistory(id);
  }

  if (e.target.closest(".btn-pagar")) {
    const btn = e.target.closest(".btn-pagar");
    const id = btn.getAttribute("data-id");
    const dateStr = btn.getAttribute("data-date");
    const expenses = Store.getFixedExpenses();
    const exp = expenses.find(i => String(i.id) === String(id));
    if (exp) openModal(exp, dateStr);
  }
});

// Fixed ID: btnGuardarPago matches HTML
const btnGuardarPago = document.getElementById("btnGuardarPago");
if (btnGuardarPago) {
  btnGuardarPago.addEventListener("click", () => {
    if (!selectedExpense) return; // selectedDate might be null if manually opened, but usually set via openModal

    const accountId = document.getElementById("cuentaPagoModal").value;
    const dateStr = document.getElementById("fechaPagoModal").value;
    const amount = Number(document.getElementById("valorPagoModal").value);

    if (!accountId) return alert("Seleccione una cuenta");
    if (!amount || amount <= 0) return alert("Monto inválido");

    // Format monthID from the Selected Due Date (if available) or from the user-picked date
    let monthID;
    if (selectedDate) {
      monthID = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`;
    } else {
      const d = new Date(dateStr);
      monthID = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }

    if (registerPayment(accountId, selectedExpense.nombre, dateStr, amount, monthID)) {
      // Update Expense History
      const expenses = Store.getFixedExpenses();
      const exp = expenses.find(i => String(i.id) === String(selectedExpense.id));
      if (exp) {
        exp.historialPagos = exp.historialPagos || [];
        exp.historialPagos.push({
          mes: monthID,
          fecha: dateStr,
          valor: amount,
          cuentaId: accountId
        });
        Store.saveData("gastosFijos", expenses);
      }

      modalPagarInstance.hide();
      selectedExpense = null;
      selectedDate = null;
      renderList();
      renderAlerts();
      alert("Pago registrado exitosamente");
    }
  });
}
