/*
  accounts.js
  Controller for Account Creation
*/

import Store from '../../js/store.js';
import '../../js/components/Navbar.js'; // Side-effect: injects Navbar

const selectTipoCuenta = document.getElementById("tipoCuenta");
const commonFields = document.getElementById("commonFields");

// Block containers
const blocks = {
  solidaria: document.getElementById("camposCuentaSolidaria"),
  bancaria: document.getElementById("camposCuentaBancaria"),
  inversion: document.getElementById("camposCuentaInversion"),
  efectivo: document.getElementById("camposCuentaEfectivo")
};

function hideAllBlocks() {
  Object.values(blocks).forEach(block => {
    if (block) block.style.display = "none";
  });
  if (commonFields) commonFields.style.display = "none";
}

function showBlock(category) {
  hideAllBlocks();
  const block = blocks[category];
  if (block) {
    block.style.display = "block";
    if (commonFields) commonFields.style.display = "block";
  }
}

// Initial State
hideAllBlocks();

// Event Listener
selectTipoCuenta.addEventListener("change", function () {
  const category = this.value;
  if (category) {
    showBlock(category);
  } else {
    hideAllBlocks();
  }
});

// Form Submission
document.getElementById("crearCuenta").addEventListener("submit", function (e) {
  e.preventDefault();

  const categoria = selectTipoCuenta.value;
  if (!categoria) {
    alert("Por favor selecciona una categoría.");
    return;
  }

  const contenedor = blocks[categoria];

  // Get specific fields based on category
  const tipo = contenedor.querySelector(".tipo")?.value || "No aplica";

  // For 'Efectivo', no name is required, default to 'Efectivo'
  // For others, user input is expected
  let nombre = contenedor.querySelector(".nombre")?.value?.trim();
  if (categoria === 'efectivo' && !nombre) nombre = "Efectivo";

  if (categoria !== 'efectivo' && !nombre) {
    alert("Por favor ingresa el nombre de la entidad/banco.");
    return;
  }

  // Get common fields
  const saldoInput = commonFields.querySelector(".saldo");
  const monedaInput = commonFields.querySelector(".moneda");

  const saldo = Number(saldoInput.value);
  const moneda = monedaInput.value;

  if (saldo < 0) { // Allow 0, but usually positive
    alert("El saldo no puede ser negativo.");
    return;
  }

  const newAccount = {
    id: Date.now(),
    categoria,
    tipo,
    nombre,
    moneda,
    saldo: saldo,
    movimientos: [
      {
        fecha: new Date().toISOString().slice(0, 10),
        tipo: "Saldo inicial",
        descripcion: "Saldo inicial al crear la cuenta",
        valor: saldo
      }
    ]
  };

  if (Store.addAccount(newAccount)) {
    alert("¡Cuenta creada exitosamente! Redirigiendo a saldos...");
    window.location.href = "../Balance/balance.html";
  } else {
    alert("Hubo un error al guardar la cuenta.");
  }
});




