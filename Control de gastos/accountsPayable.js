function obtenerDeudas() {
  return JSON.parse(localStorage.getItem("cuentasPorPagar")) || [];
}

function guardarDeudas(data) {
  localStorage.setItem("cuentasPorPagar", JSON.stringify(data));
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

  deudas.forEach((d) => {
    const completado = Number(d.saldoPendiente || 0) <= 0;

    const div = document.createElement("div");
    div.className = "border rounded p-3 mb-2";

    div.innerHTML = `
      <div class="d-flex justify-content-between align-items-start gap-3">
        <div>
          <strong>${d.acreedor}</strong>
          <div class="text-muted small">${d.descripcion || ""}</div>
          <div class="small mt-1">
            Tipo: <strong>${d.tipoPago}</strong> • Frecuencia: <strong>${d.frecuencia || "N/A"}</strong>
          </div>
        </div>

        <div class="text-end">
          <div class="fw-bold">
            Pendiente: ${formatearCOP(d.saldoPendiente)}
          </div>

          <div class="mt-2">
            ${
              completado
                ? `<span class="badge text-bg-success">Pagado completo</span>`
                : `<span class="badge text-bg-warning">Pendiente</span>`
            }
            <button class="btn btn-sm btn-outline-danger ms-2 btn-eliminar" data-id="${d.id}">
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

  pendientes.forEach((d) => {
    let fechaPago = null;

    if (d.tipoPago === "unico") {
      fechaPago = new Date(d.fechaUnica);
    }

    if (d.tipoPago === "cuotas" && d.frecuencia === "mensual") {
      fechaPago = fechaAjustadaDelMes(d.diaPago);
    }

    if (!fechaPago) return;

    const faltan = diasDiferencia(hoy, fechaPago);

    let clase = "alert-secondary";
    let texto = "";

    if (faltan > 5) {
      texto = `📌 Debes pagar a ${d.acreedor} este mes`;
    } else if (faltan >= 1 && faltan <= 5) {
      clase = "alert-warning";
      texto = `⚠️ Pago pronto a ${d.acreedor} (faltan ${faltan} días)`;
    } else if (faltan === 0) {
      clase = "alert-success";
      texto = `💰 HOY pagas a ${d.acreedor}`;
    } else {
      clase = "alert-danger";
      texto = `❌ Pago vencido a ${d.acreedor}`;
    }

    alertasDiv.innerHTML += `
      <div class="alert ${clase} mb-2">
        ${texto} • Pendiente: ${formatearCOP(d.saldoPendiente)}
      </div>
    `;
  });
}

/* ======================
   EVENTOS
====================== */
document.getElementById("tipoPago").addEventListener("change", function () {
  const grupoFecha = document.getElementById("grupoFechaUnica");
  const grupoDia = document.getElementById("grupoDiaPago");

  if (this.value === "unico") {
    grupoFecha.classList.remove("d-none");
    grupoDia.classList.add("d-none");
  } else {
    grupoFecha.classList.add("d-none");
    grupoDia.classList.remove("d-none");
  }
});

document.getElementById("formPagar").addEventListener("submit", function (e) {
  e.preventDefault();

  const acreedor = document.getElementById("acreedor").value.trim();
  const descripcion = document.getElementById("descripcion").value.trim();
  const montoTotal = Number(document.getElementById("montoTotal").value);
  const tipoPago = document.getElementById("tipoPago").value;
  const frecuencia = document.getElementById("frecuencia").value;
  const valorCuota = Number(document.getElementById("valorCuota").value);
  const diaPago = Number(document.getElementById("diaPago").value);
  const fechaUnica = document.getElementById("fechaUnica").value;

  if (!acreedor) return alert("El acreedor es obligatorio");
  if (!montoTotal || montoTotal <= 0) return alert("Monto inválido");

  if (tipoPago === "cuotas") {
    if (!valorCuota || valorCuota <= 0) return alert("Ingresa el valor de la cuota");
    if (frecuencia === "mensual" && (!diaPago || diaPago < 1 || diaPago > 31)) {
      return alert("Día de pago inválido");
    }
  }

  if (tipoPago === "unico") {
    if (!fechaUnica) return alert("Selecciona la fecha de pago");
    if (!valorCuota || valorCuota <= 0) return alert("Ingresa el valor a pagar");
  }

  const deudas = obtenerDeudas();

  deudas.push({
    id: Date.now(),
    acreedor,
    descripcion,
    montoTotal,
    saldoPendiente: montoTotal,
    tipoPago,
    frecuencia: tipoPago === "cuotas" ? frecuencia : null,
    valorCuota: valorCuota || null,
    diaPago: tipoPago === "cuotas" && frecuencia === "mensual" ? diaPago : null,
    fechaUnica: tipoPago === "unico" ? fechaUnica : null
  });

  guardarDeudas(deudas);

  alert("Cuenta por pagar guardada ✅");
  this.reset();

  pintarLista();
  pintarAlertas();
});

document.addEventListener("click", function (e) {
  if (e.target.classList.contains("btn-eliminar")) {
    const id = e.target.getAttribute("data-id");
    let deudas = obtenerDeudas();

    deudas = deudas.filter(d => String(d.id) !== String(id));
    guardarDeudas(deudas);

    pintarLista();
    pintarAlertas();
  }
});

/* INIT */
(function init() {
  pintarLista();
  pintarAlertas();
})();
