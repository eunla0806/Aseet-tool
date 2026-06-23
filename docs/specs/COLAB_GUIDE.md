# 🧸 Dot Asset Tool: Google Colab ComfyUI 실행 가이드 (STEP 5)

본 문서는 **Google Colab(무료/유료 포함) 환경에서 ComfyUI를 단 1분 만에 설치하고 기동하여 최상의 메이플스토리 도트 아바타 의상을 인페인팅하기 위한 원클릭 가이드북**입니다.

아래의 **[1. 통합 실행 스크립트]** 전체 코드를 복사하여 Google Colab 노트북(`Code` 셀)에 붙여넣고 실행하시기만 하면 됩니다.

---

## 1. Google Colab 통합 실행 스크립트 (원클릭 런처)

구글 코랩 노트북에 새 코드 셀을 만들고, 아래의 파이썬 코드를 그대로 붙여넣은 뒤 **[실행 (▶)]** 버튼을 누르세요.

```python
# ==============================================================================
# 🧸 MSW Dot Asset Tool: ComfyUI 원클릭 자동 런처
# ==============================================================================
import os
import subprocess

print("📦 [1/5] ComfyUI 리포지토리 및 필수 커스텀 노드 복제 중...")
if not os.path.exists("ComfyUI"):
    subprocess.run(["git", "clone", "https://github.com/comfyanonymous/ComfyUI"])
    os.chdir("ComfyUI")
    subprocess.run(["git", "clone", "https://github.com/ltdrdata/ComfyUI-Manager", "custom_nodes/ComfyUI-Manager"])
    subprocess.run(["git", "clone", "https://github.com/Fannovel16/comfyui_controlnet_aux", "custom_nodes/comfyui_controlnet_aux"])
else:
    os.chdir("ComfyUI")
    print("-> 이미 ComfyUI 폴더가 존재하여 복제를 건너뜁니다.")

print("\n⚡ [2/5] xformers 및 가속 패키지 라이브러리 설치 중 (약 30초~1분 소요)...")
subprocess.run(["pip", "install", "xformers", "torchvision", "torchaudio", "--quiet"])
subprocess.run(["pip", "install", "-r", "requirements.txt", "--quiet"])

print("\n💾 [3/5] 메이플 도트 최적화용 SD 1.5 모델 및 컨트롤넷 가이드 모델 다운로드 중...")
models = {
    "models/checkpoints/v1-5-pruned-emaonly.safetensors": "https://huggingface.co/runwayml/stable-diffusion-v1-5/resolve/main/v1-5-pruned-emaonly.safetensors",
    "models/checkpoints/Anything-V3.0.safetensors": "https://huggingface.co/Linaqruf/anything-v3.0/resolve/main/Anything-V3.0-pruned.safetensors",
    "models/controlnet/control_v11p_sd15_canny.safetensors": "https://huggingface.co/lllyasviel/ControlNet-v1-1/resolve/main/control_v11p_sd15_canny.safetensors"
}

for path, url in models.items():
    if not os.path.exists(path):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        subprocess.run(["wget", "-q", "-O", path, url])

print("\n🎨 [4/5] 레퍼런스 스타일링용 IP-Adapter 모델 다운로드 중...")
ip_adapters = {
    "models/clip_vision/CLIP-ViT-H-14-laion2B-s32b-b79K.safetensors": "https://huggingface.co/h94/IP-Adapter/resolve/main/models/image_encoder/model.safetensors",
    "models/ipadapter/ip-adapter_sd15.safetensors": "https://huggingface.co/h94/IP-Adapter/resolve/main/models/ip-adapter_sd15.safetensors"
}

for path, url in ip_adapters.items():
    if not os.path.exists(path):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        subprocess.run(["wget", "-q", "-O", path, url])

print("\n🚀 [5/5] ComfyUI 웹 서버 기동 중... (링크가 곧 나타납니다)")
os.system("npm install -g localtunnel")

import threading
import time
import urllib.request

def iframe_thread(port):
  while True:
      time.sleep(0.5)
      try:
          req = urllib.request.Request(f'http://127.0.0.1:{port}/system_stats')
          with urllib.request.urlopen(req) as response:
              break
      except Exception:
          pass
  print('\n========================================================================')
  print('💡 [중요] 아래 출력되는 "your url is: https://..." 링크를 클릭하세요.')
  print('※ 주의: 접속 시 파란색 경고창이 뜨면 [Click to Continue] 버튼을 누르세요.')
  print('========================================================================\n')

threading.Thread(target=iframe_thread, daemon=True, args=(8188,)).start()

os.system("lt --port 8188 & python main.py --dont-print-server")
```

---

## 2. 사용 방법 (30초 요약 가이드)

### 1단계: Colab 서버 기동
* 위의 통합 실행 스크립트를 실행하면 터미널 로그 하단 부근에 **`your url is: https://*.loca.lt`** 형식의 링크 주소가 나타납니다.
* 해당 주소를 클릭하면 비밀번호 세팅 필요 없이 **ComfyUI 웹 브라우저 창이 즉시 원클릭으로 활성화**됩니다.

### 2단계: 안티그래비티 원클릭 워크플로우 로드
* 프로젝트 폴더에 저장되어 있는 [msw_dot_workflow.json](file:///e:/Aseet%20tool/data/grid/pure_grids/msw_dot_workflow.json) 파일을 컴퓨터로 다운로드합니다.
* 웹 브라우저 상에 띄워진 ComfyUI 빈 화면 아무 곳에나 이 `.json` 파일을 **마우스로 드래그 앤 드롭(Drag & Drop)**으로 툭 떨어뜨립니다.
* 복잡한 AI 노드가 기적처럼 완벽하게 화면에 자동 조립됩니다.

### 3단계: 순수 그리드 이미지 업로드 및 생성
* 화면 좌측 상단의 **[Load Image (Base)]** 노드에 `pure_stand1.png` 등의 바디 그리드를 업로드합니다.
* 바로 옆의 **[Load Mask (Clothing)]** 노드에 `pure_stand1_clothing_mask.png` 마스크 그리드를 업로드합니다.
* **[Load Mask (Preserve)]** 노드에 `pure_stand1_preserve_mask.png` 보존 마스크 그리드를 업로드합니다.
* 상단 **[Prompt]** 텍스트 상자에 원하는 의상 프롬프트를 영어로 적습니다.
  - *추천 캡션 예시: `maple style pixel clothing, chibi avatar dress, pink and white color, detailed cute frill sleeve`*
* 우측 사이드바 메뉴의 **[Queue Prompt]** 버튼을 누르면 3~5초 만에 완벽한 1차 앵커 의상이 선명하게 묘사되어 출력됩니다!
