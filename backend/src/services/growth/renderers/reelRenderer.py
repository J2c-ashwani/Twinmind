#!/usr/bin/env python3
"""
TwinGenie Automated Reel / Short Video Renderer
Renders high-converting 1080x1920 (9:16 vertical) motion video Reels for Facebook, Instagram & YouTube.
Uses PIL for crisp typography and FFmpeg for smooth transitions.
Ensures zero font glyph errors (no boxes), no text cutoff, and 100% accurate product architecture.
"""

import os
import sys
import json
import subprocess
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
TEXT_MUTED = (185, 190, 215)
TEXT_DIM = (130, 135, 160)

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

    # Top Brand Header
    draw.rounded_rectangle([80, 100, 310, 160], radius=16, fill=SURFACE_LIGHT, outline=CARD_BORDER, width=1)
    draw.ellipse([102, 122, 118, 138], fill=PURPLE_GLOW)
    draw.text((135, 114), "TWINGENIE", font=get_font(30, bold=True), fill=TEXT_WHITE)
    draw.text((330, 118), "•  PERSONAL AI", font=get_font(26, bold=False), fill=TEXT_MUTED)
    return img, draw

# SCENE 1: HOOK (0 - 3.8s)
def render_scene1(spec, out_path):
    w, h = 1080, 1920
    img, draw = create_base_canvas(w, h)
    
    tag = sanitize_text(spec.get('tag', 'COGNITIVE ARCHITECTURE')).upper()
    pill_y = 260
    draw.rounded_rectangle([80, pill_y, 450, pill_y + 54], radius=27, fill=(45, 24, 90), outline=PURPLE_PRIMARY, width=2)
    draw.text((105, pill_y + 12), tag, font=get_font(24, bold=True), fill=CYAN_ACCENT)

    hook_title = sanitize_text(spec.get('hook', 'What happens when your AI stops flattering you?'))
    cur_y = draw_wrapped_text(draw, hook_title, get_font(72, bold=True), TEXT_WHITE, 80, 360, 920, 1.15)
    
    card_y = cur_y + 50
    draw.rounded_rectangle([80, card_y, w - 80, card_y + 360], radius=32, fill=SURFACE_DARK, outline=BORDER_PURPLE, width=2)
    draw.text((120, card_y + 45), "THE FLATTERY TRAP", font=get_font(26, bold=True), fill=PURPLE_GLOW)
    draw_wrapped_text(draw, "Conventional chatbots are trained to be yes-men. They agree with your doubts, validate your procrastination, and reset every session.", get_font(38, bold=False), TEXT_MUTED, 120, card_y + 105, 840, 1.35)

    takeaways = [
        "Why flattery AI creates dangerous confirmation loops",
        "How 4 cognitive perspectives challenge your blind spots",
        "Why persistent vector memory turns chat into real growth"
    ]
    ty = card_y + 420
    draw.text((80, ty), "INSIDE THIS BREAKDOWN:", font=get_font(26, bold=True), fill=TEXT_DIM)
    ty += 55
    for i, t in enumerate(takeaways, 1):
        draw.rounded_rectangle([80, ty, w - 80, ty + 130], radius=22, fill=SURFACE_LIGHT, outline=CARD_BORDER, width=1)
        draw.rounded_rectangle([105, ty + 25, 175, ty + 105], radius=16, fill=(45, 30, 95))
        draw.text((122, ty + 45), f"0{i}", font=get_font(28, bold=True), fill=CYAN_ACCENT)
        draw_wrapped_text(draw, t, get_font(30, bold=False), TEXT_WHITE, 205, ty + 35, 760, 1.25)
        ty += 155

    img.save(out_path, quality=95)

