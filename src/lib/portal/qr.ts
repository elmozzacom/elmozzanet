/*
 * Pembuat QR Code mini (murni TypeScript, tanpa dependensi).
 * Mendukung mode byte, versi 1–6, tingkat koreksi M — cukup untuk kode tiket pendek.
 * Diadaptasi dari algoritma standar ISO/IEC 18004 (struktur mengikuti pendekatan Nayuki).
 */

const EC_CODEWORDS_PER_BLOCK_M = [0, 10, 16, 26, 18, 24, 16];
const NUM_BLOCKS_M = [0, 1, 1, 1, 2, 2, 4];
const TOTAL_CODEWORDS = [0, 26, 44, 70, 100, 134, 172];
const ALIGN_POS = [[], [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34]];

/* GF(256) */
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
(() => {
	let x = 1;
	for (let i = 0; i < 255; i++) {
		EXP[i] = x;
		LOG[x] = i;
		x <<= 1;
		if (x & 0x100) x ^= 0x11d;
	}
	for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
})();
const gfMul = (a: number, b: number) => (a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]]);

const rsGenerator = (degree: number) => {
	let poly = [1];
	for (let i = 0; i < degree; i++) {
		const next = new Array(poly.length + 1).fill(0);
		for (let j = 0; j < poly.length; j++) {
			next[j] ^= poly[j];
			next[j + 1] ^= gfMul(poly[j], EXP[i]);
		}
		poly = next;
	}
	return poly;
};
const rsRemainder = (data: number[], gen: number[]) => {
	const res = new Array(gen.length - 1).fill(0);
	for (const b of data) {
		const factor = b ^ res.shift()!;
		res.push(0);
		for (let i = 0; i < res.length; i++) res[i] ^= gfMul(gen[i + 1], factor);
	}
	return res;
};

class BitBuf {
	bits: number[] = [];
	append(val: number, len: number) {
		for (let i = len - 1; i >= 0; i--) this.bits.push((val >>> i) & 1);
	}
}

export interface QR {
	size: number;
	modules: boolean[][];
}

