import argparse
import json
import os
import zipfile
from collections import defaultdict
from io import BytesIO
from typing import Dict, List, Optional, Tuple

from PIL import Image

PART_GROUPS = [
    "front_torso",
    "front_arm",
    "front_lower",
    "back_torso",
    "back_lower",
]

FRONT_PART_GROUPS = [
    "front_torso",
    "front_arm",
    "front_lower",
]

BACK_PART_GROUPS = [
    "back_torso",
    "back_lower",
]

FRONT_CORE_PART_GROUPS = [
    "front_torso",
    "front_lower",
]

BACK_CORE_PART_GROUPS = [
    "back_torso",
    "back_lower",
]

OPTIONAL_PART_GROUPS = [
    "front_arm",
]


def parse_layer_metadata(filename: str) -> Optional[Tuple[int, str]]:
    parts = filename.split(",")
    if len(parts) < 4:
        return None

    layer_order = parts[0]
    if not (layer_order.startswith("L") and layer_order[1:].isdigit()):
        return None

    return int(layer_order[1:]), parts[3]


def iter_sample_dirs(root_dir: str):
    if not os.path.isdir(root_dir):
        return

    for sample_name in sorted(os.listdir(root_dir)):
        sample_dir = os.path.join(root_dir, sample_name)
        if not os.path.isdir(sample_dir):
            continue

        version_dir = os.path.join(sample_dir, "v001")
        sample_info_path = os.path.join(version_dir, "sample_info.json")
        extracted_dir = os.path.join(version_dir, "extracted")

        if os.path.isdir(version_dir) and os.path.isfile(sample_info_path) and os.path.isdir(extracted_dir):
            yield sample_dir, version_dir, sample_info_path, extracted_dir


def load_sample_info(sample_info_path: str) -> dict:
    with open(sample_info_path, "r", encoding="utf-8") as f:
        return json.load(f)


def read_zip_layers(zip_path: str) -> Tuple[List[dict], Optional[Tuple[int, int]], Optional[str]]:
    layers: List[dict] = []
    canvas_size: Optional[Tuple[int, int]] = None

    try:
        with zipfile.ZipFile(zip_path, "r") as zf:
            for entry in sorted(zf.infolist(), key=lambda item: item.filename):
                if entry.is_dir():
                    continue
                if not entry.filename.lower().endswith(".png"):
                    continue

                name = os.path.basename(entry.filename)
                parsed = parse_layer_metadata(name)
                if parsed is None:
                    continue

                order_index, layer_name = parsed
                with zf.open(entry, "r") as src:
                    data = src.read()

                try:
                    with Image.open(BytesIO(data)) as img:
                        rgba = img.convert("RGBA")
                        if canvas_size is None:
                            canvas_size = rgba.size
                        elif canvas_size != rgba.size:
                            return [], canvas_size, f"size_mismatch:{name}:{rgba.size}"
                        layers.append(
                            {
                                "order": order_index,
                                "layer_name": layer_name,
                                "filename": name,
                                "image": rgba.copy(),
                            }
                        )
                except Exception as exc:
                    return [], canvas_size, f"png_open_failed:{name}:{exc}"
    except Exception as exc:
        return [], None, f"zip_open_failed:{exc}"

    if canvas_size is None:
        return [], None, "no_png_entries"

    layers.sort(key=lambda item: item["order"])
    return layers, canvas_size, None


def find_sample_canvas_size(zip_paths: List[str]) -> Optional[Tuple[int, int]]:
    for zip_path in zip_paths:
        _, canvas_size, error = read_zip_layers(zip_path)
        if canvas_size is not None and error is None:
            return canvas_size
        if canvas_size is not None and error and not error.startswith("zip_open_failed"):
            return canvas_size
    return None


def alpha_mask_from_rgba(image: Image.Image) -> Tuple[Image.Image, int]:
    alpha = image.getchannel("A")
    binary = alpha.point(lambda value: 255 if value >= 1 else 0, mode="L")
    alpha_pixel_count = sum(alpha.histogram()[1:])
    return binary, alpha_pixel_count


def ensure_dir(path: str) -> None:
    os.makedirs(path, exist_ok=True)


