// Banner gerak Klinik El'Mozza — tampil di bawah header klinik.elmozza.com.
// 1280x400, 30 fps, 10 dtk, loop mulus (frame akhir = frame awal).
// Isi teks HANYA dari situs: nama klinik, bidan, dan 6 layanan di Services.astro.
import React from 'react'
import {
  AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig,
  interpolate, spring, Easing, Sequence,
} from 'remotion'

const HIJAU = '#0f766e'
const HIJAU_TUA = '#0b5f58'
const PINK = '#e91e63'
const KREM = '#f7f5ef'
const TEKS = '#1f2b2d'
const SERIF = '"Palatino Linotype", "Book Antiqua", Palatino, serif'
const SANS = '"Trebuchet MS", Verdana, sans-serif'

const LAYANAN = [
  'Pemeriksaan Kehamilan',
  'Kelas Persiapan Persalinan',
  'Konsultasi Menyusui',
  'Nifas & Bayi Baru Lahir',
  'Konseling Kesehatan Reproduksi',
  'Imunisasi Dasar Bayi',
]

const klamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }

/** Kelopak lembut melayang (deterministik — tanpa Math.random). */
function Kelopak({ i }) {
  const f = useCurrentFrame()
  const { durationInFrames: N } = useVideoConfig()
  const benih = (i * 97) % 101 / 101
  const x = 40 + ((i * 211) % 1200)
  const laju = 0.6 + benih * 0.8
  // posisi berulang tepat N frame -> loop mulus
  const t = ((f / N) * laju * 1 + benih) % 1
  const y = -30 + t * 470
  const goyang = Math.sin((f / N) * Math.PI * 2 * 2 + i) * 18
  const putar = (f / N) * 360 * (i % 2 ? 1 : -1) + i * 40
  const s = 10 + benih * 10
  return (
    <div style={{
      position: 'absolute', left: x + goyang, top: y, width: s, height: s * 0.7,
      borderRadius: '60% 0 60% 0', background: i % 3 ? '#f8bbd0' : '#f48fb1',
      opacity: 0.55, transform: `rotate(${putar}deg)`,
    }} />
  )
}

function Latar() {
  const f = useCurrentFrame()
  const { durationInFrames: N } = useVideoConfig()
  const geser = Math.sin((f / N) * Math.PI * 2) * 30
  return (
    <AbsoluteFill style={{ background: `linear-gradient(115deg, ${KREM} 0%, #fdf1f4 48%, #e6f4f1 100%)` }}>
      <div style={{ position: 'absolute', width: 520, height: 520, borderRadius: '50%', left: -120 + geser, top: -180,
        background: 'radial-gradient(circle, rgba(15,118,110,0.14), rgba(15,118,110,0) 70%)' }} />
      <div style={{ position: 'absolute', width: 460, height: 460, borderRadius: '50%', right: -100 - geser, bottom: -220,
        background: 'radial-gradient(circle, rgba(233,30,99,0.12), rgba(233,30,99,0) 70%)' }} />
      {Array.from({ length: 14 }, (_, i) => <Kelopak key={i} i={i} />)}
    </AbsoluteFill>
  )
}

/** Ikon hati: garis hitam masuk halus, bunga pink mekar & berdenyut pelan. */
function Ikon() {
  const f = useCurrentFrame()
  const { fps, durationInFrames: N } = useVideoConfig()
  const masuk = spring({ frame: f, fps, config: { damping: 16, mass: 0.8 } })
  const keluar = interpolate(f, [N - 18, N], [1, 0], klamp)
  const vis = Math.min(masuk, keluar)
  const mekar = spring({ frame: f - 10, fps, config: { damping: 9 } })
  const denyut = 1 + Math.sin((f / fps) * Math.PI * 1.2) * 0.04
  const ukuran = 300
  // pusat bunga di ikon 512px: (130, 311)
  const ox = (130 / 512) * ukuran, oy = (311 / 512) * ukuran
  return (
    <div style={{ position: 'absolute', left: 70, top: 50, width: ukuran, height: ukuran,
      opacity: vis, transform: `translateY(${(1 - masuk) * 30}px) scale(${0.9 + 0.1 * masuk})` }}>
      <Img src={staticFile('ikon-hitam.png')} style={{ position: 'absolute', inset: 0, width: '100%' }} />
      <Img src={staticFile('ikon-bunga.png')} style={{ position: 'absolute', inset: 0, width: '100%',
        transformOrigin: `${ox}px ${oy}px`, transform: `scale(${Math.max(0, mekar) * denyut}) rotate(${(1 - mekar) * -90}deg)` }} />
    </div>
  )
}

