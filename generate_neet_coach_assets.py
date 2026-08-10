import os
import math
from PIL import Image, ImageDraw, ImageFont, ImageFilter

output_dir = '/Users/ashwanikumar/Downloads'
os.makedirs(output_dir, exist_ok=True)

# Color Palette: Deep Emerald Green & Gold / White
BG_TOP = (6, 26, 20)      # #061A14
BG_BOTTOM = (11, 46, 35)  # #0B2E23
CARD_BG = (15, 55, 42, 230) # Glassmorphic dark green
TEXT_WHITE = (255, 255, 255)
TEXT_MUTED = (160, 200, 185)
TEAL_ACCENT = (16, 185, 129) # #10B981
GOLD_ACCENT = (245, 158, 11) # #F59E0B
GOLD_LIGHT = (252, 211, 77)

def create_emerald_gradient(width, height):
    base = Image.new('RGB', (width, height), BG_TOP)
    draw = ImageDraw.Draw(base)
    for y in range(height):
        r = int(BG_TOP[0] + (BG_BOTTOM[0] - BG_TOP[0]) * (y / height))
        g = int(BG_TOP[1] + (BG_BOTTOM[1] - BG_TOP[1]) * (y / height))
        b = int(BG_TOP[2] + (BG_BOTTOM[2] - BG_TOP[2]) * (y / height))
        draw.line([(0, y), (width, y)], fill=(r, g, b))
    
    # Add radial glow overlay
    glow = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    center_x, center_y = width // 2, height // 3
    max_radius = int(math.hypot(width, height) * 0.6)
    for r in range(max_radius, 0, -20):
        alpha = int(45 * (1 - r / max_radius))
        glow_draw.ellipse([center_x - r, center_y - r, center_x + r, center_y + r], fill=(16, 185, 129, alpha))
    
    base.paste(glow, (0, 0), glow)
    return base

