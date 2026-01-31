/*
  variableMovements.js
  Controller for Variable Movements (Expenses/Income)
*/

import Store from '../js/store.js';
import { Utils } from '../js/utils.js';
import '../js/components/Navbar.js';

const STORAGE_KEY = "movimientosVariables";

function getMovements() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
}

function saveMovements(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// --- Logic ---

function registerMovement(accountId, type, category, description, date, amount) {
  const accounts = Store.getAccounts();
  const account = accounts.find(c => String(c.id) === String(accountId));

  if (!account) {
    alert("Cuenta no encontrada");
    return false;
  }

  const val = Number(amount);

  if (type === 'gasto') {
    if (Number(account.saldo) < val) {
      alert("⚠️ Saldo insuficiente en la cuenta seleccionada.");
      return false;
    }
    // Deduct
    account.saldo = Number(account.saldo) - val;
    // Add transaction record to account
    account.movimientos = account.movimientos || [];
    account.movimientos.push({
      fecha: date,
      tipo: "Egreso",
      descripcion: `Gasto Var: ${category} - ${description}`,
      valor: val
    });
  } else {
    // Add
    account.saldo = Number(account.saldo) + val;
    // Add transaction record to account
    account.movimientos = account.movimientos || [];
    account.movimientos.push({
      fecha: date,
      tipo: "Ingreso",
      descripcion: `Ingreso Var: ${category} - ${description}`,
      valor: val
    });
  }

  Store.saveData("cuentas", accounts);
  return true;
}

function deleteMovement(id) {
  let movements = getMovements();
  const movement = movements.find(m => String(m.id) === String(id));

  if (movement) {
    // Attempt to revert balance
    const accounts = Store.getAccounts();
    const account = accounts.find(c => String(c.id) === String(movement.cuentaId));
    const val = Number(movement.valor);

    if (movement.tipo === 'traslado') {
      // Revert Transfer: Add to Origin, Subtract from Dest
      const destAccount = accounts.find(c => String(c.id) === String(movement.cuentaDestinoId));

      if (account) account.saldo = Number(account.saldo) + val;
      if (destAccount) destAccount.saldo = Number(destAccount.saldo) - val;

    } else if (account) {
      if (movement.tipo === 'gasto') {
        // Revert expense -> Add back
        account.saldo = Number(account.saldo) + val;
      } else {
        // Revert income -> Subtract
        account.saldo = Number(account.saldo) - val;
      }
    }

    Store.saveData("cuentas", accounts);
  }

  movements = movements.filter(m => String(m.id) !== String(id));
  saveMovements(movements);
  renderUI();
}

function clearAllMovements() {
  if (!confirm("¿Borrar TODO el historial? \n⚠️ Esto NO revertirá los saldos de las cuentas.")) return;
  saveMovements([]);
  renderUI();
}

// --- UI ---

function renderSummary() {
  const movements = getMovements();

  const totalIngresos = movements
    .filter(m => m.tipo === "ingreso")
    .reduce((acc, m) => acc + Number(m.valor || 0), 0);

  const totalGastos = movements
    .filter(m => m.tipo === "gasto")
    .reduce((acc, m) => acc + Number(m.valor || 0), 0);

  const balance = totalIngresos - totalGastos;

  document.getElementById("totalIngresosVar").textContent = Utils.formatCurrency(totalIngresos);
  document.getElementById("totalGastosVar").textContent = Utils.formatCurrency(totalGastos);
  document.getElementById("balanceVar").textContent = Utils.formatCurrency(balance);
}

function renderList() {
  const container = document.getElementById("listaMovimientos");
  const filter = document.getElementById("filtroTipo").value;
  let movements = getMovements();

  container.innerHTML = "";

  // Filter
  if (filter !== 'todos') {
    movements = movements.filter(m => m.tipo === filter);
  }

  if (movements.length === 0) {
    container.innerHTML = `<div class="text-center text-muted p-4">No hay movimientos registrados.</div>`;
    return;
  }

  // Sort Descending Date
  movements.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  movements.forEach(m => {
    let colorClass, icon, sign;

    if (m.tipo === 'gasto') {
      colorClass = 'text-danger';
      icon = '📉';
      sign = '-';
    } else if (m.tipo === 'ingreso') {
      colorClass = 'text-success';
      icon = '📈';
      sign = '+';
    } else if (m.tipo === 'traslado') {
      colorClass = 'text-primary';
      icon = '🔁';
      sign = '';
    }

    const card = document.createElement("div");
    card.className = "d-flex justify-content-between align-items-center p-3 bg-light rounded shadow-sm border-0";

    let accInfo = m.cuentaNombre;
    if (m.tipo === 'traslado' && m.extraInfo) {
      accInfo += ` ${m.extraInfo}`;
    }

    card.innerHTML = `
            <div class="d-flex align-items-center gap-3">
                <div class="fs-4 bg-white p-2 rounded-circle shadow-sm">${icon}</div>
                <div>
                    <div class="fw-bold text-dark">${m.categoria}</div>
                    <div class="small text-muted">${m.descripcion || 'Sin descripción'}</div>
                    <div style="font-size: 0.75rem" class="text-secondary">
                        ${Utils.formatDate(new Date(m.fecha))} • ${accInfo}
                    </div>
                </div>
            </div>
            
            <div class="text-end">
                <div class="fw-bold ${colorClass} fs-5">${sign} ${Utils.formatCurrency(m.valor)}</div>
                <button class="btn btn-link text-muted btn-sm text-decoration-none btn-eliminar p-0 mt-1" data-id="${m.id}">Eliminar</button>
            </div>
        `;

    container.appendChild(card);
  });
}

function renderUI() {
  renderSummary();
  renderList();
}

function loadAccountsSelect() {
  const select = document.getElementById("cuentaId");
  const selectDest = document.getElementById("cuentaDestinoId"); // Destination
  const help = document.getElementById("ayudaCuenta");
  const accounts = Store.getAccounts();

  const options = accounts.map(acc => {
    return `<option value="${acc.id}">${acc.nombre} (${acc.moneda}) - <b>${Utils.formatCurrency(acc.saldo)}</b></option>`;
  }).join("");

  select.innerHTML = `<option value="">Seleccione cuenta...</option>` + options;
  if (selectDest) selectDest.innerHTML = `<option value="">Seleccione cuenta destino...</option>` + options;

  if (accounts.length === 0) {
    select.disabled = true;
    if (selectDest) selectDest.disabled = true;
    help.textContent = "Crea una cuenta primero";
    return;
  }

  select.disabled = false;
  if (selectDest) selectDest.disabled = false;
  help.textContent = "";
}

// --- Events ---


function registerTransfer(originId, destId, description, date, amount) {
  const accounts = Store.getAccounts();
  const origin = accounts.find(c => String(c.id) === String(originId));
  const dest = accounts.find(c => String(c.id) === String(destId));

  if (!origin || !dest) {
    alert("Cuentas inválidas");
    return false;
  }

  if (originId === destId) {
    alert("La cuenta de destino debe ser diferente.");
    return false;
  }

  const val = Number(amount);

  if (Number(origin.saldo) < val) {
    alert("⚠️ Saldo insuficiente en cuenta de origen.");
    return false;
  }

  // Execute Transfer
  origin.saldo = Number(origin.saldo) - val;
  dest.saldo = Number(dest.saldo) + val;

  // Record Movements
  origin.movimientos = origin.movimientos || [];
  origin.movimientos.push({
    fecha: date,
    tipo: "Egreso",
    descripcion: `Traslado a ${dest.nombre}: ${description}`,
    valor: val
  });

  dest.movimientos = dest.movimientos || [];
  dest.movimientos.push({
    fecha: date,
    tipo: "Ingreso",
    descripcion: `Traslado desde ${origin.nombre}: ${description}`,
    valor: val
  });

  Store.saveData("cuentas", accounts);
  return true;
}

document.getElementById("formMovimiento").addEventListener("submit", (e) => {
  e.preventDefault();

  // Get Radio Value
  const type = document.querySelector('input[name="tipo"]:checked').value;

  const accountId = document.getElementById("cuentaId").value;
  const amount = document.getElementById("valor").value;
  const date = document.getElementById("fecha").value;
  const desc = document.getElementById("descripcion").value.trim();

  // Specific Fields
  const category = document.getElementById("categoria").value;
  const destId = document.getElementById("cuentaDestinoId").value;

  if (!accountId || !amount || !date) return alert("Completa los campos obligatorios");

  if (type === 'traslado') {
    if (!destId) return alert("Selecciona cuenta de destino");
    if (registerTransfer(accountId, destId, desc, date, amount)) {
      // Save History
      const movements = getMovements();
      const accounts = Store.getAccounts();
      const origin = accounts.find(a => String(a.id) === String(accountId));
      const dest = accounts.find(a => String(a.id) === String(destId));

      movements.push({
        id: Date.now(),
        tipo: 'traslado',
        categoria: 'Traslado',
        valor: Number(amount),
        fecha: date,
        descripcion: desc,
        cuentaId: accountId,
        cuentaDestinoId: destId, // Store for reversal
        cuentaNombre: origin ? origin.nombre : "Desconocida",
        extraInfo: `➡ ${dest ? dest.nombre : '?'}` // Visual helper
      });

      saveMovements(movements);
      alert("Traslado exitoso 🔁");

      document.getElementById("formMovimiento").reset();
      document.getElementById("fecha").value = new Date().toISOString().slice(0, 10);
      // Reset view to default
      document.getElementById("optionGasto").click();

      renderUI();
      loadAccountsSelect();
    }
  } else {
    // Ingreso / Gasto
    if (!category) return alert("Selecciona una categoría");
    if (registerMovement(accountId, type, category, desc, date, amount)) {
      const movements = getMovements();
      const accounts = Store.getAccounts();
      const acc = accounts.find(a => String(a.id) === String(accountId));

      movements.push({
        id: Date.now(),
        tipo: type,
        categoria: category,
        valor: Number(amount),
        fecha: date,
        descripcion: desc,
        cuentaId: accountId,
        cuentaNombre: acc ? acc.nombre : "Desconocida"
      });

      saveMovements(movements);
      alert("Movimiento registrado ✅");

      document.getElementById("formMovimiento").reset();
      document.getElementById("fecha").value = new Date().toISOString().slice(0, 10);

      renderUI();
      loadAccountsSelect();
    }
  }
});

document.addEventListener("change", (e) => {
  if (e.target.name === 'tipo') {
    const label = document.getElementById("labelCuenta");
    const divCat = document.getElementById("divCategoria");
    const divDest = document.getElementById("divCuentaDestino");
    const catInput = document.getElementById("categoria");
    const destInput = document.getElementById("cuentaDestinoId");

    if (e.target.value === 'gasto') {
      label.textContent = "Cuenta de Origen";
      divCat.classList.remove("d-none");
      divDest.classList.add("d-none");
      catInput.required = true;
      destInput.required = false;
    } else if (e.target.value === 'ingreso') {
      label.textContent = "Cuenta de Destino";
      divCat.classList.remove("d-none");
      divDest.classList.add("d-none");
      catInput.required = true;
      destInput.required = false;
    } else if (e.target.value === 'traslado') {
      label.textContent = "Cuenta de Origen";
      divCat.classList.add("d-none");
      divDest.classList.remove("d-none");
      catInput.required = false;
      destInput.required = true;
    }
  }

  if (e.target.id === 'filtroTipo') {
    renderList();
  }
});

document.addEventListener("click", (e) => {
  if (e.target.classList.contains("btn-eliminar")) {
    const id = e.target.getAttribute("data-id");
    if (confirm("¿Eliminar este movimiento? \n\nSe intentará revertir el saldo de la cuenta asociada.")) {
      deleteMovement(id);
    }
  }

  if (e.target.id === 'btnBorrarTodo') {
    clearAllMovements();
  }
});

// Init
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("fecha").value = new Date().toISOString().slice(0, 10);
  loadAccountsSelect();
  renderUI();
});