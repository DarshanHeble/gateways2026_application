#!/usr/bin/env python3
"""
Tests for scripts/build-assets.py.

Run with:  npm run test:assets   (or: python3 scripts/test_build_assets.py)

Stdlib unittest on purpose — the generator's only dependency is Pillow, and a
build tool shouldn't drag a test framework into the project to prove itself.
"""

from __future__ import annotations

import base64
import importlib.util
import io
import json
import shutil
import sys
import tempfile
import unittest
from pathlib import Path

from PIL import Image

SCRIPTS = Path(__file__).resolve().parent

# The module has a hyphen in its name, so it can't be imported normally.
_spec = importlib.util.spec_from_file_location("build_assets", SCRIPTS / "build-assets.py")
build_assets = importlib.util.module_from_spec(_spec)
# Register before executing: @dataclass resolves its owning module through
# sys.modules, and on 3.12+ a missing entry raises during class creation.
sys.modules["build_assets"] = build_assets
_spec.loader.exec_module(build_assets)


class SlugifyTests(unittest.TestCase):
    """Slugs become CDN paths, so they must be ASCII, stable and collision-free."""

    def test_strips_non_ascii(self):
        # The real event is literally called "24° Shift"; the degree sign must not
        # reach a URL.
        self.assertEqual(build_assets.slugify("24° shift"), "24-shift")

    def test_lowercases_and_joins_words(self):
        self.assertEqual(build_assets.slugify("ALTERNATE THESIS"), "alternate-thesis")
        self.assertEqual(build_assets.slugify("The Last Commit"), "the-last-commit")

    def test_collapses_runs_and_trims(self):
        self.assertEqual(build_assets.slugify("  pixel   paradox!!  "), "pixel-paradox")
        self.assertEqual(build_assets.slugify("--x--"), "x")

    def test_is_idempotent(self):
        once = build_assets.slugify("In Perspective")
        self.assertEqual(build_assets.slugify(once), once)


class SpecTests(unittest.TestCase):
    def setUp(self):
        self.specs = build_assets.build_specs()
        self.by_key = {s.key: s for s in self.specs}

    def test_every_event_title_produces_a_spec(self):
        for title, _filename in build_assets.EVENT_SOURCES:
            self.assertIn(f"event/{build_assets.slugify(title)}", self.by_key)

    def test_keys_are_unique(self):
        keys = [s.key for s in self.specs]
        self.assertEqual(len(keys), len(set(keys)), "duplicate keys would collide in the manifest")

    def test_svg_sources_are_resized_but_png_badges_are_not(self):
        # The SVG wrappers embed a 1024px bitmap and must be scaled down; the PNG
        # badges are already at display size, so upscaling would invent detail.
        self.assertEqual(self.by_key["event/alternate-thesis"].mode, "svg-embedded")
        self.assertEqual(self.by_key["event/alternate-thesis"].edge, build_assets.EVENT_EDGE)
        self.assertEqual(self.by_key["event/24-shift"].mode, "image")
        self.assertIsNone(self.by_key["event/24-shift"].edge)

    def test_video_and_background_are_copied_verbatim(self):
        self.assertEqual(self.by_key["video/splash"].mode, "copy")
        self.assertEqual(self.by_key["ui/login-bg"].mode, "copy")


class ExtractTests(unittest.TestCase):
    def test_pulls_the_bitmap_out_of_an_svg_wrapper(self):
        source = Image.new("RGBA", (64, 48), (255, 0, 0, 255))
        raw = io.BytesIO()
        source.save(raw, format="PNG")
        encoded = base64.b64encode(raw.getvalue()).decode()

        with tempfile.TemporaryDirectory() as tmp:
            svg = Path(tmp) / "badge.svg"
            svg.write_text(
                '<svg xmlns="http://www.w3.org/2000/svg">'
                f'<image xlink:href="data:image/png;base64,{encoded}"/></svg>'
            )
            self.assertEqual(build_assets.extract_embedded_bitmap(svg).size, (64, 48))

    def test_raises_when_there_is_no_bitmap(self):
        with tempfile.TemporaryDirectory() as tmp:
            svg = Path(tmp) / "vector.svg"
            svg.write_text('<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>')
            with self.assertRaises(ValueError):
                build_assets.extract_embedded_bitmap(svg)


