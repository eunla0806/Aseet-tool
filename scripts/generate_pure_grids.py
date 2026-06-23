import os
import sys
import glob
from PIL import Image, ImageFilter

def get_action_group(action_name):
    """
    Classifies the action name into one of the 7 action groups defined in FRAME_GROUP_PLAN.md.
    """
    g1_actions = ['stand1', 'stand2', 'alert']
    g2_actions = ['walk1', 'walk2', 'fly']
    g3_actions = ['sit', 'jump']
    g4_actions = ['ladder', 'rope']
    g5_actions = ['prone', 'proneStab']
    g6_actions = ['stabO1', 'stabO2', 'stabOF', 'stabT1', 'stabT2', 'stabTF', 'shoot1', 'shoot2', 'shootF']
    g7_actions = ['swingO1', 'swingO2', 'swingO3', 'swingOF', 'swingP1', 'swingP2', 'swingPF', 'swingT1', 'swingT2', 'swingT3', 'swingTF']
    
    if action_name in g1_actions:
        return 'G1'
    elif action_name in g2_actions:
        return 'G2'
    elif action_name in g3_actions:
        return 'G3'
    elif action_name in g4_actions:
        return 'G4'
    elif action_name in g5_actions:
        return 'G5'
    elif action_name in g6_actions:
        return 'G6'
    elif action_name in g7_actions:
        return 'G7'
    
    return 'G1'  # Default fallback

def is_skin_color(r, g, b):
    """
    Smart Skin-Tone detection based on Warm-Tone Salmony Skin color spectrum of MSW avatars.
    """
    # MSW skin tone ranges: High R, Medium G, Medium-Low B, where R >= G > B
    return (r >= 220) and (150 <= g <= 255) and (80 <= b <= 240) and (r >= g > b)

def extract_single_frame_masks(img, action_name, frame_idx, filename):
    """
    Extracts high-precision clothing and preserve masks for a single frame
    using a hybrid Y-threshold and Skin-Tone Smart Detector.
    """
    width, height = img.size
    clothing_mask = Image.new('L', (width, height), 0)
    preserve_mask = Image.new('L', (width, height), 0)
    
    group = get_action_group(action_name)
    
    for x in range(width):
        for y in range(height):
            r, g, b, a = img.getpixel((x, y))
            if a < 10:  # Skip transparent pixels
                continue
            
            # Apply base Y-threshold rules first
            is_preserve = False
            is_clothing = False
            
            if group == 'G1' or group == 'G2':
                # Head <= 33, Torso/Legs 34~62, Feet > 62
                if y <= 33:
                    is_preserve = True
                elif 33 < y <= 62:
                    is_clothing = True
                else:
                    is_preserve = True
                    
            elif group == 'G3':
                if 'sit' in action_name:
                    # sit is compressed (height ~60px)
                    if y <= 25:
                        is_preserve = True
                    elif 25 < y <= 54:
                        is_clothing = True
                    else:
                        is_preserve = True
                else:  # jump
                    if y <= 33:
                        is_preserve = True
                    elif 33 < y <= 62:
                        is_clothing = True
                    else:
                        is_preserve = True
                        
            elif group == 'G4':
                # backhead <= 30
                if y <= 30:
                    is_preserve = True
                elif 30 < y <= 62:
                    is_clothing = True
                else:
                    is_preserve = True
                    
            elif group == 'G5':
                # prone is horizontal. Head left (X <= 28), body 28~55, feet > 55
                if x <= 28:
                    is_preserve = True
                elif 28 < x <= 55:
                    is_clothing = True
                else:
                    is_preserve = True
                    
            else:  # G6 & G7 attack groups: Dynamic scaling
                if y <= height * 0.48:
                    is_preserve = True
                elif height * 0.48 < y <= height * 0.90:
                    is_clothing = True
                else:
                    is_preserve = True
            
            # --- 🌟 Skin-Tone Smart Correction 🌟 ---
            # MASK_SPEC.md 2.2 규격: 피부색 조건 부합 시 Y축 임계값 범위에 상관없이
            # 무조건 의상 마스크(clothing_mask)에서 제외하고, 보존 마스크(preserve_mask)에 합집합 병합합니다.
            if is_skin_color(r, g, b):
                is_preserve = True
                is_clothing = False
                
            # Extra protection: face/eyes/blush which might not fall strictly into the skin tone range,
            # but are definitely in the upper head region.
            if y <= 30 and group != 'G4' and group != 'G5':  # Rear climbing and prone excluded
                # Any non-transparent pixel in upper head is highly likely face details (eyes, mouth, blush)
                is_preserve = True
                is_clothing = False
                
            if is_preserve:
                preserve_mask.putpixel((x, y), 255)
            if is_clothing:
                clothing_mask.putpixel((x, y), 255)
                
    # Apply Dilation to clothing mask (1px expansion) and Erosion to preserve mask (1px contraction)
    clothing_final = clothing_mask.filter(ImageFilter.MaxFilter(size=3))
    preserve_final = preserve_mask.filter(ImageFilter.MinFilter(size=3))
    
    return clothing_final, preserve_final

