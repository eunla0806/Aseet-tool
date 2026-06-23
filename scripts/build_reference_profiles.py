import argparse
import json
import os
from collections import Counter, defaultdict
from typing import Dict, Iterable, List, Optional, Tuple

from PIL import Image

from generate_inpainting_masks import get_action_group
from normalize_layer_split_samples import PART_GROUPS, iter_sample_dirs, load_sample_info


ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DEFAULT_SAMPLE_ROOT = os.path.join(
    ROOT_DIR, "data", "clothing", "layer_split_refs", "top_skirt_sets"
)
DEFAULT_BODY_TEMPLATE_DIR = os.path.join(ROOT_DIR, "data", "body template")
DEFAULT_FRAMES_JSON = os.path.join(ROOT_DIR, "src", "data", "frames.json")
DEFAULT_OUTPUT_DIR = os.path.join(ROOT_DIR, "outputs", "reference_profiles")
DEFAULT_CONTRACT_DIR = os.path.join(ROOT_DIR, "data", "msw", "contracts")

STATUS_PASS = "PASS"
STATUS_RETRY_AUTO = "RETRY_AUTO"
STATUS_NEEDS_NEW_ANCHOR = "NEEDS_NEW_ANCHOR"
STATUS_OUT_OF_SCOPE = "OUT_OF_SCOPE"


def ensure_dir(path: str) -> None:
    os.makedirs(path, exist_ok=True)


def load_json(path: str) -> dict:
    with open(path, "r", encoding="utf-8") as handle:
        return json.load(handle)


def write_json(path: str, data: dict) -> None:
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(data, handle, indent=2, ensure_ascii=False)


def iter_png_files(root_dir: str) -> Iterable[str]:
    for current_root, _, files in os.walk(root_dir):
        for name in sorted(files):
            if name.lower().endswith(".png"):
                yield os.path.join(current_root, name)


def compute_bbox_from_alpha(image: Image.Image) -> Optional[List[int]]:
    alpha = image.getchannel("A")
    bbox = alpha.getbbox()
    if bbox is None:
        return None
    left, top, right, bottom = bbox
    return [left, top, right - 1, bottom - 1]


def compute_center_from_bbox(bbox: Optional[List[int]]) -> Optional[List[int]]:
    if bbox is None:
        return None
    left, top, right, bottom = bbox
    return [int((left + right) / 2), int((top + bottom) / 2)]


def collect_part_pngs(part_dir: str) -> Dict[str, str]:
    if not os.path.isdir(part_dir):
        return {}
    result: Dict[str, str] = {}
    for name in sorted(os.listdir(part_dir)):
        if not name.lower().endswith(".png"):
            continue
        frame_name = os.path.splitext(name)[0]
        if frame_name.endswith("_mask"):
            frame_name = frame_name[: -len("_mask")]
        result[frame_name] = os.path.join(part_dir, name)
    return result


def validate_sample_inputs(version_dir: str) -> List[str]:
    issues: List[str] = []
    required_paths = [
        os.path.join(version_dir, "normalized_layers"),
        os.path.join(version_dir, "masks"),
        os.path.join(version_dir, "sample_info.json"),
        os.path.join(version_dir, "sample_normalization_report.json"),
    ]
    for path in required_paths:
        if not os.path.exists(path):
            issues.append(f"missing_required:{path}")

    for part_group in PART_GROUPS:
        normalized_dir = os.path.join(version_dir, "normalized_layers", part_group)
        mask_dir = os.path.join(version_dir, "masks", part_group)
        if not os.path.isdir(normalized_dir):
            issues.append(f"missing_normalized_dir:{normalized_dir}")
        if not os.path.isdir(mask_dir):
            issues.append(f"missing_mask_dir:{mask_dir}")
    return issues


def collect_step7_inputs(sample_root: str, body_template_dir: str, frames_json_path: str) -> dict:
    errors: List[str] = []

    if not os.path.isfile(frames_json_path):
        errors.append(f"missing_frames_json:{frames_json_path}")

    body_template_paths = sorted(
        [
            os.path.join(body_template_dir, name)
            for name in os.listdir(body_template_dir)
            if name.lower().endswith(".png")
        ]
    ) if os.path.isdir(body_template_dir) else []
    if not body_template_paths:
        errors.append(f"missing_body_templates:{body_template_dir}")

    sample_entries = []
    for sample_dir, version_dir, sample_info_path, extracted_dir in iter_sample_dirs(sample_root):
        del extracted_dir
        issues = validate_sample_inputs(version_dir)
        sample_entries.append(
            {
                "sample_dir": sample_dir,
                "version_dir": version_dir,
                "sample_info_path": sample_info_path,
                "issues": issues,
            }
        )

    if not sample_entries:
        errors.append(f"no_samples_found:{sample_root}")

    return {
        "errors": errors,
        "sample_entries": sample_entries,
        "body_template_paths": body_template_paths,
        "frames_json_path": frames_json_path,
    }


