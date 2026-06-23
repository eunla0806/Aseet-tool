# STEP 7 Reference Profile

STEP 7 실행 직전 체크리스트 문서입니다.

상위 기준은 `docs/STEP_PLAN.md`를 따릅니다.
역할 분담 상세는 `docs/reference/tool-boundaries.md`를 참조합니다.

## 목적

- STEP 6-B 산출물을 읽어 reference profile 5종과 contract 4종을 만든다.
- STEP 8~12가 바로 사용할 수 있는 기준 메타데이터를 고정한다.

## 입력물 체크리스트

- `src/data/frames.json` 존재
- `data/body template/*.png` 존재
- 샘플별 `v001/normalized_layers/` 존재
- 샘플별 `v001/masks/` 존재
- 샘플별 `v001/sample_info.json` 존재
- 샘플별 `v001/sample_normalization_report.json` 존재
- `sample_info.json` 안 `layer_map` 채워짐
- `normalized_layers/` 안 실제 PNG 존재
- `masks/` 안 실제 PNG 존재
- intentional empty 레이어와 missing 레이어가 구분 가능함

## STEP 7 출력물 9종

### profile 5종

- `outputs/reference_profiles/layer_fit_profile.json`
- `outputs/reference_profiles/layer_mask_profile.json`
- `outputs/reference_profiles/z_order_profile.json`
- `outputs/reference_profiles/sample_profile_report.json`
- `outputs/reference_profiles/body_offset_profile.json`

### contract 4종

- `data/msw/contracts/design_lock.json`
- `data/msw/contracts/anchor_registry.json`
- `data/msw/contracts/msw_slot_contract.json`
- `data/msw/contracts/action_frame_contract.json`

## 권장 생성 순서

1. 입력 샘플 존재 여부 검사
2. `sample_info.json` / `sample_normalization_report.json` 파싱
3. `layer_fit_profile.json` 생성
4. `layer_mask_profile.json` 생성
5. `z_order_profile.json` 생성
6. `sample_profile_report.json` 생성
7. `data/body template/*.png` 기준 `body_offset_profile.json` 생성
8. `design_lock.json` 생성
9. `anchor_registry.json` 생성
10. `msw_slot_contract.json` 생성
11. `action_frame_contract.json` 생성
12. 최종 존재 여부 재검사

## 출력물별 최소 포함 항목

### `layer_fit_profile.json`

- frame key
- part group
- `bbox`
- `center`
- `waist_y`
- `hem_y`

### `layer_mask_profile.json`

- frame key
- part group
- alpha pixel count
- `bbox`
- `intentional_empty`
- 필요 시 `inactive_by_view`

### `z_order_profile.json`

- action or frame key
- front/back layer order
- overlap 판단 기준

### `sample_profile_report.json`

- sample id
- 처리 성공 여부
- missing layer 요약
- intentional empty 요약
- warning 목록

### `body_offset_profile.json`

- frame key
- `dx`
- `dy`
- `bbox`
- `center`

### contract 4종 공통

- version or source marker
- 생성 기준 sample 정보
- STEP 8~13에서 읽을 핵심 키

## 완료 판정 기준

- 출력물 9종이 모두 실제 파일로 존재함
- profile 5종이 비어 있지 않음
- contract 4종이 비어 있지 않음
- `body_offset_profile.json`에 `stand1_0` 기준값 포함
- `sample_profile_report.json`에 intentional empty와 missing이 구분 기록됨
- `msw_slot_contract.json`에 `coat / pants / longcoat` 분기 기준이 있음
- `action_frame_contract.json`에 frame key와 group 연결이 있음

## 실패 시 중단 조건

- `frames.json` 없음
- body template PNG 누락
- `normalized_layers/` 또는 `masks/` 폴더 없음
- `sample_info.json` 없음
- `sample_info.json.layer_map` 비어 있음
- 샘플 PNG가 0개
- intentional empty인지 아닌지 구분 불가
- profile 5종 중 하나라도 생성 실패
- contract 4종 중 하나라도 생성 실패
- `body_offset_profile.json` 기준 프레임 `stand1_0` 계산 실패

## 실행 메모

- `sprite-gen`은 이 단계의 주 엔진이 아니라, STEP 8~12 이미지 처리 참고 엔진으로 본다.
- MSW skill은 STEP 7 contract 보강과 STEP 13 규격 검증 가드레일로 사용한다.
- 이 단계에서는 이미지 품질 개선보다 기준 메타데이터 일관성이 더 중요하다.
