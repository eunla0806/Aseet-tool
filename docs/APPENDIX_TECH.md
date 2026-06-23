# 🧸 Dot Asset Tool: APPENDIX_TECH (기술 구현 상세 명세 부록)

본 문서는 GOAL_PLAN 및 STEP_PLAN을 보조하여 하이브리드 자동화 파이프라인의 물리적 데이터 규격, 메타데이터 스키마, 알고리즘 구현 상세 및 정책을 상세히 기록한 정밀 기술 명세서입니다.

---

## 0. MSW Compatibility Contract

이 도구의 최종 목표는 일반 `sprite` 한 장을 만드는 것이 아니라 **MSW avatar item 등록을 준비할 수 있는 의상 산출물**을 만드는 것입니다. 따라서 최종 패키징과 장착 규칙은 `msw-avatar` 기준을 따릅니다.

- `msw-avatar` 기준: `longcoat`는 `CostumeManagerComponent.CustomLongcoatEquip`, `coat`는 `CustomCoatEquip`, `pants`는 `CustomPantsEquip`에 연결합니다.
- `longcoat`는 상의와 하의 슬롯을 동시에 차지하므로 `coat + pants`와 동시에 장착하지 않습니다.
- 실제 장착 슬롯에는 plain avatar item RUID만 들어갑니다.
- `thumbnail://<RUID>`는 UI 아이콘, 미리보기, 등록 확인 이미지에만 사용합니다.
- `msw-painter`는 창작 참고 이미지나 보조 sprite 제작용으로만 사용하며, avatar item atlas 전체 처리의 메인 파이프라인으로 사용하지 않습니다.
- RUID는 등록 또는 검색 결과로 확보하기 전까지 `null`로 둡니다.

---

## 1. 데이터 폴더 구조 (Data Folder Architecture)

자동화 파이프라인의 모든 입출력은 사전에 약속된 물리적 폴더 구조 및 정형화 스토리지 규칙에 따라 엄격히 보관 및 통제됩니다.

### 1.1 `data/` 입력 디렉토리 구조
```txt
data/
├── body template/           # 124개 동작 프레임의 순수 기준 바디 템플릿 (맨몸 베이스)
│   ├── stand1/              # stand1_0.png ~ stand1_3.png
│   ├── walk1/               # walk1_0.png ~ walk1_3.png
│   └── ...
├── clothing/                # 기존 의상 샘플 및 레이어 분할 참고용 레퍼런스
│   ├── top/                 # 상의 단독 샘플
│   ├── bottom/              # 하의 단독 샘플
│   ├── outfit/              # 한벌옷 단독 샘플
│   └── layer_split_refs/    # 통짜 의상을 자동 분해하기 위한 마스크 기준 참고 샘플
│       ├── Hoi_Poi/         # 메인 반팔+치마 조합
│       └── Pink_Tanktop/    # 보조 민소매+치마 조합
├── external_ai_drafts/      # 신규 의상 디자인 초안 및 사용자가 선택한 master anchor 1장
│   └── afternoon_picnic/
│       ├── stand1_master.png # 사용자가 엄선한 1장의 Master Anchor (Alpha 채널 보유)
│       └── draft_info.json   # 앵커 컨셉 및 메타데이터
├── msw/
│   └── contracts/            # MSW 슬롯 계약, 액션 프레임 계약, 디자인 고정 규칙
│       ├── design_lock.json
│       ├── anchor_registry.json
│       ├── msw_slot_contract.json
│       └── action_frame_contract.json
└── grid/                    # QA 및 Visual Contact Sheet용 묶음 그리드 이미지 저장소
```

### 1.2 `outputs/` 출력 디렉토리 구조 (결과물은 data/를 침범하지 않음)
```txt
outputs/
├── reference_profiles/      # step 7의 레퍼런스 샘플 분석 프로파일 리포트 (.json)
├── propagated_full/         # step 8의 1차 수학적 변위 복사 배치 완료 통짜 의상 (.png)
├── layer_split/             # step 9의 reference 마스크 곱연산 분해 완료 개별 레이어 (.png)
├── pinpoint_inpainted/      # step 10의 ComfyUI 국소 보정 완료 파트 레이어 (.png)
├── qa_reports/              # step 11의 5대 항목 자동 QA 리포트 및 실패 프레임 목록 (.json)
├── final_package/           # step 12의 최종 assembly 병합 clothing_grid (.png) 및 메타데이터
└── msw_package/             # step 13의 MSW avatar item 등록 준비 패키지, 슬롯별 산출물, 미리보기
```

---

## 2. 레이어 분할 레퍼런스 및 분류 체계 (Layer Split & Taxonomy)