def detect_view_mode(part_reports: Dict[str, dict]) -> str:
    front_core_visible = any(
        part_reports.get(part_group, {}).get("non_empty", False)
        for part_group in FRONT_CORE_PART_GROUPS
    )
    back_core_visible = any(
        part_reports.get(part_group, {}).get("non_empty", False)
        for part_group in BACK_CORE_PART_GROUPS
    )

    if front_core_visible and not back_core_visible:
        return "front"
    if back_core_visible and not front_core_visible:
        return "back"
    if front_core_visible and back_core_visible:
        return "mixed"
    return "unknown"


def is_inactive_for_view(part_group: str, view_mode: str) -> bool:
    if view_mode == "front":
        return part_group in BACK_PART_GROUPS
    if view_mode == "back":
        return part_group in FRONT_PART_GROUPS
    return False


def is_optional_part(part_group: str) -> bool:
    return part_group in OPTIONAL_PART_GROUPS


def save_empty_outputs(base_dir: str, frame_name: str, canvas_size: Tuple[int, int], part_groups: List[str]) -> None:
    empty_rgba = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    empty_mask = Image.new("L", canvas_size, 0)

    for part_group in part_groups:
        normalized_dir = os.path.join(base_dir, "normalized_layers", part_group)
        mask_dir = os.path.join(base_dir, "masks", part_group)
        ensure_dir(normalized_dir)
        ensure_dir(mask_dir)
        empty_rgba.save(os.path.join(normalized_dir, f"{frame_name}.png"), "PNG")
        empty_mask.save(os.path.join(mask_dir, f"{frame_name}_mask.png"), "PNG")


