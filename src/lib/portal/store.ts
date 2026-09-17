/*
 * Lapisan data DEMO Portal Klinik El'Mozza.
 * Seluruh data di sini FIKTIF dan disimpan di localStorage browser pengguna.
 * Tidak ada data pasien nyata, tidak ada NIK, tidak ada nomor telepon nyata.
 */

export type Role = "admin" | "bidan" | "staff" | "pasien";
export type StatusPasien = "hamil" | "nifas" | "bayi" | "umum";
export type StatusBooking =
	| "menunggu"
	| "checkin"
	| "dipanggil"
	| "selesai"
	| "tidak-hadir"
	| "dibatalkan";

export interface User {
	id: string;
	nama: string;
	email: string;
	role: Role;
	aktif: boolean;
}

export interface Pasien {
	id: string;
	noPasien: string;
	nama: string;
	status: StatusPasien;
	hpht?: string; // YYYY-MM-DD
	bayiLahir?: string; // YYYY-MM-DD
	namaBayi?: string;
	kunjunganTerakhir?: string;
	ancSelesai: string[];
	imunisasiSelesai: string[];
	userId?: string;
}

export interface Layanan {
	id: string;
	nama: string;
	singkat: string;
	deskripsi: string;
	durasi: number; // menit
	ikon: string; // emoji sederhana
	warna: "teal" | "accent" | "sage" | "sand" | "rose" | "sky";
}

export interface Booking {
	id: string;
	pasienId: string;
	layananId: string;
	tanggal: string; // YYYY-MM-DD
	jam: string; // HH:MM
	kode: string;
	status: StatusBooking;
	dibuat: string; // ISO datetime
	catatan?: string;
}

export interface Notifikasi {
	id: string;
	pasienId: string;
	judul: string;
	isi: string;
	waktu: string; // ISO datetime
	dibaca: boolean;
}

export interface LogAktivitas {
	id: string;
	waktu: string;
	aktor: string;
	aksi: string;
}

export interface Fitur {
	bookingOnline: boolean;
	checkinMandiri: boolean;
	bukuKia: boolean;
	notifikasi: boolean;
	promo: boolean;
}

export interface Session {
	userId: string;
	role: Role;
	nama: string;
}

export interface DB {
	versi: number;
	seededOn: string;
	users: User[];
	pasien: Pasien[];
	bookings: Booking[];
	notif: Notifikasi[];
	log: LogAktivitas[];
	fitur: Fitur;
	session: Session | null;
	pasienAktifId: string;
}

export const STORAGE_KEY = "elmozza-portal-demo";
export const DB_VERSI = 3;
export const JAM_BUKA = "07:30";
export const JAM_TUTUP = "21:00";
export const WA_KLINIK = "628111712718";

/* ---------------------------------------------------------------- tanggal */
const pad = (n: number) => String(n).padStart(2, "0");
export const isoLocal = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const today = () => isoLocal(new Date());
export const nowIso = () => new Date().toISOString();
export const parseIso = (s: string) => {
	const [y, m, d] = s.split("-").map(Number);
	return new Date(y, m - 1, d);
};
export const addDays = (s: string, n: number) => {
	const d = parseIso(s);
	d.setDate(d.getDate() + n);
	return isoLocal(d);
};
export const addMonths = (s: string, n: number) => {
	const d = parseIso(s);
	d.setMonth(d.getMonth() + n);
	return isoLocal(d);
};
/** a - b dalam hari */
export const diffDays = (a: string, b: string) =>
	Math.round((parseIso(a).getTime() - parseIso(b).getTime()) / 86400000);

export const fmtTanggal = (s: string, panjang = false) =>
	parseIso(s).toLocaleDateString("id-ID", {
		weekday: panjang ? "long" : "short",
		day: "numeric",
		month: panjang ? "long" : "short",
		year: "numeric"
	});
export const fmtTanggalPendek = (s: string) =>
	parseIso(s).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
export const fmtWaktu = (iso: string) => {
	const d = new Date(iso);
	return (
		d.toLocaleDateString("id-ID", { day: "numeric", month: "short" }) +
		" " +
		d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
	);
};
export const waktuRelatif = (iso: string) => {
	const menit = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
	if (menit < 1) return "baru saja";
	if (menit < 60) return `${menit} mnt lalu`;
	const jam = Math.round(menit / 60);
	if (jam < 24) return `${jam} jam lalu`;
	const hari = Math.round(jam / 24);
	return `${hari} hari lalu`;
};