### 2.1 `layer_split_refs`의 역할
신규 의상을 처음부터 조각난 AI 레이어로 생성하는 것은 불가능합니다. 
따라서, **디자인 일관성을 가진 통짜 master anchor를 뼈대 좌표로 1차 전파한 후, 검증된 참고 샘플의 알파 채널 마스크를 템플릿 삼아 곱연산(Multiply)하여 강제 분해**하는 역할을 담당합니다.

### 2.2 레퍼런스 샘플 분류 체계 (Reference Sample Taxonomy)
- **Hoi Poi T-shirt + Denim Skirt** (`main layer split reference`): 반팔 상의와 일반 스커트 구조를 가진 보편적 레이아웃의 기본 분리 템플릿.
- **Pink Tanktop + Tennis Skirt** (`secondary layer split reference`): 끈형/민소매 상의와 주름 스커트 등 세부 스킨 노출이 다른 특수 의상 구조의 분리 템플릿.

### 2.3 레이어 분류 규격 (Layer Group Taxonomy)
MSW 및 아바타 렌더러 규격에 따라 자동 분해 완료된 의상은 아래 5대 핵심 파트 레이어로 분류 분류되어 저장됩니다.

1. **`front_torso`** (전면 몸통): 캐릭터 앞면에 그려지는 상의 바디 부분. 어깨와 가슴 부위를 커버.
2. **`front_arm`** (전면 소매/팔): 앞면 바디 레이어 위에 오버레이되는 전면 팔 및 소매 도트.
3. **`front_lower`** (전면 하의): 캐릭터 다리 앞을 덮는 치마, 바지, 벨트 등의 하의 도트.
4. **`back_torso`** (후면 몸통): ladder/rope 모션 등 캐릭터 뒤돌아선 자세에서 몸통을 덮는 등판 의상.
5. **`back_lower`** (후면 하의): 뒤돌아선 자세에서 엉덩이와 다리 뒤를 덮는 하의 의상.

---

## 3. 메타데이터 및 프로파일 규격 (Metadata Schema)

### 3.1 `sample_info.json` 규격 (참고 샘플 고유 정보)
```json
{
  "sample_id": "hoi_poi_denim_skirt",
  "category": "outfit",
  "structure_type": "short_sleeve_skirt",
  "base_frames": ["stand1_0", "walk1_0", "jump_0"],
  "layer_map": {
    "front_torso": "mailChest",
    "front_arm": "mailArm",
    "front_lower": "pantsOverShoesBelowMailChest",
    "back_torso": "backMailChest",
    "back_lower": "backPants"
  }
}
```

### 3.2 `layer_fit_profile.json` 규격 (프레임별 핏 좌표 프로파일)
```json
{
  "action_frame": "walk1_0",
  "bbox": [12, 24, 31, 56],
  "center": [22, 40],
  "waist_y": 42,
  "hem_y": 51,
  "body_offset": [0, -1],
  "associated_sample_frame": "walk1_0"
}
```

### 3.3 `layer_mask_profile.json` 규격 (레이어 파트별 마스크 좌표)
```json
{
  "action_frame": "walk1_0",
  "layers": {
    "front_torso": {
      "bbox": [15, 24, 28, 38],
      "mask_file_path": "data/clothing/layer_split_refs/Hoi_Poi/masks/walk1_0_front_torso.png",
      "pixel_count": 86
    },
    "front_lower": {
      "bbox": [12, 39, 31, 51],
      "mask_file_path": "data/clothing/layer_split_refs/Hoi_Poi/masks/walk1_0_front_lower.png",
      "pixel_count": 112
    }
  }
}
```

### 3.4 `z_order_profile.json` 규격 (렌더링 순서 테이블)
```json
{
  "action_frame": "stand1_0",
  "z_order": [
    "back_lower",
    "back_torso",
    "body_base",
    "front_lower",
    "front_torso",
    "front_arm"
  ]
}
```

### 3.5 `design_lock.json` 규격 (디자인 고정 계약)
```json
{
  "design_id": "afternoon_picnic",
  "palette": {
    "primary": ["#F2A7B8", "#D96F8C"],
    "outline": ["#3A2430"],
    "shadow": ["#9B4C63"],
    "forbidden": ["#FFD3B6"]
  },
  "shape_rules": {
    "sleeve_length": "short",
    "skirt_length": "above_knee",
    "hem_style": "soft_frill",
    "decor_anchor": "front_chest_ribbon"
  },
  "tolerance": {
    "max_palette_delta": 8,
    "max_silhouette_delta_px": 3
  }
}
```

