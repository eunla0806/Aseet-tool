import os
import sys
import argparse
from PIL import Image

def verify(template_dir, mask_dir):
    if not os.path.exists(template_dir):
        print(f"Error: Template directory not found: {template_dir}")
        return False
    if not os.path.exists(mask_dir):
        print(f"Error: Mask directory not found: {mask_dir}")
        return False
        
    all_pngs = [f for f in os.listdir(template_dir) if f.lower().endswith('.png')]
    
    if not all_pngs:
        print(f"Error: No body templates found in {template_dir}")
        return False
        
    errors = 0
    passed = 0
    
    print(f"Starting automatic mask integrity verification for ALL {len(all_pngs)} frames...")
    for filename in all_pngs:
        base_name = os.path.splitext(filename)[0]
        tpl_path = os.path.join(template_dir, filename)
        cl_path = os.path.join(mask_dir, "clothing_mask", f"{base_name}_clothing_mask.png")
        pr_path = os.path.join(mask_dir, "preserve_mask", f"{base_name}_preserve_mask.png")
        
        # 1. Existence check
        if not os.path.exists(cl_path):
            print(f"  [ERROR] Clothing mask not found: {cl_path}")
            errors += 1
            continue
        if not os.path.exists(pr_path):
            print(f"  [ERROR] Preserve mask not found: {pr_path}")
            errors += 1
            continue
            
        try:
            tpl_img = Image.open(tpl_path)
            cl_img = Image.open(cl_path)
            pr_img = Image.open(pr_path)
        except Exception as e:
            print(f"  [ERROR] Failed to open images for {filename}: {e}")
            errors += 1
            continue
        
        # 2. Dimensions check
        if tpl_img.size != cl_img.size:
            print(f"  [ERROR] Dimension mismatch on {cl_path}: Template {tpl_img.size} vs Mask {cl_img.size}")
            errors += 1
        elif tpl_img.size != pr_img.size:
            print(f"  [ERROR] Dimension mismatch on {pr_path}: Template {tpl_img.size} vs Mask {pr_img.size}")
            errors += 1
        else:
            # 3. Binary value range check
            cl_colors = cl_img.getcolors()
            pr_colors = pr_img.getcolors()
            
            cl_ok = all(color[1] in [0, 255] for color in cl_colors) if cl_colors else False
            pr_ok = all(color[1] in [0, 255] for color in pr_colors) if pr_colors else False
            
            if not cl_ok:
                print(f"  [ERROR] Clothing mask {filename} contains non-binary colors: {[c[1] for c in cl_colors]}")
                errors += 1
            elif not pr_ok:
                print(f"  [ERROR] Preserve mask {filename} contains non-binary colors: {[c[1] for c in pr_colors]}")
                errors += 1
            else:
                passed += 1
                
    print(f"\nVerification finished: Passed {passed}/{len(all_pngs)} frames. Errors found: {errors}")
    return errors == 0

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="MapleStory Worlds Mask Integrity Verifier")
    parser.add_argument(
        "--template_dir",
        type=str,
        default=r"e:\Aseet tool\data\body template",
        help="Path to body templates folder"
    )
    parser.add_argument(
        "--mask_dir",
        type=str,
        default=r"e:\Aseet tool\data\masks",
        help="Path to generated masks folder"
    )
    args = parser.parse_args()
    
    success = verify(args.template_dir, args.mask_dir)
    sys.exit(0 if success else 1)
