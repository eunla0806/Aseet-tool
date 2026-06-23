# STEP 7 Reference Profile

이 문서는 STEP 7의 뼈대 규격이다.

## 목적

- reference sample에서 profile과 contract를 뽑는다.
- STEP 8~12가 바로 읽을 수 있는 입력 규격으로 만든다.

## 현재 범위

- `layer_fit_profile.json`
- `layer_mask_profile.json`
- `z_order_profile.json`
- `sample_profile_report.json`
- `body_offset_profile.json`
- `data/msw/contracts/*.json`

## 나중에 분리 가능한 부분

- 생성 순서
- 검증 순서
- body offset 계산
- contract writer

## 참고

- 세부 구현은 `STEP_PLAN.md`와 `reference/tool-boundaries.md`를 우선 본다.
