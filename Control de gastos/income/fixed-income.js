function obtenerIngresos() {
  return JSON.parse(localStorage.getItem("ingresosFijos")) || [];
}

function guardarIngresos(ingresos) {
  localStorage.setItem("ingresosFijos", JSON.stringify(ingresos));
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

function fechaIngresoDelMes(diaIngreso) {
  const hoy = new Date();
  const año = hoy.getFullYear();
  const mes = hoy.getMonth();

  const ultimoDiaMes = obtenerUltimoDiaMes(año, mes);
  const diaReal = Math.min(diaIngreso, ultimoDiaMes);

  return new Date(año, mes, diaReal);
}

function diasDiferencia(hoy, fecha) {
  const ms = fecha.getTime() - hoy.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

function yaRecibidoEsteMes(ingreso) {
  const mesActual = obtenerMesActual();
  return (ingreso.historialRecibidos || []).some(p => p.mes === mesActual);
}

/* MODAL */
let modalRecibir;
let ingresoSeleccionado = null;

function cargarCuentasEnModal() {
  const select = document.getElementById("cuentaIngresoModal");
  const ayuda = document.getElementById("ayudaCuentas");
  const cuentas = obtenerCuentas();

  select.innerHTML = `<option value="">Seleccione una cuenta</option>`;

  if (cuentas.length === 0) {
    ayuda.textContent = "No tienes cuentas creadas. Crea una cuenta para registrar ingresos.";
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

function abrirModalIngreso(ingreso) {
  ingresoSeleccionado = ingreso;

  document.getElementById("ingresoId").value = ingreso.id;
  document.getElementById("nombreIngresoModal").value = ingreso.nombre;
  document.getElementById("fechaIngresoModal").value = hoyISO();

  cargarCuentasEnModal();

  const ayuda = document.getElementById("ayudaIngresoModal");
  const inputValor = document.getElementById("valorIngresoModal");

  if (ingreso.tipoValor === "fijo") {
    inputValor.value = ingreso.valor;
    inputValor.disabled = true;
    ayuda.textContent = `Ingreso fijo: ${formatearCOP(ingreso.valor)}`;
  } else {
    inputValor.value = "";
    inputValor.disabled = false;
    ayuda.textContent = "Ingreso variable: escribe el valor recibido.";
  }

  document.getElementById("cuentaIngresoModal").value = "";
  modalRecibir.show();
}

/* REGISTRAR MOVIMIENTO */
function registrarIngresoEnCuenta(cuentaId, nombreIngreso, fecha, valor) {
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
    descripcion: `Ingreso fijo: ${nombreIngreso}`,
    valor: Number(valor)
  });

  cuenta.saldo = Number(cuenta.saldo || 0) + Number(valor || 0);

  guardarCuentas(cuentas);
  return true;
}

/* UI */
function pintarLista() {
  const lista = document.getElementById("listaIngresos");
  const ingresos = obtenerIngresos();

  lista.innerHTML = "";

  if (ingresos.length === 0) {
    lista.innerHTML = `<p class="text-muted">No tienes ingresos fijos registrados.</p>`;
    return;
  }

  ingresos.sort((a, b) => a.diaIngreso - b.diaIngreso);

  ingresos.forEach((i) => {
    const recibido = yaRecibidoEsteMes(i);

    const div = document.createElement("div");
    div.className = "border rounded p-3 mb-2";

    div.innerHTML = `
      <div class="d-flex justify-content-between align-items-start gap-3">
        <div>
          <strong>${i.nombre}</strong><br>
          <small class="text-muted">
            Día ${i.diaIngreso} • ${i.tipoValor === "fijo" ? "Valor fijo" : "Valor variable"}
          </small>
        </div>

        <div class="text-end">
          <div class="fw-bold">
            ${i.tipoValor === "fijo" ? formatearCOP(i.valor) : "Variable"}
          </div>

          <div class="mt-2 d-flex gap-2 justify-content-end flex-wrap">
            ${
              recibido
                ? `<span class="badge text-bg-success">Recibido este mes</span>`
                : `<button class="btn btn-sm btn-success btn-recibir" data-id="${i.id}">
                    Marcar recibido
                  </button>`
            }

            <button class="btn btn-sm btn-outline-danger btn-eliminar" data-id="${i.id}">
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
  const ingresos = obtenerIngresos();
  const hoy = new Date();

  hoy.setHours(0, 0, 0, 0);
  alertasDiv.innerHTML = "";

  if (ingresos.length === 0) {
    alertasDiv.innerHTML = `<p class="text-muted">No hay alertas porque no tienes ingresos fijos.</p>`;
    return;
  }

  ingresos.sort((a, b) => a.diaIngreso - b.diaIngreso);

  let pendientes = 0;

  ingresos.forEach((i) => {
    const recibido = yaRecibidoEsteMes(i);
    if (recibido) return;

    pendientes++;

    const fecha = fechaIngresoDelMes(i.diaIngreso);
    fecha.setHours(0, 0, 0, 0);

    const faltan = diasDiferencia(hoy, fecha);

    let texto = "";
    let clase = "alert-secondary";

    if (faltan > 5) {
      texto = `📌 ${i.nombre}: llega este mes (faltan ${faltan} días).`;
      clase = "alert-secondary";
    } else if (faltan >= 1 && faltan <= 5) {
      texto = `⚠️ ${i.nombre}: llega pronto (faltan ${faltan} días).`;
      clase = "alert-warning";
    } else if (faltan === 0) {
      texto = `💰 ${i.nombre}: llega HOY.`;
      clase = "alert-success";
    } else {
      texto = `⏳ ${i.nombre}: ya debía llegar este mes.`;
      clase = "alert-danger";
    }

    const hoyTemp = new Date();
    const ultimoDiaMes = obtenerUltimoDiaMes(hoyTemp.getFullYear(), hoyTemp.getMonth());
    const diaReal = Math.min(i.diaIngreso, ultimoDiaMes);

    const ajusteTexto = (diaReal !== i.diaIngreso)
      ? ` (este mes llega el ${diaReal})`
      : "";

    const valorTexto =
      i.tipoValor === "fijo"
        ? ` • Valor: ${formatearCOP(i.valor)}`
        : ` • Valor: Variable`;

    const alerta = document.createElement("div");
    alerta.className = `alert ${clase} mb-2 d-flex justify-content-between align-items-center gap-2 flex-wrap`;

    alerta.innerHTML = `
      <div>
        ${texto} Día programado: ${i.diaIngreso}${ajusteTexto}.${valorTexto}
      </div>
      <button class="btn btn-sm btn-success btn-recibir" data-id="${i.id}">
        Marcar recibido
      </button>
    `;

    alertasDiv.appendChild(alerta);
  });

  if (pendientes === 0) {
    alertasDiv.innerHTML = `<div class="alert alert-success">🎉 Todos los ingresos ya fueron recibidos este mes.</div>`;
  }
}

/* EVENTOS */
document.getElementById("formIngresoFijo").addEventListener("submit", function (e) {
  e.preventDefault();

  const nombre = document.getElementById("nombre").value.trim();
  const diaIngreso = Number(document.getElementById("diaIngreso").value);
  const tipoValor = document.getElementById("tipoValor").value;
  const valorInput = document.getElementById("valor").value;

  if (!nombre) {
    alert("El nombre es obligatorio");
    return;
  }

  if (!diaIngreso || diaIngreso < 1 || diaIngreso > 31) {
    alert("El día debe estar entre 1 y 31");
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

  const ingresos = obtenerIngresos();

  ingresos.push({
    id: Date.now(),
    nombre,
    diaIngreso,
    tipoValor,
    valor,
    historialRecibidos: []
  });

  guardarIngresos(ingresos);

  alert("Ingreso fijo guardado ✅");
  this.reset();

  pintarLista();
  pintarAlertas();
});

document.getElementById("tipoValor").addEventListener("change", function () {
  const valorInput = document.getElementById("valor");
  const ayuda = document.getElementById("ayudaValor");

  if (this.value === "variable") {
    valorInput.value = "";
    valorInput.disabled = true;
    ayuda.textContent = "Como es variable, el valor se define al recibir.";
  } else {
    valorInput.disabled = false;
    ayuda.textContent = "Obligatorio si es fijo.";
  }
});

document.addEventListener("click", function (e) {
  if (e.target.classList.contains("btn-recibir")) {
    const id = e.target.getAttribute("data-id");
    const ingresos = obtenerIngresos();
    const ingreso = ingresos.find(i => String(i.id) === String(id));

    if (!ingreso) return;

    if (yaRecibidoEsteMes(ingreso)) {
      alert("Este ingreso ya fue recibido este mes ✅");
      return;
    }

    abrirModalIngreso(ingreso);
  }

  if (e.target.classList.contains("btn-eliminar")) {
    const id = e.target.getAttribute("data-id");
    let ingresos = obtenerIngresos();

    ingresos = ingresos.filter(i => String(i.id) !== String(id));
    guardarIngresos(ingresos);

    pintarLista();
    pintarAlertas();
  }
});

document.getElementById("btnGuardarIngreso").addEventListener("click", function () {
  if (!ingresoSeleccionado) return;

  const cuentaId = document.getElementById("cuentaIngresoModal").value;
  if (!cuentaId) {
    alert("Selecciona una cuenta para registrar el ingreso");
    return;
  }

  const ingresos = obtenerIngresos();
  const ingreso = ingresos.find(i => String(i.id) === String(ingresoSeleccionado.id));
  if (!ingreso) return;

  if (yaRecibidoEsteMes(ingreso)) {
    alert("Este ingreso ya fue recibido este mes ✅");
    modalRecibir.hide();
    return;
  }

  const fecha = document.getElementById("fechaIngresoModal").value || hoyISO();
  const mes = obtenerMesActual();

  let valorRecibido = ingreso.valor;

  if (ingreso.tipoValor === "variable") {
    const valorInput = document.getElementById("valorIngresoModal").value;
    if (!valorInput || Number(valorInput) <= 0) {
      alert("Ingresa un valor válido");
      return;
    }
    valorRecibido = Number(valorInput);
  }

  const ok = registrarIngresoEnCuenta(cuentaId, ingreso.nombre, fecha, valorRecibido);
  if (!ok) return;

  ingreso.historialRecibidos = ingreso.historialRecibidos || [];
  ingreso.historialRecibidos.push({
    mes,
    fecha,
    valor: Number(valorRecibido),
    cuentaId
  });

  guardarIngresos(ingresos);

  modalRecibir.hide();
  ingresoSeleccionado = null;

  pintarLista();
  pintarAlertas();
});

/* INIT */
(function init() {
  modalRecibir = new bootstrap.Modal(document.getElementById("modalRecibir"));
  document.getElementById("valor").disabled = false;
  pintarLista();
  pintarAlertas();
})();
