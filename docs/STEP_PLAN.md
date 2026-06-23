# 🧸 Dot Asset Tool: STEP_PLAN (13단계 하이브리드 마스터 플랜)

본 마스터 플랜은 사용자의 픽셀 수준 수작업 리터칭을 100% 배제하고, **"단 1장의 Master Anchor 기반 오프셋 전파 및 참고 샘플(Reference Sample) 기반 사후 레이어 제어"** 아키텍처를 구현한 뒤, 최종 결과를 **MSW avatar item 등록 규격**에 맞게 패키징하기 위한 13단계 최적화 경로입니다.

---

## 0. MSW Skill Alignment

이 파이프라인의 최종 목표는 일반 `sprite` 제작이 아니라 **MSW avatar item 등록 준비물**을 만드는 것입니다. 따라서 문서 기준은 아래 스킬 역할에 맞춰 고정합니다.

| 스킬 | 이 문서에서의 역할 | 주의점 |
| :--- | :--- | :--- |
| `msw-avatar` | 한벌옷/상의/하의 장착 슬롯과 `CostumeManagerComponent` 기준을 정의하는 중심 스킬 | `longcoat`는 `coat + pants`와 동시에 쓰지 않습니다. |
| `msw-sprite-ruid` | `thumbnail://` 미리보기와 실제 장착 RUID의 차이를 구분 | 실제 장착 슬롯에는 `thumbnail://`를 붙이지 않습니다. |
| `msw-search` | 기존 avatar item RUID 확인 및 비교 기준 확보 | RUID는 임의로 만들지 않고 등록 또는 검색 결과만 사용합니다. |
| `msw-painter` | 창작 참고 이미지나 보조 `sprite` 제작용 | avatar item atlas 전체 처리의 메인 파이프라인으로 사용하지 않습니다. |

---

## 1. 전체 진행 현황 대시보드 (New 13-Step Master Plan)

| 단계 | 작업명 | 상태 | 실제 산출물 / 비고 |
| :--- | :--- | :---: | :--- |
| **STEP 1** | template_grid 구조 분석 | **[완료]** | `src/data/frames.json` 기반 프레임 좌표 분석 완료 |
| **STEP 2** | 샘플 의상 데이터 정리 | **[완료]** | 데이터셋 분석 리포트 `outfit_dataset_report.json` 완료 |
| **STEP 3** | 프레임 그룹 분리 | **[완료]** | `FRAME_GROUP_PLAN.md` (7대 그룹 분류) 완료 |
| **STEP 4** | 스마트 마스크 & 순수 그리드 제작 | **[완료]** | 피부 보호 마스크 및 32동작 순수 그리드 빌드 완료 |
| **STEP 5** | master anchor 확정 및 앵커 생성 | **[완료]** | `afternoon_picnic` master 1장 기반 `clothing_only_anchor` 빌드, 그룹별 보조 앵커 전략 추가 |
| **STEP 6-A** | reference sample 원본 구조화 | **[완료]** | `top_skirt_sets` 하위 Hoi Poi / Pink Tanktop v001 트리, ZIP, extracted, `sample_info.json` 정리 |
| **STEP 6-B** | normalized layers & masks 생성 | **[완료]** | `normalized_layers/`, `masks/`를 실제 PNG로 채워 STEP 7 입력물 완성 |
| **STEP 7** | reference profile 자동 추출 및 생성 | **[대기]** | `layer_fit_profile.json` 등 4종 메타데이터와 일관성 제어 계약 생성 |
| **STEP 8** | motion propagation (1차 자동 전파) | **[대기]** | G1~G3 우선 dx/dy 전파, G4~G7은 그룹 앵커 또는 보정 후보 분류 |
| **STEP 9** | post-separation layer control (2차 분해) | **[대기]** | reference mask 기반 통짜 의상의 레이어 단위 무결점 분해 |
| **STEP 10** | failed layer pinpoint inpainting (3차 보정) | **[대기]** | 고변형(공격 등)/실패 레이어만 ComfyUI API 국소 인페인팅 후보 분류, 재시도 제한 적용 |
| **STEP 11** | automated QA (4차 자동 QA) | **[대기]** | 바디 오염, 위치/색상/실루엣 흔들림, 슬롯 계약 등 확장 QA 검사 |
| **STEP 12** | final assembly (5차 최종 합성) | **[대기]** | 통과 레이어 z-order 병합 합성, `clothing_grid` 및 리포트 최종 빌드 |
| **STEP 13** | MSW avatar item packaging | **[대기]** | `coat + pants` / `longcoat` 슬롯 계약, plain avatar item RUID 기준 패키지 생성 |

