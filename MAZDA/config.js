/**
 * =================================================================
 * KONFIGURASI API — MAZDA QUIZ ANALYTICS
 * =================================================================
 */

const CONFIG = {
  // Base URL API
  BASE_URL: "https://activity-tracker.abracodebra.com/api",

  ENDPOINTS: {
    // Endpoint untuk mendapatkan ringkasan aktivitas
    SUMMARY: "/activity-records/summary",
    // Endpoint untuk mendapatkan detail aktivitas
    RECORDS: "/activity-records",
  },

  // Nama query parameter yang dikirim ke API
  PARAM_NAMES: {
    START_DATE: "start_date",   // format: YYYY-MM-DD HH:MM:SS
    END_DATE: "end_date",       // format: YYYY-MM-DD HH:MM:SS
    TOP: "top",                 // untuk top scorers
  },
};