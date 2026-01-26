function obtenerCobros() {
  return JSON.parse(localStorage.getItem("cuentasPorCobrar")) || [];
}

function guardarCobros(data) {
  localStorage.setItem("cuentasPorCobrar", JSON.stringify(data));
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
function obtenerDiasPorPeriodicidad(periodicidad, diaMensual) {
  if (periodicidad === "quincenal") return [15, 30];
  if (periodicidad === "decadal") return [10, 20, 30];
  // mensual
  return [Number(diaMensual)];
}

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

function yaPagoPeriodoEsteMes(cobro, periodoKey) {
  const mes = obtenerMesActual();
  return (cobro.historialPagos || []).some(p => p.mes === mes && p.periodoKey === periodoKey);
}

/* ======================
   MODAL
====================== */
let modalPago;
let cobroSeleccionado = null;
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
    opt.textContent = `${c.nombre} (${c.categoria})`;
    select.appendChild(opt);
  });
}

function abrirModalPago(cobro, periodo) {
  cobroSeleccionado = cobro;
  periodoSeleccionado = periodo;

  document.getElementById("cobroId").value = cobro.id;
  document.getElementById("deudorModal").value = cobro.nombreDeudor;
  document.getElementById("periodoModal").value = periodo.label;
  document.getElementById("fechaPagoModal").value = hoyISO();
  document.getElementById("cuentaPagoModal").value = "";
  document.getElementById("valorPagoModal").value = "";

  cargarCuentasEnModal();

  const ayuda = document.getElementById("ayudaPago");
  const info = document.getElementById("infoPendiente");

  if (cobro.tipoPago === "cuotas") {
    ayuda.textContent = `Cuota sugerida: ${formatearCOP(cobro.cuotaValor)}`;
    document.getElementById("valorPagoModal").value = cobro.cuotaValor;
  } else {
    ayuda.textContent = `Pago único sugerido: ${formatearCOP(cobro.saldoPendiente)}`;
    document.getElementById("valorPagoModal").value = cobro.saldoPendiente;
  }

  info.textContent = `Saldo pendiente: ${formatearCOP(cobro.saldoPendiente)}`;

  modalPago.show();
}

/* ======================
   REGISTRAR EN CUENTA
====================== */
function registrarIngresoEnCuenta(cuentaId, descripcion, fecha, valor) {
  const cuentas = obtenerCuentas();
  const cuenta = cuentas.find(c => String(c.id) === String(cuentaId));

  if (!cuenta) {
    alert("No se encontró la cuenta seleccionada");
    return false;
  }

  cuenta.movimientos = cuenta.movimientos || [];

  cuenta.movimientos.push({
    fecha,
    tipo: "Ingreso",
    descripcion,
    valor: Number(valor)
  });

  cuenta.saldo = Number(cuenta.saldo || 0) + Number(valor || 0);

  guardarCuentas(cuentas);
  return true;
}