/* ---------------------------------------------------------------- layanan */
export const LAYANAN: Layanan[] = [
	{
		id: "anc",
		nama: "Pemeriksaan Kehamilan (ANC)",
		singkat: "Periksa Hamil",
		deskripsi: "Pemantauan kehamilan rutin: tekanan darah, berat badan, tinggi fundus, detak jantung janin, dan edukasi.",
		durasi: 30,
		ikon: "🤰",
		warna: "teal"
	},
	{
		id: "persalinan",
		nama: "Persiapan Persalinan",
		singkat: "Persiapan Lahir",
		deskripsi: "Konsultasi rencana persalinan, tanda-tanda persalinan, dan kelas persiapan untuk ibu dan pendamping.",
		durasi: 45,
		ikon: "🌸",
		warna: "rose"
	},
	{
		id: "laktasi",
		nama: "Konsultasi Menyusui",
		singkat: "Laktasi",
		deskripsi: "Pendampingan menyusui, posisi & pelekatan, manajemen ASI, dan solusi keluhan menyusui.",
		durasi: 30,
		ikon: "🍼",
		warna: "sand"
	},
	{
		id: "nifas",
		nama: "Nifas & Bayi Baru Lahir",
		singkat: "Nifas & Bayi",
		deskripsi: "Kunjungan nifas ibu dan pemeriksaan bayi baru lahir: pemulihan, perawatan tali pusat, kuning bayi.",
		durasi: 30,
		ikon: "👶",
		warna: "sky"
	},
	{
		id: "imunisasi",
		nama: "Imunisasi Dasar Bayi",
		singkat: "Imunisasi",
		deskripsi: "Imunisasi dasar lengkap sesuai jadwal nasional: HB-0, BCG, Polio, DPT-HB-Hib, Campak/MR.",
		durasi: 20,
		ikon: "💉",
		warna: "accent"
	},
	{
		id: "kb",
		nama: "Kesehatan Reproduksi & KB",
		singkat: "KB & Repro",
		deskripsi: "Konseling dan pelayanan keluarga berencana serta kesehatan reproduksi wanita.",
		durasi: 30,
		ikon: "💚",
		warna: "sage"
	},
	{
		id: "tumbuh-kembang",
		nama: "Tumbuh Kembang Bayi",
		singkat: "Tumbuh Kembang",
		deskripsi: "Pemantauan berat, tinggi, lingkar kepala, dan tahapan perkembangan bayi & balita.",
		durasi: 30,
		ikon: "📏",
		warna: "sky"
	},
	{
		id: "mpasi",
		nama: "Konsultasi MPASI",
		singkat: "MPASI",
		deskripsi: "Panduan makanan pendamping ASI: waktu mulai, tekstur, porsi, dan menu bergizi.",
		durasi: 30,
		ikon: "🥣",
		warna: "sand"
	}
];
export const layananById = (id: string) => LAYANAN.find((l) => l.id === id);

/* ---------------------------------------------------------------- slot jam */
export const SLOT_JAM: string[] = (() => {
	const out: string[] = [];
	let h = 7,
		m = 30;
	while (h < 21) {
		out.push(`${pad(h)}:${pad(m)}`);
		m += 30;
		if (m === 60) {
			m = 0;
			h += 1;
		}
	}
	return out; // 07:30 s.d. 20:30
})();

/* ---------------------------------------------------------------- kode */
const KODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const buatKode = (rand = Math.random) =>
	Array.from({ length: 6 }, () => KODE_CHARS[Math.floor(rand() * KODE_CHARS.length)]).join("");
export const uid = (p: string) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export const inisial = (nama: string) =>
	nama
		.replace(/^(Ibu|Bapak|Ny\.|Bp\.)\s+/i, "")
		.split(/\s+/)
		.slice(0, 2)
		.map((s) => s[0]?.toUpperCase() ?? "")
		.join("");