---

## 2. 세부 단계별 상세 실행 가이드라인

### 🧸 STEP 1. template_grid 구조 분석 (완료)
* **내용**: `template_grid`의 행/열 규격과 프레임 오프셋 구조 분석 및 `src/data/frames.json`과의 1:1 매핑 완료.

### 🧸 STEP 2. 샘플 의상 데이터 정리 (완료)
* **내용**: 22만 개 이상의 의상 파일 무결성 및 해상도 검증, 리포트(`outfit_dataset_report.json`) 생성 완료.

### 🧸 STEP 3. 프레임 그룹 분리 (완료)
* **내용**: 124프레임을 움직임과 레이어 노출 물리성에 기반해 7개 핵심 그룹(G1~G7)으로 구분 완료 (`FRAME_GROUP_PLAN.md` 수립).

### 🧸 STEP 4. 스마트 마스크 & 순수 그리드 제작 (완료)
* **내용**: 턱밑, 손발끝 등 피부 보호 스마트 마스크 구축 및 32가지 표준 동작 순수 맨몸 그리드(`generate_pure_grids.py`) 무결점 빌드 완료.

---

### 🧸 STEP 5. master anchor 확정 (완료)
* **작업 내용**: 사용자가 직접 디자인 감성 및 도트 질감을 검수하고 엄선한 **`afternoon_picnic` 신규 의상 중 master 1장**을 기준으로 투명 배경 `clothing_only_anchor`를 생성합니다.
* **자동화 스펙 변경**: 
  - 과거 2x2 초안 기반 스킨톤 강제 제거 알고리즘은 **기본 OFF**로 변경합니다. (정교하게 그려진 master 앵커 도트의 알파 채널 픽셀 손상을 방지하기 위해 원본 Alpha를 100% 그대로 유지)
  - `clothing_only_anchor`를 `body_reference` 위에 합성하여, 120×120 px 피팅 미리보기 파일인 **`body_anchor_preview.png`**를 자동으로 빌드해 최초 위치 정합성을 육안 검수합니다.
* **124동작 앵커 전략**:
  - `clothing_only_anchor` 1장은 전체 디자인의 기준으로 유지합니다.
  - 단, 124동작 전체의 일관성을 위해 `front_stand_anchor`, `front_motion_anchor`, `high_deform_anchor`, `back_clothing_anchor`를 선택적으로 추가합니다.
  - `front_stand_anchor`는 stand / idle 계열, `front_motion_anchor`는 walk / jump / sit 계열, `high_deform_anchor`는 attack / prone / swing 계열의 형태 보정 기준입니다.
  - 앵커가 없는 고변형 그룹은 무한 자동 보정하지 않고 STEP 10에서 `ERR_NEEDS_GROUP_ANCHOR`로 멈춥니다.
* **후면(Back) 앵커 — 초기 scope 후순위**:
  - ladder / rope (G6) 동작은 **캐릭터의 뒷모습**을 렌더링하므로, 앞모습 master anchor 1장만으로는 처리할 수 없습니다.
  - 이를 위해 별도의 **`back_clothing_anchor`** (뒷모습 의상 앵커 1장)를 확보해야 하며, 외부 AI로 뒷모습 디자인 1장을 추가 생성하거나, 앞모습 앵커를 수평 반전 + 후면 디테일 보정하여 제작합니다.
  - **단, ladder / rope 동작은 초기 의상 완성 scope에서 후순위로 분류**하며, stand / walk / jump / sit (G1~G3) 전면 동작이 완벽히 통과된 이후에 순차 착수합니다.
  - 뒷모습 앵커가 준비되지 않은 상태에서는 G6 프레임을 STEP 8 전파 대상에서 **자동 제외(Skip)** 처리합니다.

