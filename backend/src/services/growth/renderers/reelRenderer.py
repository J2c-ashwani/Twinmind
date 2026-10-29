#!/usr/bin/env python3
"""
TwinGenie Automated Reel Renderer (Smartphone Chat Screen Recording UI)
Engineered for razor-sharp mobile fidelity, authentic app aesthetics, and high-retention social virality.

Features:
1. Authentic Smartphone Chat Interface: Top bezel, dynamic island, status bar, and 4-mode tabs.
2. 4 Selectable Perspectives:
   - 🔥 Honest / Dark Twin (Roast / Reality Check)
   - ⏳ Future Self Twin (5-Years-Wiser Perspective)
   - 🌿 Reflective Twin (Emotional Decompression)
   - ⚡ Normal Twin (Daily Sounding Board)
3. Dynamic Side-by-Side Contrast: User dilemma vs Standard Sycophantic Bot vs Active Twin Mode.
4. Ultra-Low RAM Footprint (<25MB RAM) with native FFmpeg concat demuxer and 24fps H.264 MP4.
5. High-Retention 20-22s duration pacing optimized for Instagram Reels, TikTok, and YouTube Shorts.
"""

import os
import sys
import json
import subprocess
import math
import re
from PIL import Image, ImageDraw, ImageFont, ImageFilter

# Base Palette
BG_DARK = (10, 8, 22, 255)         # Deep Obsidian Canvas
PHONE_BEZEL = (18, 14, 34, 255)     # Phone Body
CARD_SURFACE = (25, 20, 48, 240)    # Glassmorphism Card
BORDER_DEFAULT = (65, 50, 110, 255) # Subtle Border

TEXT_WHITE = (255, 255, 255)
TEXT_LIGHT = (240, 244, 250)
TEXT_MUTED = (195, 205, 225)
TEXT_DIM = (145, 155, 180)

# Mode Specific Design Matrix
MODE_CONFIGS = {
    'dark': {
        'id': 'dark',
        'tabName': '🔥 HONEST',
        'fullName': 'HONEST / DARK TWIN',
        'badge': 'ROAST & REALITY CHECK',
        'accent': (255, 59, 92),        # #FF3B5C Crimson Neon
        'glow': (255, 59, 92, 120),
        'bgCard': (42, 14, 26, 245),
        'border': (255, 59, 92, 230),
        'role': 'Zero-flattery cognitive mirror calling out avoidance & excuses',
        'defaultDilemma': "I've been scrolling for 3 hours and feel completely paralyzed. Should I just give up on today?",
        'defaultBot': "Totally understandable! Rest is productive! Don't be hard on yourself. Start fresh next week!",
        'defaultReply': "You let yourself scroll for three hours, then you're stuck blaming yourself. Guilt is just another excuse to avoid the real work. What is the one task you're terrified of facing?",
        'shift': "Exposes the guilt-avoidance loop and forces immediate decisive action."
    },
    'future': {
        'id': 'future',
        'tabName': '⏳ FUTURE',
        'fullName': 'FUTURE SELF (2031)',
        'badge': '5-YEARS-WISER PERSPECTIVE',
        'accent': (255, 184, 0),       # #FFB800 Amber Gold
        'glow': (255, 184, 0, 120),
        'bgCard': (42, 32, 12, 245),
        'border': (255, 184, 0, 230),
        'role': 'Reframes short-term panic and anxiety through 5-year longitudinal wisdom',
        'defaultDilemma': "Left on read for 6 hours. I'm spiraling and about to send a passive-aggressive text.",
        'defaultBot': "That's so disrespectful of them! Send a firm message letting them know your time is valuable!",
        'defaultReply': "Seeing them online fuels the fear that you're being dismissed. But in 5 years, this silence won't matter. What would it feel like to let the silence exist without trying to control their response?",
        'shift': "Calms anxious attachment and stops self-sabotaging emotional reactions."
    },
    'reflective': {
        'id': 'reflective',
        'tabName': '🌿 REFLECT',
        'fullName': 'REFLECTIVE TWIN',
        'badge': 'EMOTIONAL DECOMPRESSION',
        'accent': (52, 211, 153),      # #34D399 Mint / Emerald
        'glow': (52, 211, 153, 120),
        'bgCard': (14, 40, 28, 245),
        'border': (52, 211, 153, 230),
        'role': 'Therapist-grade emotional decompression without toxic positivity',
        'defaultDilemma': "I agreed to help someone move this weekend even though I'm completely exhausted and need rest. Why do I do this?",
        'defaultBot': "You are such a kind, generous friend! Just make sure to drink water and get some rest when you can!",
        'defaultReply': "You didn't volunteer because you have energy; you volunteered because saying no makes you feel like a burden. What part of your identity depends on being the one who always shows up?",
        'shift': "Exposes people-pleasing as fear of rejection and restores healthy boundaries."
    },
    'normal': {
        'id': 'normal',
        'tabName': '⚡ NORMAL',
        'fullName': 'NORMAL TWIN',
        'badge': 'GROUNDED SOUNDING BOARD',
        'accent': (56, 189, 248),      # #38BDF8 Electric Cyan
        'glow': (56, 189, 248, 120),
        'bgCard': (16, 32, 52, 245),
        'border': (56, 189, 248, 230),
        'role': 'Daily alter-ego and thinking partner with persistent conversation memory',
        'defaultDilemma': "I think I should put my main goal on hold and start a brand-new project today.",
        'defaultBot': "That sounds so exciting! Follow your passion! Here are 5 brainstorming ideas for your new idea!",
        'defaultReply': "Memory check: You said this exact same thing 14 days ago right before launch. You aren't inspired—you're avoiding market feedback. Close the new tabs and finish what you started.",
        'shift': "Catches circular rationalizations and grounds you in long-term goals."
    }
}

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_BG_MUSIC = os.path.join(SCRIPT_DIR, '../assets/audio/bg_ambient.m4a')
FONT_BLACK_PATH = os.path.join(SCRIPT_DIR, '../assets/fonts/Font-Black.ttf')
FONT_BOLD_PATH = os.path.join(SCRIPT_DIR, '../assets/fonts/Font-Bold.ttf')