### 3.6 `anchor_registry.json` 규격 (앵커 담당 그룹)
```json
{
  "anchors": {
    "front_stand_anchor": {
      "file": "data/external_ai_drafts/afternoon_picnic/stand1_master.png",
      "required_for_groups": ["G1"],
      "required": true
    },
    "front_motion_anchor": {
      "file": null,
      "required_for_groups": ["G2", "G3"],
      "required": false
    },
    "high_deform_anchor": {
      "file": null,
      "required_for_groups": ["G4", "G5", "G7"],
      "required": false
    },
    "back_clothing_anchor": {
      "file": null,
      "required_for_groups": ["G6"],
      "required": false
    }
  }
}
```

### 3.7 `msw_slot_contract.json` 규격 (MSW 장착 슬롯 계약)
```json
{
  "avatar_item_category": "longcoat",
  "equip_property": "CostumeManagerComponent.CustomLongcoatEquip",
  "slot_occupancy": ["coat", "pants"],
  "exclusive_with": ["CustomCoatEquip", "CustomPantsEquip"],
  "ruid_policy": {
    "equip_value": "plain_avatar_item_ruid_only",
    "thumbnail_value": "thumbnail://<RUID>",
    "ruid": null
  }
}
```

### 3.8 `action_frame_contract.json` 규격 (124프레임 액션 계약)
```json
{
  "frames": [
    {
      "action_frame": "stand1_0",
      "action": "stand1",
      "frame_index": 0,
      "group": "G1",
      "propagation_mode": "dxdy",
      "anchor": "front_stand_anchor"
    },
    {
      "action_frame": "swingO1_0",
      "action": "swingO1",
      "frame_index": 0,
      "group": "G4",
      "propagation_mode": "group_anchor_or_inpaint",
      "anchor": "high_deform_anchor"
    }
  ]
}
```

---

## 4. 자동 QA 보고서 스키마 (QA Report Schema)

자동 QA 도구에 의해 매 프레임 빌드 마다 5대 어서션 필터가 작동하여 `qa_report.json` 파일을 자동 생성합니다.

```json
{
  "build_id": "build_2026_06_02_afternoon_picnic",
  "timestamp": "2026-06-02T19:20:00Z",
  "overall_pass_rate": 92.7,
  "total_frames": 124,
  "passed_frames": 115,
  "failed_frames": 9,
  "failed_frame_details": [
    {
      "action_frame": "swingO1_0",
      "failed_layer": "front_arm",
      "failure_code": "ERR_BODY_CONTAMINATION",
      "measured_value": {
        "skin_pixel_count": 12,
        "allowed_threshold": 0
      },
      "retry_flag": true
    },
    {
      "action_frame": "prone_0",
      "failed_layer": "front_lower",
      "failure_code": "ERR_POSITION_JITTER",
      "measured_value": {
        "axis_deviation": 4.5,
        "allowed_threshold": 3.0
      },
      "retry_flag": true
    }
  ],
  "extended_checks": {
    "design_lock_check": "pass",
    "anchor_similarity_check": "pass",
    "slot_contract_check": "pass",
    "thumbnail_policy_check": "pass"
  },
  "failure_groups": {
    "coordinate": ["ERR_POSITION_JITTER"],
    "mask": ["ERR_LAYER_OVERLAP", "ERR_BODY_CONTAMINATION"],
    "anchor": ["ERR_NEEDS_GROUP_ANCHOR", "ERR_BACK_ANCHOR_MISSING"],
    "msw_slot": ["ERR_EQUIP_SLOT_CONFLICT", "ERR_THUMBNAIL_IN_EQUIP_SLOT"]
  }
}
```

확장 QA는 기존 5대 항목을 대체하지 않고 추가로 실행합니다. 실패 프레임은 좌표 문제, 마스크 문제, 앵커 부족, MSW 슬롯 규칙 문제로 나눠 기록합니다.

---

## 5. 파이프라인 운영 정책 (Pipeline Policies)

### 5.1 인적 역할 정책 (Human Role Policy)
> [!IMPORTANT]
> **“사람은 픽셀을 직접 수정하지 않고, 결과 이미지를 보고 PASS/FAIL만 판단한다.”**
> * 사용자는 도트 픽셀을 드로잉 툴로 개별 수정하는 수작업에 일절 개입하지 않습니다.
> * 사람의 역할은 빌드 완성 리포트 및 시각적 애니메이션 프리뷰를 모니터링하여 **통과(PASS) 또는 실패(FAIL) 여부를 결정**하고, 파이프라인의 **동작 감도 매개변수를 제어**하는 관리 감독의 기능으로 엄격히 축소합니다.

### 5.2 실패 레이어 자동 재처리 정책 (Failed Layer Retry Policy)
QA 단계에서 실패(FAIL) 플래그를 받아 `retry_flag: true`로 기록된 프레임/레이어 세트는 다음과 같은 완전 자동화 루프를 통해 재정형화 처리를 시도합니다.

