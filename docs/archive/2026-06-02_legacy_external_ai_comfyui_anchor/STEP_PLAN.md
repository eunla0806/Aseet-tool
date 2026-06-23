# 🧸 Dot Asset Tool: STEP_PLAN (12단계 마스터 플랜)

## 1. 현재 진행 방향

본 프로젝트는 저사양 로컬 PC 환경을 고려하여 **무거운 AI 생성/학습은 Google Colab**에서 진행하고, **에셋 검수 및 후처리는 로컬**에서 진행하는 효율적인 하이브리드 파이프라인을 채택합니다.

특히, 124개 모든 프레임을 AI로 일일이 새로 그리는 노가다를 지양하고, **React 웹 앱의 렌더링/리깅 시스템**과 연동하여 **"앵커 프레임 AI 생성 + 단순 모션 픽셀 쉬프트 복사 + 동적 모션 그리드 인페인팅"**을 조합하여 공수를 1/10 수준으로 단축합니다.

---

## 2. 전체 진행 현황 대시보드 (12-Step Master Plan)

| 단계 | 작업명 | 상태 | 실제 산출물 / 비고 |
| :--- | :--- | :---: | :--- |
| **STEP 1** | template_grid 구조 분석 | **[완료]** | `src/data/frames.json` 기반 프레임 매핑 완료 |
| **STEP 2** | 샘플 의상 데이터 정리 | **[부분완료]** | 리포트 생성 완료 / 태그 및 분할 작업은 STEP 8로 이관 |
| **STEP 3** | 프레임 그룹 분리 | **[완료]** | `docs/specs/FRAME_GROUP_PLAN.md` 수립 (7개 그룹, 12개 대표 앵커 확정) |
| **STEP 4** | 스마트 마스크 & 순수 그리드 제작 | **[완료]** | 피부색 보정 마스크 및 무노이즈 AI 순수 그리드 32개 동작 일괄 생성 완료 |
| **STEP 4.5** | 의상 샘플 레이어 구조 파싱 및 마스크 겹침 보정 | **[완료]** | outfit 테스트 셋 10종 / 1,240프레임 처리 완료, mask overlap 0px 달성 |
| **STEP 5-A** | 외부 AI STAND1 4프레임 초안 생성 (2x2 그리드) | **[진입]** | 860x1360(또는 816x1290) 해상도 단색 배경의 2x2 그리드 시트 `stand1_draft.png` 생성 진행 중 |
| **STEP 5-B** | clothing_only_anchor 추출 및 정렬 보정 | **[대기]** | 4분할(430x680 또는 408x645) 후처리 및 스킨톤 제거용 `build_anchor_from_draft.py` 구현 대기 |
| **STEP 5-C** | ComfyUI stand1 재현성 테스트 | **[대기]** | `clothing_only_anchor` 가이드 주입을 통한 ComfyUI stand1 재현 생성 및 마스크 분리 검증 |
| **STEP 5-D** | stand / walk / jump / sit 소규모 확장 | **[대기]** | G1, G2, G3 핵심 동작 그룹 내에서의 의상 실루엣 일관성 확장 테스트 |
| **STEP 5-E** | G4~G7 전체 동작 확장 후보 검토 | **[대기]** | 소규모 확장 완료 후 ladder, rope, attack 등 대량 확장 파이프라인 진입 검토 |
| **STEP 6** | 스마트 오프셋 리깅 & 픽셀 복사 | **[대기]** | 앵커 옷 도트를 바디 Y/X축 변위만큼 자동 쉬프트 복사하는 후처리 구현 |
| **STEP 7** | Canny ControlNet 테스트 | **[대기]** | 동적/비대칭 공격 포즈의 의상 실루엣 고정을 위한 CN 가중치 테스트 |
| **STEP 8** | LoRA 학습 데이터셋 준비 | **[대기]** | 의상 타입별 태그 캡셔닝 및 Train/Valid 데이터 분할 |
| **STEP 9** | LoRA 스타일 학습 (SD 1.5) | **[대기]** | 메이플풍 도트 질감 및 아웃라인을 고정하는 LoRA 학습 |
| **STEP 10** | IP-Adapter 레퍼런스 적용 | **[대기]** | Lovely Shopper 등 특정 참고 의상 분위기/색감 반영 테스트 |
| **STEP 11** | 통합 생성 및 React 뷰어 QA | **[대기]** | 124프레임 조립본 React 웹 뷰어 로드 및 마우스 드래그 오프셋 미세 보정 |
| **STEP 12** | 후처리 및 최종 패키징 | **[대기]** | 바디 색 공제 투명화 자동화 및 MSW 에셋 등록용 스프라이트 시트 빌드 |

