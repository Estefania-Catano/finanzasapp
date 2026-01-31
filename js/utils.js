/*
  utils.js
  Shared utility functions
*/

export const Utils = {

    // Format number as COP currency
    formatCurrency: (value) => {
        return new Intl.NumberFormat("es-CO", {
            style: "currency",
            currency: "COP",
            maximumFractionDigits: 0
        }).format(value || 0);
    },

    // Get current YYYY-MM
    getCurrentMonthID: () => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, "0");
        return `${year}-${month}`;
    },

    // Get ISO Date (YYYY-MM-DD)
    getTodayISO: () => {
        return new Date().toISOString().slice(0, 10);
    },

    // Calculate days difference between today and target date
    getDaysDifference: (targetDate) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Ensure targetDate is a Date object and reset time
        const target = new Date(targetDate);
        target.setHours(0, 0, 0, 0);

        const msPerDay = 1000 * 60 * 60 * 24;
        return Math.ceil((target - today) / msPerDay);
    },

    // Format date for display (e.g. DD/MM/YYYY)
    formatDate: (dateInput) => {
        if (!dateInput) return "";
        const date = new Date(dateInput);
        return date.toLocaleDateString("es-CO");
    }

};