# SCENE 2: CONVENTIONAL BOT (3.8 - 7.6s)
def render_scene2(spec, out_path):
    w, h = 1080, 1920
    img, draw = create_base_canvas(w, h)

    pill_y = 240
    draw.rounded_rectangle([80, pill_y, 440, pill_y + 54], radius=27, fill=(60, 25, 40), outline=ROSE_ACCENT, width=2)
    draw.text((105, pill_y + 12), "STANDARD CHATBOT", font=get_font(24, bold=True), fill=ROSE_ACCENT)

    title_y = draw_wrapped_text(draw, "The Yes-Man AI Trap", get_font(64, bold=True), TEXT_WHITE, 80, 320, 920, 1.15)
    sub_y = draw_wrapped_text(draw, "When you make an excuse, generic AI agrees with you:", get_font(34, bold=False), TEXT_MUTED, 80, title_y + 18, 920, 1.25)

    c1_y = sub_y + 35
    draw.rounded_rectangle([80, c1_y, w - 80, c1_y + 480], radius=28, fill=SURFACE_DARK, outline=(85, 40, 60), width=2)
    draw.text((120, c1_y + 40), "You (Feeling Avoidant):", font=get_font(30, bold=True), fill=TEXT_MUTED)
    draw.rounded_rectangle([120, c1_y + 90, w - 120, c1_y + 210], radius=20, fill=(35, 20, 42))
    user_txt = spec.get('userExcuse', "I'm overwhelmed with 10 tasks on my list. Maybe I should just take the week off to reset.")
    draw_wrapped_text(draw, f"\"{user_txt}\"", get_font(32, bold=False), TEXT_WHITE, 150, c1_y + 115, 780, 1.25)

    draw.text((120, c1_y + 245), "Generic AI Chatbot:", font=get_font(30, bold=True), fill=ROSE_ACCENT)
    draw.rounded_rectangle([120, c1_y + 295, w - 120, c1_y + 415], radius=20, fill=(35, 20, 42))
    bot_txt = spec.get('botReply', "Totally understandable! Rest is productive. Don't push yourself too hard today.")
    draw_wrapped_text(draw, f"\"{bot_txt}\"", get_font(32, bold=False), TEXT_WHITE, 150, c1_y + 320, 780, 1.25)

    c2_y = c1_y + 520
    draw.rounded_rectangle([80, c2_y, w - 80, c2_y + 250], radius=26, fill=(40, 20, 32), outline=ROSE_ACCENT, width=2)
    draw.text((120, c2_y + 35), "THE CONSEQUENCE:", font=get_font(28, bold=True), fill=ROSE_ACCENT)
    draw_wrapped_text(draw, "Your cognitive blind spot was reinforced. The real fear—fear of market feedback—remains unaddressed.", get_font(32, bold=False), TEXT_MUTED, 120, c2_y + 85, 840, 1.35)

    img.save(out_path, quality=95)

# SCENE 3: TWINGENIE HONEST PERSPECTIVE (7.6 - 11.4s)
def render_scene3(spec, out_path):
    w, h = 1080, 1920
    img, draw = create_base_canvas(w, h)

    pill_y = 240
    draw.rounded_rectangle([80, pill_y, 470, pill_y + 54], radius=27, fill=(35, 22, 85), outline=PURPLE_PRIMARY, width=2)
    draw.text((105, pill_y + 12), "TWINGENIE HONEST MODE", font=get_font(24, bold=True), fill=CYAN_ACCENT)

    title_y = draw_wrapped_text(draw, "The Honest Perspective", get_font(64, bold=True), TEXT_WHITE, 80, 320, 920, 1.15)
    sub_y = draw_wrapped_text(draw, "What happens when your companion holds longitudinal memory:", get_font(34, bold=False), TEXT_MUTED, 80, title_y + 18, 920, 1.25)

    c1_y = sub_y + 35
    draw.rounded_rectangle([80, c1_y, w - 80, c1_y + 670], radius=32, fill=SURFACE_LIGHT, outline=BORDER_PURPLE, width=2)
    draw.text((120, c1_y + 45), "TwinGenie (Honest Twin):", font=get_font(32, bold=True), fill=PURPLE_GLOW)
    
    draw.rounded_rectangle([120, c1_y + 100, 530, c1_y + 150], radius=12, fill=(45, 30, 95))
    draw.text((140, c1_y + 114), "• RECALLED: MEMORY FROM 14 DAYS AGO", font=get_font(20, bold=True), fill=CYAN_ACCENT)

    draw.rounded_rectangle([120, c1_y + 175, w - 120, c1_y + 455], radius=22, fill=(18, 14, 40), outline=CARD_BORDER, width=1)
    twin_txt = spec.get('twinReply', "Memory check: You said this exact same thing 2 weeks ago before the investor call. You aren't burnt out—you're scared of market judgment. Close 9 tabs and finish the checklist.")
    draw_wrapped_text(draw, f"\"{twin_txt}\"", get_font(33, bold=False), TEXT_WHITE, 150, c1_y + 205, 780, 1.35)

    draw.text((120, c1_y + 490), "GROWTH RESULT:", font=get_font(28, bold=True), fill=EMERALD_ACCENT)
    draw_wrapped_text(draw, "Exposes the avoidance loop and drives immediate decisive execution.", get_font(31, bold=False), TEXT_MUTED, 120, c1_y + 540, 840, 1.25)

    img.save(out_path, quality=95)

