# 🧸 Dot Asset Tool: GOAL_PLAN

## 1. 프로젝트 한 줄 목표

MapleStory Worlds의 `template_grid` 및 바디 프레임 좌표에 정밀하게 안착하는 개인용 도트 의상 에셋을 **기준 샘플 프로파일(Reference Profile) 기반 모션 전파(Motion Propagation) & 사후 레이어 분할 제어(Post-Separation Layer Control)**로 124프레임 전 영역까지 자동 확장한 뒤, 최종적으로 **MSW avatar item 등록 규격**에 맞게 패키징하고 검수한다.

---

## 2. 핵심 목표 및 가치

본 프로젝트의 핵심은 **수작업(픽셀 직접 리터칭) 공수를 100%에 가깝게 최소화**하는 최첨단 하이브리드 자동화 시스템을 완성하는 것입니다.

* **인적 개입의 한계 지정**: 사람은 도트 픽셀을 직접 드로잉하거나 수정하지 않습니다. 사람의 역할은 오직 결과물을 보고 **PASS / FAIL 여부의 시각적 판단**과 **기준 레퍼런스 샘플 선택**으로만 엄격히 제한됩니다.
* **실패 프레임의 선순환 처리**: QA 검사를 통과하지 못한 실패 프레임은 사람이 직접 수정하지 않으며, 실패 플래그를 받아 **[좌표 재계산 -> 마스크 재분해 -> 레이어별 ComfyUI 부분 인페인팅 -> 자동 QA 재검사]**의 자동 재처리 루프(Retry Loop)로 환류됩니다.
* **최종 산출물**: 바디가 완전히 제거된 투명 배경 의상 레이어(Individual Layers), 최종 `clothing_grid` 스프라이트 시트, 그리고 MSW avatar item 등록에 필요한 슬롯별 패키지.

---

## 3. 최종 산출물 규격

- **`clothing_only_candidate`**: 바디, 얼굴, 피부, 손, 발이 완벽하게 소거된 투명 배경 의상 파트 레이어 세트.
- **`clothing_grid`**: MapleStory Worlds 표준 그리드 형태로 한눈에 정렬 및 포맷팅된 완성 의상 스프라이트 시트.
- **`body_preview`**: 순수 바디 템플릿 위에 신규 의상을 오버레이하여 60fps 모션으로 최종 핏을 확인하는 실시간 프리뷰.
- **`avatar_item_package`**: MSW avatar item 등록용 최종 패키지. 상·하의 분리 의상은 `coat + pants`, 한벌옷은 `longcoat` 기준으로 분류한다.
- **`slot_manifest.json`**: 각 산출물이 어떤 MSW 장착 슬롯에 들어가는지 기록하는 매니페스트. `coat`, `pants`, `longcoat`를 혼동하지 않도록 별도 기록한다.
- **`final_build_report.json`**: 모든 프레임의 QA 성공률, 오차율, 전파 메타데이터 및 빌드 타임스탬프를 담은 최종 리포트.

---

## 4. 핵심 제작 전략

디자인의 일관성과 정교함을 완벽하게 유지하기 위해 **"통합 전파 및 배치 후, 레이어 분할 제어"**의 하이브리드 파이프라인 전략을 수행합니다.

```txt
[Master Anchor 1장 확보 (external_ai_drafts 하위 afternoon_picnic 등)]
→ [기준 샘플(layer_split_refs) 좌표/레이어 구조 정밀 분석]
→ [바디 프레임 좌표 기반 1차 자동 모션 전파 (Motion Propagation)]
→ [Reference Mask 기반 2차 자동 레이어 분해 (Post-Separation)]
→ [실패 레이어 및 고변형 부위만 ComfyUI 국소 보정 (Failed Layer Pinpoint Inpainting)]
→ [5대 항목 자동 QA (Automated QA)]
→ [Z-Order 기반 최종 3차원 그리드 조립 (Final Assembly)]
→ [MSW avatar item 슬롯 규격 패키징 (Avatar Item Packaging)]
```

---

## 5. 파이프라인 핵심 개념 및 용어 정의

### 5.1 유지할 핵심 도메인 개념
- **`clothing_only_anchor`**: 사용자가 직접 엄선한 최고의 master anchor 1장으로부터 배경/피부 외곽선을 정제하여 획득한 기준 의상 도트 (Nearest Neighbor 스케일 보정을 거친 `43 × 68` px 타겟).
- **`body_anchor_preview`**: `clothing_only_anchor`를 `body_reference` 위에 올려서 사전 정렬 핏을 육안 검증하기 위한 프리뷰.
- **`clothing_only_source`**: 기준 샘플 의상(레이어 스플릿 레퍼런스 등)의 순수 의상 레이어 파츠만 결합하여 사전 빌드해 둔 완벽한 정답 의상.
- **`clothing_only_candidate`**: 자동 전파 및 분해, 그리고 ComfyUI 핀포인트 보정을 거쳐 피부/배경이 투명하게 제거된 최종 신규 의상 레이어 후보군.
- **`body_preview`**: `clothing_only_candidate`를 `body_reference` 위에 올려서 착용 피팅 위치를 육안 검수하는 최종 합성 프리뷰.
- **`body_reference`**: 의상이 전혀 없는 순수한 기준 바디 템플릿(맨몸 베이스).
- **`clothing_mask`**: 의상이 덮어쓰여야 하는 픽셀 영역 가이드 마스크.
- **`preserve_mask`**: 바디 및 피부 영역 등 AI 침범이 금지되는 무조건적 보호 영역 마스크.
- **`avatar_item_package`**: 최종 PNG 레이어와 등록용 메타데이터를 함께 묶은 패키지. 실제 MSW 장착 슬롯과 연결되는 최종 단위입니다.
- **`slot_manifest`**: 신규 의상이 `coat + pants` 조합인지, `longcoat` 단일 슬롯인지 기록하는 JSON 문서입니다.

