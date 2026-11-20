"""Banda sonora del vídeo de Traza: música, efectos y locución, sincronizados con promo.html.

Todo se sintetiza aquí (sin muestras de terceros). Uso:
    python mix.py            → audio/mix.wav (48 kHz, estéreo)
Los tiempos coinciden con TL en promo.html.
"""
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt, fftconvolve, resample_poly, sawtooth
from pathlib import Path

HERE = Path(__file__).parent
SR = 48000
END = 40.5
N = int(SR * END)
rng = np.random.default_rng(7)

# ── línea de tiempo (igual que TL en promo.html) ──
VO = {1: 0.8, 2: 5.1, 3: 7.9, 4: 11.9, 5: 17.0, 6: 21.0, 7: 26.0, 8: 32.9, 9: 36.7}
IMPACTS = [0.35, 4.6, 29.4, 35.3]
WHOOSH = [6.95, 11.3, 16.4, 20.3, 23.7, 25.45, 32.2]
BLIPS = [12.38, 12.89, 15.0, 17.18, 18.08, 21.26, 22.06, 24.25, 24.5, 38.75]
BEAT = 0.5          # 120 BPM
GRID0 = 4.6         # el ritmo entra con TRAZA
BREAK = (25.6, 29.4)
OUTRO = 35.3


def stereo(x, pan=0.0):
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    return np.stack([x * l * 1.414, x * r * 1.414], 1)


def place(bus, sig, t, gain=1.0):
    i = int(t * SR)
    if i >= len(bus):
        return
    sig = sig[: len(bus) - i]
    bus[i : i + len(sig)] += sig * gain


def lp(x, f, order=2):
    return sosfilt(butter(order, f, "low", fs=SR, output="sos"), x, axis=0)


def hp(x, f, order=2):
    return sosfilt(butter(order, f, "high", fs=SR, output="sos"), x, axis=0)


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], "band", fs=SR, output="sos"), x, axis=0)


def reverb(x, seconds=2.4, wet=0.3, damp=4000):
    n = int(seconds * SR)
    t = np.arange(n) / SR
    ir = np.stack([rng.standard_normal(n), rng.standard_normal(n)], 1) * np.exp(-t * 6.5 / seconds)[:, None]
    ir = lp(ir, damp)
    ir /= np.sqrt((ir ** 2).sum(0))
    y = np.stack([fftconvolve(x[:, c], ir[:, c])[: len(x)] for c in range(2)], 1)
    return x * (1 - wet) + y * wet * 2.2


def env(n, a, d):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / d)


def sweep_filter(noise, f0, f1, width=1.6, chunks=40):
    """Ruido filtrado con un pasa-banda que se desplaza (solapamiento con ventanas)."""
    n = len(noise)
    out = np.zeros(n)
    hop = n // chunks
    win = np.hanning(hop * 2)
    for k in range(chunks):
        c = f0 * (f1 / f0) ** (k / max(1, chunks - 1))
        a, b = max(30, c / width), min(SR / 2 - 100, c * width)
        s = k * hop
        seg = noise[s : s + hop * 2]
        if len(seg) < 8:
            break
        out[s : s + len(seg)] += bp(seg, a, b) * win[: len(seg)]
    return out


# ── instrumentos ──
def kick():
    n = int(0.45 * SR)
    t = np.arange(n) / SR
    f = 48 + 110 * np.exp(-t / 0.035)
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-t / 0.22)
    click = hp(rng.standard_normal(n) * np.exp(-t / 0.004), 2000) * 0.25
    return np.tanh((body + click) * 1.6) * 0.9


def clap():
    n = int(0.4 * SR)
    t = np.arange(n) / SR
    e = sum(np.exp(-np.maximum(0, t - d) / 0.012) * (t >= d) for d in (0, 0.011, 0.022)) + np.exp(-np.maximum(0, t - 0.03) / 0.12) * (t >= 0.03)
    return bp(rng.standard_normal(n) * e, 900, 3500) * 0.7


def hat(open_=False):
    n = int((0.25 if open_ else 0.06) * SR)
    t = np.arange(n) / SR
    return hp(rng.standard_normal(n) * np.exp(-t / (0.09 if open_ else 0.018)), 7500) * 0.35


def pluck(f, dur=0.45):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = np.sin(2 * np.pi * f * t) + 0.35 * sawtooth(2 * np.pi * f * t, 0.5) + 0.12 * np.sin(4 * np.pi * f * t)
    return lp(x * env(n, 0.003, 0.16), 3200) * 0.5


def impact(big=1.0):
    n = int(3.2 * SR)
    t = np.arange(n) / SR
    f = 30 + 70 * np.exp(-t / 0.12)
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.9)
    crack = lp(rng.standard_normal(n) * np.exp(-t / 0.08), 3000) * 0.5
    air = hp(rng.standard_normal(n) * np.exp(-t / 0.7), 3000) * 0.08
    return np.tanh((boom * 1.3 + crack + air) * big) * 0.8


