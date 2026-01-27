function formatearMoneda(valor, moneda = "COP") {
  try {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: moneda,
      maximumFractionDigits: 0
    }).format(valor);
  } catch (e) {
    return "$" + Number(valor).toLocaleString("es-CO");
  }
}

function obtenerCuentas() {
  return JSON.parse(localStorage.getItem("cuentas")) || [];
}

function calcularTotal(cuentas) {
  return cuentas.reduce((acc, c) => acc + (Number(c.saldo) || 0), 0);
}

function crearTarjetaCuenta(cuenta) {
  const card = document.createElement("div");
  card.className = "card mb-2 shadow-sm";

  card.innerHTML = `
    <div class="card-body d-flex justify-content-between align-items-center gap-3">
      <div>
        <h6 class="mb-1">${cuenta.nombre}</h6>
        <small class="text-muted">${cuenta.tipo} • ${cuenta.moneda}</small>
      </div>

      <div class="text-end">
        <div class="fw-bold">${formatearMoneda(cuenta.saldo, cuenta.moneda)}</div>

        <button class="btn btn-sm btn-outline-primary mt-2 btn-ver-movimientos"
          data-id="${cuenta.id}">
          Ver movimientos
        </button>
      </div>
    </div>
  `;

  return card;
}

function pintarLista(cuentas, contenedorId) {
  const contenedor = document.getElementById(contenedorId);
  contenedor.innerHTML = "";

  if (cuentas.length === 0) {
    contenedor.innerHTML = `<p class="text-muted">No hay cuentas registradas.</p>`;
    return;
  }

  cuentas.forEach((cuenta) => {
    contenedor.appendChild(crearTarjetaCuenta(cuenta));
  });
}

function actualizarBalance() {
  const cuentas = obtenerCuentas();

  const solidarias = cuentas.filter(c => c.categoria === "solidaria");
  const bancarias = cuentas.filter(c => c.categoria === "bancaria");
  const inversiones = cuentas.filter(c => c.categoria === "inversion");
  const efectivos = cuentas.filter(c => c.categoria === "efectivo");

  // Pintar listas
  pintarLista(solidarias, "listaSolidaria");
  pintarLista(bancarias, "listaBancaria");
  pintarLista(inversiones, "listaInversion");
  pintarLista(efectivos, "listaEfectivo");

  // Totales
  const totalSolidaria = calcularTotal(solidarias);
  const totalBancaria = calcularTotal(bancarias);
  const totalInversion = calcularTotal(inversiones);
  const totalEfectivo = calcularTotal(efectivos);

  document.getElementById("totalSolidaria").textContent = formatearMoneda(totalSolidaria, "COP");
  document.getElementById("totalBancaria").textContent = formatearMoneda(totalBancaria, "COP");
  document.getElementById("totalInversion").textContent = formatearMoneda(totalInversion, "COP");
  document.getElementById("totalEfectivo").textContent = formatearMoneda(totalEfectivo, "COP");

  const totalGeneral = totalSolidaria + totalBancaria + totalInversion + totalEfectivo;
  document.getElementById("totalGeneral").textContent =
    `Total general: ${formatearMoneda(totalGeneral, "COP")}`;
}

/* ===========================
   BOTÓN VER MOVIMIENTOS
   =========================== */
// Te manda a movimientos.html filtrando por cuenta
document.addEventListener("click", function (e) {
  if (e.target.classList.contains("btn-ver-movimientos")) {
    const cuentaId = e.target.getAttribute("data-id");
    window.location.href = `../Movement/movement.html?cuenta=${cuentaId}`;
  }
});

actualizarBalance();