/* ---------------------------------------------------------------- kehamilan */
export interface InfoKehamilan {
	hpht: string;
	hpl: string;
	minggu: number;
	hari: number;
	trimester: 1 | 2 | 3;
	sisaHari: number;
}
export const hitungKehamilan = (hpht: string, ref = today()): InfoKehamilan => {
	const total = Math.max(0, diffDays(ref, hpht));
	const minggu = Math.floor(total / 7);
	const hari = total % 7;
	const trimester: 1 | 2 | 3 = minggu < 13 ? 1 : minggu < 28 ? 2 : 3;
	const hpl = addDays(hpht, 280);
	return { hpht, hpl, minggu, hari, trimester, sisaHari: diffDays(hpl, ref) };
};

/* ---------------------------------------------------------------- Buku KIA */
export interface JadwalANC {
	id: string;
	label: string;
	trimester: 1 | 2 | 3;
	mingguMin: number;
	mingguMaks: number;
	keterangan: string;
}
export const JADWAL_ANC: JadwalANC[] = [
	{ id: "K1", label: "K1", trimester: 1, mingguMin: 0, mingguMaks: 12, keterangan: "Kunjungan pertama, skrining awal & pemeriksaan laboratorium dasar" },
	{ id: "K2", label: "K2", trimester: 1, mingguMin: 0, mingguMaks: 12, keterangan: "Kunjungan kedua trimester 1 (termasuk USG oleh dokter)" },
	{ id: "K3", label: "K3", trimester: 2, mingguMin: 13, mingguMaks: 27, keterangan: "Pemantauan trimester 2, edukasi gizi & tanda bahaya" },
	{ id: "K4", label: "K4", trimester: 3, mingguMin: 28, mingguMaks: 32, keterangan: "Pemantauan posisi janin & tekanan darah" },
	{ id: "K5", label: "K5", trimester: 3, mingguMin: 33, mingguMaks: 36, keterangan: "Persiapan persalinan (termasuk USG oleh dokter)" },
	{ id: "K6", label: "K6", trimester: 3, mingguMin: 37, mingguMaks: 42, keterangan: "Kunjungan menjelang persalinan" }
];

export type StatusJadwal = "selesai" | "terlambat" | "jatuh-tempo" | "belum";
export interface ItemANC extends JadwalANC {
	status: StatusJadwal;
}
export const statusANC = (p: Pasien, ref = today()): ItemANC[] => {
	if (!p.hpht) return JADWAL_ANC.map((j) => ({ ...j, status: p.ancSelesai.includes(j.id) ? "selesai" : "belum" }));
	const { minggu } = hitungKehamilan(p.hpht, ref);
	return JADWAL_ANC.map((j) => {
		let status: StatusJadwal = "belum";
		if (p.ancSelesai.includes(j.id)) status = "selesai";
		else if (minggu > j.mingguMaks) status = "terlambat";
		else if (minggu >= j.mingguMin) status = "jatuh-tempo";
		return { ...j, status };
	});
};

