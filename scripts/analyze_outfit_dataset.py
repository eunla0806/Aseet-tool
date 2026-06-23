#!/usr/bin/env python
from __future__ import annotations

import argparse
import csv
import json
import os
import sys
import tempfile
import multiprocessing
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from PIL import Image, UnidentifiedImageError

IMAGE_EXTENSIONS = {
    ".png",
    ".jpg",
    ".jpeg",
    ".webp",
    ".bmp",
    ".gif",
    ".tif",
    ".tiff",
    ".psd",
}

KNOWN_CATEGORIES = {"top", "bottom", "outfit"}


@dataclass
class TemplateInfo:
    path: Path
    width: int
    height: int
    mode: str


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Scan outfit dataset images and generate JSON/CSV reports in parallel."
    )
    parser.add_argument("--dataset", required=True, help="Root folder of the outfit dataset")
    parser.add_argument("--template", required=True, help="Path to template_grid image")
    parser.add_argument("--output_json", required=True, help="Output report JSON path")
    parser.add_argument("--output_csv", required=True, help="Output report CSV path")
    parser.add_argument(
        "--frame_manifest",
        default=None,
        help="Optional frame_manifest.json path. If omitted, the script will try to find it automatically.",
    )
    parser.add_argument(
        "--workers",
        type=int,
        default=None,
        help="Number of worker processes for parallel scanning (defaults to CPU count)",
    )
    return parser.parse_args()


def to_posix_string(path: Path) -> str:
    return path.as_posix()


def ensure_parent_dir(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)


def load_template_info(template_path: Path) -> TemplateInfo:
    with Image.open(template_path) as image:
        image.load()
        width, height = image.size
        return TemplateInfo(path=template_path, width=width, height=height, mode=image.mode)


def find_frame_manifest(dataset_root: Path, template_path: Path, explicit_path: str | None) -> Path | None:
    if explicit_path:
        manifest_path = Path(explicit_path).expanduser().resolve()
        return manifest_path if manifest_path.is_file() else None

    search_roots = []
    for candidate in (dataset_root, template_path.parent, dataset_root.parent, template_path.parent.parent):
        resolved = candidate.resolve()
        if resolved not in search_roots:
            search_roots.append(resolved)

    for root in search_roots:
        matches = list(root.rglob("frame_manifest.json"))
        if matches:
            return matches[0].resolve()
    return None


def load_manifest_summary(manifest_path: Path | None) -> dict[str, Any]:
    if manifest_path is None:
        return {
            "found": False,
            "path": None,
            "canvas_width": None,
            "canvas_height": None,
            "notes": ["frame_manifest.json not found"],
        }

    notes: list[str] = []
    canvas_width = None
    canvas_height = None

    try:
        with manifest_path.open("r", encoding="utf-8") as handle:
            payload = json.load(handle)
    except Exception as exc:
        return {
            "found": True,
            "path": to_posix_string(manifest_path),
            "canvas_width": None,
            "canvas_height": None,
            "notes": [f"frame_manifest.json could not be parsed: {exc}"],
        }

    candidate_pairs = [
        ("canvas_width", "canvas_height"),
        ("canvasWidth", "canvasHeight"),
        ("width", "height"),
    ]
    for width_key, height_key in candidate_pairs:
        if isinstance(payload, dict) and width_key in payload and height_key in payload:
            canvas_width = payload.get(width_key)
            canvas_height = payload.get(height_key)
            break

    if canvas_width is None or canvas_height is None:
        notes.append("frame_manifest.json was found, but canvas size keys were not detected")

    return {
        "found": True,
        "path": to_posix_string(manifest_path),
        "canvas_width": canvas_width,
        "canvas_height": canvas_height,
        "notes": notes,
    }


def get_category(dataset_root: Path, image_path: Path) -> str:
    relative_parts = image_path.relative_to(dataset_root).parts
    if not relative_parts:
        return "unknown"
    top_level = relative_parts[0]
    return top_level if top_level in KNOWN_CATEGORIES else "unknown"


