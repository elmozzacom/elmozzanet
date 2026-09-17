/*
 * Sinkronisasi state portal dengan D1 lewat /api/portal/state.
 * - Saat mulai: ambil dari server; bila ada, gantikan salinan lokal (session per-perangkat dipertahankan).
 * - Setiap perubahan: kirim dengan debounce. Bila 409 (rev tertinggal), pakai versi server.
 * - Offline / server gagal: tetap jalan dari localStorage, coba lagi berikutnya.
 */
import { app } from "./state.svelte";
import { saveDb, DB_VERSI, type DB } from "./store";

export const sinkron = $state<{ status: "mulai" | "sinkron" | "menyimpan" | "offline" | "konflik"; rev: number; terakhir: string | null }>({
	status: "mulai",
	rev: 0,
	terakhir: null
});

const URL_API = "/api/portal/state";
let timer: ReturnType<typeof setTimeout> | null = null;
let sedangKirim = false;
let perluKirimLagi = false;
let siap = false;

const terapkanDariServer = (data: DB, rev: number, updated: string | null) => {
	const sesiLokal = app.db.session;
	app.db = { ...data, session: sesiLokal };
	saveDb(app.db);
	sinkron.rev = rev;
	sinkron.terakhir = updated;
};

export const tarik = async (): Promise<boolean> => {
	try {
		const r = await fetch(URL_API, { cache: "no-store" });
		if (!r.ok) throw new Error(String(r.status));
		const j = (await r.json()) as { rev: number; versi: number; data: DB | null; updated_at: string | null };
		if (j.data && j.versi === DB_VERSI) {
			terapkanDariServer(j.data, j.rev, j.updated_at);
			sinkron.status = "sinkron";
		} else {
			// Server kosong / versi lama → dorong salinan lokal sebagai awal.
			sinkron.rev = j.rev ?? 0;
			sinkron.status = "sinkron";
			jadwalkanKirim(0);
		}
		siap = true;
		return true;
	} catch {
		sinkron.status = "offline";
		siap = true;
		return false;
	}
};

const kirim = async () => {
	if (sedangKirim) { perluKirimLagi = true; return; }
	sedangKirim = true;
	sinkron.status = "menyimpan";
	try {
		const data = $state.snapshot(app.db) as DB;
		const r = await fetch(URL_API, {
			method: "PUT",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ rev: sinkron.rev, versi: DB_VERSI, data })
		});
		if (r.status === 409) {
			const j = (await r.json()) as { rev: number; data: DB | null };
			if (j.data) terapkanDariServer(j.data, j.rev, new Date().toISOString());
			sinkron.status = "konflik";
			setTimeout(() => { if (sinkron.status === "konflik") sinkron.status = "sinkron"; }, 2500);
		} else if (r.ok) {
			const j = (await r.json()) as { rev: number };
			sinkron.rev = j.rev;
			sinkron.terakhir = new Date().toISOString();
			sinkron.status = "sinkron";
		} else {
			throw new Error(String(r.status));
		}
	} catch {
		sinkron.status = "offline";
	} finally {
		sedangKirim = false;
		if (perluKirimLagi) { perluKirimLagi = false; jadwalkanKirim(600); }
	}
};

export const jadwalkanKirim = (ms = 900) => {
	if (!siap) return;
	if (timer) clearTimeout(timer);
	timer = setTimeout(() => { timer = null; void kirim(); }, ms);
};

/** Dipanggil sekali dari komponen akar. Mengembalikan fungsi pembersih. */
export const mulaiSinkron = () => {
	void tarik();
	const onVisible = () => { if (document.visibilityState === "visible") void tarik(); };
	document.addEventListener("visibilitychange", onVisible);
	const onOnline = () => { void tarik(); };
	window.addEventListener("online", onOnline);
	return () => {
		document.removeEventListener("visibilitychange", onVisible);
		window.removeEventListener("online", onOnline);
	};
};