### 🧸 STEP 6-A. reference sample 원본 구조화 (완료)
* **작업 내용**: `data/clothing/layer_split_refs/top_skirt_sets/` 경로 내에 신규 의상의 2차 분해 기준이 될 고품질 참고 샘플(Reference Sample)들을 정합하여 구조화합니다.
  - **Hoi Poi T-shirt + Denim Skirt** (반팔 + 치마 조합): 메인 레이어 분할 참고용 레퍼런스 (`main layer split reference`)
  - **Pink Tanktop + Tennis Skirt** (민소매 + 치마 조합): 보조 레이어 분할 참고용 레퍼런스 (`secondary layer split reference`)
* **물리 구조 확정**:
  - 각 참고 샘플은 `{sample_id}/v001/raw_zip/`, `{sample_id}/v001/extracted/`, `{sample_id}/v001/normalized_layers/`, `{sample_id}/v001/masks/`, `{sample_id}/v001/sample_info.json` 구조를 명확히 준수합니다.
* **MSW 원본 레이어명 → 5대 파트 그룹 매핑 확정** (STEP 9 전제 조건):
  - MSW 의상 zip 내부의 원본 레이어 파일명(`mailArm`, `mailChest`, `pantsOverShoesBelowMailChest`, `backMailChest`, `backPants` 등)은 우리 파이프라인의 5대 파트 그룹명(`front_torso`, `front_arm`, `front_lower`, `back_torso`, `back_lower`)과 직접 일치하지 않습니다.
  - 따라서 이 단계에서 `sample_info.json`의 `layer_map` 필드를 **실제로 채워** 원본 레이어명 → 파트 그룹명 매핑 테이블을 확정해야 합니다. 이 매핑이 없으면 STEP 9의 자동 분해가 실행 불가합니다.
  - 매핑 예시:
    ```json
    "layer_map": {
      "front_torso": ["mailChest"],
      "front_arm": ["mailArm", "mailArmOverHair", "mailArmBelowHead"],
      "front_lower": ["pantsOverShoesBelowMailChest"],
      "back_torso": ["backMailChest", "backMailChestOverPants"],
      "back_lower": ["backPants"]
    }
    ```
  - 각 참고 샘플(Hoi Poi / Pink Tanktop)별로 레이어 구성이 다를 수 있으므로 **샘플별 개별 매핑**을 작성합니다.

### 🧸 STEP 6-B. normalized layers & masks 생성 (완료)
* **작업 내용**: STEP 6-A에서 확보한 `extracted/` 124프레임과 `sample_info.json`의 `layer_map`을 기준으로, STEP 7이 바로 읽을 수 있는 정규화 레이어와 마스크 이미지를 생성합니다.
* **중요 이유**:
  - 폴더만 있고 `normalized_layers/`와 `masks/`가 비어 있으면 STEP 7의 자동 프로파일 추출이 실행될 수 없습니다.
  - 이 단계는 “샘플이 준비되어 있다”를 실제 이미지 입력물 기준으로 확정하는 안전장치입니다.
* **산출물**:
  - 각 샘플별 `normalized_layers/{part_group}/...png`
  - 각 샘플별 `masks/{part_group}/...png`
  - `sample_normalization_report.json`
* **검수 기준**:
  - `sample_info.json`의 `layer_map`에 적힌 원본 레이어명이 실제 추출 파일과 연결됩니다.
  - 민소매처럼 `front_arm`이 비어 있는 샘플은 실패가 아니라 “팔 레이어 없음”으로 기록합니다.
  - 최소 1개 이상의 기준 샘플에서 `front_torso`, `front_lower`, `back_torso`, `back_lower` 마스크가 생성되어야 합니다.

