type Speed = 'slow' | 'normal' | 'fast';

interface FrameLike {
  fileName: string;
}

interface ActionLike {
  name: string;
  displayName: string;
  frames: FrameLike[];
}

interface MotionControlsProps {
  actions: Record<string, ActionLike>;
  activeAction: string;
  speed: Speed;
  isPlaying: boolean;
  currentFrameName: string;
  onSpeedChange: (speed: Speed) => void;
  onTogglePlay: () => void;
  onPreviousFrame: () => void;
  onNextFrame: () => void;
  onActionChange: (actionName: string) => void;
}

function MotionControls({
  actions,
  activeAction,
  speed,
  isPlaying,
  currentFrameName,
  onSpeedChange,
  onTogglePlay,
  onPreviousFrame,
  onNextFrame,
  onActionChange,
}: MotionControlsProps) {
  return (
    <section className="workspace-panel">
      <div className="panel-header">
        <h2>동작 컨트롤러</h2>
        <span className="action-card-count">{Object.keys(actions).length} 모션</span>
      </div>

      <div className="panel-content">
        <div className="speed-control">
          <span className="speed-label">재생 속도</span>
          <div className="speed-buttons">
            <button
              className={`speed-btn ${speed === 'slow' ? 'active' : ''}`}
              onClick={() => onSpeedChange('slow')}
            >
              Slow
            </button>
            <button
              className={`speed-btn ${speed === 'normal' ? 'active' : ''}`}
              onClick={() => onSpeedChange('normal')}
            >
              Normal
            </button>
            <button
              className={`speed-btn ${speed === 'fast' ? 'active' : ''}`}
              onClick={() => onSpeedChange('fast')}
            >
              Fast
            </button>
          </div>
        </div>

        <div className="player-controls">
          <button
            className="player-btn"
            onClick={onPreviousFrame}
            title="이전 프레임"
          >
            ◀
          </button>
          <button
            className="player-btn play-btn"
            onClick={onTogglePlay}
            title={isPlaying ? '정지' : '재생'}
          >
            {isPlaying ? '❚❚' : '▶'}
          </button>
          <button
            className="player-btn"
            onClick={onNextFrame}
            title="다음 프레임"
          >
            ▶
          </button>
        </div>

        <div className="speed-label">동작 목록 ({currentFrameName})</div>
        <div className="action-list">
          {Object.values(actions).map((act) => (
            <div
              key={act.name}
              className={`action-card ${activeAction === act.name ? 'active' : ''}`}
              onClick={() => onActionChange(act.name)}
            >
              <span className="action-card-name">{act.displayName}</span>
              <span className="action-card-count">{act.frames.length}F</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default MotionControls;
