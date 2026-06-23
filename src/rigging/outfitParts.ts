// Step 2에서 사용하는 기본 의상 파츠 종류입니다.
// 처음 버전은 4가지만 고정해서 사용합니다.
export type OutfitPartType = 'torso' | 'sleeve' | 'lower' | 'back'

// 파츠 자체의 설명 정보입니다.
// 나중에 업로드 UI를 만들 때 이 정보를 그대로 보여줄 수 있습니다.
export interface OutfitPartDefinition {
  type: OutfitPartType
  label: string
  description: string
  required: boolean
}

// 실제 업로드 상태까지 함께 다루는 기본 구조입니다.
// 이번 Step에서는 화면에 연결하지 않고 타입만 먼저 준비합니다.
export interface OutfitPartImage extends OutfitPartDefinition {
  file?: File | null
  previewUrl?: string | null
}

// 사용자가 이해하기 쉬운 이름과 설명을 함께 둡니다.
export const OUTFIT_PARTS: readonly OutfitPartDefinition[] = [
  {
    type: 'torso',
    label: '몸통',
    description: '상의, 갑옷, 코트 윗부분처럼 몸통에 입는 의상입니다.',
    required: true,
  },
  {
    type: 'sleeve',
    label: '소매',
    description: '팔과 소매에 해당하는 의상입니다.',
    required: true,
  },
  {
    type: 'lower',
    label: '하의/하단',
    description: '바지, 치마, 코트 아래쪽처럼 하단에 오는 의상입니다.',
    required: false,
  },
  {
    type: 'back',
    label: '후면 장식',
    description: '망토나 등 뒤에 보이는 장식처럼 뒤쪽 파츠입니다.',
    required: false,
  },
] as const

// type으로 빠르게 찾을 수 있게 작은 도우미도 함께 둡니다.
export const getOutfitPartDefinition = (type: OutfitPartType) => {
  return OUTFIT_PARTS.find((part) => part.type === type)
}
