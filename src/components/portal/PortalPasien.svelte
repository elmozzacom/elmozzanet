<script lang="ts">
	import { onMount } from "svelte";
	import { app, simpan, resetDemo, buatRouter, pergi } from "../../lib/portal/state.svelte";
	import { sinkron, mulaiSinkron, jadwalkanKirim } from "../../lib/portal/sinkron.svelte";
	import {
		LAYANAN, layananById, SLOT_JAM, JAM_BUKA, JAM_TUTUP, WA_KLINIK,
		today, addDays, fmtTanggal, fmtTanggalPendek, fmtWaktu, waktuRelatif, inisial,
		hitungKehamilan, statusANC, statusImunisasi, usiaBayi,
		pasienAktif, slotTerisi, buatBooking, batalkanBooking, checkIn, catatLog,
		LABEL_STATUS_BOOKING, type Booking, type StatusJadwal
	} from "../../lib/portal/store";
	import { buatQR, qrPath } from "../../lib/portal/qr";

	const router = buatRouter("/beranda");
	const rute = $derived(router.rute);
	const db = $derived(app.db);
	const saya = $derived(pasienAktif(db));
	const notifSaya = $derived(db.notif.filter((n) => n.pasienId === saya.id));
	const belumDibaca = $derived(notifSaya.filter((n) => !n.dibaca).length);
	const bookingSaya = $derived(db.bookings.filter((b) => b.pasienId === saya.id).sort((a, b) => (a.tanggal + a.jam).localeCompare(b.tanggal + b.jam)));
	const mendatang = $derived(bookingSaya.filter((b) => b.tanggal >= today() && (b.status === "menunggu" || b.status === "checkin" || b.status === "dipanggil")));
	const riwayat = $derived(bookingSaya.filter((b) => !mendatang.includes(b)).reverse());
	const hamil = $derived(saya.hpht ? hitungKehamilan(saya.hpht) : null);
	const fitur = $derived(db.fitur);

	$effect(() => {
		// simpan setiap perubahan state ke localStorage
		JSON.stringify(app.db);
		simpan();
		jadwalkanKirim();
	});
	onMount(() => {
		document.documentElement.classList.add("pk-html");
		document.body.classList.add("pk-body");
		return mulaiSinkron();
	});

	/* ---------- booking ---------- */
	let bkLayanan = $state<string>("");
	let bkTanggal = $state<string>("");
	let bkJam = $state<string>("");
	let bkCatatan = $state("");
	const hari14 = $derived(Array.from({ length: 14 }, (_, i) => addDays(today(), i)));
	const terisi = $derived(bkTanggal ? slotTerisi(db, bkTanggal) : []);
	const slotTersedia = (jam: string) => {
		if (terisi.includes(jam)) return false;
		if (bkTanggal === today()) {
			const now = new Date();
			const [h, m] = jam.split(":").map(Number);
			if (h * 60 + m <= now.getHours() * 60 + now.getMinutes()) return false;
		}
		return true;
	};
	const mulaiBooking = (id: string) => {
		bkLayanan = id; bkTanggal = ""; bkJam = ""; bkCatatan = "";
		pergi(`/booking?layanan=${id}`);
	};
	const konfirmasiBooking = () => {
		if (!bkLayanan || !bkTanggal || !bkJam) return;
		const b = buatBooking(db, saya.id, bkLayanan, bkTanggal, bkJam, bkCatatan || undefined);
		bkLayanan = ""; bkTanggal = ""; bkJam = "";
		pergi(`/tiket/${b.id}`);
	};
	const labelHari = (s: string) => {
		const d = new Date(s + "T00:00:00");
		return { d: d.toLocaleDateString("id-ID", { weekday: "short" }), n: d.getDate(), m: d.toLocaleDateString("id-ID", { month: "short" }) };
	};

	/* ---------- check-in ---------- */
	let kodeInput = $state("");
	let hasilCheckin = $state<{ ok: boolean; pesan: string } | null>(null);
	const prosesCheckin = () => {
		hasilCheckin = checkIn(db, kodeInput);
		if (hasilCheckin.ok) kodeInput = "";
	};

	/* ---------- profil ---------- */
	let editHpht = $state("");
	let editBayi = $state("");
	let editNamaBayi = $state("");
	const simpanProfil = () => {
		saya.hpht = editHpht || undefined;
		saya.bayiLahir = editBayi || undefined;
		saya.namaBayi = editNamaBayi || undefined;
		if (saya.hpht) saya.status = "hamil";
		else if (saya.bayiLahir) saya.status = "bayi";
		catatLog(db, saya.nama, "Memperbarui profil kehamilan/bayi");
		pergi("/beranda");
	};
	$effect(() => {
		if (rute.path === "/profil") {
			editHpht = saya.hpht ?? ""; editBayi = saya.bayiLahir ?? ""; editNamaBayi = saya.namaBayi ?? "";
		}
		if (rute.path === "/booking" && rute.query.layanan && bkLayanan !== rute.query.layanan) {
			bkLayanan = rute.query.layanan; bkTanggal = ""; bkJam = "";
		}
	});

	const bacaSemua = () => notifSaya.forEach((n) => (n.dibaca = true));
	const toggleAnc = (id: string) => {
		const i = saya.ancSelesai.indexOf(id);
		if (i >= 0) saya.ancSelesai.splice(i, 1); else saya.ancSelesai.push(id);
	};
	const toggleImun = (id: string) => {
		const i = saya.imunisasiSelesai.indexOf(id);
		if (i >= 0) saya.imunisasiSelesai.splice(i, 1); else saya.imunisasiSelesai.push(id);
	};
	const labelStatusJadwal: Record<StatusJadwal, string> = { selesai: "Selesai", "jatuh-tempo": "Jatuh tempo", terlambat: "Terlambat", belum: "Belum waktunya" };
	const chipStatus = (s: string) => ({ menunggu: "ui-chip-sand", checkin: "ui-chip-sky", dipanggil: "ui-chip-teal", selesai: "ui-chip-sage", "tidak-hadir": "ui-chip-danger", dibatalkan: "ui-chip-neutral" } as Record<string, string>)[s] ?? "ui-chip-neutral";
	const tiketDari = (id: string): Booking | undefined => db.bookings.find((b) => b.id === id);
	const jumlahLayanan = (id: string) => bookingSaya.filter((b) => b.layananId === id && b.status === "selesai").length;

	const tabs = [
		{ path: "/beranda", label: "Beranda" },
		{ path: "/jadwal", label: "Jadwal" },
		{ path: "/layanan", label: "Layanan", center: true },
		{ path: "/kia", label: "Buku KIA" },
		{ path: "/profil", label: "Profil" }
	];
	const aktifTab = (p: string) => rute.path === p || (p === "/layanan" && (rute.path.startsWith("/layanan") || rute.path.startsWith("/booking")));