def load_frames_index(frames_json_path: str) -> Dict[str, dict]:
    data = load_json(frames_json_path)
    frame_index: Dict[str, dict] = {}
    for action_name, action_info in data.get("actions", {}).items():
        for frame in action_info.get("frames", []):
            file_name = frame.get("fileName")
            if not file_name:
                continue
            frame_key = os.path.splitext(file_name)[0]
            frame_index[frame_key] = {
                "action_name": action_name,
                "frame_index": frame.get("index"),
                "display_name": action_info.get("displayName"),
                "group": get_action_group(file_name),
            }
    return frame_index


def scan_sample_assets(version_dir: str) -> dict:
    normalized_assets: Dict[str, Dict[str, str]] = {}
    mask_assets: Dict[str, Dict[str, str]] = {}

    for part_group in PART_GROUPS:
        normalized_dir = os.path.join(version_dir, "normalized_layers", part_group)
        mask_dir = os.path.join(version_dir, "masks", part_group)
        normalized_assets[part_group] = collect_part_pngs(normalized_dir)
        mask_assets[part_group] = collect_part_pngs(mask_dir)

    normalized_png_count = sum(len(items) for items in normalized_assets.values())
    mask_png_count = sum(len(items) for items in mask_assets.values())

    return {
        "normalized_assets": normalized_assets,
        "mask_assets": mask_assets,
        "normalized_png_count": normalized_png_count,
        "mask_png_count": mask_png_count,
    }


def determine_sample_status(report: dict, issues: List[str], normalization_warnings: List[str]) -> str:
    if issues:
        return STATUS_OUT_OF_SCOPE
    if report.get("summary", {}).get("frames_failed", 0) > 0:
        return STATUS_RETRY_AUTO
    if normalization_warnings:
        return STATUS_NEEDS_NEW_ANCHOR
    return STATUS_PASS


def load_sample_bundle(sample_entry: dict) -> dict:
    version_dir = sample_entry["version_dir"]
    sample_info = load_sample_info(sample_entry["sample_info_path"])
    normalization_report_path = os.path.join(version_dir, "sample_normalization_report.json")
    normalization_report = load_json(normalization_report_path)
    assets = scan_sample_assets(version_dir)

    normalization_warnings = []
    if normalization_report.get("summary", {}).get("frames_with_missing_layers", 0) > 0:
        normalization_warnings.append("frames_with_missing_layers")
    if normalization_report.get("summary", {}).get("frames_failed", 0) > 0:
        normalization_warnings.append("frames_failed")

    return {
        "sample_id": sample_info.get("sample_id"),
        "version_dir": version_dir,
        "sample_info": sample_info,
        "normalization_report": normalization_report,
        "assets": assets,
        "issues": sample_entry["issues"],
        "normalization_warnings": normalization_warnings,
        "result_status": determine_sample_status(
            normalization_report,
            sample_entry["issues"],
            normalization_warnings,
        ),
    }


def build_layer_fit_profile(samples: List[dict], frame_index: Dict[str, dict]) -> dict:
    profile = {
        "result_status": STATUS_PASS,
        "samples": {},
    }

    for sample in samples:
        sample_profile = {}
        for part_group, frames_map in sample["assets"]["normalized_assets"].items():
            for frame_key, image_path in frames_map.items():
                with Image.open(image_path) as image:
                    rgba = image.convert("RGBA")
                    bbox = compute_bbox_from_alpha(rgba)
                entry = {
                    "sample_id": sample["sample_id"],
                    "part_group": part_group,
                    "bbox": bbox,
                    "center": compute_center_from_bbox(bbox),
                    "waist_y": bbox[3] if bbox else None,
                    "hem_y": bbox[3] if bbox else None,
                    "action_name": frame_index.get(frame_key, {}).get("action_name"),
                    "group": frame_index.get(frame_key, {}).get("group"),
                    "non_empty": bbox is not None,
                }
                sample_profile.setdefault(frame_key, {})[part_group] = entry
        profile["samples"][sample["sample_id"]] = sample_profile
    return profile


