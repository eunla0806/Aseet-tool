# ComfyUI 자동 생성 가이드

이 문서는 `ComfyUI` 화면을 직접 많이 만지지 않고, 로컬에서 `run_generator.bat`만 실행하는 흐름을 정리한 안내입니다.

## 기본 순서

1. `Colab` 런타임을 실행합니다.
2. Colab 안에서 `ComfyUI`를 실행합니다.
3. `ngrok` 새 주소를 발급받습니다.
4. `config.ini`의 `colab_url`을 새 주소로 바꿉니다.
5. 로컬에서 `run_generator.bat`를 실행합니다.

## 운영 원칙

- Colab은 `AI 처리 서버`로만 사용합니다.
- Colab이 끊겼을 때 자동 클릭으로 유지하지 않습니다.
- 자동 클릭으로 제한을 우회하지 않고, 끊기면 다시 켜서 빠르게 복구합니다.

## Colab이 끊겼을 때

Colab은 오래 기다리면 자동으로 끊길 수 있습니다.

이럴 때는 아래 순서로 다시 연결합니다.

1. Colab 런타임을 다시 실행합니다.
2. `ComfyUI`를 다시 실행합니다.
3. `ngrok` 새 주소를 다시 발급받습니다.
4. `config.ini`의 `colab_url`을 새 주소로 다시 바꿉니다.
5. `run_generator.bat`를 다시 실행합니다.

## ERR_NGROK_3200 안내

- `ERR_NGROK_3200`이 보이면 예전 주소를 다시 쓰면 안 됩니다.
- 예전 `ngrok` 주소는 만료됐을 가능성이 큽니다.
- 반드시 새로 발급된 `ngrok` 주소를 `config.ini`에 다시 적어야 합니다.

예시:

```ini
[AI_SETTINGS]
colab_url = https://new-example.ngrok-free.dev
```

## config.ini에서 주로 바꾸는 값

- `colab_url`: 현재 살아 있는 `ngrok` 주소
- `prompt`: 만들고 싶은 의상 설명
- `clothing_name`: 테스트할 의상 이름
- `action_name`: 예: `stand1`

## 실행 파일

- `config.ini`: 주소와 프롬프트를 적는 설정 파일
- `run_generator.py`: 임시 이미지 생성, ComfyUI 전송, 결과 저장
- `run_generator.bat`: 더블클릭 실행용

## 결과 저장 위치

결과물은 항상 로컬 `outputs/` 폴더에 저장됩니다.

그래서 Colab이 중간에 끊겨도, 이미 로컬에 저장된 산출물은 유지됩니다.

현재 STEP 5 기준 예시:

- `outputs/comfy/stand1/Amethyst Gothic/generated`
- `outputs/comfy/stand1/Amethyst Gothic/temp`
- `outputs/comfy/stand1/Amethyst Gothic/step5_test_report.json`

## 한 줄 정리

Colab이 끊기면 억지로 유지하지 말고, `Colab 재실행 -> ComfyUI 재실행 -> 새 ngrok 주소 발급 -> config.ini 수정 -> run_generator.bat 재실행` 순서로 복구하면 됩니다.
