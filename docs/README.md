# Development Workflow

## Context Files

### CURRENT_CONTEXT.md

현재 진행 상태를 기록한다.

포함 내용:

* 현재 진행 중인 Phase / Step
* 최근 완료된 주요 작업
* 다음 작업
* 현재 우선순위

현재 상태만 유지하며, 작업 이력을 누적하지 않는다.

---

### WORK_LOG.md

모든 작업 이력을 기록한다.

작업 완료 후 반드시 업데이트한다.

규칙:

* 최신 로그를 문서 최상단에 추가한다.
* 날짜와 시간을 반드시 기록한다.
* 기존 로그는 삭제하지 않는다.
* 완료한 작업을 기록한다.
* 생성 파일과 수정 파일을 기록한다.
* 결정사항을 기록한다.
* 발견한 문제는 이슈로 기록한다.
* 다음 작업을 기록한다.

형식:

## YYYY-MM-DD HH:mm

### 완료

### 생성 파일

### 수정 파일

### 결정사항

### 이슈

### 다음 작업

---

## Agent Rules

작업 시작 전:

1. README.md 읽기
2. CURRENT_CONTEXT.md 읽기
3. 현재 Step 확인

작업 완료 후:

1. WORK_LOG.md 업데이트
2. CURRENT_CONTEXT.md 현재 상태 반영
3. 생성 파일 목록 확인

중요:

* 원본 파일 덮어쓰기 금지
* 작업 범위를 임의로 확장하지 않기
* CURRENT_CONTEXT.md와 WORK_LOG.md 내용이 충돌하지 않도록 유지