1. **좌표 재계산 (Coordinate Recalculation)**
   - 위치 흔들림(`ERR_POSITION_JITTER`) 오작동 시, 인접 모션 프레임의 오프셋 가중치와 frames.json의 변위 델타 값을 활용해 오프셋 리깅 좌표를 재추정 및 재보정합니다.
2. **마스크 재분해 (Mask Re-Separation)**
   - 레이어 겹침 오차(`ERR_LAYER_OVERLAP`) 발생 시, 참고 샘플의 차집합 보정 마스크 범위를 Dilation/Erosion 픽셀 필터를 통해 수축/팽창 조정하여 2차 분해를 정교하게 재시도합니다.
3. **레이어별 ComfyUI 부분 인페인팅 (Pinpoint Inpainting)**
   - 뼈대 파손이나 형태 왜곡 시, 해당 프레임의 좌표 프로파일 박스 범위만 마스크로 뚫어 ComfyUI API를 원격 호출합니다. LoRA 가중치와 ControlNet 포즈 구속 계수를 자동 조절하여 오직 해당 레이어 단독으로 인페인팅 생성을 수행합니다.
4. **자동 QA 재검사 (Automated QA Re-Evaluation)**
   - 복구 연산이 완료된 픽셀 데이터는 다시 4차 자동 QA의 5대 필터 라인에 투입되어 무결성을 검증받습니다. 합격 시 `retry_flag`는 소거되고 PASS 목록으로 마이그레이션됩니다.

같은 프레임/레이어에 대한 자동 재시도는 최대 2회로 제한합니다. 2회 이후에도 실패하면 단순 재생성 문제가 아니라 앵커 부족, 슬롯 계약 충돌, 또는 디자인 고정 규칙 위반으로 분류합니다.

### 5.3 완성본 샘플 전용 LoRA 사용 정책 (Reference Sample LoRA Policy)
* **목적**: LoRA는 기존 MSW 완성본 의상의 도트 질감, 외곽선, 명암 단계, 픽셀 스타일을 학습하여 STEP 10의 실패 레이어 국소 인페인팅 품질을 안정화하기 위한 선택적 보조 장치입니다.
* **LoRA가 담당하는 영역 (In Scope)**:
  - 메월풍 도트 질감 유지
  - 검은 외곽선 두께 안정화
  - 명암 단계와 색상 번짐 최소화
  - 프릴, 소매, 치마 하단, 후면 레이어의 픽셀 표현 방식 보정
  - 실패 레이어 재생성 시 기존 완성본 샘플과 어울리는 스타일 유지
* **LoRA가 담당하지 않는 영역 (Out of Scope)**:
  - 바디 좌표 정렬
  - 레이어 분리
  - front anchor를 back anchor로 자동 변환
  - ladder / rope 후면 구조 생성
  - clothing_mask / preserve_mask 문제 해결
  - 바디 오염 방지
  - 124프레임 전체 생성
* **운영 원칙 (Operational Principles)**:
  - LoRA는 구조 해결 장치가 아니라 스타일 안정화 장치로만 사용합니다.
  - STEP 10의 failed layer pinpoint inpainting 단계에서만 선택적으로 사용합니다.
  - 124프레임 전체를 LoRA + ComfyUI로 일괄 생성하지 않습니다.
  - LoRA 결과도 반드시 자동 QA를 통과해야 합니다.

### 5.4 일관성 극복 전략 (Consistency Control Policy)
* **핵심 원칙**: AI는 전체 124프레임을 한 번에 생성하지 않습니다. 기준 앵커와 디자인 고정 파일을 먼저 만들고, 자동 전파 후 실패한 레이어만 보정합니다.
* **앵커 우선순위**:
  - `front_stand_anchor`: 기본 전면 실루엣과 팔레트 기준.
  - `front_motion_anchor`: 걷기, 점프, 앉기처럼 중간 변형이 있는 전면 동작 기준.
  - `high_deform_anchor`: 공격, 엎드림, 휘두르기처럼 팔/치마 변형이 큰 동작 기준.
  - `back_clothing_anchor`: ladder / rope 등 후면 동작 기준.
* **디자인 고정**:
  - 모든 보정 결과는 `design_lock.json`의 팔레트, 외곽선, 장식 위치, 실루엣 허용치를 통과해야 합니다.
  - 보기에는 예쁘더라도 기준 팔레트나 슬롯 계약을 벗어나면 실패로 처리합니다.
* **반복 실패 처리**:
  - 같은 실패가 반복되면 ComfyUI 재생성을 계속 돌리지 않습니다.
  - `ERR_NEEDS_GROUP_ANCHOR` 또는 `ERR_BACK_ANCHOR_MISSING`으로 분류하고, 새 앵커가 필요하다는 상태를 보고합니다.
