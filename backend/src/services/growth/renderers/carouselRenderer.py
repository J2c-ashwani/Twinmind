#!/usr/bin/env python3
"""
TwinGenie Automated Carousel & PDF Slide Renderer
Renders high-converting 1080x1350 slides and multi-page PDF documents for LinkedIn, Instagram & Facebook.
Optimized for zero-void high visual density, dialogue comparisons, and multi-mode showcase.
"""

import os
import sys
import json
from PIL import Image, ImageDraw, ImageFont, ImageFilter

BG_COLOR = (12, 9, 28)           # Deep Obsidian #0C091C
SURFACE_DARK = (21, 16, 46)      # Surface #15102E
SURFACE_LIGHT = (32, 25, 68)     # Card Highlight #201944
CARD_BORDER = (56, 44, 106)      # Border #382C6A
BORDER_CYAN = (38, 100, 160)     # Cyan Accent Border
BORDER_PURPLE = (126, 58, 242)   # Purple Glow Border

PURPLE_PRIMARY = (147, 51, 234)  # #9333EA
PURPLE_GLOW = (168, 85, 247)     # #A855F7
CYAN_ACCENT = (56, 189, 248)     # #38BDF8
EMERALD_ACCENT = (52, 211, 153)  # #34D399
AMBER_ACCENT = (251, 191, 36)    # #FBBF24
ROSE_ACCENT = (244, 63, 94)      # #F43F5E

TEXT_WHITE = (255, 255, 255)
TEXT_MUTED = (185, 190, 215)
TEXT_DIM = (130, 135, 160)

import re

def sanitize_text(text):
    if not isinstance(text, str):
        return str(text) if text is not None else ""
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
        '/Library/Fonts/Arial.ttf'
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
        w = bbox[2] - bbox[0]
        if w <= max_width:
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
        line_height = bbox[3] - bbox[1]
        cur_y += int(line_height * line_spacing)
    return cur_y

def draw_vector_checkmark(draw, cx, cy, size=24, color=EMERALD_ACCENT):
    # Vector checkmark: cx, cy is top-left
    p1 = (cx + int(size * 0.15), cy + int(size * 0.55))
    p2 = (cx + int(size * 0.45), cy + int(size * 0.82))
    p3 = (cx + int(size * 0.88), cy + int(size * 0.22))
    draw.line([p1, p2, p3], fill=color, width=3)

