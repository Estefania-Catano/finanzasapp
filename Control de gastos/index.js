function obtenerCuentas() {
  return JSON.parse(localStorage.getItem("cuentas")) || [];
}

function obtenerGastosFijos() {
  return JSON.parse(localStorage.getItem("gastosFijos")) || [];
}

function obtenerIngresosFijos() {
  return JSON.parse(localStorage.getItem("ingresosFijos")) || [];
}

function obtenerCuentasPorCobrar() {
  return JSON.parse(localStorage.getItem("cuentasPorCobrar")) || [];
}

function obtenerCuentasPorPagar() {
  return JSON.parse(localStorage.getItem("cuentasPorPagar")) || [];
}

function formatearCOP(valor) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0
  }).format(valor || 0);
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

function diasDiferencia(hoy, fechaPago) {
  const ms = fechaPago.getTime() - hoy.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

function obtenerMesActual() {
  const hoy = new Date();
  const año = hoy.getFullYear();
  const mes = String(hoy.getMonth() + 1).padStart(2, "0");
  return `${año}-${mes}`;
}

/* ======================
   GASTOS / INGRESOS
====================== */
function yaPagadoEsteMes(gasto) {
  const mesActual = obtenerMesActual();
  return (gasto.historialPagos || []).some(p => p.mes === mesActual);
}

function yaRecibidoEsteMes(ingreso) {
  const mesActual = obtenerMesActual();
  return (ingreso.historialRecibidos || []).some(p => p.mes === mesActual);
}

/* ======================
   PERIODOS
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

function yaPagoPeriodoEsteMes(item, periodoKey) {
  const mes = obtenerMesActual();
  return (item.historialPagos || []).some(p => p.mes === mes && p.periodoKey === periodoKey);
}

/* ======================
   DASHBOARD
====================== */
function cargarDashboard() {
  const cuentas = obtenerCuentas();
  const gastosFijos = obtenerGastosFijos();
  const ingresosFijos = obtenerIngresosFijos();
  const cuentasPorCobrar = obtenerCuentasPorCobrar();
  const cuentasPorPagar = obtenerCuentasPorPagar();

  // Total cuentas
  document.getElementById("totalCuentas").textContent = cuentas.length;

  // Saldo total
  const saldoTotal = cuentas.reduce((acc, c) => acc + (Number(c.saldo) || 0), 0);
  document.getElementById("saldoTotal").textContent = formatearCOP(saldoTotal);

  // Totales
  document.getElementById("totalGastosFijos").textContent = gastosFijos.length;

  const elIngresos = document.getElementById("totalIngresosFijos");
  if (elIngresos) elIngresos.textContent = ingresosFijos.length;

  const elCXC = document.getElementById("totalaccountsReceivable");
  if (elCXC) elCXC.textContent = cuentasPorCobrar.length;

  const elCXP = document.getElementById("totalaccountsPayable");
  if (elCXP) elCXP.textContent = cuentasPorPagar.length;

  // ALERTAS
  const alertasDiv = document.getElementById("alertasDashboard");
  alertasDiv.innerHTML = "";

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const alertas = [];

  /* ===== GASTOS ===== */
  gastosFijos.forEach((g) => {
    if (yaPagadoEsteMes(g)) return;

    const fecha = fechaAjustadaDelMes(g.diaPago);
    const faltan = diasDiferencia(hoy, fecha);

    alertas.push({
      grupo: "Gasto fijo",
      tipo: "gasto",
      nombre: g.nombre,
      faltan,
      fecha,
      detalle: `Vence día ${g.diaPago}`,
      valorTexto: g.tipoValor === "fijo" ? formatearCOP(g.valor) : "Valor variable"
    });
  });

  /* ===== INGRESOS ===== */
  ingresosFijos.forEach((i) => {
    if (yaRecibidoEsteMes(i)) return;

    const fecha = fechaAjustadaDelMes(i.diaIngreso);
    const faltan = diasDiferencia(hoy, fecha);

    alertas.push({
      grupo: "Ingreso fijo",
      tipo: "ingreso",
      nombre: i.nombre,
      faltan,
      fecha,
      detalle: `Llega día ${i.diaIngreso}`,
      valorTexto: i.tipoValor === "fijo" ? formatearCOP(i.valor) : "Valor variable"
    });
  });

  /* ===== CXC (alertas independientes por periodo) ===== */
  cuentasPorCobrar
    .filter(c => Number(c.saldoPendiente || 0) > 0)
    .forEach((c) => {
      const periodos = obtenerPeriodos(c.periodicidad);

      periodos.forEach((p) => {
        // si ya pagó ese periodo este mes, NO mostrar
        if (yaPagoPeriodoEsteMes(c, p.key)) return;

        const dia = (c.periodicidad === "mensual")
          ? Number(c.diaPago)
          : p.dia;

        if (!dia) return;

        const fecha = fechaAjustadaDelMes(dia);
        const faltan = diasDiferencia(hoy, fecha);

        const valorTexto = (c.tipoPago === "cuotas")
          ? `Cuota: ${formatearCOP(c.cuotaValor)}`
          : `Pendiente: ${formatearCOP(c.saldoPendiente)}`;

        alertas.push({
          grupo: "CXC",
          tipo: "cxc",
          nombre: c.nombreDeudor,
          faltan,
          fecha,
          detalle: (c.periodicidad === "mensual")
            ? `Mensual (día ${c.diaPago})`
            : p.label,
          valorTexto
        });
      });
    });

  /* ===== CXP (alertas independientes por periodo) ===== */
  cuentasPorPagar
    .filter(d => Number(d.saldoPendiente || 0) > 0)
    .forEach((d) => {

      // pago único
      if (d.tipoPago === "unico") {
        if (!d.fechaUnica) return;

        const fecha = new Date(d.fechaUnica);
        fecha.setHours(0, 0, 0, 0);

        const faltan = diasDiferencia(hoy, fecha);

        alertas.push({
          grupo: "CXP",
          tipo: "cxp",
          nombre: d.acreedor,
          faltan,
          fecha,
          detalle: "Pago único",
          valorTexto: `Pendiente: ${formatearCOP(d.saldoPendiente)}`
        });

        return;
      }

      // cuotas
      const periodos = obtenerPeriodos(d.periodicidad);

      periodos.forEach((p) => {
        // si ya pagó ese periodo este mes, NO mostrar
        if (yaPagoPeriodoEsteMes(d, p.key)) return;

        const dia = (d.periodicidad === "mensual")
          ? Number(d.diaPago)
          : p.dia;

        if (!dia) return;

        const fecha = fechaAjustadaDelMes(dia);
        const faltan = diasDiferencia(hoy, fecha);

        alertas.push({
          grupo: "CXP",
          tipo: "cxp",
          nombre: d.acreedor,
          faltan,
          fecha,
          detalle: (d.periodicidad === "mensual")
            ? `Mensual (día ${d.diaPago})`
            : p.label,
          valorTexto: `Cuota: ${formatearCOP(d.cuotaValor)}`
        });
      });
    });

  if (alertas.length === 0) {
    alertasDiv.innerHTML = `<div class="alert alert-success">🎉 No tienes alertas pendientes este mes.</div>`;
    return;
  }

  // Ordenar por fecha
  alertas.sort((a, b) => a.fecha - b.fecha);

  // Pintar alertas bonitas
  alertas.forEach((a) => {
    let clase = "alert-secondary";
    let emoji = "📌";

    if (a.faltan > 5) {
      clase = "alert-secondary";
      emoji = "📌";
    } else if (a.faltan >= 1 && a.faltan <= 5) {
      clase = "alert-warning";
      emoji = "⚠️";
    } else if (a.faltan === 0) {
      clase = (a.tipo === "ingreso" || a.tipo === "cxc") ? "alert-success" : "alert-danger";
      emoji = (a.tipo === "ingreso" || a.tipo === "cxc") ? "💰" : "🚨";
    } else {
      clase = "alert-danger";
      emoji = "❌";
    }

    let badgeTexto = "";
    if (a.faltan > 0) badgeTexto = `Faltan: ${a.faltan} días`;
    if (a.faltan === 0) badgeTexto = `HOY`;
    if (a.faltan < 0) badgeTexto = `Vencido: ${Math.abs(a.faltan)} días`;

    const div = document.createElement("div");
    div.className = `alert ${clase} mb-2`;

    div.innerHTML = `
      <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div>
          <strong>${emoji} [${a.grupo}] ${a.nombre}</strong><br/>
          <span class="small">${a.detalle} • ${a.valorTexto}</span>
        </div>
        <span class="badge text-bg-light">${badgeTexto}</span>
      </div>
    `;

    alertasDiv.appendChild(div);
  });
}

cargarDashboard();