### 🧸 STEP 7. reference profile 생성 (대기)
* **작업 목표**: STEP 6-B에서 준비된 샘플 입력물을 한 번에 읽어, STEP 8이 바로 사용할 수 있는 profile/contract 묶음을 생성합니다.
* **입력물**:
  - 샘플별 `normalized_layers/{part_group}/...png`
  - 샘플별 `masks/{part_group}/...png`
  - 샘플별 `sample_info.json`
  - 샘플별 `sample_normalization_report.json`
  - `src/data/frames.json`
  - `data/body template/*.png` (124장)
* **출력 저장 위치 고정**:
  - 메인 프로파일: `outputs/reference_profiles/`
  - MSW 계약 파일: `data/msw/contracts/`
* **생성해야 하는 메인 프로파일**:
  - **`outputs/reference_profiles/layer_fit_profile.json`**: 각 프레임별 의상의 바운딩 박스(`bbox`), 중심 좌표(`center`), 허리선 위치(`waist_y`), 하단선 위치(`hem_y`) 기록.
  - **`outputs/reference_profiles/layer_mask_profile.json`**: 각 파트 레이어별 투명도(Alpha), bbox, intentional empty 여부 기록.
  - **`outputs/reference_profiles/z_order_profile.json`**: 124프레임별 레이어 렌더링 오버레이 순서(Z-Order) 및 겹침 규격 기록.
  - **`outputs/reference_profiles/sample_profile_report.json`**: 프로파일링 분석 과정의 무결성 검수 보고서.
  - **`outputs/reference_profiles/body_offset_profile.json`**: 124장의 바디 PNG에서 역산출한 프레임 간 상대 변위와 기준점 정보.
* **일관성 제어 산출물**:
  - **`data/msw/contracts/design_lock.json`**: 기준 팔레트, 외곽선 색, 치마 길이, 소매 길이, 장식 위치, 금지 색상, 허용 색상 오차를 고정합니다.
  - **`data/msw/contracts/anchor_registry.json`**: 각 프레임 그룹이 어떤 앵커를 기준으로 전파되는지 기록합니다.
  - **`data/msw/contracts/msw_slot_contract.json`**: `longcoat | coat | pants` 분기, 실제 장착 필드, 슬롯 점유 규칙, RUID 정책을 기록합니다.
  - **`data/msw/contracts/action_frame_contract.json`**: 124프레임의 action 이름, frame index, 그룹, 전파 방식을 기록합니다.
* **바디 프레임 간 오프셋 변위 역산출** (STEP 8 전제 조건):
  - 현재 `src/data/frames.json`에는 프레임 파일명과 인덱스만 기록되어 있고, **프레임 간 바디 중심점의 상대적 변위(dx, dy)가 존재하지 않습니다.**
  - 따라서 이 단계에서 `data/body template/` 하위 124장의 바디 PNG를 자동 파싱하여, 프레임별 바디 중심점(또는 불투명 영역 bbox 중심)의 상대 변위를 역산출하고, 결과를 **`outputs/reference_profiles/body_offset_profile.json`**으로 저장하는 스크립트를 빌드합니다.
  - 기준 프레임(origin)은 `stand1_0`으로 고정하며, 모든 dx/dy는 `stand1_0` 대비 상대값으로 기록합니다.
  - 기준점 우선순위는 `waist > center > hem`으로 두고, 파트별 보조 기준점으로 `shoulder`, `hand`, `hip`를 함께 저장합니다.
  - 이 `body_offset_profile.json`이 없으면 STEP 8의 수학적 평행 이동 연산이 실행 불가합니다.
  - 산출물 예시:
    ```json
    {
      "stand1_0": { "dx": 0, "dy": 0, "bbox": [5, 8, 38, 62], "center": [21, 35] },
      "stand1_1": { "dx": 0, "dy": -1, "bbox": [5, 7, 38, 61], "center": [21, 34] },
      "walk1_0":  { "dx": 1, "dy": 0, "bbox": [6, 8, 39, 62], "center": [22, 35] },
      "jump_0":   { "dx": 0, "dy": -3, "bbox": [5, 5, 38, 59], "center": [21, 32] }
    }
    ```
