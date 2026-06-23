import React, { useState, useEffect, useRef } from 'react';
import JSZip from 'jszip';
import framesData from './data/frames.json';
import AppHeader from './components/AppHeader';
import FooterNavigation from './components/FooterNavigation';
import MotionControls from './components/MotionControls';
import OutfitPartsPanel from './components/OutfitPartsPanel';
import PreviewStage from './components/PreviewStage';
import StepProgress from './components/StepProgress';
import ToastMessage from './components/ToastMessage';
import {
  BACK_TORSO_LAYER_NAMES,
  LAYER_DISPLAY_NAMES,
  LOWER_SUPPORT_LAYER_NAMES,
  TORSO_LAYER_NAMES,
  getLayerRole,
  hasAnyLayerName,
} from './data/layers';
import {
  SAMPLE_LAYER_ROLE_IDS,
  SAMPLE_PRESETS,
  buildExportReview,
  getActiveFrameSampleWarning,
  getLayerRoleDefinition,
  getSampleDisplayName,
  isBackFacingAction,
  sampleHealthByName,
  samples,
} from './domain/samplePresets';
import {
  DEFAULT_LAYER_VISIBILITY,
  PROJECT_CONFIG_SCHEMA_FILE,
  buildProjectConfig,
  parseProjectConfigForLoad,
  type ProjectConfig,
  type ProjectConfigRaw,
} from './domain/projectConfig';
import {
  applyOffsetDeltaToFrames,
  getFrameNamesForAction,
  isBackLikeFrameName,
} from './domain/frameOffsetGroups';
import {
  getOutfitPartDefinition,
  type OutfitPartImage,
  type OutfitPartType,
} from './rigging/outfitParts';

// Type definitions for Type Safety
interface Frame {
  fileName: string;
  index: number;
  path: string;
}

interface Action {
  name: string;
  displayName: string;
  frames: Frame[];
}

interface FrameCatalog {
  actions: Record<string, Action>;
  totalFrameCount: number;
}

const catalog = framesData as unknown as FrameCatalog;

const getErrorMessage = (error: unknown) => {
  return error instanceof Error ? error.message : '알 수 없는 오류';
};

const getLayerVisibilityKey = (layerName: string) => getLayerRole(layerName).id;

const isLayerVisible = (
  layerName: string,
  layerVisibility: Record<string, boolean>
) => {
  return layerVisibility[getLayerVisibilityKey(layerName)] !== false;
};

const getLayerDisplayName = (layerName: string) => {
  return LAYER_DISPLAY_NAMES[layerName] ?? layerName;
};

const GROUP_MOVE_STEPS = [1, 5] as const;
type GroupMoveStep = typeof GROUP_MOVE_STEPS[number];

