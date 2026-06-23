import argparse
import json
from collections import deque
from pathlib import Path

from PIL import Image


FRAME_ORDER = ["stand1_0", "stand1_1", "stand1_2", "stand1_3"]
SUPPORTED_LAYOUTS = {
    (860, 1360): {"name": "2x2_standard", "cell_size": (430, 680)},
    (816, 1290): {"name": "2x2_fallback", "cell_size": (408, 645)},
}


def parse_bool(value: str) -> bool:
    if isinstance(value, bool):
        return value
    lowered = str(value).strip().lower()
    if lowered in {"1", "true", "yes", "y", "on"}:
        return True
    if lowered in {"0", "false", "no", "n", "off"}:
        return False
    raise argparse.ArgumentTypeError(f"Invalid boolean value: {value}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build clothing anchors from a 2x2 external AI draft.")
    parser.add_argument("--input", required=True, help="Path to stand1_draft.png")
    parser.add_argument("--output-dir", required=True, help="Directory to save anchor outputs")
    parser.add_argument("--action-name", default="stand1", help="Action name used to select the pure body reference")
    parser.add_argument("--mode", choices=["draft", "master"], default="draft", help="draft: split 2x2 sheet, master: use one selected source as-is")
    parser.add_argument("--master-name", default="stand1_master", help="Base file name used by master mode outputs")
    parser.add_argument("--preview-frame-name", default="stand1_0", help="Body frame used for the 120x120 preview in master mode")
    parser.add_argument("--trim-transparent-bounds", type=parse_bool, default=False, help="In master mode, crop only fully transparent outer margin before resizing")
    parser.add_argument("--remove-skintone", type=parse_bool, default=False, help="Remove skin-tone pixels after background removal")
    parser.add_argument("--background-tolerance", type=int, default=24, help="Color tolerance for connected background removal")
    parser.add_argument("--cleanup-isolated-pixels", type=parse_bool, default=True, help="Remove tiny 1px noise left after cleanup")
    parser.add_argument("--preview-y-bias", type=int, default=-20, help="Vertical alignment used by the 120x120 preview")
    return parser.parse_args()


def detect_layout(size: tuple[int, int]) -> tuple[dict, list[str]]:
    if size not in SUPPORTED_LAYOUTS:
        width, height = size
        if width % 2 == 0 and height % 2 == 0:
            cell_w = width // 2
            cell_h = height // 2
            ratio = cell_w / cell_h
            expected_ratios = [layout["cell_size"][0] / layout["cell_size"][1] for layout in SUPPORTED_LAYOUTS.values()]
            if min(abs(ratio - expected_ratio) for expected_ratio in expected_ratios) <= 0.02:
                return (
                    {"name": "2x2_even_split", "cell_size": (cell_w, cell_h)},
                    [f"non-standard draft size detected: {size}, used half-split cell size {(cell_w, cell_h)}"],
                )
        raise ValueError(
            f"Unsupported draft size {size}. Supported sizes: {', '.join(str(key) for key in SUPPORTED_LAYOUTS)}"
        )
    return SUPPORTED_LAYOUTS[size], []


def is_close_to_any_corner(color: tuple[int, int, int], samples: list[tuple[int, int, int]], tolerance: int) -> bool:
    for sample in samples:
        if all(abs(channel - sample[idx]) <= tolerance for idx, channel in enumerate(color)):
            return True
    return False


def remove_connected_background(frame: Image.Image, tolerance: int) -> tuple[Image.Image, int]:
    rgba = frame.convert("RGBA")
    width, height = rgba.size
    pixels = rgba.load()

    corner_points = [(0, 0), (width - 1, 0), (0, height - 1), (width - 1, height - 1)]
    corner_samples = [pixels[x, y][:3] for x, y in corner_points]

    alpha = [[255 for _ in range(width)] for _ in range(height)]
    visited = [[False for _ in range(width)] for _ in range(height)]
    queue = deque(corner_points)
    removed = 0

    while queue:
        x, y = queue.popleft()
        if visited[y][x]:
            continue
        visited[y][x] = True
        color = pixels[x, y][:3]
        if not is_close_to_any_corner(color, corner_samples, tolerance):
            continue
        if alpha[y][x] != 0:
            alpha[y][x] = 0
            removed += 1
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < width and 0 <= ny < height and not visited[ny][nx]:
                queue.append((nx, ny))

    output = rgba.copy()
    out_pixels = output.load()
    for y in range(height):
        for x in range(width):
            r, g, b, _ = out_pixels[x, y]
            out_pixels[x, y] = (r, g, b, alpha[y][x])
    return output, removed


