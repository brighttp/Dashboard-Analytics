/**
 * =================================================================
 * KONFIGURASI API — FUSO QUIZ ANALYTICS
 * =================================================================
 * Sudah disambungkan ke API "Activity Tracker" sesuai spesifikasi
 * Apidog (ActivityTracker_apidog.json) yang kamu berikan.
 *
 * CATATAN PENTING soal bentuk API-nya:
 * - API TIDAK punya parameter jam terpisah (start_hour/end_hour).
 *   Yang ada hanya start_date & end_date berupa datetime penuh
 *   ("YYYY-MM-DD HH:mm:ss"). Karena itu filter jam di dashboard ini
 *   dilakukan di sisi browser (client-side), setelah data untuk
 *   rentang tanggal terpilih diambil dari API. Lihat app.js.
 * - API tidak punya filter "per aktivitas" di endpoint list/summary.
 *   Dashboard ini tidak lagi menyaring per nama activity — semua
 *   data yang dikembalikan API pada rentang tanggal terpilih
 *   langsung dipakai apa adanya (dijumlahkan lintas activity kalau
 *   ada lebih dari satu).
 * =================================================================
 */

const CONFIG = {
  // Base URL API "Activity Tracker" (moduleId 1362453 di project Apidog kamu)
  BASE_URL: "https://activity-tracker.abracodebra.com/api",

  ENDPOINTS: {
    ACTIVITIES: "/activities",              // GET — daftar semua activity (tidak dipakai untuk filter lagi, disediakan kalau dibutuhkan nanti)
    RECORDS: "/activity-records",           // GET — daftar record per rentang tanggal (untuk grafik per hari/jam)
    SUMMARY: "/activity-records/summary",   // GET — total_count per activity (untuk kartu "Total" & "Hari Ini")
  },

  // Nama query parameter yang dikirim ke API.
  // Sesuai spesifikasi: hanya start_date & end_date (format "YYYY-MM-DD HH:mm:ss").
  PARAM_NAMES: {
    START_DATE: "start_date",
    END_DATE: "end_date",
  },

  // Kalau user belum memilih rentang tanggal sama sekali, dashboard
  // memakai rentang default ini (dalam jumlah hari ke belakang) supaya
  // tidak menarik seluruh histori data sekaligus.
  DEFAULT_RANGE_DAYS: 30,

  // Batas pengaman jumlah halaman yang ditarik dari /activity-records
  // per rentang tanggal (limit per halaman x nilai ini = maksimum
  // record yang diambil). Naikkan kalau volume data FUSO memang besar.
  MAX_PAGES: 20,
  PAGE_LIMIT: 100,
};
