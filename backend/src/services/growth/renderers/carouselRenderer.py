#!/usr/bin/env python3
"""
TwinGenie Automated Carousel & PDF Slide Renderer
Renders high-converting 1080x1350 slides and multi-page PDF documents for LinkedIn, Instagram & Facebook.
"""

import os
import sys
import json
from PIL import Image, ImageDraw, ImageFont, ImageFilter

BG_COLOR = (11, 8, 25)           # Deep Obsidian #0B0819
CARD_BG = (22, 17, 45)           # Surface #16112D
CARD_BORDER = (46, 36, 86)       # Border #2E2456
PURPLE_PRIMARY = (147, 51, 234)  # #9333EA
PURPLE_GLOW = (168, 85, 247)     # #A855F7
CYAN_ACCENT = (59, 130, 246)     # #3B82F6
TEXT_WHITE = (255, 255, 255)
TEXT_MUTED = (160, 165, 185)
TEXT_DIM = (107, 114, 128)

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

def draw_wrapped_text(draw, text, font, fill, x, y, max_width, line_spacing=1.3):
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

def render_slide(slide_data, slide_index, total_slides, output_path):
    w, h = 1080, 1350
    img = Image.new('RGB', (w, h), BG_COLOR)
    draw = ImageDraw.Draw(img)

    # Ambient radial top glow
    glow = Image.new('RGB', (w, h), (0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    glow_draw.ellipse([-150, -150, 1230, 600], fill=(65, 20, 105))
    glow = glow.filter(ImageFilter.GaussianBlur(140))
    img = Image.blend(img, glow, 0.70)
    draw = ImageDraw.Draw(img)

    # Header Bar: Brand tag & Slide number
    font_brand = get_font(24, bold=True)
    font_num = get_font(24, bold=True)
    
    # Brand badge
    draw.text((80, 75), "TWINGENIE", font=font_brand, fill=PURPLE_GLOW)
    bbox_b = draw.textbbox((80, 75), "TWINGENIE", font=font_brand)
    draw.text((bbox_b[2] + 15, 75), "•  PERSONAL AI", font=font_brand, fill=TEXT_MUTED)
    
    # Slide counter pill
    counter_str = f"{slide_index:02d} / {total_slides:02d}"
    bbox_cnt = draw.textbbox((0, 0), counter_str, font=font_num)
    cnt_w = bbox_cnt[2] - bbox_cnt[0]
    draw.text((w - 80 - cnt_w, 75), counter_str, font=font_num, fill=TEXT_WHITE)

    # Category / Tag pill
    tag_text = slide_data.get('tag', 'COGNITIVE ARCHITECTURE').upper()
    font_tag = get_font(20, bold=True)
    bbox_t = draw.textbbox((0, 0), tag_text, font=font_tag)
    pill_w = bbox_t[2] - bbox_t[0] + 32
    pill_h = 36
    pill_y = 150
    draw.rounded_rectangle([80, pill_y, 80 + pill_w, pill_y + pill_h], radius=18, fill=(35, 25, 70), outline=CARD_BORDER, width=1)
    draw.text((96, pill_y + 8), tag_text, font=font_tag, fill=CYAN_ACCENT)

    # Title / Hook
    title_text = slide_data.get('title', 'Your Mind Has Blind Spots')
    font_title = get_font(52, bold=True)
    cur_y = draw_wrapped_text(draw, title_text, font_title, TEXT_WHITE, 80, pill_y + 70, max_width=920, line_spacing=1.2)

    # Content Card
    card_top = cur_y + 40
    card_bot = h - 200
    if card_bot > card_top + 100:
        draw.rounded_rectangle([80, card_top, w - 80, card_bot], radius=24, fill=CARD_BG, outline=CARD_BORDER, width=2)
        
        # Subtitle / Key statement inside card
        card_content = slide_data.get('content', '')
        font_body = get_font(32, bold=False)
        inner_y = card_top + 50
        
        # Highlight banner or mode callout if provided
        highlight = slide_data.get('highlight')
        if highlight:
            font_hl = get_font(26, bold=True)
            draw.rounded_rectangle([120, inner_y, w - 120, inner_y + 55], radius=12, fill=(45, 30, 90))
            draw.text((140, inner_y + 14), highlight, font=font_hl, fill=PURPLE_GLOW)
            inner_y += 85

        draw_wrapped_text(draw, card_content, font_body, TEXT_MUTED, 120, inner_y, max_width=840, line_spacing=1.35)

    # Footer CTA
    footer_text = "Swipe to explore →" if slide_index < total_slides else "Download TwinGenie on Google Play 📲"
    font_footer = get_font(26, bold=(slide_index == total_slides))
    footer_fill = PURPLE_GLOW if slide_index == total_slides else TEXT_MUTED
    draw.text((80, h - 110), footer_text, font=font_footer, fill=footer_fill)

    # Save PNG
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
