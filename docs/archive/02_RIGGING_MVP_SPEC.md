# 매크로 파츠 리깅 MVP 명세

## MVP란?

MVP는 Minimum Viable Product의 약자다.

여기서는 “처음 만들 최소 기능 버전”이라는 뜻으로 사용한다.

이 문서는 첫 번째 버전에서 어디까지 만들지 정리한다.

---

## MVP 목표

첫 번째 버전의 목표는 다음이다.

```text
torso / sleeve / lower / back 파츠 이미지를 업로드하고,
현재 선택된 바디 프레임 위에 겹쳐보고,
위치와 크기를 숫자로 조절할 수 있게 만든다.
```

아직 실제 AI 생성은 연결하지 않는다.

---

## 기본 파츠

초기 버전에서는 파츠를 4개만 사용한다.

| 파츠 이름 | 설명 | 필수 여부 |
|---|---|---|
| torso | 몸통 의상 | 필수 |
| sleeve | 소매 | 필수 |
| lower | 하의, 치마, 코트 하단 | 선택 |
| back | 망토, 등 장식, 후면 장식 | 선택 |

---

## 기존 앱 레이어 역할과의 연결

현재 앱에는 이미 샘플 레이어를 분류하는 역할값이 있다.

새로 추가할 매크로 파츠는 기존 레이어 역할과 최대한 맞춰서 사용한다.

| 새 파츠 이름 | UI 표시 이름 | 기존 앱 역할 | 관련 레이어 예시 |
|---|---|---|---|
| torso | 몸통 | torso | mailChest, pantsOverShoesBelowMailChest |
| sleeve | 소매 | outfitArm | mailArm, mailArmOverHair, mailArmBelowHead |
| lower | 하의/하단 | lowerSupport | pantsBelowShoes, pants, shoes, backPants |
| back | 후면 장식 | backTorso | backMailChest, backMailChestOverPants, backMail |

주의:

- 사용자에게는 쉬운 이름인 몸통, 소매, 하의, 후면 장식으로 보여준다.
- 코드에서는 기존 역할과 헷갈리지 않도록 주석을 충분히 달아준다.
- 초기 MVP에서는 왼팔 / 오른팔을 나누지 않는다.

---

## 파츠 설명

### torso

몸통에 입히는 의상이다.

예:

- 셔츠
- 재킷
- 갑옷 상의
- 코트 상단
- 로브 상단

---

### sleeve

팔과 소매에 해당하는 파츠다.

초기 버전에서는 왼쪽 소매 / 오른쪽 소매를 분리하지 않는다.

하나의 sleeve 이미지를 사용한다.

나중에 필요하면 다음처럼 확장할 수 있다.

```text
leftSleeve
rightSleeve
frontSleeve
backSleeve
```

하지만 MVP에서는 하지 않는다.

---

### lower

하의 또는 코트 하단에 해당한다.

예:

- 바지
- 치마
- 로브 하단
- 코트 자락
- 신발 일부

---

### back

몸 뒤쪽에 표시되는 장식이다.

예:

- 망토
- 등 장식
- 긴 머플러 뒤쪽
- 후면 로브 장식

back은 body template보다 뒤에 표시될 수 있다.

---

## 표시 순서

MVP에서는 단순한 표시 순서로 시작한다.

```text
1. back
2. body template
3. lower
4. torso
5. sleeve
```

이 순서는 완벽한 메이플 레이어 순서가 아니라, 처음 테스트하기 위한 단순한 순서다.

나중에는 기존 앱의 레이어 순서와 샘플 레이어 정보를 참고해서  
액션별 표시 순서를 따로 둘 수 있다.

예:

- walk 계열
- ladder / rope 계열
- attack 계열

---

## 조절값

각 파츠는 다음 조절값을 가진다.

| 값 | 설명 |
|---|---|
| offsetX | 좌우 이동 |
| offsetY | 위아래 이동 |
| scale | 크기 조절 |
| expandPixels | 빈틈 보정 |

---

## offsetX

좌우 위치를 조절한다.

예:

```text
offsetX = 1
```

이면 오른쪽으로 1px 이동한다.

```text
offsetX = -1
```

이면 왼쪽으로 1px 이동한다.

---

## offsetY

위아래 위치를 조절한다.

예:

```text
offsetY = 1
```

이면 아래로 1px 이동한다.

```text
offsetY = -1
```

이면 위로 1px 이동한다.

---

## scale

이미지 크기를 조절한다.

예:

```text
scale = 1
```

이면 원래 크기다.

```text
scale = 1.05
```

이면 5% 커진다.

```text
scale = 0.95
```

이면 5% 작아진다.

초기 버전에서는 회전은 하지 않는다.

---

## expandPixels

살 비침이나 빈틈을 줄이기 위한 값이다.

예:

```text
expandPixels = 1
```

이면 파츠가 덮는 영역을 1px 정도 더 넓게 보는 방식으로 사용할 수 있다.

초기 버전에서는 실제 이미지 확장 처리를 완벽하게 하지 않아도 된다.

먼저 데이터 구조와 UI만 만든다.

---

## 조절값 적용 범위

조절값은 3단계로 적용한다.

