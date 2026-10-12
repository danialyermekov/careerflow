"""Export the approved monochrome artwork without redrawing it (requires Pillow).

Usage from the repository root:
  python frontend/scripts/prepare_branding.py design/branding/favicon.png design/branding/logo.png
"""
import base64
import hashlib
from io import BytesIO
from pathlib import Path
import sys

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
PUBLIC = ROOT / "frontend/public"
BRANDING = PUBLIC / "branding"


def cutout(path: Path) -> Image.Image:
    # Remove the textured white matte, retaining the supplied silhouette and antialiased edges.
    alpha = Image.open(path).convert("L").point(lambda value: round(max(0, min(1, (240 - value) / 216)) * 255))
    bounds = alpha.point(lambda value: 255 if value > 128 else 0).getbbox()
    assert bounds, f"No monochrome artwork found: {path}"
    return alpha.crop((bounds[0] - 2, bounds[1] - 2, bounds[2] + 2, bounds[3] + 2))


def square_icon(ink: Image.Image, size: int, fraction: float = .84) -> Image.Image:
    fitted = ink.copy()
    fitted.thumbnail((round(size * fraction), round(size * fraction)), Image.Resampling.LANCZOS)
    icon = Image.new("L", (size, size), 0)
    icon.paste(fitted, ((size - fitted.width) // 2, (size - fitted.height) // 2))
    return icon


def svg(image: Image.Image, title: str) -> str:
    # shortcut: source artwork is raster; replace the compact PNG payload when an approved vector is supplied.
    payload = BytesIO()
    image.quantize(colors=32, dither=Image.Dither.NONE).save(payload, format="PNG", optimize=True)
    encoded = base64.b64encode(payload.getvalue()).decode("ascii")
    width, height = image.size
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" '
            f'viewBox="0 0 {width} {height}" role="img" aria-labelledby="title">\n'
            f'  <title id="title">{title}</title>\n'
            f'  <image width="{width}" height="{height}" href="data:image/png;base64,{encoded}"/>\n</svg>\n')


def main():
    sources = [Path(argument).resolve() for argument in sys.argv[1:]]
    assert len(sources) == 2, "Supply the approved monogram and horizontal lockup."
    hashes = [hashlib.sha256(source.read_bytes()).digest() for source in sources]
    ink, horizontal = map(cutout, sources)
    assert 1 < ink.width / ink.height < 1.5
    assert 4 < horizontal.width / horizontal.height < 6
    BRANDING.mkdir(parents=True, exist_ok=True)

    for size in (16, 32, 48):
        square_icon(ink, size).save(PUBLIC / f"favicon-{size}x{size}.png", optimize=True)
    square_icon(ink, 512).convert("RGB").save(PUBLIC / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
    square_icon(ink, 180).convert("RGB").save(PUBLIC / "apple-touch-icon.png", optimize=True)
    for size in (192, 512):
        icon = square_icon(ink, size)
        icon.save(BRANDING / f"android-chrome-{size}x{size}.png", optimize=True)
        # Preserve existing public URLs, including the structured-data image reference.
        icon.save(PUBLIC / f"icon-{size}.png", optimize=True)
    maskable = square_icon(ink, 512, .60)
    maskable.save(BRANDING / "android-chrome-maskable-512x512.png", optimize=True)
    (BRANDING / "favicon.svg").write_text(svg(square_icon(ink, 256), "CareerFlow CF monogram"), encoding="utf-8")

    # The black backing keeps the approved white lockup legible on both GitHub themes.
    horizontal.thumbnail((1280, 300), Image.Resampling.LANCZOS)
    readme = Image.new("L", (horizontal.width + 64, horizontal.height + 64), 0)
    readme.paste(horizontal, (32, 32))
    (ROOT / "assets/careerflow-logo.svg").write_text(svg(readme, "CareerFlow — CF symbol and wordmark"), encoding="utf-8")

    assert hashes == [hashlib.sha256(source.read_bytes()).digest() for source in sources], "Sources changed"
    for size in (16, 32, 48):
        icon = Image.open(PUBLIC / f"favicon-{size}x{size}.png")
        assert icon.size == (size, size) and icon.getpixel((0, 0)) == 0 and icon.getextrema()[1] > 200
    assert Image.open(PUBLIC / "favicon.ico").ico.sizes() == {(16, 16), (32, 32), (48, 48)}
    # All meaningful maskable artwork must fit inside the central 80%-diameter safe circle.
    for y in range(512):
        for x in range(512):
            if maskable.getpixel((x, y)) > 128:
                assert (x - 255.5) ** 2 + (y - 255.5) ** 2 <= (512 * .4) ** 2
    print(f"Exported approved CF icons and README lockup {readme.size}; original hashes unchanged.")


if __name__ == "__main__":
    main()
