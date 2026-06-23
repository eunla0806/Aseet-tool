# 🧸 Dot Asset Tool: GOAL_PLAN

## 1. 프로젝트 한 줄 목표

MapleStory Worlds의 `template_grid`에 정확히 맞는 개인용 도트 의상 레이어를  
**Inpainting Mask + ControlNet + LoRA + IP-Adapter + 후처리** 조합으로 제작한다.

---

## 2. 현재 목표

본 프로젝트의 1차 목표는 상업 배포나 외부 서비스 운영이 아니라,  
개인적으로 MapleStory Worlds에서 사용할 예쁜 도트 의상을 제작하는 것이다.

초기 목표는 전체 자동화 시스템이 아니라,  
내가 입고 싶은 의상 1벌을 안정적으로 완성하는 것이다.

---

## 3. 최종 산출물

- `template_grid`와 좌표가 맞는 의상 전용 PNG
- 바디, 얼굴, 피부, 손, 발이 제거된 투명 배경 의상 레이어 (`clothing_only_candidate`)
- `lovely_shopper_clothing_grid`처럼 정렬된 `clothing_grid`
- stand / walk / jump / sit 중심으로 자연스럽게 보이는 의상 시트
- 이후 다른 의상도 반복 제작할 수 있는 반자동 제작 흐름

---

## 4. 핵심 제작 전략

본 프로젝트는 의상 디자인 초안을 고품질로 빠르게 확정하고, 이를 기반으로 다른 모션들을 일관되게 확장하기 위해 **[외부 AI 초안 설계 → clothing_only_anchor 앵커 구축 → ComfyUI 프레임 동작 확장]**의 하이브리드 전략을 채택한다.

### 4.1 핵심 파이프라인 구성 조합
```txt
[외부 AI STAND1 초안 생성 (external_ai_stand1_draft)] (디자인/실루엣/색감 확정)
→ [clothing_only_anchor 추출] (바디 픽셀 분리 및 정밀 위치 정렬)
→ [body_anchor_preview 검수] (실제 바디 템플릿과의 피팅 상태 사전 검수)
→ [ComfyUI 타 동작 확장] (Inpainting Mask + Canny ControlNet + IP-Adapter + LoRA)
→ [clothing_only_candidate 추출] (KSampler raw output에서 투명 의상 분리)
→ [body_preview 최종 합성 검수] (확장 모션이 실제 바디에 피팅되는지 QA)
```

---

## 5. 전략별 역할

### 5.0 외부 AI 이미지 생성 도구 (External AI Generator)

역할: 디자인 컨셉, 색감, 실루엣을 결정하는 고품질 초안 생성 (디자인 앵커)

- **디자인 초안 창작**: ComfyUI에서 맨몸 바디를 입력으로 받아 처음부터 의상 디자인을 창작하려 할 경우, 다리/하체 오염 및 하의 실루엣 결손 등 생성 불안정성이 큽니다. 이를 방지하기 위해 공홈 이미지 생성 도구나 기타 이미지 생성 서비스 등 **외부 AI 이미지 생성 도구**를 통해 가장 직관적이고 고품질의 **STAND1 4프레임 의상 초안(`external_ai_stand1_draft`)**을 선제적으로 생성합니다.
- **최종 에셋이 아닌 가이드 역할**: 외부 AI 초안은 그 자체로 최종 에셋이 아니며, 디자인 방향, 색감, 장식, 실루엣을 확정하고 ComfyUI의 강력한 레퍼런스로 사용하기 위한 **디자인 앵커**의 목적으로만 활용됩니다.

---

### 5.1 Inpainting Mask

역할: 의상 영역 제한 및 보호 영역 고정

Inpainting Mask는 본 프로젝트의 가장 중요한 기본 전략이다.  
AI가 전체 이미지를 마음대로 다시 그리지 않도록 막고,  
옷이 들어갈 영역만 수정하도록 제한한다.

주요 역할:

- 의상이 그려질 영역 지정
- 얼굴, 피부, 손, 발 보호
- 배경 오염 방지
- 의상 레이어 분리 가능성 향상
- 바디 픽셀 제거 후 clothing_grid 추출 안정화

본 프로젝트에서는 Inpainting Mask를 기본으로 사용한다.

---

### 5.2 Canny ControlNet

역할: template_grid의 포즈와 실루엣 고정

Canny ControlNet은 기준 바디의 외곽선하고 포즈를 유지하기 위해 사용한다.  
단, 도트 이미지에서는 Canny 강도를 너무 높이면 의상 디테일이 딱딱해질 수 있으므로  
낮음~중간 강도에서 테스트한다.

주요 역할:

- 바디 포즈 유지
- 프레임별 실루엣 고정
- 의상이 template_grid 위치에서 크게 벗어나지 않도록 보조
- stand / walk / jump / sit 포즈 안정화