def build_layer_mask_profile(samples: List[dict], frame_index: Dict[str, dict]) -> dict:
    profile = {
        "result_status": STATUS_PASS,
        "samples": {},
    }

    for sample in samples:
        sample_frames = sample["normalization_report"].get("frames", {})
        sample_profile = {}
        for part_group, frames_map in sample["assets"]["mask_assets"].items():
            for frame_key, image_path in frames_map.items():
                with Image.open(image_path) as image:
                    mask = image.convert("L")
                    bbox_raw = mask.getbbox()
                    bbox = None
                    if bbox_raw is not None:
                        left, top, right, bottom = bbox_raw
                        bbox = [left, top, right - 1, bottom - 1]
                    histogram = mask.histogram()
                    alpha_pixel_count = sum(histogram[1:])

                frame_report = sample_frames.get(frame_key, {}).get("parts", {}).get(part_group, {})
                entry = {
                    "sample_id": sample["sample_id"],
                    "part_group": part_group,
                    "bbox": bbox,
                    "alpha_pixel_count": alpha_pixel_count,
                    "intentional_empty": frame_report.get("intentional_empty", False),
                    "inactive_by_view": frame_report.get("inactive_by_view", False),
                    "optional_by_rule": frame_report.get("optional_by_rule", False),
                    "action_name": frame_index.get(frame_key, {}).get("action_name"),
                    "group": frame_index.get(frame_key, {}).get("group"),
                }
                sample_profile.setdefault(frame_key, {})[part_group] = entry
        profile["samples"][sample["sample_id"]] = sample_profile
    return profile


def build_sample_profile_report(samples: List[dict]) -> dict:
    report = {
        "result_status": STATUS_PASS,
        "samples": {},
        "summary": {
            "PASS": 0,
            "RETRY_AUTO": 0,
            "NEEDS_NEW_ANCHOR": 0,
            "OUT_OF_SCOPE": 0,
        },
    }

    for sample in samples:
        summary = sample["normalization_report"].get("summary", {})
        intentional_empty_parts = 0
        inactive_by_view_parts = 0
        part_status_counter: Counter = Counter()

        for frame_data in sample["normalization_report"].get("frames", {}).values():
            for part_data in frame_data.get("parts", {}).values():
                if part_data.get("intentional_empty"):
                    intentional_empty_parts += 1
                if part_data.get("inactive_by_view"):
                    inactive_by_view_parts += 1
                if part_data.get("intentional_empty"):
                    part_status_counter[STATUS_OUT_OF_SCOPE] += 1

        sample_result = {
            "sample_id": sample["sample_id"],
            "version_dir": sample["version_dir"],
            "result_status": sample["result_status"],
            "issues": sample["issues"],
            "warnings": sample["normalization_warnings"],
            "source_frame_count": sample["normalization_report"].get("source_frame_count", 0),
            "processed_frame_count": sample["normalization_report"].get("processed_frame_count", 0),
            "normalized_png_count": sample["assets"]["normalized_png_count"],
            "mask_png_count": sample["assets"]["mask_png_count"],
            "frames_ok": summary.get("frames_ok", 0),
            "frames_with_missing_layers": summary.get("frames_with_missing_layers", 0),
            "frames_failed": summary.get("frames_failed", 0),
            "intentional_empty_parts": intentional_empty_parts,
            "inactive_by_view_parts": inactive_by_view_parts,
        }
        report["samples"][sample["sample_id"]] = sample_result
        report["summary"][sample["result_status"]] += 1

    if report["summary"][STATUS_OUT_OF_SCOPE] > 0:
        report["result_status"] = STATUS_OUT_OF_SCOPE
    elif report["summary"][STATUS_RETRY_AUTO] > 0:
        report["result_status"] = STATUS_RETRY_AUTO
    elif report["summary"][STATUS_NEEDS_NEW_ANCHOR] > 0:
        report["result_status"] = STATUS_NEEDS_NEW_ANCHOR
    return report


def build_body_offset_profile(body_template_paths: List[str], frame_index: Dict[str, dict]) -> dict:
    profile = {
        "result_status": STATUS_PASS,
        "reference_frame": "stand1_0",
        "frames": {},
    }

    reference_center: Optional[List[int]] = None

    for image_path in body_template_paths:
        frame_key = os.path.splitext(os.path.basename(image_path))[0]
        with Image.open(image_path) as image:
            rgba = image.convert("RGBA")
            bbox = compute_bbox_from_alpha(rgba)
        center = compute_center_from_bbox(bbox)
        if frame_key == "stand1_0":
            reference_center = center
        profile["frames"][frame_key] = {
            "bbox": bbox,
            "center": center,
            "dx": 0,
            "dy": 0,
            "action_name": frame_index.get(frame_key, {}).get("action_name"),
            "group": frame_index.get(frame_key, {}).get("group"),
        }

    if reference_center is None:
        raise RuntimeError("missing_reference_body_frame:stand1_0")

    for frame_key, entry in profile["frames"].items():
        center = entry["center"]
        if center is None:
            entry["dx"] = None
            entry["dy"] = None
            continue
        entry["dx"] = center[0] - reference_center[0]
        entry["dy"] = center[1] - reference_center[1]

    return profile


