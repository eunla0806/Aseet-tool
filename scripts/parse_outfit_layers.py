import os
import sys
import json
from PIL import Image, ImageFilter

def is_clothing_layer(layer_name):
    lname = layer_name.lower()
    return "pants" in lname or "mail" in lname

def calculate_overlap_stats(cl_mask, pr_mask):
    cl_pixels = cl_mask.load()
    pr_pixels = pr_mask.load()
    width, height = cl_mask.size
    
    cl_count = 0
    pr_count = 0
    overlap_count = 0
    
    for x in range(width):
        for y in range(height):
            c_val = cl_pixels[x, y]
            p_val = pr_pixels[x, y]
            
            if c_val > 127:
                cl_count += 1
            if p_val > 127:
                pr_count += 1
            if c_val > 127 and p_val > 127:
                overlap_count += 1
                
    ratio = overlap_count / cl_count if cl_count > 0 else 0.0
    return cl_count, pr_count, overlap_count, ratio

def process_frame(frame_dir, out_ref_dir, out_cl_mask_dir, out_pr_mask_dir):
    if not os.path.isdir(frame_dir):
        return None
        
    png_files = [f for f in os.listdir(frame_dir) if f.lower().endswith('.png')]
    if not png_files:
        return None
        
    # Parse layers
    clothing_layers = []
    body_layers = []
    
    for f in png_files:
        parts = f.split(',')
        if len(parts) >= 4:
            layer_name = parts[3]
            layer_order_str = parts[0]
            if layer_order_str.startswith('L') and layer_order_str[1:].isdigit():
                layer_order = int(layer_order_str[1:])
            else:
                layer_order = 999
            
            p = os.path.join(frame_dir, f)
            if is_clothing_layer(layer_name):
                clothing_layers.append((layer_order, layer_name, p))
            else:
                body_layers.append((layer_order, layer_name, p))
                
    # Sort layers by L order ascending
    clothing_layers.sort(key=lambda x: x[0])
    body_layers.sort(key=lambda x: x[0])
    
    # Read size from first image
    first_img_path = png_files[0]
    with Image.open(os.path.join(frame_dir, first_img_path)) as img:
        width, height = img.size
        
    # 1. Composite clothing reference frame
    clothing_ref = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    for _, _, p in clothing_layers:
        with Image.open(p).convert("RGBA") as layer_img:
            clothing_ref.paste(layer_img, (0, 0), layer_img)
            
    # 2. Composite body layers for preserve mask base
    body_ref = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    for _, _, p in body_layers:
        with Image.open(p).convert("RGBA") as layer_img:
            body_ref.paste(layer_img, (0, 0), layer_img)
            
    # 3. Create clothing mask (alpha >= 10 is white, else black)
    clothing_mask = Image.new("L", (width, height), 0)
    cl_pixels = clothing_ref.load()
    for x in range(width):
        for y in range(height):
            _, _, _, a = cl_pixels[x, y]
            if a >= 10:
                clothing_mask.putpixel((x, y), 255)
                
    # 4. Create raw preserve mask, and subtract clothing_mask from it!
    # preserve_mask_final = raw_preserve_mask - clothing_mask
    preserve_mask = Image.new("L", (width, height), 0)
    bd_pixels = body_ref.load()
    cl_pixels_mask = clothing_mask.load()
    for x in range(width):
        for y in range(height):
            _, _, _, a = bd_pixels[x, y]
            if a >= 10:
                # Subtract clothing_mask
                if cl_pixels_mask[x, y] == 0:
                    preserve_mask.putpixel((x, y), 255)
                
    # Apply dilation to clothing mask (MaxFilter(3)) and erosion to preserve mask (MinFilter(3))
    clothing_mask_dilated = clothing_mask.filter(ImageFilter.MaxFilter(size=3))
    preserve_mask_eroded = preserve_mask.filter(ImageFilter.MinFilter(size=3))

    # 실제 저장되는 preserve_mask에서도 clothing_mask 영역을 한 번 더 제거한다.
    # 이렇게 해야 PNG 파일을 직접 검사해도 두 마스크가 겹치지 않는다.
    preserve_mask_final = Image.new("L", (width, height), 0)
    cl_final_pixels = clothing_mask_dilated.load()
    pr_eroded_pixels = preserve_mask_eroded.load()
    for x in range(width):
        for y in range(height):
            if pr_eroded_pixels[x, y] > 127 and cl_final_pixels[x, y] <= 127:
                preserve_mask_final.putpixel((x, y), 255)
    
    # Calculate overlap statistics on the exact masks saved as PNG files
    cl_count, pr_count, overlap_count, ratio = calculate_overlap_stats(clothing_mask_dilated, preserve_mask_final)
    
    # Save outputs
    frame_name = os.path.basename(frame_dir)
    ref_path = os.path.join(out_ref_dir, f"{frame_name}.png")
    cl_mask_path = os.path.join(out_cl_mask_dir, f"{frame_name}.png")
    pr_mask_path = os.path.join(out_pr_mask_dir, f"{frame_name}.png")
    
    clothing_ref.save(ref_path, "PNG")
    clothing_mask_dilated.save(cl_mask_path, "PNG")
    preserve_mask_final.save(pr_mask_path, "PNG")
    
    return {
        "clothing_layers": [x[1] for x in clothing_layers],
        "body_layers": [x[1] for x in body_layers],
        "stats": {
            "clothing_mask_pixel_count": cl_count,
            "preserve_mask_pixel_count": pr_count,
            "mask_overlap_pixel_count": overlap_count,
            "mask_overlap_ratio": ratio
        }
    }

