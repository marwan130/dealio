from pathlib import Path

import numpy as np
from PIL import Image, ImageEnhance, ImageOps


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "design-assets/dealio-context/source"
OUTPUT = ROOT / "public/dealio-context/processed"

PALETTE = [
    (24, 39, 51),
    (40, 75, 96),
    (112, 129, 136),
    (205, 111, 99),
    (246, 241, 232),
]
BAYER_8 = [
    [0, 48, 12, 60, 3, 51, 15, 63],
    [32, 16, 44, 28, 35, 19, 47, 31],
    [8, 56, 4, 52, 11, 59, 7, 55],
    [40, 24, 36, 20, 43, 27, 39, 23],
    [2, 50, 14, 62, 1, 49, 13, 61],
    [34, 18, 46, 30, 33, 17, 45, 29],
    [10, 58, 6, 54, 9, 57, 5, 53],
    [42, 26, 38, 22, 41, 25, 37, 21],
]

SOURCES = {
    "tech-desk": {
        "file": "tech-desk.jpg",
        "crop": (0.0, 0.12, 1.0, 1.0),
        "contrast": 1.34,
        "brightness": 0.88,
        "dither": 12,
        "quality": 40,
        "size": (1200, 900),
    },
    "headphones": {
        "file": "headphones.jpg",
        "crop": (0.0, 0.0, 0.98, 1.0),
        "contrast": 1.45,
        "brightness": 0.9,
        "dither": 14,
        "quality": 42,
        "size": (1100, 825),
    },
    "server-rack": {
        "file": "server-rack.jpg",
        "crop": (0.1, 0.0, 1.0, 1.0),
        "contrast": 1.34,
        "brightness": 0.9,
        "dither": 12,
        "quality": 40,
        "size": (1200, 900),
    },
    "electronics-store": {
        "file": "electronics-store.jpg",
        "crop": (0.16, 0.2, 0.9, 0.92),
        "contrast": 1.44,
        "brightness": 0.82,
        "dither": 12,
        "quality": 40,
        "size": (1200, 900),
    },
    "audio-rack": {
        "file": "audio-rack.jpg",
        "crop": (0.06, 0.0, 0.96, 1.0),
        "contrast": 1.34,
        "brightness": 0.86,
        "dither": 12,
        "quality": 40,
        "size": (1100, 825),
    },
}


def ordered_palette(image: Image.Image, dither: float = 18.0) -> Image.Image:
    gray = ImageOps.grayscale(image)
    values = np.asarray(gray, dtype=np.float32)
    threshold = np.tile(np.asarray(BAYER_8, dtype=np.float32), ((gray.height + 7) // 8, (gray.width + 7) // 8))
    threshold = threshold[: gray.height, : gray.width] / 64 - 0.5
    adjusted = np.clip(values + threshold * dither, 0, 255)
    levels = np.asarray([22, 60, 104, 158, 225], dtype=np.float32)
    colors = np.asarray(PALETTE, dtype=np.uint8)
    indices = np.abs(adjusted[..., None] - levels).argmin(axis=2)
    return Image.fromarray(colors[indices], "RGB")


def crop_fractions(image: Image.Image, box) -> Image.Image:
    width, height = image.size
    left, top, right, bottom = box
    return image.crop(
        (round(left * width), round(top * height), round(right * width), round(bottom * height))
    )


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for output_name, settings in SOURCES.items():
        source_path = SOURCE / settings["file"]
        if not source_path.is_file():
            raise SystemExit(
                f"missing source photo for {output_name}: {source_path}"
                f" (check design-assets/dealio-context/source and credits.json)"
            )
        with Image.open(source_path) as original:
            original = ImageOps.exif_transpose(original).convert("RGB")
            if "crop" in settings:
                original = crop_fractions(original, settings["crop"])
            original.thumbnail(settings.get("size", (1200, 900)), Image.Resampling.LANCZOS)
            toned = ImageEnhance.Contrast(original).enhance(settings["contrast"])
            toned = ImageEnhance.Brightness(toned).enhance(settings["brightness"])
            processed = ordered_palette(toned, settings["dither"])
            processed.save(
                OUTPUT / f"{output_name}.webp",
                "WEBP",
                quality=settings.get("quality", 62),
                method=6,
            )
    verify()


def texture_score(image: Image.Image) -> float:
    small = ImageOps.grayscale(image).resize((150, 106))
    values = np.asarray(small, dtype=np.float32)
    lap = np.abs(
        4 * values[1:-1, 1:-1]
        - values[:-2, 1:-1]
        - values[2:, 1:-1]
        - values[1:-1, :-2]
        - values[1:-1, 2:]
    )
    return float(lap.mean())


def verify() -> None:
    credits = (SOURCE.parent / "source/credits.json").read_text(encoding="utf-8")
    problems = []
    for output_name, settings in SOURCES.items():
        derivative = OUTPUT / f"{output_name}.webp"
        if not derivative.is_file() or derivative.stat().st_size < 1024:
            problems.append(f"{derivative.name} missing or suspiciously small")
            continue
        if settings["file"] not in credits:
            problems.append(f"{settings['file']} has no entry in credits.json")
        with Image.open(derivative) as check:
            score = texture_score(check)
            if score < 3.0:
                problems.append(
                    f"{derivative.name} texture score {score:.1f} below 3.0"
                    " (posterized or flat regions)"
                )
    if problems:
        raise SystemExit("pipeline verify failed:\n" + "\n".join(problems))
    print(f"verified {len(SOURCES)} derivatives with credits and texture in place")


if __name__ == "__main__":
    main()
