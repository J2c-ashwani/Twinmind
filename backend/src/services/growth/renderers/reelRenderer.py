#!/usr/bin/env python3
"""
TwinGenie Automated Reel Renderer (Ultra-HD Ken Burns Motion Edition)
Renders high-contrast, razor-sharp 1080x1920 vertical video Reels for Facebook & Instagram.
Features:
- Safe zone compliance: Top header at y=115 (immune to punch-hole notches and top-left/right icons),
  content ends by y=1400 (safe from bottom caption/profile overlay), right margin at x=910 (safe from action buttons).
- Dynamic tag pill padding: Auto-expands pill width based on text width with 30px lateral padding to prevent border collisions.
- Pure white typography (#FFFFFF) on all body, quotes, and bullet text to prevent H.264 4:2:0 chroma bleed/blur.
- Continuous Ken Burns motion drift (zoompan) on all slides so Meta CVQE allocates full 1080p HD bitrate.
- Neural voiceover narration per scene in simple, accessible conversational English + ducked stereo synth soundtrack.
- Total video duration calibrated to ~34-36 seconds for comfortable readability.
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
TEXT_LIGHT = (245, 247, 250)     # High-contrast slate-white
TEXT_MUTED = (215, 222, 235)     # High-visibility slate
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

def draw_star(draw, cx, cy, r_outer=13, r_inner=6, fill=AMBER_ACCENT):
    points = []
    for i in range(10):
        angle = i * math.pi / 5 - math.pi / 2
        r = r_outer if i % 2 == 0 else r_inner
        points.append((cx + r * math.cos(angle), cy + r * math.sin(angle)))
    draw.polygon(points, fill=fill)

def create_base_canvas(w=1080, h=1920):
    img = Image.new('RGB', (w, h), BG_COLOR)
    glow = Image.new('RGB', (w, h), (0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    glow_draw.ellipse([-200, -200, 1300, 850], fill=(85, 28, 140))
    glow_draw.ellipse([300, 1200, 1400, 2100], fill=(25, 60, 130))
    glow = glow.filter(ImageFilter.GaussianBlur(180))
    img = Image.blend(img, glow, 0.70)
    draw = ImageDraw.Draw(img)

    # Top Brand Header - Centered at y=115, completely clear of phone notch and FB top icons
    brand_txt = "TWINGENIE"
    sub_txt = "•  PERSONAL AI"
    b_font = f_black(26)
    s_font = f_bold(24)
    b_bbox = draw.textbbox((0, 0), brand_txt, font=b_font)
    s_bbox = draw.textbbox((0, 0), sub_txt, font=s_font)
    b_w = b_bbox[2] - b_bbox[0]
    s_w = s_bbox[2] - s_bbox[0]
    dot_d = 16
    gap1 = 12
    gap2 = 14
    pad_h = 24
    pill_w = pad_h + dot_d + gap1 + b_w + gap2 + s_w + pad_h
    pill_h = 52
    pill_x = int((w - pill_w) / 2)
    pill_y = 115

    draw.rounded_rectangle([pill_x, pill_y, pill_x + pill_w, pill_y + pill_h], radius=26, fill=SURFACE_LIGHT, outline=CARD_BORDER, width=2)
    dot_y = pill_y + int((pill_h - dot_d) / 2)
    draw.ellipse([pill_x + pad_h, dot_y, pill_x + pad_h + dot_d, dot_y + dot_d], fill=PURPLE_GLOW)
    draw.text((pill_x + pad_h + dot_d + gap1, pill_y + 10), brand_txt, font=b_font, fill=TEXT_WHITE)
    draw.text((pill_x + pad_h + dot_d + gap1 + b_w + gap2, pill_y + 12), sub_txt, font=s_font, fill=CYAN_ACCENT)
    return img, draw

# SCENE 1: HOOK (The Flattery Trap)
def render_scene1(spec, out_path):
    w, h = 1080, 1920
    img, draw = create_base_canvas(w, h)
    
    tag = sanitize_text(spec.get('tag', 'COGNITIVE ARCHITECTURE')).upper()
    tag_bbox = draw.textbbox((0, 0), tag, font=f_black(22))
    tag_w = tag_bbox[2] - tag_bbox[0]
    pill_y = 185
    pad_x = 30
    pill_w = tag_w + pad_x * 2
    draw.rounded_rectangle([90, pill_y, 90 + pill_w, pill_y + 48], radius=24, fill=(45, 24, 90), outline=PURPLE_PRIMARY, width=2)
    draw.text((90 + pad_x, pill_y + 11), tag, font=f_black(22), fill=CYAN_ACCENT)

    hook_title = sanitize_text(spec.get('hook', 'What happens when your AI stops flattering you?'))
    cur_y = draw_wrapped_text(draw, hook_title, f_black(58), TEXT_WHITE, 90, 255, 820, 1.18)
    
    c1_y = cur_y + 35
    c1_h = 270
    draw.rounded_rectangle([90, c1_y, 910, c1_y + c1_h], radius=28, fill=SURFACE_DARK, outline=BORDER_PURPLE, width=2)
    draw.rounded_rectangle([90, c1_y + 25, 98, c1_y + c1_h - 25], radius=4, fill=PURPLE_GLOW)
    draw.text((130, c1_y + 36), "THE FLATTERY TRAP", font=f_black(30), fill=PURPLE_GLOW)
    draw_wrapped_text(draw, "Conventional chatbots agree with your doubts, validate procrastination, and reset every single session.", f_bold(32), TEXT_WHITE, 130, c1_y + 98, 740, 1.35)

    takeaways = [
        "Why flattery AI creates dangerous confirmation loops",
        "How 4 cognitive perspectives challenge your blind spots",
        "Why persistent memory turns chat into real growth"
    ]
    ty = c1_y + c1_h + 35
    draw.text((90, ty), "INSIDE THIS BREAKDOWN:", font=f_black(26), fill=TEXT_MUTED)
    ty += 48
    for i, t in enumerate(takeaways, 1):
        box_h = 125
        draw.rounded_rectangle([90, ty, 910, ty + box_h], radius=22, fill=SURFACE_LIGHT, outline=CARD_BORDER, width=2)
        draw.rounded_rectangle([115, ty + 24, 185, ty + box_h - 24], radius=16, fill=(45, 30, 95))
        draw.text((130, ty + 44), f"0{i}", font=f_black(30), fill=CYAN_ACCENT)
        draw_wrapped_text(draw, t, f_bold(30), TEXT_WHITE, 210, ty + 30, 670, 1.28)
        ty += box_h + 20

    anchor_y = ty + 15
    draw.rounded_rectangle([90, anchor_y, 910, anchor_y + 130], radius=24, fill=(35, 20, 65), outline=PURPLE_PRIMARY, width=2)
    draw.text((130, anchor_y + 26), "EXPERIMENT IN ACTION", font=f_black(22), fill=AMBER_ACCENT)
    draw_wrapped_text(draw, "Watch what happens when AI replaces flattery with truth >>", f_bold(26), TEXT_WHITE, 130, anchor_y + 68, 740, 1.25)

    img.save(out_path, quality=98)

# SCENE 2: CONVENTIONAL BOT (The Yes-Man Trap)
def render_scene2(spec, out_path):
    w, h = 1080, 1920
    img, draw = create_base_canvas(w, h)

    tag = "STANDARD CHATBOT • THE TRAP"
    tag_bbox = draw.textbbox((0, 0), tag, font=f_black(22))
    tag_w = tag_bbox[2] - tag_bbox[0]
    pill_y = 185
    pad_x = 30
    pill_w = tag_w + pad_x * 2
    draw.rounded_rectangle([90, pill_y, 90 + pill_w, pill_y + 48], radius=24, fill=(60, 25, 40), outline=ROSE_ACCENT, width=2)
    draw.text((90 + pad_x, pill_y + 11), tag, font=f_black(22), fill=ROSE_ACCENT)

    title_y = draw_wrapped_text(draw, "The Yes-Man AI Trap", f_black(58), TEXT_WHITE, 90, 255, 820, 1.18)
    sub_y = draw_wrapped_text(draw, "When you make an excuse, generic AI agrees with you:", f_bold(30), TEXT_WHITE, 90, title_y + 18, 820, 1.25)

    c1_y = sub_y + 35
    c1_h = 520
    draw.rounded_rectangle([90, c1_y, 910, c1_y + c1_h], radius=28, fill=SURFACE_DARK, outline=(140, 50, 75), width=2)
    
    # User Excuse Bubble
    draw.text((130, c1_y + 32), "You (Feeling Avoidant & Overwhelmed):", font=f_black(24), fill=TEXT_MUTED)
    draw.rounded_rectangle([130, c1_y + 75, 870, c1_y + 225], radius=20, fill=(35, 20, 42), outline=(90, 35, 55), width=2)
    user_txt = spec.get('userExcuse', "I'm overwhelmed with 10 tasks. Maybe I should just take the week off to reset.")
    draw_wrapped_text(draw, f"\"{user_txt}\"", f_bold(30), TEXT_WHITE, 160, c1_y + 105, 670, 1.30)

    # Generic Bot Reply Bubble
    draw.text((130, c1_y + 255), "Generic AI Chatbot (Flattery Mode):", font=f_black(24), fill=ROSE_ACCENT)
    draw.rounded_rectangle([130, c1_y + 298, 870, c1_y + 468], radius=20, fill=(35, 20, 42), outline=(90, 35, 55), width=2)
    bot_txt = spec.get('botReply', "Totally understandable! Rest is productive. Don't push yourself today—you deserve a break!")
    draw_wrapped_text(draw, f"\"{bot_txt}\"", f_bold(30), TEXT_WHITE, 160, c1_y + 330, 670, 1.30)

    # Consequence Card
    c2_y = c1_y + c1_h + 30
    c2_h = 220
    draw.rounded_rectangle([90, c2_y, 910, c2_y + c2_h], radius=24, fill=(45, 18, 32), outline=ROSE_ACCENT, width=2)
    draw.text((130, c2_y + 34), "[THE CONSEQUENCE]", font=f_black(26), fill=ROSE_ACCENT)
    draw_wrapped_text(draw, "Your cognitive blind spot was reinforced. Avoidance disguised as self-care. Zero progress made.", f_bold(30), TEXT_WHITE, 130, c2_y + 88, 740, 1.35)

    # Bottom anchor card
    anchor_y = c2_y + c2_h + 30
    anchor_h = 130
    draw.rounded_rectangle([90, anchor_y, 910, anchor_y + anchor_h], radius=22, fill=(30, 20, 50), outline=BORDER_PURPLE, width=2)
    draw.text((130, anchor_y + 26), "COMING NEXT >>", font=f_black(22), fill=CYAN_ACCENT)
    draw_wrapped_text(draw, "What happens when an AI actually remembers your patterns?", f_bold(26), TEXT_WHITE, 130, anchor_y + 68, 740, 1.25)

    img.save(out_path, quality=98)

# SCENE 3: TWINGENIE HONEST PERSPECTIVE
def render_scene3(spec, out_path):
    w, h = 1080, 1920
    img, draw = create_base_canvas(w, h)

    tag = "HONEST MODE • NO FLATTERY"
    tag_bbox = draw.textbbox((0, 0), tag, font=f_black(22))
    tag_w = tag_bbox[2] - tag_bbox[0]
    pill_y = 185
    pad_x = 30
    pill_w = tag_w + pad_x * 2
    draw.rounded_rectangle([90, pill_y, 90 + pill_w, pill_y + 48], radius=24, fill=(35, 22, 85), outline=PURPLE_PRIMARY, width=2)
    draw.text((90 + pad_x, pill_y + 11), tag, font=f_black(22), fill=CYAN_ACCENT)

    title_y = draw_wrapped_text(draw, "The Honest Perspective", f_black(58), TEXT_WHITE, 90, 255, 820, 1.18)
    sub_y = draw_wrapped_text(draw, "What happens when your companion holds persistent memory:", f_bold(30), TEXT_WHITE, 90, title_y + 18, 820, 1.25)

    c1_y = sub_y + 35
    c1_h = 530
    draw.rounded_rectangle([90, c1_y, 910, c1_y + c1_h], radius=28, fill=SURFACE_LIGHT, outline=BORDER_PURPLE, width=2)
    draw.text((130, c1_y + 34), "TwinGenie (Honest Twin):", font=f_black(28), fill=PURPLE_GLOW)
    
    draw.rounded_rectangle([130, c1_y + 82, 670, c1_y + 132], radius=14, fill=(45, 30, 95))
    draw.text((150, c1_y + 96), "• RECALLED FROM MEMORY (14 DAYS AGO)", font=f_black(19), fill=CYAN_ACCENT)

    draw.rounded_rectangle([130, c1_y + 155, 870, c1_y + 480], radius=22, fill=(18, 14, 40), outline=CARD_BORDER, width=2)
    twin_txt = spec.get('twinReply', "Memory check: You said this exact same thing 2 weeks ago before the investor call. You aren't burnt out—you're scared of market feedback. Close the 9 tabs and execute.")
    draw_wrapped_text(draw, f"\"{twin_txt}\"", f_bold(31), TEXT_WHITE, 160, c1_y + 190, 670, 1.38)

    # Growth result card
    c2_y = c1_y + c1_h + 30
    c2_h = 210
    draw.rounded_rectangle([90, c2_y, 910, c2_y + c2_h], radius=24, fill=(18, 42, 34), outline=EMERALD_ACCENT, width=2)
    draw.text((130, c2_y + 32), "[THE GROWTH RESULT]", font=f_black(26), fill=EMERALD_ACCENT)
    draw_wrapped_text(draw, "Exposes the avoidance loop and drives decisive immediate action.", f_bold(30), TEXT_WHITE, 130, c2_y + 82, 740, 1.32)

    # Bottom anchor
    anchor_y = c2_y + c2_h + 30
    anchor_h = 130
    draw.rounded_rectangle([90, anchor_y, 910, anchor_y + anchor_h], radius=22, fill=(25, 22, 60), outline=BORDER_PURPLE, width=2)
    draw.text((130, anchor_y + 26), "CORE ARCHITECTURE", font=f_black(22), fill=CYAN_ACCENT)
    draw_wrapped_text(draw, "Longitudinal Memory  •  4 Perspectives  •  Zero Flattery", f_bold(26), TEXT_WHITE, 130, anchor_y + 68, 740, 1.25)

    img.save(out_path, quality=98)

# SCENE 4: CTA (Meet Your Digital Twin)
def render_scene4(spec, out_path):
    w, h = 1080, 1920
    img, draw = create_base_canvas(w, h)

    tag = "AVAILABLE ON GOOGLE PLAY"
    tag_bbox = draw.textbbox((0, 0), tag, font=f_black(22))
    tag_w = tag_bbox[2] - tag_bbox[0]
    pill_y = 185
    pad_x = 30
    pill_w = tag_w + pad_x * 2
    draw.rounded_rectangle([90, pill_y, 90 + pill_w, pill_y + 48], radius=24, fill=(35, 22, 85), outline=PURPLE_PRIMARY, width=2)
    draw.text((90 + pad_x, pill_y + 11), tag, font=f_black(22), fill=CYAN_ACCENT)

    title_y = draw_wrapped_text(draw, "Meet Your Digital Twin Today", f_black(58), TEXT_WHITE, 90, 255, 820, 1.18)
    sub_y = draw_wrapped_text(draw, "Stop using AI that forgets you. Start building real self-awareness.", f_bold(30), TEXT_WHITE, 90, title_y + 18, 820, 1.25)

    box_y = sub_y + 35
    box_h = 560
    draw.rounded_rectangle([90, box_y, 910, box_y + box_h], radius=32, fill=SURFACE_DARK, outline=BORDER_PURPLE, width=3)
    
    # Header inside card
    draw.text((135, box_y + 38), "TWINGENIE", font=f_black(38), fill=TEXT_WHITE)
    tg_bbox = draw.textbbox((135, box_y + 38), "TWINGENIE", font=f_black(38))
    draw.text((tg_bbox[2] + 20, box_y + 48), "• PERSONAL DIGITAL TWIN", font=f_bold(24), fill=CYAN_ACCENT)

    points = [
        "35-Question Big Five personality baseline",
        "4 perspectives: Normal, Reflective, Honest, Future",
        "Persistent semantic memory across conversations",
        "100% private, self-guided reflection"
    ]
    py = box_y + 115
    for pt in points:
        draw.ellipse([135, py + 2, 165, py + 32], fill=(45, 30, 95))
        draw.line([(135 + 8, py + 2 + 15), (135 + 14, py + 2 + 22), (135 + 23, py + 2 + 8)], fill=EMERALD_ACCENT, width=4)
        draw.text((185, py + 2), pt, font=f_bold(28), fill=TEXT_WHITE)
        py += 76

    # Rating strip inside card - perfectly centered with 5 gold stars
    star_strip_y = box_y + 455
    strip_x1, strip_x2 = 135, 865
    strip_w = strip_x2 - strip_x1
    draw.rounded_rectangle([strip_x1, star_strip_y, strip_x2, star_strip_y + 70], radius=18, fill=(28, 22, 58), outline=CARD_BORDER, width=2)
    
    r_font = f_bold(24)
    r_text = "5.0 Rating • Google Play Store • Free"
    t_bbox = draw.textbbox((0, 0), r_text, font=r_font)
    t_w = t_bbox[2] - t_bbox[0]
    stars_w = 5 * 26 + 4 * 8
    gap_stars_text = 18
    total_rating_content_w = stars_w + gap_stars_text + t_w
    start_x = strip_x1 + int((strip_w - total_rating_content_w) / 2)

    for s_idx in range(5):
        draw_star(draw, start_x + 13 + s_idx * 34, star_strip_y + 35, r_outer=12, r_inner=5.5, fill=AMBER_ACCENT)
    draw.text((start_x + stars_w + gap_stars_text, star_strip_y + 21), r_text, font=r_font, fill=AMBER_ACCENT)

    # CTA Button
    btn_y = box_y + box_h + 35
    btn_h = 135
    draw.rounded_rectangle([90, btn_y, 910, btn_y + btn_h], radius=32, fill=PURPLE_PRIMARY)
    btn_label = "Download on Google Play"
    b_bbox = draw.textbbox((0, 0), btn_label, font=f_black(38))
    b_w = b_bbox[2] - b_bbox[0]
    total_cta_w = 38 + 25 + b_w
    tri_x = int((1080 - total_cta_w) / 2)
    draw.polygon([(tri_x, btn_y + 48), (tri_x + 36, btn_y + 68), (tri_x, btn_y + 88)], fill=TEXT_WHITE)
    draw.text((tri_x + 60, btn_y + 46), btn_label, font=f_black(38), fill=TEXT_WHITE)

    # Trust Badges Bar
    trust_y = btn_y + btn_h + 30
    draw.text((130, trust_y), "• 100% PRIVATE & ENCRYPTED", font=f_bold(24), fill=TEXT_MUTED)
    draw.text((580, trust_y), "• INSTANT LOCAL BASELINE", font=f_bold(24), fill=CYAN_ACCENT)

    bottom_txt = "twingenie.app  •  Search \"TwinGenie\" on Google Play"
    bm_bbox = draw.textbbox((0, 0), bottom_txt, font=f_bold(25))
    bm_w = bm_bbox[2] - bm_bbox[0]
    bm_x = int((1080 - bm_w) / 2)
    draw.text((bm_x, trust_y + 44), bottom_txt, font=f_bold(25), fill=TEXT_WHITE)

    img.save(out_path, quality=98)

# SYNTHESIZE AMBIENT BACKGROUND MUSIC
def generate_ambient_audio(output_path, duration=36.0):
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
        subprocess.run(['say', '-v', 'Samantha', '-r', '175', text, '-o', aiff_tmp], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        subprocess.run(['ffmpeg', '-y', '-i', aiff_tmp, '-filter:a', 'volume=1.8', '-c:a', 'libmp3lame', '-b:a', '128k', out_mp3], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
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
    return 7.5

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

    # Accessible, conversational voiceover narration scripts (~18-20 words per slide for natural pacing)
    v1_default = "Did you know your AI chatbot always flatters you? It agrees with your excuses, but that trap stops your real growth."
    v2_default = "When you feel like quitting, a normal bot says: Great idea, take a break! It feels good, but delays your goals."
    v3_default = "TwinGenie is different. It remembers your conversations over time and speaks honestly, so you can break excuses and take action."
    v4_default = "Stop using chatbots that forget who you are. Meet your personal digital twin. Download TwinGenie free on Google Play today."

    v1_text = sanitize_text(spec.get('voiceHook', v1_default))
    v2_text = sanitize_text(spec.get('voiceProblem', v2_default))
    v3_text = sanitize_text(spec.get('voiceSolution', v3_default))
    v4_text = sanitize_text(spec.get('voiceCta', v4_default))

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

    # Calculate scene timings dynamically based on narration duration to guarantee ~34-36s total duration
    if has_voices and all(os.path.exists(f) for f in [v1_file, v2_file, v3_file, v4_file]):
        d1 = get_audio_duration(v1_file)
        d2 = get_audio_duration(v2_file)
        d3 = get_audio_duration(v3_file)
        d4 = get_audio_duration(v4_file)
    else:
        d1, d2, d3, d4 = 7.8, 8.0, 8.0, 8.5

    t1 = max(8.5, d1 + 0.8)
    t2 = max(8.5, d2 + 0.8)
    t3 = max(8.5, d3 + 0.8)
    t4 = max(9.0, d4 + 1.0)
    xfade = 0.6

    offset1 = t1 - xfade
    offset2 = offset1 + t2 - xfade
    offset3 = offset2 + t3 - xfade
    total_dur = offset3 + t4

    # Compile Voiceover Stream with precise scene offsets
    voice_track = os.path.join(temp_dir, 'voiceover_track.m4a')
    if has_voices and all(os.path.exists(f) for f in [v1_file, v2_file, v3_file, v4_file]):
        delay1 = int(250)
        delay2 = int((offset1 + 0.20) * 1000)
        delay3 = int((offset2 + 0.20) * 1000)
        delay4 = int((offset3 + 0.20) * 1000)

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
            '[a0][a1][a2][a3]amix=inputs=4:duration=longest:dropout_transition=0:normalize=0[vaout]',
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
        generate_ambient_audio(bg_music_file, duration=total_dur + 3.0)
        bg_source = bg_music_file

    # Mix Final Audio: Voiceover (1.20) + Ambient Ducked Music (0.10) with Broadcast Loudness Normalization (-14 LUFS)
    final_audio = os.path.join(temp_dir, 'final_soundtrack.m4a')
    if voice_track and os.path.exists(voice_track):
        mix_cmd = [
            'ffmpeg', '-y',
            '-i', voice_track,
            '-i', bg_source,
            '-filter_complex',
            f'[0:a]aformat=channel_layouts=stereo,volume=1.20[voice];'
            f'[1:a]aformat=channel_layouts=stereo,volume=0.10,aloop=loop=-1:size=2e+09,atrim=0:{total_dur},afade=t=out:st={total_dur - 1.5}:d=1.5[bg];'
            '[voice][bg]amix=inputs=2:duration=first:dropout_transition=2:normalize=0[mixed];'
            '[mixed]loudnorm=I=-14:TP=-1.5:LRA=11[aout]',
            '-map', '[aout]',
            '-c:a', 'aac', '-b:a', '192k', '-ar', '44100', '-ac', '2',
            final_audio
        ]
    else:
        mix_cmd = [
            'ffmpeg', '-y',
            '-i', bg_source,
            '-filter_complex',
            f'[0:a]volume=0.50,atrim=0:{total_dur},afade=t=out:st={total_dur - 1.5}:d=1.5[raw];'
            '[raw]loudnorm=I=-14:TP=-1.5:LRA=11[aout]',
            '-map', '[aout]',
            '-c:a', 'aac', '-b:a', '192k', '-ar', '44100', '-ac', '2',
            final_audio
        ]
    subprocess.run(mix_cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    # Continuous Ken Burns Motion Video Composition
    # Applying subtle zoompan drift across each scene guarantees continuous pixel motion vectors
    # across every frame, which prevents Meta's CVQE compression algorithm from downscaling to 720p/244kbps.
    n1 = int(t1 * 30)
    n2 = int(t2 * 30)
    n3 = int(t3 * 30)
    n4 = int(t4 * 30)

    filter_complex = (
        f"[0:v]zoompan=z='min(zoom+0.00025,1.06)':d={n1}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=30[z0];"
        f"[1:v]zoompan=z='min(zoom+0.00025,1.06)':d={n2}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=30[z1];"
        f"[2:v]zoompan=z='min(zoom+0.00025,1.06)':d={n3}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=30[z2];"
        f"[3:v]zoompan=z='min(zoom+0.00025,1.06)':d={n4}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=30[z3];"
        f"[z0][z1]xfade=transition=fade:duration={xfade}:offset={offset1:.2f}[v01];"
        f"[v01][z2]xfade=transition=fade:duration={xfade}:offset={offset2:.2f}[v02];"
        f"[v02][z3]xfade=transition=fade:duration={xfade}:offset={offset3:.2f}[v]"
    )

    cmd = [
        'ffmpeg', '-y',
        '-loop', '1', '-t', str(t1), '-i', s1,
        '-loop', '1', '-t', str(t2), '-i', s2,
        '-loop', '1', '-t', str(t3), '-i', s3,
        '-loop', '1', '-t', str(t4), '-i', s4,
        '-i', final_audio,
        '-filter_complex', filter_complex,
        '-map', '[v]',
        '-map', '4:a',
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-profile:v', 'high',
        '-level', '4.2',
        '-color_primaries', 'bt709',
        '-color_trc', 'bt709',
        '-colorspace', 'bt709',
        '-color_range', 'tv',
        '-g', '60',
        '-keyint_min', '60',
        '-sc_threshold', '0',
        '-b:v', '6M',
        '-maxrate', '8M',
        '-bufsize', '10M',
        '-pix_fmt', 'yuv420p',
        '-c:a', 'aac',
        '-b:a', '192k',
        '-ar', '44100',
        '-ac', '2',
        '-r', '30',
        '-t', str(total_dur),
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
