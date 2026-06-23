import samplesData from '../data/samples.json';
import {
  BACK_TORSO_LAYER_NAMES,
  LAYER_ROLE_DEFINITIONS,
  OUTFIT_ARM_LAYER_NAMES,
  TORSO_LAYER_NAMES,
  hasAnyLayerName,
  type LayerRoleId,
} from '../data/layers';

export interface SampleLayer {
  index: number;
  name: string;
  visible: boolean;
  blendMode: string;
  opacity: number;
  originalFilename: string;
  path: string;
}

export type SamplesCatalog = Record<string, Record<string, SampleLayer[]>>;

export const samples = samplesData as unknown as SamplesCatalog;

export const BACK_FACING_ACTIONS = ['ladder', 'rope'];

export const SAMPLE_LAYER_ROLE_IDS: LayerRoleId[] = [
  'character',
  'outfitArm',
  'torso',
  'backTorso',
  'lowerSupport',
  'other',
];

export const SAMPLE_PRESETS = [
  { name: '02_ 개나리 소풍', icon: '🌿', displayName: '개나리 소풍' },
  { name: '05_멜로디 소녀', icon: '🧥', displayName: '멜로디 소녀' },
  { name: '러블리 쇼퍼', icon: '💖', displayName: '러블리 쇼퍼' },
];

export type SampleHealthStatus = 'ok' | 'warning' | 'blocked';

export interface SampleHealth {
  status: SampleHealthStatus;
  statusLabel: string;
  shortNote: string;
  detail: string;
  totalFrames: number;
  torsoFrames: number;
  armFrames: number;
  backTorsoFrames: number;
  ladderRopeFrames: number;
  ladderRopeMissingFrames: string[];
}

export const isBackFacingAction = (actionName: string) => {
  return BACK_FACING_ACTIONS.includes(actionName);
};

export const buildSampleHealth = (sampleName: string): SampleHealth => {
  const frameEntries = Object.entries(samples[sampleName] ?? {});
  const totalFrames = frameEntries.length;
  const torsoFrames = frameEntries.filter(([, layers]) => hasAnyLayerName(layers, TORSO_LAYER_NAMES)).length;
  const armFrames = frameEntries.filter(([, layers]) => hasAnyLayerName(layers, OUTFIT_ARM_LAYER_NAMES)).length;
  const backTorsoFrames = frameEntries.filter(([, layers]) => hasAnyLayerName(layers, BACK_TORSO_LAYER_NAMES)).length;
  const ladderRopeEntries = frameEntries.filter(([frameName]) =>
    BACK_FACING_ACTIONS.some((actionName) => frameName.startsWith(`${actionName}_`))
  );
  const ladderRopeMissingFrames = ladderRopeEntries
    .filter(([, layers]) => !hasAnyLayerName(layers, BACK_TORSO_LAYER_NAMES))
    .map(([frameName]) => frameName);

  if (totalFrames === 0) {
    return {
      status: 'blocked',
      statusLabel: '확인 필요',
      shortNote: '샘플 데이터를 찾지 못했어요.',
      detail: '샘플 폴더와 samples.json 연결을 먼저 확인해야 합니다.',
      totalFrames,
      torsoFrames,
      armFrames,
      backTorsoFrames,
      ladderRopeFrames: ladderRopeEntries.length,
      ladderRopeMissingFrames,
    };
  }

  if (torsoFrames === 0) {
    return {
      status: 'warning',
      statusLabel: '검토 필요',
      shortNote: '화면이 정상이라면 샘플로 사용해도 괜찮아요.',
      detail: '레이어 이름 기준이 다른 샘플입니다. 실제 미리보기에서 정상으로 보이면 다음 단계로 진행할 수 있습니다.',
      totalFrames,
      torsoFrames,
      armFrames,
      backTorsoFrames,
      ladderRopeFrames: ladderRopeEntries.length,
      ladderRopeMissingFrames,
    };
  }

  if (ladderRopeMissingFrames.length > 0) {
    return {
      status: 'warning',
      statusLabel: '참고 정보',
      shortNote: '후면 동작은 눈으로 한 번 확인하면 충분해요.',
      detail: '일부 후면 torso 기준과 샘플 레이어 이름이 완전히 같지는 않습니다. 실제 화면에서 정상으로 보이면 사용할 수 있습니다.',
      totalFrames,
      torsoFrames,
      armFrames,
      backTorsoFrames,
      ladderRopeFrames: ladderRopeEntries.length,
      ladderRopeMissingFrames,
    };
  }

  return {
    status: 'ok',
    statusLabel: '검토 완료',
    shortNote: '기본 레이어 구성이 안정적이에요.',
    detail: '대표 동작 미리보기와 내보내기 검증을 계속 진행할 수 있습니다.',
    totalFrames,
    torsoFrames,
    armFrames,
    backTorsoFrames,
    ladderRopeFrames: ladderRopeEntries.length,
    ladderRopeMissingFrames,
  };
};