---

## 3. 세부 단계별 가이드라인

### 🧸 STEP 1. template_grid 구조 분석 (완료)
* **작업 내용:** template_grid(1440x1320px)의 전체 규격, 행/열 셀 오프셋 구조 파악 및 `src/data/frames.json`을 통한 프레임별 리깅 인덱스 데이터 매핑 완료.

### 🧸 STEP 2. 샘플 의상 데이터 정리 (부분완료)
* **작업 내용:** 222,610개 샘플 의상 이미지 파일의 무결성 검증, 개별 프레임 PNG 캔버스 규격 분석 및 스캔 리포트(`outputs/outfit_dataset_report.json`) 생성 완료. (태그/데이터 분할 작업은 STEP 8로 이관)

### 🧸 STEP 3. 프레임 그룹 분리 (완료)
* **작업 내용:** 전체 124개 프레임을 움직임의 물리적 범위와 노출 레이어 연관성에 따라 7가지 핵심 그룹(G1~G7)으로 분류하고, 디자인 가이드 역할을 할 **12개의 대표 앵커 프레임** 최종 확정. (`docs/specs/FRAME_GROUP_PLAN.md` 수립 완료)

### 🧸 STEP 4. 스마트 마스크 & 순수 그리드 제작 (완료)
* **작업 내용:** 
  - 턱밑선, 목, 손발끝이 AI 연산 과정에서 뭉개지지 않도록 바디 고유의 살구색 픽셀을 자동 검출하는 **피부색 스마트 보정 필터** 설계 및 연동.
  - 테두리선 and 라벨 텍스트 노이즈를 원천 배제하고 가로 120px 셀 내에 1:1 오프셋 정렬 매핑을 한 AI 인페인팅용 **"순수 그리드 시트 및 마스크"** 빌더 스크립트(`scripts/generate_pure_grids.py`) 구현.
  - 32가지 모든 동작(124프레임)에 대한 일괄 생성 및 해상도/이진화 무결성 검증 QA 100% 합격 통과 완료.

### 🧸 STEP 4.5. 의상 샘플 레이어 구조 파싱 및 정답 의상 합성 (완료)
* **작업 내용:**
  - **샘플 데이터 구조 분석**: `data/clothing/outfit/skirt/05_멜로디 소녀`와 같이 zip 파일 내부가 `stand1_0`, `walk1_0`, `jump_0`, `ladder_0` 등 **action/frame 단위 폴더**로 나뉘어 있고, 각 프레임 폴더 내부에 바디 파츠(`body`, `head`, `arm`, `hand` 계열)와 의상 파츠(`pants`, `mail`, `backPants`, `backMailChest` 계열) 레이어 PNG가 분리되어 존재함을 확인.
  - **정답 의상 직접 합성 (`clothing_only_source` 빌드)**: 기존 샘플 의상은 AI 생성 대상이 아니며, 바디 픽셀 제거를 위해 복잡한 body subtraction 연산을 수행하지 않습니다. 대신 비의상 레이어(`body`, `head`, `hairShade`, `arm`, `hand`, `backBody`, `backHead` 등)를 철저히 배제하고, **의상 레이어 파츠**(`pantsOverShoesBelowMailChest`, `mailArm`, `mailArmOverHair`, `mailArmBelowHead`, `mailArmOverHairBelowWeapon`, `mailArmBelowHeadOverMailChest`, `backPants`, `backMailChest`, `backMailChestOverPants` 등)만 1:1로 직접 합성하여 완벽한 무노이즈 투명 배경 의상 레이어인 `clothing_only_source.png`를 빌드합니다.
  - **마스크 겹침 보정**: 이 `clothing_only_source`와 바디 템플릿의 관계 분석을 통해 `clothing_mask`와 `preserve_mask`를 추출하고, `preserve_mask_final = raw_preserve_mask - clothing_mask` 차집합 보정 로직을 탑재하여 1,240개 모든 프레임에서 마스크 겹침(overlap) 0px를 달성.

