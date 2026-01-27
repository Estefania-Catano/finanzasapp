const selectTipoCuenta = document.getElementById("tipoCuenta");

const camposCuentaSolidaria = document.getElementById("camposCuentaSolidaria");
const camposCuentaBancaria = document.getElementById("camposCuentaBancaria");
const camposCuentaInversion = document.getElementById("camposCuentaInversion");
const camposCuentaEfectivo = document.getElementById("camposCuentaEfectivo");

const bloques = [
  camposCuentaSolidaria,
  camposCuentaBancaria,
  camposCuentaInversion,
  camposCuentaEfectivo
];

// Quita required de todos los inputs dentro de un bloque
function desactivarRequired(bloque) {
  const inputs = bloque.querySelectorAll("input");
  inputs.forEach(input => input.required = false);
}

// Activa required solo en el input de saldo del bloque visible
function activarRequiredSaldo(bloque) {
  const saldo = bloque.querySelector(".saldo");
  if (saldo) saldo.required = true;
}

function ocultarCampos() {
  bloques.forEach(bloque => {
    bloque.style.display = "none";
    desactivarRequired(bloque);
  });
}

function mostrarBloque(categoria) {
  ocultarCampos();

  let bloque = null;

  if (categoria === "solidaria") bloque = camposCuentaSolidaria;
  if (categoria === "bancaria") bloque = camposCuentaBancaria;
  if (categoria === "inversion") bloque = camposCuentaInversion;
  if (categoria === "efectivo") bloque = camposCuentaEfectivo;

  if (bloque) {
    bloque.style.display = "block";
    activarRequiredSaldo(bloque);
  }
}

selectTipoCuenta.addEventListener("change", function () {
  mostrarBloque(this.value);
});

// Al cargar
ocultarCampos();

document.getElementById("crearCuenta").addEventListener("submit", function (e) {
  e.preventDefault();

  const categoria = selectTipoCuenta.value;
  if (!categoria) {
    alert("Selecciona una categoría");
    return;
  }

  let contenedor = null;
  if (categoria === "solidaria") contenedor = camposCuentaSolidaria;
  if (categoria === "bancaria") contenedor = camposCuentaBancaria;
  if (categoria === "inversion") contenedor = camposCuentaInversion;
  if (categoria === "efectivo") contenedor = camposCuentaEfectivo;

  const tipo = contenedor.querySelector(".tipo")?.value || "No aplica";
  const nombre = contenedor.querySelector(".nombre")?.value?.trim() || "Efectivo";
  const saldo = contenedor.querySelector(".saldo")?.value;
  const moneda = contenedor.querySelector(".moneda")?.value || "COP";

  if (!saldo || Number(saldo) <= 0) {
    alert("Ingresa un saldo inicial válido");
    return;
  }

  if (categoria !== "efectivo" && nombre === "") {
    alert("Ingresa el nombre de la entidad");
    return;
  }
const saldoInicial = Number(saldo);

const cuenta = {
  id: Date.now(),
  categoria,
  tipo,
  nombre,
  moneda,
  saldo: saldoInicial,
  movimientos: [
    {
      fecha: new Date().toISOString().slice(0, 10), // YYYY-MM-DD
      tipo: "Saldo inicial",
      descripcion: "Saldo inicial al crear la cuenta",
      valor: saldoInicial
    }
  ]
};

  const cuentas = JSON.parse(localStorage.getItem("cuentas")) || [];
  cuentas.push(cuenta);
  localStorage.setItem("cuentas", JSON.stringify(cuentas));

  alert("Cuenta creada correctamente");
  this.reset();
  ocultarCampos();
});



