# Aseet tool

MSW(MapleStory Worlds) 커스텀 의상 제작을 위한 중간 작업 저장소입니다.  
이 저장소의 핵심 목적은 "의상 원본 정리 -> 124프레임 기준 정규화 -> 검수/전파용 메타데이터 생성 -> 웹앱 검수/후속 자동화 연결" 흐름을 안정적으로 만드는 것입니다.

이 저장소는 최종 MSW 등록 패키지 자체를 바로 만드는 곳이라기보다, 그 전에 필요한 준비물과 검수용 산출물을 만드는 파이프라인에 가깝습니다.

## 저장소가 MSW 작업 흐름에서 맡는 위치

대략 아래 구간에 해당합니다.

1. 의상 원본 이미지 또는 레이어 데이터를 모은다.
2. 바디 템플릿과 맞는 기준 프레임 구조로 정리한다.
3. 마스크, 기준 앵커, reference profile, contract 같은 자동화 입력물을 만든다.
4. 웹앱 또는 다음 Step 자동화에서 검수/전파/조립에 사용한다.
5. 마지막 MSW 등록 규격 확인과 패키징은 다음 단계에서 이어진다.

현재 문서 기준으로는 [docs/STEP_PLAN.md](</E:/Aseet tool/docs/STEP_PLAN.md>)의 STEP 1~7이 이 저장소의 중심입니다.

## 폴더 구조 요약

- [data](</E:/Aseet tool/data>)  
  실제 작업 원본 폴더입니다. 바디 템플릿, 의상 원본, 레이어 분리 결과, draft 입력 등이 들어갑니다.
- [outputs](</E:/Aseet tool/outputs>)  
  스크립트 실행 결과가 쌓이는 폴더입니다. 데이터셋 리포트, 앵커, 레이어 파싱 결과, reference profile 등이 저장됩니다.
- [scripts](</E:/Aseet tool/scripts>)  
  파이프라인용 Python 스크립트 모음입니다. 실제 자동화 작업의 중심입니다.
- [src](</E:/Aseet tool/src>)  
  React 기반 로컬 웹앱입니다. 의상 정렬, 프레임 미리보기, 검수 흐름에 쓰입니다.
- [docs](</E:/Aseet tool/docs>)  
  기준 문서 폴더입니다. Step 계획, 현재 상태, 세부 규격, 참고 문서를 관리합니다.
- [comfy ui](</E:/Aseet tool/comfy ui>)  
  ComfyUI 연동 실험 및 실행 관련 폴더로 보입니다. 역할 추정입니다.

## 먼저 보면 좋은 문서

1. [docs/STEP_PLAN.md](</E:/Aseet tool/docs/STEP_PLAN.md>)  
   전체 단계와 현재 위치를 보는 기준 문서
2. [docs/CURRENT_CONTEXT.md](</E:/Aseet tool/docs/CURRENT_CONTEXT.md>)  
   지금 무엇을 하고 있는지 보는 짧은 상태판
3. [docs/reference/tool-boundaries.md](</E:/Aseet tool/docs/reference/tool-boundaries.md>)  
   이 저장소와 외부 도구가 어디에 쓰이는지 정리한 문서

## 주요 스크립트 역할

- [scripts/analyze_outfit_dataset.py](</E:/Aseet tool/scripts/analyze_outfit_dataset.py>)  
  의상 데이터셋을 스캔해서 JSON/CSV 리포트를 만듭니다. STEP 2 성격의 점검 스크립트입니다.
- [scripts/generate_inpainting_masks.py](</E:/Aseet tool/scripts/generate_inpainting_masks.py>)  
  바디 템플릿 PNG를 읽어 `clothing_mask`, `preserve_mask`를 생성합니다. STEP 4 기초 마스크 생성용입니다.
- [scripts/verify_masks.py](</E:/Aseet tool/scripts/verify_masks.py>)  
  생성된 마스크의 크기와 흑백 값이 맞는지 검사합니다.
- [scripts/generate_pure_grids.py](</E:/Aseet tool/scripts/generate_pure_grids.py>)  
  바디 프레임 기반 pure grid와 frame별 마스크 시트를 만듭니다. ComfyUI 테스트 입력 준비에 가깝습니다.
- [scripts/parse_outfit_layers.py](</E:/Aseet tool/scripts/parse_outfit_layers.py>)  
  의상 레이어를 읽어 clothing reference / clothing mask / preserve mask 쪽 산출물을 만듭니다. STEP 4~5 사이의 레이어 파싱 도구로 보입니다.
- [scripts/normalize_layer_split_samples.py](</E:/Aseet tool/scripts/normalize_layer_split_samples.py>)  
  reference sample을 `front_torso`, `front_arm`, `front_lower`, `back_torso`, `back_lower` 기준으로 정규화합니다. STEP 6-B 핵심 스크립트입니다.