### 🧸 STEP 5. 외부 AI 초안 기반 앵커링 및 ComfyUI 타 동작 확장 테스트 (실패)
* **목표:**
  - ComfyUI 단독으로 의상을 무에서 창작하려 할 때 발생하는 다리/하체 영역 오염 및 하의 실루엣 결손 등 생성 불안정성을 예방하기 위해 **[외부 AI STAND1 초안 생성 -> clothing_only_anchor 추출 -> ComfyUI 동작 확장]**의 강력한 앵커링 파이프라인을 구축합니다.
  - 외부 AI 초안을 레퍼런스로 주입받은 ComfyUI는 처음부터 디자인을 무작위로 창작하는 대신, 확정된 초안을 **다른 동작으로 확장 및 일관성을 보정**하는 용도로만 제한하여 활용합니다.

#### 🧸 STEP 5-A. 외부 AI STAND1 4프레임 의상 초안 생성 (2x2 그리드)
* **작업 내용**: 단색 배경 생성을 지원하는 **외부 AI 이미지 생성 도구**를 활용하여 `stand1_0` ~ `stand1_3`에 해당하는 4개 프레임이 **한 장의 2x2 그리드 형식**으로 배치된 고품질 의상 디자인 초안(`external_ai_stand1_draft`)을 확보합니다.
* **생성 이미지 스펙 (필수 조건)**:
  - **포맷**: 4개 프레임이 정밀하게 정렬된 **2x2 그리드 레이아웃** (상단 좌/우 = `stand1_0` / `stand1_1`, 하단 좌/우 = `stand1_2` / `stand1_3`)
  - **해상도**: **`860 × 1360` px 표준 권장** (개별 프레임 셀 `430 × 680` px 크기)
    - *대체 근사 사양 (플랫폼 제약 시)*: `816 × 1290` px (개별 프레임 셀 `408 × 645` px 크기)을 근사 해상도로 대체 사용 가능하며, 이 경우 `build_anchor_from_draft.py` 스크립트가 개별 셀 분할 후 Nearest Neighbor 보간을 통해 최종 `43 × 68` px 규격으로 강제 재보정 및 정렬을 수행합니다.
  - **배경**: 반드시 단순 단색 배경 (흰색 또는 밝은 단색 권장), 프레임 간 경계선이나 그라데이션/복잡한 배경 금지
  - **구도**: 각 셀의 전신이 잘리지 않도록 균일한 비율과 센터링 유지 (머리끝~발끝 포함)
  - **기타**: 그림자 없음, 불필요한 텍스트나 UI 데코레이션 없음
* **목표**: 신규 의상의 컨셉 테마, 지배적 색조, 미세 장식 디테일, 치마/바지의 실루엣 및 무드를 확정합니다.
* **제약**: 124프레임 전체를 외부 AI 이미지 생성 도구로 생성하지 않습니다. 오직 디자인 기준이 될 **STAND1 4프레임(2x2 그리드 1장)**만 앵커용으로 제작합니다.

