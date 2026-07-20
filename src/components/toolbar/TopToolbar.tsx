import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useBoardStore } from '../../store/board-store'
import type { InteractionMode, PlaceKind } from '../../types/state'
import type { DrawToolKind } from '../../types/entities'
import { fitToScreenRef } from '../../utils/fitToScreen'
import { PLACE_STICKER_PRESETS } from '../../constants/placeStickers'
import {
  DRAW_PEN_COLOR_PRESETS,
  DRAW_HIGHLIGHTER_COLOR_PRESETS,
  DRAW_SHAPE_FILL_PRESETS,
  MEMO_PAPER_COLOR_PRESETS,
} from '../../constants/overlayUi'
import type { DrawStrokeWeight } from '../../types/state'
import { prepareStickerImage } from '../../utils/stickerImage'
import { isValidBoardYear, MAX_BOARD_YEAR, MIN_BOARD_YEAR } from '../../constants/boardYear'
import {
  IconMove,
  IconCursor,
  IconPencil,
  IconPin,
  IconSettings,
  IconMaximize,
  IconPenNib,
  IconHighlighter,
  IconSquare,
  IconCircle,
  IconEraser,
  IconUndo,
  IconRedo,
  IconStickyNote,
  IconStar,
  IconExText,
} from '../icons/Icons'
import './TopToolbar.css'

const DRAW_TOOLS: { tool: DrawToolKind; label: string; Icon: typeof IconPenNib }[] = [
  { tool: 'pen', label: 'Pen', Icon: IconPenNib },
  { tool: 'highlighter', label: 'Highlighter', Icon: IconHighlighter },
  { tool: 'rect', label: 'Rectangle', Icon: IconSquare },
  { tool: 'ellipse', label: 'Ellipse', Icon: IconCircle },
  { tool: 'textbox', label: 'Text box', Icon: IconExText },
  { tool: 'eraser', label: 'Eraser', Icon: IconEraser },
]

const PLACE_KINDS: { kind: PlaceKind; label: string; Icon: typeof IconStickyNote }[] = [
  { kind: 'memo', label: 'Memo', Icon: IconStickyNote },
  { kind: 'sticker', label: 'Sticker', Icon: IconStar },
]

const STROKE_WEIGHTS: DrawStrokeWeight[] = ['thin', 'medium', 'thick']

function strokeWeightLabel(w: DrawStrokeWeight): string {
  if (w === 'thin') return 'Thin'
  if (w === 'thick') return 'Thick'
  return 'Medium'
}

const MODES: { mode: InteractionMode; label: string; Icon: typeof IconMove }[] = [
  { mode: 'pan', label: 'Pan', Icon: IconMove },
  { mode: 'select', label: 'Select', Icon: IconCursor },
  { mode: 'draw', label: 'Draw', Icon: IconPencil },
  { mode: 'place', label: 'Place', Icon: IconPin },
]

