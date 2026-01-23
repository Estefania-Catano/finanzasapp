function obtenerGastos() {
  return JSON.parse(localStorage.getItem("gastosFijos")) || [];
}

function guardarGastos(gastos) {
  localStorage.setItem("gastosFijos", JSON.stringify(gastos));
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

function fechaPagoDelMes(diaPago) {
  const hoy = new Date();
  const año = hoy.getFullYear();
  const mes = hoy.getMonth();

  const ultimoDiaMes = obtenerUltimoDiaMes(año, mes);
  const diaReal = Math.min(diaPago, ultimoDiaMes);

  return new Date(año, mes, diaReal);
}

function diasDiferencia(hoy, fechaPago) {
  const ms = fechaPago.getTime() - hoy.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

function yaPagadoEsteMes(gasto) {
  const mesActual = obtenerMesActual();
  return (gasto.historialPagos || []).some(p => p.mes === mesActual);
}

/* ===========================
   MODAL PAGAR
=========================== */
let modalPagar;
let gastoSeleccionado = null;

function cargarCuentasEnModal() {
  const select = document.getElementById("cuentaPagoModal");
  const ayuda = document.getElementById("ayudaCuentas");
  const cuentas = obtenerCuentas();

  select.innerHTML = `<option value="">Seleccione una cuenta</option>`;

  if (cuentas.length === 0) {
    ayuda.textContent = "No tienes cuentas creadas. Crea una cuenta para poder registrar pagos.";
    select.disabled = true;
    return;
  }

  ayuda.textContent = "";
  select.disabled = false;

  cuentas.forEach((c) => {
    const option = document.createElement("option");
    option.value = c.id;
    option.textContent = `${c.nombre} (${c.categoria})`;
    select.appendChild(option);
  });
}

function abrirModalPago(gasto) {
  gastoSeleccionado = gasto;

  document.getElementById("gastoId").value = gasto.id;
  document.getElementById("nombreGastoModal").value = gasto.nombre;
  document.getElementById("fechaPagoModal").value = hoyISO();

  cargarCuentasEnModal();

  const ayudaPago = document.getElementById("ayudaPagoModal");
  const inputValor = document.getElementById("valorPagoModal");

  if (gasto.tipoValor === "fijo") {
    inputValor.value = gasto.valor;
    inputValor.disabled = true;
    ayudaPago.textContent = `Este gasto es fijo: ${formatearCOP(gasto.valor)}`;
  } else {
    inputValor.value = "";
    inputValor.disabled = false;
    ayudaPago.textContent = "Este gasto es variable, escribe el valor pagado.";
  }

  document.getElementById("cuentaPagoModal").value = "";
  modalPagar.show();
}

/* ===========================
   REGISTRAR MOVIMIENTO EN CUENTA
=========================== */
function registrarPagoEnCuenta(cuentaId, gastoNombre, fecha, valorPago) {
  const cuentas = obtenerCuentas();
  const cuenta = cuentas.find(c => String(c.id) === String(cuentaId));

  if (!cuenta) {
    alert("No se encontró la cuenta seleccionada");
    return false;
  }

  cuenta.movimientos = cuenta.movimientos || [];

  cuenta.movimientos.push({
    fecha,
    tipo: "Egreso",
    descripcion: `Pago gasto fijo: ${gastoNombre}`,
    valor: Number(valorPago)
  });

  cuenta.saldo = Number(cuenta.saldo || 0) - Number(valorPago || 0);

  guardarCuentas(cuentas);
  return true;
}

/* ===========================
   UI
=========================== */
function pintarLista() {
  const lista = document.getElementById("listaGastos");
  const gastos = obtenerGastos();

  lista.innerHTML = "";

  if (gastos.length === 0) {
    lista.innerHTML = `<p class="text-muted">No tienes gastos fijos registrados.</p>`;
    return;
  }

  gastos.sort((a, b) => a.diaPago - b.diaPago);

  gastos.forEach((g) => {
    const pagado = yaPagadoEsteMes(g);

    const div = document.createElement("div");
    div.className = "border rounded p-3 mb-2";

    div.innerHTML = `
      <div class="d-flex justify-content-between align-items-start gap-3">
        <div>
          <strong>${g.nombre}</strong><br>
          <small class="text-muted">
            Día ${g.diaPago} • ${g.tipoValor === "fijo" ? "Valor fijo" : "Valor variable"}
          </small>
        </div>

        <div class="text-end">
          <div class="fw-bold">
            ${g.tipoValor === "fijo" ? formatearCOP(g.valor) : "Variable"}
          </div>

          <div class="mt-2 d-flex gap-2 justify-content-end flex-wrap">
            ${
              pagado
                ? `<span class="badge text-bg-success">Pagado este mes</span>`
                : `<button class="btn btn-sm btn-success btn-pagar" data-id="${g.id}">
                    Marcar pagado
                  </button>`
            }

            <button class="btn btn-sm btn-outline-danger btn-eliminar" data-id="${g.id}">
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
  const gastos = obtenerGastos();
  const hoy = new Date();

  hoy.setHours(0, 0, 0, 0);
  alertasDiv.innerHTML = "";

  if (gastos.length === 0) {
    alertasDiv.innerHTML = `<p class="text-muted">No hay alertas porque no tienes gastos fijos.</p>`;
    return;
  }

  gastos.sort((a, b) => a.diaPago - b.diaPago);

  let pendientes = 0;

  gastos.forEach((g) => {
    const pagado = yaPagadoEsteMes(g);
    if (pagado) return;

    pendientes++;

    const pagoMes = fechaPagoDelMes(g.diaPago);
    pagoMes.setHours(0, 0, 0, 0);

    const faltan = diasDiferencia(hoy, pagoMes);

    let texto = "";
    let clase = "alert-secondary";

    if (faltan > 5) {
      texto = `📌 ${g.nombre}: vence este mes (faltan ${faltan} días).`;
      clase = "alert-secondary";
    } else if (faltan >= 1 && faltan <= 5) {
      texto = `⚠️ ${g.nombre}: vence pronto (faltan ${faltan} días).`;
      clase = "alert-warning";
    } else if (faltan === 0) {
      texto = `🚨 ${g.nombre}: vence HOY.`;
      clase = "alert-danger";
    } else {
      texto = `❌ ${g.nombre}: está vencido (debía pagarse este mes).`;
      clase = "alert-danger";
    }

    const hoyTemp = new Date();
    const ultimoDiaMes = obtenerUltimoDiaMes(hoyTemp.getFullYear(), hoyTemp.getMonth());
    const diaReal = Math.min(g.diaPago, ultimoDiaMes);

    const ajusteTexto = (diaReal !== g.diaPago)
      ? ` (este mes se paga el ${diaReal})`
      : "";

    const valorTexto =
      g.tipoValor === "fijo"
        ? ` • Valor: ${formatearCOP(g.valor)}`
        : ` • Valor: Variable`;

    const alerta = document.createElement("div");
    alerta.className = `alert ${clase} mb-2 d-flex justify-content-between align-items-center gap-2 flex-wrap`;

    alerta.innerHTML = `
      <div>
        ${texto} Día programado: ${g.diaPago}${ajusteTexto}.${valorTexto}
      </div>
      <button class="btn btn-sm btn-success btn-pagar" data-id="${g.id}">
        Marcar pagado
      </button>
    `;

    alertasDiv.appendChild(alerta);
  });

  if (pendientes === 0) {
    alertasDiv.innerHTML = `<div class="alert alert-success">🎉 Todo está pagado este mes.</div>`;
  }
}

/* ===========================
   EVENTOS
=========================== */

// Crear gasto fijo
document.getElementById("formGastoFijo").addEventListener("submit", function (e) {
  e.preventDefault();

  const nombre = document.getElementById("nombre").value.trim();
  const diaPago = Number(document.getElementById("diaPago").value);
  const tipoValor = document.getElementById("tipoValor").value;
  const valorInput = document.getElementById("valor").value;

  if (!nombre) {
    alert("El nombre es obligatorio");
    return;
  }

  if (!diaPago || diaPago < 1 || diaPago > 31) {
    alert("El día de pago debe estar entre 1 y 31");
    return;
  }

  let valor = null;

  if (tipoValor === "fijo") {
    if (!valorInput || Number(valorInput) <= 0) {
      alert("Si el valor es fijo debes ingresar un valor válido");
      return;
    }
    valor = Number(valorInput);
  }

  const gastos = obtenerGastos();

  const nuevo = {
    id: Date.now(),
    nombre,
    diaPago,
    tipoValor,
    valor,
    historialPagos: []
  };

  gastos.push(nuevo);
  guardarGastos(gastos);

  alert("Gasto fijo guardado ✅");
  this.reset();

  pintarLista();
  pintarAlertas();
});

// Cambio tipo valor
document.getElementById("tipoValor").addEventListener("change", function () {
  const valorInput = document.getElementById("valor");
  const ayuda = document.getElementById("ayudaValor");

  if (this.value === "variable") {
    valorInput.value = "";
    valorInput.disabled = true;
    ayuda.textContent = "Como es variable, el valor se define al pagar.";
  } else {
    valorInput.disabled = false;
    ayuda.textContent = "Obligatorio si es fijo.";
  }
});

// Clicks: pagar / eliminar
document.addEventListener("click", function (e) {
  if (e.target.classList.contains("btn-pagar")) {
    const id = e.target.getAttribute("data-id");
    const gastos = obtenerGastos();
    const gasto = gastos.find(g => String(g.id) === String(id));

    if (!gasto) return;

    if (yaPagadoEsteMes(gasto)) {
      alert("Este gasto ya está pagado este mes ✅");
      return;
    }

    abrirModalPago(gasto);
  }

  if (e.target.classList.contains("btn-eliminar")) {
    const id = e.target.getAttribute("data-id");
    let gastos = obtenerGastos();

    gastos = gastos.filter(g => String(g.id) !== String(id));
    guardarGastos(gastos);

    pintarLista();
    pintarAlertas();
  }
});

// Guardar pago desde modal
document.getElementById("btnGuardarPago").addEventListener("click", function () {
  if (!gastoSeleccionado) return;

  const cuentaId = document.getElementById("cuentaPagoModal").value;
  if (!cuentaId) {
    alert("Selecciona una cuenta para registrar el pago");
    return;
  }

  const gastos = obtenerGastos();
  const gasto = gastos.find(g => String(g.id) === String(gastoSeleccionado.id));
  if (!gasto) return;

  if (yaPagadoEsteMes(gasto)) {
    alert("Este gasto ya está pagado este mes ✅");
    modalPagar.hide();
    return;
  }

  const fecha = document.getElementById("fechaPagoModal").value || hoyISO();
  const mes = obtenerMesActual();

  let valorPago = gasto.valor;

  if (gasto.tipoValor === "variable") {
    const valorInput = document.getElementById("valorPagoModal").value;
    if (!valorInput || Number(valorInput) <= 0) {
      alert("Ingresa un valor válido");
      return;
    }
    valorPago = Number(valorInput);
  }

  // 1) Registrar movimiento en cuenta y descontar saldo
  const ok = registrarPagoEnCuenta(cuentaId, gasto.nombre, fecha, valorPago);
  if (!ok) return;

  // 2) Guardar en historial del gasto fijo
  gasto.historialPagos = gasto.historialPagos || [];
  gasto.historialPagos.push({
    mes,
    fecha,
    valor: Number(valorPago),
    cuentaId: cuentaId
  });

  guardarGastos(gastos);

  modalPagar.hide();
  gastoSeleccionado = null;

  pintarLista();
  pintarAlertas();
});

// Inicial
(function init() {
  modalPagar = new bootstrap.Modal(document.getElementById("modalPagar"));
  document.getElementById("valor").disabled = false;
  pintarLista();
  pintarAlertas();
})();
