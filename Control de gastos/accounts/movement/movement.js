function obtenerCuentas() {
  return JSON.parse(localStorage.getItem("cuentas")) || [];
}

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

function normalizarFecha(fecha) {
  return fecha ? new Date(fecha + "T00:00:00") : null;
}

function obtenerMovimientosPlano() {
  const cuentas = obtenerCuentas();
  const movimientos = [];

  cuentas.forEach((cuenta) => {
    const movs = cuenta.movimientos || [];

    movs.forEach((m) => {
      movimientos.push({
        cuentaId: cuenta.id,
        cuentaNombre: cuenta.nombre,
        moneda: cuenta.moneda,
        fecha: m.fecha || "",
        tipo: m.tipo || "",
        descripcion: m.descripcion || "",
        valor: Number(m.valor || 0)
      });
    });
  });

  return movimientos;
}

function pintarTabla(movimientos) {
  const tbody = document.getElementById("tablaMovimientos");
  const sinMovimientos = document.getElementById("sinMovimientos");
  const resumen = document.getElementById("resumenMovimientos");

  tbody.innerHTML = "";

  if (movimientos.length === 0) {
    sinMovimientos.style.display = "block";
    resumen.textContent = "Mostrando 0 movimientos";
    return;
  }

  sinMovimientos.style.display = "none";
  resumen.textContent = `Mostrando ${movimientos.length} movimientos`;

  // Ordenar por fecha descendente
  movimientos.sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));

  movimientos.forEach((m) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${m.fecha || "-"}</td>
      <td>${m.tipo || "-"}</td>
      <td>${m.descripcion || "-"}</td>
      <td class="text-end">${formatearMoneda(m.valor, m.moneda)}</td>
    `;

    tbody.appendChild(tr);
  });
}

function obtenerCuentaIdDesdeURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get("cuenta"); // puede ser null
}

function aplicarFiltros() {
  const fechaDesde = document.getElementById("fechaDesde").value;
  const fechaHasta = document.getElementById("fechaHasta").value;

  const desde = normalizarFecha(fechaDesde);
  const hasta = normalizarFecha(fechaHasta);

  const cuentaIdURL = obtenerCuentaIdDesdeURL();

  let movimientos = obtenerMovimientosPlano();

  // ✅ FILTRO AUTOMÁTICO POR CUENTA SI VIENE EN URL
  if (cuentaIdURL) {
    movimientos = movimientos.filter(m => String(m.cuentaId) === String(cuentaIdURL));
  }

  // filtro por fechas
  if (desde) {
    movimientos = movimientos.filter(m => {
      if (!m.fecha) return false;
      return normalizarFecha(m.fecha) >= desde;
    });
  }

  if (hasta) {
    movimientos = movimientos.filter(m => {
      if (!m.fecha) return false;
      return normalizarFecha(m.fecha) <= hasta;
    });
  }

  pintarTabla(movimientos);
}

function limpiarFiltros() {
  document.getElementById("fechaDesde").value = "";
  document.getElementById("fechaHasta").value = "";
  aplicarFiltros();
}

function actualizarTitulo() {
  const cuentaIdURL = obtenerCuentaIdDesdeURL();
  const titulo = document.getElementById("tituloMovimientos");

  if (!cuentaIdURL) {
    titulo.textContent = "Movimientos";
    return;
  }

  const cuentas = obtenerCuentas();
  const cuenta = cuentas.find(c => String(c.id) === String(cuentaIdURL));

  if (cuenta) {
    titulo.textContent = `Movimientos - ${cuenta.nombre}`;
  } else {
    titulo.textContent = "Movimientos";
  }
}

// Eventos
document.getElementById("btnFiltrar").addEventListener("click", aplicarFiltros);
document.getElementById("btnLimpiar").addEventListener("click", limpiarFiltros);

// Inicial
actualizarTitulo();
aplicarFiltros();