/* ======================
   UI
====================== */
function pintarLista() {
  const lista = document.getElementById("listaCobros");
  const cobros = obtenerCobros();

  lista.innerHTML = "";

  if (cobros.length === 0) {
    lista.innerHTML = `<p class="text-muted">No tienes cuentas por cobrar registradas.</p>`;
    return;
  }

  cobros.sort((a, b) => a.nombreDeudor.localeCompare(b.nombreDeudor));

  cobros.forEach((c) => {
    const completado = Number(c.saldoPendiente || 0) <= 0;

    const div = document.createElement("div");
    div.className = "border rounded p-3 mb-2";

    const periodos = obtenerPeriodos(c.periodicidad);

    div.innerHTML = `
      <div class="d-flex justify-content-between align-items-start gap-3 flex-wrap">
        <div>
          <strong>${c.nombreDeudor}</strong>
          <div class="text-muted small">${c.descripcion || ""}</div>

          <div class="small mt-1">
            Periodicidad: <strong>${c.periodicidad}</strong> •
            Tipo: <strong>${c.tipoPago === "cuotas" ? "Cuotas" : "Pago único"}</strong>
          </div>

          ${
            c.tipoPago === "cuotas"
              ? `<div class="small">Cuota: <strong>${formatearCOP(c.cuotaValor)}</strong></div>`
              : ""
          }
        </div>

        <div class="text-end">
          <div class="fw-bold">
            Pendiente: ${formatearCOP(c.saldoPendiente)}
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
                          <button class="dropdown-item btn-abrir-pago" data-id="${c.id}" data-periodo="${p.key}">
                            ${p.label}
                          </button>
                        </li>
                      `).join("")}
                    </ul>
                  </div>
                `
            }

            <button class="btn btn-sm btn-outline-danger btn-eliminar" data-id="${c.id}">
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
  const alertasDiv = document.getElementById("alertas");
  const cobros = obtenerCobros();
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  alertasDiv.innerHTML = "";

  const pendientes = cobros.filter(c => Number(c.saldoPendiente || 0) > 0);

  if (pendientes.length === 0) {
    alertasDiv.innerHTML = `<div class="alert alert-success">🎉 No tienes cuentas por cobrar pendientes.</div>`;
    return;
  }

  const alertas = [];

  pendientes.forEach((c) => {
    const periodos = obtenerPeriodos(c.periodicidad);

    periodos.forEach((p) => {
      const dia = (c.periodicidad === "mensual")
        ? Number(c.diaPago)
        : p.dia;

      const fecha = fechaAjustadaDelMes(dia);
      const faltan = diasDiferencia(hoy, fecha);

      if (yaPagoPeriodoEsteMes(c, p.key)) return;

      alertas.push({
        cobroId: c.id,
        nombreDeudor: c.nombreDeudor,
        saldoPendiente: c.saldoPendiente,
        cuotaValor: c.cuotaValor,
        tipoPago: c.tipoPago,
        periodoKey: p.key,
        periodoLabel: p.label,
        dia,
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
      texto = `📌 ${a.nombreDeudor}: ${a.periodoLabel} (faltan ${a.faltan} días)`;
    } else if (a.faltan >= 1 && a.faltan <= 5) {
      clase = "alert-warning";
      texto = `⚠️ ${a.nombreDeudor}: ${a.periodoLabel} (faltan ${a.faltan} días)`;
    } else if (a.faltan === 0) {
      clase = "alert-success";
      texto = `💰 ${a.nombreDeudor}: ${a.periodoLabel} es HOY`;
    } else {
      clase = "alert-danger";
      texto = `❌ ${a.nombreDeudor}: ${a.periodoLabel} está vencido`;
    }

    const valorTexto = (a.tipoPago === "cuotas")
      ? `Cuota: ${formatearCOP(a.cuotaValor)}`
      : `Pendiente: ${formatearCOP(a.saldoPendiente)}`;

    const alerta = document.createElement("div");
    alerta.className = `alert ${clase} mb-2 d-flex justify-content-between align-items-center gap-2 flex-wrap`;

    alerta.innerHTML = `
      <div>${texto} • ${valorTexto}</div>
      <button class="btn btn-sm btn-success btn-abrir-pago" data-id="${a.cobroId}" data-periodo="${a.periodoKey}">
        Registrar pago
      </button>
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
    contDia.style.display = "block";
    diaPago.required = true;
  } else {
    contDia.style.display = "none";
    diaPago.required = false;
    diaPago.value = "";
  }
}