def main():
    dataset_root = r"e:\Aseet tool\data\clothing\outfit"
    output_root = r"e:\Aseet tool\outputs\layer_parse\outfit"
    
    # Selected 5 pants and 5 skirts
    selected_samples = {
        "pants": [
            "Amethyst Gothic",
            "Banana Outing Clothes",
            "Beach Bum Outfit",
            "Black Boy Scout",
            "Bloody Guardian"
        ],
        "skirt": [
            "02_ 개나리 소풍",
            "05_멜로디 소녀",
            "Apple of Truth",
            "Aqua Phoenix Dress",
            "Autumn Wind Outfit"
        ]
    }
    
    report_data = {
        "category": "outfit",
        "processed_samples": [],
        "summary": {
            "total_samples": 0,
            "total_frames": 0,
            "success_count": 0,
            "total_clothing_mask_pixels": 0,
            "total_preserve_mask_pixels": 0,
            "total_overlap_pixels": 0,
            "avg_overlap_ratio": 0.0
        }
    }
    
    print("==================================================")
    print("Starting Aligned Layer Parsing & Overlap Check (STEP 4.5)")
    print("==================================================")
    
    total_frames_processed = 0
    success_samples = 0
    
    total_cl_px = 0
    total_pr_px = 0
    total_ov_px = 0
    ratio_sum = 0.0
    
    for sub_dir, samples in selected_samples.items():
        sub_dir_path = os.path.join(dataset_root, sub_dir)
        if not os.path.exists(sub_dir_path):
            print(f"Warning: Subdirectory {sub_dir_path} does not exist.")
            continue
            
        for sample in samples:
            sample_path = os.path.join(sub_dir_path, sample)
            if not os.path.exists(sample_path):
                print(f"Warning: Sample {sample_path} does not exist.")
                continue
                
            print(f"\nProcessing garment: {sub_dir}/{sample}...")
            
            # Setup output directories
            out_ref_dir = os.path.join(output_root, "clothing_reference_frames", sub_dir, sample)
            out_cl_mask_dir = os.path.join(output_root, "clothing_masks", sub_dir, sample)
            out_pr_mask_dir = os.path.join(output_root, "preserve_masks", sub_dir, sample)
            
            os.makedirs(out_ref_dir, exist_ok=True)
            os.makedirs(out_cl_mask_dir, exist_ok=True)
            os.makedirs(out_pr_mask_dir, exist_ok=True)
            
            frame_dirs = sorted([d for d in os.listdir(sample_path) if os.path.isdir(os.path.join(sample_path, d))])
            
            clothing_layers_set = set()
            body_layers_set = set()
            frames_processed = 0
            
            sample_frames_list = []
            sample_cl_px = 0
            sample_pr_px = 0
            sample_ov_px = 0
            sample_ratio_sum = 0.0
            
            for f_dir in frame_dirs:
                frame_path = os.path.join(sample_path, f_dir)
                res = process_frame(frame_path, out_ref_dir, out_cl_mask_dir, out_pr_mask_dir)
                if res:
                    clothing_layers_set.update(res["clothing_layers"])
                    body_layers_set.update(res["body_layers"])
                    frames_processed += 1
                    total_frames_processed += 1
                    
                    st = res["stats"]
                    sample_cl_px += st["clothing_mask_pixel_count"]
                    sample_pr_px += st["preserve_mask_pixel_count"]
                    sample_ov_px += st["mask_overlap_pixel_count"]
                    sample_ratio_sum += st["mask_overlap_ratio"]
                    
                    sample_frames_list.append({
                        "frame_name": f_dir,
                        "clothing_mask_pixel_count": st["clothing_mask_pixel_count"],
                        "preserve_mask_pixel_count": st["preserve_mask_pixel_count"],
                        "mask_overlap_pixel_count": st["mask_overlap_pixel_count"],
                        "mask_overlap_ratio": st["mask_overlap_ratio"]
                    })
            
            if frames_processed > 0:
                success_samples += 1
                
                # Calculate sample-level averages/sums
                sample_avg_ratio = sample_ratio_sum / frames_processed
                
                total_cl_px += sample_cl_px
                total_pr_px += sample_pr_px
                total_ov_px += sample_ov_px
                ratio_sum += sample_ratio_sum
                
                report_data["processed_samples"].append({
                    "name": sample,
                    "type": sub_dir,
                    "source_dir": sample_path,
                    "total_frames_processed": frames_processed,
                    "clothing_layers_found": sorted(list(clothing_layers_set)),
                    "body_layers_found": sorted(list(body_layers_set)),
                    "status": "success",
                    "overlap_stats": {
                        "total_clothing_mask_pixels": sample_cl_px,
                        "total_preserve_mask_pixels": sample_pr_px,
                        "total_overlap_pixels": sample_ov_px,
                        "avg_overlap_ratio": sample_avg_ratio
                    },
                    "frames": sample_frames_list
                })
                print(f"-> Success! Processed {frames_processed} frames.")
                print(f"   Clothing layers: {sorted(list(clothing_layers_set))}")
                print(f"   Overlap Stats: clothing={sample_cl_px}px, preserve={sample_pr_px}px, overlap={sample_ov_px}px, ratio={sample_avg_ratio:.4f}")
                
                # Especially print Amethyst Gothic stand1 frame stats to console for visual check
                if sample == "Amethyst Gothic":
                    print("   [Amethyst Gothic stand1 frame-by-frame stats]:")
                    for fr in sample_frames_list:
                        if fr["frame_name"].startswith("stand1"):
                            print(f"     - {fr['frame_name']}: cl_px={fr['clothing_mask_pixel_count']}, pr_px={fr['preserve_mask_pixel_count']}, overlap={fr['mask_overlap_pixel_count']}, ratio={fr['mask_overlap_ratio']:.4f}")
            else:
                print(f"-> Warning: No frames processed for {sample}.")
                
    # Aggregate grand summary
    avg_ratio = ratio_sum / total_frames_processed if total_frames_processed > 0 else 0.0
    report_data["summary"] = {
        "total_samples": len(selected_samples["pants"]) + len(selected_samples["skirt"]),
        "total_frames": total_frames_processed,
        "success_count": success_samples,
        "total_clothing_mask_pixels": total_cl_px,
        "total_preserve_mask_pixels": total_pr_px,
        "total_overlap_pixels": total_ov_px,
        "avg_overlap_ratio": avg_ratio
    }
    
    # Save layer_parse_report.json
    report_path = os.path.join(output_root, "layer_parse_report.json")
    os.makedirs(os.path.dirname(report_path), exist_ok=True)
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report_data, f, indent=2, ensure_ascii=False)
        
    print("\n==================================================")
    print("Layer Parsing & Overlap Optimization Complete!")
    print(f"Successfully processed {success_samples} samples.")
    print(f"Total processed frames: {total_frames_processed}")
    print(f"Grand Overlap Summary: clothing={total_cl_px}px, preserve={total_pr_px}px, overlap={total_ov_px}px, avg_ratio={avg_ratio:.4f}")
    print(f"Report saved to: {report_path}")
    print("==================================================")

if __name__ == "__main__":
    main()