#### 🧸 STEP 5-B. clothing_only_anchor 추출 및 정렬 보정

> [!IMPORTANT]
> **`scripts/build_anchor_from_draft.py` 구현이 완료되어야 이 단계를 진행할 수 있습니다. (현재 미구현)**  
> 기술 명세 및 처리 알고리즘은 `APPENDIX_TECH.md 2.2절` 참조.

* **작업 내용**: 2x2 그리드 형태의 `external_ai_stand1_draft` (860×1360 또는 816×1290) 1장으로부터 아래 Python 스크립트를 통해 개별 프레임 분할 및 배경·스킨톤 자동 제거 작업을 수행하여 투명 배경 **`clothing_only_anchor`**를 생성합니다.
  - **Step 1**: 2x2 그리드 이미지를 균일하게 4분할하여 `430 × 680` px (또는 대체 사양의 경우 `408 × 645` px) 크기의 개별 프레임 이미지 4장 추출
  - **Step 2**: 이미지 모서리 색 기반 Flood Fill로 단색 배경 투명화
  - **Step 3**: MASK_SPEC.md 2.1절의 스킨톤 범위(R≥220, 150≤G≤255, 80≤B≤240, R≥G>B)에 해당하는 바디 픽셀 투명화
  - **Step 4**: 43×68로 Nearest Neighbor 다운스케일 (대체 사양 사용 시 43×68 기준으로 정밀 재보정 수행)
  - **Step 5**: `body_reference` (순수 기준 바디 템플릿) 위에 합성하여 `body_anchor_preview` (120×120) 생성
* **검수 기준**: `body_anchor_preview`에서 어깨선, 치마/바지 하단 길이, 다리 노출 면적, 착용 위치의 어긋남을 육안 검수. 이 검수를 통과해야 STEP 5-C로 진입 가능합니다.

#### 🧸 STEP 5-C. ComfyUI stand1 재현성 테스트
* **작업 내용**: 로컬 정밀 검수를 통과한 `clothing_only_anchor`를 IP-Adapter reference 및 KSampler 생성 가이드로 주입하고, `body_reference` 위에 `clothing_only_anchor`를 오프셋 정렬 합성한 **`temp_base`**를 입력 이미지로 하여, Inpainting Mask + ControlNet 조합을 사용해 ComfyUI에서 `stand1_0` ~ `stand1_3` 프레임을 재현 생성합니다.
* **평가**: ComfyUI 원본 출력(`raw_comfy_output`)이 아니라, 마스크를 적용해 투명하게 잘라낸 **`clothing_only_candidate`**를 기준으로 앵커 원본의 디테일과 외곽선 도트가 선명하게 복원되는지 검증합니다. (최종 착용 피팅 검수는 `clothing_only_candidate`를 `body_reference` 위에 합성한 `body_preview`로 수행)

#### 🧸 STEP 5-D. stand / walk / jump / sit 소규모 확장
* **작업 내용**: 124프레임 전체를 한 번에 생성하기에 앞서, `clothing_only_anchor`를 고정 레퍼런스로 주입받은 ComfyUI가 핵심 동작인 G1(stand), G2(walk), G3(jump, sit) 그룹 내에서 실루엣과 장식을 일관되게 확장할 수 있는지 앵커 프레임 위주로 집중 테스트합니다.

#### 🧸 STEP 5-E. 통과 후 전체 동작 확장 후보 검토
* **작업 내용**: 소규모 확장 테스트(stand/walk/jump/sit)를 완벽히 통과하면, 후순위 공격/유틸리티 동작(G4~G7: ladder, rope, attack, swing, prone 등)으로의 대량 확장 파이프라인으로의 순차 진입을 검토합니다.

* **실행 필수 조건:**
  - Google Colab 및 ComfyUI 실행 주소 동기화 완료.
  - `comfy ui/config.ini`의 colab_url 매핑 완료.

