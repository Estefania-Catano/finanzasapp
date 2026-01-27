function obtenerDeudas() {
  return JSON.parse(localStorage.getItem("cuentasPorPagar")) || [];
}

function guardarDeudas(data) {
  localStorage.setItem("cuentasPorPagar", JSON.stringify(data));
}

function obtenerCuentas() {
  return JSON.parse(localStorage.getItem("cuentas")) || [];
}

function guardarCuentas(cuentas) {
  localStorage.setItem("cuentas", JSON.stringify(cuentas));
}

function formatearCOP(valor) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0
  }).format(valor || 0);
}

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

function obtenerMesActual() {
  const hoy = new Date();
  const año = hoy.getFullYear();
  const mes = String(hoy.getMonth() + 1).padStart(2, "0");
  return `${año}-${mes}`;
}

function obtenerUltimoDiaMes(año, mesIndex) {
  return new Date(año, mesIndex + 1, 0).getDate();
}

function fechaAjustadaDelMes(dia) {
  const hoy = new Date();
  const año = hoy.getFullYear();
  const mes = hoy.getMonth();

  const ultimoDia = obtenerUltimoDiaMes(año, mes);
  const diaReal = Math.min(Number(dia), ultimoDia);

  const fecha = new Date(año, mes, diaReal);
  fecha.setHours(0, 0, 0, 0);
  return fecha;
}

function diasDiferencia(hoy, fechaObjetivo) {
  const ms = fechaObjetivo.getTime() - hoy.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

/* ======================
   PERIODICIDAD
====================== */
function obtenerPeriodos(periodicidad) {
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

function yaPagoPeriodoEsteMes(deuda, periodoKey) {
  const mes = obtenerMesActual();
  return (deuda.historialPagos || []).some(p => p.mes === mes && p.periodoKey === periodoKey);
}

/* ======================
   MODAL
====================== */
let modalPago;
let deudaSeleccionada = null;
let periodoSeleccionado = null;

function cargarCuentasEnModal() {
  const select = document.getElementById("cuentaPagoModal");
  const ayuda = document.getElementById("ayudaCuentas");
  const cuentas = obtenerCuentas();

  select.innerHTML = `<option value="">Seleccione una cuenta</option>`;

  if (cuentas.length === 0) {
    ayuda.textContent = "No tienes cuentas creadas. Crea una cuenta para registrar pagos.";
    select.disabled = true;
    return;
  }

  ayuda.textContent = "";
  select.disabled = false;

  cuentas.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = `${c.nombre} (${c.categoria}) - Saldo: ${formatearCOP(c.saldo)}`;
    select.appendChild(opt);
  });
}

function abrirModalPago(deuda, periodo) {
  deudaSeleccionada = deuda;
  periodoSeleccionado = periodo;

  document.getElementById("deudaId").value = deuda.id;
  document.getElementById("acreedorModal").value = deuda.acreedor;
  document.getElementById("periodoModal").value = periodo.label;
  document.getElementById("fechaPagoModal").value = hoyISO();
  document.getElementById("cuentaPagoModal").value = "";
  document.getElementById("valorPagoModal").value = "";

  cargarCuentasEnModal();

  const ayuda = document.getElementById("ayudaPago");
  const info = document.getElementById("infoPendiente");

  if (deuda.tipoPago === "cuotas") {
    ayuda.textContent = `Cuota sugerida: ${formatearCOP(deuda.cuotaValor)}`;
    document.getElementById("valorPagoModal").value = deuda.cuotaValor;
  } else {
    ayuda.textContent = `Pago único sugerido: ${formatearCOP(deuda.saldoPendiente)}`;
    document.getElementById("valorPagoModal").value = deuda.saldoPendiente;
  }

  info.textContent = `Saldo pendiente: ${formatearCOP(deuda.saldoPendiente)}`;

  modalPago.show();
}

/* ======================
   REGISTRAR EGRESO EN CUENTA
====================== */
function registrarEgresoEnCuenta(cuentaId, descripcion, fecha, valor) {
  const cuentas = obtenerCuentas();
  const cuenta = cuentas.find(c => String(c.id) === String(cuentaId));

  if (!cuenta) {
    alert("No se encontró la cuenta seleccionada");
    return false;
  }

  const saldoActual = Number(cuenta.saldo || 0);
  const valorNum = Number(valor || 0);

  if (valorNum > saldoActual) {
    alert("⚠️ No tienes saldo suficiente en esa cuenta.");
    return false;
  }

  cuenta.movimientos = cuenta.movimientos || [];

  cuenta.movimientos.push({
    fecha,
    tipo: "Egreso",
    descripcion,
    valor: valorNum
  });

  cuenta.saldo = saldoActual - valorNum;

  guardarCuentas(cuentas);
  return true;
}