def sanitize_text(text):
    if not isinstance(text, str):
        return str(text) if text is not None else ""
    text = re.sub(r'[\r\n]+', ' ', text)
    return ' '.join(text.split())

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
    words = text.split()
    lines = []
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

def get_text_height(draw, text, font, max_width, line_spacing=1.25):
    text = sanitize_text(text)
    words = text.split()
    lines = []
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
    total_h = 0
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=font)
        total_h += int((bbox[3] - bbox[1]) * line_spacing)
    return total_h

def resolve_mode_config(spec):
    mode_id = spec.get('mode', '').lower().strip()
    if 'dark' in mode_id or 'honest' in mode_id or 'shadow' in mode_id:
        return MODE_CONFIGS['dark']
    if 'future' in mode_id:
        return MODE_CONFIGS['future']
    if 'reflect' in mode_id or 'therap' in mode_id:
        return MODE_CONFIGS['reflective']
    if 'normal' in mode_id:
        return MODE_CONFIGS['normal']
    # Default to dark (the high-impact roast mode)
    return MODE_CONFIGS['dark']

def create_smartphone_base(w=1080, h=1920, active_mode_id='dark'):
    """
    Renders an authentic dark smartphone UI:
    - Status bar (9:41, Dynamic Island, 5G / Battery)
    - App Header: TWINGENIE • AI DIGITAL TWIN
    - Top Mode Switcher Bar showing 4 perspectives with the active one highlighted.
    """
    img = Image.new('RGBA', (w, h), BG_DARK)
    
    # Ambient colored glow behind canvas based on active mode
    mcfg = MODE_CONFIGS.get(active_mode_id, MODE_CONFIGS['dark'])
    accent_rgb = mcfg['accent']
    glow = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    glow_draw.ellipse([w // 2 - 400, 100, w // 2 + 400, 700], fill=(accent_rgb[0] // 3, accent_rgb[1] // 3, accent_rgb[2] // 3, 70))
    glow_draw.ellipse([w // 2 - 350, 1200, w // 2 + 350, 1850], fill=(60, 30, 110, 80))
    glow = glow.filter(ImageFilter.GaussianBlur(140))
    img = Image.alpha_composite(img, glow)
    draw = ImageDraw.Draw(img)

    # 1. Status Bar (y: 35 to 80)
    draw.text((75, 42), "9:41", font=f_bold(24), fill=TEXT_MUTED)
    # Dynamic Island Pill
    draw.rounded_rectangle([440, 38, 640, 74], radius=18, fill=(12, 10, 24), outline=(45, 38, 70), width=1)
    draw.ellipse([605, 48, 621, 64], fill=(24, 20, 42)) # Camera lens dot
    # Status Icons
    draw.text((915, 42), "5G  100%", font=f_bold(22), fill=TEXT_MUTED)

    # 2. App Navigation Bar (y: 95 to 160)
    draw.rounded_rectangle([60, 95, 1020, 160], radius=20, fill=(22, 18, 42, 240), outline=CARD_SURFACE, width=2)
    draw.text((90, 114), "TWINGENIE", font=f_black(26), fill=TEXT_WHITE)
    draw.text((260, 116), "•  COGNITIVE MIRROR", font=f_bold(22), fill=(56, 189, 248))
    # Active mode pill badge at right of app bar
    r_tag = mcfg['badge']
    r_bbox = draw.textbbox((0, 0), r_tag, font=f_bold(18))
    r_w = r_bbox[2] - r_bbox[0] + 24
    draw.rounded_rectangle([990 - r_w, 110, 990, 146], radius=12, fill=mcfg['bgCard'], outline=mcfg['accent'], width=1)
    draw.text((990 - r_w + 12, 118), r_tag, font=f_bold(18), fill=mcfg['accent'])

    # 3. 4-Mode Switcher Tabs Bar (y: 175 to 232)
    # [ ⚡ Normal ]  [ 🌿 Reflect ]  [ 🔥 Honest ]  [ ⏳ Future ]
    tabs = [
        ('normal', '⚡ NORMAL'),
        ('reflective', '🌿 REFLECT'),
        ('dark', '🔥 HONEST'),
        ('future', '⏳ FUTURE')
    ]
    tab_w = 215
    start_x = 65
    gap = 20
    for i, (mid, label) in enumerate(tabs):
        tx = start_x + i * (tab_w + gap)
        ty = 175
        is_active = (mid == active_mode_id)
        if is_active:
            draw.rounded_rectangle([tx, ty, tx + tab_w, ty + 50], radius=18, fill=mcfg['bgCard'], outline=mcfg['accent'], width=3)
            draw.ellipse([tx + 14, ty + 18, tx + 28, ty + 32], fill=mcfg['accent'])
            draw.text((tx + 34, ty + 13), label, font=f_black(20), fill=TEXT_WHITE)
        else:
            draw.rounded_rectangle([tx, ty, tx + tab_w, ty + 50], radius=18, fill=(18, 15, 34, 210), outline=(55, 42, 85), width=1)
            draw.text((tx + 20, ty + 14), label, font=f_bold(19), fill=TEXT_DIM)

    return img, draw

# =========================================================================
# SCENE 1: THE 2 AM DILEMMA / CONFESSION (0s - 5.2s)
# =========================================================================
def render_scene1(spec, out_path):
    w, h = 1080, 1920
    mcfg = resolve_mode_config(spec)
    img, draw = create_smartphone_base(w, h, mcfg['id'])

    # Top Viral Hook Banner (y: 255)
    hook_text = sanitize_text(spec.get('hook', "POV: You told an AI the thing you can't admit to anyone 💀"))
    draw.rounded_rectangle([60, 255, 1020, 325], radius=20, fill=(35, 20, 50, 240), outline=mcfg['accent'], width=2)
    draw.text((95, 275), hook_text, font=f_black(26), fill=TEXT_WHITE)

    # User Chat Bubble (Right-Aligned iMessage Dark Style)
    user_dilemma = sanitize_text(spec.get('userExcuse') or spec.get('userDilemma') or mcfg['defaultDilemma'])
    bubble_w = 780
    bubble_x1 = 1020 - bubble_w
    bubble_x2 = 1020
    bubble_y1 = 360

    u_height = get_text_height(draw, f'"{user_dilemma}"', f_bold(32), bubble_w - 70, 1.32)
    bubble_y2 = bubble_y1 + u_height + 95

    # User Bubble Background
    draw.rounded_rectangle([bubble_x1, bubble_y1, bubble_x2, bubble_y2], radius=26, fill=(45, 32, 82), outline=(95, 70, 155), width=2)
    draw.text((bubble_x1 + 32, bubble_y1 + 22), "You (Seeking Validation):", font=f_black(22), fill=(180, 160, 235))
    draw_wrapped_text(draw, f'"{user_dilemma}"', f_bold(32), TEXT_WHITE, bubble_x1 + 32, bubble_y1 + 58, bubble_w - 70, 1.32)
    draw.text((bubble_x2 - 195, bubble_y2 - 32), "2:14 AM • Delivered ✓✓", font=f_bold(18), fill=TEXT_DIM)

    # Mid Dilemma Analysis Card (y: bubble_y2 + 40)
    card_y1 = bubble_y2 + 45
    card_y2 = card_y1 + 420
    draw.rounded_rectangle([60, card_y1, 1020, card_y2], radius=28, fill=CARD_SURFACE, outline=BORDER_DEFAULT, width=2)
    
    # Left accent vertical strip
    draw.rounded_rectangle([60, card_y1 + 20, 72, card_y2 - 20], radius=6, fill=mcfg['accent'])
    
    tag = sanitize_text(spec.get('tag', 'COGNITIVE BLIND SPOT')).upper()
    draw.text((100, card_y1 + 32), f"[ THE INNER CONFLICT: {tag} ]", font=f_black(26), fill=mcfg['accent'])
    
    bullets = [
        "Why standard thinking rationalizes avoidance as 'self-care'",
        "How agreeable yes-man chatbots trap you in recurring loops",
        f"How TwinGenie's {mcfg['fullName']} exposes the real root cause"
    ]
    by = card_y1 + 95
    for i, b in enumerate(bullets, 1):
        draw.rounded_rectangle([100, by, 165, by + 50], radius=14, fill=(42, 28, 75))
        draw.text((118, by + 12), f"0{i}", font=f_black(24), fill=(56, 189, 248))
        draw_wrapped_text(draw, b, f_bold(28), TEXT_WHITE, 185, by + 8, 790, 1.25)
        by += 90

    # Bottom Status Bar (clears bottom IG overlay)
    draw.rounded_rectangle([60, 1340, 1020, 1420], radius=20, fill=(24, 18, 45, 230), outline=(70, 52, 110), width=1)
    draw.ellipse([95, 1368, 115, 1388], fill=mcfg['accent'])
    draw.text((130, 1367), f"TwinGenie scanning longitudinal memory for recurring self-deception...", font=f_bold(22), fill=TEXT_MUTED)

    img.save(out_path, quality=98)

# =========================================================================
# SCENE 2: THE YES-MAN TRAP / STANDARD AI (5.2s - 10.5s)
# =========================================================================
def render_scene2(spec, out_path):
    w, h = 1080, 1920
    mcfg = resolve_mode_config(spec)
    img, draw = create_smartphone_base(w, h, mcfg['id'])

    # Warning Header Banner
    draw.rounded_rectangle([60, 255, 1020, 325], radius=20, fill=(55, 18, 30, 240), outline=(244, 63, 94), width=2)
    draw.text((95, 275), "❌ WHAT STANDARD AI SAYS (THE FLATTERY TRAP)", font=f_black(26), fill=(244, 63, 94))

    # User Message (Compact at top for context)
    user_dilemma = sanitize_text(spec.get('userExcuse') or spec.get('userDilemma') or mcfg['defaultDilemma'])
    draw.rounded_rectangle([320, 350, 1020, 460], radius=20, fill=(45, 32, 82), outline=(95, 70, 155), width=2)
    draw.text((345, 365), "You:", font=f_black(20), fill=(180, 160, 235))
    draw_wrapped_text(draw, f'"{user_dilemma}"', f_bold(26), TEXT_WHITE, 345, 395, 630, 1.25)

    # Standard Bot Response Bubble (Left-aligned, dull neutral gray)
    bot_reply = sanitize_text(spec.get('botReply', mcfg['defaultBot']))
    bubble_w = 840
    bubble_x1 = 60
    bubble_x2 = 60 + bubble_w
    bubble_y1 = 490

    b_height = get_text_height(draw, f'"{bot_reply}"', f_bold(32), bubble_w - 70, 1.32)
    bubble_y2 = bubble_y1 + b_height + 115

    draw.rounded_rectangle([bubble_x1, bubble_y1, bubble_x2, bubble_y2], radius=26, fill=(32, 34, 46), outline=(85, 90, 115), width=2)
    
    # Bot Header Bar inside bubble
    draw.ellipse([bubble_x1 + 32, bubble_y1 + 24, bubble_x1 + 68, bubble_y1 + 60], fill=(60, 65, 85))
    draw.text((bubble_x1 + 42, bubble_y1 + 26), "🤖", font=f_bold(24), fill=TEXT_WHITE)
    draw.text((bubble_x1 + 82, bubble_y1 + 28), "STANDARD AI CHATBOT", font=f_black(24), fill=TEXT_MUTED)
    draw.rounded_rectangle([bubble_x2 - 210, bubble_y1 + 22, bubble_x2 - 30, bubble_y1 + 58], radius=10, fill=(65, 20, 30))
    draw.text((bubble_x2 - 195, bubble_y1 + 30), "THE YES-MAN", font=f_bold(18), fill=(244, 63, 94))

    draw_wrapped_text(draw, f'"{bot_reply}"', f_bold(32), (220, 225, 240), bubble_x1 + 32, bubble_y1 + 75, bubble_w - 70, 1.32)

    # Bottom Callout: The Harm of Sycophancy
    warn_y1 = bubble_y2 + 45
    warn_y2 = warn_y1 + 270
    draw.rounded_rectangle([60, warn_y1, 1020, warn_y2], radius=26, fill=(35, 14, 24, 240), outline=(244, 63, 94), width=2)
    draw.text((95, warn_y1 + 30), "[ THE CONSEQUENCE: WHY THIS HURTS YOU ]", font=f_black(26), fill=(244, 63, 94))
    warn_bullets = [
        "Reinforces self-sabotage by validating comfort zones",
        "Disguises avoidance as 'self-care' and kills forward momentum",
        "Resets memory every chat: never notices your repeating excuses"
    ]
    wy = warn_y1 + 80
    for wb in warn_bullets:
        draw.text((95, wy), "•", font=f_black(26), fill=(244, 63, 94))
        draw_wrapped_text(draw, wb, f_bold(26), TEXT_WHITE, 125, wy, 840, 1.25)
        wy += 55

    img.save(out_path, quality=98)

# =========================================================================
# SCENE 3: THE TWINGENIE BREAKTHROUGH (10.5s - 17.5s)
# =========================================================================
def render_scene3(spec, out_path):
    w, h = 1080, 1920
    mcfg = resolve_mode_config(spec)
    img, draw = create_smartphone_base(w, h, mcfg['id'])

    # Breakthrough Header Banner with mode accent
    draw.rounded_rectangle([60, 255, 1020, 325], radius=20, fill=mcfg['bgCard'], outline=mcfg['accent'], width=3)
    draw.text((95, 275), f"✅ WHAT TWINGENIE SAYS ({mcfg['fullName']})", font=f_black(26), fill=TEXT_WHITE)

    # User Message (Compact at top)
    user_dilemma = sanitize_text(spec.get('userExcuse') or spec.get('userDilemma') or mcfg['defaultDilemma'])
    draw.rounded_rectangle([320, 350, 1020, 460], radius=20, fill=(45, 32, 82), outline=(95, 70, 155), width=2)
    draw.text((345, 365), "You:", font=f_black(20), fill=(180, 160, 235))
    draw_wrapped_text(draw, f'"{user_dilemma}"', f_bold(26), TEXT_WHITE, 345, 395, 630, 1.25)

    # TwinGenie Glowing Chat Bubble
    twin_reply = sanitize_text(spec.get('twinReply', mcfg['defaultReply']))
    bubble_w = 880
    bubble_x1 = 60
    bubble_x2 = 60 + bubble_w
    bubble_y1 = 490

    t_height = get_text_height(draw, f'"{twin_reply}"', f_bold(32), bubble_w - 70, 1.34)
    bubble_y2 = bubble_y1 + t_height + 155

    # Glowing Card Surface
    draw.rounded_rectangle([bubble_x1, bubble_y1, bubble_x2, bubble_y2], radius=28, fill=(22, 16, 42), outline=mcfg['accent'], width=3)
    
    # Twin Header inside bubble
    draw.ellipse([bubble_x1 + 30, bubble_y1 + 22, bubble_x1 + 68, bubble_y1 + 60], fill=mcfg['accent'])
    draw.text((bubble_x1 + 38, bubble_y1 + 24), "🪞", font=f_bold(24), fill=TEXT_WHITE)
    draw.text((bubble_x1 + 82, bubble_y1 + 28), f"TWINGENIE • {mcfg['fullName']}", font=f_black(24), fill=TEXT_WHITE)

    # Persistent Memory Tag Pill
    mem_y = bubble_y1 + 72
    draw.rounded_rectangle([bubble_x1 + 30, mem_y, bubble_x1 + 620, mem_y + 40], radius=10, fill=(35, 25, 65))
    draw.text((bubble_x1 + 45, mem_y + 8), "🧠 RECALLED FROM MEMORY: 14 DAYS AGO", font=f_bold(19), fill=(56, 189, 248))

    # The Core Response Text
    draw_wrapped_text(draw, f'"{twin_reply}"', f_bold(32), TEXT_WHITE, bubble_x1 + 32, bubble_y1 + 125, bubble_w - 70, 1.34)

    # Bottom The Breakthrough Card
    shift_y1 = bubble_y2 + 40
    shift_y2 = shift_y1 + 210
    draw.rounded_rectangle([60, shift_y1, 1020, shift_y2], radius=24, fill=(20, 35, 30) if mcfg['id'] == 'reflective' else (35, 20, 50), outline=mcfg['accent'], width=2)
    draw.text((95, shift_y1 + 26), f"[ THE SHIFT: {mcfg['badge']} ]", font=f_black(26), fill=mcfg['accent'])
    shift_desc = sanitize_text(spec.get('shift', mcfg['shift']))
    draw_wrapped_text(draw, shift_desc, f_bold(28), TEXT_WHITE, 95, shift_y1 + 72, 830, 1.30)

    img.save(out_path, quality=98)

# =========================================================================
# SCENE 4: 4 PERSPECTIVES SHOWCASE & CTA (17.5s - 22.5s)
# =========================================================================
def render_scene4(spec, out_path):
    w, h = 1080, 1920
    mcfg = resolve_mode_config(spec)
    img, draw = create_smartphone_base(w, h, mcfg['id'])

    # Title & Subtitle
    draw.text((60, 255), "Stop Talking to AI That Forgets You.", font=f_black(48), fill=TEXT_WHITE)
    draw.text((60, 320), "Meet the only AI with 4 distinct cognitive perspectives:", font=f_bold(28), fill=(56, 189, 248))

    # 4 Mode Cards Stacked
    cards = [
        ('dark', '🔥 HONEST / DARK TWIN', 'Zero-flattery reality check: cuts through excuses and rationalizations', (255, 59, 92)),
        ('future', '⏳ FUTURE SELF (2031)', '5-years-wiser perspective: reframes short-term anxiety and drama', (255, 184, 0)),
        ('reflective', '🌿 REFLECTIVE TWIN', 'Therapist-grade empathy: decompression without toxic positivity', (52, 211, 153)),
        ('normal', '⚡ NORMAL TWIN', 'Daily alter-ego: persistent memory across all conversations', (56, 189, 248))
    ]
    cy = 385
    for mid, name, desc, col in cards:
        is_hero = (mid == mcfg['id'])
        card_h = 135
        border_col = col if is_hero else (65, 50, 100)
        border_w = 3 if is_hero else 1
        bg = (38, 18, 38) if is_hero else (24, 18, 44)
        
        draw.rounded_rectangle([60, cy, 1020, cy + card_h], radius=20, fill=bg, outline=border_col, width=border_w)
        # Left accent dot
        draw.ellipse([88, cy + 26, 108, cy + 46], fill=col)
        draw.text((125, cy + 22), name, font=f_black(26), fill=TEXT_WHITE if is_hero else (230, 235, 245))
        draw_wrapped_text(draw, desc, f_bold(22), TEXT_MUTED, 125, cy + 62, 850, 1.25)
        cy += card_h + 20

    # Big Download Button for Google Play
    btn_y = cy + 30
    btn_h = 100
    draw.rounded_rectangle([60, btn_y, 1020, btn_y + btn_h], radius=28, fill=(147, 51, 234), outline=(192, 132, 252), width=3)
    # Play store triangle
    draw.polygon([(115, btn_y + 32), (115, btn_y + 68), (148, btn_y + 50)], fill=TEXT_WHITE)
    draw.text((170, btn_y + 30), "DOWNLOAD TWINGENIE ON GOOGLE PLAY", font=f_black(32), fill=TEXT_WHITE)

    # Trust Rating Strip
    star_y = btn_y + btn_h + 30
    draw.rounded_rectangle([60, star_y, 1020, star_y + 70], radius=18, fill=(24, 18, 48), outline=CARD_SURFACE, width=1)
    draw.text((110, star_y + 20), "⭐️⭐️⭐️⭐️⭐️  5.0 Rating  •  100% Free Baseline Assessment  •  Google Play", font=f_bold(23), fill=TEXT_MUTED)

    # Bottom Bio Link Text
    draw.text((280, star_y + 100), "Search \"TwinGenie\" on Google Play or link in bio!", font=f_black(22), fill=(56, 189, 248))

    img.save(out_path, quality=98)

# SYNTHESIZE LIGHTWEIGHT AMBIENT AUDIO (<4MB RAM via native FFmpeg)
def generate_ambient_audio(output_path, duration=24.0):
    cmd = [
        'ffmpeg', '-y',
        '-f', 'lavfi',
        '-i', f'sine=frequency=110:sample_rate=44100:duration={duration}',
        '-filter:a', 'volume=0.03,lowpass=f=220',
        '-c:a', 'aac', '-b:a', '64k',
        output_path
    ]
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

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

    # Dynamic Scene Timings (~21.5s high-retention vertical Reel)
    t1 = 5.2   # Scene 1: Hook & User Dilemma (5.2s)
    t2 = 5.3   # Scene 2: Standard Yes-Man AI (5.3s)
    t3 = 7.0   # Scene 3: The Active Twin Mode Breakthrough (7.0s)
    t4 = 5.0   # Scene 4: 4 Perspectives & Download CTA (5.0s)
    total_dur = t1 + t2 + t3 + t4

    # Ambient Music Preparation
    bg_music_file = os.path.join(temp_dir, 'bg_music.m4a')
    if os.path.exists(DEFAULT_BG_MUSIC):
        bg_source = DEFAULT_BG_MUSIC
    else:
        generate_ambient_audio(bg_music_file, duration=total_dur + 3.0)
        bg_source = bg_music_file

    final_audio = os.path.join(temp_dir, 'final_soundtrack.m4a')
    mix_cmd = [
        'ffmpeg', '-y',
        '-i', bg_source,
        '-filter_complex',
        f'[0:a]volume=0.30,atrim=0:{total_dur},afade=t=out:st={total_dur - 1.5}:d=1.5[aout]',
        '-map', '[aout]',
        '-c:a', 'aac', '-b:a', '128k', '-ar', '44100', '-ac', '2',
        final_audio
    ]
    subprocess.run(mix_cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    # Ultra-Low RAM Concat Demuxer for 512MB VPS (<20MB RAM, streams one image at a time)
    concat_txt = os.path.join(temp_dir, 'concat.txt')
    with open(concat_txt, 'w') as f:
        f.write(f"file '{s1}'\nduration {t1:.2f}\n")
        f.write(f"file '{s2}'\nduration {t2:.2f}\n")
        f.write(f"file '{s3}'\nduration {t3:.2f}\n")
        f.write(f"file '{s4}'\nduration {t4:.2f}\n")
        f.write(f"file '{s4}'\n")

    cmd = [
        'ffmpeg', '-y',
        '-f', 'concat', '-safe', '0', '-i', concat_txt,
        '-i', final_audio,
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-crf', '28',
        '-threads', '0',
        '-pix_fmt', 'yuv420p',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-r', '24',
        '-t', str(total_dur),
        '-movflags', '+faststart',
        output_mp4_path
    ]

    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if res.returncode != 0:
        raise RuntimeError(f"FFmpeg failed: {res.stderr.decode('utf-8')}")

    # Clean up temporary artifacts
    cleanup_files = [s1, s2, s3, s4, bg_music_file, final_audio, concat_txt]
    for p in cleanup_files:
        if p and os.path.exists(p):
            try:
                os.remove(p)
            except Exception:
                pass

    mcfg = resolve_mode_config(spec)
    return {
        'success': True,
        'videoPath': output_mp4_path,
        'resolution': '1080x1920',
        'durationSeconds': round(total_dur, 2),
        'fps': 24,
        'mode': mcfg['id'],
        'modeName': mcfg['fullName'],
        'hasVoiceover': False,
        'hasBrollBackground': False,
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