def whoosh(dur=0.9, up=True):
    n = int(dur * SR)
    t = np.linspace(0, 1, n)
    e = np.sin(np.pi * t) ** 2
    x = sweep_filter(rng.standard_normal(n), 300 if up else 4000, 5000 if up else 300)
    return x * e * 0.9


def riser(dur):
    n = int(dur * SR)
    t = np.linspace(0, 1, n)
    noise = sweep_filter(rng.standard_normal(n), 400, 9000, chunks=60) * t ** 2
    f = 180 * (8 ** t)
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.12 * t ** 1.5
    return (noise * 0.8 + tone) * 0.8


def blip():
    n = int(0.12 * SR)
    t = np.arange(n) / SR
    return (np.sin(2 * np.pi * 1320 * t) + 0.5 * np.sin(2 * np.pi * 1980 * t)) * env(n, 0.002, 0.035) * 0.22


# ── armonía: La menor, cada acorde 2 compases ──
CHORDS = {  # graves, notas del pad
    "Am": (55.0, [220.0, 261.63, 329.63, 493.88]),
    "F": (43.65, [220.0, 261.63, 329.63, 392.0]),
    "C": (65.41, [196.0, 261.63, 329.63, 493.88]),
    "G": (49.0, [196.0, 246.94, 293.66, 440.0]),
}
PROG = ["Am", "F", "C", "G"]