### 5.2 MSW avatar item 등록 원칙
- **상·하의 분리 의상**: 상의는 `Coat`, 하의는 `Pants`로 등록하는 것을 기본 원칙으로 합니다.
- **한벌옷**: 상의와 하의를 동시에 차지하는 의상은 `Longcoat`로 등록합니다.
- **충돌 금지**: `Longcoat`는 `Coat + Pants`와 동시에 장착하지 않습니다. 한벌옷을 사용할 때는 상의/하의 슬롯을 비워 두는 방향으로 처리합니다.
- **RUID 규칙**: 실제 장착에는 `CostumeManagerComponent`의 `CustomCoatEquip`, `CustomPantsEquip`, `CustomLongcoatEquip`에 들어갈 avatar item RUID가 필요합니다. 임의 문자열을 만들지 않고, 등록 또는 검색으로 얻은 실제 RUID만 사용합니다.
- **썸네일 규칙**: UI 아이콘이나 미리보기에서 avatar item을 이미지처럼 보여줄 때만 `thumbnail://<RUID>`를 사용합니다. 실제 장착 슬롯에는 `thumbnail://`를 붙이지 않습니다.

### 5.3 축소 및 보류할 legacy 개념 (Non-Goals)
- **외부 AI 2x2 4프레임 초안 필수 전제 흐름**: AI의 다프레임 생성 복잡도를 고려하여 2x2 생성을 강제하지 않고, **단 1장의 고품질 master anchor 1장**만으로도 전체 전파가 가능하도록 유연성을 확보합니다.
- **자동 스킨톤 제거 기본 실행**: 픽셀 유실 및 왜곡이 크므로 **기본 OFF**로 처리하며, 원본 투명도(Alpha Channel)를 100% 온전히 유지합니다.
- **ComfyUI 전체 동작 초기 생성 흐름**: AI가 처음부터 124프레임을 창작하여 생기는 지터링을 방지하기 위해 전체 생성 방식을 폐기하며, 오직 고변형/실패 레이어의 부분 보정에만 한정 구동합니다.
- **사람의 수동 픽셀 보정 흐름**: 마우스로 도트 픽셀을 찍는 모든 수작업을 배제하며, 오직 자동 재처리 매개변수 조절 및 합격/불합격 판정만 진행합니다.

---

## 6. 성공 기준 (Success Metrics)

### 6.1 물리적 및 픽셀 무결성 기준
- **프레임 캔버스 정합성**: `template_grid`의 규격과 최종 완성된 `clothing_grid` 규격이 100% 완벽하게 합치한다.
- **무손상 피부 보존**: 목선, 소매단, 다리 경계 등 피부 노출 부위(`preserve_mask` 영역)에 옷 픽셀이 침투하거나 오염되는 불량이 존재하지 않는다.
- **도트 질감 및 명암 일관성**: master anchor에서 선언된 색상 팔레트 외에 불필요한 외곽선 번짐이나 그라데이션 노이즈가 없다.
- **Z-Order 레이어 무결성**: 캐릭터 뒤에 놓여야 할 의상 레이어(`back_layer`)와 전면 레이어가 겹치는 렌더링 순서 결함이 없다.
- **MSW 슬롯 무결성**: `coat + pants`와 `longcoat`의 분류가 명확하며, 서로 충돌하는 장착 구성이 없다.
- **등록 패키지 무결성**: 최종 산출물이 이미지뿐 아니라 등록에 필요한 슬롯 정보와 검수 리포트를 함께 포함한다.

### 6.2 효율성 기준
- **수작업 제로화**: 수동 리터칭 픽셀 드로잉 공수가 100% 제거되었는가.
- **빠른 전파 속도**: AI API 호출 없이 로컬 픽셀 오프셋 변위 전파로 처리되는 1차 자동화 프레임 비중이 전체의 80% 이상인가.

---

## 7. 비목표 (Non-Goals)
- **AI 100% 무인 자동 완성**: 시각적 판단과 최종 승인은 사용자의 PASS/FAIL 결정으로 귀결됩니다.
- **수동 픽셀 도트 수정 도구 구축**: 툴박스 내에 픽셀 연필, 브러시 등의 수동 수정 기능은 존재하지 않으며 개발하지 않습니다.
- **실패 프레임 방치**: 실패가 확인되면 반드시 자동 파라미터 튜닝 기반 재처리 파이프라인으로 돌려야 하며, 사람이 대충 보정하여 넘기지 않습니다.
- **MSW 외부 전용 PNG 제작으로 종료**: 단순 PNG 시트 제작만으로 끝내지 않고, MSW avatar item 등록 가능성을 최종 목표로 둡니다.
