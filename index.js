/*
  index.js
  Main Dashboard Controller
*/

import Store from './js/store.js';
import { Utils } from './js/utils.js';
import './js/components/Navbar.js';

// --- Helper Logic for Alerts ---

function isPaidForMonth(item, monthID) {
  return (item.historialPagos || []).some(p => p.mes === monthID);
}

function isReceivedForMonth(item, monthID) {
  return (item.historialRecibidos || []).some(p => p.mes === monthID);
}

// Data generator for alerts (Multiple months support)
function generateAlertsForRange(items, type, offsetStart = -2, offsetEnd = 1) {
  const alerts = [];
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();

  items.forEach(item => {
    // Determine day field based on type
    const dayField = type === 'income' ? 'diaIngreso' : 'diaPago';
    const dayValue = Number(item[dayField]);

    // Iterate months
    for (let offset = offsetStart; offset <= offsetEnd; offset++) {
      const checkDate = new Date(currentYear, currentMonth + offset, 1);
      const checkYear = checkDate.getFullYear();
      const checkMonth = checkDate.getMonth();

      const lastDayOfMonth = new Date(checkYear, checkMonth + 1, 0).getDate();
      const targetDay = Math.min(dayValue, lastDayOfMonth);
      const targetDate = new Date(checkYear, checkMonth, targetDay);

      // Creation Date Check
      if (item.creationDate) {
        const [cYear, cMonth, cDay] = item.creationDate.split('-').map(Number);
        const creation = new Date(cYear, cMonth - 1, cDay);
        creation.setHours(0, 0, 0, 0);

        targetDate.setHours(0, 0, 0, 0);

        if (targetDate < creation) continue;
      }

      // Payment/Received Check
      const monthID = `${checkYear}-${String(checkMonth + 1).padStart(2, '0')}`;
      const isDone = type === 'income' ? isReceivedForMonth(item, monthID) : isPaidForMonth(item, monthID);

      if (isDone) continue;

      // Calculate Days
      const days = Utils.getDaysDifference(targetDate);

      // Formatting
      const monthLabel = targetDate.toLocaleString('es-CO', { month: 'long' });

      alerts.push({
        type: type,
        name: item.nombre,
        amount: item.valor,
        date: targetDate,
        days: days,
        detail: `${monthLabel} (Día ${targetDay})`
      });
    }
  });

  return alerts;
}


// --- Main Render Function ---

function loadDashboard() {
  const accounts = Store.getAccounts();
  const fixedExpenses = Store.getFixedExpenses();
  const fixedIncome = Store.getFixedIncome();
  const receivables = Store.getReceivables();
  const payables = Store.getPayables();

  // 1. Update Counts & Totals
  document.getElementById("totalCuentas").textContent = accounts.length;

  const totalBalance = Store.getTotalBalance();
  document.getElementById("saldoTotal").textContent = Utils.formatCurrency(totalBalance);

  document.getElementById("totalGastosFijos").textContent = fixedExpenses.length;
  document.getElementById("totalIngresosFijos").textContent = fixedIncome.length;
  document.getElementById("totalaccountsReceivable").textContent = receivables.length;
  document.getElementById("totalaccountsPayable").textContent = payables.length;

  // 2. Calculate Projected (Simplified: Current Balance)
  // To do a real projection with multiple unpaid months is complex. 
  // Let's keep it simple: Balance + Pending Incomes (Current Month) - Pending Expenses (Current Month)

  const currentMonthID = Utils.getCurrentMonthID();

  const pendingExpensesVal = fixedExpenses
    .filter(e => !isPaidForMonth(e, currentMonthID))
    .reduce((sum, e) => sum + (Number(e.valor) || 0), 0);

  const pendingIncomeVal = fixedIncome
    .filter(i => !isReceivedForMonth(i, currentMonthID))
    .reduce((sum, i) => sum + (Number(i.valor) || 0), 0);

  const projectedUserBalance = totalBalance + pendingIncomeVal - pendingExpensesVal;

  document.getElementById("disponibleProyectado").textContent = Utils.formatCurrency(projectedUserBalance);

  const detailEl = document.getElementById("detalleDisponible");
  if (detailEl) {
    detailEl.textContent = `Mes actual: +${Utils.formatCurrency(pendingIncomeVal)} / -${Utils.formatCurrency(pendingExpensesVal)}`;
  }


  // 3. Generate Alerts
  renderDashboardAlerts(fixedExpenses, fixedIncome, receivables, payables);
}

// --- Periodic Helpers for Dashboard ---
function d_getPeriodos(periodicidad) {
  if (periodicidad === "quincenal") return [{ key: "Q1", dia: 15, label: "Quincena 1" }, { key: "Q2", dia: 30, label: "Quincena 2" }];
  if (periodicidad === "decadal") return [{ key: "D1", dia: 10, label: "Década 1" }, { key: "D2", dia: 20, label: "Década 2" }, { key: "D3", dia: 30, label: "Década 3" }];
  return [{ key: "M1", dia: null, label: "Mensual" }];
}

function d_getDateForPeriod(year, monthIndex, period, diaMensual) {
  let day = period.dia;
  if (period.key === "M1") day = Number(diaMensual);
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  return new Date(year, monthIndex, Math.min(day, lastDay));
}

function d_isPaidOrReceived(item, monthID, periodKey, type) {
  const list = type === 'payable' ? (item.historialPagos || []) : (item.historialPagos || item.historialRecibidos || []); // CxP uses historialPagos, CxC uses historialPagos (in recent code) or historialRecibidos (legacy)
  // We unified logic: accountsReceivable.js uses historialPagos now too
  return list.some(p => p.mes === monthID && p.periodoKey === periodKey);
}

