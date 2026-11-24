"""Caption, dynamically punch-in, mix subtle ambience, and assemble high-retention vertical reels."""
from array import array
from pathlib import Path
import json, math, re, subprocess, sys, wave
from PIL import Image, ImageDraw, ImageFont

W, H, FPS = 1080, 1920, 24
WHITE = (252, 252, 255)
MINT = (165, 245, 212)
GOLD = (255, 224, 102)
NAVY = (15, 22, 38)
STROKE = (8, 12, 20)


def run(args):
    subprocess.run(args, check=True)


def probe_duration(path):
    out = subprocess.check_output(
        ['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'json', str(path)]
    )
    return float(json.loads(out)['format']['duration'])


def words_of(transcript):
    if transcript.get('words'):
        return transcript['words']
    return [w for seg in transcript.get('segments', []) for w in seg.get('words', [])]


def sanitize_overlay_text(text):
    """Strip pictograph/emoji characters unsupported by bundled TTF fonts to prevent □ boxes."""
    cleaned = re.sub(r'[^\x20-\x7E\u2013-\u201D]', '', str(text or ''))
    return re.sub(r'\s+', ' ', cleaned).strip()


def wrap_text(text, draw, f, width):
    lines, line = [], ''
    for word in str(text).split():
        trial = (line + ' ' + word).strip()
        if line and draw.textbbox((0, 0), trial, font=f)[2] > width:
            lines.append(line)
            line = word
        else:
            line = trial
    if line:
        lines.append(line)
    return lines


def group_word_bursts(ws, trim_offset, max_words=3, max_chars=18):
    """Build tight 2-3 word karaoke bursts shifted by start trim_offset."""
    shifted = []
    for w in ws:
        txt = (w.get('word') or w.get('text') or '').strip()
        if not txt:
            continue
        s = max(0.0, float(w.get('start', 0)) - trim_offset)
        e = max(s + 0.08, float(w.get('end', s + 0.12)) - trim_offset)
        shifted.append({'text': txt, 'start': s, 'end': e})

    bursts, current = [], []
    for item in shifted:
        trial_len = sum(len(x['text']) + 1 for x in current) + len(item['text'])
        if current and (len(current) >= max_words or trial_len > max_chars):
            bursts.append(current)
            current = [item]
        else:
            current.append(item)
    if current:
        bursts.append(current)

    for idx in range(len(bursts) - 1):
        cur_end = bursts[idx][-1]['end']
        next_start = bursts[idx + 1][0]['start']
        if next_start - cur_end < 0.22:
            bursts[idx][-1]['end'] = next_start
    if bursts:
        bursts[-1][-1]['end'] += 0.16
    return bursts


def synthesize_sound_bed(total_dialogue_dur, cut_time, out_path):
    """Generate a light, original -27 dB ambient bed + scene transition accent."""
    rate = 24000
    samples = array('h')
    n = max(1, math.ceil(total_dialogue_dur * rate))
    for i in range(n):
        t = i / rate
        fade = min(t / 0.2, 1.0, max(0.0, (total_dialogue_dur - t) / 0.25))
        bed = 0.011 * math.sin(2 * math.pi * 110.0 * t) + 0.007 * math.sin(2 * math.pi * 164.81 * t)
        accent = 0.0
        for mark in (0.02, cut_time):
            dt = t - mark
            if 0.0 <= dt < 0.14:
                accent += 0.055 * math.sin(2 * math.pi * (520 - 1400 * dt) * dt) * math.exp(-28 * dt)
        val = max(-1.0, min(1.0, (bed * fade) + accent))
        samples.append(int(val * 32767))
    with wave.open(str(out_path), 'wb') as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(rate)
        wf.writeframes(samples.tobytes())


def draw_top_sticker(draw, text, sticker_font):
    lines = wrap_text(text, draw, sticker_font, W - 180)[:2]
    if not lines:
        return
    line_h = 44
    box_h = len(lines) * line_h + 26
    widths = [draw.textbbox((0, 0), ln, font=sticker_font)[2] for ln in lines]
    pill_w = min(W - 96, max(widths) + 64)
    x0 = (W - pill_w) // 2
    y0 = 145
    draw.rounded_rectangle((x0, y0, x0 + pill_w, y0 + box_h), radius=22, fill=(255, 255, 255, 232))
    for idx, ln in enumerate(lines):
        lw = draw.textbbox((0, 0), ln, font=sticker_font)[2]
        draw.text(((W - lw) // 2, y0 + 13 + idx * line_h), ln, font=sticker_font, fill=NAVY)


def draw_kinetic_burst(draw, burst, local_t, pop_font, fallback_font, accent_color):
    tokens = [w['text'] for w in burst]
    active_ix = len(tokens) - 1
    for idx, w in enumerate(burst):
        if local_t <= w['end']:
            active_ix = idx
            break

    full = ' '.join(tokens)
    font_used = pop_font
    full_w = draw.textbbox((0, 0), full, font=font_used)[2]
    if full_w > W - 140:
        font_used = fallback_font
        full_w = draw.textbbox((0, 0), full, font=font_used)[2]
    space_w = draw.textbbox((0, 0), ' ', font=font_used)[2]
    x_cursor = (W - full_w) // 2
    y_pos = H - 410

    pad_x, pad_y = 26, 12
    draw.rounded_rectangle(
        (x_cursor - pad_x, y_pos - pad_y, x_cursor + full_w + pad_x, y_pos + 66 + pad_y),
        radius=20,
        fill=(8, 12, 20, 145),
    )
    for idx, w in enumerate(burst):
        color = accent_color if idx == active_ix else WHITE
        draw.text(
            (x_cursor, y_pos),
            w['text'],
            font=font_used,
            fill=color,
            stroke_width=6,
            stroke_fill=STROKE,
        )
        word_w = draw.textbbox((0, 0), w['text'], font=font_used)[2]
        x_cursor += word_w + space_w


def draw_reveal_badge(draw, badge_font):
    label = 'TwinGenie  •  Honest & Future Modes'
    tw = draw.textbbox((0, 0), label, font=badge_font)[2]
    pill_w = tw + 48
    x0 = (W - pill_w) // 2
    y0 = H - 235
    draw.rounded_rectangle((x0, y0, x0 + pill_w, y0 + 52), radius=18, fill=(10, 16, 28, 224), outline=MINT, width=2)
    draw.text((x0 + 24, y0 + 11), label, font=badge_font, fill=MINT)


def main(spec_path):
    spec = json.loads(Path(spec_path).read_text())
    script = spec['script']
    out = Path(spec['output'])
    tmp = out.parent / 'render'
    tmp.mkdir(parents=True, exist_ok=True)
    fonts = Path(spec['fonts'])
    bold_path = str(fonts / 'Font-Bold.ttf')
    black_path = str(fonts / 'Font-Black.ttf')

    pop_font = ImageFont.truetype(black_path, 54)
    pop_fallback = ImageFont.truetype(black_path, 42)
    sticker_font = ImageFont.truetype(bold_path, 33)
    badge_font = ImageFont.truetype(bold_path, 26)
    sticker_text = sanitize_overlay_text(script.get('contextSticker') or script['hook'])

    normalized, durations = [], []
    for i, (source, transcript, scene) in enumerate(zip(spec['files'], spec['transcripts'], script['scenes'])):
        ws = words_of(transcript)
        expected = [w for turn in scene['turns'] for w in turn['text'].split()]
        if len(ws) < max(1, int(len(expected) * 0.85)):
            raise RuntimeError(f'Scene {i + 1}: transcript is shorter than scripted speech')
        ws = ws[:len(expected)]
        end = float(ws[-1].get('end', 0))
        start = float(ws[0].get('start', 0))
        if end < 1.0 or end > 11.8 or start > 1.5:
            raise RuntimeError(f'Scene {i + 1}: speech timing outside quality bounds')

        trim_start = round(max(0.0, start - 0.12), 3) if start > 0.22 else 0.0
        tail_pad = 0.18 if i == 0 else 0.45
        duration = max(1.0, min(12.0 - trim_start, (end - trim_start) + tail_pad))
        durations.append(duration)
        bursts = group_word_bursts(ws, trim_start)
        accent_color = MINT if i == 0 else GOLD

        vf_base = f'scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},setsar=1,fps={FPS}'
        if i == 1:
            # Subtle 1.07x closer punch-in cut for visual energy on Scene 2 reveal.
            vf_base = f'scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},crop=iw/1.07:ih/1.07:(iw-iw/1.07)/2:(ih-ih/1.07)*0.38,scale={W}:{H},setsar=1,fps={FPS}'

        target = tmp / f'scene-{i + 1}.mp4'
        decode = subprocess.Popen(
            [
                'ffmpeg', '-hide_banner', '-loglevel', 'error',
                '-ss', f'{trim_start:.3f}', '-i', str(source),
                '-t', f'{duration:.3f}', '-vf', vf_base,
                '-pix_fmt', 'rgb24', '-f', 'rawvideo', 'pipe:1',
            ],
            stdout=subprocess.PIPE,
        )
        encode = subprocess.Popen(
            [
                'ffmpeg', '-hide_banner', '-loglevel', 'error', '-y',
                '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', 'pipe:0',
                '-ss', f'{trim_start:.3f}', '-i', str(source),
                '-map', '0:v:0', '-map', '1:a:0', '-t', f'{duration:.3f}',
                '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '21', '-pix_fmt', 'yuv420p',
                '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-movflags', '+faststart',
                str(target),
            ],
            stdin=subprocess.PIPE,
        )
        frame_size = W * H * 3
        frame_ix = 0
        while True:
            raw = decode.stdout.read(frame_size)
            if len(raw) != frame_size:
                break
            local_t = frame_ix / FPS
            frame_ix += 1
            image = Image.frombytes('RGB', (W, H), raw).convert('RGBA')
            overlay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
            d = ImageDraw.Draw(overlay)
            if i == 0 and local_t < 4.2 and sticker_text:
                draw_top_sticker(d, sticker_text, sticker_font)
            active_burst = next((b for b in bursts if b[0]['start'] <= local_t <= b[-1]['end']), None)
            if active_burst:
                draw_kinetic_burst(d, active_burst, local_t, pop_font, pop_fallback, accent_color)
            if i == 1 and local_t >= max(0.0, duration - 1.7):
                draw_reveal_badge(d, badge_font)
            composited = Image.alpha_composite(image, overlay).convert('RGB')
            encode.stdin.write(composited.tobytes())
        decode.stdout.close()
        encode.stdin.close()
        if decode.wait() != 0 or encode.wait() != 0:
            raise RuntimeError('Caption/video rendering failed')
        normalized.append(target)

    dialogue_total = sum(durations)
    sfx_path = tmp / 'sound_design.wav'
    synthesize_sound_bed(dialogue_total, durations[0], sfx_path)

    cta_path = Path(spec['cta'])
    cta_actual = probe_duration(cta_path)
    cta_dur = min(1.5, cta_actual)
    normalized.append(cta_path)
    durations.append(cta_dur)

    args = ['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y']
    for p in normalized:
        args += ['-i', str(p)]
    sfx_idx = len(normalized)
    args += ['-i', str(sfx_path)]

    filters, v_pins, a_pins = [], [], []
    for i, dur in enumerate(durations):
        filters.append(f'[{i}:v]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},setsar=1,fps={FPS},format=yuv420p[v{i}]')
        filters.append(f'[{i}:a]aresample=48000,apad,atrim=duration={dur:.3f},asetpts=PTS-STARTPTS[a{i}]')
        v_pins.append(f'[v{i}]')
        a_pins.append(f'[a{i}]')

    filters.append(''.join(v_pins) + f'concat=n={len(v_pins)}:v=1:a=0[vout]')
    filters.append(''.join(a_pins) + f'concat=n={len(a_pins)}:v=0:a=1[speech]')
    filters.append(f'[{sfx_idx}:a]aresample=48000,apad,atrim=duration={dialogue_total + cta_dur:.3f}[bed]')
    filters.append('[speech][bed]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-15:TP=-1.2:LRA=8[aout]')
    args += [
        '-filter_complex', ';'.join(filters),
        '-map', '[vout]', '-map', '[aout]',
        '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p',
        '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-movflags', '+faststart',
        str(out),
    ]
    run(args)
    total = probe_duration(out)
    if not 7 <= total <= 30:
        raise RuntimeError(f'Reel duration outside 7-30 seconds: {total}')
    print(json.dumps({
        'videoPath': str(out),
        'durationSeconds': total,
        'resolution': '1080x1920',
        'qa': {'speechTranscriptChecked': True, 'timedCaptions': True, 'fixedAndroidCTA': True},
    }))


if __name__ == '__main__':
    main(sys.argv[1])
