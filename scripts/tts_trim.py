"""Trim the silence around each TTS clip and write it as a small mono mp3 (what the app plays).

Neural TTS engines pad every file with a fraction of a second before and over a second after the words;
stitched together ("mười" + "ba" + "quả" + "cam") that sounds like long gaps. This keeps the speech and a
few milliseconds of margin, so clips join the way a teacher's recordings would.

    python scripts/tts_trim.py <folder with .mp3/.wav> <folder for the finished .mp3>

Needs:  pip install miniaudio lameenc
"""
import os
import sys

import lameenc
import miniaudio

RATE = 24000
LEAD_S = 0.05    # silence kept before the first word
TAIL_S = 0.12    # and after the last
FLOOR = 0.03     # "silence" = below 3% of the loudest sample in the clip


def trim(samples):
    peak = max((abs(v) for v in samples), default=0)
    if peak == 0:
        return samples
    thr = peak * FLOOR
    first = next((i for i, v in enumerate(samples) if abs(v) > thr), 0)
    last = next((i for i in range(len(samples) - 1, -1, -1) if abs(samples[i]) > thr), len(samples) - 1)
    return samples[max(0, first - int(LEAD_S * RATE)): last + int(TAIL_S * RATE)]


def encode(samples):
    enc = lameenc.Encoder()
    enc.set_bit_rate(64)
    enc.set_in_sample_rate(RATE)
    enc.set_channels(1)
    enc.set_quality(2)
    return bytes(enc.encode(samples.tobytes())) + bytes(enc.flush())


def main(src, dst):
    os.makedirs(dst, exist_ok=True)
    done = 0
    for name in sorted(os.listdir(src)):
        stem, ext = os.path.splitext(name)
        if ext.lower() not in (".mp3", ".wav"):
            continue
        if os.path.getsize(os.path.join(src, name)) == 0:
            print(f"skipped empty file {name}")
            continue
        decoded = miniaudio.decode_file(os.path.join(src, name), output_format=miniaudio.SampleFormat.SIGNED16, nchannels=1, sample_rate=RATE)
        samples = trim(decoded.samples)
        with open(os.path.join(dst, stem + ".mp3"), "wb") as f:
            f.write(encode(samples))
        done += 1
    print(f"trimmed {done} clips into {dst}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
