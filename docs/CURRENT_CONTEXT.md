# 현재 컨텍스트 (CURRENT_CONTEXT)

## 현재까지 한 일
- `STEP_PLAN.md`의 Prerequisites 정리 및 STEP 6 진입 조건 명확화.
- `hoi_poi_tshirt_denim_skirt` 및 `pink_tanktop_tennis_skirt` 레퍼런스 샘플 압축 해제 및 `sample_info.json` 레이어 매핑 구조화 (STEP 6-A 완료).
- `normalize_layer_split_samples.py` 스크립트를 구현하여 원본 레이어들을 `normalized_layers/` 및 `masks/`로 분리 및 0/255 이진 마스크 추출 (STEP 6-B 완료).
- 각 샘플별 처리 결과를 담은 `sample_normalization_report.json` 생성 완료.

## 다음에 할 일
- 추출 결과 중 `ok_with_missing_layers` 상태가 많이 발생하는 부분 분석: 필수 코어 레이어와 선택적 레이어 기준 점검.
- STEP 6-B의 산출물 안정성을 최종 확인한 후, 다음 단계인 **STEP 7 (reference profile 자동 추출 및 생성)** 로 진입합니다.
- 최종적으로 MSW avatar item 등록 규격(coat + pants / longcoat)에 맞춰 파이프라인 후반부 정합성 확인.
