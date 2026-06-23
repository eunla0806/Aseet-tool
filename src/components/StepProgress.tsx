interface StepProgressProps {
  step: number;
  canOpenWorkSteps: boolean;
  onStepSelect: (step: number) => void;
  onBlockedStep: () => void;
}

const STEPS = [
  { value: 1, label: '🍭 슈크림 인형 바디 둘러보기' },
  { value: 2, label: '🎪 요술 서랍장 의상 피팅' },
  { value: 3, label: '🎀 의상 위치 통통이 조절' },
  { value: 4, label: '🎁 예쁜 옷장 보관함 담기' },
];

function StepProgress({ step, canOpenWorkSteps, onStepSelect, onBlockedStep }: StepProgressProps) {
  const handleClick = (targetStep: number) => {
    if (targetStep <= 2 || canOpenWorkSteps) {
      onStepSelect(targetStep);
      return;
    }

    onBlockedStep();
  };

  return (
    <div className="stepper-container">
      <div className="stepper-track"></div>
      <div
        className="stepper-progress"
        style={{ width: `${((step - 1) / 3) * 100}%` }}
      ></div>

      {STEPS.map((stepItem) => (
        <div
          key={stepItem.value}
          className={`step-item ${step === stepItem.value ? 'active' : step > stepItem.value ? 'completed' : ''}`}
          onClick={() => handleClick(stepItem.value)}
        >
          <div className="step-circle">{stepItem.value}</div>
          <div className="step-label">{stepItem.label}</div>
        </div>
      ))}
    </div>
  );
}

export default StepProgress;
