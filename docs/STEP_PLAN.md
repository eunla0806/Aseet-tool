# STEP_PLAN

최상위 기준 문서입니다.

## 문서 역할

- `STEP_PLAN.md` = 전체 방향, 단계 목적, 현재 위치 기준
- `CURRENT_CONTEXT.md` = 현재 상태만 짧게 기록
- `WORK_LOG.md` = 상세 작업 로그
- `reference/tool-boundaries.md` = `sprite-gen` / MSW skill 역할 분담 상세
- `specs/` = 세부 규격과 실행 체크리스트
- `archive/` = 구버전 문서

## 프로젝트 목표

이 프로젝트의 목표는 일반 sprite 생성이 아니라, MSW avatar item 등록 전 단계까지 이어지는 준비물 파이프라인을 안정적으로 만드는 것입니다.

핵심 흐름은 아래 3줄로 요약합니다.

1. 기준 디자인을 고정한다.
2. 그 기준을 124프레임 구조로 확장한다.
3. 최종 결과를 MSW 규격 검증이 가능한 형태로 정리한다.

## 역할 분담 요약

- `sprite-gen`은 STEP 8~12 이미지 처리, 조립, 검수 참고 엔진으로 본다.
- MSW skill은 STEP 7 계약 보강과 STEP 13 규격 검증 가드레일로 본다.
- 자세한 설명은 `reference/tool-boundaries.md`를 참조한다.

## 13단계 마스터 플랜

| Step | 단계 목적 | 핵심 산출물 | 현재 상태 | 다음 연결 |
| --- | --- | --- | --- | --- |
| STEP 1 | 템플릿 프레임 구조 확인 | `src/data/frames.json` 기준 정리 | 완료 | STEP 2 |
| STEP 2 | 의상 데이터 상태 점검 | `outputs/outfit_dataset_report.json` | 완료 | STEP 3 |
| STEP 3 | 124프레임을 그룹 단위로 나누기 | `docs/specs/FRAME_GROUP_PLAN.md` | 완료 | STEP 4 |
| STEP 4 | 인페인트용 마스크와 순수 바디 입력 만들기 | `clothing_mask`, `preserve_mask`, pure grids | 완료 | STEP 5 |
| STEP 5 | master anchor와 진단 흐름 확정 | anchor, preview, ComfyUI 진단 산출물 | 완료 | STEP 6 |
| STEP 6-A | reference sample 원본 구조 정리 | `sample_info.json`, extracted refs | 완료 | STEP 6-B |
| STEP 6-B | reference sample을 정규화된 layer/mask로 변환 | `normalized_layers/`, `masks/`, normalization report | 완료 | STEP 7 |
| STEP 7 | reference profile과 contract 생성 | `outputs/reference_profiles/`, `data/msw/contracts/` | 준비 완료 / 실행 전 | STEP 8 |
| STEP 8 | 저변형 프레임 우선 전파 | propagated frame set | 대기 | STEP 9 |
| STEP 9 | 전파 결과를 레이어 단위로 다시 분리 | separated layer outputs | 대기 | STEP 10 |
| STEP 10 | 실패 레이어만 국소 보정 | pinpoint inpainting outputs | 대기 | STEP 11 |
| STEP 11 | 자동 QA로 흔들림과 오염 검출 | QA report, retry flags | 대기 | STEP 12 |
| STEP 12 | 최종 조립과 결과물 정리 | final grids, build report | 대기 | STEP 13 |
| STEP 13 | MSW 등록 준비 패키징 | package folder, manifest, checklist | 대기 | 등록 검증 |

## 현재 위치

- 현재 기준 단계: `STEP 7`
- 직전 완료 단계: `STEP 6-B`
- 현재 핵심 작업: reference profile / contract 생성 준비

## STEP 7이 중요한 이유

- STEP 7은 STEP 8~12가 공통으로 읽는 기준 메타데이터를 만든다.
- 여기서 `bbox`, `mask`, `z-order`, `body offset`, `slot contract`가 정리되지 않으면 뒤 단계는 자동화 품질이 떨어진다.
- 즉, STEP 7은 이미지 생성 단계가 아니라 자동화 기준을 잠그는 단계다.

## 현재 기준 산출물

- profile 출력 위치: `outputs/reference_profiles/`
- contract 출력 위치: `data/msw/contracts/`
- 실행 체크리스트: `docs/specs/step-7-reference-profile.md`

## 진행 원칙

- 한 번에 한 Step만 진행한다.
- 같은 설명을 여러 문서에 반복하지 않는다.
- 장문 실행 가이드는 `specs/`에 두고, 이 문서는 기준과 연결만 관리한다.
- 단계 상태가 바뀌면 `CURRENT_CONTEXT.md`와 `WORK_LOG.md`만 함께 갱신한다.