Canny가 너무 강하게 작동하면 Lineart 또는 Softedge도 대체 후보로 테스트한다.

---

### 5.3 LoRA

역할: 도트 의상 스타일 고정

LoRA는 샘플 의상 데이터셋을 기반으로  
메이플풍 도트 의상 스타일, 외곽선, 명암, 장식 표현을 학습시키는 용도로 사용한다.

주요 역할:

- 메이플풍 도트 질감 유지
- 외곽선 두께 안정화
- 명암 단계 통일
- 리본, 프릴, 세일러 라인, 별 장식 등 표현 안정화
- 신규 의상 생성 시 샘플 데이터와 유사한 스타일 유지

주의:

LoRA는 좌표 정렬을 담당하지 않는다.  
좌표 정렬은 Inpainting Mask, ControlNet, 후처리 단계에서 담당한다.

---

### 5.4 IP-Adapter

역할: 참고 의상 디자인과 분위기 반영

IP-Adapter는 특정 샘플 의상이나 레퍼런스 이미지의  
색감, 패턴, 전체 분위기를 반영하는 용도로 사용한다.

주요 역할:

- `lovely_shopper_clothing_grid` 같은 참고 의상 분위기 반영
- **`clothing_only_anchor` 레퍼런스 주입**: 외부 AI 초안으로 확보한 `clothing_only_anchor`를 입력 이미지 레퍼런스로 주입하여, 다른 동작(walk, jump, sit 등)으로 동작을 확장할 때 동일한 의상 디자인과 명암 구조가 흔들림 없이 유지되도록 설계합니다.
- 특정 의상 컨셉의 무드 유지

---

### 5.5 후처리 (의상-only 추출 및 검수)

역할: 바디 제거와 투명화 및 피팅 검수

생성 결과에서 원본 바디 픽셀을 제거하고,  
의상만 남는 투명 PNG를 만들며 실제 바디와의 착용 핏을 QA 검수하는 단계이다.

주요 역할:

- template_grid와 생성 결과 비교
- 바디/피부/머리/얼굴 픽셀 제거 (clothing_mask 기반 100% 투명화)
- 노이즈 픽셀 제거
- 투명 PNG 생성
- clothing_grid 좌표 검수
- 의상 외곽선 보존

---

### 5.5.1 정답 의상 소스 (clothing_only_source)

역할: 기존 샘플 에셋 기반의 기준 정답(Ground Truth) 의상 레이어

기존 샘플 의상(예: `05_멜로디 소녀` 구조 - stand1_0, walk1_0 등 프레임 단위 폴더 내에 바디 및 옷 파츠 레이어가 PNG로 분리된 구조)은 AI로 다시 생성하거나 body subtraction 과정을 거치지 않습니다. 대신, **의상 레이어 파츠들만 선별적으로 직접 합성**하여 완벽한 투명 배경의 `clothing_only_source`를 100% 정교하게 사전 제작해 둡니다.

주요 역할:
- **LoRA 학습 데이터**: 바디 픽셀이나 노이즈가 없는 완벽한 순수 의상 도트 스타일 학습용.
- **IP-Adapter Reference**: 색감, 분위기, 디테일 장식 전이의 완벽한 레퍼런스.
- **마스크 생성 기준**: 실제 의상이 그려져 있는 영역만을 흰색으로 설정하여 `clothing_mask`와 `preserve_mask`를 정밀하게 분리하는 기초 데이터.
- **AI 결과 비교 기준**: 새로 생성한 `clothing_only_candidate`의 도트 재현도와 피팅 무결성을 평가하는 최종 대조군(Ground Truth).

레이어 추출 규칙:
- **비의상 레이어 (배제)**: `body`, `head`, `hairShade`, `arm`, `hand`, `backBody`, `backHead` 계열
- **의상 레이어 (직접 합성)**: `pantsOverShoesBelowMailChest`, `mailArm`, `mailArmOverHair`, `mailArmBelowHead`, `mailArmOverHairBelowWeapon`, `mailArmBelowHeadOverMailChest`, `backPants`, `backMailChest`, `backMailChestOverPants` 계열

---

### 5.6 의상-only 파이프라인 이미지 역할 정의

