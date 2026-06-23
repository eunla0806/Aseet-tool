## 2026-05-31 STEP 4.5 layer_parse 반영 검토

### 확인된 점
- `outputs/layer_parse/outfit/` 기준으로 layer_parse 산출물 구조가 생성되어 있습니다.
- `clothing_reference_frames/`, `clothing_masks/`, `preserve_masks/`, `layer_parse_report.json` 구조가 문서 계획과 일치합니다.
- outfit 카테고리 대표 테스트 셋 10종에 대해 의상 레퍼런스, 의상 마스크, 보존 마스크가 생성되었습니다.
- `CURRENT_CONTEXT.md`와 `WORK_LOG.md`에 기록된 pants 5종, skirt 5종 총 10종 처리 내용과 layer_parse 산출물 방향은 일치합니다.
- 의상 레이어와 바디/보존 레이어를 분리하려는 STEP 4.5 목표는 전반적으로 반영된 것으로 보입니다.

### 확인이 필요한 점
- `preserve_mask`가 `body/head/hand` 계열 알파를 그대로 포함하면서 `clothing_mask`와 겹치는 문제가 있을 수 있습니다.
- `preserve_mask`는 얼굴, 피부, 손, 발처럼 실제로 보존해야 하는 노출 영역만 남겨야 합니다.
- body 레이어는 의상 아래에 깔린 몸통까지 포함할 수 있으므로, 그대로 preserve_mask로 사용하면 clothing_mask와 충돌할 수 있습니다.
- STEP 5 진입 전에 `clothing_mask`와 `preserve_mask`의 겹침 통계를 확인하는 것이 좋습니다.
- `run_generator`에서 Inpaint Mask 입력이 반드시 `clothing_mask`인지 다시 확인해야 합니다.
- `preserve_mask`는 Inpaint Mask로 직접 사용하지 않아야 합니다.

### 권장 수정
- `preserve_mask` 생성 시 아래 보정 규칙을 적용합니다.

