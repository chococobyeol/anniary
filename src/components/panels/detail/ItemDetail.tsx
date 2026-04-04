import { useState, useMemo, useEffect, useRef } from 'react'
import { useBoardStore } from '../../../store/board-store'
import {
  DEFAULT_TAG,
  RANGE_COLORS,
  clampTimelinePriority,
  TIMELINE_PRIORITY_MIN,
  TIMELINE_PRIORITY_MAX,
  COPY_PERIOD_COLOR_TIP,
  COPY_PERIOD_BAR_SECTION_TIP,
  COPY_PERIOD_BAR_HIDE_HINT,
  COPY_DISPLAY_ORDER_HINT,
  COPY_FIRST_PERIOD_SAVE_HINT,
} from './constants'
import { HelpTip } from './HelpTip'
import { MarkdownView } from '../../common/MarkdownView'
import { insertNewlineAtCursor } from '../../../utils/textareaNewline'
import type { ItemEntity, ItemRepeatRule, ItemStoredRepeat, Weekday1to7 } from '../../../types/entities'
import { parseDateKey } from '../../../utils/date'
import {
  formatRepeatRule,
  getEffectiveItemRepeat,
  mwohajiWeekdayFromDateKey,
} from '../../../utils/repeat'
import '../DetailPanel.css'

type RepeatKindUi = 'none' | ItemRepeatRule['kind']

const WEEKDAY_BTNS: { value: Weekday1to7; label: string }[] = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 7, label: 'Sun' },
]

function initRepeatEditor(item: ItemEntity | undefined) {
  const r = item ? getEffectiveItemRepeat(item) : undefined
  return {
    kind: (r?.kind ?? 'none') as RepeatKindUi,
    everyNDays: r?.kind === 'daily' ? r.everyNDays : 1,
    everyNWeeks: r?.kind === 'weekly' ? Math.max(1, r.everyNWeeks ?? 1) : 1,
    weekdays: (r?.kind === 'weekly' ? [...r.weekdays] : []) as Weekday1to7[],
    everyNMonths: r?.kind === 'monthly' ? Math.max(1, r.everyNMonths ?? 1) : 1,
    monthDays: r?.kind === 'monthly' ? [...r.monthDays] : [],
    everyNMinutes: r?.kind === 'interval' ? r.everyNMinutes : 30,
    intervalLimitStr: r?.kind === 'interval' && r.limit != null ? String(r.limit) : '',
    until: r && r.kind !== 'interval' && r.untilDate ? r.untilDate : '',
  }
}

function composeRepeatPatch(
  singleDay: boolean,
  kind: RepeatKindUi,
  startDate: string | undefined,
  everyNDays: number,
  everyNWeeks: number,
  weekdays: Weekday1to7[],
  everyNMonths: number,
  monthDays: number[],
  everyNMinutes: number,
  intervalLimitStr: string,
  until: string
): ItemStoredRepeat | undefined {
  if (!singleDay || kind === 'none' || !startDate) return undefined
  const u = until.trim() || undefined
  switch (kind) {
    case 'daily':
      return {
        kind: 'daily',
        everyNDays: Math.max(1, Math.floor(Number(everyNDays)) || 1),
        untilDate: u,
      }
    case 'weekly': {
      let wd = [...weekdays].filter(w => w >= 1 && w <= 7) as Weekday1to7[]
      if (wd.length === 0) wd = [mwohajiWeekdayFromDateKey(startDate)]
      const nw = Math.max(1, Math.floor(everyNWeeks) || 1)
      return {
        kind: 'weekly',
        weekdays: wd,
        ...(nw > 1 ? { everyNWeeks: nw } : {}),
        untilDate: u,
      }
    }
    case 'monthly': {
      let md = [...new Set(monthDays)].filter(d => d >= 1 && d <= 31)
      if (md.length === 0) md = [parseDateKey(startDate).day]
      const nm = Math.max(1, Math.floor(everyNMonths) || 1)
      return {
        kind: 'monthly',
        monthDays: md,
        ...(nm > 1 ? { everyNMonths: nm } : {}),
        untilDate: u,
      }
    }
    case 'yearly':
      return { kind: 'yearly', untilDate: u }
    case 'interval': {
      const mins = Math.max(1, Math.floor(Number(everyNMinutes)) || 30)
      const limStr = intervalLimitStr.trim()
      const limit = limStr ? Math.max(1, parseInt(limStr, 10) || 1) : undefined
      return { kind: 'interval', everyNMinutes: mins, limit }
    }
  }
}