def draw_header(draw, title, subtitle, font_title, font_sub, width, top_padding=100):
    # Category Tag Badge
    badge_text = "NEET 2026/2027 AI PREP PLATFORM"
    badge_bbox = draw.textbbox((0, 0), badge_text, font=font_sub)
    bw = badge_bbox[2] - badge_bbox[0] + 30
    bh = badge_bbox[3] - badge_bbox[1] + 16
    bx = (width - bw) // 2
    by = top_padding
    
    draw.rounded_rectangle([bx, by, bx + bw, by + bh], radius=12, fill=(16, 185, 129, 40), outline=TEAL_ACCENT, width=2)
    draw.text((bx + 15, by + 6), badge_text, fill=TEAL_ACCENT, font=font_sub)

    # Main Headline
    y_curr = by + bh + 30
    t_bbox = draw.textbbox((0, 0), title, font=font_title)
    tw = t_bbox[2] - t_bbox[0]
    draw.text(((width - tw) // 2, y_curr), title, fill=TEXT_WHITE, font=font_title)
    
    # Subheadline
    y_curr += t_bbox[3] - t_bbox[1] + 20
    s_bbox = draw.textbbox((0, 0), subtitle, font=font_sub)
    sw = s_bbox[2] - s_bbox[0]
    draw.text(((width - sw) // 2, y_curr), subtitle, fill=TEXT_MUTED, font=font_sub)

def draw_phone_mockup(canvas, content_img, x, y, width=700, height=1280):
    # Draw dark smartphone chassis
    draw = ImageDraw.Draw(canvas)
    
    # Glow shadow behind phone
    shadow = Image.new('RGBA', (width + 60, height + 60), (0, 0, 0, 0))
    s_draw = ImageDraw.Draw(shadow)
    s_draw.rounded_rectangle([10, 10, width + 50, height + 50], radius=50, fill=(0, 0, 0, 160))
    shadow = shadow.filter(ImageFilter.GaussianBlur(15))
    canvas.paste(shadow, (x - 30, y - 20), shadow)
    
    # Phone Body Frame
    draw.rounded_rectangle([x, y, x + width, y + height], radius=46, fill=(15, 23, 42), outline=(50, 65, 85), width=6)
    
    # Screen inner container
    margin = 14
    screen_x = x + margin
    screen_y = y + margin
    screen_w = width - (margin * 2)
    screen_h = height - (margin * 2)
    
    # Paste active Content Screen
    content_scaled = content_img.resize((screen_w, screen_h), Image.Resampling.LANCZOS)
    canvas.paste(content_scaled, (screen_x, screen_y))
    
    # Punch Hole Camera Notch (Android compliant 12:30 timestamp)
    notch_r = 10
    draw.ellipse([x + width // 2 - notch_r, y + margin + 12 - notch_r, x + width // 2 + notch_r, y + margin + 12 + notch_r], fill=(0, 0, 0))

# Load Fonts
font_title = ImageFont.load_default()
font_sub = ImageFont.load_default()
try:
    font_title = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 62)
    font_sub = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 34)
    font_body = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 26)
    font_bold = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 28)
except:
    font_body = font_sub

print("🎨 Generating NEET Coach App Icon (512x512)...")
icon = create_emerald_gradient(512, 512)
i_draw = ImageDraw.Draw(icon)

# Draw Crest Shield & Stethoscope / AI Sparkle Icon
i_draw.ellipse([106, 106, 406, 406], fill=(16, 185, 129, 50), outline=TEAL_ACCENT, width=4)
# Medical Caduceus / Cross + AI Stars in Gold
i_draw.rounded_rectangle([236, 160, 276, 352], radius=8, fill=GOLD_ACCENT)
i_draw.rounded_rectangle([160, 236, 352, 276], radius=8, fill=GOLD_ACCENT)
# Stethoscope Loop Arc
i_draw.arc([180, 180, 332, 332], start=45, end=315, fill=TEXT_WHITE, width=10)
# Gold Sparkle
i_draw.polygon([(400, 120), (410, 140), (430, 150), (410, 160), (400, 180), (390, 160), (370, 150), (390, 140)], fill=GOLD_LIGHT)
icon.save(os.path.join(output_dir, 'neet_coach_app_icon_512x512.png'))


# Mock Screen Contents Generator for 8 Screenshots
def create_mock_ui(screen_type):
    ui = Image.new('RGB', (670, 1250), (12, 24, 33))
    u_draw = ImageDraw.Draw(ui)
    
    # Status Bar Android (12:30)
    u_draw.text((30, 16), "12:30", fill=TEXT_WHITE, font=font_body)
    u_draw.text((540, 16), "5G  98%", fill=TEXT_MUTED, font=font_body)
    
    # App Header
    u_draw.rectangle([0, 50, 670, 120], fill=(18, 36, 48))
    u_draw.text((30, 72), "NEET Coach AI", fill=TEXT_WHITE, font=font_bold)
    u_draw.rounded_rectangle([520, 68, 640, 104], radius=18, fill=GOLD_ACCENT)
    u_draw.text((540, 76), "PRO", fill=(0,0,0), font=font_bold)
    
    if screen_type == 1:
        # Screen 1: Active AI Chat solving Physics
        u_draw.rounded_rectangle([30, 150, 640, 230], radius=16, fill=(25, 48, 62))
        u_draw.text((50, 170), "Student Aspirant:", fill=TEAL_ACCENT, font=font_bold)
        u_draw.text((50, 198), "How to find terminal velocity of a raindrop?", fill=TEXT_WHITE, font=font_body)
        
        u_draw.rounded_rectangle([30, 260, 640, 700], radius=20, fill=(20, 60, 48), outline=TEAL_ACCENT, width=2)
        u_draw.text((50, 280), "🤖 NEET Coach AI (Physics Expert):", fill=GOLD_LIGHT, font=font_bold)
        u_draw.text((50, 320), "1. Viscous force F = 6πηrv", fill=TEXT_WHITE, font=font_body)
        u_draw.text((50, 360), "2. Gravitational force Fg = (4/3)πr³ρg", fill=TEXT_WHITE, font=font_body)
        u_draw.text((50, 400), "3. Buoyant force Fb = (4/3)πr³σg", fill=TEXT_WHITE, font=font_body)
        u_draw.text((50, 450), "At Terminal Velocity: Fg = Fb + F", fill=GOLD_ACCENT, font=font_bold)
        u_draw.text((50, 490), "👉 v = 2r²(ρ - σ)g / 9η", fill=TEXT_WHITE, font=font_bold)
        
        # NCERT Ref Badge
        u_draw.rounded_rectangle([50, 560, 620, 660], radius=12, fill=(10, 35, 28))
        u_draw.text((70, 580), "📖 NCERT Reference:", fill=TEAL_ACCENT, font=font_bold)
        u_draw.text((70, 615), "Class 11 Physics, Chapter 10, Page 264", fill=TEXT_MUTED, font=font_body)

    elif screen_type == 2:
        # Screen 2: CUSTOM TEST GENERATOR (HIGHLIGHTED FEATURE)
        u_draw.text((30, 140), "⚙️ Custom Test Builder", fill=TEXT_WHITE, font=font_title)
        u_draw.text((30, 195), "Create personalized test as per your pace", fill=TEAL_ACCENT, font=font_body)
        
        # Subject Selector Card
        u_draw.rounded_rectangle([30, 240, 640, 380], radius=16, fill=(24, 45, 58))
        u_draw.text((50, 260), "Select Subject:", fill=TEXT_MUTED, font=font_body)
        u_draw.rounded_rectangle([50, 300, 220, 350], radius=12, fill=TEAL_ACCENT)
        u_draw.text((75, 315), "Biology", fill=(0,0,0), font=font_bold)
        u_draw.rounded_rectangle([240, 300, 410, 350], radius=12, fill=(35, 60, 75))
        u_draw.text((260, 315), "Physics", fill=TEXT_WHITE, font=font_body)
        u_draw.rounded_rectangle([430, 300, 620, 350], radius=12, fill=(35, 60, 75))
        u_draw.text((450, 315), "Chemistry", fill=TEXT_WHITE, font=font_body)
        
        # Chapter Selection Card
        u_draw.rounded_rectangle([30, 400, 640, 640], radius=16, fill=(24, 45, 58))
        u_draw.text((50, 420), "Selected Chapters (Pace Control):", fill=TEXT_MUTED, font=font_body)
        u_draw.text((50, 460), "✓ Genetics & Evolution (High Weightage)", fill=TEXT_WHITE, font=font_bold)
        u_draw.text((50, 500), "✓ Plant Physiology", fill=TEXT_WHITE, font=font_bold)
        u_draw.text((50, 540), "✓ Human Reproduction", fill=TEXT_WHITE, font=font_bold)
        u_draw.text((50, 580), "+ Add Chapter Filter", fill=TEAL_ACCENT, font=font_body)

        # Question Count & Timer Card
        u_draw.rounded_rectangle([30, 660, 640, 820], radius=16, fill=(24, 45, 58))
        u_draw.text((50, 680), "Questions: 45 MCQs  |  Timer: 60 Mins", fill=GOLD_LIGHT, font=font_bold)
        u_draw.text((50, 725), "Difficulty: NEET Standard (NCERT Strict)", fill=TEXT_WHITE, font=font_body)
        u_draw.text((50, 765), "Negative Marking (-1): Enabled", fill=TEAL_ACCENT, font=font_body)

        # Start Custom Test Button
        u_draw.rounded_rectangle([30, 860, 640, 940], radius=20, fill=GOLD_ACCENT)
        u_draw.text((180, 890), "🚀 GENERATE CUSTOM TEST NOW", fill=(0,0,0), font=font_bold)

    elif screen_type == 3:
        # Screen 3: Instant Doubt Solver Camera
        u_draw.rounded_rectangle([30, 150, 640, 500], radius=20, fill=(30, 40, 50), outline=GOLD_ACCENT, width=3)
        u_draw.text((200, 300), "📷 Camera Doubt Scanner", fill=TEXT_WHITE, font=font_bold)
        u_draw.text((160, 340), "Scanning Chemistry Question...", fill=TEAL_ACCENT, font=font_body)
        
        u_draw.rounded_rectangle([30, 540, 640, 920], radius=16, fill=(20, 60, 48))
        u_draw.text((50, 560), "✅ Identified Concept: SN1 Mechanism", fill=GOLD_LIGHT, font=font_bold)
        u_draw.text((50, 600), "Carbocation stability: 3° > 2° > 1°", fill=TEXT_WHITE, font=font_body)
        u_draw.text((50, 640), "Solvent: Polar protic (H₂O, EtOH)", fill=TEXT_WHITE, font=font_body)
        u_draw.text((50, 690), "Correct Option: (B) 3-methylbutan-2-ol", fill=TEAL_ACCENT, font=font_bold)

    elif screen_type == 4:
        # Screen 4: NCERT Line-by-Line & PYQs
        u_draw.text((30, 140), "📚 NCERT Line-by-Line PYQs", fill=TEXT_WHITE, font=font_title)
        u_draw.rounded_rectangle([30, 220, 640, 650], radius=16, fill=(24, 45, 58))
        u_draw.text((50, 240), "Q. Which organelle is known as powerhouse?", fill=TEXT_WHITE, font=font_bold)
        u_draw.rounded_rectangle([50, 300, 620, 360], radius=12, fill=(16, 185, 129, 60), outline=TEAL_ACCENT, width=2)
        u_draw.text((70, 318), "(A) Mitochondria  ✓ (Correct)", fill=TEAL_ACCENT, font=font_bold)
        u_draw.rounded_rectangle([50, 380, 620, 440], radius=12, fill=(35, 60, 75))
        u_draw.text((70, 398), "(B) Ribosome", fill=TEXT_WHITE, font=font_body)
        u_draw.rounded_rectangle([50, 460, 620, 520], radius=12, fill=(35, 60, 75))
        u_draw.text((70, 478), "(C) Lysosome", fill=TEXT_WHITE, font=font_body)
        u_draw.rounded_rectangle([50, 540, 620, 600], radius=12, fill=(35, 60, 75))
        u_draw.text((70, 558), "(D) Endoplasmic Reticulum", fill=TEXT_WHITE, font=font_body)

    elif screen_type == 5:
        # Screen 5: AIR Predictor & Score Card
        u_draw.rounded_rectangle([30, 150, 640, 400], radius=24, fill=(24, 60, 45), outline=GOLD_ACCENT, width=3)
        u_draw.text((50, 180), "🏆 Full Mock Test #12 Result", fill=TEXT_WHITE, font=font_bold)
        u_draw.text((50, 230), "Score: 685 / 720", fill=GOLD_LIGHT, font=font_title)
        u_draw.text((50, 300), "Predicted All India Rank (AIR):", fill=TEXT_MUTED, font=font_body)
        u_draw.text((50, 340), "AIR 482 (Govt MBBS Guaranteed)", fill=TEAL_ACCENT, font=font_bold)
        
        u_draw.rounded_rectangle([30, 430, 640, 850], radius=16, fill=(24, 45, 58))
        u_draw.text((50, 450), "Subject Breakdown:", fill=TEXT_WHITE, font=font_bold)
        u_draw.text((50, 500), "Biology: 355/360 (98% Accuracy)", fill=TEAL_ACCENT, font=font_body)
        u_draw.text((50, 550), "Physics: 165/180 (92% Accuracy)", fill=TEAL_ACCENT, font=font_body)
        u_draw.text((50, 600), "Chemistry: 165/180 (92% Accuracy)", fill=TEAL_ACCENT, font=font_body)

    elif screen_type == 6:
        # Screen 6: Weakness & Negative Marks Analytics
        u_draw.text((30, 140), "📊 AI Weakness Analytics", fill=TEXT_WHITE, font=font_title)
        u_draw.rounded_rectangle([30, 220, 640, 550], radius=16, fill=(24, 45, 58))
        u_draw.text((50, 240), "⚠️ High Negative Marks Detected:", fill=(239, 68, 68), font=font_bold)
        u_draw.text((50, 290), "• Physics: Equilibrium (-12 marks)", fill=TEXT_WHITE, font=font_body)
        u_draw.text((50, 330), "• Chemistry: Ionic Equilibrium (-8 marks)", fill=TEXT_WHITE, font=font_body)
        u_draw.rounded_rectangle([50, 400, 620, 500], radius=12, fill=TEAL_ACCENT)
        u_draw.text((120, 435), "⚡ 1-Click Targeted Practice Test", fill=(0,0,0), font=font_bold)

    elif screen_type == 7:
        # Screen 7: Flashcards & Revision Deck
        u_draw.text((30, 140), "🎴 Formula & Revision Flashcards", fill=TEXT_WHITE, font=font_title)
        u_draw.rounded_rectangle([50, 220, 620, 750], radius=24, fill=(30, 70, 55), outline=TEAL_ACCENT, width=3)
        u_draw.text((80, 260), "BIOLOGY FLASHCARD #412", fill=GOLD_LIGHT, font=font_bold)
        u_draw.text((80, 320), "Concept: Krebs Cycle ATP Yield", fill=TEXT_WHITE, font=font_bold)
        u_draw.text((80, 380), "• 1 Acetyl CoA = 10 ATP", fill=TEXT_MUTED, font=font_body)
        u_draw.text((80, 420), "• 3 NADH = 7.5 ATP", fill=TEXT_MUTED, font=font_body)
        u_draw.text((80, 460), "• 1 FADH₂ = 1.5 ATP", fill=TEXT_MUTED, font=font_body)
        u_draw.text((80, 500), "• 1 GTP = 1 ATP", fill=TEXT_MUTED, font=font_body)
        u_draw.text((80, 600), "👈 Swipe Left: Mastered", fill=TEAL_ACCENT, font=font_body)
        u_draw.text((80, 640), "👉 Swipe Right: Needs Review", fill=GOLD_ACCENT, font=font_body)

    elif screen_type == 8:
        # Screen 8: CTA Final Call
        u_draw.rounded_rectangle([30, 200, 640, 600], radius=24, fill=(24, 60, 45), outline=GOLD_ACCENT, width=4)
        u_draw.text((120, 250), "🩺 YOUR MBBS JOURNEY STARTS HERE", fill=GOLD_LIGHT, font=font_bold)
        u_draw.text((80, 320), "Join 100,000+ NEET Aspirants", fill=TEXT_WHITE, font=font_title)
        u_draw.text((80, 400), "✓ AI Doubt Solver  ✓ Custom Tests", fill=TEAL_ACCENT, font=font_bold)
        u_draw.text((80, 450), "✓ 30+ Yrs PYQs   ✓ AIR Predictor", fill=TEAL_ACCENT, font=font_bold)
        
        u_draw.rounded_rectangle([80, 510, 590, 570], radius=16, fill=GOLD_ACCENT)
        u_draw.text((160, 530), "🎓 START PREPARING FOR FREE", fill=(0,0,0), font=font_bold)
        
    return ui


print("📱 Generating 8 Phone Screenshots (1080x1920)...")
screenshot_data = [
    ("Your Personal AI NEET Coach", "Master Physics, Chemistry & Biology with 24/7 AI Guidance"),
    ("Customized Test Generator", "Create Chapter-wise Tests at Your Own Pace & Difficulty"),
    ("Instant 24/7 AI Doubt Solver", "Step-by-Step Physics, Chemistry & Biology Solutions"),
    ("30+ Years PYQs & NCERT Line-by-Line", "Master Every Chapter with NCERT Page References"),
    ("Real NEET Exam Simulator & AIR Predictor", "Know Your All India Rank & Accuracy Breakdown"),
    ("AI Weakness Analytics & Repair", "Identify High Negative Marks & Practice Targeted MCQs"),
    ("Quick Revision Flashcards & Formula Deck", "Revise 10,000+ Key Concepts & Reaction Mechanisms"),
    ("Crack NEET 2026/2027 With Confidence", "Join 100,000+ Medical Aspirants On Their Journey To MBBS")
]

for idx, (title, sub) in enumerate(screenshot_data, start=1):
    canvas = create_emerald_gradient(1080, 1920)
    draw = ImageDraw.Draw(canvas)
    draw_header(draw, title, sub, font_title, font_sub, 1080)
    
    # Generate content screen
    ui_content = create_mock_ui(idx)
    draw_phone_mockup(canvas, ui_content, x=190, y=520, width=700, height=1320)
    
    canvas.save(os.path.join(output_dir, f'neet_coach_screenshot_{idx}.jpg'), quality=95)
    
    # Generate 7-inch Tablet Version (1200x1920)
    tab_7 = Image.new('RGB', (1200, 1920), BG_TOP)
    t7_draw = ImageDraw.Draw(tab_7)
    for y in range(1920):
        g_val = int(BG_TOP[1] + (BG_BOTTOM[1] - BG_TOP[1]) * (y / 1920))
        t7_draw.line([(0, y), (1200, y)], fill=(BG_TOP[0], g_val, BG_TOP[2]))
    x_off = (1200 - 1080) // 2
    tab_7.paste(canvas, (x_off, 0))
    tab_7.save(os.path.join(output_dir, f'neet_coach_tablet_7inch_screenshot_{idx}.jpg'), quality=95)

    # Generate 10-inch Tablet Version (1600x2560)
    tab_10 = Image.new('RGB', (1600, 2560), BG_TOP)
    t10_draw = ImageDraw.Draw(tab_10)
    for y in range(2560):
        g_val = int(BG_TOP[1] + (BG_BOTTOM[1] - BG_TOP[1]) * (y / 2560))
        t10_draw.line([(0, y), (1600, y)], fill=(BG_TOP[0], g_val, BG_TOP[2]))
    c_scaled = canvas.resize((1440, 2560), Image.Resampling.LANCZOS)
    tab_10.paste(c_scaled, (80, 0))
    tab_10.save(os.path.join(output_dir, f'neet_coach_tablet_10inch_screenshot_{idx}.jpg'), quality=95)

print("🖼️ Generating Feature Graphic (1024x500)...")
fg = create_emerald_gradient(1024, 500)
fg_draw = ImageDraw.Draw(fg)
fg_draw.text((60, 120), "NEET Coach AI", fill=TEXT_WHITE, font=ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 52))
fg_draw.text((60, 195), "Your Personal AI Medical Entrance Tutor", fill=GOLD_LIGHT, font=ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 28))
fg_draw.text((60, 250), "✓ AI Doubt Solver  ✓ Customized Test Generator", fill=TEXT_MUTED, font=font_body)
fg_draw.text((60, 290), "✓ 30+ Yrs PYQs    ✓ NCERT Line-by-Line", fill=TEXT_MUTED, font=font_body)

