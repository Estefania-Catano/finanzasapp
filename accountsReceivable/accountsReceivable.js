/*
  accountsReceivable.js
  Controller for Accounts Receivable (Cobros)
*/

import Store from '../js/store.js';
import { Utils } from '../js/utils.js';
import '../js/components/Navbar.js';

const STORAGE_KEY = "cuentasPorCobrar";
let modalPagoInstance;
let cobroSeleccionado = null;
let periodoSeleccionado = null;

// --- Helper Logic ---

function getCobros() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
}

function saveCobros(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function getPeriodos(periodicidad) {
  if (periodicidad === "quincenal") {
    return [
      { key: "Q1", dia: 15, label: "Quincena 1 (15)" },
      { key: "Q2", dia: 30, label: "Quincena 2 (30)" }
    ];
  }

  if (periodicidad === "decadal") {
    return [
      { key: "D1", dia: 10, label: "Década 1 (10)" },
      { key: "D2", dia: 20, label: "Década 2 (20)" },
      { key: "D3", dia: 30, label: "Década 3 (30)" }
    ];
  }

  return [{ key: "M1", dia: null, label: "Mensual" }];
}

function getDateForPeriod(year, monthIndex, period, diaMensual) {
  let day = period.dia;
  if (period.key === "M1") day = Number(diaMensual);

  // Safety check
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  const realDay = Math.min(day, lastDay);

  return new Date(year, monthIndex, realDay);
}

function isPaidForMonthAndPeriod(cobro, monthID, periodKey) {
  return (cobro.historialPagos || []).some(p => p.mes === monthID && p.periodoKey === periodKey);
}

// --- Data Operations ---

function registrarIngresoEnCuenta(cuentaId, descripcion, fecha, valor) {
  const accounts = Store.getAccounts();
  const account = accounts.find(c => String(c.id) === String(cuentaId));

  if (!account) {
    alert("Cuenta no encontrada");
    return false;
  }

  account.saldo = Number(account.saldo) + Number(valor);
  account.movimientos = account.movimientos || [];
  account.movimientos.push({
    fecha: fecha,
    tipo: "Ingreso",
    descripcion: descripcion,
    valor: Number(valor)
  });

  Store.saveData("cuentas", accounts);
  return true;
}

function registrarEgresoEnCuenta(cuentaId, descripcion, fecha, valor) {
  const accounts = Store.getAccounts();
  const account = accounts.find(c => String(c.id) === String(cuentaId));

  if (!account) {
    alert("Cuenta de origen no encontrada");
    return false;
  }

  if (Number(account.saldo) < Number(valor)) {
    alert(`❌ Saldo insuficiente en ${account.nombre} para realizar el préstamo.`);
    return false;
  }

  account.saldo = Number(account.saldo) - Number(valor);
  account.movimientos = account.movimientos || [];
  account.movimientos.push({
    fecha: fecha,
    tipo: "Egreso",
    descripcion: descripcion,
    valor: Number(valor)
  });

  Store.saveData("cuentas", accounts);
  return true;
}

function loadAccountsIntoSourceSelect() {
  const select = document.getElementById("cuentaOrigen");
  if (!select) return;
  const accounts = Store.getAccounts();
  select.innerHTML = `<option value="">Ninguna (Solo registrar deuda)</option>`;
  accounts.forEach(acc => {
    const opt = document.createElement("option");
    opt.value = acc.id;
    opt.textContent = `${acc.nombre} (${Utils.formatCurrency(acc.saldo)})`;
    select.appendChild(opt);
  });
}

// --- UI Rendering ---

function renderList() {
  const container = document.getElementById("listaCobros");
  const cobros = getCobros();

  container.innerHTML = "";

  if (cobros.length === 0) {
    container.innerHTML = `<div class="text-center text-muted p-4">No tienes cuentas por cobrar registradas.</div>`;
    return;
  }

  cobros.sort((a, b) => a.nombreDeudor.localeCompare(b.nombreDeudor));

  cobros.forEach(c => {
    const completado = Number(c.saldoPendiente || 0) <= 0;
    const periodos = getPeriodos(c.periodicidad);

    const card = document.createElement("div");
    card.className = "p-3 bg-light rounded shadow-sm border-0 mb-3";

    let actionsHTML = "";

    if (completado) {
      actionsHTML = `<span class="badge bg-success-soft text-success border border-success">Pagado Completo</span>`;
    } else {
      // Dropdown for periods
      let listItems = periodos.map(p => `
                <li><button class="dropdown-item btn-abrir-pago" data-id="${c.id}" data-periodo="${p.key}">${p.label}</button></li>
            `).join("");

      actionsHTML = `
                <div class="dropdown d-inline-block">
                    <button class="btn btn-sm btn-success rounded-pill dropdown-toggle" data-bs-toggle="dropdown">Registrar Pago</button>
                    <ul class="dropdown-menu shadow-sm border-0">
                        ${listItems}
                    </ul>
                </div>
            `;
    }

    card.innerHTML = `
            <div class="d-flex justify-content-between align-items-start flex-wrap gap-3">
                <div>
                    <div class="fw-bold text-dark fs-5">${c.nombreDeudor}</div>
                    <div class="text-muted small mb-1">${c.descripcion || 'Sin descripción'}</div>
                    <div class="small text-secondary">
                        <span class="badge bg-white border text-dark me-1">${c.periodicidad.toUpperCase()}</span>
                        <span class="badge bg-white border text-dark">${c.tipoPago === 'cuotas' ? 'POR CUOTAS' : 'PAGO ÚNICO'}</span>
                    </div>
                </div>
                <div class="text-end">
                    <div class="fw-bold text-success fs-5 mb-1">Pendiente: ${Utils.formatCurrency(c.saldoPendiente)}</div>
                    ${c.tipoPago === 'cuotas' ? `<div class="small text-muted mb-2">Cuota: ${Utils.formatCurrency(c.cuotaValor)}</div>` : ''}
                    
                    <div class="d-flex gap-2 justify-content-end align-items-center">
                        ${actionsHTML}
                        <button class="btn btn-sm btn-outline-secondary border-0 btn-eliminar" data-id="${c.id}">🗑️</button>
                    </div>
                </div>
            </div>
        `;

    container.appendChild(card);
  });
}

function renderAlerts() {
  const container = document.getElementById("alertas");
  const cobros = getCobros();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentMonthID = Utils.getCurrentMonthID(); // YYYY-MM

  container.innerHTML = "";

  const pendientes = cobros.filter(c => Number(c.saldoPendiente || 0) > 0);

  if (pendientes.length === 0) {
    container.innerHTML = `<div class="alert alert-success border-0 small mb-0">🎉 No tienes cobros pendientes.</div>`;
    return;
  }

  let alerts = [];

  pendientes.forEach(c => {
    // Periodic
    const periodos = getPeriodos(c.periodicidad);

    // Check range: Last month (for overdue), Current, Next month
    for (let offset = -1; offset <= 1; offset++) {
      const checkDate = new Date(today.getFullYear(), today.getMonth() + offset, 1);
      const year = checkDate.getFullYear();
      const month = checkDate.getMonth();
      const monthID = `${year}-${String(month + 1).padStart(2, '0')}`;

      periodos.forEach(p => {
        // Check if already paid for this specific period in this specific month
        if (isPaidForMonthAndPeriod(c, monthID, p.key)) return;

        const date = getDateForPeriod(year, month, p, c.diaPago);

        // Check Start Date
        if (c.creationDate) {
          const [cYear, cMonth, cDay] = c.creationDate.split('-').map(Number);
          const creation = new Date(cYear, cMonth - 1, cDay);
          creation.setHours(0, 0, 0, 0);

          const alertDate = new Date(date);
          alertDate.setHours(0, 0, 0, 0);

          if (alertDate < creation) return;
        }

        const faltan = Utils.getDaysDifference(date);

        // Logic to show alert:
        // 1. If overdue (faltan < 0), always show.
        // 2. If upcoming (faltan >= 0), only show if within reasonable range (e.g. 35 days)
        if (faltan > 45) return;

        alerts.push({
          cobro: c,
          periodoKey: p.key,
          periodoLabel: `${p.label} (${date.toLocaleString('es-CO', { month: 'short' })})`,
          fecha: date,
          faltan: faltan,
          monthID: monthID
        });
      });
    }
  });

  if (alerts.length === 0) {
    container.innerHTML = `<div class="alert alert-success border-0 small mb-0">🎉 Todo cobrado por este mes.</div>`;
    return;
  }

  alerts.sort((a, b) => a.faltan - b.faltan);

  alerts.forEach(a => {
    let alertClass = "alert-light border";
    let icon = "💰";
    let text = "";

    if (a.faltan < 0) { alertClass = "alert-danger bg-danger-subtle border-danger"; icon = "❌"; text = "Vencido"; }
    else if (a.faltan === 0) { alertClass = "alert-success border-success text-success-emphasis"; icon = "💰"; text = "Cobrar HOY"; }
    else if (a.faltan <= 5) { alertClass = "alert-warning border-warning"; icon = "⚠️"; text = `Cobrar en ${a.faltan} días`; }
    else { text = `Cobrar el ${Utils.formatDate(a.fecha)}`; }

    const div = document.createElement("div");
    div.className = `alert ${alertClass} shadow-sm d-flex justify-content-between align-items-center p-2 mb-1`;

    div.innerHTML = `
            <div class="d-flex align-items-center gap-2">
                <span class="fs-5">${icon}</span>
                <div style="line-height: 1.2;">
                    <div class="fw-bold small">${a.cobro.nombreDeudor}</div>
                    <div class="text-muted" style="font-size: 0.75rem;">${a.periodoLabel} • ${text}</div>
                </div>
            </div>
            <button class="btn btn-sm btn-success rounded-pill btn-abrir-pago" style="font-size: 0.75rem;" 
                data-id="${a.cobro.id}" data-periodo="${a.periodoKey}" data-month="${a.monthID || ''}">
                Recibir
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
    opt.textContent = `${acc.nombre} (${acc.moneda}) - ${Utils.formatCurrency(acc.saldo)}`;
    select.appendChild(opt);
  });
}

function openModal(cobro, periodoKey) {
  cobroSeleccionado = cobro;
  periodoSeleccionado = getPeriodos(cobro.periodicidad).find(p => p.key === periodoKey);

  document.getElementById("deudorModal").textContent = cobro.nombreDeudor;
  document.getElementById("periodoModal").textContent = periodoSeleccionado ? periodoSeleccionado.label : "Pago Único";
  document.getElementById("cobroId").value = cobro.id;
  document.getElementById("infoPendiente").textContent = `Pendiente Total: ${Utils.formatCurrency(cobro.saldoPendiente)}`;

  document.getElementById("fechaPagoModal").value = new Date().toISOString().slice(0, 10);
  loadAccountsIntoModal();

  const inputVal = document.getElementById("valorPagoModal");
  if (cobro.tipoPago === 'cuotas') {
    inputVal.value = cobro.cuotaValor;
  } else {
    inputVal.value = cobro.saldoPendiente;
  }

  modalPagoInstance.show();
}

// --- Events ---

function updateFormUI() {
  const periodicidad = document.getElementById("periodicidad").value;
  const tipoPago = document.getElementById("tipoPago").value;

  const divDia = document.getElementById("contenedorDiaPago");
  const diaInput = document.getElementById("diaPago");
  const cuotaInput = document.getElementById("cuotaValor");

  // Logic 1: Periodicidad Mensual -> Show Day
  if (periodicidad === 'mensual') {
    divDia.classList.remove("d-none");
    diaInput.required = true;
  } else {
    divDia.classList.add("d-none");
    diaInput.required = false;
  }

  // Logic 2: Tipo Pago -> Unico vs Cuotas
  if (tipoPago === 'unico') {
    cuotaInput.disabled = true;
    cuotaInput.value = "";
  } else {
    cuotaInput.disabled = false;
  }
}

document.getElementById("periodicidad").addEventListener("change", updateFormUI);
document.getElementById("tipoPago").addEventListener("change", updateFormUI);

document.getElementById("formCobro").addEventListener("submit", (e) => {
  e.preventDefault();

  const nombreDeudor = document.getElementById("nombreDeudor").value.trim();
  const desc = document.getElementById("descripcion").value.trim();
  const monto = Number(document.getElementById("montoPrestado").value);
  const periodicidad = document.getElementById("periodicidad").value;
  const tipoPago = document.getElementById("tipoPago").value;
  const cuota = Number(document.getElementById("cuotaValor").value);
  const dia = Number(document.getElementById("diaPago").value);

  if (!nombreDeudor || monto <= 0) return alert("Datos inválidos");

  const nuevoCobro = {
    id: Date.now(),
    nombreDeudor,
    descripcion: desc,
    montoPrestado: monto,
    saldoPendiente: monto,
    tipoPago,
    periodicidad,
    diaPago: (periodicidad === 'mensual') ? dia : null,
    cuotaValor: (tipoPago === 'cuotas') ? cuota : null,
    creationDate: document.getElementById("fechaInicio").value || Utils.getTodayISO(),
    historialPagos: []
  };

  // Logic: If source account selected, deduct money
  const cuentaOrigenId = document.getElementById("cuentaOrigen").value;
  if (cuentaOrigenId) {
    if (!registrarEgresoEnCuenta(cuentaOrigenId, `Préstamo a ${nombreDeudor}`, nuevoCobro.creationDate, monto)) {
      return; // Stop if error (e.g. insufficient funds)
    }
  }

  const cobros = getCobros();
  cobros.push(nuevoCobro);
  saveCobros(cobros);

  alert("Cuenta por cobrar guardada ✅");
  e.target.reset();
  updateFormUI();
  // Reload accounts in dropdowns
  loadAccountsIntoSourceSelect();
  renderList();
  renderAlerts();
});

document.addEventListener("click", (e) => {
  if (e.target.closest(".btn-eliminar")) {
    const id = e.target.closest(".btn-eliminar").getAttribute("data-id");
    if (confirm("¿Eliminar registro?")) {
      let cobros = getCobros();
      cobros = cobros.filter(c => String(c.id) !== String(id));
      saveCobros(cobros);
      renderList();
      renderAlerts();
    }
  }

  if (e.target.closest(".btn-abrir-pago")) {
    const btn = e.target.closest(".btn-abrir-pago");
    const id = btn.getAttribute("data-id");
    const per = btn.getAttribute("data-periodo");
    const month = btn.getAttribute("data-month");

    const cobros = getCobros();
    const c = cobros.find(i => String(i.id) === String(id));
    if (c) {
      if (month) c.monthID = month;
      openModal(c, per);
    }
  }
});

document.getElementById("btnGuardarPago").addEventListener("click", () => {
  try {
    if (!cobroSeleccionado) {
      console.error("No cobroSeleccionado");
      return;
    }

    const cuentaId = document.getElementById("cuentaPagoModal").value;
    const fecha = document.getElementById("fechaPagoModal").value;
    const valor = Number(document.getElementById("valorPagoModal").value);

    if (!cuentaId) return alert("Selecciona una cuenta");
    if (valor <= 0) return alert("Valor inválido");

    // Ensure specific comparison
    const pendiente = Number(cobroSeleccionado.saldoPendiente);
    if (valor > pendiente + 0.1) { // Tolerance for floats
      return alert(`El valor excede el saldo pendiente ($${pendiente})`);
    }

    console.log("Processing payment...", { cuentaId, valor, cobro: cobroSeleccionado });

    // Register transaction (Income)
    if (registrarIngresoEnCuenta(cuentaId, `Cobro recibido: ${cobroSeleccionado.nombreDeudor}`, fecha, valor)) {

      // Update Receivable
      const cobros = getCobros();
      const c = cobros.find(i => String(i.id) === String(cobroSeleccionado.id));

      if (c) {
        c.saldoPendiente = Number(c.saldoPendiente) - valor;
        if (c.saldoPendiente < 0) c.saldoPendiente = 0; // Prevent negative

        c.historialPagos = c.historialPagos || [];

        const monthID = cobroSeleccionado.monthID || Utils.getCurrentMonthID();

        c.historialPagos.push({
          mes: monthID,
          fecha,
          valor,
          cuentaId,
          periodoKey: periodoSeleccionado ? periodoSeleccionado.key : 'UNICO'
        });
        saveCobros(cobros);
      }

      modalPagoInstance.hide();
      cobroSeleccionado = null;
      renderList();
      renderAlerts();
      alert("Pago recibido exitosamente ✅");
    }
  } catch (err) {
    console.error(err);
    alert("Error al procesar pago: " + err.message);
  }
});


// Init
document.addEventListener("DOMContentLoaded", () => {
  const modalEl = document.getElementById("modalPago");
  if (modalEl) modalPagoInstance = new bootstrap.Modal(modalEl);

  updateFormUI(); // Set initial state
  loadAccountsIntoSourceSelect();
  renderList();
  renderAlerts();
});