* **샘플 예외 처리 규칙**:
  - 민소매 샘플처럼 `front_arm: []`인 경우는 실패가 아니라 **의도된 빈 파트**로 기록합니다.
  - 이 경우 `layer_mask_profile.json`과 `sample_profile_report.json`에 `intentional_empty=true`를 남기고, STEP 8에서 팔 전파 기준 샘플로 강제 사용하지 않습니다.
  - 후면이 보이지 않는 전면 프레임에서 `back_torso`, `back_lower`가 비어 있는 경우도 실패가 아니라 `inactive_by_view=true`로 구분합니다.
* **STEP 7 완료 판정 기준**:
  - `outputs/reference_profiles/` 아래에 `layer_fit_profile.json`, `layer_mask_profile.json`, `z_order_profile.json`, `sample_profile_report.json`, `body_offset_profile.json`이 모두 생성되어 있어야 합니다.
  - `data/msw/contracts/` 아래에 `design_lock.json`, `anchor_registry.json`, `msw_slot_contract.json`, `action_frame_contract.json`이 모두 생성되어 있어야 합니다.
  - `sample_profile_report.json`에는 샘플별 처리 프레임 수, intentional empty 파트 수, 실패 프레임 수가 구분되어 있어야 합니다.
  - 필수 파일 9종 중 하나라도 빠지면 STEP 7 완료로 보지 않습니다.

### 🧸 STEP 8. motion propagation: 1차 자동 전파 (대기)
* **작업 내용**: 확정된 앵커를 바디 템플릿의 프레임별 기준점에 따라 그룹별로 전파합니다. G1~G3은 dx/dy 기반 전파를 우선 허용하고, G4~G7은 단순 이동만으로 실패 가능성이 높으므로 그룹 앵커 또는 STEP 10 국소 보정 후보로 분류합니다.
* **그룹별 원칙**:
  - G1~G3: `body_offset_profile.json`의 dx/dy와 `waist`, `hem` 기준점을 사용합니다.
  - G4~G7: `high_deform_anchor` 또는 파트별 기준점이 없으면 자동 재시도하지 않고 `ERR_NEEDS_GROUP_ANCHOR`를 기록합니다.
  - G6: `back_clothing_anchor`가 없으면 기존 정책대로 자동 Skip합니다.
* **검증 순서**: stand / walk / jump / sit 등 물리 변형이 적은 G1~G3 그룹부터 소규모 선행 검증을 진행합니다.
* **산출물**: 그룹별 전파가 완료된 통짜 의상 결과 시트 `propagated_full/` 폴더에 저장. (지터링 최소화 목표)

### 🧸 STEP 9. post-separation layer control: 2차 분해 (대기)
* **작업 내용**: STEP 8의 통짜 `propagated_full` 결과 이미지를 STEP 7에서 파싱한 레퍼런스 샘플 마스크와 곱연산(Mask Multiply)하여, 에셋 등록용 세부 레이어로 완벽하게 분할 추출합니다.
* **분해 결과물**: `front_torso`, `front_arm`, `front_lower`, `back_torso`, `back_lower` 등 분할된 5대 핵심 파트 레이어로 정밀 저장.

### 🧸 STEP 10. failed layer pinpoint inpainting: 3차 국소 보정 (대기)
* **작업 내용**: 2차 분해 결과물 중, 뼈대 꺾임이나 포즈 압축이 심한 실패 레이어 또는 공격(attack), 엎드리기(prone), 휘두르기(swing) 등의 고변형(G4~G7) 레이어만 선별하여 **ComfyUI API 국소 인페인팅 후보**로 자동 분류합니다.
* **원칙**: 124프레임 전체를 AI로 무작위 일괄 생성하는 것은 전면 금지하며, 오직 문제가 발생한 핀포인트 파트 레이어 영역에 대해서만 인페인팅 연산을 가이드합니다.
* **실패 코드 및 재시도 제한**:
  - `ERR_PALETTE_DRIFT`: 색이 `design_lock.json`의 기준 팔레트에서 벗어남.
  - `ERR_SILHOUETTE_DRIFT`: 옷 형태가 프레임마다 과하게 흔들림.
  - `ERR_BACK_ANCHOR_MISSING`: 후면 동작에 필요한 `back_clothing_anchor`가 없음.
  - `ERR_LAYER_Z_ORDER`: 앞/뒤 레이어 순서가 `z_order_profile.json`과 맞지 않음.
  - `ERR_EQUIP_SLOT_CONFLICT`: `longcoat`와 `coat + pants` 규칙이 충돌함.
  - 같은 프레임/레이어의 자동 재시도는 최대 2회로 제한하며, 2회 이후에도 실패하면 앵커 보강 또는 계약 수정이 필요한 상태로 분류합니다.