* **입력 및 산출물 파일 정의:**
  - **입력 (외부 AI):** `external_ai_stand1_draft` (디자인 초안 이미지)
  - **입력 (로컬 정형화):** `clothing_only_anchor` (ComfyUI 확장의 디자인 앵커/레퍼런스 역할)
  - **대조군 (샘플 대조용):** `clothing_only_source.png` (샘플 레이어에서 직접 합성하여 얻은 무결점 정답 의상 - 기존 샘플 대조용)
  - **산출물:**
    - `body_anchor_preview.png` (초안 의상 사전 피팅 프리뷰 이미지)
    - `raw_comfy_output.png` (중간 결과물: ComfyUI API 통신을 통해 다운로드한 원본 병합 이미지)
    - `clothing_only_candidate.png` (최종 신규 생성 의상 후보: `raw_comfy_output ∩ clothing_mask` 공식을 적용한 투명 배경 의상)
    - `body_preview.png` (최종 피팅 프리뷰: `clothing_only_candidate`를 `body_reference` 위에 다시 오버레이하여 착용 핏을 체크하는 이미지)
    - `step5_test_report.json` (테스트 퀄리티 및 일관성 평가 리포트)

* **성공 판정 기준 (Pass Criteria):**
  - **PASS-1 (해상도 일치):** `clothing_only_candidate` 및 `body_preview`가 `120 * 프레임수 x 120px` 해상도 규격을 오차 없이 정확히 준수하는가.
  - **PASS-2 (의상 단독 추출):** `clothing_only_candidate`의 배경과 캔버스 영역이 깔끔히 투명화 처리되었으며, 명확한 바디/얼굴/손/발 픽셀의 혼입이 없어야 합니다. 스킨톤 유사 픽셀의 경계 혼입 여부는 자동 분석 통계(RGB 매칭 비율)와 수동 비주얼 검수를 함께 사용해 종합 판단합니다.
  - **PASS-3 (피팅 및 위치 검수):** `body_preview`에서 의상의 맞물림 및 외곽선이 `body_reference`와 1:1로 정확하게 일치하며, 삐져나오거나 어색한 공백이 생기지 않는가.
  - **PASS-4 (도트 무결성 및 일관성 대조):** `clothing_only_candidate`를 디자인 앵커인 `clothing_only_anchor`(또는 기존 `clothing_only_source`)와 직접 1:1 대조했을 때, 굵은 테두리 아웃라인(MSW 도트 감성)과 원안의 명암/색상이 어색하게 뭉개지지 않고 선명히 드러나며 흔들림 없는 일관성이 유지되는가.

* **실패 코드 및 대처 요령 (Failure Codes):**
  - **ERR-501 (Naked Body Leak):** 생성 결과가 맨몸 스킨 픽셀만 남음.
    -> 원인: `body_reference` 합성 및 의상 레퍼런스 입력 경로가 누락되어 skin 픽셀만 제공되었을 가능성.
    -> 대처: `clothing_reference_frames`를 확인하고 config.ini의 타겟 매핑 재확인.
  - **ERR-502 (Overlap Conflict):** `preserve_mask`와 `clothing_mask`가 겹쳐 얼굴/머리가 뭉개짐.
    -> 원인: 마스크 차집합 차감(`raw_preserve - clothing`) 미적용 혹은 마스크 Dilation 오버플로우.
    -> 대처: `scripts/parse_outfit_layers.py` 재실행 및 overlap ratio 검증.
  - **ERR-503 (Pixel Blur / Mismatch):** 도트가 과도하게 번지거나 뭉개짐.
    -> 원인: 인페인팅 Denoising 강도가 너무 높거나, 베이스 체크포인트/LoRA 스타일 호환성 부족.
    -> 대처: denoise 값을 0.30 / 0.40 / 0.50 비교군으로 테스트하여 도트 외곽선 선명도가 확보되는 최적점을 찾아 적용하고, Nearest Neighbor 보간 업스케일 배율 점검.
    -> 중요: LoRA는 스타일(외곽선/명암) 개선용이므로, 바디 형태 훼손이나 공간 오차 등 구조적 문제는 마스크 팽창/수축 및 차집합 수치 조절로 대응해야 함.

