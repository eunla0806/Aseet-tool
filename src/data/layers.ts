/**
 * Dot Asset Tool - Layer Definition and Parsing Utilities
 */

export interface LayerInfo {
  index: number;         // e.g., 1 for L1
  name: string;          // e.g., 'pantsBelowShoes', 'mailArm'
  visible: boolean;      // true if 'visible'
  blendMode: string;     // e.g., 'normal'
  opacity: number;       // 0-255
  originalFilename: string;
}

export type LayerRoleId =
  | 'character'
  | 'outfitArm'
  | 'torso'
  | 'backTorso'
  | 'lowerSupport'
  | 'other';

export interface LayerRoleDefinition {
  id: LayerRoleId;
  label: string;
  shortLabel: string;
  description: string;
  layerNames: readonly string[];
}

export const BASIC_CHARACTER_LAYER_NAMES = [
  'body',
  'head',
  'arm',
  'armOverHair',
  'handBelowWeapon',
  'handOverHair',
  'hairShade',
  'backBody',
  'backHead',
] as const;

export const OUTFIT_ARM_LAYER_NAMES = [
  'mailArm',
  'mailArmOverHair',
  'mailArmBelowHead',
  'mailArmOverHairBelowWeapon',
  'mailArmBelowHeadOverMailChest',
] as const;

export const TORSO_LAYER_NAMES = [
  'mailChest',
  'pantsOverShoesBelowMailChest',
] as const;

export const BACK_TORSO_LAYER_NAMES = [
  'backMailChest',
  'backMailChestOverPants',
  'backMail',
] as const;

export const LOWER_SUPPORT_LAYER_NAMES = [
  'pantsBelowShoes',
  'pants',
  'shoes',
  'backPants',
] as const;

export const LAYER_ROLE_DEFINITIONS: readonly LayerRoleDefinition[] = [
  {
    id: 'character',
    label: '기본 캐릭터',
    shortLabel: '바디',
    description: '몸, 머리, 팔, 손처럼 의상이 아닌 기본 캐릭터 레이어입니다.',
    layerNames: BASIC_CHARACTER_LAYER_NAMES,
  },
  {
    id: 'outfitArm',
    label: '의상 팔',
    shortLabel: '팔 의상',
    description: '소매처럼 팔 위에 올라가는 의상 레이어입니다.',
    layerNames: OUTFIT_ARM_LAYER_NAMES,
  },
  {
    id: 'torso',
    label: '정면 torso',
    shortLabel: '앞몸통',
    description: '정면에서 보이는 상의/한벌옷 몸통 레이어입니다.',
    layerNames: TORSO_LAYER_NAMES,
  },
  {
    id: 'backTorso',
    label: '후면 torso',
    shortLabel: '뒷몸통',
    description: '사다리/로프 같은 후면 동작에서 쓰는 의상 레이어입니다.',
    layerNames: BACK_TORSO_LAYER_NAMES,
  },
  {
    id: 'lowerSupport',
    label: '하의/보조',
    shortLabel: '하의',
    description: '하의, 신발, 보조 하단 레이어입니다. torso로 단정하지 않습니다.',
    layerNames: LOWER_SUPPORT_LAYER_NAMES,
  },
  {
    id: 'other',
    label: '기타',
    shortLabel: '기타',
    description: '아직 역할을 확정하지 않은 레이어입니다.',
    layerNames: [],
  },
];

export const getLayerRole = (layerName: string): LayerRoleDefinition => {
  return (
    LAYER_ROLE_DEFINITIONS.find((role) => role.layerNames.includes(layerName)) ??
    LAYER_ROLE_DEFINITIONS[LAYER_ROLE_DEFINITIONS.length - 1]
  );
};

export const hasAnyLayerName = <T extends { name: string }>(
  layers: readonly T[],
  targetNames: readonly string[]
) => {
  return layers.some((layer) => targetNames.includes(layer.name));
};

// 표준 메이플스토리 월드 아바타 레이어 렌더링 순서 (하위 -> 상위)
export const DEFAULT_LAYER_ORDER = [
  'backBody',
  'backPants',
  'backMail',
  'body',
  'pantsBelowShoes',
  'mailChest',
  'pants',
  'shoes',
  'head',
  'hairShade',
  'arm',
  'mailArm',
  'armOverHair',
  'mailArmOverHair',
  'handBelowWeapon',
  'handOverHair'
];

// 레이어의 한글 설명 매핑 (초보자용 가이드)
export const LAYER_DISPLAY_NAMES: Record<string, string> = {
  backBody: '뒷모습 바디',
  backPants: '뒷모습 바지',
  backMail: '뒷모습 의상',
  backMailChest: '뒷모습 상의',
  backMailChestOverPants: '뒷모습 상의 (하의 위)',
  body: '기본 바디',
  pantsBelowShoes: '하의 (신발 뒤)',
  mailChest: '상의/의상 몸통',
  pantsOverShoesBelowMailChest: '한벌옷 하단',
  pants: '하의',
  shoes: '신발',
  head: '머리',
  hairShade: '머리카락 그림자',
  arm: '팔',
  mailArm: '소매/의상 팔',
  armOverHair: '팔 (헤어 위)',
  mailArmOverHair: '소매 (헤어 위)',
  mailArmBelowHead: '소매 (머리 아래)',
  mailArmOverHairBelowWeapon: '소매 (무기 아래)',
  mailArmBelowHeadOverMailChest: '소매 (상의 위)',
  handBelowWeapon: '손 (무기 뒤)',
  handOverHair: '손 (헤어 위)'
};

/**
 * L1,R1,C1,body,visible,normal,255.png 와 같은 파일명을 파싱합니다.
 */
export function parseLayerFilename(filename: string): LayerInfo | null {
  // 확장자가 .png인지 검사
  if (!filename.toLowerCase().endsWith('.png')) return null;

  // L1,R1,C1,body,visible,normal,255
  const nameWithoutExt = filename.substring(0, filename.length - 4);
  const parts = nameWithoutExt.split(',');

  if (parts.length < 7) {
    // 쉼표 구분이 제대로 안된 경우 예외 처리
    return {
      index: 1,
      name: nameWithoutExt,
      visible: true,
      blendMode: 'normal',
      opacity: 255,
      originalFilename: filename
    };
  }

  // L1 에서 숫자 부분 파싱
  const indexMatch = parts[0].match(/^L(\d+)$/i);
  const index = indexMatch ? parseInt(indexMatch[1], 10) : 1;

  const name = parts[3];
  const visible = parts[4].toLowerCase() === 'visible';
  const blendMode = parts[5];
  const opacity = parseInt(parts[6], 10) || 255;

  return {
    index,
    name,
    visible,
    blendMode,
    opacity,
    originalFilename: filename
  };
}

/**
 * 레이어 정보로부터 파일명을 생성합니다.
 */
export function generateLayerFilename(
  index: number,
  layerName: string,
  visible = true,
  blendMode = 'normal',
  opacity = 255
): string {
  return `L${index},R1,C1,${layerName},${visible ? 'visible' : 'hidden'},${blendMode},${opacity}.png`;
}