function App() {
  // Stepper State
  const [step, setStep] = useState<number>(1);

  // Player / Frame State
  const [activeAction, setActiveAction] = useState<string>('stand1');
  const [activeFrameIdx, setActiveFrameIdx] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [speed, setSpeed] = useState<'slow' | 'normal' | 'fast'>('normal');

  // Canvas View Controls
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [zoom, setZoom] = useState<number>(4);

  // Step 2: Upload & Align States
  const [selectedSample, setSelectedSample] = useState<string>('');
  const [uploadedFront, setUploadedFront] = useState<string | null>(null);
  const [uploadedBack, setUploadedBack] = useState<string | null>(null);
  const [uploadedFrontFileName, setUploadedFrontFileName] = useState<string | null>(null);
  const [uploadedBackFileName, setUploadedBackFileName] = useState<string | null>(null);
  
  const [alignFrontX, setAlignFrontX] = useState<number>(0);
  const [alignFrontY, setAlignFrontY] = useState<number>(0);
  const [alignBackX, setAlignBackX] = useState<number>(0);
  const [alignBackY, setAlignBackY] = useState<number>(0);
  const [alignScale, setAlignScale] = useState<number>(1.0);
  const [outfitPartImages, setOutfitPartImages] = useState<
    Partial<Record<OutfitPartType, OutfitPartImage>>
  >({});
  const [isOutfitPartsCollapsed, setIsOutfitPartsCollapsed] = useState<boolean>(true);

  // Step 3: Nudge & Calibrate State
  // Map of "frameName" (e.g. "stand1_0") to offset { x, y }
  const [offsets, setOffsets] = useState<Record<string, { x: number; y: number }>>({});
  const [groupMoveStep, setGroupMoveStep] = useState<GroupMoveStep>(1);
  
  // Layer visibility toggles (Step 3 accordion)
  const [layerVisibility, setLayerVisibility] = useState<Record<string, boolean>>({});
  const [isSampleCompareCollapsed, setIsSampleCompareCollapsed] = useState<boolean>(true);
  const [sampleCompareEnabled, setSampleCompareEnabled] = useState<boolean>(false);
  const [sampleCompareGuideSample, setSampleCompareGuideSample] = useState<string>('05_멜로디 소녀');
  const [sampleCompareMode, setSampleCompareMode] = useState<'overlay' | 'toggle'>('overlay');
  const [sampleCompareTarget, setSampleCompareTarget] = useState<'candidate' | 'sample'>('candidate');
  const [sampleCompareOpacity, setSampleCompareOpacity] = useState<number>(0.5);

  // Accordion collapsed state
  const [isLayersCollapsed, setIsLayersCollapsed] = useState<boolean>(false);
  const [isCalibCollapsed, setIsCalibCollapsed] = useState<boolean>(false);

  // Step 4: Export State
  const [layerExportName, setLayerExportName] = useState<string>('mailChest');
  const [selectedPsdFile, setSelectedPsdFile] = useState<File | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<number>(0);

  // Drag Overlay state for file drops
  const [isDraggingFrontFile, setIsDraggingFrontFile] = useState<boolean>(false);
  const [isDraggingBackFile, setIsDraggingBackFile] = useState<boolean>(false);

  // Dragging alignment on Canvas (Step 2)
  const [isDraggingCanvas, setIsDraggingCanvas] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const outfitPartImagesRef = useRef<Partial<Record<OutfitPartType, OutfitPartImage>>>({});

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Fetch current action frames
  const currentAction = catalog.actions[activeAction] || catalog.actions['stand1'];
  const framesList = currentAction.frames;
  const currentFrame = framesList[activeFrameIdx] || framesList[0];
  const currentFrameName = currentFrame.fileName.replace('.png', '');
  const currentActionFrameNames = getFrameNamesForAction(catalog, activeAction);
  const selectedSampleHealth = selectedSample ? sampleHealthByName[selectedSample] : null;
  const exportReview = buildExportReview(selectedSample, selectedSampleHealth);
  const activeSampleLayers = selectedSample ? samples[selectedSample]?.[currentFrameName] ?? [] : [];
  const activeFrameSampleWarning = selectedSampleHealth
    ? getActiveFrameSampleWarning(selectedSampleHealth)
    : '';
  const activeLayerGroupSummaries = SAMPLE_LAYER_ROLE_IDS.map((roleId) => {
    const role = getLayerRoleDefinition(roleId);
    const layers = activeSampleLayers.filter((layer) => getLayerRole(layer.name).id === roleId);

    return {
      role,
      count: layers.length,
      names: [...new Set(layers.map((layer) => layer.name))],
    };
  });

  // Display Toast helper
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 2500);
  };

  useEffect(() => {
    outfitPartImagesRef.current = outfitPartImages;
  }, [outfitPartImages]);

  useEffect(() => {
    return () => {
      Object.values(outfitPartImagesRef.current).forEach((part) => {
        if (part?.previewUrl) {
          URL.revokeObjectURL(part.previewUrl);
        }
      });
    };
  }, []);

  // Helper: Checks if active action faces backwards
  const isBackFacing = (actionName: string) => {
    return isBackFacingAction(actionName);
  };

  // Play animation loop
  useEffect(() => {
    if (!isPlaying) return;

    const intervalMap = {
      slow: 350,
      normal: 180,
      fast: 90,
    };

    const timer = setInterval(() => {
      setActiveFrameIdx((prevIdx) => {
        const totalFrames = framesList.length;
        return (prevIdx + 1) % totalFrames;
      });
    }, intervalMap[speed]);

    return () => clearInterval(timer);
  }, [isPlaying, activeAction, speed, framesList.length]);

  // Reset frame index on action change to prevent out of bounds
  const handleActionChange = (actionName: string) => {
    setActiveAction(actionName);
    setActiveFrameIdx(0);
  };

  // Step Keyboard Listener for Arrow Keys Nudging
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore key events if focused on input elements
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'SELECT') {
        return;
      }

      const isBack = isBackFacing(activeAction);
      const frameName = `${activeAction}_${activeFrameIdx}`;

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (step === 2) {
          if (isBack) setAlignBackY((y) => y - 1);
          else setAlignFrontY((y) => y - 1);
        } else if (step === 3) {
          setOffsets((prev) => ({
            ...prev,
            [frameName]: {
              x: prev[frameName]?.x ?? 0,
              y: (prev[frameName]?.y ?? 0) - 1,
            },
          }));
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (step === 2) {
          if (isBack) setAlignBackY((y) => y + 1);
          else setAlignFrontY((y) => y + 1);
        } else if (step === 3) {
          setOffsets((prev) => ({
            ...prev,
            [frameName]: {
              x: prev[frameName]?.x ?? 0,
              y: (prev[frameName]?.y ?? 0) + 1,
            },
          }));
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (step === 2) {
          if (isBack) setAlignBackX((x) => x - 1);
          else setAlignFrontX((x) => x - 1);
        } else if (step === 3) {
          setOffsets((prev) => ({
            ...prev,
            [frameName]: {
              x: (prev[frameName]?.x ?? 0) - 1,
              y: prev[frameName]?.y ?? 0,
            },
          }));
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (step === 2) {
          if (isBack) setAlignBackX((x) => x + 1);
          else setAlignFrontX((x) => x + 1);
        } else if (step === 3) {
          setOffsets((prev) => ({
            ...prev,
            [frameName]: {
              x: (prev[frameName]?.x ?? 0) + 1,
              y: prev[frameName]?.y ?? 0,
            },
          }));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [step, activeAction, activeFrameIdx]);

  // Transitioning Steps
  const handleNextStep = () => {
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      if (!uploadedFront && !selectedSample) {
        showToast('의상을 업로드하거나 아래 샘플 의상을 선택해 주세요.', 'error');
        return;
      }
      
      // Ask user if they want to overwrite existing offsets if they exist
      let shouldOverwrite = true;
      if (Object.keys(offsets).length > 0) {
        shouldOverwrite = window.confirm(
          '이미 프레임별 미세 조정값이 있어요.\n현재 정렬값으로 모든 프레임을 다시 채울까요?\n\n확인: 다시 채우기 / 취소: 기존 조정값 유지'
        );
      }

      if (shouldOverwrite) {
        // Initialize Offsets for all 124 frames from Master Alignments
        const initializedOffsets: Record<string, { x: number; y: number }> = {};
        Object.keys(catalog.actions).forEach((actionName) => {
          const act = catalog.actions[actionName];
          act.frames.forEach((f) => {
            const frameName = f.fileName.replace('.png', '');
            const isBack = isBackFacing(actionName);
            initializedOffsets[frameName] = {
              x: isBack ? alignBackX : alignFrontX,
              y: isBack ? alignBackY : alignFrontY,
            };
          });
        });
        setOffsets(initializedOffsets);
        showToast('124개 프레임에 기본 오프셋을 적용했어요.', 'success');
      } else {
        showToast('기존 프레임 오프셋을 유지한 채 이동합니다.', 'info');
      }
      
      // Initialize Layer visibility
      setLayerVisibility({ ...DEFAULT_LAYER_VISIBILITY });

      setStep(3);
    } else if (step === 3) {
      setStep(4);
    }
  };

  const handlePrevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  // Helper to load image in JSZip
  const loadImageElement = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
      img.src = src;
    });
  };

  const handleSelectPsdFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.psd')) {
      showToast('PSD 파일만 선택할 수 있어요.', 'error');
      e.target.value = '';
      return;
    }

    if (file.name.toLowerCase() === 'long coat.psd') {
      showToast('이 파일은 빈 원본 템플릿일 가능성이 높아요. 옷이 들어간 완성본 PSD를 선택해 주세요.', 'error');
      e.target.value = '';
      return;
    }

    setSelectedPsdFile(file);
    showToast('완성 PSD를 ZIP에 함께 넣을 준비가 되었어요.', 'success');
  };

  const handleClearPsdFile = () => {
    setSelectedPsdFile(null);
    const input = document.getElementById('psd-file-input') as HTMLInputElement | null;
    if (input) input.value = '';
    showToast('선택한 완성 PSD를 지웠어요.', 'info');
  };

  // Export ZIP Function
  const handleExportZip = async () => {
    if (isExporting) return;

    if (!exportReview.canExport) {
      showToast('샘플 데이터를 확인하지 못해 ZIP을 만들 수 없어요.', 'error');
      return;
    }

    if (exportReview.needsConfirm) {
      const shouldContinue = window.confirm(
        `미리보기 ZIP 만들기 전 확인\n\n샘플: ${exportReview.sampleLabel}\n상태: ${exportReview.visualCheckStatus}\n\n이 ZIP은 완성 PSD가 아니라, PSD 생성 전에 미리보기와 작업 정보를 확인하는 파일이에요.\n완성 PSD를 선택하지 않았다면 psd 폴더는 포함되지 않습니다.\n계속 만들까요?`
      );

      if (!shouldContinue) {
        showToast('ZIP 내보내기를 취소했어요.', 'info');
        return;
      }
    }

    setIsExporting(true);
    setExportProgress(0);

    try {
      const zip = new JSZip();
      const pngFolder = zip.folder('png');
      const projectFolder = zip.folder('project');
      const isManualPsdFlow = !!selectedPsdFile;
      const allFramesList: { frameName: string; path: string; actionName: string }[] = [];

      if (isManualPsdFlow) {
        const psdFolder = zip.folder('psd');
        psdFolder?.file(selectedPsdFile.name, selectedPsdFile);
      }

      const projectAssetsFolder = projectFolder?.folder('assets');
      if (uploadedFront) {
        projectAssetsFolder?.file('uploaded_front.png', uploadedFront.split(',')[1], { base64: true });
      }
      if (uploadedBack) {
        projectAssetsFolder?.file('uploaded_back.png', uploadedBack.split(',')[1], { base64: true });
      }

      Object.values(catalog.actions).forEach((action) => {
        action.frames.forEach((f) => {
          allFramesList.push({
            frameName: f.fileName.replace('.png', ''),
            path: f.path,
            actionName: action.name,
          });
        });
      });

      const total = allFramesList.length;
      let completed = 0;

      for (const frameInfo of allFramesList) {
        const { frameName, path: bodyPath, actionName } = frameInfo;
        const isBack = isBackFacing(actionName);
        
        let clothingSrc = isBack ? (uploadedBack || uploadedFront) : uploadedFront;

        // If sample outfit is selected, we export sample clothing layers instead
        if (selectedSample) {
          const sampleLayers = samples[selectedSample]?.[frameName] || [];
          const preferredLayerNames = isBack ? BACK_TORSO_LAYER_NAMES : TORSO_LAYER_NAMES;
          const clothLayer =
            sampleLayers.find((layer) => hasAnyLayerName([layer], preferredLayerNames)) ??
            sampleLayers.find((layer) => hasAnyLayerName([layer], LOWER_SUPPORT_LAYER_NAMES));

          if (clothLayer) {
            clothingSrc = clothLayer.path;
          }
        }

        if (!clothingSrc) {
          completed++;
          setExportProgress(Math.round((completed / total) * 100));
          continue;
        }

        // Load both body (for size mapping) and clothing
        const [bodyImg, clothingImg] = await Promise.all([
          loadImageElement(bodyPath),
          loadImageElement(clothingSrc),
        ]);

        const canvas = document.createElement('canvas');
        canvas.width = bodyImg.naturalWidth;
        canvas.height = bodyImg.naturalHeight;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          ctx.imageSmoothingEnabled = false;

          // Resolve offset
          const offset = offsets[frameName] || { x: 0, y: 0 };
          const dw = clothingImg.naturalWidth * alignScale;
          const dh = clothingImg.naturalHeight * alignScale;

          // Draw custom clothing offset on target dimensions
          ctx.drawImage(clothingImg, offset.x, offset.y, dw, dh);
        }

        const dataUrl = canvas.toDataURL('image/png');
        const base64Data = dataUrl.split(',')[1];

        // Format filename: e.g. L2,R1,C1,mailChest,visible,normal,255.png
        // Back frames map to backMail/backPants or customized export name
        let finalExportName = layerExportName;
        if (isBack) {
          if (layerExportName === 'mailChest') finalExportName = 'backMail';
          else if (layerExportName === 'pants') finalExportName = 'backPants';
          else if (layerExportName === 'pantsBelowShoes') finalExportName = 'backPants';
        }

        const layerFilename = `L2,R1,C1,${finalExportName},visible,normal,255.png`;
        pngFolder?.file(`frames/${frameName}/${layerFilename}`, base64Data, { base64: true });

        completed++;
        setExportProgress(Math.round((completed / total) * 100));
      }

      // Add Project Config Metadata JSON inside ZIP
      const projectConfig: ProjectConfig = buildProjectConfig(
        {
          selectedPsdFileName: selectedPsdFile?.name,
          exportReview,
          activeStep: step,
        },
        {
          alignFrontX,
          alignFrontY,
          alignBackX,
          alignBackY,
          alignScale,
          layerExportName,
          offsets,
          selectedSample,
          layerVisibility,
          uploadedFront,
          uploadedBack,
          uploadedFrontFileName,
          uploadedBackFileName,
        }
      );
      projectFolder?.file('project_config.json', JSON.stringify(projectConfig, null, 2));

      zip.file(
        'README.txt',
        [
          isManualPsdFlow ? 'Dot Asset Tool Result Package' : 'Dot Asset Tool Preview ZIP',
          '',
          '이 ZIP의 역할:',
          '- 앱에서 맞춘 피팅값과 프레임 미리보기 PNG를 확인하는 보조 패키지입니다.',
          '- 브라우저 안에서는 Long coat.psd에 옷 레이어를 직접 넣어 완성 PSD를 만들지 않습니다.',
          '- 완성 PSD는 local script가 project/project_config.json을 읽어 별도로 생성해야 합니다.',
          '',
          isManualPsdFlow
            ? 'psd folder: 사용자가 직접 선택한 완성 PSD가 들어 있습니다.'
            : 'psd folder: 완성 PSD를 선택하지 않았기 때문에 이 미리보기 ZIP에는 포함하지 않습니다.',
          isManualPsdFlow
            ? '- 원본 Long coat.psd가 아니라, 피팅값이 반영된 결과 PSD만 이 폴더에 넣는 것이 목표입니다.'
            : '- 원본 Long coat.psd를 넣으면 옷이 입혀진 결과가 아니므로 포함하지 않는 것이 안전합니다.',
          '',
          'png folder:',
          '- 프레임별 미리보기 PNG를 넣습니다.',
          '- PSD 생성 전 위치와 레이어 결과를 빠르게 비교하는 용도입니다.',
          '',
          'project folder:',
          '- 피팅값 + 검수 상태를 담은 project_config.json을 넣습니다.',
          '- 이 값은 scripts/generate_sample_psd.py의 입력값입니다.',
          `- 스키마 파일은 ${PROJECT_CONFIG_SCHEMA_FILE}을 사용합니다.`,
          '',
          '다음 단계:',
          '- project/project_config.json을 꺼냅니다.',
          '- python scripts/generate_sample_psd.py --config project_config.json 방식으로 완성 PSD를 생성합니다.',
          '- 완성 PSD가 만들어진 뒤에만 최종 ZIP의 psd 폴더에 넣습니다.',
        ].join('\n')
      );

      // Build ZIP
      const content = await zip.generateAsync({ type: 'blob' });
      const downloadUrl = URL.createObjectURL(content);

      const downloadLink = document.createElement('a');
      downloadLink.href = downloadUrl;
      downloadLink.download = isManualPsdFlow
        ? `dot_asset_result_package_${layerExportName}.zip`
        : `dot_asset_preview_package_${layerExportName}.zip`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(downloadUrl);

      showToast(
        isManualPsdFlow
          ? '완성 PSD 포함 ZIP 파일을 내보냈어요.'
          : '미리보기 ZIP 파일을 내보냈어요. 완성 PSD는 아직 포함되지 않았어요.',
        'success'
      );
    } catch (err: unknown) {
      console.error(err);
      showToast('에셋 내보내기 중 오류가 발생했어요: ' + getErrorMessage(err), 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Standalone Save Project JSON Helper
  const handleSaveProjectJson = () => {
    const projectConfig: ProjectConfig = buildProjectConfig(
      {
        selectedPsdFileName: selectedPsdFile?.name,
        exportReview,
        activeStep: step,
      },
      {
        alignFrontX,
        alignFrontY,
        alignBackX,
        alignBackY,
        alignScale,
        layerExportName,
        offsets,
        selectedSample,
        layerVisibility,
        uploadedFront,
        uploadedBack,
        uploadedFrontFileName,
        uploadedBackFileName,
      }
    );

    const blob = new Blob([JSON.stringify(projectConfig, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dot_asset_project_${layerExportName}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast('프로젝트 설정 JSON을 컴퓨터에 저장했어요.', 'success');
  };

  const handleLoadProjectConfig = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const config = JSON.parse(event.target?.result as string) as ProjectConfigRaw;
        const parsed = parseProjectConfigForLoad(config);

        setAlignFrontX(parsed.alignFrontX);
        setAlignFrontY(parsed.alignFrontY);
        setAlignBackX(parsed.alignBackX);
        setAlignBackY(parsed.alignBackY);
        setAlignScale(parsed.alignScale);
        setLayerExportName(parsed.layerExportName);
        setOffsets(parsed.offsets);
        setSelectedSample(parsed.selectedSample);
        setLayerVisibility(parsed.layerVisibility);
        setUploadedFront(null);
        setUploadedBack(null);
        setUploadedFrontFileName(null);
        setUploadedBackFileName(null);
        setStep(3);

        showToast(
          parsed.selectedSample ? `${parsed.selectedSample} 프로젝트를 불러왔어요.` : '프로젝트를 불러왔어요.',
          'success'
        );
        if (parsed.hasUploadedFrontImage || parsed.hasUploadedBackImage) {
          showToast(
            '브라우저 저장 제한 때문에 직접 업로드 이미지는 다시 선택해야 합니다.',
            'info'
          );
        }
      } catch {
        showToast('project_config.json을 읽는 데 실패했어요. 파일이 맞는지 확인해 주세요.', 'error');
      }
    };
    reader.readAsText(file);
  };

  // Drag & Drop File Handlers
  const handleDragOver = (e: React.DragEvent, type: 'front' | 'back') => {
    e.preventDefault();
    if (type === 'front') setIsDraggingFrontFile(true);
    if (type === 'back') setIsDraggingBackFile(true);
  };

  const handleDragLeave = (type: 'front' | 'back') => {
    if (type === 'front') setIsDraggingFrontFile(false);
    if (type === 'back') setIsDraggingBackFile(false);
  };

  const handleDrop = (e: React.DragEvent, type: 'front' | 'back') => {
    e.preventDefault();
    if (type === 'front') setIsDraggingFrontFile(false);
    if (type === 'back') setIsDraggingBackFile(false);

    const file = e.dataTransfer.files?.[0];
    if (file && file.type === 'image/png') {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          if (type === 'front') {
            setUploadedFront(event.target.result as string);
            setUploadedFrontFileName(file.name);
            setSelectedSample(''); // Clear sample when uploading custom
            showToast('정면 의상을 등록했어요.', 'success');
          } else {
            setUploadedBack(event.target.result as string);
            setUploadedBackFileName(file.name);
            setSelectedSample('');
            showToast('후면 의상을 등록했어요.', 'success');
          }
        }
      };
      reader.readAsDataURL(file);
    } else {
      showToast('PNG 이미지만 업로드할 수 있습니다.', 'error');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'front' | 'back') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          if (type === 'front') {
            setUploadedFront(event.target.result as string);
            setUploadedFrontFileName(file.name);
            setSelectedSample('');
            showToast('정면 의상을 등록했어요.', 'success');
          } else {
            setUploadedBack(event.target.result as string);
            setUploadedBackFileName(file.name);
            setSelectedSample('');
            showToast('후면 의상을 등록했어요.', 'success');
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOutfitPartFileChange = (type: OutfitPartType, file: File | null) => {
    if (!file) return;

    if (file.type !== 'image/png') {
      showToast('파츠는 PNG 이미지만 올릴 수 있어요.', 'error');
      return;
    }

    const partDefinition = getOutfitPartDefinition(type);
    if (!partDefinition) {
      showToast('파츠 정보를 찾지 못했어요.', 'error');
      return;
    }

    const previewUrl = URL.createObjectURL(file);

    setOutfitPartImages((prev) => {
      const previousPreviewUrl = prev[type]?.previewUrl;
      if (previousPreviewUrl) {
        URL.revokeObjectURL(previousPreviewUrl);
      }

      return {
        ...prev,
        [type]: {
          ...partDefinition,
          file,
          previewUrl,
        },
      };
    });

    showToast(`${partDefinition.label} 파츠를 등록했어요.`, 'success');
  };

  const handleClearOutfitPart = (type: OutfitPartType) => {
    const partDefinition = getOutfitPartDefinition(type);

    setOutfitPartImages((prev) => {
      const next = { ...prev };
      const previewUrl = next[type]?.previewUrl;
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      delete next[type];
      return next;
    });

    if (partDefinition) {
      showToast(`${partDefinition.label} 파츠를 지웠어요.`, 'info');
    }
  };

  // Mouse drag alignment handlers (Step 2)
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (step !== 2) return;
    setIsDraggingCanvas(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingCanvas || step !== 2) return;

    const dx = Math.round((e.clientX - dragStartRef.current.x) / zoom);
    const dy = Math.round((e.clientY - dragStartRef.current.y) / zoom);

    if (dx !== 0 || dy !== 0) {
      const isBack = isBackFacing(activeAction);
      if (isBack) {
        setAlignBackX((prev) => prev + dx);
        setAlignBackY((prev) => prev + dy);
      } else {
        setAlignFrontX((prev) => prev + dx);
        setAlignFrontY((prev) => prev + dy);
      }
      dragStartRef.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleCanvasMouseUp = () => {
    setIsDraggingCanvas(false);
  };

  // Select Sample Outfit
  const handleSelectSample = (sampleName: string) => {
    const health = sampleHealthByName[sampleName];
    setSelectedSample(sampleName);
    setUploadedFront(null);
    setUploadedBack(null);
    setUploadedFrontFileName(null);
    setUploadedBackFileName(null);
    showToast(
      `${getSampleDisplayName(sampleName)} 선택됨 - ${health.statusLabel}: ${health.shortNote}`,
      health.status === 'ok' ? 'success' : 'info'
    );
  };

  // Reset alignment offsets
  const handleResetAlignment = () => {
    setAlignFrontX(0);
    setAlignFrontY(0);
    setAlignBackX(0);
    setAlignBackY(0);
    setAlignScale(1.0);
    showToast('정렬값을 초기화했어요.', 'info');
  };

  // Copy offsets from master (Step 3)
  const handleResetToMasterOffset = () => {
    const isBack = isBackFacing(activeAction);
    const frameName = `${activeAction}_${activeFrameIdx}`;
    setOffsets((prev) => ({
      ...prev,
      [frameName]: {
        x: isBack ? alignBackX : alignFrontX,
        y: isBack ? alignBackY : alignFrontY,
      },
    }));
    showToast('기본 정렬 위치로 되돌렸어요.', 'info');
  };

  const getFallbackOffsetForFrame = (frameName: string) => {
    const isBackFrame = isBackLikeFrameName(frameName);
    return {
      x: isBackFrame ? alignBackX : alignFrontX,
      y: isBackFrame ? alignBackY : alignFrontY,
    };
  };

  const handleApplyCurrentActionOffsetDelta = (
    deltaX: number,
    deltaY: number,
    directionLabel: string
  ) => {
    if (currentActionFrameNames.length === 0) {
      showToast('현재 동작의 프레임을 찾지 못했어요.', 'error');
      return;
    }

    if (deltaX === 0 && deltaY === 0) {
      showToast('움직일 값을 먼저 넣어 주세요.', 'info');
      return;
    }

    setOffsets((prev) =>
      applyOffsetDeltaToFrames({
        offsets: prev,
        frameNames: currentActionFrameNames,
        deltaX,
        deltaY,
        getFallbackOffset: getFallbackOffsetForFrame,
      })
    );

    const actionLabel = catalog.actions[activeAction]?.displayName ?? activeAction;
    const distance = Math.max(Math.abs(deltaX), Math.abs(deltaY));
    showToast(
      `${actionLabel} ${currentActionFrameNames.length}F 전체를 ${directionLabel} ${distance}px 이동했어요.`,
      'success'
    );
  };

  // Determine which clothing asset to draw
  const isBack = isBackFacing(activeAction);
  const activeClothingSrc = isBack ? (uploadedBack || uploadedFront) : uploadedFront;

  // Resolve current offset for Step 3
  const activeFrameOffset = offsets[currentFrameName] || {
    x: isBack ? alignBackX : alignFrontX,
    y: isBack ? alignBackY : alignFrontY,
  };

  return (
    <div className="app-container">
      <ToastMessage toast={toast} />
      <AppHeader step={step} />
      <StepProgress
        step={step}
        canOpenWorkSteps={!!uploadedFront || !!selectedSample}
        onStepSelect={setStep}
        onBlockedStep={() => showToast('Step 2에서 에셋을 등록해야 합니다.', 'error')}
      />

      {/* Workspace Area */}
      <div className="workspace-grid">
        
        <MotionControls
          actions={catalog.actions}
          activeAction={activeAction}
          speed={speed}
          isPlaying={isPlaying}
          currentFrameName={currentFrameName}
          onSpeedChange={setSpeed}
          onTogglePlay={() => setIsPlaying((prev) => !prev)}
          onPreviousFrame={() => {
            setIsPlaying(false);
            setActiveFrameIdx((prev) => (prev - 1 + framesList.length) % framesList.length);
          }}
          onNextFrame={() => {
            setIsPlaying(false);
            setActiveFrameIdx((prev) => (prev + 1) % framesList.length);
          }}
          onActionChange={handleActionChange}
        />

        <PreviewStage
          actionDisplayName={catalog.actions[activeAction]?.displayName}
          activeAction={activeAction}
          activeFrameIdx={activeFrameIdx}
          framesLength={framesList.length}
          currentFrame={currentFrame}
          currentFrameName={currentFrameName}
          step={step}
          showGrid={showGrid}
          zoom={zoom}
          selectedSample={selectedSample}
          layerVisibility={layerVisibility}
          activeFrameSampleWarning={activeFrameSampleWarning}
          activeClothingSrc={activeClothingSrc}
          activeFrameOffset={activeFrameOffset}
          sampleCompareEnabled={sampleCompareEnabled}
          sampleCompareGuideSample={sampleCompareGuideSample}
          sampleCompareMode={sampleCompareMode}
          sampleCompareTarget={sampleCompareTarget}
          sampleCompareOpacity={sampleCompareOpacity}
          alignFrontX={alignFrontX}
          alignFrontY={alignFrontY}
          alignBackX={alignBackX}
          alignBackY={alignBackY}
          alignScale={alignScale}
          isLayerVisible={isLayerVisible}
          onToggleGrid={() => setShowGrid((prev) => !prev)}
          onZoomChange={setZoom}
          onCanvasMouseDown={handleCanvasMouseDown}
          onCanvasMouseMove={handleCanvasMouseMove}
          onCanvasMouseUp={handleCanvasMouseUp}
        />

        {/* Right Panel: Step Specific Options */}
        <section className="workspace-panel">
          <div className="panel-header">
            <h2>⚙️ {step === 1 ? '프레임 둘러보기' : step === 2 ? '의상 올리기 및 정렬' : step === 3 ? '미세 위치 조절' : '저장 및 내보내기'}</h2>
          </div>

          <div className="panel-content">
            
            {/* Step 1 Options */}
            {step === 1 && (
              <>
                <div className="step-instruction">
                  <strong>프레임 미리보기 단계</strong>
                  <br />
                  MSW 바디의 124개 템플릿 프레임을 확인합니다. 모션별 재생과 프레임 구성을 가볍게 살펴보세요.
                </div>
                <div className="export-card">
                  <span className="export-icon">✓</span>
                  <div className="export-title">바디 프레임 통계</div>
                  <div className="export-details">
                    피팅 결과 ZIP: PNG 미리보기 + project_config.json
                    (실제 PSD 생성은 다음 단계의 local script로 진행해요)
                    
                  </div>
                </div>
              </>
            )}

            {/* Step 2 Options */}
            {step === 2 && (
              <>
                <div className="step-instruction">
                  <strong>의상 등록 및 기본 정렬</strong>
                  <br />
                  기준 프레임 위에 의상을 올리고 위치를 맞춰요. 기본 기준은 stand1_0 프레임입니다.
                </div>

                <OutfitPartsPanel
                  isCollapsed={isOutfitPartsCollapsed}
                  uploadedParts={outfitPartImages}
                  onToggleCollapsed={() => setIsOutfitPartsCollapsed((prev) => !prev)}
                  onFileChange={handleOutfitPartFileChange}
                  onClearPart={handleClearOutfitPart}
                />

                {/* Upload Slots */}
                <div className="speed-label">의상 파일 올리기 (Front / Back)</div>
                
                {/* Front slot */}
                <div
                  className="upload-area"
                  onDragOver={(e) => handleDragOver(e, 'front')}
                  onDragLeave={() => handleDragLeave('front')}
                  onDrop={(e) => handleDrop(e, 'front')}
                  style={{ borderColor: isDraggingFrontFile ? 'var(--pink-primary)' : 'var(--pink-medium)' }}
                  onClick={() => document.getElementById('front-file-input')?.click()}
                >
                  <span className="upload-icon">+</span>
                  <div className="upload-title">정면(Front) 의상 올리기</div>
                  <span className="upload-desc">PNG 파일을 끌어오거나 클릭해 주세요</span>
                  <input
                    type="file"
                    id="front-file-input"
                    accept="image/png"
                    style={{ display: 'none' }}
                    onChange={(e) => handleFileChange(e, 'front')}
                  />
                  {uploadedFront && (
                    <div className="upload-preview-container">
                      <img src={uploadedFront} className="upload-preview" alt="front_prev" />
                      <span className="upload-desc">등록 완료</span>
                    </div>
                  )}
                </div>

                {/* Back slot */}
                <div
                  className="upload-area"
                  onDragOver={(e) => handleDragOver(e, 'back')}
                  onDragLeave={() => handleDragLeave('back')}
                  onDrop={(e) => handleDrop(e, 'back')}
                  style={{ borderColor: isDraggingBackFile ? 'var(--pink-primary)' : 'var(--pink-medium)' }}
                  onClick={() => document.getElementById('back-file-input')?.click()}
                >
                  <span className="upload-icon">+</span>
                  <div className="upload-title">후면(Back) 의상 올리기 (선택)</div>
                  <span className="upload-desc">사다리/로프처럼 뒤를 보는 프레임용이에요</span>
                  <input
                    type="file"
                    id="back-file-input"
                    accept="image/png"
                    style={{ display: 'none' }}
                    onChange={(e) => handleFileChange(e, 'back')}
                  />
                  {uploadedBack && (
                    <div className="upload-preview-container">
                      <img src={uploadedBack} className="upload-preview" alt="back_prev" />
                      <span className="upload-desc">등록 완료</span>
                    </div>
                  )}
                </div>

                {/* Micro control sliders */}
                <div className="speed-label">기본 정렬 및 크기 조절</div>
                <div className="calibration-controls">
                  <div className="control-row">
                    <span className="control-label">X 이동</span>
                    <div className="control-input-group">
                      <input
                        type="range"
                        className="nudge-slider"
                        min="-50"
                        max="50"
                        value={isBackFacing(activeAction) ? alignBackX : alignFrontX}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (isBackFacing(activeAction)) setAlignBackX(val);
                          else setAlignFrontX(val);
                        }}
                      />
                      <input
                        type="number"
                        className="nudge-number"
                        value={isBackFacing(activeAction) ? alignBackX : alignFrontX}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10) || 0;
                          if (isBackFacing(activeAction)) setAlignBackX(val);
                          else setAlignFrontX(val);
                        }}
                      />
                    </div>
                  </div>

                  <div className="control-row">
                    <span className="control-label">Y 이동</span>
                    <div className="control-input-group">
                      <input
                        type="range"
                        className="nudge-slider"
                        min="-50"
                        max="50"
                        value={isBackFacing(activeAction) ? alignBackY : alignFrontY}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (isBackFacing(activeAction)) setAlignBackY(val);
                          else setAlignFrontY(val);
                        }}
                      />
                      <input
                        type="number"
                        className="nudge-number"
                        value={isBackFacing(activeAction) ? alignBackY : alignFrontY}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10) || 0;
                          if (isBackFacing(activeAction)) setAlignBackY(val);
                          else setAlignFrontY(val);
                        }}
                      />
                    </div>
                  </div>

                  <div className="control-row">
                    <span className="control-label">크기 비율</span>
                    <div className="control-input-group">
                      <input
                        type="range"
                        className="nudge-slider"
                        min="0.5"
                        max="2.0"
                        step="0.05"
                        value={alignScale}
                        onChange={(e) => setAlignScale(parseFloat(e.target.value))}
                      />
                      <span className="zoom-value" style={{ minWidth: '40px' }}>{Math.round(alignScale * 100)}%</span>
                    </div>
                  </div>

                  <button className="btn-secondary" onClick={handleResetAlignment}>
                    정렬값 초기화
                  </button>
                </div>

                {/* Try Sample Outfit Option */}
                <div className="sample-section">
                  <div className="speed-label">완성 샘플 의상 입혀보기</div>
                  <div className="sample-grid">
                    {SAMPLE_PRESETS.map((sample) => {
                      const health = sampleHealthByName[sample.name];

                      return (
                        <div
                          key={sample.name}
                          className={`sample-card ${selectedSample === sample.name ? 'active' : ''}`}
                          onClick={() => handleSelectSample(sample.name)}
                        >
                          <span className="sample-icon">{sample.icon}</span>
                          <span className="sample-name">{sample.displayName}</span>
                          <span className={`sample-status-badge ${health.status}`}>
                            {health.statusLabel}
                          </span>
                          <span className="sample-note">{health.shortNote}</span>
                        </div>
                      );
                    })}
                  </div>

                  {selectedSampleHealth && (
                    <div className={`sample-status-panel ${selectedSampleHealth.status}`}>
                      <div className="sample-status-title">
                        {getSampleDisplayName(selectedSample)} 상태: {selectedSampleHealth.statusLabel}
                      </div>
                      <div className="sample-status-detail">{selectedSampleHealth.detail}</div>
                      <div className="sample-status-stats">
                        <span>전체 {selectedSampleHealth.totalFrames}F</span>
                        <span>torso {selectedSampleHealth.torsoFrames}F</span>
                        <span>arm {selectedSampleHealth.armFrames}F</span>
                        <span>후면 torso {selectedSampleHealth.backTorsoFrames}F</span>
                      </div>
                      {selectedSampleHealth.ladderRopeMissingFrames.length > 0 && (
                        <div className="sample-status-warning">
                          ladder/rope {selectedSampleHealth.ladderRopeFrames}F는 눈으로 한 번 확인해 주세요.
                        </div>
                      )}
                    </div>
                  )}
                </div>

              </>
            )}

            {/* Step 3 Options */}
            {step === 3 && (
              <>
                <div className="step-instruction">
                  <strong>프레임별 미세 위치 조절</strong>
                  <br />
                  각 프레임에서 의상을 조금씩 위, 아래, 좌우로 옮겨 보정합니다. 방향키를 누르면 1px씩 움직입니다.
                </div>

                {selectedSample && (
                  <div className="layer-group-summary">
                    {activeLayerGroupSummaries.map(({ role, count, names }) => (
                      <div
                        key={role.id}
                        className={`layer-group-chip ${count > 0 ? 'present' : 'missing'}`}
                        title={names.length > 0 ? names.join(', ') : role.description}
                      >
                        <span>{role.shortLabel}</span>
                        <strong>{count > 0 ? `${count}F` : '0F'}</strong>
                      </div>
                    ))}
                  </div>
                )}

                <div className={`accordion sample-compare-card ${isSampleCompareCollapsed ? 'collapsed' : ''}`}>
                  <div className="accordion-header" onClick={() => setIsSampleCompareCollapsed(!isSampleCompareCollapsed)}>
                    <div className="accordion-header-title">
                      <span>샘플과 비교하기</span>
                    </div>
                    <span className="accordion-icon">{isSampleCompareCollapsed ? '＋' : '−'}</span>
                  </div>
                  <div className="accordion-content">
                    <div className="sample-compare-content">
                      <div className="sample-compare-summary">
                        완성본 샘플을 가이드로 겹쳐 보며 후보 의상 위치를 확인해요. 비교 후 아래 방향 패드로 바로 고칠 수 있습니다.
                      </div>

                      <label className="sample-compare-toggle">
                        <input
                          type="checkbox"
                          checked={sampleCompareEnabled}
                          onChange={(e) => setSampleCompareEnabled(e.target.checked)}
                        />
                        <span>비교 모드 켜기</span>
                      </label>

                      <div className="sample-compare-field">
                        <span>기준 샘플</span>
                        <select
                          value={sampleCompareGuideSample}
                          onChange={(e) => setSampleCompareGuideSample(e.target.value)}
                        >
                          {SAMPLE_PRESETS.map((sample) => (
                            <option key={sample.name} value={sample.name}>
                              {sample.displayName}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="sample-compare-field">
                        <span>보기 방식</span>
                        <div className="compare-mode-buttons">
                          <button
                            type="button"
                            className={sampleCompareMode === 'overlay' ? 'active' : ''}
                            onClick={() => setSampleCompareMode('overlay')}
                          >
                            겹쳐보기
                          </button>
                          <button
                            type="button"
                            className={sampleCompareMode === 'toggle' ? 'active' : ''}
                            onClick={() => setSampleCompareMode('toggle')}
                          >
                            번갈아보기
                          </button>
                        </div>
                      </div>

                      {sampleCompareMode === 'overlay' ? (
                        <div className="sample-compare-field">
                          <span>가이드 진하기</span>
                          <div className="control-input-group">
                            <input
                              type="range"
                              className="nudge-slider"
                              min="0.2"
                              max="0.85"
                              step="0.05"
                              value={sampleCompareOpacity}
                              onChange={(e) => setSampleCompareOpacity(parseFloat(e.target.value))}
                            />
                            <span className="zoom-value">{Math.round(sampleCompareOpacity * 100)}%</span>
                          </div>
                        </div>
                      ) : (
                        <div className="compare-mode-buttons full">
                          <button
                            type="button"
                            className={sampleCompareTarget === 'candidate' ? 'active' : ''}
                            onClick={() => setSampleCompareTarget('candidate')}
                          >
                            내 후보 의상
                          </button>
                          <button
                            type="button"
                            className={sampleCompareTarget === 'sample' ? 'active' : ''}
                            onClick={() => setSampleCompareTarget('sample')}
                          >
                            완성본 샘플
                          </button>
                        </div>
                      )}

                      <div className="sample-compare-note">
                        후보 PSD: input/work-in-progress/long_coat_stand1_v01_20260524.psd
                      </div>

                      <div className="candidate-layer-map">
                        <div><strong>out_fit</strong><span>몸통 후보</span></div>
                        <div><strong>arm_left</strong><span>왼팔 후보</span></div>
                        <div><strong>arm_right</strong><span>오른팔 후보</span></div>
                        <div><strong>crose back</strong><span>뒤쪽 후보</span></div>
                      </div>

                      <div className="motion-draft-note">
                        대표 프레임 초안은 stand1 / walk1 / jump부터 작게 만들고, 결과는 output/motion-draft에 나눠 저장하는 흐름으로 준비합니다.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="group-adjust-card">
                  <div className="group-adjust-header">
                    <div>
                      <strong>현재 동작 한꺼번에 이동</strong>
                      <p>선택한 동작의 모든 장면을 같은 방향으로 움직여요. 이미 맞춰둔 장면별 차이는 그대로 유지됩니다.</p>
                    </div>
                    <span>{currentActionFrameNames.length}F</span>
                  </div>

                  <div className="group-adjust-target">
                    적용 대상: {catalog.actions[activeAction]?.displayName ?? '현재 동작'} 전체 {currentActionFrameNames.length}장
                  </div>

                  <div className="group-move-step-control">
                    <span>이동 크기</span>
                    <div className="group-move-segments" role="group" aria-label="이동 크기 선택">
                      {GROUP_MOVE_STEPS.map((stepSize) => (
                        <button
                          key={stepSize}
                          className={`group-move-segment ${groupMoveStep === stepSize ? 'active' : ''}`}
                          type="button"
                          onClick={() => setGroupMoveStep(stepSize)}
                        >
                          {stepSize}px {stepSize === 1 ? '살짝' : '크게'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="direction-pad" aria-label="현재 동작 방향 이동">
                    <span className="direction-pad-spacer" aria-hidden="true" />
                    <button
                      className="direction-pad-button"
                      type="button"
                      onClick={() => handleApplyCurrentActionOffsetDelta(0, -groupMoveStep, '위로')}
                    >
                      <span>▲</span>
                      위로
                    </button>
                    <span className="direction-pad-spacer" aria-hidden="true" />

                    <button
                      className="direction-pad-button"
                      type="button"
                      onClick={() => handleApplyCurrentActionOffsetDelta(-groupMoveStep, 0, '왼쪽으로')}
                    >
                      <span>◀</span>
                      왼쪽
                    </button>
                    <div className="direction-pad-center" aria-label={`현재 이동 크기 ${groupMoveStep}px`}>
                      <strong>{groupMoveStep}px</strong>
                      <span>{groupMoveStep === 1 ? '살짝' : '크게'}</span>
                    </div>
                    <button
                      className="direction-pad-button"
                      type="button"
                      onClick={() => handleApplyCurrentActionOffsetDelta(groupMoveStep, 0, '오른쪽으로')}
                    >
                      오른쪽
                      <span>▶</span>
                    </button>

                    <span className="direction-pad-spacer" aria-hidden="true" />
                    <button
                      className="direction-pad-button"
                      type="button"
                      onClick={() => handleApplyCurrentActionOffsetDelta(0, groupMoveStep, '아래로')}
                    >
                      <span>▼</span>
                      아래로
                    </button>
                    <span className="direction-pad-spacer" aria-hidden="true" />
                  </div>
                </div>

                {/* Calibration Box */}
                <div className={`accordion ${isCalibCollapsed ? 'collapsed' : ''}`}>
                  <div className="accordion-header" onClick={() => setIsCalibCollapsed(!isCalibCollapsed)}>
                    <div className="accordion-header-title">
                      <span>Frame Controls ({currentFrameName})</span>
                    </div>
                    <span className="accordion-icon">{isCalibCollapsed ? '＋' : '−'}</span>
                  </div>
                  <div className="accordion-content">
                    <div className="calibration-controls">
                      <div className="control-row">
                         <span className="control-label">X Offset</span>
                        <div className="control-input-group">
                          <input
                            type="range"
                            className="nudge-slider"
                            min="-30"
                            max="30"
                            value={activeFrameOffset.x}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              setOffsets((prev) => ({
                                ...prev,
                                [currentFrameName]: {
                                  x: val,
                                  y: prev[currentFrameName]?.y ?? (isBack ? alignBackY : alignFrontY),
                                },
                              }));
                            }}
                          />
                          <div className="nudge-buttons">
                            <button
                              className="nudge-btn"
                              onClick={() =>
                                setOffsets((prev) => ({
                                  ...prev,
                                  [currentFrameName]: {
                                    x: (prev[currentFrameName]?.x ?? (isBack ? alignBackX : alignFrontX)) - 1,
                                    y: prev[currentFrameName]?.y ?? (isBack ? alignBackY : alignFrontY),
                                  },
                                }))
                              }
                            >
                              -1
                            </button>
                            <span className="nudge-number">{activeFrameOffset.x}</span>
                            <button
                              className="nudge-btn"
                              onClick={() =>
                                setOffsets((prev) => ({
                                  ...prev,
                                  [currentFrameName]: {
                                    x: (prev[currentFrameName]?.x ?? (isBack ? alignBackX : alignFrontX)) + 1,
                                    y: prev[currentFrameName]?.y ?? (isBack ? alignBackY : alignFrontY),
                                  },
                                }))
                              }
                            >
                              +1
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="control-row">
                       <span className="control-label">Y Offset</span>
                        <div className="control-input-group">
                          <input
                            type="range"
                            className="nudge-slider"
                            min="-30"
                            max="30"
                            value={activeFrameOffset.y}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              setOffsets((prev) => ({
                                ...prev,
                                [currentFrameName]: {
                                  x: prev[currentFrameName]?.x ?? (isBack ? alignBackX : alignFrontX),
                                  y: val,
                                },
                              }));
                            }}
                          />
                          <div className="nudge-buttons">
                            <button
                              className="nudge-btn"
                              onClick={() =>
                                setOffsets((prev) => ({
                                  ...prev,
                                  [currentFrameName]: {
                                    x: prev[currentFrameName]?.x ?? (isBack ? alignBackX : alignFrontX),
                                    y: (prev[currentFrameName]?.y ?? (isBack ? alignBackY : alignFrontY)) - 1,
                                  },
                                }))
                              }
                            >
                              -1
                            </button>
                            <span className="nudge-number">{activeFrameOffset.y}</span>
                            <button
                              className="nudge-btn"
                              onClick={() =>
                                setOffsets((prev) => ({
                                  ...prev,
                                  [currentFrameName]: {
                                    x: prev[currentFrameName]?.x ?? (isBack ? alignBackX : alignFrontX),
                                    y: (prev[currentFrameName]?.y ?? (isBack ? alignBackY : alignFrontY)) + 1,
                                  },
                                }))
                              }
                            >
                              +1
                            </button>
                          </div>
                        </div>
                      </div>

                      <button className="btn-secondary" onClick={handleResetToMasterOffset}>
                        기본 위치로 복원
                      </button>
                    </div>
                  </div>
                </div>

                {/* Layer Stacking Z-Index Accordion */}
                <div className={`accordion ${isLayersCollapsed ? 'collapsed' : ''}`}>
                  <div className="accordion-header" onClick={() => setIsLayersCollapsed(!isLayersCollapsed)}>
                    <div className="accordion-header-title">
                       <span>레이어 순서와 표시 ({selectedSample ? '샘플' : '업로드'})</span>
                    </div>
                    <span className="accordion-icon">{isLayersCollapsed ? '＋' : '−'}</span>
                  </div>
                  <div className="accordion-content">
                    <div className="layer-list">
                      {/* Custom Uploaded Layer listing */}
                      {!selectedSample && (
                        <>
                          <div className="layer-item">
                            <div className="layer-info">
                              <span>L1</span>
                              <span>기본 바디 템플릿 (Base)</span>
                            </div>
                            <button
                              className={`layer-visibility ${layerVisibility['body'] ? 'visible' : ''}`}
                              onClick={() => setLayerVisibility((prev) => ({ ...prev, body: !prev.body }))}
                            >
                              {layerVisibility['body'] ? '숨기기' : '보이기'}
                            </button>
                          </div>

                          <div className="layer-item active">
                            <div className="layer-info">
                              <span>L2</span>
                              <span>사용자 의상 ({layerExportName})</span>
                            </div>
                            <button
                              className={`layer-visibility ${layerVisibility['torso'] !== false ? 'visible' : ''}`}
                              onClick={() => setLayerVisibility((prev) => ({ ...prev, torso: prev.torso === false }))}
                            >
                              {layerVisibility['torso'] !== false ? '숨기기' : '보이기'}
                            </button>
                          </div>
                        </>
                      )}

                      {/* Sample Outfit Layer Stacking from samples.json */}
                      {selectedSample && samples[selectedSample]?.[currentFrameName]?.map((layer) => {
                        const role = getLayerRole(layer.name);
                        const roleKey = role.id;
                        const isClothGroup = role.id !== 'character';

                        const isVisible = layerVisibility[roleKey] !== false;

                        const toggleVisibility = () => {
                          setLayerVisibility((prev) => ({ ...prev, [roleKey]: prev[roleKey] === false }));
                        };

                        return (
                          <div
                            key={layer.originalFilename}
                            className={`layer-item ${isClothGroup ? 'active' : ''} role-${role.id}`}
                          >
                            <div className="layer-info">
                              <span>L{layer.index}</span>
                              <span>{getLayerDisplayName(layer.name)} · {role.shortLabel}</span>
                            </div>
                              <button
                                className={`layer-visibility ${isVisible ? 'visible' : ''}`}
                              onClick={toggleVisibility}
                            >
                                {isVisible ? '숨기기' : '보이기'}
                              </button>
                            </div>
                          );
                      })}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Step 4 Options */}
            {step === 4 && (
              <>
                <div className="step-instruction export-ready-note">
                  <strong>PSD 생성 준비</strong>
                  <br />
                  현재 브라우저에서는 Long coat.psd에 옷을 직접 넣을 수 없어요. 먼저 피팅값과 미리보기 PNG를 정리하고, 완성 PSD는 로컬 스크립트로 만듭니다.
                </div>

                <div className={`final-check-panel ${exportReview.status}`}>
                  <div className="final-check-header">
                    <span>준비 상태</span>
                    <strong>{exportReview.visualCheckStatus}</strong>
                  </div>

                  <div className="final-check-grid">
                    <div>
                      <span>선택 샘플</span>
                      <strong>{exportReview.sampleLabel}</strong>
                    </div>
                    <div>
                      <span>확인 상태</span>
                      <strong>{exportReview.statusLabel}</strong>
                    </div>
                  </div>

                  <div className="final-check-note">{exportReview.detail}</div>

                  {exportReview.stats && (
                    <details className="export-details-toggle">
                      <summary>자세한 프레임 정보</summary>
                      <div className="final-check-stats">
                        <span>전체 {exportReview.stats.totalFrames}F</span>
                        <span>torso {exportReview.stats.torsoFrames}F</span>
                        <span>arm {exportReview.stats.armFrames}F</span>
                        <span>후면 torso {exportReview.stats.backTorsoFrames}F</span>
                      </div>
                    </details>
                  )}
                </div>

                <div className="export-card export-card-primary">
                  <span className="export-icon">ZIP</span>
                  <div className="export-title">미리보기 ZIP 받기</div>
                  <div className="export-details">
                    이 ZIP은 완성 PSD가 아니라 검수용 보조 파일입니다.
                    png 폴더에는 미리보기 이미지가, project 폴더에는 project_config.json이 들어갑니다.
                    완성 PSD는 다음 단계에서 local script로 따로 생성합니다.
                  </div>

                  <div className={`psd-file-picker ${selectedPsdFile ? 'ready' : ''}`}>
                    <div className="psd-file-picker-header">
                      <span>완성 PSD 직접 넣기</span>
                      <strong>{selectedPsdFile ? '선택 완료' : '선택 안 함'}</strong>
                    </div>
                    <div className="psd-file-name">
                      {selectedPsdFile
                        ? selectedPsdFile.name
                        : '선택 사항입니다. 원본 Long coat.psd가 아니라, 피팅값이 반영된 결과 PSD만 선택해 주세요.'}
                    </div>
                    <div className="psd-file-actions">
                      <button
                        className="btn-secondary"
                        onClick={() => document.getElementById('psd-file-input')?.click()}
                      >
                        완성 PSD 선택
                      </button>
                      {selectedPsdFile && (
                        <button className="btn-secondary" onClick={handleClearPsdFile}>
                          선택 해제
                        </button>
                      )}
                    </div>
                    <input
                      type="file"
                      id="psd-file-input"
                      accept=".psd,image/vnd.adobe.photoshop,application/octet-stream"
                      style={{ display: 'none' }}
                      onChange={handleSelectPsdFile}
                    />
                  </div>

                  {isExporting ? (
                    <div style={{ width: '100%', textAlign: 'center' }}>
                      <div className="speed-label">압축 패키지 생성 중 {exportProgress}%</div>
                      <div
                        style={{
                          height: '8px',
                          background: 'var(--border-color)',
                          borderRadius: '4px',
                          overflow: 'hidden',
                          marginTop: '6px',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${exportProgress}%`,
                            background: 'var(--pink-primary)',
                            transition: 'width 0.1s ease',
                          }}
                        ></div>
                      </div>
                    </div>
                  ) : (
                    <button
                      className="export-btn"
                      onClick={handleExportZip}
                       disabled={!exportReview.canExport || (!uploadedFront && !selectedSample)}
                    >
                      미리보기 ZIP 받기
                    </button>
                  )}
                </div>

                <div className="export-actions-panel">
                  <div className="speed-label">작업 이어하기</div>
                  <div className="export-action-row">
                    <button className="btn-secondary" onClick={handleSaveProjectJson}>
                      피팅값 저장하기
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => document.getElementById('project-file-input')?.click()}
                    >
                      저장한 작업 불러오기
                    </button>
                  </div>
                  <input
                    type="file"
                    id="project-file-input"
                    accept="application/json"
                    style={{ display: 'none' }}
                    onChange={handleLoadProjectConfig}
                  />
                </div>

                <details className="advanced-export-settings">
                  <summary>PNG 이름 자세히 설정</summary>
                  <select
                    className="nudge-number"
                    value={layerExportName}
                    onChange={(e) => setLayerExportName(e.target.value)}
                  >
                    <option value="mailChest">mailChest (상의/한벌옷)</option>
                    <option value="pantsBelowShoes">pantsBelowShoes (하의 뒤)</option>
                    <option value="pants">pants (하의)</option>
                    <option value="shoes">shoes (신발)</option>
                    <option value="mailArm">mailArm (소매/의상 팔)</option>
                    <option value="mailArmOverHair">mailArmOverHair (소매 헤어 위)</option>
                    <option value="handOverHair">handOverHair (손 헤어 위)</option>
                  </select>
                </details>
              </>
            )}
          </div>
        </section>
      </div>

      <FooterNavigation
        step={step}
        onPrevStep={handlePrevStep}
        onNextStep={handleNextStep}
      />
    </div>
  );
}

export default App;
