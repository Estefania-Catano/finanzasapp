/*
  accountsPayable.js
  Controller for Accounts Payable (Debts)
*/

import Store from '../js/store.js';
import { Utils } from '../js/utils.js';
import '../js/components/Navbar.js';

const STORAGE_KEY = "cuentasPorPagar";
let modalPagoInstance;
let deudaSeleccionada = null;
let periodoSeleccionado = null;

// --- Helper Logic ---

function getDeudas() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
}

function saveDeudas(data) {
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

function getDateForPeriod(year, monthIndex, period, diaPagoMensual) {
  let day = period.dia;
  if (period.key === "M1") day = Number(diaPagoMensual);

  // Safety check
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  const realDay = Math.min(day, lastDay);

  return new Date(year, monthIndex, realDay);
}

function isPaidForMonthAndPeriod(deuda, monthID, periodKey) {
  return (deuda.historialPagos || []).some(p => p.mes === monthID && p.periodoKey === periodKey);
}


// --- Data Operations ---

function registrarPagoEnCuenta(cuentaId, descripcion, fecha, valor) {
  const accounts = Store.getAccounts();
  const account = accounts.find(c => String(c.id) === String(cuentaId));

  if (!account) {
    alert("Cuenta no encontrada");
    return false;
  }

  if (Number(account.saldo) < Number(valor)) {
    alert("Saldo insuficiente en la cuenta");
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

// --- UI Rendering ---

function renderList() {
  const container = document.getElementById("listaPagar");
  const deudas = getDeudas();

  container.innerHTML = "";

  if (deudas.length === 0) {
    container.innerHTML = `<div class="text-center text-muted p-4">No tienes deudas registradas.</div>`;
    return;
  }

  deudas.sort((a, b) => a.acreedor.localeCompare(b.acreedor));

  deudas.forEach(d => {
    const completado = Number(d.saldoPendiente || 0) <= 0;
    const periodos = getPeriodos(d.periodicidad);

    const card = document.createElement("div");
    card.className = "p-3 bg-light rounded shadow-sm border-0 mb-3";

    let actionsHTML = "";

    if (completado) {
      actionsHTML = `<span class="badge bg-success-soft text-success border border-success">Pagado Completo</span>`;
    } else {
      // Dropdown for periods
      let listItems = periodos.map(p => `
                <li><button class="dropdown-item btn-abrir-pago" data-id="${d.id}" data-periodo="${p.key}">${p.label}</button></li>
            `).join("");

      // Add Extra Payment Option
      listItems += `<li><hr class="dropdown-divider"></li>`;
      listItems += `<li><button class="dropdown-item btn-abrir-pago text-success" data-id="${d.id}" data-periodo="ABONO_EXTRA">💰 Abono Extra</button></li>`;

      actionsHTML = `
                <div class="dropdown d-inline-block">
                    <button class="btn btn-sm btn-danger rounded-pill dropdown-toggle" data-bs-toggle="dropdown">Registrar Pago</button>
                    <ul class="dropdown-menu shadow-sm border-0">
                        ${listItems}
                    </ul>
                </div>
            `;
    }

    card.innerHTML = `
            <div class="d-flex justify-content-between align-items-start flex-wrap gap-3">
                <div>
                    <div class="fw-bold text-dark fs-5">${d.acreedor}</div>
                    <div class="text-muted small mb-1">${d.descripcion || 'Sin descripción'}</div>
                    <div class="small text-secondary">
                        <span class="badge bg-white border text-dark me-1">${d.periodicidad.toUpperCase()}</span>
                        <span class="badge bg-white border text-dark">${d.tipoPago === 'cuotas' ? 'POR CUOTAS' : 'PAGO ÚNICO'}</span>
                    </div>
                </div>
                <div class="text-end">
                    <div class="fw-bold text-danger fs-5 mb-1">Pendiente: ${Utils.formatCurrency(d.saldoPendiente)}</div>
                    ${d.tipoPago === 'cuotas' ? `<div class="small text-muted mb-2">Cuota: ${Utils.formatCurrency(d.cuotaValor)}</div>` : ''}
                    
                    <div class="d-flex gap-2 justify-content-end align-items-center">
                        ${actionsHTML}
                        <button class="btn btn-sm btn-outline-info border-0 btn-historial" data-id="${d.id}" title="Ver Historial">📜</button>
                        <button class="btn btn-sm btn-outline-secondary border-0 btn-eliminar" data-id="${d.id}" title="Eliminar">🗑️</button>
                    </div>
                </div>
            </div>
        `;

    container.appendChild(card);
  });
}

function renderAlerts() {
  const container = document.getElementById("alertasPagar");
  const deudas = getDeudas();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentMonthID = Utils.getCurrentMonthID(); // YYYY-MM

  container.innerHTML = "";

  const pendientes = deudas.filter(d => Number(d.saldoPendiente || 0) > 0);

  if (pendientes.length === 0) {
    container.innerHTML = `<div class="alert alert-success border-0 small mb-0">🎉 Estás al día con tus deudas.</div>`;
    return;
  }

  let alerts = [];

  pendientes.forEach(d => {
    // Pago Único
    if (d.tipoPago === "unico" && d.fechaUnica) {
      const fechaPago = new Date(d.fechaUnica + "T00:00:00");
      // Fix timezone issue by appending time or using utils
      // Actually new Date("YYYY-MM-DD") is UTC. "YYYY-MM-DD " is local.
      // Let's rely on simple comparison

      const faltan = Utils.getDaysDifference(fechaPago);

      // Should we show alert? If not paid fully.
      alerts.push({
        deuda: d,
        periodoKey: "UNICO",
        periodoLabel: "Pago Único",
        fecha: fechaPago,
        faltan: faltan
      });
      return;
    }

    // Periodic
    const periodos = getPeriodos(d.periodicidad);

    // Check range: Last month (for overdue), Current, Next month
    for (let offset = -1; offset <= 1; offset++) {
      const checkDate = new Date(today.getFullYear(), today.getMonth() + offset, 1);
      const year = checkDate.getFullYear();
      const month = checkDate.getMonth();
      const monthID = `${year}-${String(month + 1).padStart(2, '0')}`;

      periodos.forEach(p => {
        // Check if already paid for this specific period in this specific month
        if (isPaidForMonthAndPeriod(d, monthID, p.key)) return;

        const date = getDateForPeriod(year, month, p, d.diaPago);

        // Check Start Date
        if (d.creationDate) {
          const [cYear, cMonth, cDay] = d.creationDate.split('-').map(Number);
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
        //    This prevents showing "Decada 3" of next month when we are start of this month.
        if (faltan > 45) return;

        alerts.push({
          deuda: d,
          periodoKey: p.key,
          periodoLabel: `${p.label} (${date.toLocaleString('es-CO', { month: 'short' })})`,
          fecha: date,
          faltan: faltan,
          // We need to pass the specific monthID to the pay button so we pay THAT specific instance
          monthID: monthID
        });
      });
    }
  });

  if (alerts.length === 0) {
    container.innerHTML = `<div class="alert alert-success border-0 small mb-0">🎉 Todo pagado por este mes.</div>`;
    return;
  }

  alerts.sort((a, b) => a.faltan - b.faltan);

  alerts.forEach(a => {
    let alertClass = "alert-light border";
    let icon = "📌";
    let text = "";

    if (a.faltan < 0) { alertClass = "alert-danger bg-danger-subtle border-danger"; icon = "❌"; text = "Vencido"; }
    else if (a.faltan === 0) { alertClass = "alert-danger border-danger text-danger-emphasis"; icon = "🚨"; text = "Vence HOY"; }
    else if (a.faltan <= 5) { alertClass = "alert-warning border-warning"; icon = "⚠️"; text = `Vence en ${a.faltan} días`; }
    else { text = `Vence el ${Utils.formatDate(a.fecha)}`; }

    const div = document.createElement("div");
    div.className = `alert ${alertClass} shadow-sm d-flex justify-content-between align-items-center p-2 mb-1`;

    div.innerHTML = `
            <div class="d-flex align-items-center gap-2">
                <span class="fs-5">${icon}</span>
                <div style="line-height: 1.2;">
                    <div class="fw-bold small">${a.deuda.acreedor}</div>
                    <div class="text-muted" style="font-size: 0.75rem;">${a.periodoLabel} • ${text}</div>
                </div>
            </div>
            <button class="btn btn-sm btn-danger rounded-pill btn-abrir-pago" style="font-size: 0.75rem;" 
                data-id="${a.deuda.id}" data-periodo="${a.periodoKey}" data-month="${a.monthID || ''}">
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
    opt.textContent = `${acc.nombre} (${acc.moneda}) - ${Utils.formatCurrency(acc.saldo)}`;
    select.appendChild(opt);
  });
}

function openModal(deuda, periodoKey) {
  deudaSeleccionada = deuda;

  if (periodoKey === 'ABONO_EXTRA') {
    periodoSeleccionado = { key: 'ABONO_EXTRA', label: 'Abono Extra a Capital' };
  } else {
    periodoSeleccionado = getPeriodos(deuda.periodicidad).find(p => p.key === periodoKey);
  }

  document.getElementById("acreedorModalDisplay").textContent = deuda.acreedor;
  document.getElementById("periodoModalDisplay").textContent = periodoSeleccionado ? periodoSeleccionado.label : "Pago Único";
  document.getElementById("deudaId").value = deuda.id;
  document.getElementById("infoPendiente").textContent = `Pendiente Total: ${Utils.formatCurrency(deuda.saldoPendiente)}`;

  document.getElementById("fechaPagoModal").value = new Date().toISOString().slice(0, 10);
  loadAccountsIntoModal();

  const inputVal = document.getElementById("valorPagoModal");

  if (periodoKey === 'ABONO_EXTRA') {
    inputVal.value = ""; // Let user type amount
    inputVal.placeholder = "Ingrese monto a abonar";
  } else if (deuda.tipoPago === 'cuotas') {
    inputVal.value = deuda.cuotaValor;
  } else {
    inputVal.value = deuda.saldoPendiente; // Default full payment
  }

  modalPagoInstance.show();
}

// --- Events ---

function updateFormUI() {
  const periodicidad = document.getElementById("periodicidad").value;
  const tipoPago = document.getElementById("tipoPago").value;

  const divDia = document.getElementById("contenedorDiaPago");
  const divFecha = document.getElementById("contenedorFechaUnica");

  const diaInput = document.getElementById("diaPago");
  const fechaInput = document.getElementById("fechaUnica");
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
    divFecha.classList.remove("d-none");
    fechaInput.required = true;

    cuotaInput.disabled = true;
    cuotaInput.value = "";
  } else {
    divFecha.classList.add("d-none");
    fechaInput.required = false;

    cuotaInput.disabled = false;
  }
}

document.getElementById("periodicidad").addEventListener("change", updateFormUI);
document.getElementById("tipoPago").addEventListener("change", updateFormUI);

document.getElementById("formPagar").addEventListener("submit", (e) => {
  e.preventDefault();

  const acreedor = document.getElementById("acreedor").value.trim();
  const desc = document.getElementById("descripcion").value.trim();
  const total = Number(document.getElementById("montoTotal").value);
  const periodicidad = document.getElementById("periodicidad").value;
  const tipoPago = document.getElementById("tipoPago").value;
  const cuota = Number(document.getElementById("cuotaValor").value);
  const dia = Number(document.getElementById("diaPago").value);
  const fechaUnica = document.getElementById("fechaUnica").value;

  if (!acreedor || total <= 0) return alert("Datos inválidos");

  const nuevaDeuda = {
    id: Date.now(),
    acreedor,
    descripcion: desc,
    montoTotal: total,
    saldoPendiente: total,
    tipoPago,
    periodicidad,
    diaPago: (periodicidad === 'mensual') ? dia : null,
    fechaUnica: (tipoPago === 'unico') ? fechaUnica : null,
    cuotaValor: (tipoPago === 'cuotas') ? cuota : null,
    creationDate: document.getElementById("fechaInicio").value || Utils.getTodayISO(),
    historialPagos: []
  };

  const deudas = getDeudas();
  deudas.push(nuevaDeuda);
  saveDeudas(deudas);

  alert("Deuda registrada ✅");
  e.target.reset();
  updateFormUI();
  renderList();
  renderAlerts();
});

document.addEventListener("click", (e) => {
  if (e.target.closest(".btn-eliminar")) {
    const id = e.target.closest(".btn-eliminar").getAttribute("data-id");
    if (confirm("¿Eliminar deuda?")) {
      let deudas = getDeudas();
      deudas = deudas.filter(d => String(d.id) !== String(id));
      saveDeudas(deudas);
      renderList();
      renderAlerts();
    }
  }

  if (e.target.closest(".btn-abrir-pago")) {
    const btn = e.target.closest(".btn-abrir-pago");
    const id = btn.getAttribute("data-id");
    const per = btn.getAttribute("data-periodo");
    const month = btn.getAttribute("data-month"); // Capture month

    const deudas = getDeudas();
    const d = deudas.find(i => String(i.id) === String(id));
    if (d) {
      // Temporarily attach the specific month to the debt object so modal knows which month to pay
      if (month) d.monthID = month;
      openModal(d, per);
    }
  }
});

document.getElementById("btnGuardarPago").addEventListener("click", () => {
  if (!deudaSeleccionada) return;

  const cuentaId = document.getElementById("cuentaPagoModal").value;
  const fecha = document.getElementById("fechaPagoModal").value;
  const valor = Number(document.getElementById("valorPagoModal").value);

  if (!cuentaId) return alert("Selecciona una cuenta");
  if (valor <= 0) return alert("Valor inválido");
  if (valor > Number(deudaSeleccionada.saldoPendiente)) return alert("El valor excede el saldo pendiente");

  // Register transaction
  if (registrarPagoEnCuenta(cuentaId, `Pago deuda: ${deudaSeleccionada.acreedor}`, fecha, valor)) {

    // Update Debt
    const deudas = getDeudas();
    const d = deudas.find(i => String(i.id) === String(deudaSeleccionada.id));

    if (d) {
      d.saldoPendiente = Number(d.saldoPendiente) - valor;
      d.historialPagos = d.historialPagos || [];
      // Use the specific month from the alert button if available (for past/future payments)
      // If not (e.g. manual payment from list), default to current month.
      const monthID = deudaSeleccionada.monthID || Utils.getCurrentMonthID();

      d.historialPagos.push({
        mes: monthID,
        fecha,
        valor,
        cuentaId,
        periodoKey: periodoSeleccionado ? periodoSeleccionado.key : 'UNICO'
      });
      saveDeudas(deudas);
    }

    modalPagoInstance.hide();
    deudaSeleccionada = null; // Clear selection including monthID
    renderList();
    renderAlerts();
    alert("Pago registrado exitosamente");
  }
});


// --- History Logic ---
let modalHistorialInstance;

function viewHistory(id) {
  const deudas = getDeudas();
  const d = deudas.find(e => String(e.id) === String(id));
  if (!d) return;

  document.getElementById("historialTitulo").textContent = d.acreedor;
  const list = document.getElementById("listaHistorial");
  list.innerHTML = "";

  const pagos = d.historialPagos || [];

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
  const modalEl = document.getElementById("modalPagoCXP");
  if (modalEl) modalPagoInstance = new bootstrap.Modal(modalEl);

  const modalHistEl = document.getElementById("modalHistorial");
  if (modalHistEl) modalHistorialInstance = new bootstrap.Modal(modalHistEl);

  updateFormUI(); // Set initial state
  renderList();
  renderAlerts();
});

document.addEventListener("click", (e) => {
  if (e.target.closest(".btn-historial")) {
    const id = e.target.closest(".btn-historial").getAttribute("data-id");
    viewHistory(id);
  }
});