/* ======================
   UI
====================== */
function pintarLista() {
  const lista = document.getElementById("listaPagar");
  const deudas = obtenerDeudas();

  lista.innerHTML = "";

  if (deudas.length === 0) {
    lista.innerHTML = `<p class="text-muted">No tienes cuentas por pagar registradas.</p>`;
    return;
  }

  deudas.sort((a, b) => a.acreedor.localeCompare(b.acreedor));

  deudas.forEach((d) => {
    const completado = Number(d.saldoPendiente || 0) <= 0;
    const periodos = obtenerPeriodos(d.periodicidad);

    const div = document.createElement("div");
    div.className = "border rounded p-3 mb-2";

    div.innerHTML = `
      <div class="d-flex justify-content-between align-items-start gap-3 flex-wrap">
        <div>
          <strong>${d.acreedor}</strong>
          <div class="text-muted small">${d.descripcion || ""}</div>

          <div class="small mt-1">
            Periodicidad: <strong>${d.periodicidad}</strong> •
            Tipo: <strong>${d.tipoPago === "cuotas" ? "Cuotas" : "Pago único"}</strong>
          </div>

          ${
            d.tipoPago === "cuotas"
              ? `<div class="small">Cuota: <strong>${formatearCOP(d.cuotaValor)}</strong></div>`
              : ""
          }

          ${
            d.tipoPago === "unico" && d.fechaUnica
              ? `<div class="small">Fecha única: <strong>${d.fechaUnica}</strong></div>`
              : ""
          }
        </div>

        <div class="text-end">
          <div class="fw-bold">
            Pendiente: ${formatearCOP(d.saldoPendiente)}
          </div>

          <div class="mt-2 d-flex gap-2 justify-content-end flex-wrap">
            ${
              completado
                ? `<span class="badge text-bg-success">Pagado completo</span>`
                : `
                  <div class="dropdown">
                    <button class="btn btn-sm btn-success dropdown-toggle" data-bs-toggle="dropdown">
                      Registrar pago
                    </button>
                    <ul class="dropdown-menu">
                      ${periodos.map(p => `
                        <li>
                          <button class="dropdown-item btn-abrir-pago" data-id="${d.id}" data-periodo="${p.key}">
                            ${p.label}
                          </button>
                        </li>
                      `).join("")}
                    </ul>
                  </div>
                `
            }

            <button class="btn btn-sm btn-outline-danger btn-eliminar" data-id="${d.id}">
              Eliminar
            </button>
          </div>
        </div>
      </div>
    `;

    lista.appendChild(div);
  });
}

