#!/usr/bin/env python3
"""
TwinGenie Automated Reel / Short Video Renderer
Renders high-converting 1080x1920 (9:16 vertical) motion video Reels for Facebook, Instagram & YouTube.
Includes:
- Neural voiceover narration per scene (Edge TTS with graceful local fallbacks)
- Ambient stereo lo-fi/synth background music mixed underneath voice
- Safe zone compliance: avoids top notch/sound icon and bottom 540px Facebook overlay
- High-definition typography and high-bitrate H.264 / AAC encoding (no compression blur)
"""

import os
import sys
import json
import asyncio
import subprocess
import wave
import math
import struct
from PIL import Image, ImageDraw, ImageFont, ImageFilter

BG_COLOR = (12, 9, 28)           # Deep Obsidian #0C091C
SURFACE_DARK = (21, 16, 46)      # Surface #15102E
SURFACE_LIGHT = (32, 25, 68)     # Card Highlight #201944
CARD_BORDER = (56, 44, 106)      # Border #382C6A
BORDER_PURPLE = (126, 58, 242)   # Purple Glow Border

PURPLE_PRIMARY = (147, 51, 234)  # #9333EA
PURPLE_GLOW = (168, 85, 247)     # #A855F7
CYAN_ACCENT = (56, 189, 248)     # #38BDF8
EMERALD_ACCENT = (52, 211, 153)  # #34D399
AMBER_ACCENT = (251, 191, 36)    # #FBBF24
ROSE_ACCENT = (244, 63, 94)      # #F43F5E

TEXT_WHITE = (255, 255, 255)
TEXT_MUTED = (195, 200, 225)
TEXT_DIM = (135, 140, 165)

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_BG_MUSIC = os.path.join(SCRIPT_DIR, '../assets/audio/bg_ambient.m4a')

def sanitize_text(text):
    if not isinstance(text, str):
        return str(text) if text is not None else ""
    import re
    emoji_pattern = re.compile(
        "[\U00010000-\U0010ffff]|[\u2600-\u27bf]|[\u2300-\u23ff]|[\u2b50-\u2b55]",
        flags=re.UNICODE
    )
    cleaned = emoji_pattern.sub('', text)
    cleaned = (cleaned.replace('★', '5.0 ')
                      .replace('⭐', '')
                      .replace('⚡', '')
                      .replace('❌', '')
                      .replace('⚠', '')
                      .replace('🎯', '')
                      .replace('🔒', '')
                      .replace('📲', '')
                      .replace('🧠', '')
                      .replace('✦', '')
                      .replace('✓', '')
                      .replace('✔', ''))
    return ' '.join(cleaned.split())

def get_font(size, bold=False):
    font_paths = [
        '/System/Library/Fonts/Supplemental/Arial Bold.ttf' if bold else '/System/Library/Fonts/Supplemental/Arial.ttf',
        '/System/Library/Fonts/Helvetica.ttc',
        '/Library/Fonts/Arial.ttf',
        '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf' if bold else '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
        '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf' if bold else '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf'
    ]
    for p in font_paths:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                pass
    return ImageFont.load_default()

def draw_wrapped_text(draw, text, font, fill, x, y, max_width, line_spacing=1.25):
    text = sanitize_text(text)
    lines = []
    words = text.split()
    current_line = []
    for word in words:
        test_line = ' '.join(current_line + [word])
        bbox = draw.textbbox((0, 0), test_line, font=font)
        if (bbox[2] - bbox[0]) <= max_width:
            current_line.append(word)
        else:
            if current_line:
                lines.append(' '.join(current_line))
            current_line = [word]
    if current_line:
        lines.append(' '.join(current_line))
    cur_y = y
    for line in lines:
        draw.text((x, cur_y), line, font=font, fill=fill)
        bbox = draw.textbbox((0, 0), line, font=font)
        cur_y += int((bbox[3] - bbox[1]) * line_spacing)
    return cur_y