export interface JadwalImunisasi {
	id: string;
	label: string;
	usiaBulan: number; // usia ideal pemberian
	toleransiHari: number; // rentang jatuh tempo
	keterangan: string;
}
export const JADWAL_IMUNISASI: JadwalImunisasi[] = [
	{ id: "HB0", label: "Hepatitis B (HB-0)", usiaBulan: 0, toleransiHari: 7, keterangan: "Idealnya < 24 jam setelah lahir" },
	{ id: "BCG-P1", label: "BCG + Polio tetes 1", usiaBulan: 1, toleransiHari: 30, keterangan: "Usia 1 bulan" },
	{ id: "DPT1", label: "DPT-HB-Hib 1 + Polio 2 + PCV 1 + Rotavirus 1", usiaBulan: 2, toleransiHari: 30, keterangan: "Usia 2 bulan" },
	{ id: "DPT2", label: "DPT-HB-Hib 2 + Polio 3 + PCV 2 + Rotavirus 2", usiaBulan: 3, toleransiHari: 30, keterangan: "Usia 3 bulan" },
	{ id: "DPT3", label: "DPT-HB-Hib 3 + Polio 4 + IPV 1 + Rotavirus 3", usiaBulan: 4, toleransiHari: 30, keterangan: "Usia 4 bulan" },
	{ id: "MR", label: "Campak-Rubella (MR) 1 + IPV 2", usiaBulan: 9, toleransiHari: 30, keterangan: "Usia 9 bulan" },
	{ id: "PCV3", label: "PCV 3", usiaBulan: 12, toleransiHari: 30, keterangan: "Usia 12 bulan" },
	{ id: "DPT4", label: "DPT-HB-Hib lanjutan + MR 2", usiaBulan: 18, toleransiHari: 60, keterangan: "Usia 18 bulan" }
];
export interface ItemImunisasi extends JadwalImunisasi {
	tanggal: string;
	status: StatusJadwal;
	selisihHari: number; // tanggal - ref
}
export const statusImunisasi = (p: Pasien, ref = today()): ItemImunisasi[] => {
	if (!p.bayiLahir) return [];
	return JADWAL_IMUNISASI.map((j) => {
		const tanggal = addMonths(p.bayiLahir!, j.usiaBulan);
		const selisih = diffDays(tanggal, ref);
		let status: StatusJadwal = "belum";
		if (p.imunisasiSelesai.includes(j.id)) status = "selesai";
		else if (selisih < -j.toleransiHari) status = "terlambat";
		else if (selisih <= 14) status = "jatuh-tempo";
		return { ...j, tanggal, status, selisihHari: selisih };
	});
};
export const usiaBayi = (lahir: string, ref = today()) => {
	const hari = diffDays(ref, lahir);
	if (hari < 0) return "belum lahir";
	if (hari < 31) return `${hari} hari`;
	const bulan = Math.floor(hari / 30.44);
	if (bulan < 24) return `${bulan} bulan`;
	return `${Math.floor(bulan / 12)} tahun ${bulan % 12} bulan`;
};

/* ---------------------------------------------------------------- seed */
const NAMA_DEMO = [
	"Ibu Siti Demo",
	"Ibu Rina Contoh",
	"Ibu Dewi Uji",
	"Ibu Maya Sampel",
	"Ibu Lestari Demo",
	"Ibu Putri Contoh",
	"Ibu Wulan Uji",
	"Ibu Nadia Sampel",
	"Ibu Fitri Demo",
	"Ibu Hana Contoh",
	"Ibu Intan Uji",
	"Ibu Yuni Sampel"
];

