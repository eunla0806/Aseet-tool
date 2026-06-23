# Tool Boundaries

이 문서는 `sprite-gen` 저장소와 MSW skill의 역할 분담을 한 곳에만 정리하는 기준 문서입니다.

## 기준

- `STEP_PLAN.md`는 전체 단계 기준이다.
- `CURRENT_CONTEXT.md`는 현재 상태만 짧게 적는다.
- `WORK_LOG.md`는 상세 로그만 적는다.
- `specs/`는 세부 규격만 둔다.
- `archive/`는 구버전만 둔다.

## sprite-gen이 잘하는 일

- atlas compose
- frame extraction
- manifest / `frame_layout`
- curation / QA
- final assembly

이 저장소는 일반 sprite 파이프라인을 빠르게 정리할 때 유용하다.
특히 STEP 7~12처럼 프레임을 뽑고, 합치고, 검사하고, 최종 묶음을 만드는 구간에 맞다.

## MSW skill이 잘하는 일

- MSW avatar item 규칙 확인
- costume / slot / animation 연결
- RUID / thumbnail / package 규칙 확인
- MSW 문서와 API 기준 확인
- `msw-avatar`, `msw-search`, `msw-painter`, `msw-ui-system` 같은 작업 보조

이 쪽은 MSW 안에서 실제로 등록하고 연결하는 단계에 맞다.

## 역할 분담 원칙

### sprite-gen을 먼저 볼 때

- 프레임을 자동으로 잘라야 할 때
- atlas를 다시 조립해야 할 때
- QA용 contact sheet가 필요할 때
- 실패한 레이어만 다시 고쳐야 할 때

### MSW skill을 먼저 볼 때

- 슬롯 이름과 등록 규칙이 필요할 때
- avatar item 패키징 방식이 필요할 때
- MSW 내부 규칙이나 문서가 필요할 때
- UI나 스킬 연동을 봐야 할 때

### 같이 볼 때

- sprite-gen으로 만든 결과를 MSW 규칙에 맞게 맞추는 단계
- STEP 7~12에서 산출물 형식과 등록 규칙을 동시에 맞춰야 하는 단계

## 반복 금지

- 이 분담 설명은 다른 문서에 길게 반복하지 않는다.
- 다른 문서에는 이 파일을 참조만 한다.

## 현재 프로젝트에 맞는 해석

- sprite-gen은 STEP 7~12의 그림 처리 도구로 본다.
- MSW skill은 STEP 13과 연결되는 등록/규칙 확인 도구로 본다.
- STEP 7 reference profile은 둘 사이의 연결 규격을 만드는 자리다.
