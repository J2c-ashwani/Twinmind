#!/usr/bin/env python3
"""
TwinGenie Automated Reel Renderer (Smartphone Chat Screen Recording UI v3)
Engineered for razor-sharp mobile fidelity, authentic app aesthetics, zero-void vertical layout,
and synchronized neural voiceover narration.

Fixes applied:
1. Zero-Void Vertical Distribution: Content comfortably fills the full vertical canvas (y: 260 to 1680)
   with large, readable typography (40-44pt punchlines) specifically calibrated for Instagram Reels.
2. Synchronized Neural Voiceover: Uses edge-tts (+20% rate) to narrate user dilemma, yes-man bot trap,
   and TwinGenie breakthrough with automatic duration synchronization, mixed over chill ambient synth.
3. Mode-Specific Identity: Replaced generic "memory recall" tags with dedicated mode identities
   (Unfiltered Reality Check, 5-Years-Wiser Perspective, Emotional Decompression, Grounded Alter-Ego).
4. Zero-Glyph-Failure Vector Engine: Golden polygon stars, vector double checkmarks, brand monograms,
   and native mobile chat input bars with zero missing font box artifacts.
"""

import os
import sys
import json
import subprocess
import math
import re
import wave
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
    'lifecoach': {
        'id': 'lifecoach',
        'tabName': 'COACH',
        'fullName': 'LIFE COACH (7-DAY RESET)',
        'badge': 'GUIDED 7-DAY PROGRAMS',
        'modeTag': 'STRUCTURED LIFE COACHING',
        'accent': (168, 85, 247),       # #A855F7 Electric Purple
        'glow': (168, 85, 247, 120),
        'bgCard': (32, 14, 48, 245),
        'border': (168, 85, 247, 230),
        'role': 'Multi-day guided transformation programs with structured daily exercises',
        'defaultDilemma': "I have so much career anxiety that I'm completely frozen and dread starting each morning.",
        'defaultBot': "Everything happens for a reason! Just believe in yourself and make a 10-step plan to stay positive!",
        'defaultReply': "Motivational quotes don't heal anxiety; daily structured action does. I've enrolled you in Day 1 of the 7-Day Anxiety Reset. Your only task today is a 2-minute trigger audit. Ready?",
        'shift': "Replaces ChatGPT's generic 10-point lists with structured day-by-day coaching.",
        'trapInsight': "ChatGPT gives textbook advice you never execute; life coaches enforce momentum.",
        'actionInsight': "Day 1: 2-minute trigger audit to identify root cause before taking action.",
        'breakthroughInsight': "Transforms morning paralysis into disciplined, step-by-step clarity.",
        'splitFlawTag': "❌ THE AMNESIA TRAP",
        'splitFlawDesc': "Resets memory every chat. Forgets your goals tomorrow.",
        'splitFlawDetail': "• Spits out 10 textbook bullet points with ZERO day-by-day follow-up.",
        'splitVerdictLeft': "Tells you what feels comfortable, not what you need to do.",
        'splitEdgeTag': "✅ 7-DAY GUIDED ACTION",
        'splitEdgeDesc': "Enrolled in Day 1 of Anxiety Reset. Daily exercises, not walls of text.",
        'splitMemTag': "🧠 PERSISTENT MEMORY",
        'splitMemDesc': "Connects recurring patterns across weeks to prevent repeating avoidance cycles.",
        'splitVerdictRight': "Structured daily transformation.",
        'voiceVoice': 'en-US-ChristopherNeural'
    },
    'dark': {
        'id': 'dark',
        'tabName': 'HONEST',
        'fullName': 'HONEST / DARK TWIN',
        'badge': 'ROAST & REALITY CHECK',
        'modeTag': 'UNFILTERED REALITY CHECK',
        'accent': (255, 59, 92),        # #FF3B5C Crimson Neon
        'glow': (255, 59, 92, 120),
        'bgCard': (42, 14, 26, 245),
        'border': (255, 59, 92, 230),
        'role': 'Zero-flattery cognitive mirror calling out avoidance & excuses',
        'defaultDilemma': "I've been scrolling for 3 hours and feel completely paralyzed. Should I just give up on today?",
        'defaultBot': "Totally understandable! Rest is productive! Don't be hard on yourself. Start fresh next week!",
        'defaultReply': "You let yourself scroll for three hours, then you're stuck blaming yourself. Guilt is just another excuse to avoid the real work. What is the one task you're terrified of facing?",
        'shift': "Exposes the guilt-avoidance loop and forces immediate decisive action.",
        'trapInsight': "Guilt is sophisticated avoidance pretending to be remorse.",
        'actionInsight': "Face the single hardest friction task for 5 minutes right now.",
        'breakthroughInsight': "Breaks the paralysis spiral before it steals another day.",
        'splitFlawTag': "❌ THE YES-MAN TRAP",
        'splitFlawDesc': "Agrees with every excuse and calls scrolling 'productive rest'.",
        'splitFlawDetail': "• Validates your comfort zone and lets you delay the real work.",
        'splitVerdictLeft': "Enables self-sabotage under the disguise of toxic flattery.",
        'splitEdgeTag': "🔥 UNFILTERED ROAST",
        'splitEdgeDesc': "Cuts through rationalizations using your own words from 2 weeks ago.",
        'splitMemTag': "🧠 MEMORY ACCOUNTABILITY",
        'splitMemDesc': "Remembers you used this exact excuse 14 days ago. Zero flattery.",
        'splitVerdictRight': "Brutal reality check that breaks procrastination.",
        'voiceVoice': 'en-US-ChristopherNeural'
    },
    'future': {
        'id': 'future',
        'tabName': 'FUTURE',
        'fullName': 'FUTURE SELF (2031)',
        'badge': '5-YEARS-WISER PERSPECTIVE',
        'modeTag': '5-YEARS-WISER PERSPECTIVE',
        'accent': (255, 184, 0),       # #FFB800 Amber Gold
        'glow': (255, 184, 0, 120),
        'bgCard': (42, 32, 12, 245),
        'border': (255, 184, 0, 230),
        'role': 'Reframes short-term panic and anxiety through 5-year longitudinal wisdom',
        'defaultDilemma': "Left on read for 6 hours. I'm spiraling and about to send a passive-aggressive text.",
        'defaultBot': "That's so disrespectful of them! Send a firm message letting them know your time is valuable!",
        'defaultReply': "Seeing them online fuels the fear that you're being dismissed. But in 5 years, this silence won't matter. What would it feel like to let the silence exist without trying to control their response?",
        'shift': "Calms anxious attachment and stops self-sabotaging emotional reactions.",
        'trapInsight': "Anxious spiraling tries to force certainty where none exists.",
        'actionInsight': "Allow the silence to exist without reacting. Guard your peace.",
        'breakthroughInsight': "Transforms reactive insecurity into grounded emotional sovereignty.",
        'splitFlawTag': "❌ REACTIVE SPIRALING",
        'splitFlawDesc': "Fuels panic over temporary drama and 6-hour message delays.",
        'splitFlawDetail': "• Tells you to send aggressive texts and feeds reactive spirals.",
        'splitVerdictLeft': "Locks you into short-term reactive panic loops.",
        'splitEdgeTag': "⏳ 5-YEARS-WISER PERSPECTIVE",
        'splitEdgeDesc': "Reframes dilemmas through 2031 longitudinal wisdom.",
        'splitMemTag': "🧠 EMOTIONAL SOVEREIGNTY",
        'splitMemDesc': "Grounds your nervous system so you let silence exist without fear.",
        'splitVerdictRight': "Calms anxious attachment and restores inner peace.",
        'voiceVoice': 'en-US-ChristopherNeural'
    },
    'reflective': {
        'id': 'reflective',
        'tabName': 'REFLECT',
        'fullName': 'REFLECTIVE TWIN',
        'badge': 'EMOTIONAL DECOMPRESSION',
        'modeTag': 'EMOTIONAL DECOMPRESSION',
        'accent': (52, 211, 153),      # #34D399 Mint / Emerald
        'glow': (52, 211, 153, 120),
        'bgCard': (14, 40, 28, 245),
        'border': (52, 211, 153, 230),
        'role': 'Therapist-grade emotional decompression without toxic positivity',
        'defaultDilemma': "I agreed to help someone move this weekend even though I'm completely exhausted and need rest. Why do I do this?",
        'defaultBot': "You are such a kind, generous friend! Just make sure to drink water and get some rest when you can!",
        'defaultReply': "You didn't volunteer because you have energy; you volunteered because saying no makes you feel like a burden. What part of your identity depends on being the one who always shows up?",
        'shift': "Exposes people-pleasing as fear of rejection and restores healthy boundaries.",
        'trapInsight': "People-pleasing is self-abandonment disguised as kindness.",
        'actionInsight': "Rest does not need to be earned. Practice saying no without guilt.",
        'breakthroughInsight': "Replaces compulsive approval-seeking with authentic self-trust.",
        'splitFlawTag': "❌ TOXIC POSITIVITY",
        'splitFlawDesc': "Praises you for helping others while ignoring severe burnout.",
        'splitFlawDetail': "• 'You are such a kind friend!' validates chronic people-pleasing.",
        'splitVerdictLeft': "Encourages self-abandonment disguised as kindness.",
        'splitEdgeTag': "🌿 THERAPIST-GRADE EMPATHY",
        'splitEdgeDesc': "Uncovers why saying no makes you feel like an emotional burden.",
        'splitMemTag': "🧠 COMPASSIONATE INQUIRY",
        'splitMemDesc': "Teaches that rest does not have to be earned through exhaustion.",
        'splitVerdictRight': "Replaces approval-seeking with authentic self-trust.",
        'voiceVoice': 'en-US-ChristopherNeural'
    },
    'normal': {
        'id': 'normal',
        'tabName': 'NORMAL',
        'fullName': 'NORMAL TWIN',
        'badge': 'GROUNDED SOUNDING BOARD',
        'modeTag': 'GROUNDED ALTER-EGO',
        'accent': (56, 189, 248),      # #38BDF8 Electric Cyan
        'glow': (56, 189, 248, 120),
        'bgCard': (16, 32, 52, 245),
        'border': (56, 189, 248, 230),
        'role': 'Daily alter-ego and thinking partner with persistent conversation memory',
        'defaultDilemma': "I think I should put my main goal on hold and start a brand-new project today.",
        'defaultBot': "That sounds so exciting! Follow your passion! Here are 5 brainstorming ideas for your new idea!",
        'defaultReply': "Memory check: You said this exact same thing 14 days ago right before launch. You aren't inspired—you're avoiding market feedback. Close the new tabs and finish what you started.",
        'shift': "Catches circular rationalizations and grounds you in long-term goals.",
        'trapInsight': "Starting over is often just avoiding the discomfort of completion.",
        'actionInsight': "Close the new brainstorming tabs and finish your existing milestone.",
        'breakthroughInsight': "Prevents novelty addiction by holding you accountable to your commitments.",
        'splitFlawTag': "❌ STATELESS AMNESIA",
        'splitFlawDesc': "Blank slate every chat. Forgets everything you built yesterday.",
        'splitFlawDetail': "• Gives you 5 new ideas for shiny projects to abandon your real goal.",
        'splitVerdictLeft': "Feeds novelty addiction and restarts the loop every morning.",
        'splitEdgeTag': "🧠 CONTINUOUS MEMORY GRAPH",
        'splitEdgeDesc': "Flags that you abandoned the last launch at this exact step 14 days ago.",
        'splitMemTag': "🎯 GROUNDED EXECUTION",
        'splitMemDesc': "Keeps you accountable to finishing existing milestones before starting new ones.",
        'splitVerdictRight': "Longitudinal memory that ensures real project completion.",
        'voiceVoice': 'en-US-ChristopherNeural'
    }
}

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_BG_MUSIC = os.path.join(SCRIPT_DIR, '../assets/audio/bg_ambient.m4a')
FONT_BLACK_PATH = os.path.join(SCRIPT_DIR, '../assets/fonts/Font-Black.ttf')
FONT_BOLD_PATH = os.path.join(SCRIPT_DIR, '../assets/fonts/Font-Bold.ttf')