def is_skin_color(r: int, g: int, b: int) -> bool:
    return (r >= 220) and (150 <= g <= 255) and (80 <= b <= 240) and (r >= g > b)


def remove_skintone_pixels(frame: Image.Image) -> tuple[Image.Image, int]:
    output = frame.copy().convert("RGBA")
    pixels = output.load()
    width, height = output.size
    removed = 0
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            if a == 0:
                continue
            if is_skin_color(r, g, b):
                pixels[x, y] = (r, g, b, 0)
                removed += 1
    return output, removed


def cleanup_isolated_pixels(frame: Image.Image) -> Image.Image:
    rgba = frame.copy().convert("RGBA")
    width, height = rgba.size
    src = rgba.load()
    target = rgba.copy()
    dst = target.load()

    for y in range(height):
        for x in range(width):
            if src[x, y][3] == 0:
                continue
            neighbor_count = 0
            for ny in range(max(0, y - 1), min(height, y + 2)):
                for nx in range(max(0, x - 1), min(width, x + 2)):
                    if nx == x and ny == y:
                        continue
                    if src[nx, ny][3] > 0:
                        neighbor_count += 1
            if neighbor_count == 0:
                r, g, b, _ = src[x, y]
                dst[x, y] = (r, g, b, 0)
    return target


def alpha_bbox(frame: Image.Image) -> list[int] | None:
    bbox = frame.getchannel("A").getbbox()
    return list(bbox) if bbox else None


def alpha_count(frame: Image.Image) -> int:
    alpha = frame.getchannel("A")
    return int(sum(alpha.histogram()[1:]))


def split_frames(draft: Image.Image, cell_size: tuple[int, int]) -> dict[str, Image.Image]:
    cell_w, cell_h = cell_size
    positions = {
        "stand1_0": (0, 0),
        "stand1_1": (cell_w, 0),
        "stand1_2": (0, cell_h),
        "stand1_3": (cell_w, cell_h),
    }
    frames = {}
    for frame_name, (x, y) in positions.items():
        frames[frame_name] = draft.crop((x, y, x + cell_w, y + cell_h))
    return frames


def body_frame_crop(action_name: str, frame_name: str) -> Image.Image:
    frame_idx = int(frame_name.split("_")[-1])
    base_path = Path("E:/Aseet tool/data/grid/pure_grids/base") / f"pure_{action_name}.png"
    body_strip = Image.open(base_path).convert("RGBA")
    cell_w = 120
    return body_strip.crop((frame_idx * cell_w, 0, (frame_idx + 1) * cell_w, 120))


def build_preview(body_reference: Image.Image, anchor: Image.Image, preview_y_bias: int) -> Image.Image:
    preview = body_reference.copy().convert("RGBA")
    x = (120 - anchor.width) // 2
    y = (120 - anchor.height + preview_y_bias) // 2
    preview.alpha_composite(anchor, (x, y))
    return preview


def ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def recommend_next_action(anchor_bbox: list[int] | None, alpha_pixels: int) -> str:
    if anchor_bbox is None or alpha_pixels == 0:
        return "master source needs manual re-check before STEP 5-C because no visible clothing pixels remained"
    return "usable as STEP 5-C reference candidate; do one visual fit check in preview before ComfyUI reference injection"