/** PRNG deterministik supaya seed konsisten antar-muat */
const mulberry = (seed: number) => () => {
	seed |= 0;
	seed = (seed + 0x6d2b79f5) | 0;
	let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
	t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
	return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export const buatSeed = (ref = today()): DB => {
	const rand = mulberry(20260917);
	const pick = <T>(arr: T[]) => arr[Math.floor(rand() * arr.length)];

	const users: User[] = [
		{ id: "u_admin", nama: "Admin Demo", email: "admin@demo.elmozza", role: "admin", aktif: true },
		{ id: "u_bidan", nama: "Bidan Demo", email: "bidan@demo.elmozza", role: "bidan", aktif: true },
		{ id: "u_staff", nama: "Staf Demo", email: "staff@demo.elmozza", role: "staff", aktif: true },
		{ id: "u_pasien", nama: "Ibu Siti Demo", email: "pasien@demo.elmozza", role: "pasien", aktif: true }
	];

	const pasien: Pasien[] = NAMA_DEMO.map((nama, i) => {
		const status: StatusPasien = i % 4 === 0 ? "hamil" : i % 4 === 1 ? "bayi" : i % 4 === 2 ? "nifas" : i % 4 === 3 && i > 4 ? "umum" : "hamil";
		const p: Pasien = {
			id: `p_${i + 1}`,
			noPasien: `EM-DEMO-${String(1001 + i)}`,
			nama,
			status,
			ancSelesai: [],
			imunisasiSelesai: [],
			kunjunganTerakhir: addDays(ref, -Math.floor(rand() * 60))
		};
		if (status === "hamil") {
			const minggu = 8 + Math.floor(rand() * 30);
			p.hpht = addDays(ref, -(minggu * 7 + Math.floor(rand() * 7)));
			p.ancSelesai = JADWAL_ANC.filter((j) => j.mingguMaks < minggu - 2).map((j) => j.id);
		}
		if (status === "bayi") {
			const hari = 10 + Math.floor(rand() * 300);
			p.bayiLahir = addDays(ref, -hari);
			p.namaBayi = pick(["Bayi Aisyah", "Bayi Zahra", "Bayi Rafa", "Bayi Kenzie", "Bayi Nayla"]);
			const bulan = hari / 30.44;
			p.imunisasiSelesai = JADWAL_IMUNISASI.filter((j) => j.usiaBulan < bulan - 0.6).map((j) => j.id);
		}
		if (status === "nifas") {
			p.bayiLahir = addDays(ref, -(3 + Math.floor(rand() * 35)));
			p.namaBayi = pick(["Bayi Alya", "Bayi Ghani", "Bayi Salsa"]);
			p.imunisasiSelesai = ["HB0"];
		}
		return p;
	});
	// Pasien demo utama: hamil trimester 2 agar kartu HPL informatif
	pasien[0].userId = "u_pasien";
	pasien[0].status = "hamil";
	pasien[0].hpht = addDays(ref, -(22 * 7 + 3));
	pasien[0].ancSelesai = ["K1", "K2"];
	pasien[0].bayiLahir = undefined;
	pasien[0].namaBayi = undefined;

	const bookings: Booking[] = [];
	const layananUntuk = (p: Pasien): string => {
		if (p.status === "hamil") return pick(["anc", "anc", "anc", "persalinan"]);
		if (p.status === "bayi") return pick(["imunisasi", "imunisasi", "tumbuh-kembang", "mpasi"]);
		if (p.status === "nifas") return pick(["nifas", "laktasi"]);
		return pick(["kb", "laktasi"]);
	};
	// Riwayat 90 hari terakhir
	for (let i = 0; i < 58; i++) {
		const p = pick(pasien);
		const tanggal = addDays(ref, -(1 + Math.floor(rand() * 89)));
		bookings.push({
			id: `b_hist_${i}`,
			pasienId: p.id,
			layananId: layananUntuk(p),
			tanggal,
			jam: pick(SLOT_JAM),
			kode: buatKode(rand),
			status: rand() < 0.88 ? "selesai" : "tidak-hadir",
			dibuat: new Date(parseIso(tanggal).getTime() - 86400000 * 2).toISOString()
		});
	}
	// Hari ini (antrean)
	const hariIni: Array<[string, string, StatusBooking]> = [
		["p_2", "08:00", "selesai"],
		["p_5", "08:30", "selesai"],
		["p_3", "09:00", "dipanggil"],
		["p_6", "09:30", "checkin"],
		["p_9", "10:00", "menunggu"],
		["p_7", "10:30", "menunggu"],
		["p_10", "14:00", "menunggu"],
		["p_4", "16:30", "menunggu"]
	];
	hariIni.forEach(([pid, jam, status], i) => {
		const p = pasien.find((x) => x.id === pid)!;
		bookings.push({
			id: `b_today_${i}`,
			pasienId: pid,
			layananId: layananUntuk(p),
			tanggal: ref,
			jam,
			kode: buatKode(rand),
			status,
			dibuat: new Date(Date.now() - 86400000).toISOString()
		});
	});
	// Booking pasien demo: satu mendatang, satu riwayat
	bookings.push({
		id: "b_demo_next",
		pasienId: "p_1",
		layananId: "anc",
		tanggal: addDays(ref, 3),
		jam: "09:30",
		kode: "ANC4K2",
		status: "menunggu",
		dibuat: new Date(Date.now() - 3600000 * 5).toISOString()
	});
	bookings.push({
		id: "b_demo_prev",
		pasienId: "p_1",
		layananId: "anc",
		tanggal: addDays(ref, -28),
		jam: "10:00",
		kode: "K2DONE",
		status: "selesai",
		dibuat: new Date(Date.now() - 86400000 * 30).toISOString()
	});
	bookings.sort((a, b) => (a.tanggal + a.jam).localeCompare(b.tanggal + b.jam));

	const notif: Notifikasi[] = [
		{
			id: "n_1",
			pasienId: "p_1",
			judul: "Pengingat pemeriksaan kehamilan",
			isi: `Jadwal ANC Ibu pada ${fmtTanggal(addDays(ref, 3))} pukul 09.30. Silakan check-in dengan kode ANC4K2 saat tiba.`,
			waktu: new Date(Date.now() - 3600000 * 4).toISOString(),
			dibaca: false
		},
		{
			id: "n_2",
			pasienId: "p_1",
			judul: "Kelas Persiapan Persalinan",
			isi: "Kelas persiapan persalinan untuk ibu trimester 3 dibuka setiap Sabtu pagi. Daftar melalui menu Layanan.",
			waktu: new Date(Date.now() - 86400000 * 2).toISOString(),
			dibaca: false
		},
		{
			id: "n_3",
			pasienId: "p_1",
			judul: "Kunjungan K2 selesai",
			isi: "Terima kasih, kunjungan K2 Ibu telah tercatat di Buku KIA digital.",
			waktu: new Date(Date.now() - 86400000 * 28).toISOString(),
			dibaca: true
		}
	];

	const log: LogAktivitas[] = [
		{ id: "l_1", waktu: new Date(Date.now() - 3600000 * 2).toISOString(), aktor: "Bidan Demo", aksi: "Menyelesaikan kunjungan Ibu Rina Contoh (ANC)" },
		{ id: "l_2", waktu: new Date(Date.now() - 3600000 * 1.5).toISOString(), aktor: "Staf Demo", aksi: "Check-in Ibu Putri Contoh" },
		{ id: "l_3", waktu: new Date(Date.now() - 3600000).toISOString(), aktor: "Bidan Demo", aksi: "Memanggil Ibu Dewi Uji ke ruang periksa" },
		{ id: "l_4", waktu: new Date(Date.now() - 1800000).toISOString(), aktor: "Sistem", aksi: "Booking baru: Ibu Siti Demo (ANC)" }
	];

	return {
		versi: DB_VERSI,
		seededOn: ref,
		users,
		pasien,
		bookings,
		notif,
		log,
		fitur: { bookingOnline: true, checkinMandiri: true, bukuKia: true, notifikasi: true, promo: true },
		session: null,
		pasienAktifId: "p_1"
	};
};

/* ---------------------------------------------------------------- persist */
export const loadDb = (): DB => {
	if (typeof localStorage === "undefined") return buatSeed();
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (raw) {
			const parsed = JSON.parse(raw) as DB;
			if (parsed.versi === DB_VERSI) return parsed;
		}
	} catch {
		/* abaikan, buat seed baru */
	}
	const seed = buatSeed();
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
	} catch {
		/* private mode */
	}
	return seed;
};
export const saveDb = (db: DB) => {
	if (typeof localStorage === "undefined") return;
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
	} catch {
		/* penyimpanan penuh / private */
	}
};
export const resetDb = (): DB => {
	const seed = buatSeed();
	saveDb(seed);
	return seed;
};

