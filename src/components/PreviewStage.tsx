import type React from 'react';
import { isBackFacingAction, samples } from '../domain/samplePresets';

interface FrameLike {
  fileName: string;
  path: string;
}

interface PreviewStageProps {
  actionDisplayName: string;
  activeAction: string;
  activeFrameIdx: number;
  framesLength: number;
  currentFrame: FrameLike;
  currentFrameName: string;
  step: number;
  showGrid: boolean;
  zoom: number;
  selectedSample: string;
  layerVisibility: Record<string, boolean>;
  activeFrameSampleWarning: string;
  activeClothingSrc: string | null;
  activeFrameOffset: { x: number; y: number };
  sampleCompareEnabled: boolean;
  sampleCompareGuideSample: string;
  sampleCompareMode: 'overlay' | 'toggle';
  sampleCompareTarget: 'candidate' | 'sample';
  sampleCompareOpacity: number;
  alignFrontX: number;
  alignFrontY: number;
  alignBackX: number;
  alignBackY: number;
  alignScale: number;
  isLayerVisible: (layerName: string, layerVisibility: Record<string, boolean>) => boolean;
  onToggleGrid: () => void;
  onZoomChange: (zoom: number) => void;
  onCanvasMouseDown: (e: React.MouseEvent) => void;
  onCanvasMouseMove: (e: React.MouseEvent) => void;
  onCanvasMouseUp: () => void;
}

function PreviewStage({
  actionDisplayName,
  activeAction,
  activeFrameIdx,
  framesLength,
  currentFrame,
  currentFrameName,
  step,
  showGrid,
  zoom,
  selectedSample,
  layerVisibility,
  activeFrameSampleWarning,
  activeClothingSrc,
  activeFrameOffset,
  sampleCompareEnabled,
  sampleCompareGuideSample,
  sampleCompareMode,
  sampleCompareTarget,
  sampleCompareOpacity,
  alignFrontX,
  alignFrontY,
  alignBackX,
  alignBackY,
  alignScale,
  isLayerVisible,
  onToggleGrid,
  onZoomChange,
  onCanvasMouseDown,
  onCanvasMouseMove,
  onCanvasMouseUp,
}: PreviewStageProps) {
  const isBack = isBackFacingAction(activeAction);
  const canvasWidth = currentFrame.fileName.includes('rope') || currentFrame.fileName.includes('ladder') ? 45 : 43;
  const canvasHeight = currentFrame.fileName.includes('rope') || currentFrame.fileName.includes('ladder') ? 69 : 68;
  const shouldShowComparison = step === 3 && sampleCompareEnabled && !!sampleCompareGuideSample;
  const shouldShowGuideSample =
    shouldShowComparison &&
    (sampleCompareMode === 'overlay' || sampleCompareTarget === 'sample');
  const shouldShowCandidate =
    !shouldShowComparison ||
    sampleCompareMode === 'overlay' ||
    sampleCompareTarget === 'candidate';

  return (
    <section className="workspace-panel center-panel">
      <div className="canvas-toolbar">
        <div className="canvas-title">
          {actionDisplayName} ({activeFrameIdx + 1} / {framesLength} Frame)
        </div>
        <div className="canvas-actions">
          <button
            className={`canvas-btn ${showGrid ? 'active' : ''}`}
            onClick={onToggleGrid}
          >
            격자 {showGrid ? '켜짐' : '꺼짐'}
          </button>
        </div>
      </div>

      {activeFrameSampleWarning && (
        <div className="canvas-warning-bar">
          {activeFrameSampleWarning}
        </div>
      )}

      <div
        className={`canvas-area ${showGrid ? 'with-grid' : ''}`}
        onMouseMove={onCanvasMouseMove}
        onMouseUp={onCanvasMouseUp}
        onMouseLeave={onCanvasMouseUp}
      >
        <div
          className="canvas-wrapper"
          style={{
            width: `${canvasWidth * zoom}px`,
            height: `${canvasHeight * zoom}px`,
            transform: 'scale(1)',
            cursor: step === 2 && activeClothingSrc ? 'move' : 'default',
          }}
          onMouseDown={onCanvasMouseDown}
        >
          <img
            src={currentFrame.path}
            alt="body_frame"
            className="canvas-element"
            style={{
              width: '100%',
              height: '100%',
              position: 'absolute',
              top: 0,
              left: 0,
              opacity: selectedSample
                ? layerVisibility['character'] === false
                  ? 0.15
                  : 1.0
                : layerVisibility['body'] === false
                  ? 0.15
                  : 1.0,
              zIndex: 2,
            }}
            draggable={false}
          />

          {selectedSample && shouldShowCandidate && samples[selectedSample]?.[currentFrameName]?.map((layer) => {
            if (!isLayerVisible(layer.name, layerVisibility)) return null;
            if (layer.name === 'body') return null;

            return (
              <img
                key={layer.originalFilename}
                src={layer.path}
                alt={layer.name}
                className="canvas-element"
                style={{
                  width: '100%',
                  height: '100%',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  zIndex: layer.index + 2,
                }}
                draggable={false}
              />
            );
          })}

          {shouldShowGuideSample && samples[sampleCompareGuideSample]?.[currentFrameName]?.map((layer) => {
            if (layer.name === 'body') return null;

            return (
              <img
                key={`guide-${layer.originalFilename}`}
                src={layer.path}
                alt={`guide-${layer.name}`}
                className="canvas-element comparison-guide-layer"
                style={{
                  width: '100%',
                  height: '100%',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  zIndex: 20 + layer.index,
                  opacity: sampleCompareMode === 'overlay' ? sampleCompareOpacity : 1,
                }}
                draggable={false}
              />
            );
          })}

          {!selectedSample && shouldShowCandidate && activeClothingSrc && layerVisibility['torso'] !== false && (
            <img
              src={activeClothingSrc}
              alt="uploaded_clothing"
              className="canvas-element"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                zIndex: 5,
                transformOrigin: 'top left',
                transform: `translate(${
                  step === 2
                    ? isBack
                      ? alignBackX
                      : alignFrontX
                    : activeFrameOffset.x
                }px, ${
                  step === 2
                    ? isBack
                      ? alignBackY
                      : alignFrontY
                    : activeFrameOffset.y
                }px) scale(${alignScale})`,
                border: step === 2 ? '1px dashed var(--pink-primary)' : 'none',
                pointerEvents: step === 2 ? 'none' : 'auto',
              }}
              draggable={false}
            />
          )}
        </div>

        <div className="zoom-controls">
          <button className="zoom-btn" onClick={() => onZoomChange(Math.max(1, zoom - 1))}>-</button>
          <span className="zoom-value">{zoom * 100}%</span>
          <button className="zoom-btn" onClick={() => onZoomChange(Math.min(10, zoom + 1))}>+</button>
        </div>
      </div>
    </section>
  );
}

export default PreviewStage;