def sanitize_text(text):
    if not isinstance(text, str):
        return str(text) if text is not None else ""
    emoji_pattern = re.compile(
        "[\U00010000-\U0010ffff]|[\u2600-\u27bf]|[\u2300-\u23ff]|[\u2b50-\u2b55]",
        flags=re.UNICODE
    )
    cleaned = emoji_pattern.sub('', text)
    cleaned = (cleaned.replace('★', '')
                      .replace('⭐', '')
                      .replace('⚡', '')
                      .replace('🌿', '')
                      .replace('🔥', '')
                      .replace('⏳', '')
                      .replace('💀', '')
                      .replace('❌', '')
                      .replace('✓', '')
                      .replace('✔', '')
                      .replace('🪞', '')
                      .replace('🧠', '')
                      .replace('🤖', '')
                      .replace('✅', '')
                      .replace('📲', ''))
    cleaned = re.sub(r'[\r\n]+', ' ', cleaned)
    return ' '.join(cleaned.split())

def f_black(size):
    if os.path.exists(FONT_BLACK_PATH):
        try: return ImageFont.truetype(FONT_BLACK_PATH, size)
        except Exception: pass
    font_paths = ['/System/Library/Fonts/Supplemental/Arial Black.ttf', '/System/Library/Fonts/Supplemental/Arial Bold.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf']
    for p in font_paths:
        if os.path.exists(p):
            try: return ImageFont.truetype(p, size)
            except Exception: pass
    return ImageFont.load_default()

def f_bold(size):
    if os.path.exists(FONT_BOLD_PATH):
        try: return ImageFont.truetype(FONT_BOLD_PATH, size)
        except Exception: pass
    font_paths = ['/System/Library/Fonts/Supplemental/Arial Bold.ttf', '/Library/Fonts/Arial.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf']
    for p in font_paths:
        if os.path.exists(p):
            try: return ImageFont.truetype(p, size)
            except Exception: pass
    return ImageFont.load_default()

def draw_wrapped_text(draw, text, font, fill, x, y, max_width, line_spacing=1.30):
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
            if current_line: lines.append(' '.join(current_line))
            current_line = [word]
    if current_line: lines.append(' '.join(current_line))
    cur_y = y
    for line in lines:
        draw.text((x, cur_y), line, font=font, fill=fill)
        bbox = draw.textbbox((0, 0), line, font=font)
        cur_y += int((bbox[3] - bbox[1]) * line_spacing)
    return cur_y

def get_text_height(draw, text, font, max_width, line_spacing=1.30):
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
            if current_line: lines.append(' '.join(current_line))
            current_line = [word]
    if current_line: lines.append(' '.join(current_line))
    total_h = 0
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=font)
        total_h += int((bbox[3] - bbox[1]) * line_spacing)
    return total_h

# =========================================================================
# VECTOR GEOMETRY DRAWING HELPERS
# =========================================================================

def draw_star(draw, cx, cy, radius=15, fill=(255, 195, 0)):
    points = []
    inner_radius = radius * 0.42
    for i in range(10):
        r = radius if i % 2 == 0 else inner_radius
        angle = math.pi / 2 + i * math.pi / 5
        x = cx + r * math.cos(angle)
        y = cy - r * math.sin(angle)
        points.append((x, y))
    draw.polygon(points, fill=fill)

def draw_vector_checkmark(draw, cx, cy, size=20, color=(56, 189, 248), width=3):
    p1 = (cx + int(size * 0.15), cy + int(size * 0.55))
    p2 = (cx + int(size * 0.45), cy + int(size * 0.85))
    p3 = (cx + int(size * 0.90), cy + int(size * 0.20))
    draw.line([p1, p2, p3], fill=color, width=width)

def draw_double_checkmarks(draw, x, y, size=15, color=(56, 189, 248), width=2):
    draw_vector_checkmark(draw, x, y, size=size, color=color, width=width)
    draw_vector_checkmark(draw, x + 8, y, size=size, color=color, width=width)

def draw_avatar_badge(draw, cx, cy, radius, text, bg_color, border_color=(255, 255, 255), text_color=(255, 255, 255)):
    draw.ellipse([cx - radius, cy - radius, cx + radius, cy + radius], fill=bg_color, outline=border_color, width=2)
    font_sz = max(16, int(radius * 1.05))
    f = f_black(font_sz)
    bbox = draw.textbbox((0, 0), text, font=f)
    tx = cx - (bbox[2] - bbox[0]) // 2
    ty = cy - (bbox[3] - bbox[1]) // 2 - 2
    draw.text((tx, ty), text, font=f, fill=text_color)

