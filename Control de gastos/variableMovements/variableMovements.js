function obtenerMovimientos() {
  return JSON.parse(localStorage.getItem("movimientosVariables")) || [];
}

function guardarMovimientos(data) {
  localStorage.setItem("movimientosVariables", JSON.stringify(data));
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

/* ======================
   CUENTAS SELECT
====================== */
function cargarCuentasEnSelect() {
  const select = document.getElementById("cuentaId");
  const ayuda = document.getElementById("ayudaCuenta");
  const cuentas = obtenerCuentas();

  select.innerHTML = `<option value="">Seleccione una cuenta</option>`;

  if (cuentas.length === 0) {
    ayuda.textContent = "No tienes cuentas creadas. Crea una cuenta primero.";
    select.disabled = true;
    return;
  }

  ayuda.textContent = "";
  select.disabled = false;

  cuentas.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = `${c.nombre} (${c.categoria}) - ${formatearCOP(c.saldo)}`;
    select.appendChild(opt);
  });
}

function actualizarLabelCuenta() {
  const tipo = document.getElementById("tipo").value;
  const label = document.getElementById("labelCuenta");

  if (tipo === "gasto") label.textContent = "Cuenta de donde pagaste";
  else label.textContent = "Cuenta donde entró el dinero";
}

/* ======================
   MOVIMIENTO EN CUENTA
====================== */
function registrarMovimientoEnCuenta(cuentaId, tipo, descripcion, fecha, valor) {
  const cuentas = obtenerCuentas();
  const cuenta = cuentas.find(c => String(c.id) === String(cuentaId));

  if (!cuenta) {
    alert("No se encontró la cuenta seleccionada");
    return false;
  }

  cuenta.movimientos = cuenta.movimientos || [];

  if (tipo === "gasto") {
    const saldoActual = Number(cuenta.saldo || 0);
    if (Number(valor) > saldoActual) {
      alert("⚠️ No tienes saldo suficiente en esa cuenta.");
      return false;
    }

    cuenta.movimientos.push({
      fecha,
      tipo: "Egreso",
      descripcion,
      valor: Number(valor)
    });

    cuenta.saldo = saldoActual - Number(valor);
  }

  if (tipo === "ingreso") {
    cuenta.movimientos.push({
      fecha,
      tipo: "Ingreso",
      descripcion,
      valor: Number(valor)
    });

    cuenta.saldo = Number(cuenta.saldo || 0) + Number(valor);
  }

  guardarCuentas(cuentas);
  return true;
}

/* ======================
   UI
====================== */
function pintarResumen() {
  const movimientos = obtenerMovimientos();

  const totalIngresos = movimientos
    .filter(m => m.tipo === "ingreso")
    .reduce((acc, m) => acc + Number(m.valor || 0), 0);

  const totalGastos = movimientos
    .filter(m => m.tipo === "gasto")
    .reduce((acc, m) => acc + Number(m.valor || 0), 0);

  const balance = totalIngresos - totalGastos;

  document.getElementById("totalIngresosVar").textContent = formatearCOP(totalIngresos);
  document.getElementById("totalGastosVar").textContent = formatearCOP(totalGastos);
  document.getElementById("balanceVar").textContent = formatearCOP(balance);
}