def build_z_order_profile(samples: List[dict], frame_index: Dict[str, dict]) -> dict:
    profile = {
        "result_status": STATUS_PASS,
        "samples": {},
        "default_front_order": ["front_torso", "front_arm", "front_lower"],
        "default_back_order": ["back_torso", "back_lower"],
    }

    for sample in samples:
        sample_frames = {}
        for frame_key, frame_data in sample["normalization_report"].get("frames", {}).items():
            view_mode = frame_data.get("view_mode", "unknown")
            if view_mode == "front":
                active_order = ["front_torso", "front_arm", "front_lower"]
            elif view_mode == "back":
                active_order = ["back_torso", "back_lower"]
            else:
                active_order = PART_GROUPS[:]

            sample_frames[frame_key] = {
                "sample_id": sample["sample_id"],
                "view_mode": view_mode,
                "active_order": active_order,
                "action_name": frame_index.get(frame_key, {}).get("action_name"),
                "group": frame_index.get(frame_key, {}).get("group"),
                "result_status": STATUS_PASS if view_mode in {"front", "back"} else STATUS_OUT_OF_SCOPE,
            }
        profile["samples"][sample["sample_id"]] = sample_frames
    return profile


def build_output_paths(output_dir: str) -> Dict[str, str]:
    return {
        "layer_fit_profile": os.path.join(output_dir, "layer_fit_profile.json"),
        "layer_mask_profile": os.path.join(output_dir, "layer_mask_profile.json"),
        "sample_profile_report": os.path.join(output_dir, "sample_profile_report.json"),
        "body_offset_profile": os.path.join(output_dir, "body_offset_profile.json"),
        "z_order_profile": os.path.join(output_dir, "z_order_profile.json"),
    }


def verify_step7_outputs(output_paths: Dict[str, str]) -> None:
    for key, path in output_paths.items():
        if not os.path.isfile(path):
            raise RuntimeError(f"missing_output:{key}:{path}")
        if os.path.getsize(path) == 0:
            raise RuntimeError(f"empty_output:{key}:{path}")
        loaded = load_json(path)
        if not loaded:
            raise RuntimeError(f"invalid_output:{key}:{path}")


def run(sample_root: str, body_template_dir: str, frames_json_path: str, output_dir: str, contract_dir: str) -> Dict[str, str]:
    ensure_dir(output_dir)
    ensure_dir(contract_dir)

    collected = collect_step7_inputs(sample_root, body_template_dir, frames_json_path)
    if collected["errors"]:
        raise RuntimeError(";".join(collected["errors"]))

    valid_samples = []
    for sample_entry in collected["sample_entries"]:
        if sample_entry["issues"]:
            raise RuntimeError(";".join(sample_entry["issues"]))
        valid_samples.append(load_sample_bundle(sample_entry))

    frame_index = load_frames_index(collected["frames_json_path"])
    output_paths = build_output_paths(output_dir)

    write_json(output_paths["layer_fit_profile"], build_layer_fit_profile(valid_samples, frame_index))
    write_json(output_paths["layer_mask_profile"], build_layer_mask_profile(valid_samples, frame_index))
    write_json(output_paths["sample_profile_report"], build_sample_profile_report(valid_samples))
    write_json(output_paths["body_offset_profile"], build_body_offset_profile(collected["body_template_paths"], frame_index))
    write_json(output_paths["z_order_profile"], build_z_order_profile(valid_samples, frame_index))

    verify_step7_outputs(output_paths)
    return output_paths


def main() -> int:
    parser = argparse.ArgumentParser(description="Build STEP 7 reference profiles.")
    parser.add_argument("--sample-root", default=DEFAULT_SAMPLE_ROOT)
    parser.add_argument("--body-template-dir", default=DEFAULT_BODY_TEMPLATE_DIR)
    parser.add_argument("--frames-json", default=DEFAULT_FRAMES_JSON)
    parser.add_argument("--output-dir", default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--contract-dir", default=DEFAULT_CONTRACT_DIR)
    args = parser.parse_args()

    output_paths = run(
        sample_root=args.sample_root,
        body_template_dir=args.body_template_dir,
        frames_json_path=args.frames_json,
        output_dir=args.output_dir,
        contract_dir=args.contract_dir,
    )
    print(json.dumps(output_paths, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