def draw_smartphone_bottom_input(draw, w, h, mcfg, status_text=None):
    """
    Renders an authentic smartphone bottom message input bar positioned cleanly at y: 1600 to 1690
    (comfortably above the 220px Instagram Reels overlay safe zone).
    """
    bar_y1 = 1600
    bar_y2 = 1690
    draw.rounded_rectangle([60, bar_y1, 1020, bar_y2], radius=28, fill=(24, 18, 42, 245), outline=(75, 58, 110), width=2)
    placeholder = f"Message {mcfg['fullName']}..."
    draw.text((105, bar_y1 + 26), placeholder, font=f_bold(26), fill=TEXT_DIM)
    
    mic_cx = 905
    mic_cy = (bar_y1 + bar_y2) // 2
    draw.ellipse([mic_cx - 20, mic_cy - 20, mic_cx + 20, mic_cy + 20], fill=(38, 30, 62))
    draw.rounded_rectangle([mic_cx - 4, mic_cy - 11, mic_cx + 4, mic_cy + 5], radius=3, fill=TEXT_MUTED)
    draw.arc([mic_cx - 9, mic_cy - 7, mic_cx + 9, mic_cy + 7], 0, 180, fill=TEXT_MUTED, width=2)
    draw.line([mic_cx, mic_cy + 7, mic_cx, mic_cy + 13], fill=TEXT_MUTED, width=2)

    send_cx = 970
    send_cy = (bar_y1 + bar_y2) // 2
    draw.ellipse([send_cx - 22, send_cy - 22, send_cx + 22, send_cy + 22], fill=mcfg['accent'])
    draw.polygon([
        (send_cx - 8, send_cy - 10),
        (send_cx + 9, send_cy),
        (send_cx - 8, send_cy + 10),
        (send_cx - 4, send_cy)
    ], fill=TEXT_WHITE)

    if status_text:
        draw.rounded_rectangle([60, bar_y1 - 70, 1020, bar_y1 - 15], radius=18, fill=(20, 15, 36, 235), outline=(60, 46, 92), width=1)
        draw.ellipse([95, bar_y1 - 47, 109, bar_y1 - 33], fill=mcfg['accent'])
        draw.text((125, bar_y1 - 50), status_text, font=f_bold(22), fill=TEXT_MUTED)

def resolve_mode_config(spec):
    mode_id = spec.get('mode', '').lower().strip()
    if 'coach' in mode_id or 'life' in mode_id:
        return MODE_CONFIGS['lifecoach']
    if 'dark' in mode_id or 'honest' in mode_id or 'shadow' in mode_id:
        return MODE_CONFIGS['dark']
    if 'future' in mode_id:
        return MODE_CONFIGS['future']
    if 'reflect' in mode_id or 'therap' in mode_id:
        return MODE_CONFIGS['reflective']
    if 'normal' in mode_id:
        return MODE_CONFIGS['normal']
    return MODE_CONFIGS['dark']

