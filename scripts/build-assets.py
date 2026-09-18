#!/usr/bin/env python3
"""
Build the CDN asset bundle that the app downloads at runtime.

Why this exists
---------------
The app used to ship ~26 MB of artwork inside the binary, and most of that was
waste rather than content:

  * Each `assets/images/events/*.svg` is a 163x162 circle whose fill is a
    base64-embedded 1024x1016 bitmap — ~2.6 MB of file to draw a small badge.
    Worse, there is no `react-native-svg-transformer` in this project, so
    `require(".../X.svg")` resolves to an opaque binary that expo-image cannot
    rasterize on native. Those events rendered *blank*. Extracting the bitmap
    and re-encoding it as a correctly-sized WebP fixes the bug and removes
    ~97% of the bytes at the same time.
  * Several files are byte-identical twins (PROMPTX == THE TWIN DIRECTIVE, and
    others). Content-addressed output collapses them automatically.

Output layout (staged into --out, then pushed to the asset repo):

    manifest.json
    images/events/<name>.<hash8>.webp
    images/characters/<name>.<hash8>.webp
    images/<name>.<hash8>.webp
    videos/<name>.<hash8>.mp4

Filenames carry a content hash, which is the whole versioning scheme: changed
bytes produce a new filename, therefore a new CDN URL, so a stale cached copy
is impossible and no git tags need managing. Only manifest.json is mutable.
That also means the app can treat "a file with this name exists on disk" as
proof its contents are correct, and never re-hash megabytes on startup.

Usage:
    python3 scripts/build-assets.py [--out DIR] [--base-url URL]
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import io
import json
import re
import shutil
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

try:
    from PIL import Image
except ImportError:  # pragma: no cover - dependency guard
    sys.exit("Pillow is required: python3 -m pip install Pillow")


REPO_ROOT = Path(__file__).resolve().parent.parent

# Source art lives in the asset repo, not here. Keeping it out of the app repo
# means a clone of the app doesn't drag ~25 MB of raw art with it, and puts the
# originals next to the bundle they produce.
DEFAULT_SOURCE = REPO_ROOT.parent / "gateways2026-assets" / "source"
DEFAULT_OUT = REPO_ROOT.parent / "gateways2026-assets"
DEFAULT_BASE_URL = "https://cdn.jsdelivr.net/gh/vishalbg02/gateways2026-assets@main/"

# Set from --source in main(); every Spec path is relative to it.
ASSETS = DEFAULT_SOURCE

# Encoder settings, chosen by measuring real output rather than guessing:
#
#   event badges  512px @ q85 -> ~63 KB (from 2.6 MB). The largest on-screen use
#                 is the Events hero banner at 180pt tall, ~540px on a 3x screen,
#                 so 512 covers it with no visible upscale.
#   characters    800px @ q88 -> ~44 KB (from ~1 MB). MOB_SIZE in
#                 MobConvergenceOverlay is min(screenW*0.65, 260pt) ~= 253pt,
#                 ~760px at 3x.
#   small badges  native 163x162 @ q90 -> ~14 KB (from ~61 KB). These are already
#                 at display size; upscaling them would invent detail that isn't
#                 in the source.
EVENT_EDGE, EVENT_Q = 512, 85
CHARACTER_EDGE, CHARACTER_Q = 800, 88
SMALL_Q = 90


@dataclass(frozen=True)
class Spec:
    """One logical asset: a stable key the app asks for, and how to produce it."""

    key: str          # what the app calls it, e.g. "event/promptx"
    source: str       # path relative to assets/
    out_dir: str      # directory inside the bundle
    mode: str         # "svg-embedded" | "image" | "copy"
    edge: int | None = None   # longest-side cap, None = keep native size
    quality: int = 90


# Event keys mirror the lowercase titles already used by EVENT_IMAGES in
# src/services/EventAssets.ts, slugified to stay filesystem- and URL-safe.
EVENT_SOURCES = [
    # (event title as used in EventAssets.ts, source filename)
    ("24° shift", "24° Shift.png"),
    ("alternate thesis", "ALTERNATE THESIS.svg"),
    ("arcadia x", "ARCADIA X.png"),
    ("deviation", "Deviation.png"),
    ("in perspective", "IN PERSPECTIVE.svg"),
    ("mystery block", "mystery block.svg"),
    ("pixel paradox", "PIXEL PARADOX.svg"),
    ("pixel quest", "PIXEL QUEST.png"),
    ("promptx", "PROMPTX.svg"),
    ("render rush", "RENDER RUSH.svg"),
    ("the last commit", "The Last Commit.png"),
    ("the twin directive", "THE TWIN DIRECTIVE.svg"),
    ("twin protocol", "TWIN PROTOCOL.png"),
]

CHARACTERS = ["adventurer", "archer_blue", "archer_gold", "runner_pickaxe"]


def slugify(value: str) -> str:
    """'24° shift' -> '24-shift'. Stable, ASCII-only, safe in a URL path."""
    ascii_only = value.encode("ascii", "ignore").decode("ascii")
    return re.sub(r"-+", "-", re.sub(r"[^a-z0-9]+", "-", ascii_only.lower())).strip("-")


def build_specs() -> list[Spec]:
    specs: list[Spec] = []

    for title, filename in EVENT_SOURCES:
        is_svg = filename.lower().endswith(".svg")
        specs.append(
            Spec(
                key=f"event/{slugify(title)}",
                source=f"images/events/{filename}",
                out_dir="images/events",
                mode="svg-embedded" if is_svg else "image",
                edge=EVENT_EDGE if is_svg else None,
                quality=EVENT_Q if is_svg else SMALL_Q,
            )
        )

    for name in CHARACTERS:
        specs.append(
            Spec(
                key=f"character/{name}",
                source=f"images/characters/{name}.png",
                out_dir="images/characters",
                mode="image",
                edge=CHARACTER_EDGE,
                quality=CHARACTER_Q,
            )
        )

    # Already a lossy WebP at a sensible size — re-encoding would only add a
    # second generation of loss for no meaningful saving, so it ships verbatim.
    specs.append(
        Spec(key="ui/login-bg", source="images/login-parallax-bg.webp",
             out_dir="images", mode="copy")
    )

    # No ffmpeg on this machine, and 2.7 MB is acceptable for a one-time
    # download, so the clip is copied as-is.
    specs.append(
        Spec(key="video/splash", source="videos/minecraft-splash.mp4",
             out_dir="videos", mode="copy")
    )

    return specs


def extract_embedded_bitmap(svg_path: Path) -> Image.Image:
    """Pull the base64 bitmap out of a Figma-exported SVG wrapper."""
    raw = svg_path.read_text(errors="ignore")
    match = re.search(r"base64,([A-Za-z0-9+/=\s]+)", raw)
    if not match:
        raise ValueError(f"no embedded base64 bitmap in {svg_path.name}")
    payload = base64.b64decode(re.sub(r"\s", "", match.group(1)))
    return Image.open(io.BytesIO(payload))


def encode(spec: Spec) -> tuple[bytes, str, tuple[int, int] | None]:
    """Produce the final bytes for one spec, plus its extension and dimensions."""
    source = ASSETS / spec.source
    if not source.exists():
        raise FileNotFoundError(f"missing source asset: {source}")

    if spec.mode == "copy":
        return source.read_bytes(), source.suffix.lstrip("."), None

    image = (
        extract_embedded_bitmap(source)
        if spec.mode == "svg-embedded"
        else Image.open(source)
    ).convert("RGBA")

    if spec.edge:
        image.thumbnail((spec.edge, spec.edge), Image.LANCZOS)

    buffer = io.BytesIO()
    # method=6 is the slowest/smallest setting; this runs rarely so spend the time.
    image.save(buffer, format="WEBP", quality=spec.quality, method=6)
    return buffer.getvalue(), "webp", image.size


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", default=str(DEFAULT_SOURCE),
                        help="directory holding the original art")
    parser.add_argument("--out", default=str(DEFAULT_OUT),
                        help="asset repo working copy to write the bundle into")
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL)
    parser.add_argument(
        "--skip-bundled",
        action="store_true",
        help="don't refresh src/services/assets/manifest.bundled.json (used by tests)",
    )
    args = parser.parse_args()

    global ASSETS
    ASSETS = Path(args.source)
    if not ASSETS.is_dir():
        sys.exit(f"source directory not found: {ASSETS}")

    out_root = Path(args.out)
    # Clear only what this script generates. The natural workflow points --out at
    # a working clone of the asset repo, so blowing away the whole directory
    # would take .git and README.md with it.
    for generated in ("images", "videos"):
        shutil.rmtree(out_root / generated, ignore_errors=True)
    (out_root / "manifest.json").unlink(missing_ok=True)
    out_root.mkdir(parents=True, exist_ok=True)

    by_digest: dict[str, str] = {}   # sha256 -> bundle-relative path (dedup)
    entries: list[dict] = []
    rows: list[tuple] = []
    source_total = 0
    output_total = 0

    for spec in sorted(build_specs(), key=lambda s: s.key):
        payload, ext, size = encode(spec)
        digest = hashlib.sha256(payload).hexdigest()
        source_bytes = (ASSETS / spec.source).stat().st_size
        source_total += source_bytes

        reused = digest in by_digest
        if reused:
            rel_path = by_digest[digest]
        else:
            stem = slugify(Path(spec.source).stem)
            rel_path = f"{spec.out_dir}/{stem}.{digest[:8]}.{ext}"
            target = out_root / rel_path
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(payload)
            by_digest[digest] = rel_path
            output_total += len(payload)

        entries.append({
            "key": spec.key,
            "path": rel_path,
            "bytes": len(payload),
            "sha256": digest,
        })
        rows.append((spec.key, source_bytes, len(payload), size, reused))

    manifest = {
        "version": 1,
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "baseUrl": args.base_url,
        # Sorted so the file is diff-friendly across regenerations.
        "assets": sorted(entries, key=lambda e: e["key"]),
    }
    manifest_json = json.dumps(manifest, indent=2) + "\n"
    (out_root / "manifest.json").write_text(manifest_json)

    # Ship a copy inside the app too. It costs a few KB and means a first launch
    # with no connectivity still knows every asset's CDN URL, so artwork can
    # stream in the moment a network appears instead of sitting on placeholders
    # until a manifest fetch succeeds.
    bundled = REPO_ROOT / "src" / "services" / "assets" / "manifest.bundled.json"
    if not args.skip_bundled and bundled.parent.is_dir():
        bundled.write_text(manifest_json)
        print(f"  bundled snapshot -> {bundled.relative_to(REPO_ROOT)}")

    # ── Report ────────────────────────────────────────────────────────────────
    print(f"\n  {'KEY':<26} {'SOURCE':>10} {'OUTPUT':>10} {'SAVED':>7}  DIMENSIONS")
    print(f"  {'-' * 26} {'-' * 10} {'-' * 10} {'-' * 7}  {'-' * 18}")
    for key, src_b, out_b, size, reused in rows:
        saved = f"{(1 - out_b / src_b) * 100:5.1f}%" if src_b else "    —"
        dims = f"{size[0]}x{size[1]}" if size else "copied"
        note = "  (dedup)" if reused else ""
        print(f"  {key:<26} {src_b / 1024:9.1f}K {out_b / 1024:9.1f}K {saved:>7}  {dims}{note}")

    unique = len(by_digest)
    print(f"\n  {len(entries)} assets -> {unique} unique files "
          f"({len(entries) - unique} deduplicated)")
    print(f"  source:  {source_total / 1024 / 1024:6.2f} MB")
    print(f"  bundle:  {output_total / 1024 / 1024:6.2f} MB "
          f"({(1 - output_total / source_total) * 100:.1f}% smaller)")
    print(f"  staged in: {out_root}\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