function pintarAlertas() {
  const alertasDiv = document.getElementById("alertasPagar");
  const deudas = obtenerDeudas();
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  alertasDiv.innerHTML = "";

  const pendientes = deudas.filter(d => Number(d.saldoPendiente || 0) > 0);

  if (pendientes.length === 0) {
    alertasDiv.innerHTML = `<div class="alert alert-success">🎉 No tienes pagos pendientes.</div>`;
    return;
  }

  const alertas = [];

  pendientes.forEach((d) => {
    // Pago único -> solo una alerta en su fecha
    if (d.tipoPago === "unico") {
      if (!d.fechaUnica) return;
      const fechaPago = new Date(d.fechaUnica);
      fechaPago.setHours(0, 0, 0, 0);

      const faltan = diasDiferencia(hoy, fechaPago);

      alertas.push({
        deudaId: d.id,
        acreedor: d.acreedor,
        saldoPendiente: d.saldoPendiente,
        cuotaValor: d.cuotaValor,
        tipoPago: d.tipoPago,
        periodoKey: "UNICO",
        periodoLabel: "Pago único",
        fecha: fechaPago,
        faltan
      });

      return;
    }

    // Cuotas -> periodos por mes
    const periodos = obtenerPeriodos(d.periodicidad);

    periodos.forEach((p) => {
      const dia = (d.periodicidad === "mensual")
        ? Number(d.diaPago)
        : p.dia;

      const fecha = fechaAjustadaDelMes(dia);
      const faltan = diasDiferencia(hoy, fecha);

      if (yaPagoPeriodoEsteMes(d, p.key)) return;

      alertas.push({
        deudaId: d.id,
        acreedor: d.acreedor,
        saldoPendiente: d.saldoPendiente,
        cuotaValor: d.cuotaValor,
        tipoPago: d.tipoPago,
        periodoKey: p.key,
        periodoLabel: p.label,
        fecha,
        faltan
      });
    });
  });

  if (alertas.length === 0) {
    alertasDiv.innerHTML = `<div class="alert alert-success">🎉 Este mes ya registraste todos los pagos.</div>`;
    return;
  }

  alertas.sort((a, b) => a.fecha - b.fecha);

  alertas.forEach((a) => {
    let clase = "alert-secondary";
    let texto = "";

    if (a.faltan > 5) {
      clase = "alert-secondary";
      texto = `📌 Debes pagar a ${a.acreedor}: ${a.periodoLabel} (faltan ${a.faltan} días)`;
    } else if (a.faltan >= 1 && a.faltan <= 5) {
      clase = "alert-warning";
      texto = `⚠️ Pago pronto a ${a.acreedor}: ${a.periodoLabel} (faltan ${a.faltan} días)`;
    } else if (a.faltan === 0) {
      clase = "alert-danger";
      texto = `🚨 HOY pagas a ${a.acreedor}: ${a.periodoLabel}`;
    } else {
      clase = "alert-danger";
      texto = `❌ Pago vencido a ${a.acreedor}: ${a.periodoLabel}`;
    }

    const valorTexto = (a.tipoPago === "cuotas")
      ? `Cuota: ${formatearCOP(a.cuotaValor)}`
      : `Pendiente: ${formatearCOP(a.saldoPendiente)}`;

    const alerta = document.createElement("div");
    alerta.className = `alert ${clase} mb-2 d-flex justify-content-between align-items-center gap-2 flex-wrap`;

    alerta.innerHTML = `
      <div>${texto} • ${valorTexto}</div>
      ${
        a.tipoPago === "cuotas"
          ? `<button class="btn btn-sm btn-success btn-abrir-pago" data-id="${a.deudaId}" data-periodo="${a.periodoKey}">
              Pagar
            </button>`
          : ""
      }
    `;

    alertasDiv.appendChild(alerta);
  });
}

/* ======================
   FORM UI
====================== */
function actualizarUIFormulario() {
  const periodicidad = document.getElementById("periodicidad").value;
  const contDia = document.getElementById("contenedorDiaPago");
  const diaPago = document.getElementById("diaPago");

  if (periodicidad === "mensual") {
    contDia.classList.remove("d-none");
    diaPago.required = true;
  } else {
    contDia.classList.add("d-none");
    diaPago.required = false;
    diaPago.value = "";
  }
}

function actualizarUITipoPago() {
  const tipoPago = document.getElementById("tipoPago").value;

  const cuota = document.getElementById("cuotaValor");
  const ayuda = document.getElementById("ayudaCuota");

  const contDia = document.getElementById("contenedorDiaPago");
  const contFecha = document.getElementById("contenedorFechaUnica");
  const fechaUnica = document.getElementById("fechaUnica");

  if (tipoPago === "unico") {
    cuota.disabled = false;
    ayuda.textContent = "Es el valor que vas a pagar (pago único).";

    contFecha.classList.remove("d-none");
    fechaUnica.required = true;

    contDia.classList.add("d-none");
    document.getElementById("diaPago").required = false;
  } else {
    fechaUnica.value = "";
    contFecha.classList.add("d-none");
    fechaUnica.required = false;

    cuota.disabled = false;
    ayuda.textContent = "Obligatorio si es cuotas.";

    actualizarUIFormulario();
  }
}

/* ======================
   EVENTOS
====================== */
document.getElementById("periodicidad").addEventListener("change", function () {
  actualizarUIFormulario();
});

document.getElementById("tipoPago").addEventListener("change", function () {
  actualizarUITipoPago();
});

