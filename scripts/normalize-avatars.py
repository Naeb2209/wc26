import os
import sys
from PIL import Image, ImageFile, ImageEnhance, ImageFilter, ImageStat

ImageFile.LOAD_TRUNCATED_IMAGES = True

# Some files are AVIF mislabeled as .png; enable AVIF/HEIF decoding if available.
try:
    from pillow_heif import register_avif_opener, register_heif_opener
    try:
        register_avif_opener()
    except Exception:
        pass
    register_heif_opener()
except Exception:
    pass

SRC = ".avatars_backup"        # originals
DST = "public/players"          # output (served)
CANVAS_W, CANVAS_H = 280, 300   # must match display frame aspect (~0.93)
TARGET_H = 276                  # player height inside canvas
BOTTOM_MARGIN = 8               # gap from bottom
ALPHA_THRESH = 16               # ignore near-transparent halo when trimming

# --- enhancement (smoothing + even lighting) ---
ENHANCE = True
TARGET_LUMA = 150               # normalize each photo's brightness toward this
LUMA_MIN, LUMA_MAX = 0.85, 1.18 # clamp brightness correction
COLOR, CONTRAST, SHARPNESS = 1.08, 1.05, 1.6
SMOOTH_BLUR = 0.4               # mild smoothing before sharpen

# Optional team filter from CLI: `python normalize-avatars.py ENG FRA`
TEAMS = {t.upper() for t in sys.argv[1:]} if len(sys.argv) > 1 else None


def alpha_bbox(im, thresh):
    a = im.split()[-1]
    # binarize alpha at threshold so faint halos don't inflate the box
    mask = a.point(lambda v: 255 if v > thresh else 0)
    return mask.getbbox()


def luma_mean(im):
    r, g, b, a = im.split()
    gray = Image.merge("RGB", (r, g, b)).convert("L")
    mask = a.point(lambda v: 255 if v > 128 else 0)
    st = ImageStat.Stat(gray, mask)
    return st.mean[0] if st.count[0] else 128


def enhance(im):
    """Even out lighting and smooth/clean the cutout."""
    r, g, b, a = im.split()
    # de-fringe: erode the semi-transparent halo by 1px, then soften the edge
    a = a.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.6))
    im = Image.merge("RGBA", (r, g, b, a))
    # normalize brightness toward a common target
    f = max(LUMA_MIN, min(LUMA_MAX, TARGET_LUMA / luma_mean(im)))
    im = ImageEnhance.Brightness(im).enhance(f)
    im = ImageEnhance.Color(im).enhance(COLOR)
    im = ImageEnhance.Contrast(im).enhance(CONTRAST)
    if SMOOTH_BLUR:
        im = im.filter(ImageFilter.GaussianBlur(SMOOTH_BLUR))
    im = ImageEnhance.Sharpness(im).enhance(SHARPNESS)
    return im


count = 0
for root, _, files in os.walk(SRC):
    team = os.path.basename(root).upper()
    if TEAMS is not None and team not in TEAMS:
        continue
    for fn in files:
        if not fn.lower().endswith((".png", ".webp", ".jpg", ".jpeg")):
            continue
        # the jersey fallback icon lives at the players root; never normalize it
        if os.path.relpath(os.path.join(root, fn), SRC).replace("\\", "/") == "image.png":
            continue
        sp = os.path.join(root, fn)
        rel = os.path.relpath(sp, SRC)
        dp = os.path.join(DST, rel)
        try:
            im = Image.open(sp).convert("RGBA")
        except Exception as e:
            print("SKIP (unreadable):", rel, "-", e)
            continue
        bbox = alpha_bbox(im, ALPHA_THRESH)
        if not bbox:
            print("SKIP (empty/opaque):", rel)
            continue
        content = im.crop(bbox)
        cw, ch = content.size
        scale = TARGET_H / ch
        nw, nh = max(1, round(cw * scale)), TARGET_H
        content = content.resize((nw, nh), Image.LANCZOS)
        if ENHANCE:
            content = enhance(content)
        canvas = Image.new("RGBA", (CANVAS_W, CANVAS_H), (0, 0, 0, 0))
        x = (CANVAS_W - nw) // 2
        y = CANVAS_H - BOTTOM_MARGIN - nh
        canvas.alpha_composite(content, (x, y))
        os.makedirs(os.path.dirname(dp), exist_ok=True)
        if dp.lower().endswith((".jpg", ".jpeg")):
            dp = os.path.splitext(dp)[0] + ".png"
        canvas.save(dp)
        count += 1
print("normalized", count, "images ->", CANVAS_W, "x", CANVAS_H,
      "| enhance:", ENHANCE, "| teams:", TEAMS or "ALL")