def process_sample(version_dir: str, sample_info: dict, extracted_dir: str) -> dict:
    layer_map = sample_info.get("layer_map", {})
    zip_names = sorted(
        [name for name in os.listdir(extracted_dir) if name.lower().endswith(".zip")]
    )
    zip_paths = [os.path.join(extracted_dir, name) for name in zip_names]
    sample_canvas_size = find_sample_canvas_size(zip_paths)

    report = {
        "sample_id": sample_info.get("sample_id"),
        "version": sample_info.get("version", "v001"),
        "source_frame_count": len(zip_names),
        "processed_frame_count": 0,
        "part_groups": PART_GROUPS,
        "frames": {},
        "summary": {
            "frames_ok": 0,
            "frames_with_missing_layers": 0,
            "frames_failed": 0,
            "intentional_empty_parts": 0,
        },
    }

    for zip_name in zip_names:
        frame_name = os.path.splitext(zip_name)[0]
        zip_path = os.path.join(extracted_dir, zip_name)
        frame_report = {
            "canvas_size": list(sample_canvas_size) if sample_canvas_size else None,
            "parts": {},
            "status": "ok",
        }

        layers, canvas_size, error = read_zip_layers(zip_path)
        effective_canvas_size = canvas_size or sample_canvas_size
        layer_lookup: Dict[str, List[dict]] = defaultdict(list)

        if layers:
            for layer in layers:
                layer_lookup[layer["layer_name"]].append(layer)
            frame_report["canvas_size"] = list(canvas_size)

        if effective_canvas_size is None:
            frame_report["status"] = "failed"
            frame_report["error"] = error or "unknown_canvas_size"
            report["frames"][frame_name] = frame_report
            report["processed_frame_count"] += 1
            report["summary"]["frames_failed"] += 1
            continue

        has_missing_layers = False

        for part_group in PART_GROUPS:
            mapped_layers = list(layer_map.get(part_group, []))
            normalized_dir = os.path.join(version_dir, "normalized_layers", part_group)
            mask_dir = os.path.join(version_dir, "masks", part_group)
            ensure_dir(normalized_dir)
            ensure_dir(mask_dir)

            composite = Image.new("RGBA", effective_canvas_size, (0, 0, 0, 0))
            found_layers: List[Tuple[int, str]] = []
            intentional_empty = len(mapped_layers) == 0

            if intentional_empty:
                report["summary"]["intentional_empty_parts"] += 1
            else:
                for layer_name in mapped_layers:
                    matched = layer_lookup.get(layer_name, [])
                    for item in matched:
                        found_layers.append((item["order"], layer_name))

                found_layers.sort(key=lambda item: item[0])
                for order_index, layer_name in found_layers:
                    for item in layer_lookup[layer_name]:
                        if item["order"] == order_index:
                            composite.alpha_composite(item["image"])
                            break

            mask_image, alpha_pixel_count = alpha_mask_from_rgba(composite)
            non_empty = alpha_pixel_count > 0

            composite.save(os.path.join(normalized_dir, f"{frame_name}.png"), "PNG")
            mask_image.save(os.path.join(mask_dir, f"{frame_name}_mask.png"), "PNG")

            frame_report["parts"][part_group] = {
                "source_layers_found": [name for _, name in found_layers],
                "source_layers_missing": [],
                "intentional_empty": intentional_empty,
                "non_empty": non_empty,
                "alpha_pixel_count": alpha_pixel_count,
            }

        frame_report["view_mode"] = detect_view_mode(frame_report["parts"])

        for part_group in PART_GROUPS:
            part_report = frame_report["parts"][part_group]
            mapped_layers = list(layer_map.get(part_group, []))
            found_any = len(part_report["source_layers_found"]) > 0
            inactive_by_view = is_inactive_for_view(part_group, frame_report["view_mode"])

            if part_report["intentional_empty"]:
                part_report["inactive_by_view"] = False
                part_report["optional_by_rule"] = False
                continue

            if found_any:
                part_report["inactive_by_view"] = False
                part_report["optional_by_rule"] = False
                continue

            if inactive_by_view:
                part_report["inactive_by_view"] = True
                part_report["optional_by_rule"] = False
                continue

            if is_optional_part(part_group):
                part_report["inactive_by_view"] = False
                part_report["optional_by_rule"] = True
                continue

            part_report["inactive_by_view"] = False
            part_report["optional_by_rule"] = False
            part_report["source_layers_missing"] = mapped_layers
            has_missing_layers = True

        if error is not None:
            frame_report["status"] = "failed"
            frame_report["error"] = error
            save_empty_outputs(version_dir, frame_name, effective_canvas_size, PART_GROUPS)
            report["summary"]["frames_failed"] += 1
        elif has_missing_layers:
            frame_report["status"] = "ok_with_missing_layers"
            report["summary"]["frames_with_missing_layers"] += 1
        else:
            frame_report["status"] = "ok"
            report["summary"]["frames_ok"] += 1

        report["frames"][frame_name] = frame_report
        report["processed_frame_count"] += 1

    return report


def save_report(version_dir: str, report: dict) -> None:
    report_path = os.path.join(version_dir, "sample_normalization_report.json")
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)


def main() -> int:
    parser = argparse.ArgumentParser(description="Normalize layer split reference samples.")
    parser.add_argument(
        "--root-dir",
        default=r"E:\Aseet tool\data\clothing\layer_split_refs\top_skirt_sets",
        help="Root directory that contains sample folders.",
    )
    args = parser.parse_args()

    root_dir = args.root_dir
    sample_dirs = list(iter_sample_dirs(root_dir))
    if not sample_dirs:
        print(f"No samples found under: {root_dir}")
        return 1

    overall = []
    for _, version_dir, sample_info_path, extracted_dir in sample_dirs:
        sample_info = load_sample_info(sample_info_path)
        report = process_sample(version_dir, sample_info, extracted_dir)
        save_report(version_dir, report)
        overall.append(
            {
                "sample_id": report["sample_id"],
                "frames_ok": report["summary"]["frames_ok"],
                "frames_with_missing_layers": report["summary"]["frames_with_missing_layers"],
                "frames_failed": report["summary"]["frames_failed"],
                "intentional_empty_parts": report["summary"]["intentional_empty_parts"],
            }
        )
        print(
            f"Processed {report['sample_id']}: ok={report['summary']['frames_ok']}, "
            f"missing={report['summary']['frames_with_missing_layers']}, "
            f"failed={report['summary']['frames_failed']}"
        )

    print(json.dumps(overall, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