def run_master_mode(args: argparse.Namespace, input_path: Path, output_dir: Path) -> None:
    source = Image.open(input_path).convert("RGBA")
    source_bbox = source.getbbox()
    master = source
    warnings = []

    if args.trim_transparent_bounds and source_bbox:
        master = source.crop(source_bbox)
        warnings.append(f"trimmed transparent outer margin with bbox {source_bbox} before nearest-neighbor resize")

    anchor_original_path = output_dir / f"{args.master_name}_anchor_original.png"
    master.save(anchor_original_path)

    anchor = master.resize((43, 68), Image.Resampling.NEAREST)
    anchor_path = output_dir / f"{args.master_name}_anchor.png"
    anchor.save(anchor_path)

    body_reference = body_frame_crop(args.action_name, args.preview_frame_name)
    preview = build_preview(body_reference, anchor, args.preview_y_bias)
    preview_path = output_dir / f"{args.master_name}_anchor_preview.png"
    preview.save(preview_path)

    alpha_pixels = alpha_count(master)
    bbox = alpha_bbox(anchor)
    if master.size != (43, 68):
        warnings.append(f"source kept as-is and resized to 43x68 with nearest neighbor from {master.size}")

    report = {
        "input_path": str(input_path),
        "input_resolution": list(master.size),
        "alpha_pixel_count": alpha_pixels,
        "anchor_bbox": bbox,
        "output_paths": {
            "anchor_original": str(anchor_original_path),
            "anchor": str(anchor_path),
            "preview": str(preview_path),
        },
        "warnings": warnings,
        "result_status": "ok" if bbox else "warning",
        "recommended_next_action": recommend_next_action(bbox, alpha_pixels),
    }

    report_path = output_dir / "master_anchor_report.json"
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[OK] master anchor build complete: {report_path}")


def run_draft_mode(args: argparse.Namespace, input_path: Path, output_dir: Path) -> None:
    draft = Image.open(input_path).convert("RGBA")
    layout, layout_warnings = detect_layout(draft.size)
    frames = split_frames(draft, layout["cell_size"])

    report = {
        "input_path": str(input_path),
        "input_resolution": list(draft.size),
        "detected_layout": layout["name"],
        "cell_size": list(layout["cell_size"]),
        "frame_order": FRAME_ORDER,
        "background_removed_pixels": {},
        "remove_skintone": bool(args.remove_skintone),
        "skintone_removed_pixels": {},
        "remaining_alpha_pixels": {},
        "anchor_bbox": {},
        "output_paths": {},
        "warnings": layout_warnings[:],
        "result_status": "ok",
    }

    for frame_name in FRAME_ORDER:
        frame = frames[frame_name]
        cleaned, background_removed = remove_connected_background(frame, args.background_tolerance)
        report["background_removed_pixels"][frame_name] = background_removed

        skintone_removed = 0
        if args.remove_skintone:
            cleaned, skintone_removed = remove_skintone_pixels(cleaned)
        report["skintone_removed_pixels"][frame_name] = skintone_removed

        if args.cleanup_isolated_pixels:
            cleaned = cleanup_isolated_pixels(cleaned)

        anchor_original_path = output_dir / f"{frame_name}_anchor_original.png"
        cleaned.save(anchor_original_path)

        anchor = cleaned.resize((43, 68), Image.Resampling.NEAREST)
        anchor_path = output_dir / f"{frame_name}_anchor.png"
        anchor.save(anchor_path)

        body_reference = body_frame_crop(args.action_name, frame_name)
        preview = build_preview(body_reference, anchor, args.preview_y_bias)
        preview_path = output_dir / f"{frame_name}_anchor_preview.png"
        preview.save(preview_path)

        report["remaining_alpha_pixels"][frame_name] = alpha_count(anchor)
        report["anchor_bbox"][frame_name] = alpha_bbox(anchor)
        report["output_paths"][frame_name] = {
            "anchor_original": str(anchor_original_path),
            "anchor": str(anchor_path),
            "preview": str(preview_path),
        }

        if report["anchor_bbox"][frame_name] is None:
            report["warnings"].append(f"{frame_name}: no visible clothing pixels remained after cleanup")

    if report["warnings"]:
        report["result_status"] = "warning"

    report_path = output_dir / "anchor_build_report.json"
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[OK] anchor build complete: {report_path}")


def main() -> None:
    args = parse_args()
    input_path = Path(args.input)
    output_dir = Path(args.output_dir)
    ensure_dir(output_dir)
    if args.mode == "master":
        run_master_mode(args, input_path, output_dir)
        return
    run_draft_mode(args, input_path, output_dir)


if __name__ == "__main__":
    main()