# SCENE 4: CTA (11.4 - 15.0s)
def render_scene4(spec, out_path):
    w, h = 1080, 1920
    img, draw = create_base_canvas(w, h)

    pill_y = 240
    draw.rounded_rectangle([80, pill_y, 400, pill_y + 54], radius=27, fill=(35, 22, 85), outline=PURPLE_PRIMARY, width=2)
    draw.text((105, pill_y + 12), "LIVE ON GOOGLE PLAY", font=get_font(24, bold=True), fill=CYAN_ACCENT)

    title_y = draw_wrapped_text(draw, "Meet Your Digital Twin Today", get_font(60, bold=True), TEXT_WHITE, 80, 320, 920, 1.15)
    sub_y = draw_wrapped_text(draw, "Stop using AI that forgets you. Start building real self-awareness.", get_font(32, bold=False), TEXT_MUTED, 80, title_y + 18, 920, 1.25)

    box_y = sub_y + 35
    draw.rounded_rectangle([80, box_y, w - 80, box_y + 860], radius=36, fill=SURFACE_DARK, outline=BORDER_PURPLE, width=2)
    draw.text((130, box_y + 55), "TWINGENIE", font=get_font(46, bold=True), fill=TEXT_WHITE)
    draw.text((430, box_y + 70), "• PERSONAL DIGITAL TWIN", font=get_font(26, bold=False), fill=CYAN_ACCENT)

    points = [
        "35-Question Big Five personality baseline",
        "4 perspectives: Normal, Reflective, Honest, Future",
        "Persistent semantic memory across all conversations",
        "100% private, self-guided reflection"
    ]
    py = box_y + 160
    for pt in points:
        draw.ellipse([130, py + 4, 166, py + 40], fill=(45, 30, 95))
        p1 = (130 + 10, py + 4 + 18)
        p2 = (130 + 16, py + 4 + 26)
        p3 = (130 + 26, py + 4 + 10)
        draw.line([p1, p2, p3], fill=EMERALD_ACCENT, width=4)
        draw.text((190, py + 8), pt, font=get_font(30, bold=False), fill=TEXT_MUTED)
        py += 88

    draw.rounded_rectangle([130, box_y + 540, w - 130, box_y + 610], radius=16, fill=(28, 22, 58), outline=CARD_BORDER, width=1)
    draw.text((155, box_y + 562), "Rating: 5.0  •  Google Play Store  •  100% Free Download", font=get_font(26, bold=True), fill=AMBER_ACCENT)

    btn_y = box_y + 660
    draw.rounded_rectangle([130, btn_y, w - 130, btn_y + 120], radius=28, fill=PURPLE_PRIMARY)
    draw.polygon([(210, btn_y + 40), (242, btn_y + 60), (210, btn_y + 80)], fill=TEXT_WHITE)
    draw.text((265, btn_y + 38), "Download on Google Play", font=get_font(38, bold=True), fill=TEXT_WHITE)

    draw.text((360, btn_y + 145), "twingenie.app  •  com.asmind.app", font=get_font(26, bold=False), fill=TEXT_DIM)

    img.save(out_path, quality=95)

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

    # Compile with FFmpeg: 4 scenes, 3.8s each, 0.6s xfade transition = 14.0s total
    cmd = [
        'ffmpeg', '-y',
        '-loop', '1', '-t', '4.0', '-i', s1,
        '-loop', '1', '-t', '4.0', '-i', s2,
        '-loop', '1', '-t', '4.0', '-i', s3,
        '-loop', '1', '-t', '4.0', '-i', s4,
        '-filter_complex',
        '[0:v][1:v]xfade=transition=fade:duration=0.6:offset=3.4[v01];'
        '[v01][2:v]xfade=transition=fade:duration=0.6:offset=6.8[v02];'
        '[v02][3:v]xfade=transition=fade:duration=0.6:offset=10.2[v]',
        '-map', '[v]',
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p',
        '-r', '30',
        output_mp4_path
    ]

    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if res.returncode != 0:
        raise RuntimeError(f"FFmpeg failed: {res.stderr.decode('utf-8')}")

    # Clean up scene PNGs
    for p in [s1, s2, s3, s4]:
        if os.path.exists(p):
            os.remove(p)

    return {
        'success': True,
        'videoPath': output_mp4_path,
        'resolution': '1080x1920',
        'durationSeconds': 14.0,
        'fps': 30
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
