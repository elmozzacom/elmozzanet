<script lang="ts">
	import { onMount } from "svelte";
	import { app, simpan, resetDemo, buatRouter, pergi } from "../../lib/portal/state.svelte";
	import { sinkron, mulaiSinkron, jadwalkanKirim } from "../../lib/portal/sinkron.svelte";
	import {
		LAYANAN, layananById, today, fmtTanggal, fmtTanggalPendek, fmtWaktu, waktuRelatif, inisial,
		hitungKehamilan, usiaBayi, masuk, keluar, bolehKantor,
		ubahStatusBooking, ubahRole, toggleAktif, setFitur, LABEL_FITUR,
		bookingHariIni, antreanMenunggu, ibuHamilAktif, imunisasiJatuhTempo, hitungPerLayanan,
		LABEL_STATUS_BOOKING, LABEL_STATUS_PASIEN, LABEL_ROLE, pasienById,
		type Role, type Fitur, type StatusBooking
	} from "../../lib/portal/store";

	const router = buatRouter("/dasbor");
	const rute = $derived(router.rute);
	const db = $derived(app.db);
	const sesi = $derived(db.session);
	const masukOk = $derived(bolehKantor(sesi));

	$effect(() => { JSON.stringify(app.db); simpan(); jadwalkanKirim(); });
	$effect(() => {
		if (rute.path !== "/masuk" && !masukOk) pergi("/masuk");
		if (rute.path === "/masuk" && masukOk) pergi("/dasbor");
	});
	onMount(() => {
		document.documentElement.classList.add("pk-html");
		document.body.classList.add("pk-body");
		return mulaiSinkron();
	});

	/* ---------- masuk ---------- */
	let tab = $state<"masuk" | "daftar">("masuk");
	let email = $state("");
	let sandi = $state("");
	let pesanMasuk = $state("");
	const prosesMasuk = (e?: string) => {
		const s = masuk(db, e ?? email);
		if (!s) { pesanMasuk = "Akun tidak ditemukan. Gunakan salah satu akun demo di bawah."; return; }
		if (!bolehKantor(s)) { pesanMasuk = "Akun pasien tidak memiliki akses Mode Kantor. Gunakan Portal Pasien."; keluar(db); return; }
		pesanMasuk = ""; pergi("/dasbor");
	};
	const demoAkun = db.users.filter((u) => u.role !== "pasien");

	/* ---------- data turunan ---------- */
	const hariIni = $derived(bookingHariIni(db).sort((a, b) => a.jam.localeCompare(b.jam)));
	const antrean = $derived(antreanMenunggu(db));
	const hamil = $derived(ibuHamilAktif(db));
	const imunTempo = $derived(imunisasiJatuhTempo(db, 7));
	const namaPasien = (id: string) => pasienById(db, id)?.nama ?? "—";

	/* ---------- pasien / CRM ---------- */
	let cari = $state("");
	let filterStatus = $state<string>("semua");
	const daftarPasien = $derived(db.pasien.filter((p) => (filterStatus === "semua" || p.status === filterStatus) && p.nama.toLowerCase().includes(cari.toLowerCase())));
	const infoPasien = (p: (typeof db.pasien)[number]) => {
		if (p.status === "hamil" && p.hpht) { const k = hitungKehamilan(p.hpht); return `${k.minggu} mgg • HPL ${fmtTanggalPendek(k.hpl)}`; }
		if (p.bayiLahir) return `${p.namaBayi ?? "Bayi"} • ${usiaBayi(p.bayiLahir)}`;
		return "—";
	};

	/* ---------- analitik ---------- */
	let periode = $state(30);
	const perLayanan = $derived(hitungPerLayanan(db, periode));
	const maksLayanan = $derived(Math.max(1, ...perLayanan.map((x) => x.jumlah)));
	const totalPeriode = $derived(perLayanan.reduce((a, x) => a + x.jumlah, 0));
	const selesaiPeriode = $derived(perLayanan.reduce((a, x) => a + x.selesai, 0));
	const tidakHadirPeriode = $derived(perLayanan.reduce((a, x) => a + x.tidakHadir, 0));

	const aktor = $derived(sesi?.nama ?? "Staf");
	const chipStatus = (s: string) => ({ menunggu: "ui-chip-sand", checkin: "ui-chip-sky", dipanggil: "ui-chip-teal", selesai: "ui-chip-sage", "tidak-hadir": "ui-chip-danger", dibatalkan: "ui-chip-neutral" } as Record<string, string>)[s] ?? "ui-chip-neutral";
	const chipRole = (r: Role) => ({ admin: "ui-chip-accent", bidan: "ui-chip-teal", staff: "ui-chip-sky", pasien: "ui-chip-neutral" })[r];
	const menu = [
		{ path: "/dasbor", label: "Dasbor", ic: "M3 10.5 12 3l9 7.5M5.5 9.5V20h13V9.5" },
		{ path: "/antrean", label: "Antrean", ic: "M4 6h16M4 12h16M4 18h10" },
		{ path: "/pasien", label: "Pasien", ic: "M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0zM4 21a8 8 0 0 1 16 0" },
		{ path: "/analitik", label: "Analitik", ic: "M4 20V10M10 20V4M16 20v-7M22 20H2" },
		{ path: "/pengguna", label: "Pengguna", ic: "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21a7 7 0 0 1 14 0M17 8a3 3 0 1 1 0 6M22 21a5 5 0 0 0-5-5" },
		{ path: "/log", label: "Log aktivitas", ic: "M12 8v4l3 3M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" },
		{ path: "/fitur", label: "Pengaturan fitur", ic: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.65 1.65 0 0 0 15 19.4M4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6" }
	];
	const judul: Record<string, [string, string]> = {
		"/dasbor": ["Dasbor", "Ringkasan operasional hari ini"],
		"/antrean": ["Antrean hari ini", "Panggil, selesaikan, atau tandai tidak hadir"],
		"/pasien": ["Pasien", "Daftar ibu & bayi yang terdaftar"],
		"/analitik": ["Analitik", "Kunjungan per layanan"],
		"/pengguna": ["Pengguna", "Level akses staf"],
		"/log": ["Log aktivitas", "Jejak tindakan di portal"],
		"/fitur": ["Pengaturan fitur", "Aktif/nonaktif fitur Portal Pasien"]
	};
</script>

{#if !masukOk}
	<div class="ko-masuk">
		<div class="ko-masuk-card">
			<div class="ui-banner-demo"><strong>DEMO</strong><span>Sandi tidak diperiksa. Data tersimpan di browser ini, bukan data pasien nyata.</span></div>
			<div class="ko-masuk-head"><div class="logo">E</div><h1>Mode Kantor</h1><p>Klinik El'Mozza — dasbor, antrean & pasien untuk bidan dan staf.</p></div>
			<div class="ko-tabs" role="tablist">
				<button type="button" role="tab" aria-selected={tab === "masuk"} onclick={() => (tab = "masuk")}>Masuk</button>
				<button type="button" role="tab" aria-selected={tab === "daftar"} onclick={() => (tab = "daftar")}>Daftar Pasien</button>
			</div>
			<div class="ko-masuk-body">
				{#if tab === "masuk"}
					<div class="ui-field"><label for="email">Email</label><input id="email" type="email" bind:value={email} placeholder="nama@klinik" autocomplete="username" /></div>
					<div class="ui-field"><label for="sandi">Kata sandi</label><input id="sandi" type="password" bind:value={sandi} placeholder="••••••••" autocomplete="current-password" /></div>
					<button class="ui-btn ui-btn-primary ui-btn-block" type="button" onclick={() => prosesMasuk()}>Masuk</button>
					{#if pesanMasuk}<div class="ui-alert ui-alert-err" role="alert">{pesanMasuk}</div>{/if}
					<p class="ui-hint" style="margin-top:0.8rem">Akun demo — klik untuk masuk cepat</p>
					<div class="ko-demo-akun">
						{#each demoAkun as u}
							<button type="button" onclick={() => prosesMasuk(u.email)}><strong>{LABEL_ROLE[u.role]}</strong> {u.email} <span class={`ui-chip ${chipRole(u.role)}`}>{u.nama}</span></button>
						{/each}
					</div>
					<a class="ui-btn ui-btn-ghost ui-btn-block" href="/portal" style="margin-top:0.8rem">← Lanjut sebagai pasien (Portal Pasien)</a>
				{:else}
					<div class="ui-alert ui-alert-info">Pendaftaran pasien baru pada versi demo dilakukan oleh staf di menu Pasien, atau melalui WhatsApp klinik.</div>
					<a class="ui-btn ui-btn-primary ui-btn-block" href="https://wa.me/628111712718" target="_blank" rel="noopener">Daftar via WhatsApp</a>
					<a class="ui-btn ui-btn-ghost ui-btn-block" href="/portal">Coba Portal Pasien (demo)</a>
				{/if}
			</div>
		</div>
	</div>
{:else}
	<div class="ko-shell">
		<aside class="ko-side">
			<a class="ko-brand" href="/kantor#/dasbor"><span class="logo">E</span><span><span class="t">Klinik El'Mozza</span><br /><span class="s">Mode Kantor • demo</span></span></a>
			<nav class="ko-nav" aria-label="Menu kantor">
				{#each menu as m}
					{#if m.path !== "/pengguna" || sesi?.role === "admin"}
						<a href={`#${m.path}`} aria-current={rute.path === m.path ? "page" : undefined}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d={m.ic} /></svg>{m.label}</a>
					{/if}
				{/each}
				<a href="/portal">📱 Portal Pasien</a>
			</nav>
			<div class="ko-side-foot">
				<div class="ui-avatar">{inisial(sesi?.nama ?? "")}</div>
				<div class="ui-row-main"><div class="ui-row-title">{sesi?.nama}</div><div class="ui-row-sub">{LABEL_ROLE[sesi?.role ?? "staff"]}</div></div>
				<button class="ui-btn ui-btn-ghost ui-btn-sm" type="button" onclick={() => { keluar(db); pergi("/masuk"); }}>Keluar</button>
			</div>
		</aside>

		<main class="ko-main">
			<div class="ui-banner-demo" style="margin:-1.25rem -1.5rem 1rem;border-radius:0"><strong>DEMO</strong><span>Data fiktif bersama (tersinkron). Bukan rekam medis. <em class={`ui-sync ui-sync-${sinkron.status}`}>{sinkron.status === "sinkron" ? "✓ tersinkron" : sinkron.status === "menyimpan" ? "menyimpan…" : sinkron.status === "offline" ? "offline — lokal" : sinkron.status === "konflik" ? "diperbarui dari server" : "memuat…"}</em></span><button type="button" onclick={() => { if (confirm("Reset seluruh data demo?")) resetDemo(); }}>Reset</button></div>
			<div class="ko-head"><div><h1>{judul[rute.path]?.[0] ?? "Kantor"}</h1><p>{judul[rute.path]?.[1] ?? ""} • {fmtTanggal(today(), true)}</p></div></div>

			{#if rute.path === "/dasbor"}
				<div class="ko-kpis">
					<a class="ko-kpi ko-kpi-teal" href="#/antrean" style="text-decoration:none;color:inherit"><div class="lbl">Booking hari ini</div><div class="val">{hariIni.length}</div><div class="sub">{hariIni.filter((b) => b.status === "selesai").length} selesai</div></a>
					<a class="ko-kpi ko-kpi-accent" href="#/antrean" style="text-decoration:none;color:inherit"><div class="lbl">Antrean menunggu</div><div class="val">{antrean.length}</div><div class="sub">{antrean.filter((b) => b.status === "checkin").length} sudah check-in</div></a>
					<a class="ko-kpi ko-kpi-rose" href="#/pasien" style="text-decoration:none;color:inherit"><div class="lbl">Ibu hamil aktif</div><div class="val">{hamil.length}</div><div class="sub">{hamil.filter((p) => p.hpht && hitungKehamilan(p.hpht).trimester === 3).length} trimester 3</div></a>
					<div class="ko-kpi ko-kpi-sky"><div class="lbl">Imunisasi 7 hari</div><div class="val">{imunTempo.length}</div><div class="sub">{imunTempo.filter((x) => x.item.status === "terlambat").length} terlambat</div></div>
				</div>
				<div class="ko-grid-2">
					<div class="ui-card">
						<div class="ui-card-title">Aktivitas terkini</div>
						<ul class="ko-feed">
							{#each db.log.slice(0, 8) as l}
								<li><span class="dot"></span><span><span class="aktor">{l.aktor}</span> — {l.aksi}</span><span class="wkt">{waktuRelatif(l.waktu)}</span></li>
							{/each}
						</ul>
					</div>
					<div>
						<div class="ui-card">
							<div class="ui-card-title">Pintasan</div>
							<div class="ko-shortcuts">
								<a class="ko-shortcut" href="#/antrean"><span class="ic">📣</span>Panggil pasien</a>
								<a class="ko-shortcut" href="#/pasien"><span class="ic">🤰</span>Daftar pasien</a>
								<a class="ko-shortcut" href="#/analitik"><span class="ic">📊</span>Analitik</a>
								<a class="ko-shortcut" href="#/fitur"><span class="ic">⚙️</span>Fitur portal</a>
							</div>
						</div>
						{#if imunTempo.length}
							<div class="ui-card" style="margin-top:0.85rem">
								<div class="ui-card-title">Imunisasi jatuh tempo</div>
								<ul class="ko-feed">
									{#each imunTempo.slice(0, 5) as x}
										<li><span class="dot" style={x.item.status === "terlambat" ? "background:var(--pk-danger)" : ""}></span><span><span class="aktor">{x.pasien.namaBayi ?? x.pasien.nama}</span> — {x.item.label}</span><span class="wkt">{fmtTanggalPendek(x.item.tanggal)}</span></li>
									{/each}
								</ul>
							</div>
						{/if}
					</div>
				</div>

			{:else if rute.path === "/antrean"}
				{#if hariIni.length === 0}<div class="ui-empty">Belum ada booking hari ini.</div>{/if}
				<div class="ko-antrean">
					{#each hariIni as b}
						<div class={`ui-row s-${b.status}`}>
							<span class="jam">{b.jam.replace(":", ".")}</span>
							<div class="ui-row-main"><div class="ui-row-title">{namaPasien(b.pasienId)}</div><div class="ui-row-sub">{layananById(b.layananId)?.nama} • kode {b.kode}</div></div>
							<span class={`ui-chip ${chipStatus(b.status)}`}>{LABEL_STATUS_BOOKING[b.status]}</span>
							<div class="ui-row-actions">
								{#if b.status === "menunggu" || b.status === "checkin"}
									<button class="ui-btn ui-btn-primary ui-btn-sm" type="button" onclick={() => ubahStatusBooking(db, b.id, "dipanggil", aktor)}>Panggil</button>
									<button class="ui-btn ui-btn-ghost ui-btn-sm" type="button" onclick={() => ubahStatusBooking(db, b.id, "tidak-hadir", aktor)}>Tidak hadir</button>
								{:else if b.status === "dipanggil"}
									<button class="ui-btn ui-btn-primary ui-btn-sm" type="button" onclick={() => ubahStatusBooking(db, b.id, "selesai", aktor)}>Selesai</button>
								{/if}
							</div>
						</div>
					{/each}
				</div>

			{:else if rute.path === "/pasien"}
				<div class="ko-toolbar">
					<div class="ui-field"><label for="cari" class="sr-only">Cari</label><input id="cari" bind:value={cari} placeholder="Cari nama pasien…" /></div>
					<div class="ui-seg">
						{#each ["semua", "hamil", "nifas", "bayi", "umum"] as s}
							<button type="button" aria-pressed={filterStatus === s} onclick={() => (filterStatus = s)}>{s === "semua" ? "Semua" : LABEL_STATUS_PASIEN[s as keyof typeof LABEL_STATUS_PASIEN]}</button>
						{/each}
					</div>
				</div>
				<div class="ko-table-wrap">
					<table class="ko-table">
						<thead><tr><th>Pasien</th><th>No.</th><th>Status</th><th>Info</th><th>Kunjungan terakhir</th></tr></thead>
						<tbody>
							{#each daftarPasien as p}
								<tr><td><strong>{p.nama}</strong></td><td>{p.noPasien}</td><td><span class={`ui-chip ${p.status === "hamil" ? "ui-chip-rose" : p.status === "bayi" ? "ui-chip-sky" : p.status === "nifas" ? "ui-chip-sand" : "ui-chip-neutral"}`}>{LABEL_STATUS_PASIEN[p.status]}</span></td><td>{infoPasien(p)}</td><td>{p.kunjunganTerakhir ? fmtTanggal(p.kunjunganTerakhir) : "—"}</td></tr>
							{/each}
							{#if daftarPasien.length === 0}<tr><td colspan="5" class="ui-muted">Tidak ada pasien yang cocok.</td></tr>{/if}
						</tbody>
					</table>
				</div>

			{:else if rute.path === "/analitik"}
				<div class="ko-toolbar">
					<div class="ui-seg">{#each [7, 30, 90] as h}<button type="button" aria-pressed={periode === h} onclick={() => (periode = h)}>{h} hari</button>{/each}</div>
				</div>
				<div class="ko-kpis">
					<div class="ko-kpi ko-kpi-teal"><div class="lbl">Total kunjungan</div><div class="val">{totalPeriode}</div><div class="sub">{periode} hari terakhir</div></div>
					<div class="ko-kpi ko-kpi-sage"><div class="lbl">Selesai</div><div class="val">{selesaiPeriode}</div><div class="sub">{totalPeriode ? Math.round((selesaiPeriode / totalPeriode) * 100) : 0}% dari total</div></div>
					<div class="ko-kpi ko-kpi-rose"><div class="lbl">Tidak hadir</div><div class="val">{tidakHadirPeriode}</div><div class="sub">{totalPeriode ? Math.round((tidakHadirPeriode / totalPeriode) * 100) : 0}% dari total</div></div>
				</div>
				<div class="ui-card">
					<div class="ui-card-title">Kunjungan per layanan</div>
					<div class="ko-bars">
						{#each perLayanan as x}
							<div class="ko-bar"><span class="lbl">{x.layanan.ikon} {x.layanan.singkat}</span><span class="track"><span class="fill" style={`width:${(x.jumlah / maksLayanan) * 100}%`}></span></span><span class="num">{x.jumlah}</span></div>
						{/each}
					</div>
				</div>

			{:else if rute.path === "/pengguna"}
				{#if sesi?.role !== "admin"}
					<div class="ui-alert ui-alert-warn">Hanya admin yang dapat mengelola pengguna.</div>
				{:else}
					<div class="ko-table-wrap">
						<table class="ko-table">
							<thead><tr><th>Nama</th><th>Email</th><th>Level</th><th>Status</th><th></th></tr></thead>
							<tbody>
								{#each db.users as u}
									<tr>
										<td><strong>{u.nama}</strong></td><td>{u.email}</td>
										<td><select value={u.role} onchange={(e) => ubahRole(db, u.id, (e.currentTarget as HTMLSelectElement).value as Role, aktor)} disabled={u.id === sesi?.userId}>{#each ["admin", "bidan", "staff", "pasien"] as r}<option value={r}>{LABEL_ROLE[r as Role]}</option>{/each}</select></td>
										<td><span class={`ui-chip ${u.aktif ? "ui-chip-sage" : "ui-chip-danger"}`}>{u.aktif ? "Aktif" : "Nonaktif"}</span></td>
										<td><button class="ui-btn ui-btn-outline ui-btn-sm" type="button" disabled={u.id === sesi?.userId} onclick={() => toggleAktif(db, u.id, aktor)}>{u.aktif ? "Nonaktifkan" : "Aktifkan"}</button></td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}

			{:else if rute.path === "/log"}
				<div class="ui-card">
					<ul class="ko-feed ko-log">
						{#each db.log as l}<li><span class="dot"></span><span class="aksi"><span class="aktor">{l.aktor}</span> — {l.aksi}</span><span class="wkt">{fmtWaktu(l.waktu)}</span></li>{/each}
					</ul>
				</div>

			{:else if rute.path === "/fitur"}
				<div class="ko-fitur">
					{#each Object.keys(LABEL_FITUR) as k}
						{@const key = k as keyof Fitur}
						<div class="ui-row">
							<div class="ui-row-main"><div class="ui-row-title">{LABEL_FITUR[key].nama}</div><div class="ui-row-sub">{LABEL_FITUR[key].keterangan}</div></div>
							<button class="ui-toggle" type="button" role="switch" aria-checked={db.fitur[key]} aria-label={LABEL_FITUR[key].nama} onclick={() => setFitur(db, key, !db.fitur[key], aktor)}></button>
						</div>
					{/each}
				</div>
			{:else}
				<div class="ui-empty">Halaman tidak ditemukan.</div>
			{/if}
		</main>
	</div>
{/if}
