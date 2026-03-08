"use client"

import { useState } from "react"
import { useLocale } from "@/lib/locale-context"
import { formatTime } from "@/lib/format"
import { createClient } from "@/lib/supabase/client"
import { OWNER_ID } from "@/lib/constants"
import { Plus, ChevronLeft, ChevronRight, ArrowLeft, Trash2, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import useSWR, { mutate } from "swr"

type Schedule = {
  id: string
  title: string
  description: string | null
  start_time: string
  end_time: string | null
  is_all_day: boolean
  reminder_minutes: number | null
  color: string
}

function getWeekDates(base: Date) {
  const start = new Date(base)
  start.setDate(start.getDate() - start.getDay())
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    return d
  })
}

function toDateKey(d: Date) {
  return d.toISOString().split("T")[0]
}

async function fetchSchedules(weekStart: string, weekEnd: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from("schedules")
    .select("*")
    .eq("user_id", OWNER_ID)
    .gte("start_time", `${weekStart}T00:00:00`)
    .lte("start_time", `${weekEnd}T23:59:59`)
    .order("start_time")
  return data || []
}

const COLORS = ["#3b82f6", "#ef4444", "#f97316", "#84cc16", "#06b6d4", "#8b5cf6", "#ec4899"]

export function ScheduleView() {
  const { t, locale } = useLocale()
  const [baseDate, setBaseDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Schedule | null>(null)

  const weekDates = getWeekDates(baseDate)
  const weekStart = toDateKey(weekDates[0])
  const weekEnd = toDateKey(weekDates[6])
  const { data: schedules, isLoading } = useSWR(`schedules-${weekStart}`, () => fetchSchedules(weekStart, weekEnd))

  const selectedKey = toDateKey(selectedDate)
  const daySchedules = (schedules || []).filter((s) => s.start_time.startsWith(selectedKey))

  const dayNames = locale === "zh-TW"
    ? ["日", "一", "二", "三", "四", "五", "六"]
    : ["S", "M", "T", "W", "T", "F", "S"]

  function prevWeek() {
    const d = new Date(baseDate)
    d.setDate(d.getDate() - 7)
    setBaseDate(d)
  }
  function nextWeek() {
    const d = new Date(baseDate)
    d.setDate(d.getDate() + 7)
    setBaseDate(d)
  }

  function handleClose() {
    setShowForm(false)
    setEditing(null)
  }

  async function handleSaved() {
    handleClose()
    mutate(`schedules-${weekStart}`)
  }

  if (showForm) {
    return (
      <ScheduleForm
        schedule={editing}
        selectedDate={selectedDate}
        onClose={handleClose}
        onSaved={handleSaved}
      />
    )
  }

  const todayKey = toDateKey(new Date())

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-foreground">{t.schedule.title}</h1>
        <button
          onClick={() => { setSelectedDate(new Date()); setBaseDate(new Date()) }}
          className="rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground"
        >
          {locale === "zh-TW" ? "今天" : "Today"}
        </button>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <button onClick={prevWeek} className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="text-sm font-medium text-foreground">
          {new Intl.DateTimeFormat(locale === "zh-TW" ? "zh-TW" : "en-US", { month: "long", year: "numeric" }).format(weekDates[3])}
        </span>
        <button onClick={nextWeek} className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Week Days */}
      <div className="grid grid-cols-7 gap-1">
        {weekDates.map((d, i) => {
          const key = toDateKey(d)
          const isSelected = key === selectedKey
          const isToday = key === todayKey
          const hasEvents = (schedules || []).some((s) => s.start_time.startsWith(key))
          return (
            <button
              key={key}
              onClick={() => setSelectedDate(d)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl py-2 transition-colors",
                isSelected ? "bg-primary text-primary-foreground" : "text-foreground"
              )}
            >
              <span className={cn("text-[10px]", isSelected ? "text-primary-foreground/70" : "text-muted-foreground")}>
                {dayNames[i]}
              </span>
              <span className={cn("text-sm font-semibold", isToday && !isSelected && "text-primary")}>
                {d.getDate()}
              </span>
              {hasEvents && !isSelected && (
                <div className="h-1 w-1 rounded-full bg-primary" />
              )}
            </button>
          )
        })}
      </div>

      {/* Day Events */}
      {isLoading ? (
        <div className="flex flex-col gap-2">
          {[1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-secondary" />)}
        </div>
      ) : daySchedules.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12">
          <Clock className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t.schedule.noEvents}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {daySchedules.map((schedule) => (
            <button
              key={schedule.id}
              onClick={() => { setEditing(schedule); setShowForm(true) }}
              className="flex items-start gap-3 rounded-xl bg-card p-3 border border-border text-left transition-colors active:bg-secondary"
            >
              <div className="mt-1 h-8 w-1 rounded-full" style={{ backgroundColor: schedule.color }} />
              <div className="flex flex-1 flex-col gap-0.5">
                <span className="text-sm font-medium text-foreground">{schedule.title}</span>
                {schedule.is_all_day ? (
                  <span className="text-xs text-muted-foreground">{locale === "zh-TW" ? "全天" : "All day"}</span>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    {formatTime(schedule.start_time, locale)}
                    {schedule.end_time && ` - ${formatTime(schedule.end_time, locale)}`}
                  </span>
                )}
                {schedule.description && (
                  <span className="text-xs text-muted-foreground line-clamp-1">{schedule.description}</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => { setEditing(null); setShowForm(true) }}
        className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95"
        aria-label={t.schedule.add}
      >
        <Plus className="h-6 w-6" />
      </button>
    </div>
  )
}

/* Schedule Form */
function ScheduleForm({
  schedule,
  selectedDate,
  onClose,
  onSaved,
}: {
  schedule: Schedule | null
  selectedDate: Date
  onClose: () => void
  onSaved: () => void
}) {
  const { t, locale } = useLocale()
  const isEditing = !!schedule

  const defaultDate = toDateKey(selectedDate)
  const [title, setTitle] = useState(schedule?.title || "")
  const [description, setDescription] = useState(schedule?.description || "")
  const [isAllDay, setIsAllDay] = useState(schedule?.is_all_day || false)
  const [startDate, setStartDate] = useState(schedule ? schedule.start_time.split("T")[0] : defaultDate)
  const [startTime, setStartTime] = useState(schedule ? schedule.start_time.slice(11, 16) : "09:00")
  const [endTime, setEndTime] = useState(schedule?.end_time ? schedule.end_time.slice(11, 16) : "10:00")
  const [color, setColor] = useState(schedule?.color || COLORS[0])
  const [saving, setSaving] = useState(false)
  const [showDelete, setShowDelete] = useState(false)

  async function handleSave() {
    if (!title) return
    setSaving(true)
    try {
      const supabase = createClient()

      const start = isAllDay ? `${startDate}T00:00:00` : `${startDate}T${startTime}:00`
      const end = isAllDay ? null : `${startDate}T${endTime}:00`

      const payload = {
        user_id: OWNER_ID,
        title,
        description: description || null,
        start_time: start,
        end_time: end,
        is_all_day: isAllDay,
        color,
      }

      if (isEditing) {
        await supabase.from("schedules").update(payload).eq("id", schedule.id)
      } else {
        await supabase.from("schedules").insert(payload)
      }
      onSaved()
    } catch (err) {
      console.error("Save schedule error:", err)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!schedule) return
    setSaving(true)
    try {
      const supabase = createClient()
      await supabase.from("schedules").delete().eq("id", schedule.id)
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-5 p-4">
      <div className="flex items-center gap-3">
        <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold text-foreground">{isEditing ? t.schedule.edit : t.schedule.add}</h1>
        {isEditing && (
          <button onClick={() => setShowDelete(true)} className="ml-auto flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <Trash2 className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-foreground">{t.schedule.eventTitle}</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="h-12 rounded-xl bg-card border border-border px-4 text-foreground text-base"
          autoFocus
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-foreground">{t.schedule.startTime}</label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="h-12 rounded-xl bg-card border border-border px-4 text-foreground text-base"
        />
      </div>

      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-foreground">{t.schedule.allDay}</label>
        <button
          onClick={() => setIsAllDay(!isAllDay)}
          className={cn(
            "relative h-7 w-12 rounded-full transition-colors",
            isAllDay ? "bg-primary" : "bg-secondary"
          )}
        >
          <span className={cn(
            "absolute top-0.5 h-6 w-6 rounded-full bg-card shadow transition-transform",
            isAllDay ? "translate-x-5" : "translate-x-0.5"
          )} />
        </button>
      </div>

      {!isAllDay && (
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-foreground">{t.schedule.startTime}</label>
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
              className="h-12 rounded-xl bg-card border border-border px-4 text-foreground text-base" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-foreground">{t.schedule.endTime}</label>
            <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)}
              className="h-12 rounded-xl bg-card border border-border px-4 text-foreground text-base" />
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-foreground">{locale === "zh-TW" ? "備註" : "Note"}</label>
        <input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
          placeholder={locale === "zh-TW" ? "選填" : "Optional"}
          className="h-12 rounded-xl bg-card border border-border px-4 text-foreground text-base placeholder:text-muted-foreground/50" />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-foreground">{locale === "zh-TW" ? "顏色" : "Color"}</label>
        <div className="flex gap-2">
          {COLORS.map((c) => (
            <button key={c} onClick={() => setColor(c)}
              className={cn("h-8 w-8 rounded-full transition-transform", color === c && "scale-125 ring-2 ring-foreground ring-offset-2 ring-offset-background")}
              style={{ backgroundColor: c }} />
          ))}
        </div>
      </div>

      <button onClick={handleSave} disabled={saving || !title}
        className="flex h-12 items-center justify-center rounded-xl bg-primary text-primary-foreground font-medium disabled:opacity-40">
        {saving ? t.common.loading : t.schedule.save}
      </button>

      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/30 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-card p-6 flex flex-col gap-4 border border-border">
            <p className="text-center text-sm text-foreground">
              {locale === "zh-TW" ? "確定要刪除這個行程嗎？" : "Delete this event?"}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowDelete(false)} className="flex-1 h-11 rounded-xl bg-secondary text-secondary-foreground font-medium">{t.common.cancel}</button>
              <button onClick={handleDelete} disabled={saving} className="flex-1 h-11 rounded-xl bg-destructive text-white font-medium">
                {saving ? t.common.loading : t.common.delete}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
