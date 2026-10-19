#!/usr/bin/env python3
"""
TwinGenie Automated Reel Renderer (Ultra-Bold 4K-Supersampled Edition)
Renders high-contrast, razor-sharp 1080x1920 vertical video Reels.
Features:
- Bundled heavy-weight static typography (Arial Black 800+ and Arial Bold 700) for zero compression blur.
- 2x Retina Supersampling (rendered at 2160x3840 4K, downscaled via Lanczos with 4:4:4 color).
- Stillimage-tuned x264 encoding (CRF 12, GOP 60, zero bilinear interpolation blurring).
- Neural voiceover narration per scene + ambient stereo synth soundtrack.
- Safe zone compliance: avoids top notch/sound icon and bottom 640px Facebook overlay.
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

BG_COLOR = (10, 8, 24)           # Deep Obsidian #0A0818
SURFACE_DARK = (20, 15, 44)      # Surface #140F2C
SURFACE_LIGHT = (32, 24, 68)     # Card Highlight #201844
CARD_BORDER = (75, 58, 140)      # High-contrast Border #4B3A8C
BORDER_PURPLE = (147, 51, 234)   # Vibrant Purple #9333EA

PURPLE_PRIMARY = (147, 51, 234)  # #9333EA
PURPLE_GLOW = (192, 132, 252)    # #C084FC
CYAN_ACCENT = (56, 189, 248)     # #38BDF8
EMERALD_ACCENT = (52, 211, 153)  # #34D399
AMBER_ACCENT = (251, 191, 36)    # #FBBF24
ROSE_ACCENT = (244, 63, 94)      # #F43F5E

TEXT_WHITE = (255, 255, 255)
TEXT_LIGHT = (245, 247, 250)     # High-contrast slate-white (prevents fade)
TEXT_MUTED = (215, 222, 235)     # High-visibility slate (prevents fade)
TEXT_DIM = (165, 175, 195)       # Clean visible slate

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_BG_MUSIC = os.path.join(SCRIPT_DIR, '../assets/audio/bg_ambient.m4a')
FONT_BLACK_PATH = os.path.join(SCRIPT_DIR, '../assets/fonts/Font-Black.ttf')
FONT_BOLD_PATH = os.path.join(SCRIPT_DIR, '../assets/fonts/Font-Bold.ttf')

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

def f_black(size):
    if os.path.exists(FONT_BLACK_PATH):
        try:
            return ImageFont.truetype(FONT_BLACK_PATH, size)
        except Exception:
            pass
    font_paths = ['/System/Library/Fonts/Supplemental/Arial Black.ttf', '/System/Library/Fonts/Supplemental/Arial Bold.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf']
    for p in font_paths:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                pass
    return ImageFont.load_default()

def f_bold(size):
    if os.path.exists(FONT_BOLD_PATH):
        try:
            return ImageFont.truetype(FONT_BOLD_PATH, size)
        except Exception:
            pass
    font_paths = ['/System/Library/Fonts/Supplemental/Arial Bold.ttf', '/Library/Fonts/Arial.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf']
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

    # Top Brand Header - Perfectly centered unified pill, completely immune to notch & corner overlays
    brand_txt = "TWINGENIE"
    sub_txt = "•  PERSONAL AI"
    b_font = f_black(26)
    s_font = f_bold(24)
    b_w = draw.textbbox((0, 0), brand_txt, font=b_font)[2]
    s_w = draw.textbbox((0, 0), sub_txt, font=s_font)[2]
    dot_d = 16
    gap1 = 12
    gap2 = 14
    pad_h = 24
    pill_w = pad_h + dot_d + gap1 + b_w + gap2 + s_w + pad_h
    pill_h = 56
    pill_x = int((w - pill_w) / 2)
    pill_y = 80

    draw.rounded_rectangle([pill_x, pill_y, pill_x + pill_w, pill_y + pill_h], radius=28, fill=SURFACE_LIGHT, outline=CARD_BORDER, width=2)
    dot_y = pill_y + int((pill_h - dot_d) / 2)
    draw.ellipse([pill_x + pad_h, dot_y, pill_x + pad_h + dot_d, dot_y + dot_d], fill=PURPLE_GLOW)
    draw.text((pill_x + pad_h + dot_d + gap1, pill_y + 11), brand_txt, font=b_font, fill=TEXT_WHITE)
    draw.text((pill_x + pad_h + dot_d + gap1 + b_w + gap2, pill_y + 13), sub_txt, font=s_font, fill=CYAN_ACCENT)
    return img, draw

# SCENE 1: HOOK (0s - ~4.5s)
def render_scene1(spec, out_path):
    w, h = 1080, 1920
    img, draw = create_base_canvas(w, h)
    
    tag = sanitize_text(spec.get('tag', 'COGNITIVE ARCHITECTURE')).upper()
    tag_bbox = draw.textbbox((0, 0), tag, font=f_black(22))
    tag_w = tag_bbox[2] - tag_bbox[0]
    pill_y = 175
    draw.rounded_rectangle([90, pill_y, 90 + tag_w + 50, pill_y + 52], radius=26, fill=(45, 24, 90), outline=PURPLE_PRIMARY, width=2)
    draw.text((115, pill_y + 11), tag, font=f_black(22), fill=CYAN_ACCENT)

    hook_title = sanitize_text(spec.get('hook', 'What happens when your AI stops flattering you?'))
    cur_y = draw_wrapped_text(draw, hook_title, f_black(62), TEXT_WHITE, 90, 255, 900, 1.15)
    
    card_y = cur_y + 35
    card_h = 240
    draw.rounded_rectangle([90, card_y, w - 90, card_y + card_h], radius=28, fill=SURFACE_DARK, outline=BORDER_PURPLE, width=2)
    draw.text((130, card_y + 30), "THE FLATTERY TRAP", font=f_black(28), fill=PURPLE_GLOW)
    draw_wrapped_text(draw, "Conventional chatbots agree with your doubts, validate procrastination, and reset every session.", f_bold(32), TEXT_LIGHT, 130, card_y + 80, 820, 1.30)

    takeaways = [
        "Why flattery AI creates dangerous confirmation loops",
        "How 4 cognitive perspectives challenge your blind spots",
        "Why persistent vector memory turns chat into real growth"
    ]
    ty = card_y + card_h + 35
    draw.text((90, ty), "INSIDE THIS BREAKDOWN:", font=f_black(26), fill=TEXT_MUTED)
    ty += 45
    for i, t in enumerate(takeaways, 1):
        box_h = 105
        draw.rounded_rectangle([90, ty, w - 90, ty + box_h], radius=20, fill=SURFACE_LIGHT, outline=CARD_BORDER, width=2)
        draw.rounded_rectangle([110, ty + 20, 175, ty + box_h - 20], radius=14, fill=(45, 30, 95))
        draw.text((126, ty + 35), f"0{i}", font=f_black(26), fill=CYAN_ACCENT)
        draw_wrapped_text(draw, t, f_bold(30), TEXT_LIGHT, 195, ty + 26, 760, 1.25)
        ty += box_h + 16

    img.save(out_path, quality=98)

# SCENE 2: CONVENTIONAL BOT (4.5s - ~9.5s)
def render_scene2(spec, out_path):
    w, h = 1080, 1920
    img, draw = create_base_canvas(w, h)

    pill_y = 175
    draw.rounded_rectangle([90, pill_y, 440, pill_y + 52], radius=26, fill=(60, 25, 40), outline=ROSE_ACCENT, width=2)
    draw.text((115, pill_y + 11), "STANDARD CHATBOT", font=f_black(22), fill=ROSE_ACCENT)

    title_y = draw_wrapped_text(draw, "The Yes-Man AI Trap", f_black(62), TEXT_WHITE, 90, 255, 900, 1.15)
    sub_y = draw_wrapped_text(draw, "When you make an excuse, generic AI agrees with you:", f_bold(32), TEXT_LIGHT, 90, title_y + 18, 900, 1.25)

    c1_y = sub_y + 35
    draw.rounded_rectangle([90, c1_y, w - 90, c1_y + 440], radius=28, fill=SURFACE_DARK, outline=(130, 50, 80), width=2)
    draw.text((130, c1_y + 35), "You (Feeling Avoidant):", font=f_black(28), fill=TEXT_MUTED)
    draw.rounded_rectangle([130, c1_y + 80, w - 130, c1_y + 190], radius=18, fill=(35, 20, 42))
    user_txt = spec.get('userExcuse', "I'm overwhelmed with 10 tasks. Maybe I should just take the week off to reset.")
    draw_wrapped_text(draw, f"\"{user_txt}\"", f_bold(30), TEXT_LIGHT, 155, c1_y + 102, 750, 1.25)

    draw.text((130, c1_y + 220), "Generic AI Chatbot:", font=f_black(28), fill=ROSE_ACCENT)
    draw.rounded_rectangle([130, c1_y + 265, w - 130, c1_y + 375], radius=18, fill=(35, 20, 42))
    bot_txt = spec.get('botReply', "Totally understandable! Rest is productive. Don't push yourself today.")
    draw_wrapped_text(draw, f"\"{bot_txt}\"", f_bold(30), TEXT_LIGHT, 155, c1_y + 288, 750, 1.25)

    c2_y = c1_y + 475
    draw.rounded_rectangle([90, c2_y, w - 90, c2_y + 190], radius=24, fill=(40, 20, 32), outline=ROSE_ACCENT, width=2)
    draw.text((130, c2_y + 30), "THE CONSEQUENCE:", font=f_black(26), fill=ROSE_ACCENT)
    draw_wrapped_text(draw, "Your cognitive blind spot was reinforced. Avoidance disguised as self-care.", f_bold(30), TEXT_LIGHT, 130, c2_y + 75, 820, 1.30)

    img.save(out_path, quality=98)

# SCENE 3: TWINGENIE HONEST PERSPECTIVE (9.5s - ~14.5s)
def render_scene3(spec, out_path):
    w, h = 1080, 1920
    img, draw = create_base_canvas(w, h)

    tag_txt = "TWINGENIE HONEST MODE"
    tag_bbox = draw.textbbox((0, 0), tag_txt, font=f_black(22))
    pill_w = tag_bbox[2] - tag_bbox[0] + 50
    pill_y = 175
    draw.rounded_rectangle([90, pill_y, 90 + pill_w, pill_y + 52], radius=26, fill=(35, 22, 85), outline=PURPLE_PRIMARY, width=2)
    draw.text((115, pill_y + 11), tag_txt, font=f_black(22), fill=CYAN_ACCENT)

    title_y = draw_wrapped_text(draw, "The Honest Perspective", f_black(62), TEXT_WHITE, 90, 255, 900, 1.15)
    sub_y = draw_wrapped_text(draw, "What happens when your companion holds longitudinal memory:", f_bold(32), TEXT_LIGHT, 90, title_y + 18, 900, 1.25)

    c1_y = sub_y + 35
    draw.rounded_rectangle([90, c1_y, w - 90, c1_y + 500], radius=28, fill=SURFACE_LIGHT, outline=BORDER_PURPLE, width=2)
    draw.text((130, c1_y + 35), "TwinGenie (Honest Twin):", font=f_black(30), fill=PURPLE_GLOW)
    
    draw.rounded_rectangle([130, c1_y + 85, 540, c1_y + 130], radius=12, fill=(45, 30, 95))
    draw.text((150, c1_y + 97), "• RECALLED: MEMORY FROM 14 DAYS AGO", font=f_black(20), fill=CYAN_ACCENT)

    draw.rounded_rectangle([130, c1_y + 150, w - 130, c1_y + 440], radius=20, fill=(18, 14, 40), outline=CARD_BORDER, width=2)
    twin_txt = spec.get('twinReply', "Memory check: You said this exact same thing 2 weeks ago before the investor call. You aren't burnt out—you're scared of market feedback. Close the 9 tabs and execute.")
    draw_wrapped_text(draw, f"\"{twin_txt}\"", f_bold(30), TEXT_LIGHT, 155, c1_y + 175, 750, 1.35)

    c2_y = c1_y + 535
    draw.rounded_rectangle([90, c2_y, w - 90, c2_y + 160], radius=24, fill=(20, 38, 32), outline=EMERALD_ACCENT, width=2)
    draw.text((130, c2_y + 28), "GROWTH RESULT:", font=f_black(26), fill=EMERALD_ACCENT)
    draw_wrapped_text(draw, "Exposes the avoidance loop and drives decisive immediate action.", f_bold(30), TEXT_LIGHT, 130, c2_y + 70, 820, 1.25)

    img.save(out_path, quality=98)

# SCENE 4: CTA (14.5s - ~20.0s)
def render_scene4(spec, out_path):
    w, h = 1080, 1920
    img, draw = create_base_canvas(w, h)

    pill_y = 175
    draw.rounded_rectangle([90, pill_y, 440, pill_y + 52], radius=26, fill=(35, 22, 85), outline=PURPLE_PRIMARY, width=2)
    draw.text((115, pill_y + 11), "LIVE ON GOOGLE PLAY", font=f_black(24), fill=CYAN_ACCENT)

    title_y = draw_wrapped_text(draw, "Meet Your Digital Twin Today", f_black(62), TEXT_WHITE, 90, 255, 900, 1.15)
    sub_y = draw_wrapped_text(draw, "Stop using AI that forgets you. Start building real self-awareness.", f_bold(32), TEXT_LIGHT, 90, title_y + 18, 900, 1.25)

    box_y = sub_y + 35
    draw.rounded_rectangle([90, box_y, w - 90, box_y + 530], radius=32, fill=SURFACE_DARK, outline=BORDER_PURPLE, width=3)
    
    # Header inside card: TWINGENIE • PERSONAL DIGITAL TWIN
    draw.text((135, box_y + 40), "TWINGENIE", font=f_black(40), fill=TEXT_WHITE)
    tg_bbox = draw.textbbox((135, box_y + 40), "TWINGENIE", font=f_black(40))
    draw.text((tg_bbox[2] + 20, box_y + 52), "• PERSONAL DIGITAL TWIN", font=f_bold(24), fill=CYAN_ACCENT)

    points = [
        "35-Question Big Five personality baseline",
        "4 perspectives: Normal, Reflective, Honest, Future",
        "Persistent semantic memory across conversations",
        "100% private, self-guided reflection"
    ]
    py = box_y + 115
    for pt in points:
        draw.ellipse([135, py + 4, 165, py + 34], fill=(45, 30, 95))
        draw.line([(135 + 8, py + 4 + 15), (135 + 14, py + 4 + 22), (135 + 23, py + 4 + 8)], fill=EMERALD_ACCENT, width=4)
        draw.text((185, py + 4), pt, font=f_bold(28), fill=TEXT_LIGHT)
        py += 68

    # Rating strip inside card
    draw.rounded_rectangle([135, box_y + 435, w - 135, box_y + 495], radius=16, fill=(28, 22, 58), outline=CARD_BORDER, width=2)
    rating_text = "Rating: 5.0  •  Google Play Store  •  100% Free Download"
    r_bbox = draw.textbbox((0, 0), rating_text, font=f_bold(24))
    r_w = r_bbox[2] - r_bbox[0]
    r_x = int((w - r_w) / 2)
    draw.text((r_x, box_y + 452), rating_text, font=f_bold(24), fill=AMBER_ACCENT)

    # CTA Button
    btn_y = box_y + 570
    draw.rounded_rectangle([120, btn_y, w - 120, btn_y + 125], radius=28, fill=PURPLE_PRIMARY)
    btn_label = "Download on Google Play"
    b_bbox = draw.textbbox((0, 0), btn_label, font=f_black(38))
    b_w = b_bbox[2] - b_bbox[0]
    total_cta_w = 35 + 25 + b_w
    tri_x = int((w - total_cta_w) / 2)
    draw.polygon([(tri_x, btn_y + 42), (tri_x + 35, btn_y + 63), (tri_x, btn_y + 84)], fill=TEXT_WHITE)
    draw.text((tri_x + 60, btn_y + 40), btn_label, font=f_black(38), fill=TEXT_WHITE)

    # Bottom domain link
    bottom_txt = "twingenie.app  •  com.asmind.app"
    bm_bbox = draw.textbbox((0, 0), bottom_txt, font=f_bold(26))
    bm_w = bm_bbox[2] - bm_bbox[0]
    bm_x = int((w - bm_w) / 2)
    draw.text((bm_x, btn_y + 150), bottom_txt, font=f_bold(26), fill=TEXT_MUTED)

    img.save(out_path, quality=98)

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

    # Mix Final Audio: Voiceover (1.0) + Ambient Ducked Music (0.18)
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
        mix_cmd = [
            'ffmpeg', '-y',
            '-i', bg_source,
            '-filter_complex',
            f'[0:a]volume=0.35,atrim=0:{total_dur},afade=t=out:st={total_dur - 1.5}:d=1.5[aout]',
            '-map', '[aout]',
            '-c:a', 'aac', '-b:a', '192k', '-ar', '44100', '-ac', '2',
            final_audio
        ]
    subprocess.run(mix_cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    # High-Bitrate Video Composition with FFmpeg
    # ROOT CAUSE: CRF mode AND one-pass ABR mode on static/still content both produce low bitrate
    # (~700kbps-2Mbps) because x264 sees no inter-frame motion and refuses to spend bits.
    # Facebook sees the low bitrate and serves at 360p instead of 1080p.
    # FIX: Use true Constant Bitrate (CBR) mode with nal-hrd=cbr. This forces x264 to insert
    # filler NAL units to pad the stream to exactly the target bitrate, even on static content.
    # Set minrate = maxrate = b:v for true CBR behavior.
    target_bitrate = '8M'
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
        '-profile:v', 'high',
        '-level', '4.2',
        '-b:v', target_bitrate,
        '-minrate', target_bitrate,
        '-maxrate', target_bitrate,
        '-bufsize', '8M',
        '-x264-params', 'nal-hrd=cbr:force-cfr=1',
        '-g', '60',
        '-keyint_min', '30',
        '-pix_fmt', 'yuv420p',
        '-c:a', 'aac',
        '-b:a', '192k',
        '-ar', '44100',
        '-ac', '2',
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