```txt
preserve_mask_final = raw_preserve_mask - clothing_mask



## 2026-05-31 WORK_LOG / STEP_PLAN 기준 STEP 4 검토 및 STEP 5 진행 가능 여부

### 확인된 점
- `docs/WORK_LOG.md`에 적힌 STEP 4 산출물은 현재 작업 폴더에 대부분 반영되어 있습니다. `scripts/generate_inpainting_masks.py`, `scripts/verify_masks.py`, `docs/MASK_SPEC.md` 계열 문서와 마스크 출력 파일이 모두 존재합니다.
- `scripts/verify_masks.py`를 현재 프로젝트 경로에서 다시 실행했을 때 `Passed 124/124 frames. Errors found: 0`으로 통과했습니다.
- `data/masks/clothing_mask`와 `data/masks/preserve_mask`에는 각각 124개 파일이 있어, WORK_LOG의 248개 마스크 설명과 맞습니다.
- 현재 `docs/STEP_PLAN.md`가 정의하는 STEP 4용 `scripts/generate_pure_grids.py`도 존재하고, `data/grid/pure_grids/base` 32개, `data/grid/pure_grids/masks/clothing_mask` 32개, `data/grid/pure_grids/masks/preserve_mask` 32개 출력도 확인되었습니다.

### 확인이 필요한 점
- `docs/WORK_LOG.md`의 STEP 4는 `Inpainting Mask 제작` 중심으로 적혀 있고, `docs/STEP_PLAN.md`의 STEP 4는 `스마트 마스크 & 순수 그리드 제작`으로 더 넓게 적혀 있습니다. 실제 파일은 둘 다 어느 정도 반영됐지만, 문서 제목과 범위가 서로 달라서 나중에 다시 볼 때 기준 문서가 흔들릴 수 있습니다.
- `docs/STEP_PLAN.md`에는 STEP 3 결과를 `docs/specs/FRAME_GROUP_PLAN.md` 기준으로 적고 있는데, 다른 문서들에는 `docs/FRAME_GROUP_PLAN.md`도 함께 등장합니다. 같은 내용의 문서가 두 경로로 나뉘어 보여서, 어느 쪽이 공식 경로인지 정리하는 편이 좋습니다.
- STEP 5 설명에는 Colab용 ComfyUI 워크플로우 템플릿(JSON) 준비가 들어가 있지만, 이번 검토에서는 그 입력 템플릿 파일 자체가 프로젝트 산출물로 확인되지는 않았습니다. STEP 5를 시작하는 데 치명적인 문제는 아니지만, 시작 직전에 준비물 목록을 한 번 더 고정하는 편이 안전합니다.

### 판단
- STEP 4는 현재 기준에서 잘 반영된 것으로 봐도 됩니다.
- `STEP_PLAN` 기준으로도 STEP 5 Colab 앵커 인페인팅 테스트로 넘어가도 괜찮습니다.
- 다만 STEP 5를 본격 시작하기 전에 "공식 문서 경로"와 "Colab에 올릴 입력 묶음(JSON 템플릿, pure grid, mask, anchor frame 목록)"만 한 번 정리하면 이후 진행이 훨씬 덜 흔들립니다.

## 2026-05-30 STEP 4 반영 검토 / STEP 5 진행 가능 여부

### 확인된 점
- `docs/WORK_LOG.md`에는 STEP 4 Inpainting Mask 제작이 완료된 것으로 기록되어 있습니다.
- 실제 산출물도 확인되었습니다: `docs/MASK_SPEC.md`, `docs/walkthrough.md`, `scripts/generate_inpainting_masks.py`, `data/masks/clothing_mask`, `data/masks/preserve_mask`.
- `data/masks/clothing_mask`에는 124개 PNG, `data/masks/preserve_mask`에도 124개 PNG가 있어 총 248개 마스크가 생성되어 있습니다.
- 독립 확인 결과, 모든 마스크 픽셀 값은 `0` 또는 `255`만 사용하고 있어 이진 마스크 조건은 통과합니다.
- 각 마스크 파일은 같은 이름의 `data/body template` 원본 프레임과 해상도가 모두 일치합니다. 누락 파일과 크기 불일치 파일은 0개입니다.

### 확인이 필요한 점
- `WORK_LOG.md`와 `docs/walkthrough.md`에는 `verify_masks.py` 검수기를 사용했다고 적혀 있지만, 현재 프로젝트의 `scripts/` 폴더에는 `verify_masks.py`가 없습니다. `walkthrough.md`에는 임시 scratch 경로의 검수기를 링크하고 있어, 나중에 재검증하려면 프로젝트 안으로 옮기는 편이 좋습니다.
- `scripts/generate_inpainting_masks.py`는 기본 경로가 `e:\Aseet tool\data\body template`, `e:\Aseet tool\data\masks`로 하드코딩되어 있습니다. 다른 PC나 폴더에서 다시 돌릴 수 있게 하려면 `--template_dir`, `--output_dir` 인자를 받도록 바꾸는 것이 좋습니다.
- 스크립트 주석에는 "12 anchor frames"라고 적혀 있지만 실제 목록과 `CURRENT_CONTEXT.md`는 11개 앵커 프레임 기준입니다. 큰 기능 문제는 아니지만 문서 표현은 11개로 맞추는 편이 안전합니다.
- 현재 마스크는 자동 임계값 기반 1차 마스크입니다. Colab 테스트 전에는 앵커 프레임 몇 장을 눈으로 확인해서 얼굴, 손, 발 보호 영역이 너무 많이 깎이거나 옷 영역이 과하게 넓지 않은지 보는 것이 좋습니다.

### 판단
- STEP 4는 기능적으로는 적절하게 진행되었습니다.
- STEP 5 Colab 기반 Inpainting Mask 단독 테스트로 넘어가도 됩니다.
- 다만 STEP 5 시작 전에 `verify_masks.py`를 프로젝트 내부에 보관하거나, 검증 명령을 문서에 재현 가능한 형태로 남기면 이후 문제가 생겼을 때 훨씬 추적하기 쉽습니다.

## 2026-05-30 CURRENT_CONTEXT / STEP 4 진행 가능 여부 검토

### 확인된 점
- `docs/CURRENT_CONTEXT.md`에는 현재 상태가 "STEP 3 프레임 그룹 설계 완료 -> STEP 4 마스크 영역 설계 및 스크립트 작성 예정"으로 정리되어 있습니다.
- `docs/FRAME_GROUP_PLAN.md`에는 실제로 7개 프레임 그룹 분리와 12개 앵커 프레임 선정 내용이 들어 있어, STEP 3 산출물 근거는 확인됩니다.
- `docs/STEP_PLAN.md` 진행 현황 대시보드에도 STEP 3 완료, STEP 4 진행예정으로 반영되어 있습니다.

### 확인이 필요한 점
- `docs/CURRENT_CONTEXT.md`와 `docs/STEP_PLAN.md`에는 아직 좌표 기준이 `frame_manifest.json` 또는 `template_grid` 쪽으로 남아 있습니다.
- 반면 최근에 `docs/APPENDIX_TECH.md`에는 STEP 2 데이터셋 정리를 `data/clothing` 중심 기준으로 본다는 규칙이 추가되었습니다.
- 즉, STEP 4를 시작하기 전에 "마스크를 template/body 기준으로 설계할지", 아니면 "clothing 데이터 기준으로 1차 자동 추출 후 마지막에만 좌표 검수할지" 기준 문장을 한 번 맞춰 두는 것이 좋습니다.

### 판단
- 현재 상태만 놓고 보면 STEP 3 완료 근거는 있으므로, STEP 4로 넘어가는 것은 가능합니다.
- 다만 바로 코드부터 쓰기보다, STEP 4의 마스크 기준을 `CURRENT_CONTEXT.md` 또는 `STEP_PLAN.md`에 한 줄로 먼저 고정한 뒤 시작하는 편이 안전합니다.
- 특히 사용자가 `template_grid`를 강한 기준으로 두지 않으려는 방향이라면, STEP 4 스크립트 설명에도 "1차 마스크 추출은 `data/clothing` 기준, 최종 검수만 template/template body 참고"라고 분명히 적는 것이 좋습니다.

## 2026-05-30 STEP 2 반영 검토

### 확인된 점
- `scripts/analyze_outfit_dataset.py`는 실제로 존재하며, 병렬 처리용 `multiprocessing` 로직이 들어가 있습니다.
- `outputs/outfit_dataset_report.json`와 `outputs/outfit_dataset_list.csv`도 생성되어 있습니다.
- `docs/CURRENT_CONTEXT.md`도 Step 2 완료 기준으로 갱신되어 있습니다.

### 확인이 필요한 점
- `WORK_LOG.md`에는 "template_grid 크기 규격과 캔버스 규격 매칭 여부 체크 완료"라고 적혀 있지만, 실제 `outfit_dataset_report.json` 요약값은 `template_canvas_match_files: 0`, `template_canvas_mismatch_files: 222610`으로 기록되어 있습니다. 현재 데이터가 전체 그리드가 아니라 프레임 조각 이미지라면, 이 항목은 "비교는 수행됨"과 "매칭 완료"를 같은 뜻으로 쓰면 오해가 생길 수 있습니다.
- `WORK_LOG.md`에는 `C:\\Users\\82103\\.gemini\\...\\extract_clothes.py` 임시 스크립트가 생성 파일로 적혀 있습니다. 다만 현재 프로젝트 작업 산출물 기준으로는 핵심 결과 파일이 아니므로, 남겨둘지 정리할지 한 번 판단하는 것이 좋아 보입니다.
- `frame_manifest.json` 기준을 사용한다고 적혀 있었지만, 실제 리포트에는 `frame_manifest.json not found`로 기록되어 있습니다. 지금 방식 자체는 동작하지만, 문서에는 "없으면 template_grid 크기로 대체"라고 더 분명하게 적는 편이 안전합니다.

### 총평
- Step 2 작업은 전반적으로 반영되어 있습니다.
- 다만 `WORK_LOG.md`의 표현 중 일부는 실제 결과와 조금 다르게 읽힐 수 있어서, 캔버스 매칭 표현과 `frame_manifest.json` 관련 설명만 짧게 다듬으면 더 정확해집니다.