def _make_source_tree(root: Path) -> None:
    """A synthetic stand-in for the real art, matching every Spec source path."""
    for spec in build_assets.build_specs():
        target = root / spec.source
        target.parent.mkdir(parents=True, exist_ok=True)

        if spec.source.endswith(".svg"):
            # Two distinct images so dedup has both a duplicate and a non-duplicate
            # to deal with: everything except RENDER RUSH shares one bitmap.
            shade = (9, 9, 9, 255) if "RENDER RUSH" in spec.source else (7, 7, 7, 255)
            bitmap = Image.new("RGBA", (300, 300), shade)
            buf = io.BytesIO()
            bitmap.save(buf, format="PNG")
            payload = base64.b64encode(buf.getvalue()).decode()
            target.write_text(f'<svg><image xlink:href="data:image/png;base64,{payload}"/></svg>')
        elif spec.source.endswith(".mp4"):
            target.write_bytes(b"\x00\x00\x00\x18ftypmp42 synthetic clip")
        else:
            Image.new("RGBA", (64, 64), (3, 3, 3, 255)).save(target)


class EndToEndTests(unittest.TestCase):
    """Runs the generator over a synthetic tree and checks the contract it promises."""

    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        self.source = self.tmp / "source"
        self.out = self.tmp / "out"
        _make_source_tree(self.source)
        self.addCleanup(shutil.rmtree, self.tmp, ignore_errors=True)

    def _run(self):
        argv = sys.argv
        sys.argv = [
            "build-assets.py",
            "--source", str(self.source),
            "--out", str(self.out),
            "--base-url", "https://cdn.example.test/base/",
            "--skip-bundled",
        ]
        try:
            # The report goes to stdout; silence it so test output stays readable.
            buf, sys.stdout = sys.stdout, io.StringIO()
            try:
                build_assets.main()
            finally:
                sys.stdout = buf
        finally:
            sys.argv = argv
        return json.loads((self.out / "manifest.json").read_text())

    def test_manifest_covers_every_spec_and_files_exist(self):
        manifest = self._run()
        self.assertEqual(
            {a["key"] for a in manifest["assets"]},
            {s.key for s in build_assets.build_specs()},
        )
        for asset in manifest["assets"]:
            written = self.out / asset["path"]
            self.assertTrue(written.exists(), f"{asset['path']} missing from the bundle")
            self.assertEqual(written.stat().st_size, asset["bytes"])

    def test_identical_content_collapses_to_one_file(self):
        manifest = self._run()
        paths = {a["path"] for a in manifest["assets"]}
        # 13 event keys but only two distinct bitmaps, so the events must share.
        event_paths = {a["path"] for a in manifest["assets"] if a["key"].startswith("event/")}
        self.assertLess(len(event_paths), 13, "duplicate artwork should have been deduplicated")
        self.assertEqual(len(paths), len(set(paths)))

    def test_filenames_carry_the_content_hash(self):
        manifest = self._run()
        for asset in manifest["assets"]:
            stem = Path(asset["path"]).name
            self.assertIn(
                asset["sha256"][:8], stem,
                "the hash prefix is what makes a URL immutable and cacheable",
            )

    def test_rerunning_is_deterministic(self):
        first = self._run()
        second = self._run()
        # generatedAt is expected to move; the bytes that clients cache must not.
        self.assertEqual(
            [(a["key"], a["path"], a["sha256"]) for a in first["assets"]],
            [(a["key"], a["path"], a["sha256"]) for a in second["assets"]],
        )

    def test_base_url_is_carried_into_the_manifest(self):
        self.assertEqual(self._run()["baseUrl"], "https://cdn.example.test/base/")

    def test_missing_source_is_reported_not_silently_skipped(self):
        (self.source / "videos" / "minecraft-splash.mp4").unlink()
        with self.assertRaises(FileNotFoundError):
            self._run()


if __name__ == "__main__":
    unittest.main(verbosity=2)