def draw_play_icon(draw, x, y, size=22, color=TEXT_WHITE):
    # Triangle pointing right
    p1 = (x, y)
    p2 = (x + size, y + size // 2)
    p3 = (x, y + size)
    draw.polygon([p1, p2, p3], fill=color)

def draw_header_and_bg(slide_data, slide_index, total_slides):
    w, h = 1080, 1350
    img = Image.new('RGB', (w, h), BG_COLOR)

    # Ambient radial top glow
    glow = Image.new('RGB', (w, h), (0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    glow_draw.ellipse([-150, -150, 1230, 650], fill=(75, 24, 120))
    glow_draw.ellipse([500, 800, 1300, 1500], fill=(20, 50, 100))
    glow = glow.filter(ImageFilter.GaussianBlur(150))
    img = Image.blend(img, glow, 0.65)
    draw = ImageDraw.Draw(img)

    # Header Bar: Brand tag & Slide number
    font_brand = get_font(26, bold=True)
    font_num = get_font(24, bold=True)
    
    # Brand pill badge with glowing dot
    draw.rounded_rectangle([70, 58, 260, 106], radius=14, fill=SURFACE_LIGHT, outline=CARD_BORDER, width=1)
    draw.ellipse([88, 77, 98, 87], fill=PURPLE_GLOW)
    draw.text((110, 68), "TWINGENIE", font=font_brand, fill=TEXT_WHITE)
    draw.text((280, 70), "•  PERSONAL AI", font=get_font(22, bold=False), fill=TEXT_MUTED)
    
    # Slide counter pill
    counter_str = f"{slide_index:02d} / {total_slides:02d}"
    bbox_cnt = draw.textbbox((0, 0), counter_str, font=font_num)
    cnt_w = bbox_cnt[2] - bbox_cnt[0]
    draw.rounded_rectangle([w - 70 - cnt_w - 32, 58, w - 70, 106], radius=14, fill=SURFACE_LIGHT, outline=CARD_BORDER, width=1)
    draw.text((w - 70 - cnt_w - 16, 69), counter_str, font=font_num, fill=TEXT_WHITE)

    # Category Tag pill
    tag_text = sanitize_text(slide_data.get('tag', 'COGNITIVE ARCHITECTURE')).upper()
    font_tag = get_font(22, bold=True)
    bbox_t = draw.textbbox((0, 0), tag_text, font=font_tag)
    pill_w = bbox_t[2] - bbox_t[0] + 36
    pill_y = 135
    draw.rounded_rectangle([70, pill_y, 70 + pill_w, pill_y + 42], radius=21, fill=(35, 22, 75), outline=PURPLE_PRIMARY, width=1)
    draw.text((88, pill_y + 9), tag_text, font=font_tag, fill=CYAN_ACCENT)

    # Footer
    footer_text = "Swipe to explore →" if slide_index < total_slides else "Available on Google Play"
    font_footer = get_font(26, bold=(slide_index == total_slides))
    footer_fill = PURPLE_GLOW if slide_index == total_slides else TEXT_MUTED
    draw.text((70, h - 85), footer_text, font=font_footer, fill=footer_fill)
    
    brand_foot = "twingenie.app  •  Google Play Store"
    bbox_bf = draw.textbbox((0, 0), brand_foot, font=get_font(22, bold=False))
    draw.text((w - 70 - (bbox_bf[2] - bbox_bf[0]), h - 85), brand_foot, font=get_font(22, bold=False), fill=TEXT_DIM)

    return img, draw, 205

# ----------------- SLIDE LAYOUT 1: COVER / HOOK -----------------
def render_cover_slide(draw, slide_data, cur_y):
    w, h = 1080, 1350
    title = slide_data.get('title', 'What happens when your AI stops flattering you?')
    subtitle = slide_data.get('subtitle') or slide_data.get('content', '')
    takeaways = slide_data.get('takeaways', [
        "Why conventional AI chatbots reinforce confirmation bias",
        "How 4 distinct cognitive lenses stress-test your thinking",
        "Why persistent vector memory turns chat into true self-growth"
    ])

    # Big Title
    font_title = get_font(62, bold=True)
    cur_y = draw_wrapped_text(draw, title, font_title, TEXT_WHITE, 70, cur_y, max_width=940, line_spacing=1.18)

    # Subtitle / Hook explanation box (fills y=420 to y=680)
    card_top = max(cur_y + 25, 410)
    card_h = 245
    draw.rounded_rectangle([70, card_top, w - 70, card_top + card_h], radius=24, fill=SURFACE_DARK, outline=CARD_BORDER, width=2)
    
    # Mini Tag inside box
    draw.rounded_rectangle([105, card_top + 26, 380, card_top + 66], radius=10, fill=(48, 32, 98))
    draw.text((125, card_top + 36), "THE COGNITIVE MIRROR", font=get_font(20, bold=True), fill=PURPLE_GLOW)
    
    font_sub = get_font(32, bold=False)
    draw_wrapped_text(draw, subtitle, font_sub, TEXT_MUTED, 105, card_top + 88, max_width=870, line_spacing=1.3)

    # Takeaways / "Inside this breakdown" section (fills y=700 to y=1180)
    cur_y = card_top + card_h + 35
    draw.text((70, cur_y), "WHAT THIS 5-SLIDE BREAKDOWN REVEALS:", font=get_font(22, bold=True), fill=TEXT_DIM)
    cur_y += 42

    takeaway_box_h = 120
    gap = 20
    for idx, item in enumerate(takeaways, start=1):
        box_y = cur_y + (idx - 1) * (takeaway_box_h + gap)
        draw.rounded_rectangle([70, box_y, w - 70, box_y + takeaway_box_h], radius=20, fill=SURFACE_LIGHT, outline=CARD_BORDER, width=1)
        
        # Number pill
        num_str = f"0{idx}"
        draw.rounded_rectangle([95, box_y + 24, 160, box_y + 96], radius=14, fill=(45, 30, 92))
        draw.text((110, box_y + 45), num_str, font=get_font(26, bold=True), fill=CYAN_ACCENT)
        
        # Item text
        draw_wrapped_text(draw, item, get_font(28, bold=False), TEXT_WHITE, 185, box_y + 30, max_width=790, line_spacing=1.25)

# ----------------- SLIDE LAYOUT 2: COMPARISON / DIALOGUE -----------------
def render_comparison_slide(draw, slide_data, cur_y):
    w, h = 1080, 1350
    title = slide_data.get('title', 'Normal Twin vs Honest Twin')
    subtitle = slide_data.get('subtitle', 'Two completely different answers to the exact same excuse:')

    font_title = get_font(56, bold=True)
    cur_y = draw_wrapped_text(draw, title, font_title, TEXT_WHITE, 70, cur_y, max_width=940, line_spacing=1.18)
    
    cur_y += 16
    font_sub = get_font(28, bold=False)
    cur_y = draw_wrapped_text(draw, subtitle, font_sub, TEXT_MUTED, 70, cur_y, max_width=940, line_spacing=1.2)

    cur_y = max(cur_y + 25, 360)

    left_data = slide_data.get('left', {
        'badge': '[ TRADITIONAL AI (THE YES-MAN) ]',
        'user': "I feel like delaying this launch. I'm exhausted.",
        'ai': "Totally understandable! Take as much rest as you need. Self-care comes first!",
        'outcome': "Validates procrastination & fear of failure"
    })

    right_data = slide_data.get('right', {
        'badge': '[ TWINGENIE (HONEST PERSPECTIVE) ]',
        'user': "I feel like delaying this launch. I'm exhausted.",
        'ai': "Looking at your memory log from 2 weeks ago, you said the same thing before the investor pitch. You aren't exhausted—you're scared of market judgment. Let's finish the checklist.",
        'outcome': "Exposes the blind spot & pushes you forward"
    })

    # Card 1: Traditional AI
    c1_y = cur_y
    c1_h = 370
    draw.rounded_rectangle([70, c1_y, w - 70, c1_y + c1_h], radius=22, fill=SURFACE_DARK, outline=(75, 40, 60), width=2)
    
    # Badge
    badge_l = left_data.get('badge', '[ TRADITIONAL AI ]')
    draw.rounded_rectangle([95, c1_y + 24, 490, c1_y + 66], radius=10, fill=(60, 25, 40))
    draw.text((112, c1_y + 34), badge_l, font=get_font(20, bold=True), fill=ROSE_ACCENT)

    # User message
    draw.text((95, c1_y + 88), f"You: \"{left_data.get('user', '')}\"", font=get_font(25, bold=False), fill=TEXT_MUTED)
    
    # AI message bubble
    draw.rounded_rectangle([95, c1_y + 135, w - 95, c1_y + 275], radius=16, fill=(35, 20, 38))
    draw.text((115, c1_y + 152), "AI: ", font=get_font(26, bold=True), fill=ROSE_ACCENT)
    draw_wrapped_text(draw, f"\"{left_data.get('ai', '')}\"", get_font(26, bold=False), TEXT_WHITE, 165, c1_y + 152, max_width=770, line_spacing=1.25)

    # Outcome pill
    draw.text((95, c1_y + 310), f"⚠ Result: {left_data.get('outcome', '')}", font=get_font(23, bold=True), fill=TEXT_DIM)

    # Card 2: Honest Twin
    c2_y = c1_y + c1_h + 30
    c2_h = 430
    draw.rounded_rectangle([70, c2_y, w - 70, c2_y + c2_h], radius=22, fill=SURFACE_LIGHT, outline=BORDER_PURPLE, width=2)

    # Badge
    badge_r = right_data.get('badge', '[ HONEST PERSPECTIVE ]')
    draw.rounded_rectangle([95, c2_y + 24, 500, c2_y + 66], radius=10, fill=(55, 30, 110))
    draw.text((112, c2_y + 34), badge_r, font=get_font(20, bold=True), fill=CYAN_ACCENT)

    # User message
    draw.text((95, c2_y + 88), f"You: \"{right_data.get('user', '')}\"", font=get_font(25, bold=False), fill=TEXT_MUTED)

    # Twin message bubble
    draw.rounded_rectangle([95, c2_y + 135, w - 95, c2_y + 345], radius=16, fill=(20, 14, 46), outline=CARD_BORDER, width=1)
    draw.text((115, c2_y + 152), "Twin: ", font=get_font(26, bold=True), fill=PURPLE_GLOW)
    draw_wrapped_text(draw, f"\"{right_data.get('ai', '')}\"", get_font(26, bold=False), TEXT_WHITE, 195, c2_y + 152, max_width=740, line_spacing=1.28)

    # Outcome pill
    draw.text((95, c2_y + 375), f"★ Growth Result: {right_data.get('outcome', '')}", font=get_font(23, bold=True), fill=EMERALD_ACCENT)

# ----------------- SLIDE LAYOUT 3: 4 MODES -----------------
def render_modes_slide(draw, slide_data, cur_y):
    w, h = 1080, 1350
    title = slide_data.get('title', 'One Context. 4 Cognitive Perspectives.')
    subtitle = slide_data.get('subtitle', 'Switch perspectives anytime without losing your conversation history:')

    font_title = get_font(56, bold=True)
    cur_y = draw_wrapped_text(draw, title, font_title, TEXT_WHITE, 70, cur_y, max_width=940, line_spacing=1.18)

    cur_y += 16
    font_sub = get_font(28, bold=False)
    cur_y = draw_wrapped_text(draw, subtitle, font_sub, TEXT_MUTED, 70, cur_y, max_width=940, line_spacing=1.2)

    cur_y = max(cur_y + 25, 360)

    modes = slide_data.get('modes', [
        { "num": "01", "name": "NORMAL TWIN", "desc": "Your baseline voice, daily sounding board, and routine reflection." },
        { "num": "02", "name": "REFLECTIVE TWIN", "desc": "Deep psychological empathy, active listening, and emotional decompression." },
        { "num": "03", "name": "HONEST TWIN", "desc": "Direct, unfiltered challenger to rationalizations and cognitive blind spots." },
        { "num": "04", "name": "FUTURE TWIN", "desc": "The 5-years-wiser perspective bringing calm clarity to today's panic." }
    ])

    colors = [CYAN_ACCENT, EMERALD_ACCENT, ROSE_ACCENT, PURPLE_GLOW]
    mode_h = 175
    gap = 22

    for idx, mode in enumerate(modes):
        box_y = cur_y + idx * (mode_h + gap)
        draw.rounded_rectangle([70, box_y, w - 70, box_y + mode_h], radius=22, fill=SURFACE_DARK, outline=CARD_BORDER, width=2)

        # Number pill
        accent_col = colors[idx % len(colors)]
        draw.rounded_rectangle([95, box_y + 24, 160, box_y + 74], radius=14, fill=(35, 26, 75))
        draw.text((108, box_y + 34), mode.get('num', f"0{idx+1}"), font=get_font(26, bold=True), fill=accent_col)

        # Name
        draw.text((180, box_y + 34), mode.get('name', ''), font=get_font(28, bold=True), fill=TEXT_WHITE)

        # Description
        draw_wrapped_text(draw, mode.get('desc', ''), get_font(25, bold=False), TEXT_MUTED, 95, box_y + 92, max_width=890, line_spacing=1.25)

    # Bottom Context Banner
    banner_y = cur_y + len(modes) * (mode_h + gap) + 12
    draw.rounded_rectangle([70, banner_y, w - 70, banner_y + 68], radius=16, fill=(28, 22, 60), outline=CARD_BORDER, width=1)
    draw.text((95, banner_y + 21), "• One unified pgvector memory pipeline across all 4 modes", font=get_font(22, bold=True), fill=PURPLE_GLOW)

# ----------------- SLIDE LAYOUT 4: TIMELINE / MEMORY -----------------
def render_timeline_slide(draw, slide_data, cur_y):
    w, h = 1080, 1350
    title = slide_data.get('title', 'Why Chatbots Reset (And Why We Don\'t)')
    subtitle = slide_data.get('subtitle', 'TwinGenie connects your thoughts across weeks using pgvector:')

    font_title = get_font(56, bold=True)
    cur_y = draw_wrapped_text(draw, title, font_title, TEXT_WHITE, 70, cur_y, max_width=940, line_spacing=1.18)

    cur_y += 16
    font_sub = get_font(28, bold=False)
    cur_y = draw_wrapped_text(draw, subtitle, font_sub, TEXT_MUTED, 70, cur_y, max_width=940, line_spacing=1.2)

    cur_y = max(cur_y + 25, 360)

    steps = slide_data.get('steps', [
        { "step": "STAGE 01", "title": "35-Question Assessment", "desc": "Maps your Big Five personality traits, stress responses, and core values." },
        { "step": "STAGE 02", "title": "Semantic Pattern Matching", "desc": "Detects recurring self-sabotage loops that single-session chats miss completely." },
        { "step": "STAGE 03", "title": "The Compound Mirror", "desc": "Your digital twin becomes sharper, wiser, and more attuned to your actual growth." }
    ])

    step_h = 215
    gap = 25
    for idx, s in enumerate(steps):
        box_y = cur_y + idx * (step_h + gap)
        draw.rounded_rectangle([70, box_y, w - 70, box_y + step_h], radius=22, fill=SURFACE_LIGHT, outline=CARD_BORDER, width=2)

        # Step badge
        draw.rounded_rectangle([95, box_y + 22, 240, box_y + 64], radius=10, fill=(45, 30, 95))
        draw.text((112, box_y + 30), s.get('step', f"STAGE {idx+1}"), font=get_font(18, bold=True), fill=CYAN_ACCENT)

        # Title
        draw.text((260, box_y + 27), s.get('title', ''), font=get_font(28, bold=True), fill=TEXT_WHITE)

        # Desc
        draw_wrapped_text(draw, s.get('desc', ''), get_font(26, bold=False), TEXT_MUTED, 95, box_y + 88, max_width=890, line_spacing=1.28)

    # Privacy Banner
    banner_y = cur_y + len(steps) * (step_h + gap) + 15
    draw.rounded_rectangle([70, banner_y, w - 70, banner_y + 75], radius=16, fill=(20, 35, 45), outline=(35, 80, 100), width=1)
    banner_text = slide_data.get('note', '• 100% Private Vector Memory — Never shared or used for third-party training')
    draw.text((95, banner_y + 24), banner_text, font=get_font(22, bold=True), fill=CYAN_ACCENT)

# ----------------- SLIDE LAYOUT 5: CTA -----------------
def render_cta_slide(draw, slide_data, cur_y):
    w, h = 1080, 1350
    title = slide_data.get('title', 'Meet Your Digital Twin Today')
    subtitle = slide_data.get('subtitle', 'Stop talking to AI that forgets you. Start building real self-awareness.')

    font_title = get_font(58, bold=True)
    cur_y = draw_wrapped_text(draw, title, font_title, TEXT_WHITE, 70, cur_y, max_width=940, line_spacing=1.18)

    cur_y += 16
    font_sub = get_font(28, bold=False)
    cur_y = draw_wrapped_text(draw, subtitle, font_sub, TEXT_MUTED, 70, cur_y, max_width=940, line_spacing=1.2)

    cur_y = max(cur_y + 25, 370)

    # Hero Box (fills y=370 to y=1200)
    box_top = cur_y
    box_h = 810
    draw.rounded_rectangle([70, box_top, w - 70, box_top + box_h], radius=28, fill=SURFACE_DARK, outline=BORDER_PURPLE, width=2)

    # Logo / Header inside card
    draw.text((105, box_top + 45), "TWINGENIE", font=get_font(42, bold=True), fill=TEXT_WHITE)
    draw.text((385, box_top + 58), "• PERSONAL DIGITAL TWIN", font=get_font(22, bold=False), fill=CYAN_ACCENT)

    # Bullets with vector checkmarks
    points = slide_data.get('points', [
        "35-Question Big Five personality baseline",
        "4 perspectives: Normal, Reflective, Honest, Future",
        "Persistent semantic memory across all conversations",
        "100% private, self-guided reflection"
    ])

    pt_y = box_top + 140
    for pt in points:
        # Checkmark icon circle
        draw.ellipse([105, pt_y + 2, 140, pt_y + 37], fill=(45, 30, 95))
        draw_vector_checkmark(draw, 108, pt_y + 4, size=24, color=EMERALD_ACCENT)
        draw.text((160, pt_y + 6), pt, font=get_font(27, bold=False), fill=TEXT_MUTED)
        pt_y += 72

    # Rating badge
    draw.rounded_rectangle([105, box_top + 480, w - 105, box_top + 540], radius=14, fill=(28, 22, 58), outline=CARD_BORDER, width=1)
    draw.text((125, box_top + 498), "Rating: 5.0  •  Google Play Store  •  100% Free Download", font=get_font(22, bold=True), fill=AMBER_ACCENT)

    # Glowing CTA Button with Play triangle
    btn_y = box_top + 575
    btn_h = 105
    draw.rounded_rectangle([105, btn_y, w - 105, btn_y + btn_h], radius=24, fill=PURPLE_PRIMARY)
    
    btn_text = sanitize_text(slide_data.get('button', 'Download TwinGenie on Google Play'))
    font_btn = get_font(34, bold=True)
    bbox_btn = draw.textbbox((0, 0), btn_text, font=font_btn)
    btn_w = bbox_btn[2] - bbox_btn[0]
    
    # Draw Play Triangle before text
    total_content_w = 32 + 16 + btn_w
    start_x = (w - total_content_w) // 2
    draw_play_icon(draw, start_x, btn_y + 40, size=24, color=TEXT_WHITE)
    draw.text((start_x + 46, btn_y + 32), btn_text, font=font_btn, fill=TEXT_WHITE)

    # Subtext / Links
    link_text = slide_data.get('link', 'twingenie.app  •  Live on Google Play Store')
    font_lk = get_font(24, bold=False)
    bbox_lk = draw.textbbox((0, 0), link_text, font=font_lk)
    lk_w = bbox_lk[2] - bbox_lk[0]
    draw.text(((w - lk_w) // 2, btn_y + btn_h + 38), link_text, font=font_lk, fill=TEXT_DIM)

# ----------------- FALLBACK DYNAMIC RENDERER (NO VOID SPACE) -----------------
def render_dynamic_slide(draw, slide_data, cur_y):
    w, h = 1080, 1350
    title = slide_data.get('title', 'Cognitive Reflection')
    content = slide_data.get('content', '')
    highlight = slide_data.get('highlight')
    bullets = slide_data.get('bullets', [])

    font_title = get_font(56, bold=True)
    cur_y = draw_wrapped_text(draw, title, font_title, TEXT_WHITE, 70, cur_y, max_width=940, line_spacing=1.18)

    cur_y = max(cur_y + 25, 360)
    card_top = cur_y
    card_h = 820
    draw.rounded_rectangle([70, card_top, w - 70, card_top + card_h], radius=24, fill=SURFACE_DARK, outline=CARD_BORDER, width=2)

    inner_y = card_top + 45
    if highlight:
        draw.rounded_rectangle([105, inner_y, w - 105, inner_y + 60], radius=14, fill=(45, 30, 95))
        draw.text((125, inner_y + 16), highlight, font=get_font(24, bold=True), fill=PURPLE_GLOW)
        inner_y += 90

    inner_y = draw_wrapped_text(draw, content, get_font(32, bold=False), TEXT_MUTED, 105, inner_y, max_width=870, line_spacing=1.35)

    if bullets:
        inner_y += 40
        for b in bullets:
            draw.text((105, inner_y), "•", font=get_font(30, bold=True), fill=CYAN_ACCENT)
            inner_y = draw_wrapped_text(draw, b, get_font(28, bold=False), TEXT_WHITE, 140, inner_y, max_width=830, line_spacing=1.25)
            inner_y += 20

# ----------------- MAIN DISPATCHER -----------------
def render_slide(slide_data, slide_index, total_slides, output_path):
    img, draw, cur_y = draw_header_and_bg(slide_data, slide_index, total_slides)

    stype = slide_data.get('type')
    if stype == 'cover' or (not stype and slide_index == 1):
        render_cover_slide(draw, slide_data, cur_y)
    elif stype == 'comparison' or 'left' in slide_data or (not stype and slide_index == 2):
        render_comparison_slide(draw, slide_data, cur_y)
    elif stype == 'modes' or 'modes' in slide_data or (not stype and slide_index == 3):
        render_modes_slide(draw, slide_data, cur_y)
    elif stype == 'timeline' or 'steps' in slide_data or (not stype and slide_index == 4):
        render_timeline_slide(draw, slide_data, cur_y)
    elif stype == 'cta' or (not stype and slide_index == total_slides):
        render_cta_slide(draw, slide_data, cur_y)
    else:
        render_dynamic_slide(draw, slide_data, cur_y)

    img.save(output_path, 'PNG', quality=95)
    return img

def render_carousel(spec, output_dir):
    os.makedirs(output_dir, exist_ok=True)
    slides = spec.get('slides', [])
    total = len(slides)
    rendered_images = []
    png_paths = []

    for i, slide in enumerate(slides, start=1):
        png_path = os.path.join(output_dir, f"slide_{i}.png")
        img = render_slide(slide, i, total, png_path)
        rendered_images.append(img.convert('RGB'))
        png_paths.append(png_path)

    # Compile multi-page PDF for LinkedIn document carousel
    pdf_path = os.path.join(output_dir, "carousel.pdf")
    if rendered_images:
        first_img = rendered_images[0]
        first_img.save(pdf_path, 'PDF', resolution=100.0, save_all=True, append_images=rendered_images[1:])

    return {
        'totalSlides': total,
        'pngPaths': png_paths,
        'pdfPath': pdf_path
    }

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: python carouselRenderer.py <spec_json_path_or_string> <output_dir>")
        sys.exit(1)

    raw_input = sys.argv[1]
    out_dir = sys.argv[2]

    if os.path.exists(raw_input):
        with open(raw_input, 'r') as f:
            spec_data = json.load(f)
    else:
        spec_data = json.loads(raw_input)

    result = render_carousel(spec_data, out_dir)
    print(json.dumps(result))