def chord_at(t):
    if t < GRID0 or t >= OUTRO:
        return "Am"
    return PROG[int((t - GRID0) // 4) % 4]


t_all = np.arange(N) / SR

# pad: sierras desafinadas, una versión oscura y otra abierta que se mezclan con la automatización
pad = np.zeros(N)
seg_edges = [0.0, GRID0] + [GRID0 + 4 * k for k in range(1, 20) if GRID0 + 4 * k < OUTRO] + [OUTRO, END]
for a, b in zip(seg_edges[:-1], seg_edges[1:]):
    name = chord_at((a + b) / 2)
    i0, i1 = int(a * SR), min(N, int((b + 0.6) * SR))
    tt = np.arange(i1 - i0) / SR
    e = np.minimum(1, tt / 0.35) * np.minimum(1, np.maximum(0, (b - a + 0.6 - tt)) / 0.6)
    sig = np.zeros(len(tt))
    for f in CHORDS[name][1]:
        for det in (-0.006, 0, 0.007):
            sig += sawtooth(2 * np.pi * f * (1 + det) * tt + rng.uniform(0, 6.28))
    pad[i0:i1] += sig * e * 0.06
dark, bright = lp(pad, 520, 4), lp(pad, 3600, 2)
open_ = np.interp(t_all, [0, 0.4, 4.4, 4.6, 25.4, 26.0, 29.2, 29.4, 35.2, 35.4, END], [0, 0.15, 0.6, 1, 1, 0.1, 0.5, 1, 1, 0.55, 0.3])
pad = dark * (1 - open_) + bright * open_
pad *= np.interp(t_all, [0, 0.3, 39.4, END], [0, 1, 1, 0])
pad_bus = reverb(stereo(pad), 3.0, 0.45)

# bajo: seno con algo de saturación, con el compresor del bombo («sidechain»)
bass = np.zeros(N)
for a, b in zip(seg_edges[:-1], seg_edges[1:]):
    f = CHORDS[chord_at((a + b) / 2)][0]
    i0, i1 = int(a * SR), int(b * SR)
    tt = np.arange(i1 - i0) / SR
    bass[i0:i1] = np.tanh(np.sin(2 * np.pi * f * tt) * 1.8) * 0.5
bass *= np.interp(t_all, [0, 1.5, 4.4, 4.6, 25.6, 26.2, 29.3, 29.4, 35.3, 37, END], [0, 0.4, 0.5, 1, 1, 0.25, 0.3, 1, 1, 0.4, 0])

# batería
drums = np.zeros((N, 2))
side = np.ones(N)
K, CL, HC, HO = kick(), clap(), hat(), hat(True)
beat_times = np.arange(GRID0, OUTRO, BEAT)
for i, bt in enumerate(beat_times):
    if BREAK[0] <= bt < BREAK[1]:
        continue
    place(drums, stereo(K), bt, 1.0)
    j = int(bt * SR)
    dip = 1 - 0.75 * np.exp(-np.arange(int(0.3 * SR)) / SR / 0.09)
    side[j : j + len(dip)] = np.minimum(side[j : j + len(dip)], dip[: max(0, min(len(dip), N - j))])
    if bt >= 7.5:
        if i % 2 == 1:
            place(drums, stereo(CL, 0.1), bt, 0.55)
        place(drums, stereo(HC, 0.35), bt + BEAT / 2, 0.6)
        if bt >= BREAK[1]:  # en el segundo drop, semicorcheas
            place(drums, stereo(HC, -0.3), bt + BEAT / 4, 0.3)
            place(drums, stereo(HC, -0.3), bt + 3 * BEAT / 4, 0.25)
        if i % 8 == 7:
            place(drums, stereo(HO, 0.2), bt + BEAT / 2, 0.45)
# redoble acelerando hacia el drop de los esquís
for k, tr in enumerate(np.cumsum([0.25] * 4 + [0.125] * 8 + [0.0625] * 8)):
    place(drums, stereo(CL, 0), BREAK[1] - 2.0 + tr - 0.25, 0.15 + 0.03 * k)
drums = reverb(drums, 1.2, 0.12)

# arpegio: corcheas con eco
arp = np.zeros((N, 2))
for k, bt in enumerate(np.arange(11.45, OUTRO, BEAT / 2)):
    if BREAK[0] - 0.3 <= bt < BREAK[1]:
        continue
    notes = CHORDS[chord_at(bt)][1]
    f = notes[[0, 2, 1, 3, 2, 1, 3, 2][k % 8]] * 2
    place(arp, stereo(pluck(f), -0.45 if k % 2 else 0.45), bt, 0.32)
delayed = np.zeros_like(arp)
d = int(BEAT * 0.75 * SR)
delayed[d:] = arp[:-d] * 0.45
delayed[:, [0, 1]] = delayed[:, [1, 0]]
arp = reverb(arp + delayed, 2.0, 0.3)

# brillo del logo y campanas del cierre
fx = np.zeros((N, 2))
for t0, dur in ((0.35, 1.6), (35.4, 1.4)):
    n = int(dur * SR)
    tt = np.arange(n) / SR
    sh = sum(np.sin(2 * np.pi * f * tt + rng.uniform(0, 6)) for f in (2637, 3520, 4186, 5274)) * (0.5 + 0.5 * np.sin(2 * np.pi * 11 * tt))
    place(fx, stereo(sh * np.sin(np.pi * tt / dur) * 0.02), t0)
for k, f in enumerate((880, 1318.5, 1760, 2637)):
    place(fx, stereo(pluck(f, 1.6), [-0.4, 0.4, -0.2, 0.2][k]), 36.7 + k * 0.16, 0.35)

# efectos
for k, t0 in enumerate(IMPACTS):
    place(fx, stereo(impact(1.4 if k else 0.8)), t0, 0.75 if k else 0.45)
for k, t0 in enumerate(WHOOSH):
    w = whoosh(0.9, up=k % 2 == 0)
    pan = np.linspace(-0.8, 0.8, len(w)) * (1 if k % 2 == 0 else -1)
    place(fx, np.stack([w * np.cos((pan + 1) * np.pi / 4), w * np.sin((pan + 1) * np.pi / 4)], 1) * 1.4, t0 - 0.45, 0.55)
place(fx, stereo(riser(3.2)), 4.6 - 3.2, 0.5)
place(fx, stereo(riser(2.6)), 29.4 - 2.6, 0.6)
for t0 in BLIPS:
    place(fx, stereo(blip(), rng.uniform(-0.5, 0.5)), t0, 1.0)
fx = reverb(fx, 2.6, 0.25)

# ── locución ──
voice = np.zeros(N)
for k, t0 in VO.items():
    sr, x = wavfile.read(HERE / f"vo-{k:02d}.wav")
    x = x.astype(np.float64) / 32768.0
    x = resample_poly(x, SR, sr)
    x = hp(x, 85, 2)
    x = x + 0.35 * hp(x, 3200, 2)                       # presencia
    e = np.sqrt(np.maximum(lp(x ** 2, 30), 0) + 1e-9)                 # compresión suave 3:1
    g = np.where(e > 0.08, (e / 0.08) ** (-2 / 3), 1.0)
    x = x * g
    x /= np.abs(x).max() + 1e-9
    place(voice, x, t0, 0.85)
vo_env = lp(np.abs(voice), 6)
vo_env = np.clip(vo_env / (vo_env.max() + 1e-9) * 3, 0, 1)
duck = 1 - 0.6 * vo_env
voice_bus = reverb(stereo(voice), 0.9, 0.06, 6000)

# ── mezcla ──
music = pad_bus * 0.9 + stereo(bass * side) * 0.55 + drums * 0.85 + arp * 0.9
music *= duck[:, None]
master = music * 0.9 + fx * 0.9 + voice_bus * 1.25
master = hp(master, 25)
master *= np.interp(t_all, [0, 0.05, END - 0.8, END], [0, 1, 1, 0])[:, None]
master = np.tanh(master * 1.15) / np.tanh(1.15)        # limitador suave
master /= np.abs(master).max() / 0.89
wavfile.write(HERE / "mix.wav", SR, (master * 32767).astype(np.int16))
print("audio/mix.wav", round(len(master) / SR, 2), "s")