def process_garment_folder_task(args_tuple) -> tuple[list[dict[str, Any]], list[dict[str, Any]], str]:
    """
    Worker function to scan all image files inside a single garment folder in parallel.
    """
    folder_path_str, dataset_root_str, template_width, template_height = args_tuple
    folder_path = Path(folder_path_str)
    dataset_root = Path(dataset_root_str)
    
    records = []
    broken = []
    
    for root, _, filenames in os.walk(folder_path):
        for filename in filenames:
            path = Path(root, filename)
            if path.suffix.lower() in IMAGE_EXTENSIONS:
                category = get_category(dataset_root, path)
                try:
                    with Image.open(path) as image:
                        width, height = image.size
                        
                        has_alpha = "A" in image.getbands() or "transparency" in image.info
                        has_trans = False
                        
                        if "A" in image.getbands():
                            alpha_channel = image.getchannel("A")
                            extrema = alpha_channel.getextrema()
                            has_trans = bool(extrema and extrema[0] < 255)
                        elif image.mode == "P" and "transparency" in image.info:
                            has_trans = True
                            
                        record = {
                            "relative_path": to_posix_string(path.relative_to(dataset_root)),
                            "file_path": to_posix_string(path.resolve()),
                            "category": category,
                            "file_name": path.name,
                            "stem": path.stem,
                            "extension": path.suffix.lower(),
                            "width": width,
                            "height": height,
                            "image_mode": image.mode,
                            "is_rgba": image.mode == "RGBA",
                            "has_alpha_channel": has_alpha,
                            "has_transparent_background": has_trans,
                            "matches_template_canvas": width == template_width and height == template_height,
                            "template_width": template_width,
                            "template_height": template_height,
                        }
                        records.append(record)
                except Exception as exc:
                    broken.append({
                        "relative_path": to_posix_string(path.relative_to(dataset_root)),
                        "file_path": to_posix_string(path.resolve()),
                        "category": category,
                        "file_name": path.name,
                        "extension": path.suffix.lower(),
                        "error": str(exc),
                    })
                    
    relative_folder_name = to_posix_string(folder_path.relative_to(dataset_root))
    return records, broken, relative_folder_name


def write_json_report(
    output_path: Path,
    report_meta: dict[str, Any],
    details_path: Path,
    broken_files: list[dict[str, Any]],
) -> None:
    with output_path.open("w", encoding="utf-8", newline="") as handle:
        handle.write("{\n")
        for key, value in report_meta.items():
            handle.write(f'  "{key}": ')
            json.dump(value, handle, ensure_ascii=False, indent=2)
            handle.write(",\n")

        handle.write('  "images": [\n')
        first = True
        with details_path.open("r", encoding="utf-8") as details_handle:
            for line in details_handle:
                if not line.strip():
                    continue
                if not first:
                    handle.write(",\n")
                handle.write("    ")
                handle.write(line.rstrip("\n"))
                first = False
        handle.write("\n  ],\n")
        handle.write('  "broken_files": ')
        json.dump(broken_files, handle, ensure_ascii=False, indent=2)
        handle.write("\n}\n")