* **완성본 샘플 전용 LoRA 사용 원칙**:
  - 완성본 샘플 전용 LoRA는 선택적 스타일 보정 장치입니다.
  - 좌표 정렬, 레이어 분리, 후면 구조 생성 문제를 직접 해결하지 않습니다.
  - 실패 레이어 ComfyUI 부분 인페인팅에서 메월풍 도트 질감, 외곽선, 명암을 안정화하기 위한 보조 장치로만 사용합니다.
  - 124프레임 전체를 LoRA + ComfyUI로 일괄 생성하지 않습니다.

### 🧸 STEP 11. automated QA: 4차 자동 QA (대기)
* **작업 내용**: 코드로 빌드된 5대 품질 보증 어서션(Assertion) 검사기를 통해 생성된 모든 프레임의 무결성을 기계적 검증합니다.
  - **body contamination 검사**: 의상 영역 내에 캐릭터 피부색 픽셀 혼입 확인 (바디 오염 최소화 목표)
  - **position jitter 검사**: 프레임 간 허리선/어깨선의 중심 변위 분산도를 측정하여 흔들림 자동 확인
  - **color consistency 검사**: master anchor가 정의한 고유 팔레트 색상 준수 확인 (노이즈 픽셀 차단)
  - **mask outside pixel 검사**: 지정된 마스크 바운딩 박스 외부에 떠다니는 무소속 도트 픽셀 검출
  - **layer overlap 검사**: 전면/후면 레이어 분할 및 중첩 정합성 검사
  - **design lock 검사**: `design_lock.json`의 팔레트, 외곽선, 장식 위치를 벗어났는지 확인
  - **anchor similarity 검사**: 프레임 결과가 담당 앵커와 과도하게 달라졌는지 확인
  - **slot contract 검사**: `longcoat`, `coat`, `pants` 장착 규칙이 충돌하지 않는지 확인
  - **thumbnail policy 검사**: 실제 장착 슬롯에 `thumbnail://`가 들어가지 않았는지 확인
* **처리 원칙**: 실패한 프레임은 수동으로 수정하지 않으며, **[자동 재처리(Retry) 플래그]**를 부여하여 자동 재연산 파이프라인으로 반환합니다. 단, 앵커 부족 계열 오류는 재시도 대신 앵커 보강 필요 상태로 분류합니다.

### 🧸 STEP 12. final assembly: 5차 최종 합성 (대기)
* **작업 내용**: 4차 자동 QA의 PASS 판정을 완료한 무결점 레이어들만을 최종 Z-Order 프로파일 순서대로 병합 및 정렬 합성합니다.
* **최종 산출물**:
  - **`clothing_grid.png`**: MSW 규격을 만족하는 최종 투명배경 의상 에셋 스프라이트 시트.
  - **`body_preview_grid.png`**: 완성된 의상을 캐릭터 맨몸 위에 가상 피팅한 전체 동작 애니메이션 미리보기.
  - **`final_build_report.json`**: 전체 빌드 완성도 보고서.

### 🧸 STEP 13. MSW avatar item packaging (대기)
* **작업 내용**: STEP 12의 최종 이미지를 MSW avatar item 등록 목표에 맞게 슬롯별 패키지로 정리합니다.
* **슬롯 분류 원칙**:
  - 상·하의가 나뉜 의상은 **`coat + pants`** 조합으로 패키징합니다.
  - 한벌옷은 **`longcoat`** 단일 슬롯으로 패키징합니다.
  - `longcoat`는 상의와 하의 슬롯을 동시에 차지하므로 `coat + pants`와 섞어 장착하지 않습니다.
