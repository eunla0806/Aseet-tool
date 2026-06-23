import os
import sys
import glob
from PIL import Image, ImageFilter

def get_action_group(filename):
    """
    Classify the filename into one of the 7 action groups defined in FRAME_GROUP_PLAN.md.
    """
    action_name = filename.split('_')[0]
    
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

def process_single_frame(img_path, output_dir, do_dilation_erosion=True):
    """
    Processes a single body template frame, extracts the clothing mask and preserve mask
    based on action group Y-threshold heuristics, applies dilation/erosion, and saves them.
    """
    filename = os.path.basename(img_path)
    base_name = os.path.splitext(filename)[0]
    group = get_action_group(filename)
    
    try:
        img = Image.open(img_path).convert('RGBA')
    except Exception as e:
        print(f"Error opening image {img_path}: {e}")
        return False
        
    width, height = img.size
    
    # 1. Create binary canvas for clothing mask and preserve mask (L mode = 8-bit black/white)
    clothing_mask = Image.new('L', (width, height), 0)
    preserve_mask = Image.new('L', (width, height), 0)
    
    for x in range(width):
        for y in range(height):
            r, g, b, a = img.getpixel((x, y))
            if a < 10:  # Ignore transparent pixels
                continue
                
            # Apply group specific threshold rules defined in MASK_SPEC.md
            if group == 'G1' or group == 'G2':
                # G1 & G2: Height ~68px standard. Head <= 33, Body 33~62, Feet > 62
                if y <= 33:
                    preserve_mask.putpixel((x, y), 255)
                elif 33 < y <= 62:
                    clothing_mask.putpixel((x, y), 255)
                else:
                    preserve_mask.putpixel((x, y), 255)
                    
            elif group == 'G3':
                # G3: Sit & Jump. sit is compressed (height ~60px), jump is standard (height ~68px)
                if 'sit' in filename:
                    if y <= 25:
                        preserve_mask.putpixel((x, y), 255)
                    elif 25 < y <= 54:
                        clothing_mask.putpixel((x, y), 255)
                    else:
                        preserve_mask.putpixel((x, y), 255)
                else:  # jump
                    if y <= 33:
                        preserve_mask.putpixel((x, y), 255)
                    elif 33 < y <= 62:
                        clothing_mask.putpixel((x, y), 255)
                    else:
                        preserve_mask.putpixel((x, y), 255)
                        
            elif group == 'G4':
                # G4 climbing: back-facing, backhead <= 30, body 30~62, feet > 62
                if y <= 30:
                    preserve_mask.putpixel((x, y), 255)
                elif 30 < y <= 62:
                    clothing_mask.putpixel((x, y), 255)
                else:
                    preserve_mask.putpixel((x, y), 255)
                    
            elif group == 'G5':
                # G5 prone: horizontally lying down. height ~35px, width ~65px. Head is typically left (X <= 28)
                if x <= 28:
                    preserve_mask.putpixel((x, y), 255)
                elif 28 < x <= 55:
                    clothing_mask.putpixel((x, y), 255)
                else:
                    preserve_mask.putpixel((x, y), 255)
                    
            else:  # G6 & G7: Dynamic scaling ratios for attacks
                if y <= height * 0.48:
                    preserve_mask.putpixel((x, y), 255)
                elif height * 0.48 < y <= height * 0.90:
                    clothing_mask.putpixel((x, y), 255)
                else:
                    preserve_mask.putpixel((x, y), 255)
                    
    # 2. Apply Dilation (1px expansion) on clothing mask and Erosion (1px contraction) on preserve mask
    if do_dilation_erosion:
        # PIL MaxFilter(size=3) expands white pixels (Dilation)
        clothing_final = clothing_mask.filter(ImageFilter.MaxFilter(size=3))
        # PIL MinFilter(size=3) contracts white pixels (Erosion)
        preserve_final = preserve_mask.filter(ImageFilter.MinFilter(size=3))
    else:
        clothing_final = clothing_mask
        preserve_final = preserve_mask
        
    # Create subdirectories for masks
    clothing_dir = os.path.join(output_dir, "clothing_mask")
    preserve_dir = os.path.join(output_dir, "preserve_mask")
    os.makedirs(clothing_dir, exist_ok=True)
    os.makedirs(preserve_dir, exist_ok=True)
    
    # Save outputs
    clothing_path = os.path.join(clothing_dir, f"{base_name}_clothing_mask.png")
    preserve_path = os.path.join(preserve_dir, f"{base_name}_preserve_mask.png")
    
    clothing_final.save(clothing_path, "PNG")
    preserve_final.save(preserve_path, "PNG")
    
    return True

def generate_all_masks(template_dir, output_dir, anchor_only=False):
    """
    Scans template folder and generates clothing/preserve masks for all or anchor frames.
    """
    if not os.path.exists(template_dir):
        print(f"Error: Template directory not found: {template_dir}")
        return
        
    search_path = os.path.join(template_dir, "*.png")
    all_frames = glob.glob(search_path)
    
    if not all_frames:
        print(f"Error: No body templates found in {template_dir}")
        return
        
    # List of 11 anchor frames from STEP 3 FRAME_GROUP_PLAN.md
    anchor_frames = [
        "stand1_0.png", "stand2_0.png", "walk1_1.png", "sit_0.png", "jump_0.png",
        "ladder_0.png", "prone_0.png", "stabO1_0.png", "shoot1_1.png", "swingO1_1.png", "swingT1_1.png"
    ]
    
    target_frames = []
    if anchor_only:
        print("Generating masks ONLY for the 11 Anchor Frames (STEP 3 selection)...")
        for f_path in all_frames:
            if os.path.basename(f_path) in anchor_frames:
                target_frames.append(f_path)
    else:
        print("Generating masks for ALL 124 frames...")
        target_frames = all_frames
        
    success_count = 0
    for idx, f_path in enumerate(target_frames):
        filename = os.path.basename(f_path)
        sys.stdout.write(f"\rProcessing [{idx + 1}/{len(target_frames)}]: {filename}")
        sys.stdout.flush()
        if process_single_frame(f_path, output_dir, do_dilation_erosion=True):
            success_count += 1
            
    print(f"\n\nGeneration Complete!")
    print(f"Successfully created masks for {success_count} frames.")
    print(f"Clothing masks saved in: {os.path.join(output_dir, 'clothing_mask')}")
    print(f"Preserve masks saved in: {os.path.join(output_dir, 'preserve_mask')}")

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="MapleStory Worlds Inpainting Mask Generator")
    parser.add_argument(
        "--template_dir",
        type=str,
        default=r"e:\Aseet tool\data\body template",
        help="Path to body templates folder"
    )
    parser.add_argument(
        "--output_dir",
        type=str,
        default=r"e:\Aseet tool\data\masks",
        help="Path to generated masks folder"
    )
    parser.add_argument(
        "--anchor_only",
        action="store_true",
        help="Generate masks ONLY for the 11 Anchor Frames"
    )
    
    # Check old CLI style compatibility (positional argument: anchor_only: 1/0)
    if len(sys.argv) == 2 and sys.argv[1] in ["0", "1"]:
        anchor_only_flag = sys.argv[1] == "1"
        generate_all_masks(r"e:\Aseet tool\data\body template", r"e:\Aseet tool\data\masks", anchor_only=anchor_only_flag)
    else:
        args = parser.parse_args()
        generate_all_masks(args.template_dir, args.output_dir, anchor_only=args.anchor_only)