/* ---------------------------------------------------------------- aksi */
export const catatLog = (db: DB, aktor: string, aksi: string) => {
	db.log.unshift({ id: uid("l"), waktu: nowIso(), aktor, aksi });
	if (db.log.length > 200) db.log.length = 200;
};
export const kirimNotif = (db: DB, pasienId: string, judul: string, isi: string) => {
	db.notif.unshift({ id: uid("n"), pasienId, judul, isi, waktu: nowIso(), dibaca: false });
};

export const pasienAktif = (db: DB) => db.pasien.find((p) => p.id === db.pasienAktifId) ?? db.pasien[0];
export const pasienById = (db: DB, id: string) => db.pasien.find((p) => p.id === id);
export const userById = (db: DB, id: string) => db.users.find((u) => u.id === id);

export const masuk = (db: DB, email: string): Session | null => {
	const u = db.users.find((x) => x.email.toLowerCase() === email.trim().toLowerCase() && x.aktif);
	if (!u) return null;
	db.session = { userId: u.id, role: u.role, nama: u.nama };
	catatLog(db, u.nama, `Masuk ke portal (${u.role})`);
	return db.session;
};
export const keluar = (db: DB) => {
	if (db.session) catatLog(db, db.session.nama, "Keluar dari portal");
	db.session = null;
};
export const bolehKantor = (s: Session | null) => !!s && (s.role === "admin" || s.role === "bidan" || s.role === "staff");

export const slotTerisi = (db: DB, tanggal: string) =>
	db.bookings.filter((b) => b.tanggal === tanggal && b.status !== "dibatalkan" && b.status !== "tidak-hadir").map((b) => b.jam);

