/*
 * Pembungkus reaktif (Svelte 5 runes) untuk data demo.
 * Objek `app.db` adalah proxy $state — mutasi langsung akan memicu render ulang.
 * Penyimpanan ke localStorage dilakukan lewat $effect di komponen akar.
 */
import { loadDb, resetDb, saveDb, type DB } from "./store";

export const app = $state<{ db: DB }>({ db: loadDb() });

export const simpan = () => saveDb($state.snapshot(app.db) as DB);
export const resetDemo = () => {
	app.db = resetDb();
};

/* ---------------------------------------------------------------- router hash */
export interface Rute {
	path: string; // contoh: "/layanan/anc"
	seg: string[]; // ["layanan", "anc"]
	query: Record<string, string>;
}
export const parseHash = (hash: string, fallback = "/beranda"): Rute => {
	let h = (hash || "").replace(/^#/, "");
	if (!h || h === "/") h = fallback;
	if (!h.startsWith("/")) h = "/" + h;
	const [pathPart, queryPart = ""] = h.split("?");
	const query: Record<string, string> = {};
	for (const kv of queryPart.split("&")) {
		if (!kv) continue;
		const [k, v = ""] = kv.split("=");
		query[decodeURIComponent(k)] = decodeURIComponent(v);
	}
	return { path: pathPart, seg: pathPart.split("/").filter(Boolean), query };
};
export const pergi = (path: string) => {
	if (typeof location === "undefined") return;
	location.hash = path.startsWith("#") ? path : `#${path}`;
};

export const buatRouter = (fallback: string) => {
	const r = $state<{ rute: Rute }>({ rute: parseHash(typeof location !== "undefined" ? location.hash : "", fallback) });
	if (typeof window !== "undefined") {
		window.addEventListener("hashchange", () => {
			r.rute = parseHash(location.hash, fallback);
			window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
		});
	}
	return r;
};
