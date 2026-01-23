function obtenerCuentas() {
  return JSON.parse(localStorage.getItem("cuentas")) || [];
}

function obtenerGastosFijos() {
  return JSON.parse(localStorage.getItem("gastosFijos")) || [];
}

function obtenerIngresosFijos() {
  return JSON.parse(localStorage.getItem("ingresosFijos")) || [];
}

function obtenerAccountsReceivable() {
  return JSON.parse(localStorage.getItem("accountsReceivable")) || [];
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

// Ajusta 29/30/31 a último día del mes si no existe
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

function yaPagadoEsteMes(gasto) {
  const mesActual = obtenerMesActual();
  return (gasto.historialPagos || []).some(p => p.mes === mesActual);
}

function yaRecibidoEsteMes(ingreso) {
  const mesActual = obtenerMesActual();
  return (ingreso.historialRecibidos || []).some(p => p.mes === mesActual);
}

function cargarDashboard() {
  const cuentas = obtenerCuentas();
  const gastosFijos = obtenerGastosFijos();
  const ingresosFijos = obtenerIngresosFijos();
  const accountsReceivable = obtenerAccountsReceivable();

  // Total cuentas
  document.getElementById("totalCuentas").textContent = cuentas.length;

  // Saldo total (suma simple en COP)
  const saldoTotal = cuentas.reduce((acc, c) => acc + (Number(c.saldo) || 0), 0);
  document.getElementById("saldoTotal").textContent = formatearCOP(saldoTotal);

  // Totales
  document.getElementById("totalGastosFijos").textContent = gastosFijos.length;

  const elIngresos = document.getElementById("totalIngresosFijos");
  if (elIngresos) elIngresos.textContent = ingresosFijos.length;

    const elAccountsReceivable = document.getElementById("totalaccountsReceivable");
  if (elAccountsReceivable) elAccountsReceivable.textContent = accountsReceivable.length;

  // Alertas combinadas
  const alertasDiv = document.getElementById("alertasDashboard");
  alertasDiv.innerHTML = "";

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const alertas = [];

  // GASTOS (solo pendientes)
  gastosFijos.forEach((g) => {
    if (yaPagadoEsteMes(g)) return;

    const fecha = fechaAjustadaDelMes(g.diaPago);
    const faltan = diasDiferencia(hoy, fecha);

    alertas.push({
      tipo: "gasto",
      nombre: g.nombre,
      dia: g.diaPago,
      faltan,
      valorTexto: g.tipoValor === "fijo" ? formatearCOP(g.valor) : "Valor variable",
      fecha
    });
  });

  // INGRESOS (solo pendientes)
  ingresosFijos.forEach((i) => {
    if (yaRecibidoEsteMes(i)) return;

    const fecha = fechaAjustadaDelMes(i.diaIngreso);
    const faltan = diasDiferencia(hoy, fecha);

    alertas.push({
      tipo: "ingreso",
      nombre: i.nombre,
      dia: i.diaIngreso,
      faltan,
      valorTexto: i.tipoValor === "fijo" ? formatearCOP(i.valor) : "Valor variable",
      fecha
    });
  });

  if (alertas.length === 0) {
    alertasDiv.innerHTML = `<div class="alert alert-success">🎉 No tienes pagos ni ingresos pendientes este mes.</div>`;
    return;
  }

  // Ordenar por fecha más cercana
  alertas.sort((a, b) => a.fecha - b.fecha);

  alertas.forEach((a) => {
    let clase = "alert-secondary";
    let texto = "";

    if (a.tipo === "gasto") {
      if (a.faltan > 5) {
        clase = "alert-secondary";
        texto = `💸 ${a.nombre}: vence el día ${a.dia} (faltan ${a.faltan} días)`;
      } else if (a.faltan >= 1 && a.faltan <= 5) {
        clase = "alert-warning";
        texto = `⚠️ ${a.nombre}: vence el día ${a.dia} (faltan ${a.faltan} días)`;
      } else if (a.faltan === 0) {
        clase = "alert-danger";
        texto = `🚨 ${a.nombre}: vence HOY (día ${a.dia})`;
      } else {
        clase = "alert-danger";
        texto = `❌ ${a.nombre}: está vencido (debía pagarse el día ${a.dia})`;
      }
    } else {
      if (a.faltan > 5) {
        clase = "alert-secondary";
        texto = `💰 ${a.nombre}: llega el día ${a.dia} (faltan ${a.faltan} días)`;
      } else if (a.faltan >= 1 && a.faltan <= 5) {
        clase = "alert-warning";
        texto = `⏳ ${a.nombre}: llega pronto (faltan ${a.faltan} días)`;
      } else if (a.faltan === 0) {
        clase = "alert-success";
        texto = `✅ ${a.nombre}: llega HOY (día ${a.dia})`;
      } else {
        clase = "alert-danger";
        texto = `❌ ${a.nombre}: ya debía llegar (día ${a.dia})`;
      }
    }

    const alerta = document.createElement("div");
    alerta.className = `alert ${clase} mb-2`;
    alerta.textContent = `${texto} • ${a.valorTexto}`;

    alertasDiv.appendChild(alerta);
  });
}

cargarDashboard();