function actualizarUITipoPago() {
  const tipoPago = document.getElementById("tipoPago").value;
  const cuota = document.getElementById("cuotaValor");
  const ayuda = document.getElementById("ayudaCuota");

  if (tipoPago === "unico") {
    cuota.value = "";
    cuota.disabled = true;
    ayuda.textContent = "No aplica para pago único.";
  } else {
    cuota.disabled = false;
    ayuda.textContent = "Obligatorio si es cuotas.";
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

document.getElementById("formCobro").addEventListener("submit", function (e) {
  e.preventDefault();

  const nombreDeudor = document.getElementById("nombreDeudor").value.trim();
  const descripcion = document.getElementById("descripcion").value.trim();
  const montoPrestado = Number(document.getElementById("montoPrestado").value);
  const periodicidad = document.getElementById("periodicidad").value;
  const tipoPago = document.getElementById("tipoPago").value;
  const cuotaValor = Number(document.getElementById("cuotaValor").value);
  const diaPago = Number(document.getElementById("diaPago").value);

  if (!nombreDeudor) {
    alert("El nombre es obligatorio");
    return;
  }

  if (!montoPrestado || montoPrestado <= 0) {
    alert("Ingresa un monto válido");
    return;
  }

  if (tipoPago === "cuotas") {
    if (!cuotaValor || cuotaValor <= 0) {
      alert("Ingresa un valor de cuota válido");
      return;
    }
  }

  if (periodicidad === "mensual") {
    if (!diaPago || diaPago < 1 || diaPago > 31) {
      alert("El día de pago debe estar entre 1 y 31");
      return;
    }
  }

  const cobros = obtenerCobros();

  cobros.push({
    id: Date.now(),
    nombreDeudor,
    descripcion,
    montoPrestado,
    saldoPendiente: montoPrestado,
    tipoPago,
    periodicidad,
    diaPago: periodicidad === "mensual" ? diaPago : null,
    cuotaValor: tipoPago === "cuotas" ? cuotaValor : null,
    historialPagos: []
  });

  guardarCobros(cobros);

  alert("Cuenta por cobrar guardada ✅");
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

    const cobros = obtenerCobros();
    const cobro = cobros.find(c => String(c.id) === String(id));
    if (!cobro) return;

    if (Number(cobro.saldoPendiente || 0) <= 0) {
      alert("Esta cuenta por cobrar ya está saldada ✅");
      return;
    }

    const periodo = obtenerPeriodos(cobro.periodicidad).find(p => p.key === periodoKey);
    if (!periodo) return;

    if (yaPagoPeriodoEsteMes(cobro, periodo.key)) {
      alert("Ese periodo ya fue pagado este mes ✅");
      return;
    }

    abrirModalPago(cobro, periodo);
  }

  if (e.target.classList.contains("btn-eliminar")) {
    const id = e.target.getAttribute("data-id");
    let cobros = obtenerCobros();

    cobros = cobros.filter(c => String(c.id) !== String(id));
    guardarCobros(cobros);

    pintarLista();
    pintarAlertas();
  }
});

document.getElementById("btnGuardarPago").addEventListener("click", function () {
  if (!cobroSeleccionado || !periodoSeleccionado) return;

  const cuentaId = document.getElementById("cuentaPagoModal").value;
  const fecha = document.getElementById("fechaPagoModal").value || hoyISO();
  const valor = Number(document.getElementById("valorPagoModal").value);

  if (!cuentaId) {
    alert("Selecciona una cuenta");
    return;
  }

  if (!valor || valor <= 0) {
    alert("Ingresa un valor válido");
    return;
  }

  const cobros = obtenerCobros();
  const cobro = cobros.find(c => String(c.id) === String(cobroSeleccionado.id));
  if (!cobro) return;

  if (valor > Number(cobro.saldoPendiente || 0)) {
    alert("El valor no puede ser mayor al saldo pendiente");
    return;
  }

  const ok = registrarIngresoEnCuenta(
    cuentaId,
    `Pago CXC (${periodoSeleccionado.key}): ${cobro.nombreDeudor}`,
    fecha,
    valor
  );

  if (!ok) return;

  cobro.saldoPendiente = Number(cobro.saldoPendiente || 0) - valor;

  cobro.historialPagos = cobro.historialPagos || [];
  cobro.historialPagos.push({
    mes: obtenerMesActual(),
    fecha,
    valor,
    cuentaId,
    periodoKey: periodoSeleccionado.key
  });

  guardarCobros(cobros);

  modalPago.hide();
  cobroSeleccionado = null;
  periodoSeleccionado = null;

  pintarLista();
  pintarAlertas();
});

/* INIT */
(function init() {
  modalPago = new bootstrap.Modal(document.getElementById("modalPago"));
  document.getElementById("fechaPagoModal").value = hoyISO();

  actualizarUIFormulario();
  actualizarUITipoPago();

  pintarLista();
  pintarAlertas();
})();