export function TopToolbar() {
  const interactionMode = useBoardStore(s => s.interactionMode)
  const setInteractionMode = useBoardStore(s => s.setInteractionMode)
  const settings = useBoardStore(s => s.settings)
  const updateSettings = useBoardStore(s => s.updateSettings)
  const view = useBoardStore(s => s.view)
  const boardState = useBoardStore(s => {
    const id = s.activeBoardId
    return id ? s.boards[id] : null
  })
  const toggleRightPanel = useBoardStore(s => s.toggleRightPanel)
  const sidePanelOpen = useBoardStore(s => s.panel.leftOpen || s.panel.rightOpen)
  const setBoardYear = useBoardStore(s => s.setBoardYear)
  const undo = useBoardStore(s => s.undo)
  const redo = useBoardStore(s => s.redo)
  const historyUi = useBoardStore(s => s._historyUi)
  const createImageAsset = useBoardStore(s => s.createImageAsset)
  const deleteImageAsset = useBoardStore(s => s.deleteImageAsset)
  const stickerFileRef = useRef<HTMLInputElement>(null)
  const [stickerUploadError, setStickerUploadError] = useState<string | null>(null)
  const [stickerUploading, setStickerUploading] = useState(false)

  const year = boardState?.board.year || new Date().getFullYear()
  const [yearDraft, setYearDraft] = useState(String(year))
  const zoomPercent = Math.round(view.scale * 100)

  useEffect(() => {
    setYearDraft(String(year))
  }, [year])
  const customStickerAssets = useMemo(
    () => Object.values(boardState?.assets ?? {})
      .filter(a => a.type === 'image')
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [boardState?.assets]
  )
  const selectedStickerAsset = settings.placeStickerAssetId
    ? boardState?.assets[settings.placeStickerAssetId]
    : undefined
  const selectedStickerUseCount = selectedStickerAsset
    ? Object.values(boardState?.overlays ?? {}).filter(
        overlay => overlay.assetId === selectedStickerAsset.id,
      ).length
    : 0

  const handleResetView = useCallback(() => {
    fitToScreenRef.current?.()
  }, [])

  const commitYear = useCallback(() => {
    const nextYear = Number(yearDraft)
    if (!isValidBoardYear(nextYear)) {
      setYearDraft(String(year))
      return
    }
    if (nextYear === year) return
    setBoardYear(nextYear)
    requestAnimationFrame(() => fitToScreenRef.current?.())
  }, [setBoardYear, year, yearDraft])

  const handleStickerFile = useCallback(async (file: File | undefined) => {
    const boardId = boardState?.board.id
    if (!file || !boardId) return
    setStickerUploadError(null)
    setStickerUploading(true)
    try {
      const prepared = await prepareStickerImage(file)
      const assetId = createImageAsset(boardId, prepared.dataUrl, prepared)
      updateSettings({ placeStickerAssetId: assetId })
    } catch (error) {
      setStickerUploadError(error instanceof Error ? error.message : 'Could not add the image.')
    } finally {
      setStickerUploading(false)
    }
  }, [boardState?.board.id, createImageAsset, updateSettings])

  const showFlyout = !sidePanelOpen
    && (interactionMode === 'draw' || interactionMode === 'place')

  return (
    <header className="top-toolbar">
      <div className="toolbar-left">
        <input
          type="number"
          className="toolbar-year-input"
          aria-label="Year"
          title="Change year"
          min={MIN_BOARD_YEAR}
          max={MAX_BOARD_YEAR}
          step={1}
          inputMode="numeric"
          value={yearDraft}
          onChange={e => setYearDraft(e.target.value)}
          onFocus={e => e.currentTarget.select()}
          onWheel={e => e.currentTarget.blur()}
          onBlur={commitYear}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.currentTarget.blur()
            } else if (e.key === 'Escape') {
              e.preventDefault()
              setYearDraft(String(year))
              e.currentTarget.select()
            }
          }}
        />
        <span className="toolbar-zoom">
          <span className="toolbar-zoom-z">{view.zoomLevel}</span>
          <span className="toolbar-zoom-sep"> · </span>
          <span className="toolbar-zoom-pct">{zoomPercent}%</span>
        </span>
      </div>

      <div className="toolbar-center-wrap">
        <div className="toolbar-center">
          {MODES.map(m => (
            <button
              key={m.mode}
              type="button"
              className={`toolbar-mode-btn ${interactionMode === m.mode ? 'active' : ''}`}
              onClick={() => setInteractionMode(m.mode)}
              title={m.label}
            >
              <m.Icon size={16} />
            </button>
          ))}
          <div className="toolbar-divider" />
          <button
            type="button"
            className="toolbar-mode-btn"
            onClick={handleResetView}
            title="Fit to screen"
          >
            <IconMaximize size={16} />
          </button>
          <div className="toolbar-divider" />
          <button
            type="button"
            className="toolbar-mode-btn"
            disabled={!historyUi.canUndo}
            onClick={() => undo()}
            title="Undo (⌘Z)"
          >
            <IconUndo size={16} />
          </button>
          <button
            type="button"
            className="toolbar-mode-btn"
            disabled={!historyUi.canRedo}
            onClick={() => redo()}
            title="Redo (⌘⇧Z)"
          >
            <IconRedo size={16} />
          </button>
        </div>

        {showFlyout && (
          <div
            className="toolbar-flyout"
            role="group"
            aria-label={interactionMode === 'draw' ? 'Draw tools' : 'Place tools'}
            onPointerDown={e => e.stopPropagation()}
          >
            {interactionMode === 'draw' && (
              <>
                <div className="toolbar-flyout-row">
                  {DRAW_TOOLS.map(({ tool, label, Icon }) => (
                    <button
                      key={tool}
                      type="button"
                      className={`toolbar-sub-icon-btn toolbar-sub-icon-btn--sm ${settings.drawTool === tool ? 'active' : ''}`}
                      title={label}
                      onClick={() => updateSettings({ drawTool: tool })}
                    >
                      <Icon size={17} />
                    </button>
                  ))}
                </div>
                {settings.drawTool === 'pen' && (
                  <>
                    <p className="toolbar-flyout-label">Pen color</p>
                    <div className="toolbar-flyout-swatches" role="group" aria-label="Pen color">
                      {DRAW_PEN_COLOR_PRESETS.map(c => (
                        <button
                          key={c}
                          type="button"
                          className={`toolbar-color-dot ${settings.drawPenColor === c ? 'active' : ''}`}
                          style={{ backgroundColor: c }}
                          title={c}
                          onClick={() => updateSettings({ drawPenColor: c })}
                        />
                      ))}
                    </div>
                    <p className="toolbar-flyout-label">Pen weight</p>
                    <div className="toolbar-weight-row" role="group" aria-label="Pen width">
                      {STROKE_WEIGHTS.map(w => (
                        <button
                          key={w}
                          type="button"
                          className={`toolbar-weight-btn ${settings.drawPenWidthWeight === w ? 'active' : ''}`}
                          onClick={() => updateSettings({ drawPenWidthWeight: w })}
                        >
                          {strokeWeightLabel(w)}
                        </button>
                      ))}
                    </div>
                  </>
                )}
                {settings.drawTool === 'highlighter' && (
                  <>
                    <p className="toolbar-flyout-label">Highlighter color</p>
                    <div className="toolbar-flyout-swatches" role="group" aria-label="Highlighter color">
                      {DRAW_HIGHLIGHTER_COLOR_PRESETS.map(c => (
                        <button
                          key={c}
                          type="button"
                          className={`toolbar-color-dot ${settings.drawHighlighterColor === c ? 'active' : ''}`}
                          style={{ backgroundColor: c }}
                          title={c}
                          onClick={() => updateSettings({ drawHighlighterColor: c })}
                        />
                      ))}
                    </div>
                    <p className="toolbar-flyout-label">Highlighter weight</p>
                    <div className="toolbar-weight-row" role="group" aria-label="Highlighter width">
                      {STROKE_WEIGHTS.map(w => (
                        <button
                          key={w}
                          type="button"
                          className={`toolbar-weight-btn ${settings.drawHighlighterWidthWeight === w ? 'active' : ''}`}
                          onClick={() => updateSettings({ drawHighlighterWidthWeight: w })}
                        >
                          {strokeWeightLabel(w)}
                        </button>
                      ))}
                    </div>
                  </>
                )}
                {(settings.drawTool === 'rect'
                  || settings.drawTool === 'ellipse'
                  || settings.drawTool === 'textbox') && (
                  <>
                    <p className="toolbar-flyout-label">Shape stroke color</p>
                    <div className="toolbar-flyout-swatches" role="group" aria-label="Shape stroke color">
                      {DRAW_PEN_COLOR_PRESETS.map(c => (
                        <button
                          key={c}
                          type="button"
                          className={`toolbar-color-dot ${settings.drawShapeStrokeColor === c ? 'active' : ''}`}
                          style={{ backgroundColor: c }}
                          title={c}
                          onClick={() => updateSettings({ drawShapeStrokeColor: c })}
                        />
                      ))}
                    </div>
                    <p className="toolbar-flyout-label">Shape stroke weight</p>
                    <div className="toolbar-weight-row" role="group" aria-label="Shape stroke width">
                      {STROKE_WEIGHTS.map(w => (
                        <button
                          key={w}
                          type="button"
                          className={`toolbar-weight-btn ${settings.drawShapeStrokeWeight === w ? 'active' : ''}`}
                          onClick={() => updateSettings({ drawShapeStrokeWeight: w })}
                        >
                          {strokeWeightLabel(w)}
                        </button>
                      ))}
                    </div>
                    <p className="toolbar-flyout-label">Shape fill</p>
                    <div className="toolbar-flyout-swatches" role="group" aria-label="Shape fill">
                      {DRAW_SHAPE_FILL_PRESETS.map(c => (
                        <button
                          key={c}
                          type="button"
                          className={`toolbar-color-dot toolbar-color-dot--fill ${settings.drawShapeFillColor === c ? 'active' : ''} ${c === 'transparent' ? 'toolbar-color-dot--transparent' : ''}`}
                          style={c === 'transparent' ? undefined : { backgroundColor: c }}
                          title={c === 'transparent' ? 'No fill' : c}
                          onClick={() => updateSettings({ drawShapeFillColor: c })}
                        />
                      ))}
                    </div>
                  </>
                )}
              </>
            )}

            {interactionMode === 'place' && (
              <>
                <div className="toolbar-flyout-row">
                  {PLACE_KINDS.map(({ kind, label, Icon }) => (
                    <button
                      key={kind}
                      type="button"
                      className={`toolbar-sub-icon-btn toolbar-sub-icon-btn--sm ${settings.placeKind === kind ? 'active' : ''}`}
                      title={label}
                      onClick={() => updateSettings({ placeKind: kind })}
                    >
                      <Icon size={17} />
                    </button>
                  ))}
                </div>
                {settings.placeKind === 'sticker' && (
                  <>
                    <div className="toolbar-sticker-grid-compact" role="list" aria-label="Sticker emoji">
                      {PLACE_STICKER_PRESETS.map(ch => (
                        <button
                          key={ch}
                          type="button"
                          role="listitem"
                          className={`toolbar-sticker-cell-sm ${!selectedStickerAsset && settings.placeStickerChar === ch ? 'active' : ''}`}
                          title={ch}
                          onClick={() => updateSettings({ placeStickerChar: ch, placeStickerAssetId: null })}
                        >
                          <span className="toolbar-sticker-emoji-sm">{ch}</span>
                        </button>
                      ))}
                    </div>
                    {customStickerAssets.length > 0 && (
                      <>
                        <p className="toolbar-flyout-label">My images</p>
                        <div className="toolbar-sticker-grid-compact" role="list" aria-label="My sticker images">
                          {customStickerAssets.map(asset => (
                            <button
                              key={asset.id}
                              type="button"
                              role="listitem"
                              className={`toolbar-sticker-cell-sm toolbar-sticker-image-cell ${settings.placeStickerAssetId === asset.id ? 'active' : ''}`}
                              title={asset.name || 'Custom sticker'}
                              onClick={() => updateSettings({ placeStickerAssetId: asset.id })}
                            >
                              <img src={asset.storageKey} alt="" className="toolbar-sticker-image-sm" />
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                    <button
                      type="button"
                      className="toolbar-sticker-upload-btn"
                      disabled={stickerUploading || !boardState}
                      onClick={() => stickerFileRef.current?.click()}
                    >
                      {stickerUploading ? 'Adding image…' : '+ Add image sticker'}
                    </button>
                    {selectedStickerAsset ? (
                      <button
                        type="button"
                        className="toolbar-sticker-remove-btn"
                        onClick={() => {
                          const placedCopy = selectedStickerUseCount === 1 ? '1 placed copy' : `${selectedStickerUseCount} placed copies`
                          if (
                            window.confirm(
                              `Remove “${selectedStickerAsset.name || 'Custom sticker'}” and ${placedCopy}?`,
                            )
                          ) {
                            deleteImageAsset(selectedStickerAsset.id)
                          }
                        }}
                      >
                        Remove selected image
                      </button>
                    ) : null}
                    <input
                      ref={stickerFileRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      hidden
                      onChange={e => {
                        const file = e.target.files?.[0]
                        e.target.value = ''
                        void handleStickerFile(file)
                      }}
                    />
                    {stickerUploadError && (
                      <p className="toolbar-sticker-upload-error" role="alert">{stickerUploadError}</p>
                    )}
                  </>
                )}
                {settings.placeKind === 'memo' && (
                  <div className="toolbar-flyout-swatches" role="group" aria-label="Memo paper color">
                    {MEMO_PAPER_COLOR_PRESETS.map(c => (
                      <button
                        key={c}
                        type="button"
                        className={`toolbar-color-dot toolbar-color-dot--lg ${settings.placeMemoPaperColor === c ? 'active' : ''}`}
                        style={{ backgroundColor: c }}
                        title={`New memo: ${c}`}
                        onClick={() => updateSettings({ placeMemoPaperColor: c })}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <div className="toolbar-right">
        <button
          type="button"
          className="toolbar-btn"
          onClick={() => toggleRightPanel('settings')}
          title="Settings"
        >
          <IconSettings size={16} />
        </button>
      </div>
    </header>
  )
}