- **`external_ai_stand1_draft`**: 외부 AI 이미지 생성 도구로 빌드한 최초의 STAND1 4프레임 의상 디자인 초안 (2x2 그리드, `860 × 1360` px 표준 권장 / `816 × 1290` px 대체 가능, 단색 배경).
- **`clothing_only_anchor`**: `external_ai_stand1_draft`에서 바디와 배경을 정교하게 지워낸 **투명 배경 앵커 의상 레이어** (Nearest Neighbor 다운스케일을 거쳐 타겟인 `43 × 68` px 크기 획득, ComfyUI 생성의 가이드 reference이자 타 동작 확장의 기준점).
- **`body_anchor_preview`**: `clothing_only_anchor`를 `body_reference` 위에 올려서 바디 템플릿과의 위치 정렬, 치마 길이, 소매 통과 등을 사전에 조율/검수하는 사전 피팅 QA용 이미지 (120×120 px).
- **`temp_base`**: `body_reference` 위에 `clothing_only_anchor`를 오프셋 합성하여 제작한 **ComfyUI 생성 입력용 임시 베이스 캐릭터 이미지** (ComfyUI Inpaint 노드의 소스 이미지로 주입되어 생성 가이드 제공).
- **`clothing_only_source`**: 기존 샘플 의상 파일들의 의상 레이어 파츠만 직접 합성하여 사전 구축한 **완벽한 정답 의상-only 레이어** (학습, 마스크 생성, AI 비교의 기준점).
- **`body_reference`**: 의상이 없는 **순수 기준 바디 템플릿(맨몸 베이스)**. 모든 피팅 프리뷰 이미지의 배경 및 `temp_base` 합성의 재료 (생성 대상이 아님).
- **`raw_comfy_output`**: Colab ComfyUI에서 바로 출력되는 원본 이미지 (바디와 옷이 섞여 있는 중간 단계 결과물).
- **`clothing_only_candidate`**: `raw_comfy_output`에서 `clothing_mask` 영역만을 추출하고 그 외의 바디 및 배경 영역을 100% 투명화 처리하여 얻은 **최종 의상-only 레이어 후보군**. 최종 품질 평가의 핵심 대상.
- **`body_preview`**: `clothing_only_candidate`를 `body_reference` 위에 다시 오버레이(합성)하여 실제 인게임에서 의상이 올바른 위치에 밀착되어 입혀지는지 피팅(Fitting) 및 착용 위치를 검수하기 위한 최종 합성 미리보기 프리뷰 이미지 (120×120 px).

---

## 6. 최종 파이프라인

본 프로젝트의 최종 제작 흐름은 다음과 같다.

```txt
[기존 샘플 의상] 의상 레이어 직접 합성
→ clothing_only_source 획득 (학습/레퍼런스/마스크 빌드/QA 비교용)

[신규 의상 제작] 외부 AI 이미지 생성 도구 실행
→ external_ai_stand1_draft (2x2 그리드 디자인 초안) 획득
→ 로컬 정밀 오려내기 및 4분할로 clothing_only_anchor 빌드 (바디/배경 제거)
→ body_anchor_preview 검수 (디자인 앵커 사전 피팅 QA 통과)
→ temp_base 합성 (body_reference + clothing_only_anchor)
→ ComfyUI 동작 확장 (Inpainting Mask + Canny ControlNet + IP-Adapter reference[clothing_only_anchor] + Input[temp_base])
→ Inpainting generation (raw_comfy_output 획득)
→ clothing_mask 영역 외 투명화 처리 (raw_comfy_output ∩ clothing_mask)
→ clothing_only_candidate 생성 (투명 배경 의상-only 후보)
→ body_preview 최종 합성 (clothing_only_candidate + body_reference)
→ QA 및 착용 피팅 검수 (clothing_only_anchor와 실루엣/색감 일관성 대조)
```

역할 요약:

```txt
external_ai_stand1_draft:
외부 AI를 통한 최초의 고품질 디자인 초안 이미지 (2x2 그리드).

clothing_only_anchor:
외부 AI 초안에서 의상만 추출해 낸 투명 레이어로, ComfyUI 확장의 디자인 앵커(Reference) 역할을 한다.

body_anchor_preview:
초안 의상이 순수 바디 템플릿에 조화롭게 결합하는지 사전에 정밀 핏을 확인하기 위한 프리뷰.

temp_base:
ComfyUI 인페인팅 연산 시 기초 가이드를 제공하기 위해 바디 위에 옷을 올려 놓은 입력용 합성 이미지.

clothing_only_source:
기존 원본 샘플의 순수 의상 레이어로서, 학습/레퍼런스/QA 비교의 정답지(Ground Truth) 역할을 한다.

body_reference:
순수 기준 바디 템플릿 (맨몸 베이스). 모든 착용 검수의 배경 역할을 한다.

Inpainting Mask (clothing_mask):
옷이 그려질 영역(Generation)이자, 최종 추출할 영역(Extraction)을 고정한다.

Canny ControlNet:
template_grid의 포즈와 실루엣을 고정한다.

LoRA:
도트 의상 스타일을 고정한다.

IP-Adapter:
참고 의상 또는 clothing_only_anchor의 분위기와 실루엣 세부 정보를 반영한다.

clothing_only_candidate:
바디가 완전히 배제된 순수 의상 도트 레이어이며 최종 품질 평가의 기준이다.

body_preview:
순수 의상을 바디 위에 입혀보고 착용 핏과 정렬 위치를 검수한다.
```

