"""PDF font registration with Cyrillic support."""

from __future__ import annotations

from pathlib import Path

from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

FONT_REGULAR = "DejaVuSans"
FONT_BOLD = "DejaVuSans-Bold"
_REGISTERED = False


def _font_paths() -> list[tuple[str, Path]]:
    base = Path("/usr/share/fonts/truetype/dejavu")
    bundled = Path(__file__).resolve().parents[1] / "assets" / "fonts"
    return [
        (FONT_REGULAR, base / "DejaVuSans.ttf"),
        (FONT_REGULAR, bundled / "DejaVuSans.ttf"),
        (FONT_BOLD, base / "DejaVuSans-Bold.ttf"),
        (FONT_BOLD, bundled / "DejaVuSans-Bold.ttf"),
    ]


def register_cyrillic_fonts() -> None:
    global _REGISTERED
    if _REGISTERED:
        return
    seen: set[str] = set()
    for name, path in _font_paths():
        if name in seen or not path.is_file():
            continue
        pdfmetrics.registerFont(TTFont(name, str(path)))
        seen.add(name)
    if FONT_REGULAR not in seen:
        raise RuntimeError("Cyrillic font DejaVuSans not found")
    _REGISTERED = True
