"""Dependency-free beat grid (a stand-in for the skill's beats.py, which needs numpy via uv).

Usage:
  npx remotion ffmpeg -i track.mp3 -ac 1 -ar 11025 -c:a pcm_s16le track.wav
  python3 scripts/beats-lite.py track.wav src/films/promo/beats.json

Method: 10 ms RMS envelope -> positive log-energy change (onset strength) -> autocorrelation for the
tempo (80-160 BPM) -> comb fit refines tempo and beat phase -> the downbeat is the beat-in-bar offset
with the strongest onsets -> per-bar loudness for the song map. Prints the grid spread for checking.
"""
import array, json, math, sys, wave

src, dst = sys.argv[1], sys.argv[2]
with wave.open(src) as w:
    rate = w.getframerate()
    pcm = array.array("h"); pcm.frombytes(w.readframes(w.getnframes()))
HOP = rate // 100
hop_s = HOP / rate
n = len(pcm) // HOP
loud = []
for i in range(n):
    seg = pcm[i * HOP:(i + 1) * HOP]
    rms = math.sqrt(sum(s * s for s in seg) / HOP) + 1e-9
    loud.append(20 * math.log10(rms / 32768))
onset = [0.0] + [max(0.0, loud[i] - loud[i - 1]) for i in range(1, n)]
mean = sum(onset) / n
onset = [o - mean if o > mean else 0.0 for o in onset]
duration = n * hop_s

def score(period, phase):
    total, t = 0.0, phase
    while t < duration:
        i = int(round(t / hop_s))
        total += max(onset[max(0, i - 2):i + 3] or [0.0])
        t += period
    return total

# 1. Tempo from autocorrelation.
best_ac, best_lag = 0.0, 0
for lag in range(int(60 / 160 / hop_s), int(60 / 80 / hop_s) + 1):
    ac = sum(onset[i] * onset[i + lag] for i in range(0, n - lag))
    if ac > best_ac: best_ac, best_lag = ac, lag
bpm0 = 60 / (best_lag * hop_s)

# 2. Comb refinement of tempo (±1.5 BPM) and phase.
best = (0.0, bpm0, 0.0)
for k in range(-75, 76):
    bpm = bpm0 + k * 0.02
    period = 60 / bpm
    for step in range(int(period / hop_s)):
        s = score(period, step * hop_s)
        if s > best[0]: best = (s, bpm, step * hop_s)
_, bpm, phase = best
beat = 60 / bpm

# 3. Beats, the downbeat offset, and how tightly onsets sit on the grid.
beats, t = [], phase
while t + beat <= duration:
    a, b = int(t / hop_s), int((t + beat) / hop_s)
    beats.append({"t": t, "loud": sum(loud[a:b]) / max(1, b - a), "hit": max(onset[max(0, a - 2):a + 3] or [0.0])})
    t += beat
down = max(range(4), key=lambda off: sum(x["hit"] for x in beats[off::4]))
errors = []
for x in beats:
    i = int(round(x["t"] / hop_s))
    window = onset[max(0, i - 5):i + 6]
    if window and max(window) > 0:
        errors.append(abs(window.index(max(window)) - min(5, i)) * hop_s * 1000)
spread = sorted(errors)[len(errors) // 2] if errors else None

bars = []
for index, i in enumerate(range(down, len(beats) - 3, 4)):
    bars.append({"index": index + 1, "start": round(beats[i]["t"], 3), "loudnessDb": round(sum(x["loud"] for x in beats[i:i + 4]) / 4, 1)})
out = {"bpm": round(bpm, 3), "firstBeat": round(beats[down]["t"], 3), "pickupBeats": 0, "beatsPerBar": 4,
       "gridCheckMs": {"medianOffset": spread}, "bars": bars}
with open(dst, "w") as f:
    json.dump(out, f, indent=1)

print(f"bpm {out['bpm']}  first downbeat {out['firstBeat']} s  bar {4 * beat:.3f} s  median onset offset {spread} ms")
lo, hi = min(b["loudnessDb"] for b in bars), max(b["loudnessDb"] for b in bars)
for b in bars:
    level = int((b["loudnessDb"] - lo) / (hi - lo + 1e-9) * 9)
    print(f'{b["index"]:3d} {b["start"]:7.2f}s {b["loudnessDb"]:6.1f} dB  {"#" * (level + 1)}')