export const buatBooking = (db: DB, pasienId: string, layananId: string, tanggal: string, jam: string, catatan?: string): Booking => {
	let kode = buatKode();
	while (db.bookings.some((b) => b.kode === kode)) kode = buatKode();
	const b: Booking = { id: uid("b"), pasienId, layananId, tanggal, jam, kode, status: "menunggu", dibuat: nowIso(), catatan };
	db.bookings.push(b);
	const p = pasienById(db, pasienId);
	const l = layananById(layananId);
	catatLog(db, "Sistem", `Booking baru: ${p?.nama ?? pasienId} (${l?.singkat ?? layananId}) ${fmtTanggalPendek(tanggal)} ${jam}`);
	kirimNotif(db, pasienId, "Booking berhasil dibuat", `${l?.nama ?? layananId} pada ${fmtTanggal(tanggal)} pukul ${jam.replace(":", ".")}. Kode check-in: ${kode}.`);
	return b;
};
export const batalkanBooking = (db: DB, id: string, oleh = "Pasien") => {
	const b = db.bookings.find((x) => x.id === id);
	if (!b || b.status === "selesai") return false;
	b.status = "dibatalkan";
	const p = pasienById(db, b.pasienId);
	catatLog(db, oleh, `Membatalkan booking ${b.kode} (${p?.nama ?? ""})`);
	kirimNotif(db, b.pasienId, "Booking dibatalkan", `Booking ${b.kode} pada ${fmtTanggal(b.tanggal)} telah dibatalkan.`);
	return true;
};
export const checkIn = (db: DB, kode: string): { ok: boolean; pesan: string; booking?: Booking } => {
	const k = kode.trim().toUpperCase();
	const b = db.bookings.find((x) => x.kode === k);
	if (!b) return { ok: false, pesan: "Kode tidak ditemukan. Periksa kembali kode pada tiket Ibu." };
	if (b.status === "dibatalkan") return { ok: false, pesan: "Booking ini sudah dibatalkan." };
	if (b.status === "selesai") return { ok: false, pesan: "Kunjungan ini sudah selesai." };
	if (b.status !== "menunggu") return { ok: true, pesan: "Ibu sudah check-in sebelumnya. Silakan menunggu dipanggil.", booking: b };
	if (b.tanggal !== today()) return { ok: false, pesan: `Check-in hanya dapat dilakukan pada hari kunjungan (${fmtTanggal(b.tanggal)}).` };
	b.status = "checkin";
	const p = pasienById(db, b.pasienId);
	catatLog(db, "Check-in mandiri", `Check-in ${p?.nama ?? ""} kode ${b.kode}`);
	kirimNotif(db, b.pasienId, "Check-in berhasil", `Ibu sudah terdaftar di antrean hari ini. Mohon menunggu, bidan akan memanggil nama Ibu.`);
	return { ok: true, pesan: "Check-in berhasil. Silakan menunggu, bidan akan memanggil nama Ibu.", booking: b };
};
export const ubahStatusBooking = (db: DB, id: string, status: StatusBooking, aktor: string) => {
	const b = db.bookings.find((x) => x.id === id);
	if (!b) return;
	b.status = status;
	const p = pasienById(db, b.pasienId);
	const l = layananById(b.layananId);
	const label: Record<StatusBooking, string> = {
		menunggu: "Menunggu",
		checkin: "Sudah check-in",
		dipanggil: "Dipanggil",
		selesai: "Selesai",
		"tidak-hadir": "Tidak hadir",
		dibatalkan: "Dibatalkan"
	};
	catatLog(db, aktor, `${label[status]}: ${p?.nama ?? ""} (${l?.singkat ?? ""})`);
	if (status === "dipanggil") kirimNotif(db, b.pasienId, "Giliran Ibu sekarang", `Silakan masuk ke ruang periksa untuk ${l?.nama ?? "pemeriksaan"}.`);
	if (status === "selesai") {
		kirimNotif(db, b.pasienId, "Kunjungan selesai", `Terima kasih. Kunjungan ${l?.nama ?? ""} telah tercatat.`);
		if (p) p.kunjunganTerakhir = today();
	}
	if (status === "tidak-hadir") kirimNotif(db, b.pasienId, "Kunjungan terlewat", `Ibu tercatat tidak hadir pada ${fmtTanggal(b.tanggal)}. Silakan buat booking ulang.`);
};
export const ubahRole = (db: DB, userId: string, role: Role, aktor: string) => {
	const u = userById(db, userId);
	if (!u) return;
	u.role = role;
	catatLog(db, aktor, `Mengubah level ${u.nama} menjadi ${role}`);
};
export const toggleAktif = (db: DB, userId: string, aktor: string) => {
	const u = userById(db, userId);
	if (!u) return;
	u.aktif = !u.aktif;
	catatLog(db, aktor, `${u.aktif ? "Mengaktifkan" : "Menonaktifkan"} akun ${u.nama}`);
};
export const setFitur = (db: DB, key: keyof Fitur, nilai: boolean, aktor: string) => {
	db.fitur[key] = nilai;
	catatLog(db, aktor, `${nilai ? "Mengaktifkan" : "Menonaktifkan"} fitur ${LABEL_FITUR[key].nama}`);
};
export const LABEL_FITUR: Record<keyof Fitur, { nama: string; keterangan: string }> = {
	bookingOnline: { nama: "Booking online", keterangan: "Pasien dapat membuat janji dari Portal Pasien" },
	checkinMandiri: { nama: "Check-in mandiri", keterangan: "Pasien check-in sendiri dengan kode tiket saat tiba" },
	bukuKia: { nama: "Buku KIA digital", keterangan: "Checklist ANC dan jadwal imunisasi di Portal Pasien" },
	notifikasi: { nama: "Notifikasi pasien", keterangan: "Pengingat & pemberitahuan di dalam portal" },
	promo: { nama: "Banner promo & kelas", keterangan: "Informasi kelas dan program klinik di beranda pasien" }
};