---

### 🧸 STEP 6. 스마트 오프셋 리깅 & 픽셀 복사 (대기)
* **작업 내용:** 
  - STEP 5에서 AI로 고품질 완성된 0번 프레임의 의상 픽셀 데이터를 바디의 프레임별 상하/좌우 오프셋 변위값(쉬프트 픽셀 값)에 따라 **자동 평행 이동 및 복사 합성해 주는 로컬 후처리 스크립트**(`scripts/apply_pixel_rigging.py`) 구축.
  - stand(숨쉬기 바운싱), walk(걷기 교차), sit(앉기 압축) 등 단순 모션의 프레임들을 0.1초 만에 자동 복제 완성하여 플리커링이 전혀 없는 초안 애니메이션 확보.

### 🧸 STEP 7. Canny ControlNet 테스트 (대기)
* **작업 내용:** 
  - 리깅 오프셋 복사만으로 해결되지 않는 포복(G5), 찌르기(G6), 휘두르기(G7) 등의 다이내믹 공격 동작을 대비하여 포즈 가중치 가이드인 Canny ControlNet을 결합해 실루엣을 단단히 고정하는 강도 조절 테스트 진행.

### 🧸 STEP 8. LoRA 학습 데이터셋 준비 (대기)
* **작업 내용:** 샘플 의상 에셋에 메이플 고유 태그(도트 아웃라인, 세일러, 코트 등)를 프롬프트로 캡셔닝하고, 학습 데이터와 유효성 검증용(Valid) 데이터를 엄격하게 분류하여 Google Drive에 업로드.

### 🧸 STEP 9. LoRA 스타일 학습 (대기)
* **작업 내용:** Colab 환경에서 스타일 LoRA 모델 학습을 실행하여, 새로 인페인팅하는 의상의 질감과 굵은 검은색 테두리 아웃라인(MSW 도트 고유 스타일)을 견고하게 유지해 주는 가중치 파일 (.safetensors) 확보.

### 🧸 STEP 10. IP-Adapter 레퍼런스 적용 (대기)
* **작업 내용:** Lovely Shopper 등 뛰어난 샘플 이미지의 무드와 색감 밸런스를 입력으로 함께 받아, 텍스트 프롬프트만으로 표현이 어려운 미세한 디테일 디자인을 결과물에 자연스럽게 전이(Transfer)시키는 연동 테스트.

### 🧸 STEP 11. 통합 생성 및 React 뷰어 QA (대기)
* **작업 내용:**
  - AI 그리드 인페인팅 + 오프셋 리깅 복사 + ControlNet 생성물을 종합하여 124프레임의 임시 의상 시트 완성.
  - 이 결과물을 로컬 React 앱(`E:\Aseet tool\src`)에 로드.
  - 사용자님이 브라우저 화면의 캔버스 위에서 마우스 드래그를 이용해 프레임별 의상의 미세한 맞물림 어긋남(`activeFrameOffset`)을 실시간 수동 조정 및 보정 검수.
  - 124프레임 애니메이션으로 전체 루프 재생하여 완성도 최종 시각적 검증.

### 🧸 STEP 12. 후처리 및 최종 패키징 (대기)
* **작업 내용:**
  - 바디 및 배경 픽셀을 깔끔하게 지워내고 순수한 투명 의상 레이어만 남기는 파이썬 공제 스크립트 구동.
  - 최종 1440x1320px 스프라이트 시트(`clothing_grid.png`)로 병합하여 MapleStory Worlds 아바타 코스튬 등록 규격에 맞춰 최종 에셋 패키징 완료.