* **MSW 장착 필드 기준**:
  - `coat` → `CostumeManagerComponent.CustomCoatEquip`
  - `pants` → `CostumeManagerComponent.CustomPantsEquip`
  - `longcoat` → `CostumeManagerComponent.CustomLongcoatEquip`
* **RUID / 썸네일 주의**:
  - 실제 장착 슬롯에는 등록 또는 검색으로 얻은 plain avatar item RUID만 넣습니다.
  - `thumbnail://<RUID>`는 UI 아이콘이나 미리보기 표시용이며, 실제 장착 슬롯에는 붙이지 않습니다.
  - 등록 또는 검색이 끝나기 전까지 `slot_manifest.json`의 RUID 필드는 임의 값이 아니라 `null`로 둡니다.
  - `Custom*Equip` 계열 필드는 `thumbnail://`를 허용하지 않으므로, 이 값이 들어가면 장착 실패로 처리합니다.
* **산출물**:
  - `avatar_item_package/coat/` 및 `avatar_item_package/pants/` 또는 `avatar_item_package/longcoat/`
  - `slot_manifest.json`
  - `avatar_item_register_checklist.md`
  - `registration_preview.png`

---

## 3. 실행 필수 조건 (Prerequisites)

### STEP 6 진입 전 필수 조건
- `data/clothing/layer_split_refs/` 폴더 내 기준 레퍼런스 의상 리소스 배치 완료.
- Hoi Poi T-shirt + Denim Skirt / Pink Tanktop + Tennis Skirt 샘플 원본 ZIP 보존.
- 각 샘플은 `{sample_id}/v001/raw_zip/`, `{sample_id}/v001/extracted/`, `{sample_id}/v001/normalized_layers/`, `{sample_id}/v001/masks/`, `{sample_id}/v001/sample_info.json` 구조로 정리합니다.

### STEP 7 진입 전 필수 조건
- STEP 6-B에서 `normalized_layers/`와 `masks/`에 실제 PNG 파일이 생성되어 있어야 합니다.
- `sample_normalization_report.json`에 비어 있는 파트와 정상 생성된 파트가 구분되어 있어야 합니다.
- 민소매 샘플의 `front_arm: []`처럼 의도적으로 비어 있는 레이어는 실패로 처리하지 않습니다.
- `design_lock.json`, `anchor_registry.json`, `msw_slot_contract.json` 초안 생성 기준을 확정합니다.

### STEP 8 진입 전 필수 조건
- STEP 7에서 `body_offset_profile.json` 생성 완료.
- `body_offset_profile.json`이 없으면 STEP 8 motion propagation을 실행하지 않습니다.
- `sample_info.json`의 `layer_map` 필드가 샘플별로 작성되어 있어야 합니다.
- `layer_fit_profile.json`, `layer_mask_profile.json`, `z_order_profile.json` 생성 완료.
- `back_clothing_anchor`가 없으면 ladder / rope 계열 G6 프레임은 자동 Skip합니다.
- G4~G7에 사용할 `high_deform_anchor`가 없으면 해당 그룹은 국소 보정 후보 또는 앵커 부족 상태로 분류합니다.

### STEP 10 진입 전 필수 조건
- ComfyUI API 호출 경로 동기화 완료.
- `comfy ui/config.ini` 세팅 완료.
- 필요한 경우 완성본 샘플 전용 LoRA 준비.
- STEP 6~9에서는 ComfyUI를 실행하지 않습니다.
- 같은 프레임/레이어 자동 재시도는 최대 2회로 제한합니다.

### STEP 13 진입 전 필수 조건
- STEP 12의 `clothing_grid.png`, `body_preview_grid.png`, `final_build_report.json` 생성 완료.
- 신규 의상이 `coat + pants`인지 `longcoat`인지 분류 완료.
- 실제 MSW avatar item 등록 또는 RUID 확보 전까지는 `slot_manifest.json`에 RUID를 임의로 채우지 않습니다.
- 실제 장착 필드는 plain avatar item RUID만 사용하고, `thumbnail://`는 미리보기/아이콘 필드에만 사용합니다.