function Judul() {
  const f = useCurrentFrame()
  const { fps, durationInFrames: N } = useVideoConfig()
  const a = spring({ frame: f - 14, fps, config: { damping: 18 } })
  const b = spring({ frame: f - 24, fps, config: { damping: 18 } })
  const keluar = interpolate(f, [N - 18, N], [1, 0], klamp)
  return (
    <div style={{ position: 'absolute', left: 420, top: 58, right: 60 }}>
      <div style={{ fontFamily: SANS, fontWeight: 800, letterSpacing: 10, fontSize: 64, color: TEKS,
        opacity: Math.min(a, keluar), transform: `translateX(${(1 - a) * 40}px)` }}>
        EL&#8217;MOZZA
      </div>
      <div style={{ fontFamily: SERIF, fontSize: 30, color: HIJAU_TUA, marginTop: 6,
        opacity: Math.min(b, keluar), transform: `translateX(${(1 - b) * 40}px)` }}>
        Klinik Bidan &middot; Bidan Dhora Yufita, SST, MKM
      </div>
      <div style={{ height: 3, width: interpolate(b, [0, 1], [0, 260]), background: PINK, borderRadius: 2,
        marginTop: 14, opacity: keluar }} />
    </div>
  )
}

/** Satu layanan per ±1,2 dtk, meluncur naik lalu memudar. */
function RangkaianLayanan() {
  const f = useCurrentFrame()
  const { fps, durationInFrames: N } = useVideoConfig()
  const MULAI = 40, PER = 36
  return (
    <div style={{ position: 'absolute', left: 420, top: 230, right: 60, height: 70, overflow: 'hidden' }}>
      {LAYANAN.map((nama, i) => {
        const t0 = MULAI + i * PER
        const m = spring({ frame: f - t0, fps, config: { damping: 20 } })
        const naik = i === LAYANAN.length - 1 ? 0 : interpolate(f, [t0 + PER - 8, t0 + PER], [0, -24], klamp)
        const k = i === LAYANAN.length - 1 ? interpolate(f, [N - 18, N], [1, 0], klamp) : interpolate(f, [t0 + PER - 8, t0 + PER], [1, 0], klamp)
        const tampil = f >= t0 - 2 && (i === LAYANAN.length - 1 || f <= t0 + PER)
        if (!tampil) return null
        return (
          <div key={nama} style={{ position: 'absolute', left: 0, top: 10, display: 'flex', alignItems: 'center', gap: 14,
            opacity: Math.min(m, k), transform: `translateY(${(1 - m) * 26 + naik}px)` }}>
            <span style={{ width: 14, height: 14, borderRadius: '50%', background: PINK, boxShadow: '0 0 0 5px rgba(233,30,99,0.15)' }} />
            <span style={{ fontFamily: SANS, fontSize: 34, fontWeight: 700, color: HIJAU }}>{nama}</span>
          </div>
        )
      })}
    </div>
  )
}

