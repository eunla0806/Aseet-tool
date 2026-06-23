### 2026-05-29 / Step 2. 매크로 파츠 타입 정의

#### 1. 완료한 Step 번호

Step 2. 매크로 파츠 타입 정의

#### 2. 변경 파일 경로

- `src/rigging/outfitParts.ts`

#### 3. 작업 요약

- `torso / sleeve / lower / back` 매크로 파츠를 코드에서 다룰 수 있도록 기본 타입을 추가했다.
- `OutfitPartType`, `OutfitPartImage` 타입을 정의했다.
- 기본 파츠 목록을 추가하고, 각 파츠의 설명과 필수 여부를 정리했다.
- 기존 화면 파일, 기존 업로드 기능, 기존 샘플 피팅 기능은 수정하지 않았다.
- 이번 Step에서는 UI 연결이나 이미지 합성은 진행하지 않았다.

#### 4. 테스트 결과

- 실행 명령어: `cd "E:\Aseet tool\src"` 후 `npm run build`
- 결과: 빌드 성공
- 문제: 없음
- 다음 Step: Codex Step 3. 파츠 업로드 패널