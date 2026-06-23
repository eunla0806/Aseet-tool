# 🧸 Dot Asset Tool: ComfyUI 첫 앵커 의상 인페인팅 테스트 가이드 (STEP 5)

본 문서는 Google Colab ComfyUI 기동 성공 이후, **생성된 가로 그리드 스트립 이미지들과 스마트 마스크를 사용하여 실제 메이플스토리 도트 의상을 인페인팅(Inpainting)하는 최초 검증 테스트 가이드**입니다.

---

## 📅 1단계: 테스트에 필요한 4가지 핵심 파일 준비

ComfyUI 웹 브라우저 화면에 직접 드래그 앤 드롭하거나 업로드하기 위해 아래 파일들이 컴퓨터 로컬에 잘 받아져 있는지 확인하세요.

| 파일 역할 | 실제 파일 경로 (로컬 파일 링크) | 상세 설명 |
| :--- | :--- | :--- |
| **① 기본 바디 스트립** | [pure_stand1.png](file:///e:/Aseet%20tool/data/grid/pure_grids/base/pure_stand1.png) | 서 있는 동작(stand1) 4프레임의 순수 가로 스트립 바디 |
| **② 의상 영역 마스크** | [pure_stand1_clothing_mask.png](file:///e:/Aseet%20tool/data/grid/pure_grids/masks/clothing_mask/pure_stand1_clothing_mask.png) | AI가 옷을 덮어 그릴 범위를 넓힌 전용 마스크 시트 |
| **③ 피부/얼굴 보존 마스크** | [pure_stand1_preserve_mask.png](file:///e:/Aseet%20tool/data/grid/pure_grids/masks/preserve_mask/pure_stand1_preserve_mask.png) | 피부색 스마트 검출 필터로 완벽 격리된 얼굴 보존 마스크 |
| **④ ComfyUI 워크플로우** | [msw_dot_workflow.json](file:///e:/Aseet%20tool/data/grid/pure_grids/msw_dot_workflow.json) | 노드 배치 및 IP-Adapter 등이 사전에 조립된 워크플로우 파일 |

---

## 🎨 2단계: ComfyUI 화면에 노드 배치 불러오기

1. 켜져 있는 **ComfyUI 웹 브라우저 창**을 엽니다.
2. 컴퓨터 폴더 내에 저장된 **[msw_dot_workflow.json](file:///e:/Aseet%20tool/data/grid/pure_grids/msw_dot_workflow.json)** 파일을 마우스로 클릭한 채, 웹 브라우저 빈 화면 아무 곳에나 **드래그 앤 드롭(Drag & Drop)**으로 끌어다 놓습니다.
3. 순간적으로 복잡한 메이플 도트 전용 AI 인페인팅 워크플로우가 완벽하게 화면에 자동 로드됩니다.

---

## ✍️ 3단계: 이미지 업로드 및 프롬프트 작성

불러온 화면 상에서 다음 4가지 핵심 설정을 조작합니다.

1. **[Load Image (Base)]** 노드:
   - `Choose file to upload` 버튼을 누르고 로컬의 `pure_stand1.png`를 업로드합니다.
2. **[Load Mask (Clothing)]** 노드:
   - `Choose file to upload` 버튼을 누르고 로컬의 `pure_stand1_clothing_mask.png`를 업로드합니다.
3. **[Load Mask (Preserve)]** 노드:
   - `Choose file to upload` 버튼을 누르고 로컬의 `pure_stand1_preserve_mask.png`를 업로드합니다.
4. **[CLIP Text Encode (Prompt)]** (긍정 프롬프트 상자):
   - 만들고 싶은 의상의 스타일과 컬러를 영어로 상세히 묘사하여 적어줍니다.
   - *추천 캡션 예시:* `lovely shopper pink dress, maple style chibi dot, cute ribbon sleeve, high quality pixel art`
5. **[CLIP Text Encode (Negative Prompt)]** (부정 프롬프트 상자):
   - 뭉개짐이나 도트 비율 파괴를 막기 위해 제외하고 싶은 단어들을 지정합니다.
   - *추천 제외 예시:* `bad quality, blurry, photo, realistic, 3d, gradient background, antialiasing`

---

## ⚡ 4단계: 대망의 첫 인페인팅 실행!

1. ComfyUI 웹 브라우저 우측에 있는 플로팅 컨트롤 메뉴 바에서 **[Queue Prompt]** 버튼을 누릅니다.
2. 약 3초 ~ 5초 뒤, 우측 끝에 위치한 **[Save Image (Result)]** 노드 상에 결과물이 렌더링되어 나타납니다!
3. **[검수 포인트]**:
   - 얼굴 눈코입 및 홍조, 피부 부분이 뭉개지거나 색상이 변하지 않고 완벽히 보존되었는지 확인합니다.
   - 4프레임의 서 있는 애니메이션 동작 위로 입력한 프롬프트(예: 핑크 원피스 등) 의상이 픽셀 튀김이나 튀는 현상 없이 균일한 스타일로 잘 배치되었는지 확인합니다.

---

> [!TIP]
> **첫 결과물의 도트 스타일이 너무 튀거나 의상이 제대로 묘사되지 않을 때 조치법**
> - **[KSampler]** 노드의 **`denoise`** 수치를 미세 조절합니다. (보통 0.5 ~ 0.7 사이가 이상적이며, 숫자가 낮을수록 원본을 더 많이 유지하고, 높을수록 AI가 더 화려한 디자인을 새롭게 묘사합니다.)
> - 프롬프트 맨 앞에 `maple style pixel art, ` 또는 `chibi clothing, ` 키워드를 강하게 넣어보세요!