function Penutup() {
  const f = useCurrentFrame()
  const { fps, durationInFrames: N } = useVideoConfig()
  const MULAI = 40 + LAYANAN.length * 36 + 6
  const m = spring({ frame: f - MULAI, fps, config: { damping: 18 } })
  const keluar = interpolate(f, [N - 18, N], [1, 0], klamp)
  return (
    <div style={{ position: 'absolute', left: 420, top: 318, fontFamily: SERIF, fontStyle: 'italic', fontSize: 28,
      color: TEKS, opacity: Math.min(m, keluar), transform: `translateY(${(1 - m) * 16}px)` }}>
      Hangat, aman, dan profesional untuk ibu &amp; bayi.
    </div>
  )
}

export function BannerKlinik() {
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Latar />
      <Ikon />
      <Judul />
      <RangkaianLayanan />
      <Penutup />
    </AbsoluteFill>
  )
}

/* Versi HP (720x720) — susunan tegak: ikon di atas, teks di bawah. */
export function BannerKlinikHP() {
  const f = useCurrentFrame()
  const { fps, durationInFrames: N } = useVideoConfig()
  const keluar = interpolate(f, [N - 18, N], [1, 0], klamp)
  const a = spring({ frame: f - 14, fps, config: { damping: 18 } })
  const MULAI = 40, PER = 36
  const mekar = spring({ frame: f - 10, fps, config: { damping: 9 } })
  const masuk = spring({ frame: f, fps, config: { damping: 16, mass: 0.8 } })
  const denyut = 1 + Math.sin((f / fps) * Math.PI * 1.2) * 0.04
  const U = 300, ox = (130 / 512) * U, oy = (311 / 512) * U
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Latar />
      <div style={{ position: 'absolute', left: (720 - U) / 2, top: 40, width: U, height: U,
        opacity: Math.min(masuk, keluar), transform: `translateY(${(1 - masuk) * 30}px)` }}>
        <Img src={staticFile('ikon-hitam.png')} style={{ position: 'absolute', inset: 0, width: '100%' }} />
        <Img src={staticFile('ikon-bunga.png')} style={{ position: 'absolute', inset: 0, width: '100%',
          transformOrigin: `${ox}px ${oy}px`, transform: `scale(${Math.max(0, mekar) * denyut}) rotate(${(1 - mekar) * -90}deg)` }} />
      </div>
      <div style={{ position: 'absolute', top: 372, width: '100%', textAlign: 'center', fontFamily: SANS, fontWeight: 800,
        letterSpacing: 10, fontSize: 60, color: TEKS, opacity: Math.min(a, keluar) }}>EL&#8217;MOZZA</div>
      <div style={{ position: 'absolute', top: 452, width: '100%', textAlign: 'center', fontFamily: SERIF, fontSize: 28,
        color: HIJAU_TUA, opacity: Math.min(a, keluar) }}>Klinik Bidan &middot; Depok</div>
      {LAYANAN.map((nama, i) => {
        const t0 = MULAI + i * PER
        const m = spring({ frame: f - t0, fps, config: { damping: 20 } })
        const k = i === LAYANAN.length - 1 ? keluar : interpolate(f, [t0 + PER - 8, t0 + PER], [1, 0], klamp)
        if (f < t0 - 2 || (i < LAYANAN.length - 1 && f > t0 + PER)) return null
        return (
          <div key={nama} style={{ position: 'absolute', top: 540, width: '100%', display: 'flex', justifyContent: 'center',
            alignItems: 'center', gap: 12, opacity: Math.min(m, k), transform: `translateY(${(1 - m) * 24}px)` }}>
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: PINK }} />
            <span style={{ fontFamily: SANS, fontSize: 34, fontWeight: 700, color: HIJAU }}>{nama}</span>
          </div>
        )
      })}
      <div style={{ position: 'absolute', top: 620, width: '100%', textAlign: 'center', fontFamily: SERIF, fontStyle: 'italic',
        fontSize: 26, color: TEKS, opacity: keluar * interpolate(f, [30, 50], [0, 1], klamp) }}>
        Hangat, aman, dan profesional.
      </div>
    </AbsoluteFill>
  )
}