---

## 7. 우선 제작 범위

### 1차 범위

- template_grid 분석
- 샘플 의상 데이터 정리
- 의상 영역 마스크 제작
- Google Colab 기반 Inpainting 테스트
- Canny ControlNet 적용 테스트
- LoRA 1차 학습
- IP-Adapter 레퍼런스 적용 테스트
- 대표 프레임 생성
- 바디 제거 후 의상 PNG 추출
- 로컬에서 수동 보정

---

## 8. 우선 완성할 프레임

초기 개인용 버전에서는 아래 프레임을 우선 완성한다.

1. stand
2. walk
3. jump
4. sit

---

## 9. 후순위 프레임

아래 프레임은 초기 버전 이후 천천히 보정한다.

- rope
- ladder
- prone
- attack
- shoot
- swing
- stab

---

## 10. 성공 기준

### 필수 기준

- template_grid와 clothing_grid의 캔버스 크기가 일치한다.
- 프레임 위치가 크게 어긋나지 않는다.
- 얼굴, 피부, 손, 발이 오염되지 않는다.
- 의상은 Inpainting Mask 영역 안에서 생성된다.
- 바디 제거 후 의상만 자연스럽게 남는다.
- stand / walk 프레임에서 의상이 예쁘게 보인다.
- 주요 색상과 장식이 프레임마다 크게 흔들리지 않는다.
- 최종 결과물이 투명 PNG로 저장된다.

---

### 개인용 기준

초기 버전에서는 아래 기준을 우선한다.

- 서 있을 때 예쁜가
- 걸을 때 크게 깨지지 않는가
- 점프와 앉기에서 어색하지 않은가
- 메월에서 착용했을 때 만족스러운가
- 내가 원하는 컨셉이 잘 살아나는가

---

## 11. 비목표

초기 버전에서는 아래 항목을 목표로 하지 않는다.

- 전체 124프레임을 한 번에 완벽 자동 생성
- LoRA만으로 좌표 정렬 해결
- Canny ControlNet만으로 의상 영역 제어
- IP-Adapter만으로 전체 의상 생성
- AI가 처음부터 완벽한 투명 PNG를 출력하는 것
- GCP 상용 서버 구축
- 외부 사용자용 웹 서비스 배포
- 마켓 판매용 완성 파이프라인 구축

---

## 12. 디자인 방향

개인용 의상은 아래 감성을 중심으로 제작한다.

- 파스텔 키치
- 산리오풍에서 영감을 받은 귀여운 분위기
- 별, 하트, 리본, 프릴, 캔디, 천사 날개
- 메이플풍 SD 도트 감성
- 시스루 소매
- 세일러 카라
- 핑크, 민트, 화이트, 라벤더, 스카이블루 계열

단, 특정 캐릭터의 이름, 로고, 얼굴, 고유 실루엣을 그대로 복제하지 않고  
일반적인 귀여운 요소로 재해석한다.

---

## 13. 최종 방향 정리

본 프로젝트는 개인용 MapleStory Worlds 도트 의상 제작의 실효성을 극대화하기 위해, **외부 AI 이미지 생성 도구를 통해 최초의 STAND1 초안(`external_ai_stand1_draft`)을 설계하고, 이를 로컬에서 `clothing_only_anchor`로 정제하여 ComfyUI의 레퍼런스로 주입한 뒤 타 동작들로 일관되게 확장**하는 방식으로 진행한다.

- **외부 AI**: 고품질 디자인 컨셉과 앵커 실루엣을 결정한다.
- **Inpainting Mask**: 옷이 그려질 영역(Generation)과 추출할 영역(Extraction)을 고정한다.
- **Canny ControlNet**: template_grid의 포즈와 앵커 의상의 외곽 실루엣을 단단히 고정한다.
- **LoRA**: 도트 고유의 픽셀 아트 스타일 및 검은색 아웃라인 화풍을 복원한다.
- **IP-Adapter**: `clothing_only_anchor`를 주입받아 타 동작(walk, jump, sit 등)으로 동작을 확장할 때도 디자인의 일관성을 강력하게 지탱한다.
- **로컬 후처리**: 마스크 영역 교집합(`raw_comfy_output ∩ clothing_mask`) 추출을 통해 바디 오염 0%의 순수한 투명 의상 레이어 `clothing_only_candidate`를 획득하고, `body_preview`로 착용 피팅 검수를 수행한다.

초기 목표는 완벽한 상용 자동화가 아니라, 내가 입고 싶은 예쁜 의상 1벌을 안정적으로 제작하는 것이다.