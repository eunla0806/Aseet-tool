# CURRENT_CONTEXT

현재 단계: **STEP 5-B 마스터 1장 기준 anchor 완료**

## 현재 상태
- `afternoon_picnic`는 이제 4프레임 동시 기준이 아니라,
  사용자가 직접 고른 **마스터 1장**을 기준 원본으로 사용합니다.
- 실제 사용 입력은
  `data/external_ai_drafts/afternoon_picnic fix/stand1_0 afternoon_picnic.png` 입니다.
- `scripts/build_anchor_from_draft.py`에 `master` 모드를 추가해서,
  원본 PNG의 투명도와 픽셀을 그대로 유지한 채
  `stand1_master_anchor_original`, `stand1_master_anchor`, `stand1_master_anchor_preview`,
  `master_anchor_report.json`까지 생성했습니다.
- 이번 단계에서는 배경 제거, 스킨톤 제거, flood fill, tolerance, morphology,
  고립 픽셀 정리, ComfyUI 실행을 모두 하지 않았습니다.
- 출력은 `outputs/anchor/afternoon_picnic/v003_master/`에 저장되었습니다.

## 다음 작업
- **STEP 5-C**
  - 이 `stand1_master_anchor`를 ComfyUI reference 기준으로 써도 되는지 최종 판단합니다.
  - stand1의 나머지 프레임은 가능하면 **ComfyUI 확장 우선**으로 맞추고,
    정말 어긋나는 부분만 최소 수동 보정하는 방향으로 진행합니다.
