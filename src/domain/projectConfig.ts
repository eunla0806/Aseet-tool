import type { ExportReview } from './samplePresets';

export const PROJECT_CONFIG_SCHEMA_VERSION = '8.18.0';
export const PROJECT_CONFIG_SCHEMA_FILE = 'project-config.schema.json';

const PSD_MANIFEST_STEP = '8.10-fit-to-psd';
const TARGET_TEMPLATE_PATH = 'input/Long coat.psd';
const FRAME_CATALOG_PATH = 'src/data/frames.json';
const SAMPLE_CATALOG_PATH = 'src/data/samples.json';
const FRAME_CELL_SIZE = 250;
const PSD_CANVAS_WIDTH = 2750;
const PSD_CANVAS_HEIGHT = 3500;
const BACK_FRAME_PREFIXES = ['ladder_', 'rope_'];
const LONG_COAT_TARGET_LAYERS: Record<string, string> = {
  mailChest: 'edithere:mail_mailChest_68',
  pantsOverShoesBelowMailChest: 'edithere:mail_mailChest_68',
  backMailChest: 'edithere:mail_backMailChest_103',
  backMail: 'edithere:mail_backMailChest_103',
  backMailChestOverPants: 'edithere:mail_backMailChest_103',
  mailArm: 'edithere:mailArm_mailArm_50',
  mailArmOverHair: 'edithere:mailArm_mailArmOverHair_22',
  mailArmBelowHead: 'edithere:mailArm_mailArmBelowHead_58,61',
  mailArmBelowHeadOverMailChest: 'edithere:mailArm_mailArmBelowHead_58,61',
  mailArmOverHairBelowWeapon: 'edithere:mailArm_mailArmOverHairBelowWeapon_25',
};

type FittingSourceType = 'sample' | 'upload';
type PsdOutputMode = 'local-script' | 'manual-file-select';

interface FittingInput {
  alignFrontX: number;
  alignFrontY: number;
  alignBackX: number;
  alignBackY: number;
  alignScale: number;
  offsets: Record<string, { x: number; y: number }>;
  layerVisibility: Record<string, boolean>;
  selectedSample: string | null;
  hasUploadedFrontImage: boolean;
  hasUploadedBackImage: boolean;
}

interface PsdGenerationInput {
  targetTemplate: string;
  outputPsdPath: string;
  previewPngPath: string;
  generationReportPath: string;
  frameCatalogPath: string;
  sampleCatalogPath: string;
  sourceType: FittingSourceType;
  sourceDisplayName: string | null;
  sourceAssets: {
    sampleKey: string | null;
    sampleDisplayName: string | null;
    uploadedFrontImage: {
      required: boolean;
      originalFileName: string | null;
      projectPath: string | null;
      note: string;
    };
    uploadedBackImage: {
      required: boolean;
      originalFileName: string | null;
      projectPath: string | null;
      note: string;
    };
    uploadAssetRule: string;
  };
  placementInput: {
    frameCellSize: number;
    canvasWidth: number;
    canvasHeight: number;
    backFramePrefixes: string[];
    targetLayers: Record<string, string>;
  };
  outputMode: PsdOutputMode;
  layerExportName: string;
  preferAutoGenerate: boolean;
  generationFlowHint: string;
}

export interface ProjectConfig {
  version: string;
  schemaVersion: string;
  createdAt: string;
  projectConfigSchema?: {
    version: string;
    file: string;
    usage: string;
  };
  source: {
    app: string;
    step: number;
    selectedSample: string;
  };
  fittingInput: FittingInput;
  psdGenerationInput: PsdGenerationInput;
  exportPurpose: string;
  finalOutputTarget: string;
  note: string;
  selectedPsdFile: {
    name: string;
  } | null;
  zipStructure: {
    psd: string;
    png: string;
    project: string;
    readme: string;
  };
  review: {
    selectedSample: string | null;
    sampleLabel: string;
    status: 'ok' | 'warning' | 'blocked';
    statusLabel: string;
    visualCheckStatus: string;
    detail: string;
    stats: {
      totalFrames: number;
      torsoFrames: number;
      armFrames: number;
      backTorsoFrames: number;
      ladderRopeFrames: number;
      ladderRopeMissingCount?: number;
    } | null;
  };
  generatedPsdHint?: {
    source: 'local-script' | 'manual-selection';
    expectedOutput: string;
    status: string;
  };
  // Legacy fields (compatibility)
  alignFrontX: number;
  alignFrontY: number;
  alignBackX: number;
  alignBackY: number;
  alignScale: number;
  layerExportName: string;
  offsets: Record<string, { x: number; y: number }>;
  selectedSample: string;
}

