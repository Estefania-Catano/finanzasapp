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

function yaPagoEsteMes(cobro) {
  const mes = obtenerMesActual();
  return (cobro.historialPagos || []).some(p => p.mes === mes);
}

/* ======================
   MODAL
====================== */
let modalPago;
let cobroSeleccionado = null;

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

function abrirModalPago(cobro) {
  cobroSeleccionado = cobro;

  document.getElementById("cobroId").value = cobro.id;
  document.getElementById("deudorModal").value = cobro.nombreDeudor;
  document.getElementById("fechaPagoModal").value = hoyISO();
  document.getElementById("cuentaPagoModal").value = "";
  document.getElementById("valorPagoModal").value = "";

  cargarCuentasEnModal();

  const ayuda = document.getElementById("ayudaPago");
  const info = document.getElementById("infoPendiente");

  if (cobro.tipoPago === "cuotas") {
    ayuda.textContent = `Cuota sugerida: ${formatearCOP(cobro.cuotaMensual)}`;
    document.getElementById("valorPagoModal").value = cobro.cuotaMensual;
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

  cobros.sort((a, b) => a.diaPago - b.diaPago);

  cobros.forEach((c) => {
    const completado = Number(c.saldoPendiente || 0) <= 0;

    const div = document.createElement("div");
    div.className = "border rounded p-3 mb-2";

    div.innerHTML = `
      <div class="d-flex justify-content-between align-items-start gap-3">
        <div>
          <strong>${c.nombreDeudor}</strong>
          <div class="text-muted small">${c.descripcion || ""}</div>
          <div class="small mt-1">
            Día de pago: <strong>${c.diaPago}</strong> •
            Tipo: <strong>${c.tipoPago === "cuotas" ? "Cuotas" : "Pago único"}</strong>
          </div>
        </div>

        <div class="text-end">
          <div class="fw-bold">
            Pendiente: ${formatearCOP(c.saldoPendiente)}
          </div>

          <div class="mt-2 d-flex gap-2 justify-content-end flex-wrap">
            ${
              completado
                ? `<span class="badge text-bg-success">Pagado completo</span>`
                : `<button class="btn btn-sm btn-success btn-recibir" data-id="${c.id}">
                    Registrar pago
                  </button>`
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

  pendientes.sort((a, b) => a.diaPago - b.diaPago);

  pendientes.forEach((c) => {
    if (yaPagoEsteMes(c)) return;

    const fecha = fechaAjustadaDelMes(c.diaPago);
    const faltan = diasDiferencia(hoy, fecha);

    let clase = "alert-secondary";
    let texto = "";

    if (faltan > 5) {
      clase = "alert-secondary";
      texto = `📌 ${c.nombreDeudor}: debe pagar este mes (faltan ${faltan} días)`;
    } else if (faltan >= 1 && faltan <= 5) {
      clase = "alert-warning";
      texto = `⚠️ ${c.nombreDeudor}: pago pronto (faltan ${faltan} días)`;
    } else if (faltan === 0) {
      clase = "alert-success";
      texto = `💰 ${c.nombreDeudor}: paga HOY`;
    } else {
      clase = "alert-danger";
      texto = `❌ ${c.nombreDeudor}: está vencido este mes`;
    }

    const alerta = document.createElement("div");
    alerta.className = `alert ${clase} mb-2 d-flex justify-content-between align-items-center gap-2 flex-wrap`;

    alerta.innerHTML = `
      <div>${texto} • Pendiente: ${formatearCOP(c.saldoPendiente)}</div>
      <button class="btn btn-sm btn-success btn-recibir" data-id="${c.id}">Registrar pago</button>
    `;

    alertasDiv.appendChild(alerta);
  });
}

/* ======================
   EVENTOS
====================== */
document.getElementById("tipoPago").addEventListener("change", function () {
  const cuota = document.getElementById("cuotaMensual");
  const ayuda = document.getElementById("ayudaCuota");

  if (this.value === "unico") {
    cuota.value = "";
    cuota.disabled = true;
    ayuda.textContent = "No aplica para pago único.";
  } else {
    cuota.disabled = false;
    ayuda.textContent = "Obligatorio si es cuotas.";
  }
});

document.getElementById("formCobro").addEventListener("submit", function (e) {
  e.preventDefault();

  const nombreDeudor = document.getElementById("nombreDeudor").value.trim();
  const descripcion = document.getElementById("descripcion").value.trim();
  const montoPrestado = Number(document.getElementById("montoPrestado").value);
  const tipoPago = document.getElementById("tipoPago").value;
  const cuotaMensual = Number(document.getElementById("cuotaMensual").value);
  const diaPago = Number(document.getElementById("diaPago").value);

  if (!nombreDeudor) {
    alert("El nombre es obligatorio");
    return;
  }

  if (!montoPrestado || montoPrestado <= 0) {
    alert("Ingresa un monto válido");
    return;
  }

  if (!diaPago || diaPago < 1 || diaPago > 31) {
    alert("El día debe estar entre 1 y 31");
    return;
  }

  if (tipoPago === "cuotas") {
    if (!cuotaMensual || cuotaMensual <= 0) {
      alert("Ingresa una cuota mensual válida");
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
    cuotaMensual: tipoPago === "cuotas" ? cuotaMensual : null,
    diaPago,
    historialPagos: []
  });

  guardarCobros(cobros);

  alert("Cuenta por cobrar guardada ✅");
  this.reset();

  // reset cuota
  document.getElementById("cuotaMensual").disabled = false;
  document.getElementById("ayudaCuota").textContent = "Obligatorio si es cuotas.";

  pintarLista();
  pintarAlertas();
});

document.addEventListener("click", function (e) {
  if (e.target.classList.contains("btn-recibir")) {
    const id = e.target.getAttribute("data-id");
    const cobros = obtenerCobros();
    const cobro = cobros.find(c => String(c.id) === String(id));

    if (!cobro) return;

    if (Number(cobro.saldoPendiente || 0) <= 0) {
      alert("Esta cuenta por cobrar ya está saldada ✅");
      return;
    }

    abrirModalPago(cobro);
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
  if (!cobroSeleccionado) return;

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

  // registrar movimiento ingreso
  const ok = registrarIngresoEnCuenta(
    cuentaId,
    `Pago cuenta por cobrar: ${cobro.nombreDeudor}`,
    fecha,
    valor
  );

  if (!ok) return;

  // bajar saldo pendiente
  cobro.saldoPendiente = Number(cobro.saldoPendiente || 0) - valor;

  // historial
  cobro.historialPagos = cobro.historialPagos || [];
  cobro.historialPagos.push({
    mes: obtenerMesActual(),
    fecha,
    valor,
    cuentaId
  });

  guardarCobros(cobros);

  modalPago.hide();
  cobroSeleccionado = null;

  pintarLista();
  pintarAlertas();
});

/* INIT */
(function init() {
  modalPago = new bootstrap.Modal(document.getElementById("modalPago"));
  document.getElementById("fechaPagoModal").value = hoyISO();
  pintarLista();
  pintarAlertas();
})();
