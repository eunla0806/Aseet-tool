# AGENTS.md

## Project
Dot Asset Tool is a personal-use tool for creating MapleStory Worlds pixel clothing grids.

## Goal
Create clothing-only transparent PNG grids aligned to template_grid.

## Core Rule
Do not generate or modify the avatar body. Preserve template_grid alignment.

## Main Pipeline
1. Inpainting Mask defines clothing area.
2. Canny ControlNet preserves pose and silhouette.
3. LoRA preserves pixel clothing style.
4. IP-Adapter references outfit mood.
5. Post-processing removes body pixels and exports transparent clothing_grid.

## Current Priority
Focus on local scripts and Colab helpers:
- analyze template_grid
- generate frame maps
- compare template and output
- remove body pixels
- export transparent PNG
- validate frame alignment

## Do Not
- Do not build GCP deployment yet.
- Do not assume commercial release.
- Do not change project scope to public service.
- Do not use file I/O assumptions for MapleStory Worlds Lua runtime.
- Do not overwrite source images.
- Do not remove clothing outline during body subtraction.

## Output Style
Prefer small, testable scripts.
Add comments.
Keep file paths configurable.
Save outputs to /output or /final_output.