| 범위 | 설명 |
|---|---|
| global | 모든 프레임에 적용 |
| action | 특정 액션에만 적용 |
| frame | 특정 프레임에만 적용 |

---

## 우선순위

조절값은 아래 순서로 덮어쓴다.

```text
global < action < frame
```

예:

```text
global torso offsetY = 0
walk1 action torso offsetY = -1
walk1_2 frame torso offsetY = -2
```

현재 프레임이 `walk1_2`라면 최종 offsetY는 `-2`가 된다.

현재 프레임이 `walk1_0`이라면 최종 offsetY는 `-1`이 된다.

현재 프레임이 `stand1_0`이라면 최종 offsetY는 `0`이 된다.

---

## 조절값 예시

```json
{
  "global": {
    "torso": {
      "offsetX": 0,
      "offsetY": 0,
      "scale": 1,
      "expandPixels": 0
    },
    "sleeve": {
      "offsetX": 0,
      "offsetY": 0,
      "scale": 1,
      "expandPixels": 0
    }
  },
  "actions": {
    "walk1": {
      "sleeve": {
        "offsetX": 1,
        "offsetY": -1,
        "scale": 1,
        "expandPixels": 1
      }
    }
  },
  "frames": {
    "walk1_2": {
      "torso": {
        "offsetX": 0,
        "offsetY": -2,
        "scale": 1,
        "expandPixels": 0
      }
    }
  }
}
```

---

## MVP에서 만들 기능

### 1. 파츠 업로드

사용자는 다음 파츠 이미지를 업로드할 수 있다.

- torso
- sleeve
- lower
- back

업로드한 이미지는 미리보기로 보여준다.

---

### 2. 현재 프레임 합성 미리보기

현재 선택된 body template 프레임 위에 파츠를 겹쳐 보여준다.

처음에는 단순히 이미지를 겹치는 방식으로 구현한다.

마스크, 뼈대, 자동 변형은 하지 않는다.

---

### 3. 미세 조절

사용자는 각 파츠의 위치와 크기를 조절할 수 있다.

조절 항목:

- 좌우 이동
- 위아래 이동
- 크기
- 빈틈 보정

---

### 4. 적용 범위 선택

사용자는 조절값을 어디에 적용할지 선택할 수 있다.

- 전체 프레임
- 현재 액션
- 현재 프레임

---

### 5. 살 비침 경고 MVP

처음 버전에서는 간단한 경고만 만든다.

예:

- 필수 파츠가 업로드되지 않음
- 파츠 이미지가 너무 작음
- 현재 프레임에서 파츠가 거의 보이지 않음

완벽한 이미지 분석은 나중에 한다.

---

### 6. ZIP 내보내기

기존 export 기능을 유지한다.

추가로 다음 정보를 ZIP에 포함한다.

```text
rigging_config.json
parts/torso.png
parts/sleeve.png
parts/lower.png
parts/back.png
```

초기 버전에서는 124프레임 합성 PNG를 모두 export하지 않아도 된다.

먼저 설정과 원본 파츠를 저장하는 것이 목표다.

---

## MVP에서 하지 않을 기능

첫 번째 버전에서는 다음을 하지 않는다.

- 실제 AI API 연결
- OpenAI API 연결
- ComfyUI 연결
- RunPod 연결
- 124프레임 전체 자동 합성 PNG export
- 완전 자동 파츠 분해
- 왼팔 / 오른팔 분리
- 복잡한 마스크
- 뼈대 기반 리깅
- PSD 생성
- MSW에 직접 업로드

---

## 나중에 추가할 수 있는 기능

### 1. AI 파츠 생성

사용자가 의상 설명을 입력하면 AI가 다음 파츠를 생성한다.

- torso
- sleeve
- lower
- back

---

### 2. 액션별 표시 순서

rope, ladder, attack 동작에서는 파츠 표시 순서가 달라질 수 있다.

나중에는 액션별 z-order를 설정할 수 있다.

예:

```json
{
  "ladder": ["back", "torso", "body", "sleeve", "lower"],
  "walk1": ["back", "body", "torso", "lower", "sleeve"]
}
```

---

### 3. 자동 살 비침 검사

body template의 피부색 영역과 의상 파츠 영역을 비교해서  
살이 보일 가능성이 높은 프레임을 자동으로 찾는다.

---

### 4. 124프레임 합성 export

현재 파츠와 조절값을 모든 프레임에 적용해서  
최종 PNG 124장을 export한다.

---

### 5. 샘플 기반 리깅

완성본 샘플 의상의 움직임을 분석해서  
새 의상 파츠에 적용한다.

---

## 성공 기준

MVP가 성공했다고 판단하는 기준은 다음이다.

- 파츠 4종 업로드 가능
- 현재 프레임 위에 파츠 표시 가능
- offsetX / offsetY / scale 조절 가능
- global / action / frame 조절값 구분 가능
- 기존 앱 기능이 깨지지 않음
- ZIP에 리깅 설정 저장 가능
- 초보자가 UI를 보고 이해할 수 있음

---

## 가장 중요한 문장

이 MVP의 목표는 완벽한 자동 생성이 아니다.

목표는 다음이다.

```text
같은 의상 파츠를 여러 프레임에 재사용하고,
숫자 조절로 어긋남을 줄이는 기본 구조를 만드는 것.
```