def create_smartphone_base(w=1080, h=1920, active_mode_id='dark'):
    img = Image.new('RGBA', (w, h), BG_DARK)
    mcfg = MODE_CONFIGS.get(active_mode_id, MODE_CONFIGS['dark'])
    accent = mcfg['accent']
    glow = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    glow_draw.ellipse([w // 2 - 400, 100, w // 2 + 400, 800], fill=(accent[0]//3, accent[1]//3, accent[2]//3, 85))
    glow_draw.ellipse([w // 2 - 350, 1100, w // 2 + 350, 1850], fill=(60, 30, 110, 85))
    glow = glow.filter(ImageFilter.GaussianBlur(140))
    img = Image.alpha_composite(img, glow)
    draw = ImageDraw.Draw(img)

    # 1. Status Bar (y: 35 to 80)
    draw.text((75, 42), "9:41", font=f_bold(26), fill=TEXT_MUTED)
    draw.rounded_rectangle([440, 38, 640, 74], radius=18, fill=(12, 10, 24), outline=(45, 38, 70), width=1)
    draw.ellipse([605, 48, 621, 64], fill=(24, 20, 42))
    draw.text((915, 42), "5G  100%", font=f_bold(24), fill=TEXT_MUTED)

    # 2. App Navigation Bar (y: 95 to 165)
    draw.rounded_rectangle([60, 95, 1020, 165], radius=22, fill=(22, 18, 42, 240), outline=CARD_SURFACE, width=2)
    draw.text((90, 116), "TWINGENIE", font=f_black(28), fill=TEXT_WHITE)
    draw.text((275, 118), "•  COGNITIVE MIRROR", font=f_bold(24), fill=(56, 189, 248))
    
    r_tag = mcfg['badge']
    r_bbox = draw.textbbox((0, 0), r_tag, font=f_bold(20))
    r_w = r_bbox[2] - r_bbox[0] + 28
    draw.rounded_rectangle([990 - r_w, 110, 990, 150], radius=14, fill=mcfg['bgCard'], outline=mcfg['accent'], width=2)
    draw.text((990 - r_w + 14, 118), r_tag, font=f_bold(20), fill=mcfg['accent'])

    # 3. 4-Mode Switcher Tabs Bar (y: 180 to 234)
    if active_mode_id == 'lifecoach':
        tabs = [
            ('normal', 'NORMAL', (56, 189, 248)),
            ('dark', 'HONEST', (255, 59, 92)),
            ('future', 'FUTURE', (255, 184, 0)),
            ('lifecoach', 'COACH', (168, 85, 247))
        ]
    else:
        tabs = [
            ('normal', 'NORMAL', (56, 189, 248)),
            ('reflective', 'REFLECT', (52, 211, 153)),
            ('dark', 'HONEST', (255, 59, 92)),
            ('future', 'FUTURE', (255, 184, 0))
        ]
    tab_w = 215
    start_x = 65
    gap = 20
    for i, (mid, label, t_col) in enumerate(tabs):
        tx = start_x + i * (tab_w + gap)
        ty = 180
        is_active = (mid == active_mode_id)
        if is_active:
            draw.rounded_rectangle([tx, ty, tx + tab_w, ty + 54], radius=18, fill=mcfg['bgCard'], outline=mcfg['accent'], width=3)
            draw.ellipse([tx + 18, ty + 20, tx + 32, ty + 34], fill=mcfg['accent'])
            draw.text((tx + 40, ty + 14), label, font=f_black(22), fill=TEXT_WHITE)
        else:
            draw.rounded_rectangle([tx, ty, tx + tab_w, ty + 54], radius=18, fill=(18, 15, 34, 210), outline=(55, 42, 85), width=1)
            draw.ellipse([tx + 18, ty + 22, tx + 28, ty + 32], fill=(t_col[0] // 2, t_col[1] // 2, t_col[2] // 2))
            draw.text((tx + 36, ty + 15), label, font=f_bold(20), fill=TEXT_DIM)

    return img, draw

# =========================================================================
# SCENE 1: THE 2 AM DILEMMA / USER CONFESSION
# =========================================================================
def render_scene1(spec, out_path):
    w, h = 1080, 1920
    mcfg = resolve_mode_config(spec)
    img, draw = create_smartphone_base(w, h, mcfg['id'])

    # Top Viral Hook Banner (y: 260 to 345)
    raw_hook = spec.get('hook', "POV: You told an AI the thing you can't admit to anyone")
    hook_text = sanitize_text(raw_hook)
    draw.rounded_rectangle([60, 260, 1020, 345], radius=22, fill=(38, 20, 52, 240), outline=mcfg['accent'], width=2)
    draw.text((95, 282), hook_text, font=f_black(28), fill=TEXT_WHITE)

    # User Chat Bubble (Right-Aligned iMessage Dark Style, w=840)
    user_dilemma = sanitize_text(spec.get('userExcuse') or spec.get('userDilemma') or mcfg['defaultDilemma'])
    bubble_w = 840
    bubble_x1 = 1020 - bubble_w
    bubble_x2 = 1020
    bubble_y1 = 375

    u_height = get_text_height(draw, f'"{user_dilemma}"', f_bold(38), bubble_w - 80, 1.32)
    bubble_y2 = bubble_y1 + u_height + 110

    draw.rounded_rectangle([bubble_x1, bubble_y1, bubble_x2, bubble_y2], radius=28, fill=(46, 32, 88), outline=(98, 72, 165), width=2)
    draw.text((bubble_x1 + 36, bubble_y1 + 24), "You (Seeking Validation):", font=f_black(24), fill=(185, 165, 245))
    draw_wrapped_text(draw, f'"{user_dilemma}"', f_bold(38), TEXT_WHITE, bubble_x1 + 36, bubble_y1 + 64, bubble_w - 80, 1.32)
    
    draw.text((bubble_x2 - 225, bubble_y2 - 34), "2:14 AM • Delivered", font=f_bold(20), fill=TEXT_DIM)
    draw_double_checkmarks(draw, bubble_x2 - 40, bubble_y2 - 30, size=15, color=(56, 189, 248), width=2)

    # Dilemma Deep-Dive Card (y: bubble_y2 + 30 down to 1350)
    card_y1 = bubble_y2 + 30
    card_y2 = 1350
    draw.rounded_rectangle([60, card_y1, 1020, card_y2], radius=30, fill=CARD_SURFACE, outline=BORDER_DEFAULT, width=2)
    draw.rounded_rectangle([60, card_y1 + 22, 74, card_y2 - 22], radius=7, fill=mcfg['accent'])
    
    tag = sanitize_text(spec.get('tag', 'COGNITIVE BLIND SPOT')).upper()
    draw.text((105, card_y1 + 30), f"[ THE INNER CONFLICT: {tag} ]", font=f_black(28), fill=mcfg['accent'])
    
    # Callout quote
    quote_y = card_y1 + 78
    draw.rounded_rectangle([105, quote_y, 980, quote_y + 80], radius=16, fill=(35, 25, 60))
    draw.text((130, quote_y + 24), "Avoidance loops disguise fear of failure as physical fatigue.", font=f_bold(26), fill=(240, 244, 250))

    bullets = [
        ("01", "Why standard thinking rationalizes avoidance as 'self-care'"),
        ("02", "How agreeable yes-man chatbots trap you in recurring loops"),
        ("03", f"How TwinGenie's {mcfg['fullName']} exposes the root cause")
    ]
    by = quote_y + 102
    for num, b in bullets:
        draw.rounded_rectangle([105, by, 180, by + 68], radius=16, fill=(48, 32, 92), outline=(95, 70, 160), width=1)
        draw.text((124, by + 18), num, font=f_black(28), fill=(56, 189, 248))
        draw_wrapped_text(draw, b, f_bold(32), TEXT_WHITE, 200, by + 10, 775, 1.25)
        by += 96

    # Pattern Recognition Callout
    draw.rounded_rectangle([105, by + 8, 980, by + 76], radius=16, fill=(28, 20, 50), outline=(75, 55, 110), width=1)
    draw.text((130, by + 26), "Core Pattern: 3-Stage loop of hesitation, rationalization, and remorse.", font=f_bold(24), fill=(185, 195, 220))

    # Mode Teaser Activation Banner (y: 1375 to 1515)
    draw.rounded_rectangle([60, 1375, 1020, 1515], radius=24, fill=(35, 18, 42), outline=mcfg['accent'], width=2)
    draw.text((95, 1400), f"[ TWINGENIE {mcfg['fullName']} ACTIVATED ]", font=f_black(26), fill=mcfg['accent'])
    draw.text((95, 1450), "Shifting from flattering validation to honest cognitive reflection...", font=f_bold(26), fill=TEXT_LIGHT)

    # Bottom Smartphone Input Bar (y: 1600 to 1690)
    draw_smartphone_bottom_input(draw, w, h, mcfg, f"{mcfg['fullName']}: Active sounding board analyzing cognitive blind spot")

    img.save(out_path, quality=98)

# =========================================================================
# SCENE 2 VARIANT A: LEFT / RIGHT DUAL-COLUMN SPLIT SCREEN (CHATGPT VS TWINGENIE)
# =========================================================================
def render_left_right_split(spec, out_path):
    w, h = 1080, 1920
    mcfg = resolve_mode_config(spec)
    img, draw = create_smartphone_base(w, h, mcfg["id"])

    # Header Banner (y: 260 to 330)
    draw.rounded_rectangle([60, 260, 1020, 330], radius=18, fill=(30, 20, 48), outline=mcfg["accent"], width=2)
    draw.text((85, 278), "⚔️  HEAD-TO-HEAD COMPARISON", font=f_black(26), fill=TEXT_WHITE)
    draw.rounded_rectangle([800, 274, 995, 316], radius=10, fill=mcfg["bgCard"])
    draw.text((818, 282), "DUAL COLUMN", font=f_bold(18), fill=mcfg["accent"])

    # Shared User Dilemma at Top (y: 345 to 455)
    user_text = sanitize_text(spec.get("userExcuse") or spec.get("userDilemma") or mcfg["defaultDilemma"])
    draw.rounded_rectangle([60, 345, 1020, 455], radius=20, fill=(35, 28, 60), outline=(80, 65, 120), width=2)
    draw.text((90, 360), "You (Asking Both AIs The Same Question):", font=f_black(20), fill=(185, 165, 245))
    draw_wrapped_text(draw, f'"{user_text}"', f_bold(24), TEXT_WHITE, 90, 390, 900, 1.25)

    # TWO COLUMNS:
    # Left Column: x: 60 to 520 (width: 460px)
    # Right Column: x: 560 to 1020 (width: 460px)
    col_y1 = 475
    col_y2 = 1530

    # 1. LEFT COLUMN: CHATGPT
    lx1, lx2 = 60, 520
    draw.rounded_rectangle([lx1, col_y1, lx2, col_y2], radius=24, fill=(24, 30, 36), outline=(16, 163, 127), width=2)

    # ChatGPT Header
    draw_avatar_badge(draw, lx1 + 45, col_y1 + 42, radius=20, text="GPT", bg_color=(16, 163, 127), border_color=(52, 211, 153))
    draw.text((lx1 + 80, col_y1 + 30), "CHATGPT", font=f_black(24), fill=(52, 211, 153))
    draw.rounded_rectangle([lx2 - 130, col_y1 + 25, lx2 - 20, col_y1 + 60], radius=8, fill=(70, 22, 34))
    draw.text((lx2 - 120, col_y1 + 33), "YES-MAN", font=f_bold(16), fill=(244, 63, 94))

    # ChatGPT Response Bubble
    bot_reply = sanitize_text(spec.get("botReply") or mcfg["defaultBot"])
    draw.rounded_rectangle([lx1 + 20, col_y1 + 80, lx2 - 20, col_y1 + 460], radius=16, fill=(32, 40, 48), outline=(45, 55, 65), width=1)
    draw.text((lx1 + 35, col_y1 + 95), "ChatGPT Output:", font=f_bold(18), fill=(16, 163, 127))
    draw_wrapped_text(draw, f'"{bot_reply}"', f_bold(26), (230, 235, 250), lx1 + 35, col_y1 + 130, 390, 1.28)

    # ChatGPT Flaw Cards
    flaws = [
        (mcfg.get("splitFlawTag", "❌ THE YES-MAN TRAP"), mcfg.get("splitFlawDesc", "Resets memory every chat. Forgets your goals tomorrow.")),
        ("❌ GENERIC ESSAYS", "10 textbook bullet points you will never execute."),
        ("❌ ZERO ACCOUNTABILITY", "No follow-up. Validates your comfortable excuses.")
    ]
    fy = col_y1 + 480
    for title, desc in flaws:
        draw.rounded_rectangle([lx1 + 20, fy, lx2 - 20, fy + 140], radius=14, fill=(45, 20, 28), outline=(85, 25, 38), width=1)
        draw.text((lx1 + 35, fy + 14), title, font=f_black(18), fill=(244, 63, 94))
        draw_wrapped_text(draw, desc, f_bold(18), TEXT_LIGHT, lx1 + 35, fy + 48, 390, 1.24)
        fy += 155

    # Verdict Box Left
    draw.rounded_rectangle([lx1 + 20, col_y2 - 95, lx2 - 20, col_y2 - 20], radius=12, fill=(38, 22, 28))
    draw.text((lx1 + 35, col_y2 - 82), "VERDICT:", font=f_black(16), fill=(244, 63, 94))
    draw_wrapped_text(draw, mcfg.get("splitVerdictLeft", "Feels good in the moment, solves nothing."), f_bold(18), (255, 200, 210), lx1 + 35, col_y2 - 58, 390, 1.2)

    # 2. RIGHT COLUMN: TWINGENIE
    rx1, rx2 = 560, 1020
    draw.rounded_rectangle([rx1, col_y1, rx2, col_y2], radius=24, fill=mcfg["bgCard"], outline=mcfg["accent"], width=3)

    # TwinGenie Header
    draw_avatar_badge(draw, rx1 + 45, col_y1 + 42, radius=20, text="TG", bg_color=mcfg["bgCard"][:3], border_color=mcfg["accent"])
    draw.text((rx1 + 80, col_y1 + 30), "TWINGENIE", font=f_black(24), fill=TEXT_WHITE)
    draw.rounded_rectangle([rx2 - 145, col_y1 + 25, rx2 - 20, col_y1 + 60], radius=8, fill=(50, 24, 75))
    badge_label = "LIFE COACH" if "coach" in mcfg["id"] else f"{mcfg['tabName']} TWIN"
    draw.text((rx2 - 135, col_y1 + 33), badge_label, font=f_bold(16), fill=mcfg["accent"])

    # TwinGenie Response Bubble
    twin_reply = sanitize_text(spec.get("twinReply") or mcfg["defaultReply"])
    draw.rounded_rectangle([rx1 + 20, col_y1 + 80, rx2 - 20, col_y1 + 460], radius=16, fill=(20, 12, 34), outline=mcfg["accent"], width=1)
    draw.text((rx1 + 35, col_y1 + 95), "TwinGenie Action:", font=f_bold(18), fill=mcfg["accent"])
    draw_wrapped_text(draw, f'"{twin_reply}"', f_bold(26), TEXT_WHITE, rx1 + 35, col_y1 + 130, 390, 1.28)

    # TwinGenie Advantage Cards
    strengths = [
        (mcfg.get("splitEdgeTag", "✅ STRUCTURED ACTION"), mcfg.get("splitEdgeDesc", "Enrolled in Day 1 of reset. Daily exercises, not theory.")),
        (mcfg.get("splitMemTag", "🧠 PERSISTENT MEMORY"), mcfg.get("splitMemDesc", "Tracks recurring patterns across weeks and months.")),
        ("🎯 REAL ACCOUNTABILITY", "Reflects your stated goals when you start stalling.")
    ]
    sy = col_y1 + 480
    for title, desc in strengths:
        draw.rounded_rectangle([rx1 + 20, sy, rx2 - 20, sy + 140], radius=14, fill=(22, 38, 42), outline=(35, 90, 80), width=1)
        draw.text((rx1 + 35, sy + 14), title, font=f_black(18), fill=(52, 211, 153))
        draw_wrapped_text(draw, desc, f_bold(18), TEXT_LIGHT, rx1 + 35, sy + 48, 390, 1.24)
        sy += 155

    # Verdict Box Right
    draw.rounded_rectangle([rx1 + 20, col_y2 - 95, rx2 - 20, col_y2 - 20], radius=12, fill=(25, 45, 38))
    draw.text((rx1 + 35, col_y2 - 82), "VERDICT:", font=f_black(16), fill=(52, 211, 153))
    draw_wrapped_text(draw, mcfg.get("splitVerdictRight", "Structured daily transformation."), f_bold(18), (180, 255, 220), rx1 + 35, col_y2 - 58, 390, 1.2)

    # 3. CENTER FLOATING VS PILL (y: 950 to 1050)
    vs_cy = 990
    draw.rounded_rectangle([515, vs_cy - 45, 565, vs_cy + 45], radius=25, fill=(15, 12, 24), outline=(255, 255, 255), width=3)
    draw.text((524, vs_cy - 16), "VS", font=f_black(24), fill=TEXT_WHITE)

    # Smartphone input bar
    draw_smartphone_bottom_input(draw, w, h, mcfg, "TwinGenie: Grounded reflection active with persistent memory.")
    img.save(out_path, quality=98)

# =========================================================================
# SCENE 2 VARIANT B: TOP / BOTTOM STACKED SPLIT SCREEN (CHATGPT VS TWINGENIE)
# =========================================================================
def render_top_bottom_split(spec, out_path):
    w, h = 1080, 1920
    mcfg = resolve_mode_config(spec)
    img, draw = create_smartphone_base(w, h, mcfg["id"])
    full_name = mcfg["fullName"]
    if "coach" in mcfg["id"]:
        badge_label = "7-DAY RESET"
    elif "dark" in mcfg["id"]:
        badge_label = "ROAST MODE"
    elif "future" in mcfg["id"]:
        badge_label = "FUTURE (2031)"
    elif "reflect" in mcfg["id"]:
        badge_label = "THERAPY TWIN"
    elif "normal" in mcfg["id"]:
        badge_label = "GROUNDED TWIN"
    else:
        badge_label = mcfg.get("tabName", "TWIN") + " MODE"

    # Header Banner (y: 260 to 330)
    draw.rounded_rectangle([60, 260, 1020, 330], radius=18, fill=(30, 20, 48), outline=mcfg["accent"], width=2)
    draw.text((85, 278), "⚔️  HEAD-TO-HEAD: CHATGPT VS TWINGENIE", font=f_black(26), fill=TEXT_WHITE)
    draw.rounded_rectangle([820, 274, 995, 316], radius=10, fill=mcfg["bgCard"])
    draw.text((838, 282), "HORIZONTAL", font=f_bold(18), fill=mcfg["accent"])

    # User Prompt Card (Shared context: y: 345 to 455)
    user_text = sanitize_text(spec.get("userExcuse") or spec.get("userDilemma") or mcfg["defaultDilemma"])
    draw.rounded_rectangle([60, 345, 1020, 455], radius=20, fill=(35, 28, 60), outline=(80, 65, 120), width=2)
    draw.text((90, 360), "You (Asking For Guidance):", font=f_black(20), fill=(185, 165, 245))
    draw_wrapped_text(draw, f'"{user_text}"', f_bold(24), TEXT_WHITE, 90, 390, 900, 1.25)

    # TOP SECTION: CHATGPT (THE YES-MAN) (y: 470 to 950)
    top_y1, top_y2 = 470, 950
    draw.rounded_rectangle([60, top_y1, 1020, top_y2], radius=24, fill=(24, 30, 36), outline=(16, 163, 127), width=2)

    # Top Header
    draw_avatar_badge(draw, 105, top_y1 + 42, radius=22, text="GPT", bg_color=(16, 163, 127), border_color=(52, 211, 153))
    draw.text((142, top_y1 + 28), "CHATGPT (OPENAI)", font=f_black(26), fill=(52, 211, 153))
    draw.rounded_rectangle([810, top_y1 + 22, 990, top_y1 + 62], radius=10, fill=(70, 22, 34))
    draw.text((830, top_y1 + 31), "THE YES-MAN", font=f_bold(20), fill=(244, 63, 94))

    # ChatGPT Content Box
    bot_reply = sanitize_text(spec.get("botReply") or mcfg["defaultBot"])
    draw.rounded_rectangle([90, top_y1 + 80, 990, top_y1 + 270], radius=18, fill=(32, 40, 48), outline=(45, 55, 65), width=1)
    draw.text((115, top_y1 + 95), "ChatGPT Output (Polite Validation):", font=f_bold(20), fill=(16, 163, 127))
    draw_wrapped_text(draw, f'"{bot_reply}"', f_bold(32), (230, 235, 250), 115, top_y1 + 130, 850, 1.28)

    # ChatGPT Flaw Card (Stacked hierarchy - zero collision!)
    draw.rounded_rectangle([90, top_y1 + 285, 990, top_y1 + 375], radius=14, fill=(45, 20, 28), outline=(95, 30, 45), width=1)
    draw.text((115, top_y1 + 296), mcfg.get("splitFlawTag", "❌ THE YES-MAN TRAP"), font=f_black(20), fill=(244, 63, 94))
    flaw_full = mcfg.get("splitFlawDesc", "") + " " + mcfg.get("splitFlawDetail", "")
    draw_wrapped_text(draw, flaw_full, f_bold(20), TEXT_LIGHT, 115, top_y1 + 328, 850, 1.22)

    top_y1_bottom = top_y1 + 390
    draw.rounded_rectangle([90, top_y1_bottom, 990, top_y1_bottom + 65], radius=12, fill=(38, 22, 28))
    draw.text((115, top_y1_bottom + 14), "VERDICT: " + mcfg.get("splitVerdictLeft", "Tells you what feels comfortable."), font=f_bold(20), fill=(255, 180, 190))

    # CENTRAL VS BADGE DIVIDER (y: 960 to 1025)
    divider_y = 992
    draw.line([(60, divider_y), (480, divider_y)], fill=(120, 90, 180), width=3)
    draw.line([(600, divider_y), (1020, divider_y)], fill=(120, 90, 180), width=3)
    
    for rad, alpha_col in [(52, (80, 30, 110)), (44, (140, 50, 200)), (36, (20, 15, 30))]:
        draw.ellipse([540 - rad, divider_y - rad, 540 + rad, divider_y + rad], fill=alpha_col)
    draw.ellipse([540 - 36, divider_y - 36, 540 + 36, divider_y + 36], outline=(255, 255, 255), width=3)
    draw.text((516, divider_y - 18), "VS", font=f_black(32), fill=TEXT_WHITE)

    # BOTTOM SECTION: TWINGENIE (y: 1040 to 1540)
    bot_y1, bot_y2 = 1040, 1540
    draw.rounded_rectangle([60, bot_y1, 1020, bot_y2], radius=24, fill=mcfg["bgCard"], outline=mcfg["accent"], width=3)

    # Bottom Header
    draw_avatar_badge(draw, 105, bot_y1 + 42, radius=22, text="TG", bg_color=mcfg["bgCard"][:3], border_color=mcfg["accent"])
    draw.text((142, bot_y1 + 28), "TWINGENIE • " + full_name, font=f_black(26), fill=TEXT_WHITE)
    draw.rounded_rectangle([790, bot_y1 + 22, 990, bot_y1 + 62], radius=10, fill=(50, 24, 75))
    draw.text((810, bot_y1 + 31), badge_label, font=f_bold(18), fill=mcfg["accent"])

    # TwinGenie Content Box
    twin_reply = sanitize_text(spec.get("twinReply") or mcfg["defaultReply"])
    draw.rounded_rectangle([90, bot_y1 + 80, 990, bot_y1 + 280], radius=18, fill=(20, 12, 34), outline=mcfg["accent"], width=1)
    draw.text((115, bot_y1 + 95), "TwinGenie Direct Action:", font=f_bold(20), fill=mcfg["accent"])
    draw_wrapped_text(draw, f'"{twin_reply}"', f_bold(32), TEXT_WHITE, 115, bot_y1 + 130, 850, 1.28)

    # TwinGenie Advantage Card 1 (Stacked hierarchy - zero collision!)
    draw.rounded_rectangle([90, bot_y1 + 295, 990, bot_y1 + 390], radius=14, fill=(20, 40, 32), outline=(40, 120, 90), width=1)
    draw.text((115, bot_y1 + 306), mcfg.get("splitEdgeTag", "✅ ACTIVE ACCOUNTABILITY"), font=f_black(20), fill=(52, 211, 153))
    draw_wrapped_text(draw, mcfg.get("splitEdgeDesc", ""), f_bold(20), TEXT_WHITE, 115, bot_y1 + 338, 850, 1.22)

    # TwinGenie Advantage Card 2 (Stacked hierarchy - zero collision!)
    bot_y1_mem = bot_y1 + 405
    draw.rounded_rectangle([90, bot_y1_mem, 990, bot_y1_mem + 80], radius=14, fill=(22, 32, 54), outline=(45, 75, 120), width=1)
    draw.text((115, bot_y1_mem + 12), mcfg.get("splitMemTag", "🧠 PERSISTENT MEMORY"), font=f_black(20), fill=(56, 189, 248))
    draw_wrapped_text(draw, mcfg.get("splitMemDesc", ""), f_bold(20), TEXT_WHITE, 115, bot_y1_mem + 40, 850, 1.22)

    # Smartphone input bar
    draw_smartphone_bottom_input(draw, w, h, mcfg, f"{full_name}: Grounded reflection active with memory.")
    img.save(out_path, quality=98)

# =========================================================================
# SCENE 2: THE YES-MAN TRAP / CHATGPT COMPARISON (STANDARD OR SPLIT)
# =========================================================================
def render_scene2(spec, out_path):
    split_mode = spec.get('split_screen') or spec.get('splitScreen')
    if split_mode in [True, 'columns', 'dual', 'side_by_side']:
        return render_left_right_split(spec, out_path)
    if split_mode in ['horizontal', 'stacked', 'top_bottom']:
        return render_top_bottom_split(spec, out_path)

    w, h = 1080, 1920
    mcfg = resolve_mode_config(spec)
    img, draw = create_smartphone_base(w, h, mcfg['id'])

    # Warning Header Banner (y: 260 to 345)
    draw.rounded_rectangle([60, 260, 1020, 345], radius=22, fill=(55, 18, 30, 240), outline=(244, 63, 94), width=2)
    draw.rounded_rectangle([95, 278, 135, 318], radius=8, fill=(244, 63, 94))
    draw.text((105, 282), "X", font=f_black(24), fill=TEXT_WHITE)
    draw.text((150, 282), "WHAT CHATGPT SAYS (THE FLATTERY TRAP)", font=f_black(26), fill=(244, 63, 94))

    # User Message (Compact context bubble at top: y: 365 to 495)
    user_dilemma = sanitize_text(spec.get('userExcuse') or spec.get('userDilemma') or mcfg['defaultDilemma'])
    draw.rounded_rectangle([220, 365, 1020, 495], radius=24, fill=(45, 32, 85), outline=(95, 70, 160), width=2)
    draw.text((250, 380), "You (Seeking Validation):", font=f_black(22), fill=(185, 165, 245))
    draw_wrapped_text(draw, f'"{user_dilemma}"', f_bold(28), TEXT_WHITE, 250, 412, 730, 1.25)
    draw_double_checkmarks(draw, 985, 465, size=14, color=(56, 189, 248), width=2)

    # ChatGPT Response Bubble (Recognizable OpenAI Teal avatar + large 42pt text)
    bot_reply = sanitize_text(spec.get('botReply', mcfg['defaultBot']))
    bubble_w = 960
    bubble_x1 = 60
    bubble_x2 = 60 + bubble_w
    bubble_y1 = 515

    b_height = get_text_height(draw, f'"{bot_reply}"', f_bold(42), bubble_w - 80, 1.32)
    bubble_y2 = bubble_y1 + b_height + 155

    draw.rounded_rectangle([bubble_x1, bubble_y1, bubble_x2, bubble_y2], radius=30, fill=(30, 36, 44), outline=(16, 163, 127), width=2)
    
    # Official ChatGPT green badge
    draw_avatar_badge(draw, bubble_x1 + 55, bubble_y1 + 44, radius=24, text="GPT", bg_color=(16, 163, 127), border_color=(52, 211, 153))
    draw.text((bubble_x1 + 95, bubble_y1 + 30), "CHATGPT (OPENAI)", font=f_black(26), fill=TEXT_LIGHT)
    draw.rounded_rectangle([bubble_x2 - 225, bubble_y1 + 22, bubble_x2 - 35, bubble_y1 + 62], radius=12, fill=(70, 22, 34))
    draw.text((bubble_x2 - 208, bubble_y1 + 31), "THE YES-MAN", font=f_bold(20), fill=(244, 63, 94))

    draw_wrapped_text(draw, f'"{bot_reply}"', f_bold(42), (230, 235, 250), bubble_x1 + 38, bubble_y1 + 90, bubble_w - 76, 1.32)

    # ChatGPT Flattery Sub-label
    pill_y = bubble_y2 - 50
    draw.rounded_rectangle([bubble_x1 + 38, pill_y, bubble_x1 + 580, pill_y + 36], radius=10, fill=(48, 22, 32))
    draw.text((bubble_x1 + 50, pill_y + 8), "CHATGPT • GENERIC TEXTBOOK ADVICE • ZERO MEMORY", font=f_bold(18), fill=(244, 63, 94))

    # The Consequence Breakdown Card (fills space down to y: 1530 with ZERO blank void!)
    warn_y1 = bubble_y2 + 25
    warn_y2 = 1530
    draw.rounded_rectangle([60, warn_y1, 1020, warn_y2], radius=28, fill=(35, 14, 24, 240), outline=(244, 63, 94), width=2)
    draw.text((100, warn_y1 + 24), "[ WHY CHATGPT FAILS YOU IN REAL LIFE ]", font=f_black(28), fill=(244, 63, 94))
    
    # Impact Quote Box
    callout_y = warn_y1 + 70
    callout_text = "ChatGPT tells you what feels comfortable, not what you actually need to do."
    callout_h = get_text_height(draw, callout_text, f_bold(24), 820, 1.25)
    callout_box_h = max(75, callout_h + 36)
    draw.rounded_rectangle([100, callout_y, 980, callout_y + callout_box_h], radius=16, fill=(55, 18, 30))
    draw_wrapped_text(draw, callout_text, f_bold(24), (255, 205, 215), 125, callout_y + 18, 820, 1.25)

    # 3 High-Impact Full-Width Contrast Cards
    badges = [
        ("THE AMNESIA TRAP", "ChatGPT resets every session: never remembers your goals or past excuses.", (244, 63, 94)),
        ("GENERIC ESSAYS", "Spits out 10 textbook bullet points that sound smart but you never execute.", (255, 184, 0)),
        ("NO COACHING", "Zero multi-day structure: cannot guide you through a real 7-day reset.", (168, 85, 247))
    ]
    by = callout_y + callout_box_h + 16
    for tag_name, desc, tag_col in badges:
        draw.rounded_rectangle([100, by, 980, by + 82], radius=16, fill=(45, 18, 30), outline=(85, 30, 48), width=1)
        draw.rounded_rectangle([118, by + 16, 380, by + 66], radius=10, fill=(65, 20, 36))
        draw.text((130, by + 26), tag_name, font=f_black(20), fill=tag_col)
        draw_wrapped_text(draw, desc, f_bold(24), TEXT_WHITE, 400, by + 14, 560, 1.25)
        by += 94

    # Bottom Difference Anchor
    draw.rounded_rectangle([100, by + 4, 980, by + 68], radius=14, fill=(28, 14, 26))
    draw_wrapped_text(draw, "TWINGENIE CONTRAST: 7-Day guided programs + persistent memory + accountability.", f_bold(20), (56, 189, 248), 125, by + 20, 830, 1.2)

    # Bottom Smartphone Input Bar
    draw_smartphone_bottom_input(draw, w, h, mcfg, "ChatGPT: Stateless AI. Resets memory and validates comfort zones.")

    img.save(out_path, quality=98)

# =========================================================================
# SCENE 3: THE TWINGENIE BREAKTHROUGH
# =========================================================================
def render_scene3(spec, out_path):
    w, h = 1080, 1920
    mcfg = resolve_mode_config(spec)
    img, draw = create_smartphone_base(w, h, mcfg['id'])

    # Breakthrough Header Banner (y: 260 to 345)
    draw.rounded_rectangle([60, 260, 1020, 345], radius=22, fill=mcfg['bgCard'], outline=mcfg['accent'], width=3)
    draw.rounded_rectangle([95, 278, 135, 318], radius=8, fill=mcfg['accent'])
    draw_vector_checkmark(draw, 101, 284, size=18, color=TEXT_WHITE, width=3)
    draw.text((150, 282), f"WHAT TWINGENIE SAYS ({mcfg['fullName']})", font=f_black(28), fill=TEXT_WHITE)

    # User Message (Compact context bubble at top: y: 365 to 495)
    user_dilemma = sanitize_text(spec.get('userExcuse') or spec.get('userDilemma') or mcfg['defaultDilemma'])
    draw.rounded_rectangle([220, 365, 1020, 495], radius=24, fill=(45, 32, 85), outline=(95, 70, 160), width=2)
    draw.text((250, 380), "You (Seeking Validation):", font=f_black(22), fill=(185, 165, 245))
    draw_wrapped_text(draw, f'"{user_dilemma}"', f_bold(28), TEXT_WHITE, 250, 412, 730, 1.25)
    draw_double_checkmarks(draw, 985, 465, size=14, color=(56, 189, 248), width=2)

    # TwinGenie Hero Breakthrough Bubble (Generous size, Large 42pt font!)
    twin_reply = sanitize_text(spec.get('twinReply', mcfg['defaultReply']))
    bubble_w = 960
    bubble_x1 = 60
    bubble_x2 = 60 + bubble_w
    bubble_y1 = 515

    t_height = get_text_height(draw, f'"{twin_reply}"', f_bold(42), bubble_w - 80, 1.34)
    bubble_y2 = bubble_y1 + t_height + 175

    draw.rounded_rectangle([bubble_x1, bubble_y1, bubble_x2, bubble_y2], radius=32, fill=(24, 16, 44), outline=mcfg['accent'], width=3)
    
    # Header inside hero bubble
    draw_avatar_badge(draw, bubble_x1 + 60, bubble_y1 + 52, radius=26, text="TG", bg_color=mcfg['bgCard'][:3], border_color=mcfg['accent'])
    draw.text((bubble_x1 + 102, bubble_y1 + 35), f"TWINGENIE • {mcfg['fullName']}", font=f_black(28), fill=TEXT_WHITE)
    
    # Dedicated Mode Identity Pill
    tag_y = bubble_y1 + 82
    draw.rounded_rectangle([bubble_x1 + 102, tag_y, bubble_x1 + 520, tag_y + 44], radius=12, fill=mcfg['bgCard'], outline=mcfg['accent'], width=1)
    draw.ellipse([bubble_x1 + 120, tag_y + 15, bubble_x1 + 134, tag_y + 29], fill=mcfg['accent'])
    draw.text((bubble_x1 + 144, tag_y + 10), mcfg['modeTag'], font=f_bold(20), fill=TEXT_WHITE)

    # Core Response Text in 42pt Bold White
    draw_wrapped_text(draw, f'"{twin_reply}"', f_bold(42), TEXT_WHITE, bubble_x1 + 40, bubble_y1 + 148, bubble_w - 80, 1.34)

    # The Perspective Shift Card (Full height down to y: 1530 with ZERO blank void!)
    shift_y1 = bubble_y2 + 25
    shift_y2 = 1530
    draw.rounded_rectangle([60, shift_y1, 1020, shift_y2], radius=28, fill=(35, 18, 38), outline=mcfg['accent'], width=2)
    
    draw.text((100, shift_y1 + 24), "[ THE PERSPECTIVE SHIFT ]", font=f_black(28), fill=mcfg['accent'])
    shift_desc = sanitize_text(spec.get('shift', mcfg['shift']))
    draw_wrapped_text(draw, shift_desc, f_bold(30), TEXT_WHITE, 100, shift_y1 + 68, 820, 1.26)
    
    # 3 High-Impact Contrast Badges filling the card perfectly
    pill1_y = shift_y1 + 142
    draw.rounded_rectangle([100, pill1_y, 980, pill1_y + 66], radius=14, fill=(50, 20, 32))
    draw.text((125, pill1_y + 18), "THE TRAP:", font=f_black(22), fill=(244, 63, 94))
    draw_wrapped_text(draw, mcfg['trapInsight'], f_bold(22), TEXT_LIGHT, 270, pill1_y + 14, 680, 1.20)
    
    pill2_y = pill1_y + 76
    draw.rounded_rectangle([100, pill2_y, 980, pill2_y + 66], radius=14, fill=(20, 45, 38))
    draw.text((125, pill2_y + 18), "THE ACTION:", font=f_black(22), fill=(52, 211, 153))
    draw_wrapped_text(draw, mcfg['actionInsight'], f_bold(22), TEXT_LIGHT, 295, pill2_y + 14, 660, 1.20)

    pill3_y = pill2_y + 76
    draw.rounded_rectangle([100, pill3_y, 980, pill3_y + 66], radius=14, fill=(24, 34, 64))
    draw.text((125, pill3_y + 18), "THE SHIFT:", font=f_black(22), fill=(56, 189, 248))
    draw_wrapped_text(draw, mcfg.get('breakthroughInsight', 'Replaces loops with self-trust.'), f_bold(22), TEXT_LIGHT, 275, pill3_y + 14, 680, 1.20)

    # Memory Engine Continuity Footer inside the card
    mem_y = pill3_y + 80
    draw.rounded_rectangle([100, mem_y, 980, mem_y + 60], radius=12, fill=(28, 20, 42), outline=(70, 50, 95), width=1)
    draw.ellipse([124, mem_y + 24, 136, mem_y + 36], fill=(56, 189, 248))
    draw.text((148, mem_y + 18), "PERSISTENT MEMORY: Pattern logged to prevent repeating next week.", font=f_bold(22), fill=TEXT_MUTED)

    # Bottom Smartphone Input Bar
    draw_smartphone_bottom_input(draw, w, h, mcfg, f"{mcfg['fullName']}: Grounded reflection active")

    img.save(out_path, quality=98)

# =========================================================================
# SCENE 4: WHY TWINGENIE BEATS CHATGPT & 4-PILLAR ECOSYSTEM
# =========================================================================
def render_scene4(spec, out_path):
    w, h = 1080, 1920
    mcfg = resolve_mode_config(spec)
    img, draw = create_smartphone_base(w, h, mcfg['id'])

    # Title & Subtitle (y: 260 to 360)
    draw.text((60, 260), "Why TwinGenie Beats ChatGPT.", font=f_black(48), fill=TEXT_WHITE)
    draw.text((60, 328), "A complete cognitive growth ecosystem built for real transformation:", font=f_bold(26), fill=(56, 189, 248))

    # 4 Comprehensive Feature Ecosystem Cards (Comfortably fills y: 380 to 1120)
    cards = [
        ('lifecoach', 'GUIDED LIFE COACH PROGRAMS', '7-Day Anxiety Reset, 5-Day Confidence Boost & step-by-step habit roadmaps', (168, 85, 247)),
        ('dark', '4 COGNITIVE DIGITAL TWINS', 'Honest Twin, Future Self (2031), Reflective & Grounded Alter-Ego perspectives', (255, 59, 92)),
        ('normal', 'YEAR-IN-PIXELS MOOD MAP', 'Visual 365-day tracking of emotional rhythms, triggers, and cognitive blind spots', (56, 189, 248)),
        ('reflective', 'PERSISTENT SEMANTIC MEMORY', 'Remembers your goals and flags recurring rationalizations (ChatGPT resets)', (52, 211, 153))
    ]
    cy = 380
    card_h = 165
    for mid, name, desc, col in cards:
        is_hero = (mid == mcfg['id'])
        border_col = col if is_hero else (65, 50, 100)
        border_w = 3 if is_hero else 1
        bg = (42, 18, 40) if is_hero else (24, 18, 44)
        
        draw.rounded_rectangle([60, cy, 1020, cy + card_h], radius=24, fill=bg, outline=border_col, width=border_w)
        draw.ellipse([92, cy + 32, 114, cy + 54], fill=col)
        draw.text((135, cy + 24), name, font=f_black(28), fill=TEXT_WHITE if is_hero else (230, 235, 245))
        draw_wrapped_text(draw, desc, f_bold(24), TEXT_MUTED, 135, cy + 70, 840, 1.25)
        cy += card_h + 20

    # Big Download Button for Google Play (y: 1145 to 1275)
    btn_y = 1145
    btn_h = 130
    draw.rounded_rectangle([60, btn_y, 1020, btn_y + btn_h], radius=32, fill=(147, 51, 234), outline=(192, 132, 252), width=3)
    draw.polygon([(115, btn_y + 42), (115, btn_y + 88), (155, btn_y + 65)], fill=TEXT_WHITE)
    draw.text((180, btn_y + 35), "DOWNLOAD TWINGENIE ON GOOGLE PLAY", font=f_black(34), fill=TEXT_WHITE)
    draw.text((180, btn_y + 82), "100% Free Baseline Assessment  •  Android & Web", font=f_bold(22), fill=(230, 220, 255))

    # Trust Rating Strip with 5 Golden Vector Stars (y: 1295 to 1385)
    star_y = 1295
    draw.rounded_rectangle([60, star_y, 1020, star_y + 85], radius=20, fill=(24, 18, 48), outline=CARD_SURFACE, width=1)
    
    star_start_x = 95
    star_center_y = star_y + 42
    for s in range(5):
        draw_star(draw, star_start_x + s * 34, star_center_y, radius=15, fill=(255, 195, 0))
    
    draw.text((star_start_x + 195, star_y + 26), "5.0 Rating  •  7-Day Programs  •  Year-in-Pixels  •  Google Play", font=f_bold(24), fill=TEXT_MUTED)

    # 3-Pillar Feature Showcase Strip (y: 1400 to 1515)
    f_y = 1400
    features = [
        ("Life Coach", "7-Day Tracks"),
        ("4 Twins", "Honest Mirror"),
        ("Mood Map", "365-Day Pixels")
    ]
    f_w = 300
    for i, (f_title, f_sub) in enumerate(features):
        fx = 60 + i * (f_w + 30)
        draw.rounded_rectangle([fx, f_y, fx + f_w, f_y + 105], radius=18, fill=(22, 16, 40), outline=(65, 50, 95), width=1)
        draw.text((fx + 25, f_y + 20), f_title, font=f_black(26), fill=(56, 189, 248))
        draw.text((fx + 25, f_y + 58), f_sub, font=f_bold(20), fill=TEXT_MUTED)

    # Bottom Bio Link Glowing Pill (y: 1535 to 1645)
    bio_y = 1535
    draw.rounded_rectangle([60, bio_y, 1020, bio_y + 80], radius=24, fill=(35, 20, 56), outline=(56, 189, 248), width=2)
    draw.text((150, bio_y + 24), "Search \"TwinGenie\" on Google Play or tap link in bio!", font=f_black(30), fill=TEXT_WHITE)

    # Home Bar Indicator (y: 1675 to 1682)
    draw.rounded_rectangle([390, 1675, 690, 1682], radius=4, fill=(120, 110, 140))

    img.save(out_path, quality=98)

# =========================================================================
# AUDIO & NEURAL VOICEOVER SYNTHESIS PIPELINE
# =========================================================================

def synthesize_voiceover_segment(text, out_mp3_path, voice='en-US-ChristopherNeural', rate='+25%'):
    cmd = [
        'edge-tts',
        '--voice', voice,
        '--rate=' + rate,
        '--text', text,
        '--write-media', out_mp3_path
    ]
    try:
        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except FileNotFoundError:
        # Fallback to python3 -m edge_tts if edge-tts binary isn't in $PATH
        cmd_fallback = [
            sys.executable, '-m', 'edge_tts',
            '--voice', voice,
            '--rate=' + rate,
            '--text', text,
            '--write-media', out_mp3_path
        ]
        subprocess.run(cmd_fallback, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def get_audio_duration(file_path):
    cmd = [
        'ffprobe', '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1',
        file_path
    ]
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, check=True)
    return float(res.stdout.decode().strip())

def generate_ambient_audio(output_path, duration=26.0):
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
    
    mcfg = resolve_mode_config(spec)
    s1 = os.path.join(temp_dir, 'scene_1.png')
    s2 = os.path.join(temp_dir, 'scene_2.png')
    s3 = os.path.join(temp_dir, 'scene_3.png')
    s4 = os.path.join(temp_dir, 'scene_4.png')

    render_scene1(spec, s1)
    render_scene2(spec, s2)
    render_scene3(spec, s3)
    render_scene4(spec, s4)

    # 1. Voiceover Narration Scripts (Punchy, synchronized narration)
    user_dilemma = sanitize_text(spec.get('userExcuse') or spec.get('userDilemma') or mcfg['defaultDilemma'])
    bot_reply = sanitize_text(spec.get('botReply', mcfg['defaultBot']))
    twin_reply = sanitize_text(spec.get('twinReply', mcfg['defaultReply']))

    vo_scripts = [
        f"POV: You told an AI your 2 AM excuses. {user_dilemma}",
        f"What ChatGPT says: {bot_reply}. That is the generic yes-man trap.",
        f"What TwinGenie says: {twin_reply}",
        "Stop talking to ChatGPT that forgets you tomorrow. Experience real 7-day life coaching and cognitive memory on TwinGenie. Download free on Google Play. Link in bio."
    ]

    has_voiceover = False
    voice_files = []
    timings = [6.5, 6.0, 7.5, 5.0] # Fallback default scene durations

    try:
        # Attempt neural voiceover generation via edge-tts
        for idx, text in enumerate(vo_scripts, 1):
            mp3_path = os.path.join(temp_dir, f'vo_scene_{idx}.mp3')
            wav_path = os.path.join(temp_dir, f'vo_scene_{idx}.wav')
            voice_choice = mcfg.get('voiceVoice', 'en-US-ChristopherNeural')
            synthesize_voiceover_segment(text, mp3_path, voice=voice_choice, rate='+20%')
            
            # Convert to standard 44.1kHz stereo WAV
            subprocess.run([
                'ffmpeg', '-y', '-i', mp3_path,
                '-ar', '44100', '-ac', '2', wav_path
            ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
            
            dur = get_audio_duration(wav_path)
            timings[idx - 1] = max(4.5, round(dur + 0.4, 2))
            voice_files.append(wav_path)

        has_voiceover = True
    except Exception as e:
        print(f"[REEL RENDERER] Voiceover generation warning: {e}. Falling back to ambient audio.")
        has_voiceover = False

    t1, t2, t3, t4 = timings
    total_dur = t1 + t2 + t3 + t4

    # 2. Audio Track Assembly
    final_audio = os.path.join(temp_dir, 'final_soundtrack.m4a')
    bg_music_file = os.path.join(temp_dir, 'bg_music.m4a')
    
    if os.path.exists(DEFAULT_BG_MUSIC):
        bg_source = DEFAULT_BG_MUSIC
    else:
        generate_ambient_audio(bg_music_file, duration=total_dur + 3.0)
        bg_source = bg_music_file

    if has_voiceover and len(voice_files) == 4:
        # Concatenate 4 scene voiceovers
        concat_audio_txt = os.path.join(temp_dir, 'audio_concat.txt')
        with open(concat_audio_txt, 'w') as f:
            for vf in voice_files:
                f.write(f"file '{vf}'\n")

        master_voice = os.path.join(temp_dir, 'master_voice.wav')
        subprocess.run([
            'ffmpeg', '-y', '-f', 'concat', '-safe', '0', '-i', concat_audio_txt,
            '-c', 'copy', master_voice
        ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)

        # Mix voiceover (foreground volume=1.00) with ambient music (quiet background volume=0.10)
        # normalize=0 prevents ffmpeg from halving the voiceover volume
        # -stream_loop -1 ensures background music never cuts off mid-video
        mix_cmd = [
            'ffmpeg', '-y',
            '-i', master_voice,
            '-stream_loop', '-1', '-i', bg_source,
            '-filter_complex',
            f'[1:a]volume=0.10,atrim=0:{total_dur},afade=t=out:st={total_dur - 1.5}:d=1.5[bg];'
            f'[0:a]volume=1.00,atrim=0:{total_dur}[vo];'
            f'[vo][bg]amix=inputs=2:duration=first:dropout_transition=2:normalize=0[aout]',
            '-map', '[aout]',
            '-c:a', 'aac', '-b:a', '128k', '-ar', '44100', '-ac', '2',
            final_audio
        ]
        subprocess.run(mix_cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    else:
        # Fallback ambient soundtrack (when voiceover offline)
        mix_cmd = [
            'ffmpeg', '-y',
            '-stream_loop', '-1', '-i', bg_source,
            '-filter_complex',
            f'[0:a]volume=0.25,atrim=0:{total_dur},afade=t=out:st={total_dur - 1.5}:d=1.5[aout]',
            '-map', '[aout]',
            '-c:a', 'aac', '-b:a', '128k', '-ar', '44100', '-ac', '2',
            final_audio
        ]
        subprocess.run(mix_cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    # 3. Ultra-Low RAM Concat Demuxer for 512MB VPS (<20MB RAM)
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
        '-tune', 'stillimage',
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
    cleanup_files = [s1, s2, s3, s4, bg_music_file, final_audio, concat_txt] + voice_files
    for p in cleanup_files:
        if p and os.path.exists(p):
            try: os.remove(p)
            except Exception: pass

    return {
        'success': True,
        'videoPath': output_mp4_path,
        'resolution': '1080x1920',
        'durationSeconds': round(total_dur, 2),
        'fps': 24,
        'mode': mcfg['id'],
        'modeName': mcfg['fullName'],
        'hasVoiceover': has_voiceover,
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