export const buatQR = (text: string): QR => {
	const data = new TextEncoder().encode(text);
	let ver = 1;
	while (ver <= 6) {
		const dataCw = TOTAL_CODEWORDS[ver] - EC_CODEWORDS_PER_BLOCK_M[ver] * NUM_BLOCKS_M[ver];
		if (dataCw * 8 >= 4 + 8 + data.length * 8) break;
		ver++;
	}
	if (ver > 6) throw new Error("Teks terlalu panjang untuk QR mini");
	const size = ver * 4 + 17;
	const totalCw = TOTAL_CODEWORDS[ver];
	const ecPerBlock = EC_CODEWORDS_PER_BLOCK_M[ver];
	const numBlocks = NUM_BLOCKS_M[ver];
	const dataCw = totalCw - ecPerBlock * numBlocks;

	/* 1. Bitstream */
	const bb = new BitBuf();
	bb.append(0b0100, 4);
	bb.append(data.length, 8);
	for (const b of data) bb.append(b, 8);
	const cap = dataCw * 8;
	bb.append(0, Math.min(4, cap - bb.bits.length));
	while (bb.bits.length % 8 !== 0) bb.bits.push(0);
	for (let pad = 0xec; bb.bits.length < cap; pad ^= 0xec ^ 0x11) bb.append(pad, 8);
	const dataBytes: number[] = [];
	for (let i = 0; i < bb.bits.length; i += 8) {
		let v = 0;
		for (let j = 0; j < 8; j++) v = (v << 1) | bb.bits[i + j];
		dataBytes.push(v);
	}

	/* 2. Blok & koreksi kesalahan, lalu interleave */
	const shortBlocks = numBlocks - (totalCw % numBlocks);
	const shortLen = Math.floor(totalCw / numBlocks) - ecPerBlock;
	const gen = rsGenerator(ecPerBlock);
	const blocks: number[][] = [];
	for (let i = 0, k = 0; i < numBlocks; i++) {
		const len = shortLen + (i < shortBlocks ? 0 : 1);
		const dat = dataBytes.slice(k, k + len);
		k += len;
		const ec = rsRemainder(dat, gen);
		if (i < shortBlocks) dat.push(-1); // placeholder agar panjang blok seragam
		blocks.push(dat.concat(ec));
	}
	const codewords: number[] = [];
	for (let i = 0; i < blocks[0].length; i++)
		for (let j = 0; j < blocks.length; j++) {
			if (i === shortLen && j < shortBlocks) continue;
			codewords.push(blocks[j][i]);
		}

	/* 3. Modul fungsi */
	const modules: boolean[][] = Array.from({ length: size }, () => new Array(size).fill(false));
	const isFunc: boolean[][] = Array.from({ length: size }, () => new Array(size).fill(false));
	const setF = (x: number, y: number, dark: boolean) => {
		modules[y][x] = dark;
		isFunc[y][x] = true;
	};
	for (let i = 0; i < size; i++) {
		setF(6, i, i % 2 === 0);
		setF(i, 6, i % 2 === 0);
	}
	const finder = (cx: number, cy: number) => {
		for (let dy = -4; dy <= 4; dy++)
			for (let dx = -4; dx <= 4; dx++) {
				const x = cx + dx,
					y = cy + dy;
				if (x < 0 || y < 0 || x >= size || y >= size) continue;
				const d = Math.max(Math.abs(dx), Math.abs(dy));
				setF(x, y, d !== 2 && d !== 4);
			}
	};
	finder(3, 3);
	finder(size - 4, 3);
	finder(3, size - 4);
	const ap = ALIGN_POS[ver];
	if (ap.length) {
		const c = ap[1];
		for (let dy = -2; dy <= 2; dy++)
			for (let dx = -2; dx <= 2; dx++) setF(c + dx, c + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
	}
	const drawFormat = (mask: number) => {
		const dat = (0 << 3) | mask; // level M = 00
		let rem = dat;
		for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
		const bits = ((dat << 10) | rem) ^ 0x5412;
		const bit = (i: number) => ((bits >>> i) & 1) !== 0;
		for (let i = 0; i <= 5; i++) setF(8, i, bit(i));
		setF(8, 7, bit(6));
		setF(8, 8, bit(7));
		setF(7, 8, bit(8));
		for (let i = 9; i < 15; i++) setF(14 - i, 8, bit(i));
		for (let i = 0; i < 8; i++) setF(size - 1 - i, 8, bit(i));
		for (let i = 8; i < 15; i++) setF(8, size - 15 + i, bit(i));
		setF(8, size - 8, true);
	};
	drawFormat(0); // reservasi area; ditimpa setelah mask dipilih

	/* 4. Penempatan data zig-zag */
	let bi = 0;
	const totalBits = codewords.length * 8;
	for (let right = size - 1; right >= 1; right -= 2) {
		if (right === 6) right = 5;
		for (let vert = 0; vert < size; vert++) {
			for (let j = 0; j < 2; j++) {
				const x = right - j;
				const upward = ((right + 1) & 2) === 0;
				const y = upward ? size - 1 - vert : vert;
				if (isFunc[y][x] || bi >= totalBits) continue;
				modules[y][x] = ((codewords[bi >>> 3] >>> (7 - (bi & 7))) & 1) !== 0;
				bi++;
			}
		}
	}

	/* 5. Mask & penalti */
	const maskFn = (m: number, x: number, y: number) => {
		switch (m) {
			case 0: return (x + y) % 2 === 0;
			case 1: return y % 2 === 0;
			case 2: return x % 3 === 0;
			case 3: return (x + y) % 3 === 0;
			case 4: return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0;
			case 5: return ((x * y) % 2) + ((x * y) % 3) === 0;
			case 6: return (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
			default: return (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
		}
	};
	const applyMask = (m: number) => {
		for (let y = 0; y < size; y++)
			for (let x = 0; x < size; x++) if (!isFunc[y][x] && maskFn(m, x, y)) modules[y][x] = !modules[y][x];
	};
	const penalty = () => {
		let p = 0;
		const runPen = (line: boolean[]) => {
			let run = 0,
				prev: boolean | null = null,
				s = 0;
			const hist: number[] = [];
			for (const v of line) {
				if (v === prev) run++;
				else {
					if (prev !== null) hist.push(run);
					run = 1;
					prev = v;
				}
			}
			hist.push(run);
			for (const r of hist) if (r >= 5) s += 3 + (r - 5);
			// pola mirip finder 1:1:3:1:1
			for (let i = 0; i + 6 < hist.length; i++) {
				const h = hist.slice(i, i + 7);
				if (h[1] === h[0] && h[2] === h[0] && h[3] === h[0] * 3 && h[4] === h[0] && h[5] === h[0] && (h[6] >= 4 || (i > 0 && hist[i - 1] >= 4))) s += 40;
			}
			return s;
		};
		for (let y = 0; y < size; y++) p += runPen(modules[y]);
		for (let x = 0; x < size; x++) p += runPen(modules.map((r) => r[x]));
		for (let y = 0; y < size - 1; y++)
			for (let x = 0; x < size - 1; x++) {
				const c = modules[y][x];
				if (c === modules[y][x + 1] && c === modules[y + 1][x] && c === modules[y + 1][x + 1]) p += 3;
			}
		let dark = 0;
		for (const row of modules) for (const v of row) if (v) dark++;
		const k = Math.ceil(Math.abs(dark * 20 - size * size * 10) / (size * size)) - 1;
		return p + k * 10;
	};
	let best = 0,
		bestPen = Infinity;
	for (let m = 0; m < 8; m++) {
		applyMask(m);
		drawFormat(m);
		const pen = penalty();
		if (pen < bestPen) {
			bestPen = pen;
			best = m;
		}
		applyMask(m);
	}
	applyMask(best);
	drawFormat(best);
	return { size, modules };
};

/** SVG path string untuk modul gelap (1 unit per modul) */
export const qrPath = (qr: QR) => {
	let d = "";
	for (let y = 0; y < qr.size; y++) for (let x = 0; x < qr.size; x++) if (qr.modules[y][x]) d += `M${x} ${y}h1v1h-1z`;
	return d;
};