def build_pure_grid_strip(action_name, frame_count, template_dir):
    """
    Builds a single horizontal sprite sheet strip for base grid, clothing mask and preserve mask.
    Size: (frame_count * 120) x 120
    Uses pre-verified individual masks from data/masks/ directory to ensure 100% integrity.
    """
    cell_w, cell_h = 120, 120
    grid_w = frame_count * cell_w
    
    # Create pure canvases
    base_canvas = Image.new("RGBA", (grid_w, cell_h), (0, 0, 0, 0))
    clothing_canvas = Image.new("L", (grid_w, cell_h), 0)
    preserve_canvas = Image.new("L", (grid_w, cell_h), 0)
    
    success = False
    
    # Define verified individual mask root directory
    masks_root = r"e:\Aseet tool\data\masks"
    
    for idx in range(frame_count):
        filename = f"{action_name}_{idx}.png"
        img_path = os.path.join(template_dir, filename)
        
        if not os.path.exists(img_path):
            continue
            
        try:
            img = Image.open(img_path).convert('RGBA')
        except Exception as e:
            print(f"\nError opening frame {filename}: {e}")
            continue
            
        success = True
        
        # Calculate strict alignment offsets matching React viewer PreviewStage.tsx
        cell_x1 = idx * cell_w
        img_x = cell_x1 + (cell_w - img.width) // 2
        img_y = (cell_h - img.height - 20) // 2
        
        # Define pre-verified individual mask file paths
        cl_mask_path = os.path.join(masks_root, "clothing_mask", f"{action_name}_{idx}_clothing_mask.png")
        pr_mask_path = os.path.join(masks_root, "preserve_mask", f"{action_name}_{idx}_preserve_mask.png")
        
        # 1. Load Clothing Mask (with Fallback to real-time if missing)
        if os.path.exists(cl_mask_path):
            clothing_frame_mask = Image.open(cl_mask_path).convert('L')
        else:
            print(f"\n[Warning] Pre-verified clothing mask missing, using fallback: {cl_mask_path}")
            clothing_frame_mask, _ = extract_single_frame_masks(img, action_name, idx, filename)
            
        # 2. Load Preserve Mask (with Fallback to real-time if missing)
        if os.path.exists(pr_mask_path):
            preserve_frame_mask = Image.open(pr_mask_path).convert('L')
        else:
            print(f"\n[Warning] Pre-verified preserve mask missing, using fallback: {pr_mask_path}")
            _, preserve_frame_mask = extract_single_frame_masks(img, action_name, idx, filename)
        
        # Paste onto pure strips
        base_canvas.paste(img, (img_x, img_y), img)
        clothing_canvas.paste(clothing_frame_mask, (img_x, img_y))
        preserve_canvas.paste(preserve_frame_mask, (img_x, img_y))
        
    if not success:
        return None, None, None
        
    return base_canvas, clothing_canvas, preserve_canvas

def generate_all_pure_grids(template_dir, output_dir):
    """
    Iterates over all 32 action categories, generates pure strips and masks, and saves them.
    """
    action_frames = {
        "stand1": 4, "stand2": 4, "alert": 4,
        "walk1": 5, "walk2": 5, "fly": 3,
        "ladder": 3, "rope": 3,
        "prone": 2, "proneStab": 3,
        "shoot1": 4, "shoot2": 6, "shootF": 4,
        "stabO1": 3, "stabO2": 3, "stabOF": 4,
        "stabT1": 4, "stabT2": 4, "stabTF": 5,
        "swingO1": 4, "swingO2": 4, "swingO3": 4, "swingOF": 5,
        "swingP1": 4, "swingP2": 4, "swingPF": 5,
        "swingT1": 4, "swingT2": 4, "swingT3": 4, "swingTF": 5,
        "sit": 2, "jump": 2
    }
    
    # Establish subdirectories
    base_dir = os.path.join(output_dir, "base")
    clothing_mask_dir = os.path.join(output_dir, "masks", "clothing_mask")
    preserve_mask_dir = os.path.join(output_dir, "masks", "preserve_mask")
    
    os.makedirs(base_dir, exist_ok=True)
    os.makedirs(clothing_mask_dir, exist_ok=True)
    os.makedirs(preserve_mask_dir, exist_ok=True)
    
    print(f"Scanning body templates from: {template_dir}")
    print(f"Generating pure strips for {len(action_frames)} action categories...")
    
    created_count = 0
    
    for idx, (action_name, count) in enumerate(action_frames.items()):
        sys.stdout.write(f"\rBuilding [{idx + 1}/{len(action_frames)}]: {action_name} ({count} frames)")
        sys.stdout.flush()
        
        base_grid, clothing_grid, preserve_grid = build_pure_grid_strip(
            action_name, count, template_dir
        )
        
        if base_grid is None:
            continue
            
        # Save output strips
        base_path = os.path.join(base_dir, f"pure_{action_name}.png")
        clothing_path = os.path.join(clothing_mask_dir, f"pure_{action_name}_clothing_mask.png")
        preserve_path = os.path.join(preserve_mask_dir, f"pure_{action_name}_preserve_mask.png")
        
        base_grid.save(base_path, "PNG")
        clothing_grid.save(clothing_path, "PNG")
        preserve_grid.save(preserve_path, "PNG")
        
        created_count += 1
        
    print(f"\n\nGrid Strip Generation Complete!")
    print(f"Successfully compiled {created_count} pure action strips.")
    print(f"  -> Base pure grids saved in: {base_dir}")
    print(f"  -> Clothing mask grids saved in: {clothing_mask_dir}")
    print(f"  -> Preserve mask grids saved in: {preserve_mask_dir}")

if __name__ == "__main__":
    template_path = r"e:\Aseet tool\data\body template"
    output_path = r"e:\Aseet tool\data\grid\pure_grids"
    
    generate_all_pure_grids(template_path, output_path)