export const sampleHealthByName = SAMPLE_PRESETS.reduce<Record<string, SampleHealth>>((acc, sample) => {
  acc[sample.name] = buildSampleHealth(sample.name);
  return acc;
}, {});

export const getActiveFrameSampleWarning = (health: SampleHealth) => {
  if (health.totalFrames === 0) {
    return '이 샘플은 현재 앱에서 데이터를 찾지 못했어요.';
  }

  return '';
};

export const getLayerRoleDefinition = (roleId: LayerRoleId) => {
  return LAYER_ROLE_DEFINITIONS.find((role) => role.id === roleId) ?? LAYER_ROLE_DEFINITIONS[0];
};

export const getSampleDisplayName = (sampleName: string) => {
  return SAMPLE_PRESETS.find((sample) => sample.name === sampleName)?.displayName ?? sampleName;
};

export const buildExportReview = (sampleName: string, health: SampleHealth | null) => {
  if (!sampleName) {
    return {
      status: 'ok' as const,
      sampleLabel: '직접 업로드 PNG',
      statusLabel: '샘플 준비',
      visualCheckStatus: '샘플 완료, 미리보기 준비됨',
      detail: '직접 올린 의상 이미지를 기준으로 ZIP을 만듭니다.',
      canExport: true,
      needsConfirm: false,
      stats: null,
    };
  }

  if (!health || health.status === 'blocked') {
    return {
      status: 'blocked' as const,
      sampleLabel: getSampleDisplayName(sampleName),
      statusLabel: '확인 필요',
      visualCheckStatus: '샘플 데이터 확인 필요',
      detail: '샘플 데이터를 찾을 수 없어 내보내기를 막습니다.',
      canExport: false,
      needsConfirm: false,
      stats: null,
    };
  }

  const stats = {
    totalFrames: health.totalFrames,
    torsoFrames: health.torsoFrames,
    armFrames: health.armFrames,
    backTorsoFrames: health.backTorsoFrames,
    ladderRopeFrames: health.ladderRopeFrames,
    ladderRopeMissingCount: health.ladderRopeMissingFrames.length,
  };

  if (health.status === 'warning') {
    return {
      status: 'warning' as const,
      sampleLabel: getSampleDisplayName(sampleName),
      statusLabel: health.statusLabel,
      visualCheckStatus: '샘플 준비 완료 / 참고 정보 있음',
      detail: '대표 동작에서 정상으로 보이면 계속 내보내도 괜찮습니다.',
      canExport: true,
      needsConfirm: true,
      stats,
    };
  }

  return {
    status: 'ok' as const,
    sampleLabel: getSampleDisplayName(sampleName),
    statusLabel: health.statusLabel,
    visualCheckStatus: '샘플 준비 완료',
    detail: '대표 동작 기준으로 안정적인 샘플입니다.',
    canExport: true,
    needsConfirm: false,
    stats,
  };
};

export type ExportReview = ReturnType<typeof buildExportReview>;