document.getElementById("formPagar").addEventListener("submit", function (e) {
  e.preventDefault();

  const acreedor = document.getElementById("acreedor").value.trim();
  const descripcion = document.getElementById("descripcion").value.trim();
  const montoTotal = Number(document.getElementById("montoTotal").value);
  const periodicidad = document.getElementById("periodicidad").value;
  const tipoPago = document.getElementById("tipoPago").value;
  const cuotaValor = Number(document.getElementById("cuotaValor").value);
  const diaPago = Number(document.getElementById("diaPago").value);
  const fechaUnica = document.getElementById("fechaUnica").value;

  if (!acreedor) return alert("El acreedor es obligatorio");
  if (!montoTotal || montoTotal <= 0) return alert("Monto inválido");

  if (!cuotaValor || cuotaValor <= 0) {
    return alert("Ingresa un valor válido");
  }

  if (tipoPago === "cuotas") {
    if (periodicidad === "mensual") {
      if (!diaPago || diaPago < 1 || diaPago > 31) return alert("Día de pago inválido");
    }
  }

  if (tipoPago === "unico") {
    if (!fechaUnica) return alert("Selecciona la fecha de pago único");
  }

  const deudas = obtenerDeudas();

  deudas.push({
    id: Date.now(),
    acreedor,
    descripcion,
    montoTotal,
    saldoPendiente: montoTotal,
    tipoPago,
    periodicidad,
    diaPago: (tipoPago === "cuotas" && periodicidad === "mensual") ? diaPago : null,
    cuotaValor,
    fechaUnica: (tipoPago === "unico") ? fechaUnica : null,
    historialPagos: []
  });

  guardarDeudas(deudas);

  alert("Cuenta por pagar guardada ✅");
  this.reset();

  actualizarUIFormulario();
  actualizarUITipoPago();

  pintarLista();
  pintarAlertas();
});

document.addEventListener("click", function (e) {
  if (e.target.classList.contains("btn-abrir-pago")) {
    const id = e.target.getAttribute("data-id");
    const periodoKey = e.target.getAttribute("data-periodo");

    const deudas = obtenerDeudas();
    const deuda = deudas.find(d => String(d.id) === String(id));
    if (!deuda) return;

    if (Number(deuda.saldoPendiente || 0) <= 0) {
      alert("Esta cuenta por pagar ya está saldada ✅");
      return;
    }

    const periodo = obtenerPeriodos(deuda.periodicidad).find(p => p.key === periodoKey);
    if (!periodo) return;

    if (yaPagoPeriodoEsteMes(deuda, periodo.key)) {
      alert("Ese periodo ya fue pagado este mes ✅");
      return;
    }

    abrirModalPago(deuda, periodo);
  }

  if (e.target.classList.contains("btn-eliminar")) {
    const id = e.target.getAttribute("data-id");
    let deudas = obtenerDeudas();

    deudas = deudas.filter(d => String(d.id) !== String(id));
    guardarDeudas(deudas);

    pintarLista();
    pintarAlertas();
  }
});

document.getElementById("btnGuardarPago").addEventListener("click", function () {
  if (!deudaSeleccionada || !periodoSeleccionado) return;

  const cuentaId = document.getElementById("cuentaPagoModal").value;
  const fecha = document.getElementById("fechaPagoModal").value || hoyISO();
  const valor = Number(document.getElementById("valorPagoModal").value);

  if (!cuentaId) return alert("Selecciona una cuenta");
  if (!valor || valor <= 0) return alert("Ingresa un valor válido");

  const deudas = obtenerDeudas();
  const deuda = deudas.find(d => String(d.id) === String(deudaSeleccionada.id));
  if (!deuda) return;

  if (valor > Number(deuda.saldoPendiente || 0)) {
    return alert("El valor no puede ser mayor al saldo pendiente");
  }

  const ok = registrarEgresoEnCuenta(
    cuentaId,
    `Pago CXP (${periodoSeleccionado.key}): ${deuda.acreedor}`,
    fecha,
    valor
  );

  if (!ok) return;

  deuda.saldoPendiente = Number(deuda.saldoPendiente || 0) - valor;

  deuda.historialPagos = deuda.historialPagos || [];
  deuda.historialPagos.push({
    mes: obtenerMesActual(),
    fecha,
    valor,
    cuentaId,
    periodoKey: periodoSeleccionado.key
  });

  guardarDeudas(deudas);

  modalPago.hide();
  deudaSeleccionada = null;
  periodoSeleccionado = null;

  pintarLista();
  pintarAlertas();
});

/* INIT */
(function init() {
  modalPago = new bootstrap.Modal(document.getElementById("modalPagoCXP"));
  document.getElementById("fechaPagoModal").value = hoyISO();

  actualizarUIFormulario();
  actualizarUITipoPago();

  pintarLista();
  pintarAlertas();
})();