def create_base_canvas(w=1080, h=1920):
    img = Image.new('RGB', (w, h), BG_COLOR)
    glow = Image.new('RGB', (w, h), (0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    glow_draw.ellipse([-200, -200, 1300, 850], fill=(85, 28, 140))
    glow_draw.ellipse([300, 1200, 1400, 2100], fill=(25, 60, 130))
    glow = glow.filter(ImageFilter.GaussianBlur(180))
    img = Image.blend(img, glow, 0.70)
    draw = ImageDraw.Draw(img)

    # Top Brand Header - Positioned at y=200 to stay well clear of Facebook status bar & sound icon
    draw.rounded_rectangle([90, 200, 320, 256], radius=16, fill=SURFACE_LIGHT, outline=CARD_BORDER, width=1)
    draw.ellipse([110, 220, 126, 236], fill=PURPLE_GLOW)
    draw.text((142, 213), "TWINGENIE", font=get_font(28, bold=True), fill=TEXT_WHITE)
    draw.text((340, 216), "•  PERSONAL AI", font=get_font(26, bold=False), fill=TEXT_MUTED)
    return img, draw

# SCENE 1: HOOK (0s - ~4.5s)
def render_scene1(spec, out_path):
    w, h = 1080, 1920
    img, draw = create_base_canvas(w, h)
    
    tag = sanitize_text(spec.get('tag', 'COGNITIVE ARCHITECTURE')).upper()
    pill_y = 280
    draw.rounded_rectangle([90, pill_y, 470, pill_y + 52], radius=26, fill=(45, 24, 90), outline=PURPLE_PRIMARY, width=2)
    draw.text((115, pill_y + 11), tag, font=get_font(24, bold=True), fill=CYAN_ACCENT)

    hook_title = sanitize_text(spec.get('hook', 'What happens when your AI stops flattering you?'))
    cur_y = draw_wrapped_text(draw, hook_title, get_font(64, bold=True), TEXT_WHITE, 90, 360, 900, 1.15)
    
    card_y = cur_y + 40
    card_h = 240
    draw.rounded_rectangle([90, card_y, w - 90, card_y + card_h], radius=28, fill=SURFACE_DARK, outline=BORDER_PURPLE, width=2)
    draw.text((130, card_y + 35), "THE FLATTERY TRAP", font=get_font(28, bold=True), fill=PURPLE_GLOW)
    draw_wrapped_text(draw, "Conventional chatbots agree with your doubts, validate procrastination, and reset every session.", get_font(34, bold=False), TEXT_MUTED, 130, card_y + 85, 820, 1.30)

    takeaways = [
        "Why flattery AI creates dangerous confirmation loops",
        "How 4 cognitive perspectives challenge your blind spots",
        "Why persistent vector memory turns chat into real growth"
    ]
    ty = card_y + card_h + 40
    draw.text((90, ty), "INSIDE THIS BREAKDOWN:", font=get_font(26, bold=True), fill=TEXT_DIM)
    ty += 45
    for i, t in enumerate(takeaways, 1):
        box_h = 105
        draw.rounded_rectangle([90, ty, w - 90, ty + box_h], radius=20, fill=SURFACE_LIGHT, outline=CARD_BORDER, width=1)
        draw.rounded_rectangle([110, ty + 20, 175, ty + box_h - 20], radius=14, fill=(45, 30, 95))
        draw.text((126, ty + 35), f"0{i}", font=get_font(26, bold=True), fill=CYAN_ACCENT)
        draw_wrapped_text(draw, t, get_font(29, bold=False), TEXT_WHITE, 195, ty + 28, 760, 1.25)
        ty += box_h + 16

    # Bottom safe zone verified: ty ends around 1250px, leaving >650px clean for Facebook UI
    img.save(out_path, quality=95)

# SCENE 2: CONVENTIONAL BOT (4.5s - ~9.5s)
def render_scene2(spec, out_path):
    w, h = 1080, 1920
    img, draw = create_base_canvas(w, h)

    pill_y = 280
    draw.rounded_rectangle([90, pill_y, 440, pill_y + 52], radius=26, fill=(60, 25, 40), outline=ROSE_ACCENT, width=2)
    draw.text((115, pill_y + 11), "STANDARD CHATBOT", font=get_font(24, bold=True), fill=ROSE_ACCENT)

    title_y = draw_wrapped_text(draw, "The Yes-Man AI Trap", get_font(64, bold=True), TEXT_WHITE, 90, 360, 900, 1.15)
    sub_y = draw_wrapped_text(draw, "When you make an excuse, generic AI agrees with you:", get_font(34, bold=False), TEXT_MUTED, 90, title_y + 16, 900, 1.25)

    c1_y = sub_y + 35
    draw.rounded_rectangle([90, c1_y, w - 90, c1_y + 440], radius=28, fill=SURFACE_DARK, outline=(95, 40, 60), width=2)
    draw.text((130, c1_y + 35), "You (Feeling Avoidant):", font=get_font(28, bold=True), fill=TEXT_MUTED)
    draw.rounded_rectangle([130, c1_y + 80, w - 130, c1_y + 190], radius=18, fill=(35, 20, 42))
    user_txt = spec.get('userExcuse', "I'm overwhelmed with 10 tasks. Maybe I should just take the week off to reset.")
    draw_wrapped_text(draw, f"\"{user_txt}\"", get_font(30, bold=False), TEXT_WHITE, 155, c1_y + 102, 750, 1.25)

    draw.text((130, c1_y + 220), "Generic AI Chatbot:", font=get_font(28, bold=True), fill=ROSE_ACCENT)
    draw.rounded_rectangle([130, c1_y + 265, w - 130, c1_y + 375], radius=18, fill=(35, 20, 42))
    bot_txt = spec.get('botReply', "Totally understandable! Rest is productive. Don't push yourself today.")
    draw_wrapped_text(draw, f"\"{bot_txt}\"", get_font(30, bold=False), TEXT_WHITE, 155, c1_y + 288, 750, 1.25)

    c2_y = c1_y + 475
    draw.rounded_rectangle([90, c2_y, w - 90, c2_y + 190], radius=24, fill=(40, 20, 32), outline=ROSE_ACCENT, width=2)
    draw.text((130, c2_y + 30), "THE CONSEQUENCE:", font=get_font(26, bold=True), fill=ROSE_ACCENT)
    draw_wrapped_text(draw, "Your cognitive blind spot was reinforced. Avoidance disguised as self-care.", get_font(31, bold=False), TEXT_MUTED, 130, c2_y + 75, 820, 1.30)

    # Ends at ~1250px
    img.save(out_path, quality=95)

# SCENE 3: TWINGENIE HONEST PERSPECTIVE (9.5s - ~14.5s)
def render_scene3(spec, out_path):
    w, h = 1080, 1920
    img, draw = create_base_canvas(w, h)

    pill_y = 280
    draw.rounded_rectangle([90, pill_y, 470, pill_y + 52], radius=26, fill=(35, 22, 85), outline=PURPLE_PRIMARY, width=2)
    draw.text((115, pill_y + 11), "TWINGENIE HONEST MODE", font=get_font(24, bold=True), fill=CYAN_ACCENT)

    title_y = draw_wrapped_text(draw, "The Honest Perspective", get_font(64, bold=True), TEXT_WHITE, 90, 360, 900, 1.15)
    sub_y = draw_wrapped_text(draw, "What happens when your companion holds longitudinal memory:", get_font(34, bold=False), TEXT_MUTED, 90, title_y + 16, 900, 1.25)

    c1_y = sub_y + 35
    draw.rounded_rectangle([90, c1_y, w - 90, c1_y + 500], radius=28, fill=SURFACE_LIGHT, outline=BORDER_PURPLE, width=2)
    draw.text((130, c1_y + 35), "TwinGenie (Honest Twin):", font=get_font(30, bold=True), fill=PURPLE_GLOW)
    
    draw.rounded_rectangle([130, c1_y + 85, 540, c1_y + 130], radius=12, fill=(45, 30, 95))
    draw.text((150, c1_y + 97), "• RECALLED: MEMORY FROM 14 DAYS AGO", font=get_font(20, bold=True), fill=CYAN_ACCENT)

    draw.rounded_rectangle([130, c1_y + 150, w - 130, c1_y + 440], radius=20, fill=(18, 14, 40), outline=CARD_BORDER, width=1)
    twin_txt = spec.get('twinReply', "Memory check: You said this exact same thing 2 weeks ago before the investor call. You aren't burnt out—you're scared of market feedback. Close the 9 tabs and execute.")
    draw_wrapped_text(draw, f"\"{twin_txt}\"", get_font(31, bold=False), TEXT_WHITE, 155, c1_y + 175, 750, 1.35)

    c2_y = c1_y + 535
    draw.rounded_rectangle([90, c2_y, w - 90, c2_y + 160], radius=24, fill=(20, 38, 32), outline=EMERALD_ACCENT, width=2)
    draw.text((130, c2_y + 28), "GROWTH RESULT:", font=get_font(26, bold=True), fill=EMERALD_ACCENT)
    draw_wrapped_text(draw, "Exposes the avoidance loop and drives immediate decisive execution.", get_font(30, bold=False), TEXT_MUTED, 130, c2_y + 70, 820, 1.25)

    # Ends at ~1280px
    img.save(out_path, quality=95)

# SCENE 4: CTA (14.5s - ~20.0s)
def render_scene4(spec, out_path):
    w, h = 1080, 1920
    img, draw = create_base_canvas(w, h)

    pill_y = 280
    draw.rounded_rectangle([90, pill_y, 440, pill_y + 52], radius=26, fill=(35, 22, 85), outline=PURPLE_PRIMARY, width=2)
    draw.text((115, pill_y + 11), "LIVE ON GOOGLE PLAY", font=get_font(24, bold=True), fill=CYAN_ACCENT)

    title_y = draw_wrapped_text(draw, "Meet Your Digital Twin Today", get_font(64, bold=True), TEXT_WHITE, 90, 360, 900, 1.15)
    sub_y = draw_wrapped_text(draw, "Stop using AI that forgets you. Start building real self-awareness.", get_font(32, bold=False), TEXT_MUTED, 90, title_y + 16, 900, 1.25)

    box_y = sub_y + 35
    draw.rounded_rectangle([90, box_y, w - 90, box_y + 520], radius=32, fill=SURFACE_DARK, outline=BORDER_PURPLE, width=2)
    draw.text((135, box_y + 40), "TWINGENIE", font=get_font(42, bold=True), fill=TEXT_WHITE)
    draw.text((400, box_y + 52), "• PERSONAL DIGITAL TWIN", font=get_font(24, bold=False), fill=CYAN_ACCENT)

    points = [
        "35-Question Big Five personality baseline",
        "4 perspectives: Normal, Reflective, Honest, Future",
        "Persistent semantic memory across conversations",
        "100% private, self-guided reflection"
    ]
    py = box_y + 120
    for pt in points:
        draw.ellipse([135, py + 4, 165, py + 34], fill=(45, 30, 95))
        p1 = (135 + 8, py + 4 + 15)
        p2 = (135 + 14, py + 4 + 22)
        p3 = (135 + 23, py + 4 + 8)
        draw.line([p1, p2, p3], fill=EMERALD_ACCENT, width=3)
        draw.text((185, py + 6), pt, font=get_font(28, bold=False), fill=TEXT_MUTED)
        py += 68

    draw.rounded_rectangle([135, box_y + 420, w - 135, box_y + 480], radius=14, fill=(28, 22, 58), outline=CARD_BORDER, width=1)
    draw.text((160, box_y + 440), "Rating: 5.0  •  Google Play Store  •  100% Free Download", font=get_font(24, bold=True), fill=AMBER_ACCENT)

    btn_y = box_y + 560
    draw.rounded_rectangle([120, btn_y, w - 120, btn_y + 120], radius=26, fill=PURPLE_PRIMARY)
    draw.polygon([(200, btn_y + 40), (232, btn_y + 60), (200, btn_y + 80)], fill=TEXT_WHITE)
    draw.text((255, btn_y + 38), "Download on Google Play", font=get_font(38, bold=True), fill=TEXT_WHITE)

    draw.text((350, btn_y + 145), "twingenie.app  •  com.asmind.app", font=get_font(26, bold=False), fill=TEXT_DIM)

    # Finishes safely at 1280px
    img.save(out_path, quality=95)

# SYNTHESIZE AMBIENT BACKGROUND MUSIC
def generate_ambient_audio(output_path, duration=24.0):
    sr = 44100
    n = int(sr * duration)
    prog = [
        [ (82.4, 0.40), (164.8, 0.30), (196.0, 0.35), (246.9, 0.35), (293.7, 0.30), (370.0, 0.25) ],
        [ (65.4, 0.40), (130.8, 0.30), (196.0, 0.35), (246.9, 0.35), (329.6, 0.30), (392.0, 0.25) ],
        [ (98.0, 0.40), (146.8, 0.30), (196.0, 0.35), (246.9, 0.35), (293.7, 0.30), (370.0, 0.25) ],
        [ (73.4, 0.40), (146.8, 0.30), (220.0, 0.35), (246.9, 0.30), (293.7, 0.35), (370.0, 0.25) ]
    ]
    chord_dur = 4.0
    cycles = int(math.ceil(duration / (4.0 * len(prog))))
    chords = []
    for cycle in range(cycles):
        for idx, chord in enumerate(prog):
            st = (cycle * 4 + idx) * chord_dur
            et = st + chord_dur
            chords.append((st, et, chord))

    frames = bytearray()
    for i in range(n):
        t = i / sr
        cur_notes = chords[-1][2]
        chord_env = 1.0
        for s_start, s_end, notes in chords:
            if s_start <= t < s_end:
                cur_notes = notes
                ct = t - s_start
                attack = min(1.0, ct / 0.40)
                release = min(1.0, (s_end - t) / 0.40)
                chord_env = attack * release
                break

        m_in = min(1.0, t / 0.8)
        m_out = min(1.0, (duration - t) / 2.0)
        master = m_in * m_out

        left_sample = 0.0
        right_sample = 0.0
        lfo = math.sin(2 * math.pi * 0.25 * t) * 0.003

        for f, amp in cur_notes:
            w1 = math.sin(2 * math.pi * f * t)
            w2 = math.sin(2 * math.pi * (f * 2) * t) * 0.22
            w3 = math.sin(2 * math.pi * (f * 3) * t) * 0.06
            w_detune_l = math.sin(2 * math.pi * (f * (1.0012 + lfo)) * t) * 0.18
            w_detune_r = math.sin(2 * math.pi * (f * (0.9988 - lfo)) * t) * 0.18

            comp = (w1 + w2 + w3) * amp
            left_sample += (comp + w_detune_l * amp)
            right_sample += (comp + w_detune_r * amp)

        gain = 0.12 * chord_env * master
        ls = max(-1.0, min(1.0, left_sample * gain))
        rs = max(-1.0, min(1.0, right_sample * gain))
        frames.extend(struct.pack('<hh', int(ls * 32767), int(rs * 32767)))

    wav_tmp = output_path + '.wav'
    with wave.open(wav_tmp, 'wb') as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(sr)
        wf.writeframes(frames)

    subprocess.run(['ffmpeg', '-y', '-i', wav_tmp, '-c:a', 'aac', '-b:a', '192k', output_path], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    if os.path.exists(wav_tmp):
        os.remove(wav_tmp)

# GENERATE SCENE VOICE NARATION (ASYNC EDGE-TTS)
async def generate_voiceover_edge(text, out_mp3, voice='en-US-ChristopherNeural', rate='+5%'):
    import edge_tts
    communicate = edge_tts.Communicate(text, voice, rate=rate)
    await communicate.save(out_mp3)

def generate_voiceover_fallback_say(text, out_mp3):
    if os.path.exists('/usr/bin/say'):
        aiff_tmp = out_mp3 + '.aiff'
        subprocess.run(['say', '-v', 'Samantha', text, '-o', aiff_tmp], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        subprocess.run(['ffmpeg', '-y', '-i', aiff_tmp, '-c:a', 'libmp3lame', '-b:a', '128k', out_mp3], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        if os.path.exists(aiff_tmp):
            os.remove(aiff_tmp)
        return True
    return False

def get_audio_duration(file_path):
    cmd = ['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', file_path]
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if res.returncode == 0:
        try:
            return float(res.stdout.decode('utf-8').strip())
        except Exception:
            pass
    return 4.0

def render_reel(spec, output_mp4_path):
    temp_dir = os.path.dirname(output_mp4_path)
    os.makedirs(temp_dir, exist_ok=True)
    
    s1 = os.path.join(temp_dir, 'scene_1.png')
    s2 = os.path.join(temp_dir, 'scene_2.png')
    s3 = os.path.join(temp_dir, 'scene_3.png')
    s4 = os.path.join(temp_dir, 'scene_4.png')

    render_scene1(spec, s1)
    render_scene2(spec, s2)
    render_scene3(spec, s3)
    render_scene4(spec, s4)

    # Narration scripts per scene
    v1_text = sanitize_text(spec.get('voiceHook', spec.get('hook', 'What happens when your AI stops flattering you and tells the truth?')))
    v2_text = sanitize_text(spec.get('voiceProblem', 'Standard chatbots validate your excuses, keeping you trapped in comfort and avoidance.'))
    v3_text = sanitize_text(spec.get('voiceSolution', 'TwinGenie remembers your patterns. Its Honest Mode exposes avoidance to drive decisive execution.'))
    v4_text = sanitize_text(spec.get('voiceCta', 'Stop using AI that forgets you. Download TwinGenie free on Google Play today.'))

    v1_file = os.path.join(temp_dir, 'voice_s1.mp3')
    v2_file = os.path.join(temp_dir, 'voice_s2.mp3')
    v3_file = os.path.join(temp_dir, 'voice_s3.mp3')
    v4_file = os.path.join(temp_dir, 'voice_s4.mp3')

    # Try neural Edge TTS first, fallback gracefully to macOS say
    has_voices = True
    try:
        async def make_all_voices():
            await asyncio.gather(
                generate_voiceover_edge(v1_text, v1_file),
                generate_voiceover_edge(v2_text, v2_file),
                generate_voiceover_edge(v3_text, v3_file),
                generate_voiceover_edge(v4_text, v4_file)
            )
        asyncio.run(make_all_voices())
    except Exception as e:
        sys.stderr.write(f"Edge TTS failed ({e}), attempting fallback voice synthesis...\n")
        try:
            generate_voiceover_fallback_say(v1_text, v1_file)
            generate_voiceover_fallback_say(v2_text, v2_file)
            generate_voiceover_fallback_say(v3_text, v3_file)
            generate_voiceover_fallback_say(v4_text, v4_file)
        except Exception as e2:
            sys.stderr.write(f"Fallback voice synthesis failed ({e2}). Continuing with ambient music.\n")
            has_voices = False

    # Calculate scene timings dynamically based on narration duration
    if has_voices and all(os.path.exists(f) for f in [v1_file, v2_file, v3_file, v4_file]):
        d1 = get_audio_duration(v1_file)
        d2 = get_audio_duration(v2_file)
        d3 = get_audio_duration(v3_file)
        d4 = get_audio_duration(v4_file)
    else:
        d1, d2, d3, d4 = 3.6, 3.6, 3.6, 4.0

    # Ensure comfortable breathing room
    t1 = max(3.8, d1 + 0.4)
    t2 = max(3.8, d2 + 0.4)
    t3 = max(3.8, d3 + 0.4)
    t4 = max(4.2, d4 + 0.6)
    xfade = 0.5

    offset1 = t1 - xfade
    offset2 = offset1 + t2 - xfade
    offset3 = offset2 + t3 - xfade
    total_dur = offset3 + t4

    # Compile Voiceover Stream
    voice_track = os.path.join(temp_dir, 'voiceover_track.m4a')
    if has_voices and all(os.path.exists(f) for f in [v1_file, v2_file, v3_file, v4_file]):
        delay1 = int(250)
        delay2 = int((offset1 + 0.1) * 1000)
        delay3 = int((offset2 + 0.1) * 1000)
        delay4 = int((offset3 + 0.1) * 1000)

        v_cmd = [
            'ffmpeg', '-y',
            '-i', v1_file,
            '-i', v2_file,
            '-i', v3_file,
            '-i', v4_file,
            '-filter_complex',
            f'[0:a]adelay={delay1}|{delay1}[a0];'
            f'[1:a]adelay={delay2}|{delay2}[a1];'
            f'[2:a]adelay={delay3}|{delay3}[a2];'
            f'[3:a]adelay={delay4}|{delay4}[a3];'
            '[a0][a1][a2][a3]amix=inputs=4:duration=longest:dropout_transition=0[vaout]',
            '-map', '[vaout]',
            '-c:a', 'aac', '-b:a', '192k',
            voice_track
        ]
        subprocess.run(v_cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    else:
        voice_track = None

    # Ambient Music Preparation
    bg_music_file = os.path.join(temp_dir, 'bg_music.m4a')
    if os.path.exists(DEFAULT_BG_MUSIC):
        bg_source = DEFAULT_BG_MUSIC
    else:
        generate_ambient_audio(bg_music_file, duration=total_dur + 2.0)
        bg_source = bg_music_file

    # Mix Final Audio: Voiceover (1.0) + Ambient Ducked Music (0.16)
    final_audio = os.path.join(temp_dir, 'final_soundtrack.m4a')
    if voice_track and os.path.exists(voice_track):
        mix_cmd = [
            'ffmpeg', '-y',
            '-i', voice_track,
            '-i', bg_source,
            '-filter_complex',
            f'[0:a]aformat=channel_layouts=stereo,volume=1.0[voice];'
            f'[1:a]aformat=channel_layouts=stereo,volume=0.18,aloop=loop=-1:size=2e+09,atrim=0:{total_dur},afade=t=out:st={total_dur - 1.5}:d=1.5[bg];'
            '[voice][bg]amix=inputs=2:duration=first:dropout_transition=2[aout]',
            '-map', '[aout]',
            '-c:a', 'aac', '-b:a', '192k', '-ar', '44100', '-ac', '2',
            final_audio
        ]
    else:
        # Music only fallback
        mix_cmd = [
            'ffmpeg', '-y',
            '-i', bg_source,
            '-filter_complex',
            f'[0:a]volume=0.35,atrim=0:{total_dur},afade=t=out:st={total_dur - 1.5}:d=1.5[aout]',
            '-map', '[aout]',
            '-c:a', 'aac', '-b:a', '192k', '-ar', '44100',
            final_audio
        ]
    subprocess.run(mix_cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    # High-Bitrate Video Composition with FFmpeg
    # libx264 with CRF 17, 6 Mbps bitrate, faststart for instant streaming
    cmd = [
        'ffmpeg', '-y',
        '-loop', '1', '-t', str(t1), '-i', s1,
        '-loop', '1', '-t', str(t2), '-i', s2,
        '-loop', '1', '-t', str(t3), '-i', s3,
        '-loop', '1', '-t', str(t4), '-i', s4,
        '-i', final_audio,
        '-filter_complex',
        f'[0:v][1:v]xfade=transition=fade:duration={xfade}:offset={offset1:.2f}[v01];'
        f'[v01][2:v]xfade=transition=fade:duration={xfade}:offset={offset2:.2f}[v02];'
        f'[v02][3:v]xfade=transition=fade:duration={xfade}:offset={offset3:.2f}[v]',
        '-map', '[v]',
        '-map', '4:a',
        '-c:v', 'libx264',
        '-preset', 'medium',
        '-crf', '17',
        '-b:v', '6000k',
        '-maxrate', '8500k',
        '-bufsize', '12000k',
        '-pix_fmt', 'yuv420p',
        '-c:a', 'aac',
        '-b:a', '192k',
        '-ar', '44100',
        '-r', '30',
        '-movflags', '+faststart',
        output_mp4_path
    ]

    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if res.returncode != 0:
        raise RuntimeError(f"FFmpeg failed: {res.stderr.decode('utf-8')}")

    # Clean up temporary artifacts
    cleanup_files = [s1, s2, s3, s4, v1_file, v2_file, v3_file, v4_file, voice_track, bg_music_file, final_audio]
    for p in cleanup_files:
        if p and os.path.exists(p):
            try:
                os.remove(p)
            except Exception:
                pass

    return {
        'success': True,
        'videoPath': output_mp4_path,
        'resolution': '1080x1920',
        'durationSeconds': round(total_dur, 2),
        'fps': 30,
        'hasVoiceover': has_voices,
        'hasMusic': True
    }

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: python reelRenderer.py <spec_json> <output_mp4_path>")
        sys.exit(1)

    raw_input = sys.argv[1]
    out_mp4 = sys.argv[2]
    spec_data = json.loads(raw_input) if not os.path.exists(raw_input) else json.load(open(raw_input))
    result = render_reel(spec_data, out_mp4)
    print(json.dumps(result))