def main() -> int:
    args = parse_args()

    dataset_root = Path(args.dataset).expanduser().resolve()
    template_path = Path(args.template).expanduser().resolve()
    output_json = Path(args.output_json).expanduser().resolve()
    output_csv = Path(args.output_csv).expanduser().resolve()

    if not dataset_root.is_dir():
        print(f"Dataset folder not found: {dataset_root}", file=sys.stderr)
        return 1

    if not template_path.is_file():
        print(f"Template image not found: {template_path}", file=sys.stderr)
        return 1

    ensure_parent_dir(output_json)
    ensure_parent_dir(output_csv)

    template_info = load_template_info(template_path)
    manifest_path = find_frame_manifest(dataset_root, template_path, args.frame_manifest)
    manifest_summary = load_manifest_summary(manifest_path)

    # 1. Identify garment folders
    print("Scanning clothing directory structure to group by folders...")
    garment_folders: list[Path] = []
    
    # We define a garment folder as any subdirectory that contains subdirectories named 'stand1_0' or 'walk1_0' or 'stand1_1'
    for root, dirs, _ in os.walk(dataset_root):
        if "stand1_0" in dirs or "walk1_0" in dirs or "stand1_1" in dirs:
            garment_folders.append(Path(root))
            
    garment_folders.sort()
    
    print(f"Identified {len(garment_folders)} garment folders to analyze.")
    
    # 2. Build tasks for multiprocessing
    tasks = []
    for gf in garment_folders:
        tasks.append((
            str(gf),
            str(dataset_root),
            template_info.width,
            template_info.height
        ))
        
    num_workers = args.workers or multiprocessing.cpu_count()
    print(f"Initializing process pool with {num_workers} workers...")
    
    csv_fieldnames = [
        "relative_path",
        "file_path",
        "category",
        "file_name",
        "stem",
        "extension",
        "width",
        "height",
        "image_mode",
        "is_rgba",
        "has_alpha_channel",
        "has_transparent_background",
        "matches_template_canvas",
        "template_width",
        "template_height",
    ]

    broken_files: list[dict[str, Any]] = []
    stats = {
        "total_image_files": 0,
        "readable_image_files": 0,
        "broken_image_files": 0,
        "rgba_image_files": 0,
        "alpha_channel_files": 0,
        "transparent_background_files": 0,
        "template_canvas_match_files": 0,
        "template_canvas_mismatch_files": 0,
    }
    category_counts = {category: 0 for category in sorted(KNOWN_CATEGORIES)}
    category_counts["unknown"] = 0

    with tempfile.NamedTemporaryFile(
        mode="w", encoding="utf-8", newline="", delete=False, suffix=".jsonl"
    ) as detail_temp:
        detail_temp_path = Path(detail_temp.name)

    try:
        completed = 0
        total_folders = len(tasks)
        
        with output_csv.open("w", encoding="utf-8-sig", newline="") as csv_handle, detail_temp_path.open(
            "w", encoding="utf-8", newline=""
        ) as detail_handle, multiprocessing.Pool(processes=num_workers) as pool:
            
            writer = csv.DictWriter(csv_handle, fieldnames=csv_fieldnames)
            writer.writeheader()
            
            # Use imap_unordered to display real-time folder progress as it finishes
            for records, broken, folder_rel_name in pool.imap_unordered(process_garment_folder_task, tasks):
                completed += 1
                
                # Write results of this garment folder
                for record in records:
                    stats["total_image_files"] += 1
                    stats["readable_image_files"] += 1
                    
                    category = record["category"]
                    category_counts.setdefault(category, 0)
                    category_counts[category] += 1
                    
                    if record["is_rgba"]:
                        stats["rgba_image_files"] += 1
                    if record["has_alpha_channel"]:
                        stats["alpha_channel_files"] += 1
                    if record["has_transparent_background"]:
                        stats["transparent_background_files"] += 1
                    if record["matches_template_canvas"]:
                        stats["template_canvas_match_files"] += 1
                    else:
                        stats["template_canvas_mismatch_files"] += 1
                        
                    writer.writerow(record)
                    detail_handle.write(json.dumps(record, ensure_ascii=False))
                    detail_handle.write("\n")
                    
                for b in broken:
                    stats["total_image_files"] += 1
                    stats["broken_image_files"] += 1
                    
                    category = b["category"]
                    category_counts.setdefault(category, 0)
                    category_counts[category] += 1
                    
                    broken_files.append(b)
                    
                # Print progress to console
                print(f"[{completed}/{total_folders}] {folder_rel_name}: Scanned {len(records)} images (Broken: {len(broken)})")
                sys.stdout.flush()

        generated_at = datetime.now(timezone.utc).isoformat()
        report_meta = {
            "generated_at_utc": generated_at,
            "dataset_root": to_posix_string(dataset_root),
            "template": {
                "path": to_posix_string(template_info.path),
                "width": template_info.width,
                "height": template_info.height,
                "image_mode": template_info.mode,
            },
            "frame_manifest": manifest_summary,
            "summary": stats,
            "category_counts": category_counts,
            "notes": [
                "Only image files were scanned.",
                "Original dataset files were not modified.",
                "Transparent background is detected when at least one pixel is not fully opaque.",
            ],
        }
        write_json_report(output_json, report_meta, detail_temp_path, broken_files)
    finally:
        if detail_temp_path.exists():
            detail_temp_path.unlink()

    print(f"\nJSON report saved: {output_json}")
    print(f"CSV report saved: {output_csv}")
    print(f"Total processed files: {stats['total_image_files']}")
    print(f"Readable images: {stats['readable_image_files']}")
    print(f"Broken images: {stats['broken_image_files']}")
    return 0


if __name__ == "__main__":
    multiprocessing.freeze_support()
    raise SystemExit(main())