fg_ui = create_mock_ui(2)
draw_phone_mockup(fg, fg_ui, x=620, y=50, width=350, height=640)
fg.save(os.path.join(output_dir, 'neet_coach_feature_graphic.jpg'), quality=95)

print("🖼️ Generating Promotional Banner (1920x1080)...")
pb = create_emerald_gradient(1920, 1080)
pb_draw = ImageDraw.Draw(pb)
pb_draw.text((100, 240), "NEET Coach AI", fill=TEXT_WHITE, font=ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 80))
pb_draw.text((100, 340), "Crack NEET 2026/2027 With AI Precision", fill=GOLD_LIGHT, font=ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 40))
pb_draw.text((100, 420), "Customized Tests • Instant Doubt Solver • AIR Rank Predictor", fill=TEXT_MUTED, font=font_sub)

pb_ui1 = create_mock_ui(2)
pb_ui2 = create_mock_ui(5)
draw_phone_mockup(pb, pb_ui1, x=1050, y=140, width=420, height=840)
draw_phone_mockup(pb, pb_ui2, x=1420, y=220, width=400, height=800)
pb.save(os.path.join(output_dir, 'neet_coach_promotional_banner.jpg'), quality=95)

print("🎉 ALL NEET COACH ASSETS GENERATED SUCCESSFULLY IN ~/Downloads!")