/**
 * Rendered with key={itemId} so it remounts when selection changes.
 * Draft state is initialized from the store on mount — no sync useEffect needed.
 */
export function ItemDetail() {
  const selection = useBoardStore(s => s.selection)
  const activeBoardId = useBoardStore(s => s.activeBoardId)
  const items = useBoardStore(s => (s.activeBoardId ? s.boards[s.activeBoardId]?.items || {} : {}))
  const ranges = useBoardStore(s => (s.activeBoardId ? s.boards[s.activeBoardId]?.ranges || {} : {}))
  const updateItem = useBoardStore(s => s.updateItem)
  const deleteItem = useBoardStore(s => s.deleteItem)
  const createRange = useBoardStore(s => s.createRange)
  const updateRange = useBoardStore(s => s.updateRange)
  const deleteRange = useBoardStore(s => s.deleteRange)
  const setSelection = useBoardStore(s => s.setSelection)
  const toggleLeftPanel = useBoardStore(s => s.toggleLeftPanel)
  const setRangeEditPreview = useBoardStore(s => s.setRangeEditPreview)
  const showNewlineInsertButton = useBoardStore(s => s.settings.showNewlineInsertButton)
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null)

  const item = selection?.type === 'item' ? items[selection.itemId] : undefined
  const linkedRange = item?.rangeId ? ranges[item.rangeId] : undefined

  const [editContent, setEditContent] = useState(() => {
    if (!item) return ''
    const body = item.body ?? ''
    const title = item.title ?? ''
    return title ? (body ? `${title}\n${body}` : title) : body
  })
  const [editTag, setEditTag] = useState(() => (item?.tags?.[0]?.trim()) || DEFAULT_TAG)
  const [editDate, setEditDate] = useState(() => item?.date || '')
  const [editStartTime, setEditStartTime] = useState(() => item?.startTime || '')
  const [editEndTime, setEditEndTime] = useState(() => item?.endTime || '')
  const [editEndDate, setEditEndDate] = useState(() => item?.endDate || linkedRange?.endDate || item?.date || '')
  const [editPeriodColor, setEditPeriodColor] = useState<string | undefined>(() => linkedRange?.color)
  const [editTimelineBarHidden, setEditTimelineBarHidden] = useState(() => linkedRange?.timelineBarHidden === true)
  const [editTimelinePriority, setEditTimelinePriority] = useState(() => linkedRange?.timelinePriority ?? 0)
  const [editRepeatKind, setEditRepeatKind] = useState<RepeatKindUi>(() => initRepeatEditor(item).kind)
  const [editEveryNDays, setEditEveryNDays] = useState(() => initRepeatEditor(item).everyNDays)
  const [editEveryNWeeks, setEditEveryNWeeks] = useState(() => initRepeatEditor(item).everyNWeeks)
  const [editWeekdays, setEditWeekdays] = useState<Weekday1to7[]>(() => initRepeatEditor(item).weekdays)
  const [editEveryNMonths, setEditEveryNMonths] = useState(() => initRepeatEditor(item).everyNMonths)
  const [editMonthDays, setEditMonthDays] = useState<number[]>(() => initRepeatEditor(item).monthDays)
  const [editEveryNMinutes, setEditEveryNMinutes] = useState(() => initRepeatEditor(item).everyNMinutes)
  const [editIntervalLimitStr, setEditIntervalLimitStr] = useState(() => initRepeatEditor(item).intervalLimitStr)
  const [editRepeatUntil, setEditRepeatUntil] = useState(() => initRepeatEditor(item).until)

  const tagsFromItems = useMemo(() => {
    const tagSet = new Set<string>([DEFAULT_TAG])
    Object.values(items).forEach(it => {
      const t = it.tags?.[0]?.trim()
      if (t) tagSet.add(t)
    })
    return [...tagSet].sort((a, b) => (a === DEFAULT_TAG ? -1 : b === DEFAULT_TAG ? 1 : a.localeCompare(b)))
  }, [items])

  const itemRangeId = item?.rangeId
  useEffect(() => {
    if (!itemRangeId) {
      setRangeEditPreview(null)
      return
    }
    setRangeEditPreview({
      rangeId: itemRangeId,
      color: editPeriodColor,
      timelineBarHidden: editTimelineBarHidden,
      timelinePriority: clampTimelinePriority(editTimelinePriority),
      barStartTime: editStartTime.trim(),
      barEndTime: editEndTime.trim(),
    })
    return () => setRangeEditPreview(null)
  }, [itemRangeId, editPeriodColor, editTimelineBarHidden, editTimelinePriority, editStartTime, editEndTime, setRangeEditPreview])

  if (!selection || selection.type !== 'item') return null
  if (!item) {
    return (
      <div className="panel-placeholder">
        Item not found
        <button type="button" className="detail-cancel-btn" onClick={() => setSelection(null)}>Close</button>
      </div>
    )
  }

  const saveEdit = () => {
    if (!activeBoardId) return
    const state = useBoardStore.getState()
    const bs = state.boards[activeBoardId]
    if (!bs) return

    const trimmed = editContent.trim()
    const lines = trimmed.split('\n')
    const firstLine = lines[0] ?? ''
    const startDate = editDate.trim() || undefined
    const endInput = editEndDate.trim()
    const periodEnd =
      startDate && endInput && endInput >= startDate ? endInput : startDate
    const barStart = editStartTime.trim() || undefined
    const barEnd = editEndTime.trim() || undefined
    const pr = clampTimelinePriority(editTimelinePriority)
    setEditTimelinePriority(pr)
    const singleDay = Boolean(startDate && periodEnd === startDate)
    const repeatPatch = composeRepeatPatch(
      singleDay,
      editRepeatKind,
      startDate,
      editEveryNDays,
      editEveryNWeeks,
      editWeekdays,
      editEveryNMonths,
      editMonthDays,
      editEveryNMinutes,
      editIntervalLimitStr,
      editRepeatUntil
    )

    let newRangeId: string | undefined
    if (startDate && periodEnd) {
      const rangeOpts = {
        label: firstLine || undefined,
        color: editPeriodColor,
        timelineBarHidden: editTimelineBarHidden ? true : undefined,
        timelinePriority: pr !== 0 ? pr : undefined,
        barStartTime: barStart,
        barEndTime: barEnd,
      }
      if (item.rangeId && bs.ranges[item.rangeId]) {
        updateRange(item.rangeId, {
          startDate,
          endDate: periodEnd,
          ...rangeOpts,
        })
        newRangeId = item.rangeId
      } else {
        newRangeId = createRange(activeBoardId, 'period', startDate, periodEnd, rangeOpts)
      }
    } else {
      newRangeId = undefined
    }

    const restJoined = lines.length > 1 ? lines.slice(1).join('\n') : ''
    updateItem(item.id, {
      title: firstLine || undefined,
      body: restJoined.trim() ? restJoined : undefined,
      tags: [editTag.trim() || DEFAULT_TAG],
      date: startDate,
      endDate: periodEnd,
      rangeId: newRangeId,
      startTime: barStart,
      endTime: barEnd,
      repeat: repeatPatch,
    })

    const oldRid = item.rangeId
    if (oldRid && oldRid !== newRangeId) {
      const othersUse = Object.values(bs.items).some(it => it.id !== item.id && it.rangeId === oldRid)
      if (!othersUse) deleteRange(oldRid)
    }

    setRangeEditPreview(null)
    setSelection(null)
    toggleLeftPanel('backlog')
  }

  const cancelEdit = () => {
    setRangeEditPreview(null)
    setSelection(null)
    toggleLeftPanel('backlog')
  }

  const handleDelete = () => {
    setRangeEditPreview(null)
    deleteItem(item.id)
    setSelection(null)
    toggleLeftPanel('backlog')
  }

  const formatTime = (start?: string, end?: string) => {
    if (!start && !end) return null
    if (start && end) return `${start} ~ ${end}`
    return start || end
  }

  const headerTitle = editContent.trim().split('\n')[0] || '(untitled)'
  const draftEndForHeader = editEndDate.trim()
  const headerEndDate =
    draftEndForHeader && draftEndForHeader !== editDate.trim()
      ? draftEndForHeader
      : undefined
  const startDateStr = editDate.trim()
  const endInputStr = editEndDate.trim()
  const periodEndDraft =
    startDateStr && endInputStr && endInputStr >= startDateStr ? endInputStr : startDateStr
  const isSingleDay = Boolean(startDateStr && periodEndDraft === startDateStr)
  const draftRepeatPatch = composeRepeatPatch(
    isSingleDay,
    editRepeatKind,
    startDateStr || undefined,
    editEveryNDays,
    editEveryNWeeks,
    editWeekdays,
    editEveryNMonths,
    editMonthDays,
    editEveryNMinutes,
    editIntervalLimitStr,
    editRepeatUntil
  )
  const draftRepeatSummary =
    draftRepeatPatch && 'kind' in draftRepeatPatch ? formatRepeatRule(draftRepeatPatch) : null

  const draftHasPeriod = Boolean(
    editDate.trim() && (!editEndDate.trim() || editEndDate >= editDate)
  )
  const periodAccentColor = draftHasPeriod ? (editPeriodColor ?? linkedRange?.color) : undefined
  const showTimelineFields = Boolean(editDate.trim())

  return (
    <div className="detail-panel">
      <div
        className="detail-date-header"
        style={periodAccentColor ? { borderLeft: `3px solid ${periodAccentColor}`, paddingLeft: 8, marginLeft: -2 } : undefined}
      >
        <span className="detail-date-main">{headerTitle}</span>
        {editDate.trim() && (
          <span className="detail-date-dow">
            {headerEndDate ? `${editDate.trim()} – ${headerEndDate}` : editDate.trim()}
            {formatTime(editStartTime, editEndTime) && ` · ${formatTime(editStartTime, editEndTime)}`}
            {draftRepeatSummary && ` · ${draftRepeatSummary}`}
          </span>
        )}
      </div>

      <div className="detail-item-edit" onKeyDown={e => e.key === 'Escape' && cancelEdit()}>
        <label className="detail-time-label">Tag</label>
        <select className="detail-kind-select" value={editTag} onChange={e => setEditTag(e.target.value)}>
          {tagsFromItems.map(tag => (
            <option key={tag} value={tag}>{tag}</option>
          ))}
        </select>
        <label className="detail-time-label">Content</label>
        <div className="detail-md-input-row">
          <textarea
            ref={contentTextareaRef}
            className="detail-edit-body detail-edit-content-single"
            value={editContent}
            onChange={e => setEditContent(e.target.value)}
            placeholder="Line 1: title · following lines: body (markdown)"
            rows={6}
          />
          {showNewlineInsertButton ? (
            <button
              type="button"
              className="newline-insert-btn"
              title="Insert newline"
              aria-label="Insert newline"
              onMouseDown={e => e.preventDefault()}
              onClick={() => insertNewlineAtCursor(contentTextareaRef.current, setEditContent)}
            >
              ↵
            </button>
          ) : null}
        </div>
        {editContent.includes('\n') && editContent.split('\n').slice(1).join('\n').length > 0 ? (
          <div className="detail-markdown-preview-wrap">
            <span className="detail-add-label">Body preview</span>
            <MarkdownView source={editContent.split('\n').slice(1).join('\n')} />
          </div>
        ) : null}
        <label className="detail-time-label">Start date</label>
        <input type="date" className="detail-date-input" value={editDate} onChange={e => setEditDate(e.target.value)} />
        <div className="detail-time-row">
          <label className="detail-time-label">Start time</label>
          <input type="time" className="detail-time-input" value={editStartTime} onChange={e => setEditStartTime(e.target.value)} />
        </div>
        <div className="detail-time-row">
          <label className="detail-time-label">End time</label>
          <input type="time" className="detail-time-input" value={editEndTime} onChange={e => setEditEndTime(e.target.value)} />
        </div>
        <label className="detail-time-label">Period end date</label>
        <input type="date" className="detail-date-input" value={editEndDate} onChange={e => setEditEndDate(e.target.value)} placeholder="Optional" />
        <div className="range-field detail-repeat-block">
          <label className="detail-time-label" htmlFor={`item-repeat-${item.id}`}>Repeat</label>
          <select
            id={`item-repeat-${item.id}`}
            className="detail-kind-select"
            value={isSingleDay ? editRepeatKind : 'none'}
            disabled={!isSingleDay}
            onChange={e => {
              const v = e.target.value as RepeatKindUi
              setEditRepeatKind(v)
              const dk = editDate.trim()
              if (!dk) return
              if (v === 'weekly' && editWeekdays.length === 0) {
                setEditWeekdays([mwohajiWeekdayFromDateKey(dk)])
              }
              if (v === 'monthly' && editMonthDays.length === 0) {
                setEditMonthDays([parseDateKey(dk).day])
              }
            }}
          >
            <option value="none">None</option>
            <option value="daily">Every N days</option>
            <option value="weekly">Weekly (weekdays)</option>
            <option value="monthly">Monthly (dates)</option>
            <option value="yearly">Same date yearly</option>
            <option value="interval">Every N minutes</option>
          </select>
          {!isSingleDay && (
            <p className="detail-field-hint">Repeats (except minute-based) need a single-day item: start date = period end.</p>
          )}
          {isSingleDay && editRepeatKind === 'daily' && (
            <div className="detail-time-row detail-repeat-subrow">
              <label className="detail-time-label" htmlFor={`item-repeat-n-${item.id}`}>Every</label>
              <input
                id={`item-repeat-n-${item.id}`}
                type="number"
                min={1}
                className="detail-edit-title"
                style={{ maxWidth: '4.5rem' }}
                value={editEveryNDays}
                onChange={e => setEditEveryNDays(Math.max(1, parseInt(e.target.value, 10) || 1))}
              />
              <span className="detail-field-hint" style={{ margin: 0 }}>day(s)</span>
            </div>
          )}
          {isSingleDay && editRepeatKind === 'weekly' && (
            <div className="detail-time-row detail-repeat-subrow">
              <label className="detail-time-label" htmlFor={`item-repeat-nw-${item.id}`}>Every</label>
              <input
                id={`item-repeat-nw-${item.id}`}
                type="number"
                min={1}
                className="detail-edit-title"
                style={{ maxWidth: '4.5rem' }}
                value={editEveryNWeeks}
                onChange={e => setEditEveryNWeeks(Math.max(1, parseInt(e.target.value, 10) || 1))}
              />
              <span className="detail-field-hint" style={{ margin: 0 }}>week(s) (Mon-based phase from start date)</span>
            </div>
          )}
          {isSingleDay && editRepeatKind === 'weekly' && (
            <div className="detail-repeat-weekdays">
              {WEEKDAY_BTNS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  className={`detail-weekday-btn ${editWeekdays.includes(value) ? 'active' : ''}`}
                  onClick={() =>
                    setEditWeekdays(prev =>
                      prev.includes(value) ? prev.filter(x => x !== value) : [...prev, value].sort((a, b) => a - b)
                    )}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          {isSingleDay && editRepeatKind === 'monthly' && (
            <div className="detail-time-row detail-repeat-subrow">
              <label className="detail-time-label" htmlFor={`item-repeat-nm-${item.id}`}>Every</label>
              <input
                id={`item-repeat-nm-${item.id}`}
                type="number"
                min={1}
                className="detail-edit-title"
                style={{ maxWidth: '4.5rem' }}
                value={editEveryNMonths}
                onChange={e => setEditEveryNMonths(Math.max(1, parseInt(e.target.value, 10) || 1))}
              />
              <span className="detail-field-hint" style={{ margin: 0 }}>month(s) from start month</span>
            </div>
          )}
          {isSingleDay && editRepeatKind === 'monthly' && (
            <div className="detail-monthday-grid">
              {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                <button
                  key={d}
                  type="button"
                  className={`detail-monthday-btn ${editMonthDays.includes(d) ? 'active' : ''}`}
                  onClick={() =>
                    setEditMonthDays(prev =>
                      prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort((a, b) => a - b)
                    )}
                >
                  {d}
                </button>
              ))}
            </div>
          )}
          {isSingleDay && editRepeatKind === 'interval' && (
            <>
              <div className="detail-time-row detail-repeat-subrow">
                <label className="detail-time-label" htmlFor={`item-repeat-min-${item.id}`}>Every</label>
                <input
                  id={`item-repeat-min-${item.id}`}
                  type="number"
                  min={1}
                  max={1440}
                  className="detail-edit-title"
                  style={{ maxWidth: '4.5rem' }}
                  value={editEveryNMinutes}
                  onChange={e => setEditEveryNMinutes(Math.max(1, parseInt(e.target.value, 10) || 30))}
                />
                <span className="detail-field-hint" style={{ margin: 0 }}>minutes (same day; year board shows one bar on start date)</span>
              </div>
              <div className="detail-time-row detail-repeat-subrow">
                <label className="detail-time-label" htmlFor={`item-repeat-lim-${item.id}`}>Max count</label>
                <input
                  id={`item-repeat-lim-${item.id}`}
                  type="number"
                  min={1}
                  className="detail-edit-title"
                  style={{ maxWidth: '5rem' }}
                  placeholder="∞"
                  value={editIntervalLimitStr}
                  onChange={e => setEditIntervalLimitStr(e.target.value)}
                />
              </div>
            </>
          )}
          {isSingleDay && editRepeatKind !== 'none' && editRepeatKind !== 'interval' && (
            <>
              <label className="detail-time-label" htmlFor={`item-repeat-until-${item.id}`}>Repeat until</label>
              <input
                id={`item-repeat-until-${item.id}`}
                type="date"
                className="detail-date-input"
                value={editRepeatUntil}
                onChange={e => setEditRepeatUntil(e.target.value)}
                title="Empty = through Dec 31 of the board year"
              />
              <p className="detail-field-hint">Empty = through Dec 31 of this board year. Bars follow each occurrence.</p>
            </>
          )}
        </div>
        {showTimelineFields && (
          <>
            <div className="range-field">
              <div className="detail-label-row">
                <span className="detail-time-label">Period color</span>
                <HelpTip text={!item.rangeId ? `${COPY_PERIOD_COLOR_TIP} ${COPY_FIRST_PERIOD_SAVE_HINT}` : COPY_PERIOD_COLOR_TIP} />
              </div>
              <div className="range-color-picker">
                {RANGE_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    className={`range-color-swatch ${editPeriodColor === c ? 'active' : ''}`}
                    style={{ background: c }}
                    title={COPY_PERIOD_COLOR_TIP}
                    onClick={() => setEditPeriodColor(c)}
                  />
                ))}
              </div>
            </div>
            <div className="range-field">
              <div className="detail-label-row">
                <span className="detail-time-label">Period bar</span>
                <HelpTip text={COPY_PERIOD_BAR_SECTION_TIP} />
              </div>
              <label className="detail-checkbox-row" title={COPY_PERIOD_BAR_HIDE_HINT}>
                <input
                  type="checkbox"
                  checked={editTimelineBarHidden}
                  onChange={e => setEditTimelineBarHidden(e.target.checked)}
                />
                <span>Hide period bar on year board</span>
              </label>
            </div>
            <div className="range-field">
              <div className="detail-label-row">
                <label className="detail-time-label" htmlFor={`item-priority-${item.id}`}>Display order</label>
                <HelpTip text={COPY_DISPLAY_ORDER_HINT} />
              </div>
              <input
                id={`item-priority-${item.id}`}
                type="number"
                className="detail-edit-title"
                min={TIMELINE_PRIORITY_MIN}
                max={TIMELINE_PRIORITY_MAX}
                value={editTimelinePriority}
                onChange={e => setEditTimelinePriority(Number(e.target.value))}
                title={COPY_DISPLAY_ORDER_HINT}
              />
            </div>
          </>
        )}
        <div className="detail-edit-actions detail-edit-actions-item">
          <button className="detail-save-btn" onClick={saveEdit}>Save</button>
          <button className="detail-cancel-btn" onClick={cancelEdit}>Cancel</button>
          <button className="detail-cancel-btn danger" onClick={handleDelete}>Delete</button>
        </div>
      </div>
    </div>
  )
}