export type ProjectConfigRaw = Partial<
  Omit<ProjectConfig, 'fittingInput' | 'psdGenerationInput' | 'review' | 'generatedPsdHint' | 'zipStructure'>
> & {
  fittingInput?: ProjectConfig['fittingInput'] | Partial<FittingInput> | null;
  psdGenerationInput?: ProjectConfig['psdGenerationInput'] | Partial<PsdGenerationInput> | null;
  review?: Partial<ProjectConfig['review']>;
  generatedPsdHint?: ProjectConfig['generatedPsdHint'];
  zipStructure?: Partial<ProjectConfig['zipStructure']>;
};

export const DEFAULT_LAYER_VISIBILITY: Record<string, boolean> = {
  body: true,
  character: true,
  outfitArm: true,
  torso: true,
  backTorso: true,
  lowerSupport: true,
  other: true,
  head: true,
  arm: true,
  hairShade: true,
};

export interface LoadedProjectState {
  alignFrontX: number;
  alignFrontY: number;
  alignBackX: number;
  alignBackY: number;
  alignScale: number;
  layerExportName: string;
  offsets: Record<string, { x: number; y: number }>;
  selectedSample: string;
  layerVisibility: Record<string, boolean>;
  hasUploadedFrontImage: boolean;
  hasUploadedBackImage: boolean;
}

const getNumberOrDefault = (value: unknown, fallback: number) => {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
};

const getStringOrDefault = (value: unknown, fallback: string) => {
  return typeof value === 'string' && value.trim() ? value : fallback;
};

const getBooleanOrDefault = (value: unknown, fallback: boolean) => {
  return typeof value === 'boolean' ? value : fallback;
};

const getRecordOrDefault = (value: unknown, fallback: Record<string, boolean>) => {
  if (!value || typeof value !== 'object') return fallback;
  const record: Record<string, boolean> = {};
  for (const [key, rawValue] of Object.entries(value)) {
    if (typeof rawValue === 'boolean') {
      record[key] = rawValue;
    }
  }
  return Object.keys(record).length > 0 ? record : fallback;
};

const getOffsetRecordOrDefault = (value: unknown) => {
  if (!value || typeof value !== 'object') {
    return {};
  }

  const parsed: Record<string, { x: number; y: number }> = {};
  for (const [frameName, point] of Object.entries(value)) {
    if (!point || typeof point !== 'object') continue;
    const pointObj = point as { x?: unknown; y?: unknown };
    const x = getNumberOrDefault(pointObj.x, 0);
    const y = getNumberOrDefault(pointObj.y, 0);
    parsed[frameName] = { x, y };
  }
  return parsed;
};

const getLayerVisibilityOrDefault = (value: unknown) => {
  const parsed = getRecordOrDefault(value, DEFAULT_LAYER_VISIBILITY);
  return { ...DEFAULT_LAYER_VISIBILITY, ...parsed };
};

