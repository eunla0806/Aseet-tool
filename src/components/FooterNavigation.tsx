interface FooterNavigationProps {
  step: number;
  onPrevStep: () => void;
  onNextStep: () => void;
}

function FooterNavigation({ step, onPrevStep, onNextStep }: FooterNavigationProps) {
  return (
    <footer className="app-footer">
      <button
        className="nav-btn prev-btn"
        onClick={onPrevStep}
        disabled={step === 1}
      >
        이전 단계
      </button>

      <button
        className="nav-btn next-btn"
        onClick={onNextStep}
        disabled={step === 4}
      >
        다음 단계
      </button>
    </footer>
  );
}

export default FooterNavigation;
