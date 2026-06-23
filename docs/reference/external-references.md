# External References

이 문서는 현재 프로젝트가 참고하는 외부 레퍼런스를 정리합니다.

기준:

- 최종 규격 판단은 MSW 문서와 MSW 스킬 기준으로 합니다.
- 외부 도구와 외부 저장소는 구현/설계 참고용으로만 사용합니다.
- 역할 분담의 큰 틀은 `tool-boundaries.md`를 따르고, 이 문서는 참고 대상별 채택 범위만 적습니다.

## sprite-gen

- 참고 이유: atlas compose, frame extraction, curation, final assembly 흐름을 참고하기 좋음
- 가져올 요소: frame 분리 방식, atlas 조립 방식, manifest 또는 frame layout 구조, QA/curation 흐름
- 가져오지 않을 요소: 프로젝트 전체 구조, 일반 sprite 생성 목적, MSW 최종 규격 판단
- 연결 단계: STEP 8, STEP 9, STEP 10, STEP 11, STEP 12

## MSW 스킬/문서

- 참고 이유: avatar item 규격, slot 규칙, RUID, 등록 전 검증 기준의 최종 판단 근거
- 가져올 요소: slot 규칙, equip 제약, contract 판단 기준, 등록 검증 가드레일
- 가져오지 않을 요소: 외부 이미지 처리 파이프라인 자체, atlas 생성 도구 역할
- 연결 단계: STEP 7, STEP 13

## Universal LPC

- 참고 이유: 레이어 분리형 캐릭터 의상 구조와 파츠 조합 관점을 참고하기 좋음
- 가져올 요소: 파츠 분리 사고방식, 장비 레이어 조합 방식, 동작별 파츠 유지 관점
- 가져오지 않을 요소: LPC 고유의 인체 비율, LPC 전용 장비 슬롯 체계, LPC 결과물을 그대로 쓰는 방식
- 연결 단계: STEP 6, STEP 7, STEP 9

## Aseprite CLI

- 참고 이유: 픽셀 아트 이미지의 자동 export, frame split, sprite sheet 정리에 적합함
- 가져올 요소: 배치 export 아이디어, frame 단위 분리, sheet 생성 자동화, CLI 기반 반복 작업
- 가져오지 않을 요소: 수작업 보정 전제 워크플로, 사람이 직접 열어서 손보는 운영 방식
- 연결 단계: STEP 8, STEP 9, STEP 12

## Texture Packer 계열

- 참고 이유: atlas packing, metadata output, frame rectangle 관리 방식 참고용
- 가져올 요소: atlas 구성 개념, frame rect 메타데이터, packing 결과를 읽는 구조적 접근
- 가져오지 않을 요소: 최종 MSW 규격 판단, 임의 trimming 전제, 프로젝트 전체 결과물 규격 결정권
- 연결 단계: STEP 8, STEP 12

## Pixelorama

- 참고 이유: 오픈소스 픽셀 편집기 관점에서 layer/frame 관리 아이디어를 참고할 수 있음
- 가져올 요소: layer/frame 조직 방식, preview 관점, 픽셀 작업 QA 화면 아이디어
- 가져오지 않을 요소: 사람 손으로 후작업하는 운영 방식, 수작업 복구를 전제로 한 파이프라인
- 연결 단계: STEP 9, STEP 11

## 운영 메모

- 외부 레퍼런스는 “어떻게 설계하고 자동화할지”를 참고하는 용도입니다.
- 무엇을 최종 허용할지는 MSW 문서와 MSW 스킬 기준으로 판단합니다.
- 수작업 보정/후작업 배제 원칙은 외부 도구 선택보다 상위 원칙으로 유지합니다.