export const parseProjectConfigForLoad = (raw: ProjectConfigRaw): LoadedProjectState => {
  const fitting = raw.fittingInput;
  const alignFrontX = getNumberOrDefault(fitting?.alignFrontX ?? raw.alignFrontX, 0);
  const alignFrontY = getNumberOrDefault(fitting?.alignFrontY ?? raw.alignFrontY, 0);
  const alignBackX = getNumberOrDefault(fitting?.alignBackX ?? raw.alignBackX, 0);
  const alignBackY = getNumberOrDefault(fitting?.alignBackY ?? raw.alignBackY, 0);
  const alignScale = getNumberOrDefault(fitting?.alignScale ?? raw.alignScale, 1.0);
  const offsets = getOffsetRecordOrDefault(fitting?.offsets ?? raw.offsets);
  const rawLayerVisibility = fitting?.layerVisibility ?? (raw as { layerVisibility?: unknown }).layerVisibility;

  const selectedSample = getStringOrDefault(
    fitting?.selectedSample ?? raw.selectedSample ?? raw.source?.selectedSample,
    ''
  );

  return {
    alignFrontX,
    alignFrontY,
    alignBackX,
    alignBackY,
    alignScale,
    layerExportName: getStringOrDefault((raw as { layerExportName?: unknown }).layerExportName, 'mailChest'),
    offsets,
    selectedSample,
    layerVisibility: getLayerVisibilityOrDefault(rawLayerVisibility),
    hasUploadedFrontImage: getBooleanOrDefault(
      fitting?.hasUploadedFrontImage ??
        (raw as { hasUploadedFrontImage?: unknown }).hasUploadedFrontImage,
      false
    ),
    hasUploadedBackImage: getBooleanOrDefault(
      fitting?.hasUploadedBackImage ??
        (raw as { hasUploadedBackImage?: unknown }).hasUploadedBackImage,
      false
    ),
  };
};

interface BuildProjectConfigParams {
  selectedPsdFileName?: string | null;
  exportReview: ExportReview;
  activeStep: number;
}

interface BuildProjectConfigState {
  alignFrontX: number;
  alignFrontY: number;
  alignBackX: number;
  alignBackY: number;
  alignScale: number;
  layerExportName: string;
  offsets: Record<string, { x: number; y: number }>;
  selectedSample: string;
  layerVisibility: Record<string, boolean>;
  uploadedFront: string | null;
  uploadedBack: string | null;
  uploadedFrontFileName?: string | null;
  uploadedBackFileName?: string | null;
}

