/*
 * API sinkronisasi Portal Klinik ↔ D1 (`elmozza-klinik-db`, tabel `portal_state`).
 * Satu dokumen JSON per klinik. Demo bersama — bukan rekam medis.
 *
 * GET  /api/portal/state            → { rev, versi, data|null, updated_at }
 * PUT  /api/portal/state            ← { rev, versi, data }  (optimistic: rev harus sama)
 *      200 { rev }  |  409 { rev, data } bila rev tertinggal (klien harus merge/ambil ulang)
 */
import type { APIRoute } from "astro";

const KLINIK = "elmozza";
const MAKS_BYTE = 900_000; // batas aman kolom TEXT D1 (1 MB)
const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
	new Response(JSON.stringify(body), {
		status,
		headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...extra }
	});

type Row = { versi: number; rev: number; data: string; updated_at: string };

const dbDari = (locals: App.Locals) => {
	const db = locals.runtime?.env?.DB;
	if (!db) throw new Error("D1 binding DB tidak tersedia");
	return db;
};

export const GET: APIRoute = async ({ locals }) => {
	try {
		const db = dbDari(locals);
		const row = await db.prepare("SELECT versi, rev, data, updated_at FROM portal_state WHERE klinik = ?").bind(KLINIK).first<Row>();
		if (!row) return json({ rev: 0, versi: 0, data: null, updated_at: null });
		return json({ rev: row.rev, versi: row.versi, data: JSON.parse(row.data), updated_at: row.updated_at });
	} catch (e) {
		return json({ error: (e as Error).message }, 500);
	}
};

export const PUT: APIRoute = async ({ request, locals }) => {
	try {
		const db = dbDari(locals);
		const body = (await request.json()) as { rev?: number; versi?: number; data?: unknown };
		if (typeof body.rev !== "number" || typeof body.versi !== "number" || !body.data || typeof body.data !== "object") {
			return json({ error: "Format tidak valid" }, 400);
		}
		// Session bersifat per-perangkat, jangan disimpan bersama.
		const data = { ...(body.data as Record<string, unknown>), session: null };
		const teks = JSON.stringify(data);
		if (teks.length > MAKS_BYTE) return json({ error: "Data terlalu besar" }, 413);

		const now = new Date().toISOString();
		const ada = await db.prepare("SELECT rev, data FROM portal_state WHERE klinik = ?").bind(KLINIK).first<Pick<Row, "rev" | "data">>();
		if (!ada) {
			await db.prepare("INSERT INTO portal_state (klinik, versi, rev, data, updated_at) VALUES (?, ?, 1, ?, ?)").bind(KLINIK, body.versi, teks, now).run();
			return json({ rev: 1 });
		}
		if (ada.rev !== body.rev) return json({ rev: ada.rev, data: JSON.parse(ada.data) }, 409);
		const baru = ada.rev + 1;
		const r = await db
			.prepare("UPDATE portal_state SET versi = ?, rev = ?, data = ?, updated_at = ? WHERE klinik = ? AND rev = ?")
			.bind(body.versi, baru, teks, now, KLINIK, body.rev)
			.run();
		if (!r.meta.changes) {
			const terkini = await db.prepare("SELECT rev, data FROM portal_state WHERE klinik = ?").bind(KLINIK).first<Pick<Row, "rev" | "data">>();
			return json({ rev: terkini?.rev ?? 0, data: terkini ? JSON.parse(terkini.data) : null }, 409);
		}
		return json({ rev: baru });
	} catch (e) {
		return json({ error: (e as Error).message }, 500);
	}
};

export const prerender = false;
