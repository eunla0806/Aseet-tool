import { OUTFIT_PARTS, type OutfitPartImage, type OutfitPartType } from '../rigging/outfitParts';

interface OutfitPartsPanelProps {
  isCollapsed: boolean;
  uploadedParts: Partial<Record<OutfitPartType, OutfitPartImage>>;
  onToggleCollapsed: () => void;
  onFileChange: (type: OutfitPartType, file: File | null) => void;
  onClearPart: (type: OutfitPartType) => void;
}

function OutfitPartsPanel({
  isCollapsed,
  uploadedParts,
  onToggleCollapsed,
  onFileChange,
  onClearPart,
}: OutfitPartsPanelProps) {
  const uploadedCount = OUTFIT_PARTS.filter((part) => uploadedParts[part.type]?.previewUrl).length;

  return (
    <div className={`accordion outfit-parts-panel ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="accordion-header" onClick={onToggleCollapsed}>
        <div className="accordion-header-title">
          <span>의상 파츠 업로드</span>
          <span className="outfit-parts-count">{uploadedCount}/{OUTFIT_PARTS.length}</span>
        </div>
        <span className="accordion-icon">{isCollapsed ? '＋' : '−'}</span>
      </div>

      <div className="accordion-content">
        <div className="outfit-parts-summary">
          몸통, 소매, 하의/하단, 후면 장식을 따로 올려 둘 수 있어요.
        </div>

        <div className="outfit-parts-list">
          {OUTFIT_PARTS.map((part) => {
            const uploadedPart = uploadedParts[part.type];

            return (
              <div key={part.type} className={`outfit-part-row part-${part.type}`}>
                <div className="outfit-part-meta">
                  <div className="outfit-part-title-row">
                    <strong>{part.label}</strong>
                    <span className={`outfit-part-badge ${part.required ? 'required' : 'optional'}`}>
                      {part.required ? '필수' : '선택'}
                    </span>
                  </div>
                  <div className="outfit-part-description">{part.description}</div>
                  <div className="outfit-part-file-name">
                    {uploadedPart?.file?.name ?? '아직 업로드하지 않았어요.'}
                  </div>
                </div>

                <div className="outfit-part-actions">
                  <label className="outfit-part-upload-button">
                    PNG 선택
                    <input
                      type="file"
                      accept="image/png"
                      className="outfit-part-file-input"
                      onChange={(event) => {
                        onFileChange(part.type, event.target.files?.[0] ?? null);
                        event.currentTarget.value = '';
                      }}
                    />
                  </label>

                  {uploadedPart && (
                    <button
                      type="button"
                      className="outfit-part-clear-button"
                      onClick={() => onClearPart(part.type)}
                    >
                      지우기
                    </button>
                  )}
                </div>

                <div className="outfit-part-preview">
                  {uploadedPart?.previewUrl ? (
                    <img src={uploadedPart.previewUrl} alt={`${part.label} 미리보기`} />
                  ) : (
                    <span>미리보기 없음</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default OutfitPartsPanel;
