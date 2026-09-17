-- Portal Klinik: satu dokumen state per klinik (demo bersama).
-- Bukan rekam medis. Data pribadi asli tidak boleh disimpan di sini.
CREATE TABLE IF NOT EXISTS portal_state (
	klinik TEXT PRIMARY KEY,
	versi INTEGER NOT NULL,
	rev INTEGER NOT NULL DEFAULT 0,
	data TEXT NOT NULL,
	updated_at TEXT NOT NULL
);
