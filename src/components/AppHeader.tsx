interface AppHeaderProps {
  step: number;
}

const STEP_TITLES: Record<number, string> = {
  1: '🍭 슈크림 인형 바디 둘러보기',
  2: '🎪 요술 서랍장 의상 피팅',
  3: '🎀 의상 위치 통통이 조절',
  4: '🎁 예쁜 옷장 보관함 담기',
};

function AppHeader({ step }: AppHeaderProps) {
  return (
    <header className="app-header">
      <div className="logo-section">
        <div className="logo-badge">🎀</div>
        <div className="logo-text">
          <h1>나의 달콤한 의상실</h1>
          <span>Sweet Dressroom for Maple Worlds</span>
        </div>
      </div>

      <div className="step-badge">
        Step {step} / 4: {STEP_TITLES[step]}
      </div>
    </header>
  );
}

export default AppHeader;