</script>

<div class="pk-app">
	<div class="ui-banner-demo" role="status">
		<strong>DEMO</strong>
		<span>Data demo bersama (tersinkron) — bukan data pasien nyata. <em class={`ui-sync ui-sync-${sinkron.status}`}>{sinkron.status === "sinkron" ? "✓ tersinkron" : sinkron.status === "menyimpan" ? "menyimpan…" : sinkron.status === "offline" ? "offline — lokal" : sinkron.status === "konflik" ? "diperbarui dari server" : "memuat…"}</em></span>
		<button type="button" onclick={() => { if (confirm("Reset seluruh data demo?")) resetDemo(); }}>Reset</button>
	</div>

	{#if rute.path === "/beranda"}
		<div class="pk-page">
			<section class="pk-hero">
				<div class="pk-hero-row">
					<div class="ui-avatar">{inisial(saya.nama)}</div>
					<div class="pk-hero-nama">
						<div class="halo">Assalamu'alaikum,</div>
						<div class="nama">{saya.nama} <span class="ui-chip">Aktif</span></div>
						<div class="no">No. Pasien {saya.noPasien}</div>
					</div>
					<button class="pk-bell" type="button" aria-label="Notifikasi" onclick={() => pergi("/notifikasi")}>
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
						{#if belumDibaca > 0}<span class="pk-badge">{belumDibaca}</span>{/if}
					</button>
				</div>
			</section>

			<section class="ui-card pk-hamil">
				{#if hamil}
					<div class="ui-card-title">Kehamilan Saya <span class="ui-chip ui-chip-teal">Trimester {hamil.trimester}</span></div>
					<div class="pk-hamil-grid">
						<div class="pk-stat"><div class="lbl">Usia kehamilan</div><div class="val">{hamil.minggu} mgg <small>{hamil.hari} hari</small></div></div>
						<div class="pk-stat"><div class="lbl">Perkiraan lahir</div><div class="val">{fmtTanggalPendek(hamil.hpl)} <small>{hamil.sisaHari > 0 ? `${hamil.sisaHari} hari lagi` : "sudah lewat HPL"}</small></div></div>
					</div>
					<div class="pk-progress" aria-hidden="true"><span style={`width:${Math.min(100, (hamil.minggu / 40) * 100)}%`}></span></div>
					<p class="ui-hint">HPL dihitung dari HPHT {fmtTanggal(hamil.hpht)} (rumus Naegele). Kepastian ditentukan bidan/dokter.</p>
				{:else if saya.bayiLahir}
					<div class="ui-card-title">{saya.namaBayi ?? "Bayi Saya"} <span class="ui-chip ui-chip-sky">{usiaBayi(saya.bayiLahir)}</span></div>
					<p class="ui-muted">Lahir {fmtTanggal(saya.bayiLahir, true)}. Lihat jadwal imunisasi di Buku KIA.</p>
				{:else}
					<div class="ui-card-title">Kehamilan / Bayi</div>
					<p class="ui-muted">Belum diisi. Isi HPHT atau tanggal lahir bayi di Profil agar jadwal ANC dan imunisasi muncul.</p>
					<button class="ui-btn ui-btn-outline ui-btn-sm" type="button" onclick={() => pergi("/profil")}>Isi sekarang</button>
				{/if}
			</section>

			<div class="pk-shortcuts">
				{#if fitur.bookingOnline}<button class="pk-shortcut pk-shortcut-teal" type="button" onclick={() => pergi("/layanan")}><span class="ic">📅</span><span>Buat janji<br /><small>Pilih layanan & jam</small></span></button>{/if}
				{#if fitur.checkinMandiri}<button class="pk-shortcut pk-shortcut-accent" type="button" onclick={() => pergi("/check-in")}><span class="ic">✅</span><span>Check-in<br /><small>Sudah tiba di klinik</small></span></button>{/if}
			</div>

			{#if mendatang.length}
				<div class="pk-section-title"><h2>Kunjungan berikutnya</h2><a href="#/jadwal">Semua</a></div>
				{#each mendatang.slice(0, 1) as b}
					<button class="ui-row" type="button" style="width:100%;text-align:left;cursor:pointer" onclick={() => pergi(`/tiket/${b.id}`)}>
						<div class="ui-avatar">{layananById(b.layananId)?.ikon}</div>
						<div class="ui-row-main"><div class="ui-row-title">{layananById(b.layananId)?.nama}</div><div class="ui-row-sub">{fmtTanggal(b.tanggal, true)} • {b.jam.replace(":", ".")}</div></div>
						<span class={`ui-chip ${chipStatus(b.status)}`}>{LABEL_STATUS_BOOKING[b.status]}</span>
					</button>
				{/each}
			{/if}

			<div class="pk-section-title"><h2>Layanan</h2><a href="#/layanan">Lihat semua</a></div>
			<div class="pk-tiles">
				{#each LAYANAN.slice(0, 6) as l}
					<button class="pk-tile" type="button" onclick={() => pergi(`/layanan/${l.id}`)}>
						<span class={`ic ic-${l.warna}`}>{l.ikon}</span>
						<span class="lbl">{l.singkat}</span>
						{#if jumlahLayanan(l.id)}<span class="cnt">{jumlahLayanan(l.id)}</span>{/if}
					</button>
				{/each}
			</div>

			{#if fitur.promo}
				<div class="pk-section-title"><h2>Program klinik</h2></div>
				<div class="pk-promo-scroll">
					<button class="pk-promo pk-promo-1" type="button" onclick={() => mulaiBooking("anc")}><span class="tag">ANC</span><span class="ttl">Periksa Hamil Rutin</span><span class="sub">Pantau ibu & janin tiap trimester</span></button>
					<button class="pk-promo pk-promo-2" type="button" onclick={() => mulaiBooking("persalinan")}><span class="tag">KELAS</span><span class="ttl">Persiapan Persalinan</span><span class="sub">Setiap Sabtu pagi, bersama pendamping</span></button>
					<button class="pk-promo pk-promo-3" type="button" onclick={() => mulaiBooking("imunisasi")}><span class="tag">IMUNISASI</span><span class="ttl">Imunisasi Dasar Lengkap</span><span class="sub">Sesuai jadwal nasional</span></button>
				</div>
			{/if}
		</div>

	{:else if rute.path === "/layanan"}
		<div class="pk-topbar"><h1>Layanan Klinik</h1></div>
		<div class="pk-page">
			<div class="ui-list">
				{#each LAYANAN as l}
					<button class="ui-row" type="button" style="width:100%;text-align:left;cursor:pointer" onclick={() => pergi(`/layanan/${l.id}`)}>
						<div class={`ui-avatar ic-${l.warna}`}>{l.ikon}</div>
						<div class="ui-row-main"><div class="ui-row-title">{l.nama}</div><div class="ui-row-sub">± {l.durasi} menit</div></div>
						<span class="arr">›</span>
					</button>
				{/each}
			</div>
		</div>

	{:else if rute.seg[0] === "layanan" && rute.seg[1]}
		{@const l = layananById(rute.seg[1])}
		<div class="pk-topbar"><button class="pk-back" type="button" aria-label="Kembali" onclick={() => history.back()}>‹</button><h1>{l?.nama ?? "Layanan"}</h1></div>
		<div class="pk-page">
			{#if l}
				<div class="ui-card">
					<div class={`ui-avatar ic-${l.warna}`} style="width:3.4rem;height:3.4rem;font-size:1.6rem">{l.ikon}</div>
					<p style="margin:0.8rem 0 0.4rem">{l.deskripsi}</p>
					<p class="ui-muted">Durasi ± {l.durasi} menit • Praktik {JAM_BUKA.replace(":", ".")}–{JAM_TUTUP.replace(":", ".")} setiap hari</p>
					{#if fitur.bookingOnline}
						<button class="ui-btn ui-btn-primary ui-btn-block" type="button" onclick={() => mulaiBooking(l.id)}>Buat janji</button>
					{:else}
						<a class="ui-btn ui-btn-primary ui-btn-block" href={`https://wa.me/${WA_KLINIK}`} target="_blank" rel="noopener">Hubungi via WhatsApp</a>
					{/if}
				</div>
			{:else}
				<div class="ui-empty">Layanan tidak ditemukan.</div>
			{/if}
		</div>

	{:else if rute.path === "/booking"}
		{@const l = layananById(bkLayanan || rute.query.layanan || "")}
		<div class="pk-topbar"><button class="pk-back" type="button" aria-label="Kembali" onclick={() => history.back()}>‹</button><h1>Buat Janji</h1></div>
		<div class="pk-page">
			{#if !fitur.bookingOnline}
				<div class="ui-alert ui-alert-warn">Booking online sedang dinonaktifkan. Silakan hubungi klinik via WhatsApp.</div>
			{:else if !l}
				<div class="ui-empty">Pilih layanan dulu.</div>
				<button class="ui-btn ui-btn-primary ui-btn-block" type="button" onclick={() => pergi("/layanan")}>Pilih layanan</button>
			{:else}
				<div class="pk-steps"><span class="done">1 Layanan</span><span class={bkTanggal ? "done" : ""}>2 Tanggal</span><span class={bkJam ? "done" : ""}>3 Jam</span><span>4 Konfirmasi</span></div>
				<div class="ui-card"><div class="ui-row-title">{l.ikon} {l.nama}</div><div class="ui-row-sub">± {l.durasi} menit</div></div>

				<div class="pk-section-title"><h2>Pilih tanggal</h2></div>
				<div class="pk-days">
					{#each hari14 as h}
						{@const x = labelHari(h)}
						<button class="pk-day" type="button" aria-pressed={bkTanggal === h} onclick={() => { bkTanggal = h; bkJam = ""; }}><span class="d">{x.d}</span><span class="n">{x.n}</span><span class="m">{x.m}</span></button>
					{/each}
				</div>

				{#if bkTanggal}
					<div class="pk-section-title"><h2>Pilih jam</h2></div>
					<div class="pk-slots">
						{#each SLOT_JAM as j}
							<button class="pk-slot" type="button" disabled={!slotTersedia(j)} aria-pressed={bkJam === j} onclick={() => (bkJam = j)}>{j.replace(":", ".")}</button>
						{/each}
					</div>
				{/if}

				{#if bkJam}
					<div class="ui-field"><label for="catatan">Catatan (opsional)</label><textarea id="catatan" rows="2" bind:value={bkCatatan} placeholder="Keluhan singkat atau permintaan khusus"></textarea></div>
					<dl class="pk-summary">
						<div><dt>Layanan</dt><dd>{l.nama}</dd></div>
						<div><dt>Tanggal</dt><dd>{fmtTanggal(bkTanggal, true)}</dd></div>
						<div><dt>Jam</dt><dd>{bkJam.replace(":", ".")}</dd></div>
					</dl>
					<button class="ui-btn ui-btn-primary ui-btn-block" type="button" onclick={konfirmasiBooking}>Konfirmasi janji</button>
				{/if}
			{/if}
		</div>

	{:else if rute.seg[0] === "tiket" && rute.seg[1]}
		{@const b = tiketDari(rute.seg[1])}
		<div class="pk-topbar"><button class="pk-back" type="button" aria-label="Kembali" onclick={() => pergi("/jadwal")}>‹</button><h1>Tiket Kunjungan</h1></div>
		<div class="pk-page">
			{#if b}
				{@const l = layananById(b.layananId)}
				{@const qr = buatQR(`ELMOZZA|${b.kode}`)}
				<div class="pk-tiket">
					<div class="pk-tiket-head"><div class="ttl">{l?.nama}</div><div class="sub">Klinik El'Mozza • {saya.nama}</div></div>
					<div class="pk-tiket-body">
						<svg class="ui-qr" viewBox={`0 0 ${qr.size} ${qr.size}`} shape-rendering="crispEdges" role="img" aria-label={`Kode QR ${b.kode}`}><path d={qrPath(qr)} /></svg>
						<div class="pk-kode-lbl">Kode check-in</div>
						<div class="pk-kode">{b.kode}</div>
						<div class="pk-tiket-meta">
							<div><div class="lbl">Tanggal</div><div class="val">{fmtTanggal(b.tanggal)}</div></div>
							<div><div class="lbl">Jam</div><div class="val">{b.jam.replace(":", ".")}</div></div>
							<div><div class="lbl">Status</div><div class="val"><span class={`ui-chip ${chipStatus(b.status)}`}>{LABEL_STATUS_BOOKING[b.status]}</span></div></div>
						</div>
					</div>
				</div>
				<p class="ui-hint" style="text-align:center">Tunjukkan kode ini saat tiba, atau check-in mandiri lewat menu Check-in.</p>
				{#if b.status === "menunggu" && b.tanggal === today() && fitur.checkinMandiri}
					<button class="ui-btn ui-btn-primary ui-btn-block" type="button" onclick={() => { kodeInput = b.kode; pergi("/check-in"); }}>Check-in sekarang</button>
				{/if}
				{#if b.status === "menunggu" || b.status === "checkin"}
					<button class="ui-btn ui-btn-ghost ui-btn-block" type="button" onclick={() => { if (confirm("Batalkan janji ini?")) { batalkanBooking(db, b.id, saya.nama); pergi("/jadwal"); } }}>Batalkan janji</button>
				{/if}
			{:else}
				<div class="ui-empty">Tiket tidak ditemukan.</div>
			{/if}
		</div>

	{:else if rute.path === "/check-in"}
		<div class="pk-topbar"><h1>Check-in Mandiri</h1></div>
		<div class="pk-page">
			{#if !fitur.checkinMandiri}
				<div class="ui-alert ui-alert-warn">Check-in mandiri sedang dinonaktifkan. Silakan lapor ke petugas.</div>
			{:else}
				<div class="ui-card">
					<p class="ui-muted">Masukkan kode 6 huruf dari tiket Ibu. Check-in hanya bisa pada hari kunjungan.</p>
					<div class="ui-field pk-kode-input"><label for="kode">Kode check-in</label><input id="kode" bind:value={kodeInput} maxlength="6" autocapitalize="characters" placeholder="ABC123" onkeydown={(e) => e.key === "Enter" && prosesCheckin()} /></div>
					<button class="ui-btn ui-btn-primary ui-btn-block" type="button" onclick={prosesCheckin} disabled={kodeInput.trim().length < 6}>Proses check-in</button>
					{#if hasilCheckin}<div class={`ui-alert ${hasilCheckin.ok ? "ui-alert-ok" : "ui-alert-err"}`} role="status">{hasilCheckin.pesan}</div>{/if}
				</div>
				{#if mendatang.filter((b) => b.tanggal === today()).length}
					<div class="pk-section-title"><h2>Kunjungan hari ini</h2></div>
					{#each mendatang.filter((b) => b.tanggal === today()) as b}
						<div class="ui-row"><div class="ui-row-main"><div class="ui-row-title">{layananById(b.layananId)?.nama}</div><div class="ui-row-sub">{b.jam.replace(":", ".")} • kode {b.kode}</div></div><span class={`ui-chip ${chipStatus(b.status)}`}>{LABEL_STATUS_BOOKING[b.status]}</span></div>
					{/each}
				{/if}
			{/if}
		</div>

	{:else if rute.path === "/jadwal"}
		<div class="pk-topbar"><h1>Jadwal Saya</h1></div>
		<div class="pk-page">
			<div class="pk-section-title"><h2>Mendatang</h2></div>
			{#if mendatang.length === 0}<div class="ui-empty">Belum ada janji. <a href="#/layanan">Buat janji</a></div>{/if}
			<div class="ui-list">
				{#each mendatang as b}
					<button class="ui-row" type="button" style="width:100%;text-align:left;cursor:pointer" onclick={() => pergi(`/tiket/${b.id}`)}>
						<div class="ui-avatar">{layananById(b.layananId)?.ikon}</div>
						<div class="ui-row-main"><div class="ui-row-title">{layananById(b.layananId)?.nama}</div><div class="ui-row-sub">{fmtTanggal(b.tanggal, true)} • {b.jam.replace(":", ".")} • kode {b.kode}</div></div>
						<span class={`ui-chip ${chipStatus(b.status)}`}>{LABEL_STATUS_BOOKING[b.status]}</span>
					</button>
				{/each}
			</div>
			{#if riwayat.length}
				<div class="pk-section-title"><h2>Riwayat</h2></div>
				<div class="ui-list">
					{#each riwayat as b}
						<div class="ui-row"><div class="ui-avatar">{layananById(b.layananId)?.ikon}</div><div class="ui-row-main"><div class="ui-row-title">{layananById(b.layananId)?.nama}</div><div class="ui-row-sub">{fmtTanggal(b.tanggal)} • {b.jam.replace(":", ".")}</div></div><span class={`ui-chip ${chipStatus(b.status)}`}>{LABEL_STATUS_BOOKING[b.status]}</span></div>
					{/each}
				</div>
			{/if}
		</div>

	{:else if rute.path === "/notifikasi"}
		<div class="pk-topbar"><button class="pk-back" type="button" aria-label="Kembali" onclick={() => pergi("/beranda")}>‹</button><h1>Notifikasi</h1>{#if belumDibaca}<button class="ui-btn ui-btn-ghost ui-btn-sm" type="button" onclick={bacaSemua}>Tandai dibaca</button>{/if}</div>
		<div class="pk-page">
			{#if !fitur.notifikasi}<div class="ui-alert ui-alert-info">Notifikasi dinonaktifkan oleh klinik.</div>{/if}
			{#if notifSaya.length === 0}<div class="ui-empty">Belum ada notifikasi.</div>{/if}
			{#each notifSaya as n}
				<button class={`pk-notif ${n.dibaca ? "read" : "unread"}`} type="button" style="width:100%;text-align:left" onclick={() => (n.dibaca = true)}>
					<span class="dot"></span>
					<div><div class="ttl">{n.judul}</div><div class="isi">{n.isi}</div><div class="wkt">{waktuRelatif(n.waktu)} • {fmtWaktu(n.waktu)}</div></div>
				</button>
			{/each}
		</div>

	{:else if rute.path === "/kia"}
		<div class="pk-topbar"><h1>Buku KIA Digital</h1></div>
		<div class="pk-page">
			{#if !fitur.bukuKia}
				<div class="ui-alert ui-alert-warn">Buku KIA digital sedang dinonaktifkan.</div>
			{:else}
				<div class="ui-alert ui-alert-info">Panduan umum. Jadwal pasti ditentukan bidan/dokter sesuai kondisi ibu dan bayi.</div>
				<div class="pk-section-title"><h2>Kunjungan kehamilan (ANC)</h2></div>
				{#if !saya.hpht}<div class="ui-empty">Isi HPHT di <a href="#/profil">Profil</a> untuk melihat jadwal.</div>{/if}
				{#each statusANC(saya) as k}
					<div class={`pk-kia-item ${k.status}`}>
						<span class="k">{k.label}</span>
						<div class="body"><div class="ttl">Trimester {k.trimester} • minggu {k.mingguMin}–{k.mingguMaks}</div><div class="sub">{k.keterangan} • <strong>{labelStatusJadwal[k.status]}</strong></div></div>
						<button class={`ui-btn ui-btn-sm ${k.status === "selesai" ? "ui-btn-ghost" : "ui-btn-outline"}`} type="button" onclick={() => toggleAnc(k.id)}>{k.status === "selesai" ? "Batal" : "Selesai"}</button>
					</div>
				{/each}

				<div class="pk-section-title" style="margin-top:1rem"><h2>Imunisasi dasar bayi</h2></div>
				{#if !saya.bayiLahir}
					<div class="ui-empty">Isi tanggal lahir bayi di <a href="#/profil">Profil</a> untuk melihat jadwal.</div>
				{:else}
					{#each statusImunisasi(saya) as im}
						<div class={`pk-kia-item ${im.status}`}>
							<span class="k">{im.usiaBulan}b</span>
							<div class="body"><div class="ttl">{im.label}</div><div class="sub">{fmtTanggal(im.tanggal)} • <strong>{labelStatusJadwal[im.status]}</strong></div></div>
							<button class={`ui-btn ui-btn-sm ${im.status === "selesai" ? "ui-btn-ghost" : "ui-btn-outline"}`} type="button" onclick={() => toggleImun(im.id)}>{im.status === "selesai" ? "Batal" : "Selesai"}</button>
						</div>
					{/each}
				{/if}
			{/if}
		</div>

	{:else if rute.path === "/profil"}
		<div class="pk-topbar"><h1>Profil</h1></div>
		<div class="pk-page">
			<div class="pk-profil-head"><div class="ui-avatar">{inisial(saya.nama)}</div><div class="ui-row-title">{saya.nama}</div><div class="ui-row-sub">No. Pasien {saya.noPasien}</div></div>
			<div class="ui-card">
				<div class="ui-card-title">Data kehamilan & bayi</div>
				<div class="ui-field"><label for="hpht">HPHT (hari pertama haid terakhir)</label><input id="hpht" type="date" bind:value={editHpht} max={today()} /></div>
				<div class="ui-field"><label for="bayi">Tanggal lahir bayi</label><input id="bayi" type="date" bind:value={editBayi} max={today()} /></div>
				<div class="ui-field"><label for="namabayi">Nama panggilan bayi</label><input id="namabayi" bind:value={editNamaBayi} placeholder="mis. Bayi Aisyah" /></div>
				<button class="ui-btn ui-btn-primary ui-btn-block" type="button" onclick={simpanProfil}>Simpan</button>
			</div>
			<div class="pk-menu">
				<a href="#/notifikasi">🔔 Notifikasi <span class="arr">›</span></a>
				<a href="#/jadwal">📅 Jadwal saya <span class="arr">›</span></a>
				<a href={`https://wa.me/${WA_KLINIK}`} target="_blank" rel="noopener">💬 Hubungi klinik via WhatsApp <span class="arr">›</span></a>
				<a href="/">🏠 Kembali ke situs klinik <span class="arr">›</span></a>
				<a href="/kantor">🗝️ Mode kantor (staf) <span class="arr">›</span></a>
			</div>
		</div>

	{:else}
		<div class="pk-page"><div class="ui-empty">Halaman tidak ditemukan. <a href="#/beranda">Ke beranda</a></div></div>
	{/if}

	<nav class="pk-tabbar" aria-label="Navigasi portal">
		{#each tabs as t}
			<a class={`pk-tab ${t.center ? "pk-tab-center" : ""}`} href={`#${t.path}`} aria-current={aktifTab(t.path) ? "page" : undefined}>
				{#if t.center}
					<span class="pk-tab-logo">+</span>
				{:else if t.path === "/beranda"}
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9.5V20a1 1 0 0 0 1 1H10v-6h4v6h3.5a1 1 0 0 0 1-1V9.5"/></svg>
				{:else if t.path === "/jadwal"}
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 9.5h17M8 3.5V6.5M16 3.5V6.5"/></svg>
				{:else if t.path === "/kia"}
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4.5h6a3 3 0 0 1 3 3V20a2 2 0 0 0-2-2H4z"/><path d="M20 4.5h-6a3 3 0 0 0-3 3V20a2 2 0 0 1 2-2h7z"/></svg>
				{:else}
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>
				{/if}
				<span>{t.label}</span>
				{#if t.path === "/beranda" && belumDibaca}<span class="pk-badge">{belumDibaca}</span>{/if}
			</a>
		{/each}
	</nav>
</div>