function pintarLista() {
  const lista = document.getElementById("listaMovimientos");
  const filtro = document.getElementById("filtroTipo").value;
  let movimientos = obtenerMovimientos();

  lista.innerHTML = "";

  if (filtro !== "todos") {
    movimientos = movimientos.filter(m => m.tipo === filtro);
  }

  if (movimientos.length === 0) {
    lista.innerHTML = `<p class="text-muted">No hay movimientos registrados.</p>`;
    return;
  }

  movimientos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  movimientos.forEach((m) => {
    const div = document.createElement("div");
    div.className = "border rounded p-3 mb-2";

    const badge = m.tipo === "ingreso"
      ? `<span class="badge text-bg-success">Ingreso</span>`
      : `<span class="badge text-bg-danger">Gasto</span>`;

    div.innerHTML = `
      <div class="d-flex justify-content-between align-items-start gap-3 flex-wrap">
        <div>
          ${badge}
          <strong class="ms-2">${m.categoria}</strong>
          <div class="text-muted small">${m.descripcion || ""}</div>
          <div class="small mt-1">
            Fecha: <strong>${m.fecha}</strong> • Cuenta: <strong>${m.cuentaNombre || "N/A"}</strong>
          </div>
        </div>

        <div class="text-end">
          <div class="fw-bold">${formatearCOP(m.valor)}</div>
          <button class="btn btn-sm btn-outline-danger mt-2 btn-eliminar" data-id="${m.id}">
            Eliminar
          </button>
        </div>
      </div>
    `;

    lista.appendChild(div);
  });
}

/* ======================
   EVENTOS
====================== */
document.getElementById("tipo").addEventListener("change", function () {
  actualizarLabelCuenta();
});

document.getElementById("formMovimiento").addEventListener("submit", function (e) {
  e.preventDefault();

  const tipo = document.getElementById("tipo").value;
  const categoria = document.getElementById("categoria").value;
  const cuentaId = document.getElementById("cuentaId").value;
  const valor = Number(document.getElementById("valor").value);
  const fecha = document.getElementById("fecha").value;
  const descripcion = document.getElementById("descripcion").value.trim();

  if (!categoria) return alert("Selecciona una categoría");
  if (!cuentaId) return alert("Selecciona una cuenta");
  if (!valor || valor <= 0) return alert("Ingresa un valor válido");
  if (!fecha) return alert("Selecciona una fecha");

  const cuentas = obtenerCuentas();
  const cuenta = cuentas.find(c => String(c.id) === String(cuentaId));
  if (!cuenta) return alert("Cuenta no encontrada");

  const ok = registrarMovimientoEnCuenta(
    cuentaId,
    tipo,
    `${tipo === "gasto" ? "Gasto" : "Ingreso"} variable: ${categoria}${descripcion ? " - " + descripcion : ""}`,
    fecha,
    valor
  );

  if (!ok) return;

  const movimientos = obtenerMovimientos();

  movimientos.push({
    id: Date.now(),
    tipo,
    categoria,
    valor,
    fecha,
    descripcion,
    cuentaId,
    cuentaNombre: cuenta.nombre
  });

  guardarMovimientos(movimientos);

  alert("Movimiento guardado ✅");
  this.reset();
  document.getElementById("fecha").value = hoyISO();

  actualizarLabelCuenta();
  cargarCuentasEnSelect();
  pintarResumen();
  pintarLista();
});

document.addEventListener("click", function (e) {
  if (e.target.classList.contains("btn-eliminar")) {
    alert("⚠️ Por ahora eliminar NO revierte el saldo de la cuenta. (Si quieres lo hacemos).");
    const id = e.target.getAttribute("data-id");

    let movimientos = obtenerMovimientos();
    movimientos = movimientos.filter(m => String(m.id) !== String(id));
    guardarMovimientos(movimientos);

    pintarResumen();
    pintarLista();
  }
});

document.getElementById("filtroTipo").addEventListener("change", function () {
  pintarLista();
});

document.getElementById("btnBorrarTodo").addEventListener("click", function () {
  if (!confirm("¿Seguro que quieres borrar todos los movimientos variables?")) return;

  alert("⚠️ Esto NO revierte saldos. (Si quieres lo hacemos).");
  guardarMovimientos([]);

  pintarResumen();
  pintarLista();
});

/* INIT */
(function init() {
  document.getElementById("fecha").value = hoyISO();
  actualizarLabelCuenta();
  cargarCuentasEnSelect();
  pintarResumen();
  pintarLista();
})();
  