function generatePeriodicAlerts(items, type) {
  const alerts = [];
  const today = new Date();

  // Check overdue from previous months up to next month
  // Range: -3 (to catch very old overdue) to +1 (upcoming)
  // User specifically asked for "meses vencidos"
  for (let offset = -3; offset <= 1; offset++) {
    const checkDate = new Date(today.getFullYear(), today.getMonth() + offset, 1);
    const year = checkDate.getFullYear();
    const month = checkDate.getMonth();
    const monthID = `${year}-${String(month + 1).padStart(2, '0')}`;

    items.forEach(item => {
      if (Number(item.saldoPendiente) <= 0) return; // Fully paid debt/receivable

      const periodos = d_getPeriodos(item.periodicidad);

      periodos.forEach(p => {
        // If paid for this specific slice, skip
        if (d_isPaidOrReceived(item, monthID, p.key, type)) return;

        const date = d_getDateForPeriod(year, month, p, item.diaPago);

        // Creation Date Check
        if (item.creationDate) {
          const [cYear, cMonth, cDay] = item.creationDate.split('-').map(Number);
          const creation = new Date(cYear, cMonth - 1, cDay);
          creation.setHours(0, 0, 0, 0);
          const alertDate = new Date(date);
          alertDate.setHours(0, 0, 0, 0);
          if (alertDate < creation) return;
        }

        const days = Utils.getDaysDifference(date);

        // Filters:
        // 1. If overdue (days < 0), ALWAYS show.
        // 2. If upcoming (days >= 0), only show if close (e.g. < 45 days)
        if (days > 45) return;

        // Determine Amount to show (Quota vs Full vs Pending Balance)
        let amountToShow = Number(item.saldoPendiente);
        if (item.tipoPago === 'cuotas' && item.cuotaValor) {
          amountToShow = Number(item.cuotaValor);
        }

        // Label
        const labelDate = date.toLocaleString('es-CO', { month: 'short', day: 'numeric' });
        const mainLabel = type === 'payable' ? item.acreedor : item.nombreDeudor;

        alerts.push({
          type: type,
          name: mainLabel,
          amount: amountToShow,
          days: days,
          detail: `${p.label} - ${labelDate}`,
          date: date,
          isPeriodic: true
        });
      });
    });
  }
  return alerts;
}

function renderDashboardAlerts(expenses, income, receivables, payables) {
  const alertsContainer = document.getElementById("alertasDashboard");
  alertsContainer.innerHTML = "";

  let allAlerts = [];

  // A. Fixed Items (Standard Range)
  allAlerts = allAlerts.concat(generateAlertsForRange(expenses, 'expense'));
  allAlerts = allAlerts.concat(generateAlertsForRange(income, 'income'));

  // B. Periodic Payables & Receivables (Advanced Multi-month logic)
  allAlerts = allAlerts.concat(generatePeriodicAlerts(payables, 'payable'));
  allAlerts = allAlerts.concat(generatePeriodicAlerts(receivables, 'receivable'));

  // Sort by urgency
  allAlerts.sort((a, b) => a.days - b.days);

  if (allAlerts.length === 0) {
    alertsContainer.innerHTML = `
      <div class="alert alert-success d-flex align-items-center shadow-sm border-0" role="alert">
        <span class="fs-4 me-2">🎉</span>
        <div>No hay alertas pendientes.</div>
      </div>
    `;
    return;
  }

  // Render top list
  allAlerts.slice(0, 15).forEach(alert => {
    let colorClass, icon, badgeClass;
    const isOverdue = alert.days < 0;

    if (alert.type === 'income' || alert.type === 'receivable') {
      // Logic for money coming in
      if (isOverdue) {
        colorClass = "alert-danger"; // Overdue is always red/critical
        icon = "⏳";
      } else {
        colorClass = "alert-success";
        icon = "💰";
      }
    } else {
      // Expenses / Payables
      if (isOverdue) { colorClass = "alert-danger"; icon = "🚨"; }
      else if (alert.days <= 5) { colorClass = "alert-warning"; icon = "⚠️"; }
      else { colorClass = "alert-secondary"; icon = "📌"; }
    }

    const item = document.createElement("div");
    item.className = `alert ${colorClass} d-flex justify-content-between align-items-center mb-2 shadow-sm border-0`;

    let timeText = alert.days === 0 ? "HOY" : (alert.days < 0 ? `Vencido ${Math.abs(alert.days)} días` : `Faltan ${alert.days} días`);

    let typeLabel = "";
    if (alert.type === 'payable') typeLabel = "Por Pagar";
    if (alert.type === 'receivable') typeLabel = "Por Cobrar";
    if (alert.type === 'expense') typeLabel = "Gasto Fijo";
    if (alert.type === 'income') typeLabel = "Ingreso Fijo";

    item.innerHTML = `
      <div class="d-flex align-items-center gap-2">
        <span class="fs-4">${icon}</span>
        <div>
          <div class="fw-bold">${alert.name} <span class="badge bg-white text-secondary border small" style="font-size: 0.6rem">${typeLabel}</span></div>
          <div class="small opacity-75">${alert.detail} • <span class="fw-bold">${Utils.formatCurrency(alert.amount || 0)}</span></div>
        </div>
      </div>
      <span class="badge bg-white text-dark shadow-sm">${timeText}</span>
    `;

    alertsContainer.appendChild(item);
  });
}

// Initialize on load
document.addEventListener("DOMContentLoaded", loadDashboard);