/* ---------------------------------------------------------------- analitik */
export const bookingHariIni = (db: DB, ref = today()) => db.bookings.filter((b) => b.tanggal === ref && b.status !== "dibatalkan");
export const antreanMenunggu = (db: DB, ref = today()) =>
	db.bookings.filter((b) => b.tanggal === ref && (b.status === "menunggu" || b.status === "checkin" || b.status === "dipanggil"));
export const ibuHamilAktif = (db: DB) => db.pasien.filter((p) => p.status === "hamil");
export const imunisasiJatuhTempo = (db: DB, hari = 7, ref = today()) => {
	const out: Array<{ pasien: Pasien; item: ItemImunisasi }> = [];
	for (const p of db.pasien) {
		if (!p.bayiLahir) continue;
		for (const it of statusImunisasi(p, ref)) {
			if (it.status === "selesai") continue;
			if (it.selisihHari <= hari && it.selisihHari >= -it.toleransiHari) out.push({ pasien: p, item: it });
		}
	}
	return out;
};
export const hitungPerLayanan = (db: DB, hari: number, ref = today()) => {
	const mulai = addDays(ref, -hari);
	const hasil = LAYANAN.map((l) => ({ layanan: l, jumlah: 0, selesai: 0, tidakHadir: 0 }));
	for (const b of db.bookings) {
		if (b.tanggal < mulai || b.tanggal > ref || b.status === "dibatalkan") continue;
		const h = hasil.find((x) => x.layanan.id === b.layananId);
		if (!h) continue;
		h.jumlah++;
		if (b.status === "selesai") h.selesai++;
		if (b.status === "tidak-hadir") h.tidakHadir++;
	}
	return hasil.sort((a, b) => b.jumlah - a.jumlah);
};
export const LABEL_STATUS_BOOKING: Record<StatusBooking, string> = {
	menunggu: "Menunggu",
	checkin: "Sudah check-in",
	dipanggil: "Dipanggil",
	selesai: "Selesai",
	"tidak-hadir": "Tidak hadir",
	dibatalkan: "Dibatalkan"
};
export const LABEL_STATUS_PASIEN: Record<StatusPasien, string> = {
	hamil: "Hamil",
	nifas: "Nifas",
	bayi: "Bayi/Balita",
	umum: "Umum"
};
export const LABEL_ROLE: Record<Role, string> = {
	admin: "Admin",
	bidan: "Bidan",
	staff: "Staf",
	pasien: "Pasien"
};