- [scripts/build_anchor_from_draft.py](</E:/Aseet tool/scripts/build_anchor_from_draft.py>)  
  외부 AI 초안 또는 수동 선택한 기준 이미지를 43x68 anchor와 preview로 정리합니다. STEP 5 계열 도구입니다.
- [scripts/build_reference_profiles.py](</E:/Aseet tool/scripts/build_reference_profiles.py>)  
  STEP 7용 profile 5종과 contract 4종을 생성합니다. 현재 기준 자동화의 핵심 메타데이터 생성기입니다.

## 기본 사용 순서

아래는 현재 문서와 실제 파일을 기준으로 정리한 가장 기본 흐름입니다.

1. 바디 기준과 프레임 구조 확인  
   입력 기준: [src/data/frames.json](</E:/Aseet tool/src/data/frames.json>), `data/body template/*.png`
2. 의상 데이터셋 상태 점검  
   실행 후보: `scripts/analyze_outfit_dataset.py`
3. 마스크 생성 및 검증  
   실행 후보: `scripts/generate_inpainting_masks.py` -> `scripts/verify_masks.py`
4. 레이어 파싱 또는 reference sample 정리  
   실행 후보: `scripts/parse_outfit_layers.py`, `scripts/normalize_layer_split_samples.py`
5. 기준 anchor 생성  
   실행 후보: `scripts/build_anchor_from_draft.py`
6. STEP 7 메타데이터 생성  
   실행 후보: `scripts/build_reference_profiles.py`
7. 생성 결과 검토  
   원본: `outputs/reference_profiles/`, `data/msw/contracts/`  
   GitHub 검토용 미러: `docs/artifacts/step7/`

## 샘플 입력 / 출력 예시

샘플 입력 예시

- 바디 템플릿: `E:\Aseet tool\data\body template\*.png`
- reference sample 레이어: `E:\Aseet tool\data\clothing\layer_split_refs\top_skirt_sets\hoi_poi_tshirt_denim_skirt\v001\normalized_layers\front_torso\alert_0.png`
- sample mask: `E:\Aseet tool\data\clothing\layer_split_refs\top_skirt_sets\hoi_poi_tshirt_denim_skirt\v001\masks\front_torso\alert_0_mask.png`
- 외부 draft 입력: `E:\Aseet tool\data\external_ai_drafts\...`

샘플 출력 예시

- 데이터셋 리포트: [outputs/outfit_dataset_report.json](</E:/Aseet tool/outputs/outfit_dataset_report.json>)
- anchor 결과: `E:\Aseet tool\outputs\anchor\afternoon_picnic\v001\stand1_0_anchor.png`
- STEP 7 profile: [outputs/reference_profiles/layer_fit_profile.json](</E:/Aseet tool/outputs/reference_profiles/layer_fit_profile.json>)
- STEP 7 contract: [data/msw/contracts/action_frame_contract.json](</E:/Aseet tool/data/msw/contracts/action_frame_contract.json>)
- STEP 7 검토용 복사본: [docs/artifacts/step7](</E:/Aseet tool/docs/artifacts/step7>)

## 웹앱 위치

[src](</E:/Aseet tool/src>)는 React/Vite 기반 로컬 웹앱입니다.  
[src/APP_GUIDE.md](</E:/Aseet tool/src/APP_GUIDE.md>) 기준으로 보면, 이 앱은 의상 정렬, 프레임 미리보기, 오프셋 검수, 프로젝트 설정 저장 같은 GUI 작업에 쓰입니다.

실행 예시

```bash
cd "E:\Aseet tool\src"
npm run dev
```

기본 접속 주소는 `http://localhost:5173/` 입니다.

## 미완성 / 불명확한 부분

- `comfy ui/` 폴더의 정확한 책임 범위는 루트 기준 문서에 아직 명확히 정리되어 있지 않습니다. 역할 추정입니다.
- STEP 8 이후 전파/분해/QA/최종 조립 스크립트는 아직 루트 `scripts/` 기준으로 완성되지 않았거나, 일부는 앞으로 추가될 예정으로 보입니다.
- `src/package.json`에 보이는 여러 `phase10`, `phase11`, `phase12` 스크립트는 현재 루트 `scripts/` 목록과 직접 1:1 대응되지 않습니다. 역할 연결은 추가 확인이 필요합니다.

## 한 줄 정리

이 저장소는 "MSW 의상 자동화용 원본 정리 + 기준 메타데이터 생성 + 로컬 검수"를 담당하는 중간 파이프라인 저장소입니다.
