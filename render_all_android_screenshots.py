import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

output_dir = '/Users/ashwanikumar/Downloads'

BG_TOP = (9, 13, 22)      # #090D16
BG_BOTTOM = (15, 23, 42)  # #0F172A
TEXT_WHITE = (255, 255, 255)
TEAL_ACCENT = (16, 185, 129)
CYAN_GLOW = (6, 182, 212)
GOLD_ACCENT = (245, 158, 11)

def create_android_screenshot(idx, title, subtitle):
    # 1080x1920 4K Canvas
    width, height = 1080, 1920
    canvas = Image.new('RGB', (width, height), BG_TOP)
    draw = ImageDraw.Draw(canvas)
    
    # Background gradient
    for y in range(height):
        r = int(BG_TOP[0] + (BG_BOTTOM[0] - BG_TOP[0]) * (y / height))
        g = int(BG_TOP[1] + (BG_BOTTOM[1] - BG_TOP[1]) * (y / height))
        b = int(BG_TOP[2] + (BG_BOTTOM[2] - BG_TOP[2]) * (y / height))
        draw.line([(0, y), (width, y)], fill=(r, g, b))
        
    # Subtle Cyber Grid Lines
    for x_line in range(0, width, 120):
        draw.line([(x_line, 0), (x_line, height)], fill=(20, 35, 55), width=1)
    for y_line in range(0, height, 120):
        draw.line([(0, y_line), (width, y_line)], fill=(20, 35, 55), width=1)

    # Fonts
    font_title = ImageFont.load_default()
    font_sub = ImageFont.load_default()
    font_bold = ImageFont.load_default()
    try:
        font_title = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 50)
        font_sub = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', 28)
        font_bold = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 26)
    except:
        pass

    # Top Category Badge
    badge_text = "AI NEET MEDICAL ENTRANCE PREP"
    b_bbox = draw.textbbox((0, 0), badge_text, font=font_sub)
    bw = b_bbox[2] - b_bbox[0] + 32
    bh = b_bbox[3] - b_bbox[1] + 16
    bx = (width - bw) // 2
    by = 90
    draw.rounded_rectangle([bx, by, bx + bw, by + bh], radius=12, fill=(16, 185, 129, 40), outline=TEAL_ACCENT, width=2)
    draw.text((bx + 16, by + 6), badge_text, fill=TEAL_ACCENT, font=font_sub)

    # Title
    t_bbox = draw.textbbox((0, 0), title, font=font_title)
    tw = t_bbox[2] - t_bbox[0]
    draw.text(((width - tw) // 2, by + bh + 24), title, fill=TEXT_WHITE, font=font_title)

    # Subtitle
    s_bbox = draw.textbbox((0, 0), subtitle, font=font_sub)
    sw = s_bbox[2] - s_bbox[0]
    draw.text(((width - sw) // 2, by + bh + 90), subtitle, fill=(160, 200, 220), font=font_sub)

    # 100% Android Smartphone Frame
    phone_w, phone_h = 740, 1380
    phone_x = (width - phone_w) // 2
    phone_y = 460

    # Phone Shadow
    shadow = Image.new('RGBA', (phone_w + 60, phone_h + 60), (0,0,0,0))
    s_draw = ImageDraw.Draw(shadow)
    s_draw.rounded_rectangle([10, 10, phone_w + 50, phone_h + 50], radius=54, fill=(0, 0, 0, 180))
    shadow = shadow.filter(ImageFilter.GaussianBlur(20))
    canvas.paste(shadow, (phone_x - 30, phone_y - 20), shadow)

    # Android Titanium Outer Frame
    draw.rounded_rectangle([phone_x, phone_y, phone_x + phone_w, phone_y + phone_h], radius=48, fill=(15, 23, 42), outline=(55, 75, 100), width=6)

    # Android Screen Area
    margin = 12
    screen_x = phone_x + margin
    screen_y = phone_y + margin
    screen_w = phone_w - (margin * 2)
    screen_h = phone_h - (margin * 2)

    # Screen Background
    draw.rounded_rectangle([screen_x, screen_y, screen_x + screen_w, screen_y + screen_h], radius=38, fill=(12, 20, 30))

    # Android Status Bar (9:41 AM | 5G | 100%)
    draw.text((screen_x + 30, screen_y + 16), "9:41", fill=TEXT_WHITE, font=font_bold)
    draw.text((screen_x + screen_w - 140, screen_y + 16), "5G  100%", fill=(180, 210, 230), font=font_bold)

    # ANDROID CENTER PUNCH-HOLE CAMERA (NO IPHONE NOTCH / DYNAMIC ISLAND)
    camera_r = 10
    camera_cx = screen_x + (screen_w // 2)
    camera_cy = screen_y + 24
    draw.ellipse([camera_cx - camera_r, camera_cy - camera_r, camera_cx + camera_r, camera_cy + camera_r], fill=(0, 0, 0), outline=(30, 45, 60), width=2)

    # App Screen Header
    draw.rectangle([screen_x, screen_y + 50, screen_x + screen_w, screen_y + 120], fill=(18, 32, 45))
    draw.text((screen_x + 30, screen_y + 72), "AI NEET Coach", fill=TEXT_WHITE, font=font_bold)
    draw.rounded_rectangle([screen_x + screen_w - 140, screen_y + 68, screen_x + screen_w - 30, screen_y + 104], radius=16, fill=GOLD_ACCENT)
    draw.text((screen_x + screen_w - 120, screen_y + 74), "PRO", fill=(0,0,0), font=font_bold)

    # Screen Specific UI Content (Android UI)
    content_y = screen_y + 140
    
    if idx == 1:
        # Physics AI Tutor
        draw.rounded_rectangle([screen_x + 20, content_y, screen_x + screen_w - 20, content_y + 80], radius=16, fill=(25, 45, 60))
        draw.text((screen_x + 40, content_y + 15), "Student:", fill=CYAN_GLOW, font=font_bold)
        draw.text((screen_x + 40, content_y + 45), "Explain Terminal Velocity formula step-by-step", fill=TEXT_WHITE, font=font_sub)
        
        draw.rounded_rectangle([screen_x + 20, content_y + 100, screen_x + screen_w - 20, content_y + 520], radius=20, fill=(18, 55, 45), outline=TEAL_ACCENT, width=2)
        draw.text((screen_x + 40, content_y + 120), "🤖 AI Physics Expert (NCERT Verified):", fill=GOLD_ACCENT, font=font_bold)
        draw.text((screen_x + 40, content_y + 160), "Formula: vₜ = 2r²(ρ - σ)g / 9η", fill=TEXT_WHITE, font=font_title)
        draw.text((screen_x + 40, content_y + 240), "1. Viscous drag Fv = 6πηrv", fill=TEXT_WHITE, font=font_sub)
        draw.text((screen_x + 40, content_y + 280), "2. Buoyancy Fb = (4/3)πr³σg", fill=TEXT_WHITE, font=font_sub)
        draw.text((screen_x + 40, content_y + 320), "3. Equilibrium: Fg = Fb + Fv", fill=TEXT_WHITE, font=font_sub)
        
        draw.rounded_rectangle([screen_x + 40, content_y + 380, screen_x + screen_w - 40, content_y + 480], radius=14, fill=(10, 30, 24))
        draw.text((screen_x + 60, content_y + 400), "📖 NCERT Reference:", fill=TEAL_ACCENT, font=font_bold)
        draw.text((screen_x + 60, content_y + 435), "Class 11 Physics, Chapter 10, Page 264", fill=(160, 200, 185), font=font_sub)

    elif idx == 2:
        # Custom Test Builder
        draw.text((screen_x + 20, content_y), "⚙️ Custom Test Builder", fill=TEXT_WHITE, font=font_title)
        draw.text((screen_x + 20, content_y + 55), "Create personalized test as per your pace", fill=CYAN_GLOW, font=font_sub)
        
        draw.rounded_rectangle([screen_x + 20, content_y + 100, screen_x + screen_w - 20, content_y + 230], radius=16, fill=(24, 45, 58))
        draw.text((screen_x + 40, content_y + 120), "Select Subject:", fill=(160, 200, 220), font=font_sub)
        draw.rounded_rectangle([screen_x + 40, content_y + 160, screen_x + 220, content_y + 210], radius=12, fill=TEAL_ACCENT)
        draw.text((screen_x + 70, content_y + 175), "Biology", fill=(0,0,0), font=font_bold)
        draw.rounded_rectangle([screen_x + 240, content_y + 160, screen_x + 410, content_y + 210], radius=12, fill=(35, 60, 75))
        draw.text((screen_x + 270, content_y + 175), "Physics", fill=TEXT_WHITE, font=font_sub)
        
        draw.rounded_rectangle([screen_x + 20, content_y + 250, screen_x + screen_w - 20, content_y + 500], radius=16, fill=(24, 45, 58))
        draw.text((screen_x + 40, content_y + 270), "Select Chapters (Pace Control):", fill=(160, 200, 220), font=font_sub)
        draw.text((screen_x + 40, content_y + 310), "✓ Genetics & Evolution", fill=TEXT_WHITE, font=font_bold)
        draw.text((screen_x + 40, content_y + 350), "✓ Human Reproduction", fill=TEXT_WHITE, font=font_bold)
        draw.text((screen_x + 40, content_y + 390), "✓ Plant Physiology", fill=TEXT_WHITE, font=font_bold)

        draw.rounded_rectangle([screen_x + 20, content_y + 520, screen_x + screen_w - 20, content_y + 600], radius=20, fill=GOLD_ACCENT)
        draw.text((screen_x + 160, content_y + 550), "🚀 START CUSTOM TEST NOW", fill=(0,0,0), font=font_bold)

    elif idx == 3:
        # Camera Doubt Scanner
        draw.rounded_rectangle([screen_x + 20, content_y, screen_x + screen_w - 20, content_y + 240], radius=16, fill=(30, 42, 54), outline=CYAN_GLOW, width=2)
        draw.text((screen_x + 140, content_y + 80), "📷 Camera Doubt Scanner", fill=TEXT_WHITE, font=font_bold)
        draw.text((screen_x + 120, content_y + 120), "Scanning Chemistry Question...", fill=CYAN_GLOW, font=font_sub)
        
        draw.rounded_rectangle([screen_x + 20, content_y + 260, screen_x + screen_w - 20, content_y + 580], radius=18, fill=(18, 55, 45))
        draw.text((screen_x + 40, content_y + 280), "✅ Identified: SN1 Reaction Mechanism", fill=GOLD_ACCENT, font=font_bold)
        draw.text((screen_x + 40, content_y + 330), "• Carbocation stability: 3° > 2° > 1°", fill=TEXT_WHITE, font=font_sub)
        draw.text((screen_x + 40, content_y + 370), "• Solvent: Polar Protic (H₂O)", fill=TEXT_WHITE, font=font_sub)
        draw.text((screen_x + 40, content_y + 420), "Correct Option: (B) 3-methylbutan-2-ol", fill=TEAL_ACCENT, font=font_bold)

    elif idx == 4:
        # PYQs & NCERT
        draw.text((screen_x + 20, content_y), "📚 30+ Yrs PYQs & NCERT", fill=TEXT_WHITE, font=font_title)
        draw.rounded_rectangle([screen_x + 20, content_y + 80, screen_x + screen_w - 20, content_y + 520], radius=16, fill=(24, 45, 58))
        draw.text((screen_x + 40, content_y + 100), "Q. Powerhouse of the cell?", fill=TEXT_WHITE, font=font_bold)
        draw.rounded_rectangle([screen_x + 40, content_y + 150, screen_x + screen_w - 40, content_y + 210], radius=12, fill=(16, 185, 129, 60), outline=TEAL_ACCENT, width=2)
        draw.text((screen_x + 60, content_y + 168), "(A) Mitochondria  ✓ (Correct)", fill=TEAL_ACCENT, font=font_bold)
        draw.rounded_rectangle([screen_x + 40, content_y + 230, screen_x + screen_w - 40, content_y + 290], radius=12, fill=(35, 60, 75))
        draw.text((screen_x + 60, content_y + 248), "(B) Ribosome", fill=TEXT_WHITE, font=font_sub)

    elif idx == 5:
        # AIR Predictor
        draw.rounded_rectangle([screen_x + 20, content_y, screen_x + screen_w - 20, content_y + 220], radius=20, fill=(24, 60, 45), outline=GOLD_ACCENT, width=3)
        draw.text((screen_x + 40, content_y + 30), "🏆 Full Mock Test Result", fill=TEXT_WHITE, font=font_bold)
        draw.text((screen_x + 40, content_y + 70), "Score: 685 / 720", fill=GOLD_ACCENT, font=font_title)
        draw.text((screen_x + 40, content_y + 140), "AIR 482 (Govt MBBS Guaranteed)", fill=TEAL_ACCENT, font=font_bold)
        
        draw.rounded_rectangle([screen_x + 20, content_y + 240, screen_x + screen_w - 20, content_y + 550], radius=16, fill=(24, 45, 58))
        draw.text((screen_x + 40, content_y + 260), "Biology: 355 / 360 (98%)", fill=TEAL_ACCENT, font=font_sub)
        draw.text((screen_x + 40, content_y + 310), "Physics: 165 / 180 (92%)", fill=TEAL_ACCENT, font=font_sub)
        draw.text((screen_x + 40, content_y + 360), "Chemistry: 165 / 180 (92%)", fill=TEAL_ACCENT, font=font_sub)

    elif idx == 6:
        # Weakness Analytics
        draw.text((screen_x + 20, content_y), "📊 AI Weakness Analytics", fill=TEXT_WHITE, font=font_title)
        draw.rounded_rectangle([screen_x + 20, content_y + 80, screen_x + screen_w - 20, content_y + 420], radius=16, fill=(24, 45, 58))
        draw.text((screen_x + 40, content_y + 100), "⚠️ High Negative Mark Chapters:", fill=(239, 68, 68), font=font_bold)
        draw.text((screen_x + 40, content_y + 150), "• Physics: Equilibrium (-12 marks)", fill=TEXT_WHITE, font=font_sub)
        draw.text((screen_x + 40, content_y + 190), "• Chemistry: Ionic Equilibrium (-8 marks)", fill=TEXT_WHITE, font=font_sub)
        draw.rounded_rectangle([screen_x + 40, content_y + 270, screen_x + screen_w - 40, content_y + 340], radius=14, fill=TEAL_ACCENT)
        draw.text((screen_x + 100, content_y + 298), "⚡ 1-Click Targeted Repair Drill", fill=(0,0,0), font=font_bold)

    elif idx == 7:
        # Flashcards
        draw.text((screen_x + 20, content_y), "🎴 Formula & Flashcards Deck", fill=TEXT_WHITE, font=font_title)
        draw.rounded_rectangle([screen_x + 30, content_y + 80, screen_x + screen_w - 30, content_y + 500], radius=20, fill=(28, 62, 50), outline=TEAL_ACCENT, width=3)
        draw.text((screen_x + 60, content_y + 120), "BIOLOGY FLASHCARD #412", fill=GOLD_ACCENT, font=font_bold)
        draw.text((screen_x + 60, content_y + 170), "Concept: Krebs Cycle ATP Yield", fill=TEXT_WHITE, font=font_bold)
        draw.text((screen_x + 60, content_y + 230), "• 1 Acetyl CoA = 10 ATP", fill=(180, 210, 200), font=font_sub)
        draw.text((screen_x + 60, content_y + 270), "• 3 NADH = 7.5 ATP", fill=(180, 210, 200), font=font_sub)
        draw.text((screen_x + 60, content_y + 350), "👈 Swipe Left: Mastered", fill=TEAL_ACCENT, font=font_sub)
        draw.text((screen_x + 60, content_y + 390), "👉 Swipe Right: Needs Review", fill=GOLD_ACCENT, font=font_sub)

    elif idx == 8:
        # Final CTA
        draw.rounded_rectangle([screen_x + 20, content_y + 40, screen_x + screen_w - 20, content_y + 480], radius=24, fill=(24, 60, 45), outline=GOLD_ACCENT, width=3)
        draw.text((screen_x + 60, content_y + 80), "🩺 YOUR MBBS JOURNEY STARTS HERE", fill=GOLD_ACCENT, font=font_bold)
        draw.text((screen_x + 40, content_y + 140), "Crack NEET With Confidence", fill=TEXT_WHITE, font=font_title)
        draw.text((screen_x + 40, content_y + 220), "✓ AI Doubt Solver  ✓ Custom Tests", fill=TEAL_ACCENT, font=font_bold)
        draw.text((screen_x + 40, content_y + 270), "✓ 30+ Yrs PYQs   ✓ AIR Predictor", fill=TEAL_ACCENT, font=font_bold)
        draw.rounded_rectangle([screen_x + 60, content_y + 350, screen_x + screen_w - 60, content_y + 420], radius=16, fill=GOLD_ACCENT)
        draw.text((screen_x + 120, content_y + 376), "🎓 START PREPARING FOR FREE", fill=(0,0,0), font=font_bold)

    # ANDROID SOFTKEYS NAVIGATION BAR AT BOTTOM (NO IPHONE BAR)
    nav_y = screen_y + screen_h - 40
    draw.rectangle([screen_x, nav_y - 10, screen_x + screen_w, screen_y + screen_h - 10], fill=(8, 14, 22))
    
    # Android Softkey Icons: ||| (Recents), ◯ (Home), < (Back)
    draw.text((screen_x + (screen_w // 4) - 10, nav_y), "|||", fill=(160, 180, 200), font=font_bold)
    draw.ellipse([screen_x + (screen_w // 2) - 10, nav_y + 2, screen_x + (screen_w // 2) + 10, nav_y + 22], outline=(160, 180, 200), width=3)
    draw.text((screen_x + (3 * screen_w // 4) - 10, nav_y), "<", fill=(160, 180, 200), font=font_bold)

    # Save 4K Phone Screenshot
    dst = os.path.join(output_dir, f'neet_coach_4k_screenshot_{idx}.jpg')
    canvas.save(dst, quality=98)
    print(f'Generated 100% Android 4K Screenshot {idx}: {dst}')

    # Generate 7-inch Tablet Version (1200x1920)
    t7 = Image.new('RGB', (1200, 1920), BG_TOP)
    t7_draw = ImageDraw.Draw(t7)
    for y in range(1920):
        g_val = int(BG_TOP[1] + (BG_BOTTOM[1] - BG_TOP[1]) * (y / 1920))
        t7_draw.line([(0, y), (1200, y)], fill=(BG_TOP[0], g_val, BG_TOP[2]))
    x_off = (1200 - 1080) // 2
    t7.paste(canvas, (x_off, 0))
    t7.save(os.path.join(output_dir, f'neet_coach_4k_tablet_7inch_screenshot_{idx}.jpg'), quality=98)

    # Generate 10-inch Tablet Version (1600x2560)
    t10 = Image.new('RGB', (1600, 2560), BG_TOP)
    t10_draw = ImageDraw.Draw(t10)
    for y in range(2560):
        g_val = int(BG_TOP[1] + (BG_BOTTOM[1] - BG_TOP[1]) * (y / 2560))
        t10_draw.line([(0, y), (1600, y)], fill=(BG_TOP[0], g_val, BG_TOP[2]))
    c_scaled = canvas.resize((1440, 2560), Image.Resampling.LANCZOS)
    tab_x_off = (1600 - 1440) // 2
    t10.paste(c_scaled, (tab_x_off, 0))
    t10.save(os.path.join(output_dir, f'neet_coach_4k_tablet_10inch_screenshot_{idx}.jpg'), quality=98)

screenshots = [
    ("Your Personal AI NEET Tutor", "Master Physics, Chemistry & Biology with 24/7 AI Guidance"),
    ("Customized Test Generator", "Create Chapter-wise Tests at Your Own Pace & Difficulty"),
    ("Instant 24/7 AI Doubt Solver", "Step-by-Step Physics, Chemistry & Biology Solutions"),
    ("30+ Years PYQs & NCERT Line-by-Line", "Master Every Chapter with NCERT Page References"),
    ("Real NEET Exam Simulator & AIR Predictor", "Know Your All India Rank & Accuracy Breakdown"),
    ("AI Weakness Analytics & Repair", "Identify High Negative Marks & Practice Targeted MCQs"),
    ("Quick Revision Flashcards & Formula Deck", "Revise 10,000+ Key Concepts & Reaction Mechanisms"),
    ("Crack NEET With Confidence", "Join 100,000+ Medical Aspirants On Their Journey To MBBS")
]

for idx, (title, sub) in enumerate(screenshots, start=1):
    create_android_screenshot(idx, title, sub)

print("🎉 ALL 8 SCREENSHOTS RE-GENERATED IN 100% ANDROID HARDWARE FRAMES WITH NO YEARS!")
