/* 
  Store.js
  Centralized state management for FinanzasApp using localStorage.
*/

const KEYS = {
  ACCOUNTS: "cuentas",
  FIXED_EXPENSES: "gastosFijos",
  FIXED_INCOME: "ingresosFijos",
  RECEIVABLES: "cuentasPorCobrar",
  PAYABLES: "cuentasPorPagar"
};

class Store {
  // --- Generic Helpers ---
  static getData(key) {
    try {
      return JSON.parse(localStorage.getItem(key)) || [];
    } catch (e) {
      console.error(`Error reading ${key} from localStorage`, e);
      return [];
    }
  }

  static saveData(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error(`Error saving ${key} to localStorage`, e);
      return false;
    }
  }

  // --- Accounts ---
  static getAccounts() {
    return this.getData(KEYS.ACCOUNTS);
  }

  static addAccount(account) {
    const accounts = this.getAccounts();
    accounts.push(account);
    return this.saveData(KEYS.ACCOUNTS, accounts);
  }

  static getTotalBalance() {
    const accounts = this.getAccounts();
    return accounts.reduce((sum, acc) => sum + (Number(acc.saldo) || 0), 0);
  }

  // --- Fixed Expenses ---
  static getFixedExpenses() {
    return this.getData(KEYS.FIXED_EXPENSES);
  }

  // --- Fixed Income ---
  static getFixedIncome() {
    return this.getData(KEYS.FIXED_INCOME);
  }

  // --- Receivables ---
  static getReceivables() {
    return this.getData(KEYS.RECEIVABLES);
  }

  // --- Payables ---
  static getPayables() {
    return this.getData(KEYS.PAYABLES);
  }
}

export default Store;