export const buildProjectConfig = (
  params: BuildProjectConfigParams,
  state: BuildProjectConfigState,
): ProjectConfig => {
  const selectedSource: FittingSourceType = state.selectedSample ? 'sample' : 'upload';
  const outputStem =
    selectedSource === 'sample'
      ? `long_coat_sample_${toSafeOutputSlug(state.selectedSample, 'sample')}`
      : 'long_coat_upload_auto';
  const outputPsdPath = `output/${PSD_MANIFEST_STEP}/${outputStem}.psd`;
  const previewPngPath = `output/${PSD_MANIFEST_STEP}/${outputStem}_preview.png`;
  const generationReportPath = `output/${PSD_MANIFEST_STEP}/${outputStem}_report.txt`;
  const sourceDisplayName =
    selectedSource === 'sample'
      ? state.selectedSample || null
      : state.uploadedFront
        ? 'uploaded-front-image'
        : state.uploadedBack
          ? 'uploaded-back-image'
          : null;
  const isManualPsdFlow = !!params.selectedPsdFileName;

  return {
    version: '1.0.0',
    schemaVersion: PROJECT_CONFIG_SCHEMA_VERSION,
    createdAt: new Date().toISOString(),
    projectConfigSchema: {
      version: PROJECT_CONFIG_SCHEMA_VERSION,
      file: PROJECT_CONFIG_SCHEMA_FILE,
      usage: `python scripts/generate_sample_psd.py --config project_config.json --output ${outputPsdPath}`,
    },
    source: {
      app: 'Dot Asset Tool',
      step: params.activeStep,
      selectedSample: state.selectedSample,
    },
    fittingInput: {
      alignFrontX: state.alignFrontX,
      alignFrontY: state.alignFrontY,
      alignBackX: state.alignBackX,
      alignBackY: state.alignBackY,
      alignScale: state.alignScale,
      offsets: state.offsets,
      layerVisibility: state.layerVisibility,
      selectedSample: state.selectedSample || null,
      hasUploadedFrontImage: !!state.uploadedFront,
      hasUploadedBackImage: !!state.uploadedBack,
    },
    psdGenerationInput: {
      targetTemplate: TARGET_TEMPLATE_PATH,
      outputPsdPath,
      previewPngPath,
      generationReportPath,
      frameCatalogPath: FRAME_CATALOG_PATH,
      sampleCatalogPath: SAMPLE_CATALOG_PATH,
      sourceType: selectedSource,
      sourceDisplayName,
      sourceAssets: {
        sampleKey: selectedSource === 'sample' ? state.selectedSample || null : null,
        sampleDisplayName: selectedSource === 'sample' ? sourceDisplayName : null,
        uploadedFrontImage: {
          required: selectedSource === 'upload',
          originalFileName: state.uploadedFrontFileName ?? null,
          projectPath: state.uploadedFront ? 'project/assets/uploaded_front.png' : null,
          note: state.uploadedFront
            ? 'ZIP으로 내보낼 때 project/assets/uploaded_front.png에 함께 저장됩니다.'
            : '샘플 모드에서는 정면 업로드 PNG가 필요하지 않습니다.',
        },
        uploadedBackImage: {
          required: selectedSource === 'upload',
          originalFileName: state.uploadedBackFileName ?? null,
          projectPath: state.uploadedBack ? 'project/assets/uploaded_back.png' : null,
          note: state.uploadedBack
            ? 'ZIP으로 내보낼 때 project/assets/uploaded_back.png에 함께 저장됩니다.'
            : '후면 PNG가 없으면 정면 PNG를 후면에도 임시로 사용합니다.',
        },
        uploadAssetRule:
          '사용자 업로드 PNG는 브라우저 보안 때문에 원래 PC 경로를 저장하지 않습니다. ZIP 안의 project/assets 파일을 로컬 PSD 도우미가 읽습니다.',
      },
      placementInput: {
        frameCellSize: FRAME_CELL_SIZE,
        canvasWidth: PSD_CANVAS_WIDTH,
        canvasHeight: PSD_CANVAS_HEIGHT,
        backFramePrefixes: BACK_FRAME_PREFIXES,
        targetLayers: LONG_COAT_TARGET_LAYERS,
      },
      outputMode: isManualPsdFlow ? 'manual-file-select' : 'local-script',
      layerExportName: state.layerExportName,
      preferAutoGenerate: !isManualPsdFlow,
      generationFlowHint: isManualPsdFlow
        ? '보조 흐름: 사용자가 이미 생성한 완성 PSD를 ZIP의 psd 폴더에 함께 넣습니다.'
        : '미리보기 흐름: 이 ZIP에는 완성 PSD를 넣지 않습니다. local script가 project_config.json을 읽어 결과 PSD를 만들어야 합니다.',
    },
    exportPurpose: 'psd-preview-review-backup',
    finalOutputTarget: 'Long coat.psd copy',
    note: 'ZIP/PNG output is auxiliary review data. The final PSD should keep the Long coat.psd structure.',
    selectedPsdFile: params.selectedPsdFileName
      ? {
          name: params.selectedPsdFileName,
        }
      : null,
    zipStructure: {
      psd: isManualPsdFlow
        ? 'Completed Long coat format PSD selected by the user'
        : 'Not included in preview ZIP until a completed PSD exists',
      png: 'Frame preview PNG files for visual review',
      project: 'Project JSON for continuing work later',
      readme: 'Beginner guide for the ZIP contents',
    },
    generatedPsdHint: {
      source: isManualPsdFlow ? 'manual-selection' : 'local-script',
      expectedOutput: isManualPsdFlow
        ? 'psd/' + params.selectedPsdFileName
        : outputPsdPath,
      status: isManualPsdFlow ? 'manual-selected' : 'design-local-script',
    },
    review: {
      selectedSample: params.exportReview.sampleLabel,
      sampleLabel: params.exportReview.sampleLabel,
      status: params.exportReview.status,
      statusLabel: params.exportReview.statusLabel,
      visualCheckStatus: params.exportReview.visualCheckStatus,
      detail: params.exportReview.detail,
      stats: params.exportReview.stats,
    },
    // Legacy fields (compatibility)
    alignFrontX: state.alignFrontX,
    alignFrontY: state.alignFrontY,
    alignBackX: state.alignBackX,
    alignBackY: state.alignBackY,
    alignScale: state.alignScale,
    layerExportName: state.layerExportName,
    offsets: state.offsets,
    selectedSample: state.selectedSample,
  };
};

const toSafeOutputSlug = (value: string, fallback: string) => {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^\p{L}\p{N}_-]+/gu, '');

  return slug || fallback;
};
