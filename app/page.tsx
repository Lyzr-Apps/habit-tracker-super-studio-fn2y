'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { FiPlus, FiEdit2, FiTrash2, FiCheck, FiX, FiCalendar, FiBarChart2, FiList, FiHome, FiSearch, FiChevronLeft, FiChevronRight, FiTrendingUp, FiTrendingDown, FiTarget, FiAward, FiActivity, FiZap, FiStar, FiClock, FiMenu } from 'react-icons/fi'
import { HiOutlineFire, HiOutlineLightBulb, HiOutlineSparkles, HiOutlineChartBar } from 'react-icons/hi'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths, startOfWeek, endOfWeek, subDays } from 'date-fns'
import { cn } from '@/lib/utils'

// ─── Constants ───
const AGENT_ID = '6999606272a2e3b0eaab971b'
const LS_HABITS = 'habitflow_habits'
const LS_COMPLETIONS = 'habitflow_completions'

const CATEGORIES = ['Health', 'Study', 'Fitness', 'Work', 'Personal', 'Custom'] as const
type Category = (typeof CATEGORIES)[number]
type Frequency = 'daily' | 'weekly' | 'monthly'
type TabKey = 'dashboard' | 'calendar' | 'analytics' | 'manage'

const CATEGORY_COLORS: Record<string, string> = {
  Health: 'hsl(160, 75%, 50%)',
  Study: 'hsl(142, 65%, 45%)',
  Fitness: 'hsl(180, 55%, 50%)',
  Work: 'hsl(120, 50%, 50%)',
  Personal: 'hsl(200, 50%, 55%)',
  Custom: 'hsl(280, 50%, 55%)',
}

const CATEGORY_BG: Record<string, string> = {
  Health: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  Study: 'bg-green-500/20 text-green-400 border-green-500/30',
  Fitness: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  Work: 'bg-lime-500/20 text-lime-400 border-lime-500/30',
  Personal: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
  Custom: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
}

const CHART_COLORS = [
  'hsl(160, 75%, 50%)',
  'hsl(142, 65%, 45%)',
  'hsl(180, 55%, 50%)',
  'hsl(120, 50%, 50%)',
  'hsl(200, 50%, 55%)',
  'hsl(280, 50%, 55%)',
]

// ─── Interfaces ───
interface Habit {
  id: string
  name: string
  category: Category
  frequency: Frequency
  reminderTime: string
  createdAt: string
  color: string
}

interface CompletionRecord {
  habitId: string
  date: string
  completed: boolean
}

interface InsightsData {
  consistency_score: number
  score_label: string
  trend_analysis: string[]
  strengths: string[]
  improvements: string[]
  category_insights: Record<string, string>
}

// ─── Sample Data ───
function generateSampleData(): { habits: Habit[]; completions: CompletionRecord[] } {
  const sampleHabits: Habit[] = [
    { id: 's1', name: 'Morning Run', category: 'Fitness', frequency: 'daily', reminderTime: '06:30', createdAt: subDays(new Date(), 30).toISOString(), color: CATEGORY_COLORS.Fitness },
    { id: 's2', name: 'Read 30 Minutes', category: 'Study', frequency: 'daily', reminderTime: '21:00', createdAt: subDays(new Date(), 25).toISOString(), color: CATEGORY_COLORS.Study },
    { id: 's3', name: 'Meditate', category: 'Health', frequency: 'daily', reminderTime: '07:00', createdAt: subDays(new Date(), 20).toISOString(), color: CATEGORY_COLORS.Health },
    { id: 's4', name: 'Drink 8 Glasses Water', category: 'Health', frequency: 'daily', reminderTime: '08:00', createdAt: subDays(new Date(), 18).toISOString(), color: CATEGORY_COLORS.Health },
    { id: 's5', name: 'Review Work Goals', category: 'Work', frequency: 'weekly', reminderTime: '09:00', createdAt: subDays(new Date(), 15).toISOString(), color: CATEGORY_COLORS.Work },
  ]

  const completions: CompletionRecord[] = []
  for (let d = 0; d < 30; d++) {
    const dateStr = format(subDays(new Date(), d), 'yyyy-MM-dd')
    sampleHabits.forEach((h) => {
      const shouldComplete = Math.random() > (d < 7 ? 0.2 : 0.4)
      if (shouldComplete) {
        completions.push({ habitId: h.id, date: dateStr, completed: true })
      }
    })
  }
  return { habits: sampleHabits, completions }
}

// ─── Helper Functions ───
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9)
}

function calculateStreak(habitId: string, completions: CompletionRecord[]): number {
  const habitCompletions = completions
    .filter((c) => c.habitId === habitId && c.completed)
    .map((c) => c.date)
    .sort()
    .reverse()

  if (habitCompletions.length === 0) return 0

  let streak = 0
  let currentDate = new Date()
  currentDate.setHours(0, 0, 0, 0)

  const todayStr = format(currentDate, 'yyyy-MM-dd')
  const todayCompleted = habitCompletions.includes(todayStr)

  if (!todayCompleted) {
    currentDate = subDays(currentDate, 1)
  }

  while (true) {
    const dateStr = format(currentDate, 'yyyy-MM-dd')
    if (habitCompletions.includes(dateStr)) {
      streak++
      currentDate = subDays(currentDate, 1)
    } else {
      break
    }
  }

  return streak
}

function renderMarkdown(text: string) {
  if (!text) return null
  return (
    <div className="space-y-2">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### ')) return <h4 key={i} className="font-semibold text-sm mt-3 mb-1">{line.slice(4)}</h4>
        if (line.startsWith('## ')) return <h3 key={i} className="font-semibold text-base mt-3 mb-1">{line.slice(3)}</h3>
        if (line.startsWith('# ')) return <h2 key={i} className="font-bold text-lg mt-4 mb-2">{line.slice(2)}</h2>
        if (line.startsWith('- ') || line.startsWith('* ')) return <li key={i} className="ml-4 list-disc text-sm">{formatInline(line.slice(2))}</li>
        if (/^\d+\.\s/.test(line)) return <li key={i} className="ml-4 list-decimal text-sm">{formatInline(line.replace(/^\d+\.\s/, ''))}</li>
        if (!line.trim()) return <div key={i} className="h-1" />
        return <p key={i} className="text-sm">{formatInline(line)}</p>
      })}
    </div>
  )
}

function formatInline(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) => (i % 2 === 1 ? <strong key={i} className="font-semibold">{part}</strong> : part))
}

// ─── ErrorBoundary ───
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: '' }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
          <div className="text-center p-8 max-w-md">
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-4 text-sm">{this.state.error}</p>
            <button onClick={() => this.setState({ hasError: false, error: '' })} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm">Try again</button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// ─── Stat Card ───
function StatCard({ icon, label, value, sub, accent }: { icon: React.ReactNode; label: string; value: string | number; sub?: string; accent?: boolean }) {
  return (
    <Card className={cn('border border-border shadow-md', accent ? 'bg-secondary' : 'bg-card')}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={cn('flex items-center justify-center w-10 h-10 rounded-xl', accent ? 'bg-emerald-500/20 text-emerald-400' : 'bg-muted text-muted-foreground')}>
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground truncate">{label}</p>
            <p className="text-xl font-bold leading-tight">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Habit Card (Dashboard) ───
function HabitCard({ habit, completed, streak, onToggle }: { habit: Habit; completed: boolean; streak: number; onToggle: () => void }) {
  return (
    <Card className={cn('border border-border shadow-md transition-all duration-200', completed ? 'bg-secondary/60 border-emerald-500/30' : 'bg-card hover:border-muted-foreground/20')}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <Checkbox checked={completed} onCheckedChange={onToggle} className="h-5 w-5 rounded-md border-2 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500" />
          <div className="flex-1 min-w-0">
            <p className={cn('text-base font-semibold', completed && 'line-through text-muted-foreground')}>{habit.name}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className={cn('text-xs border', CATEGORY_BG[habit.category] ?? 'bg-muted text-muted-foreground')}>{habit.category}</Badge>
              <Badge variant="outline" className="text-xs border-border text-muted-foreground">{habit.frequency}</Badge>
            </div>
          </div>
          <div className="flex items-center gap-1 text-sm font-medium" style={{ color: 'hsl(160, 75%, 50%)' }}>
            <HiOutlineFire className="w-4 h-4" />
            <span>{streak}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Calendar Day Cell ───
function CalendarDayCell({ date, currentMonth, habits, completions, onSelect }: { date: Date; currentMonth: Date; habits: Habit[]; completions: CompletionRecord[]; onSelect: (d: Date) => void }) {
  const dateStr = format(date, 'yyyy-MM-dd')
  const inMonth = isSameMonth(date, currentMonth)
  const today = isToday(date)
  const dayCompletions = completions.filter((c) => c.date === dateStr && c.completed)
  const totalHabits = habits.length
  const completedCount = dayCompletions.length
  const allDone = totalHabits > 0 && completedCount >= totalHabits
  const partial = completedCount > 0 && completedCount < totalHabits

  return (
    <button onClick={() => onSelect(date)} className={cn('relative flex flex-col items-center justify-center p-1 h-12 md:h-14 rounded-xl transition-all duration-200 text-sm', inMonth ? 'text-foreground hover:bg-secondary' : 'text-muted-foreground/40', today && 'ring-2 ring-emerald-500/50 bg-secondary')}>
      <span className={cn('font-medium', today && 'text-emerald-400')}>{format(date, 'd')}</span>
      <div className="flex gap-0.5 mt-0.5">
        {allDone && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
        {partial && <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
      </div>
    </button>
  )
}

// ─── Main Page ───
export default function Page() {
  // Navigation state
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sampleDataEnabled, setSampleDataEnabled] = useState(false)

  // Data state
  const [habits, setHabits] = useState<Habit[]>([])
  const [completions, setCompletions] = useState<CompletionRecord[]>([])
  const [hydrated, setHydrated] = useState(false)

  // Calendar state
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  // Manage Habits state
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [habitDialogOpen, setHabitDialogOpen] = useState(false)
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [habitForm, setHabitForm] = useState({ name: '', category: 'Health' as Category, frequency: 'daily' as Frequency, reminderTime: '08:00' })

  // Analytics / AI state
  const [insightsLoading, setInsightsLoading] = useState(false)
  const [insightsData, setInsightsData] = useState<InsightsData | null>(null)
  const [insightsError, setInsightsError] = useState<string | null>(null)
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)

  // Status messages
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  // ─── Current date (stable reference) ───
  const [currentDate, setCurrentDate] = useState<string>('')
  useEffect(() => {
    setCurrentDate(format(new Date(), 'EEEE, MMMM d, yyyy'))
  }, [])

  // ─── Load data from localStorage ───
  useEffect(() => {
    try {
      const storedHabits = localStorage.getItem(LS_HABITS)
      const storedCompletions = localStorage.getItem(LS_COMPLETIONS)
      if (storedHabits) setHabits(JSON.parse(storedHabits))
      if (storedCompletions) setCompletions(JSON.parse(storedCompletions))
    } catch {
      // ignore parse errors
    }
    setHydrated(true)
  }, [])

  // ─── Persist data ───
  useEffect(() => {
    if (!hydrated) return
    if (!sampleDataEnabled) {
      localStorage.setItem(LS_HABITS, JSON.stringify(habits))
      localStorage.setItem(LS_COMPLETIONS, JSON.stringify(completions))
    }
  }, [habits, completions, hydrated, sampleDataEnabled])

  // ─── Sample data toggle ───
  const sampleDataRef = useRef<{ habits: Habit[]; completions: CompletionRecord[] } | null>(null)
  const realDataRef = useRef<{ habits: Habit[]; completions: CompletionRecord[] }>({ habits: [], completions: [] })

  const handleSampleToggle = useCallback((checked: boolean) => {
    if (checked) {
      realDataRef.current = { habits, completions }
      if (!sampleDataRef.current) {
        sampleDataRef.current = generateSampleData()
      }
      setHabits(sampleDataRef.current.habits)
      setCompletions(sampleDataRef.current.completions)
    } else {
      setHabits(realDataRef.current.habits)
      setCompletions(realDataRef.current.completions)
    }
    setSampleDataEnabled(checked)
  }, [habits, completions])

  // ─── Today's data ───
  const todayStr = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return format(d, 'yyyy-MM-dd')
  }, [])

  const todaysCompletions = useMemo(() => completions.filter((c) => c.date === todayStr && c.completed), [completions, todayStr])
  const todayProgress = useMemo(() => (habits.length === 0 ? 0 : Math.round((todaysCompletions.length / habits.length) * 100)), [habits.length, todaysCompletions.length])

  // ─── Streaks ───
  const streaksMap = useMemo(() => {
    const map: Record<string, number> = {}
    habits.forEach((h) => {
      map[h.id] = calculateStreak(h.id, completions)
    })
    return map
  }, [habits, completions])

  const bestStreak = useMemo(() => {
    const values = Object.values(streaksMap)
    return values.length > 0 ? Math.max(...values) : 0
  }, [streaksMap])

  // ─── Weekly trend ───
  const weeklyTrend = useMemo(() => {
    if (habits.length === 0) return 0
    const thisWeekStart = subDays(new Date(), 6)
    const lastWeekStart = subDays(new Date(), 13)
    const lastWeekEnd = subDays(new Date(), 7)

    let thisWeekCount = 0
    let lastWeekCount = 0
    completions.forEach((c) => {
      if (!c.completed) return
      const d = new Date(c.date)
      if (d >= thisWeekStart) thisWeekCount++
      if (d >= lastWeekStart && d <= lastWeekEnd) lastWeekCount++
    })
    return thisWeekCount - lastWeekCount
  }, [completions, habits.length])

  // ─── Toggle completion ───
  const toggleCompletion = useCallback((habitId: string, dateStr: string) => {
    setCompletions((prev) => {
      const existing = prev.find((c) => c.habitId === habitId && c.date === dateStr)
      if (existing) {
        if (existing.completed) {
          return prev.filter((c) => !(c.habitId === habitId && c.date === dateStr))
        }
        return prev.map((c) => (c.habitId === habitId && c.date === dateStr ? { ...c, completed: true } : c))
      }
      return [...prev, { habitId, date: dateStr, completed: true }]
    })
  }, [])

  // ─── Add / Edit Habit ───
  const openAddDialog = useCallback(() => {
    setEditingHabit(null)
    setHabitForm({ name: '', category: 'Health', frequency: 'daily', reminderTime: '08:00' })
    setHabitDialogOpen(true)
  }, [])

  const openEditDialog = useCallback((habit: Habit) => {
    setEditingHabit(habit)
    setHabitForm({ name: habit.name, category: habit.category, frequency: habit.frequency, reminderTime: habit.reminderTime })
    setHabitDialogOpen(true)
  }, [])

  const saveHabit = useCallback(() => {
    if (!habitForm.name.trim()) {
      setStatusMessage('Please enter a habit name.')
      setTimeout(() => setStatusMessage(null), 3000)
      return
    }
    if (editingHabit) {
      setHabits((prev) => prev.map((h) => (h.id === editingHabit.id ? { ...h, name: habitForm.name.trim(), category: habitForm.category, frequency: habitForm.frequency, reminderTime: habitForm.reminderTime, color: CATEGORY_COLORS[habitForm.category] ?? CATEGORY_COLORS.Custom } : h)))
      setStatusMessage('Habit updated successfully.')
    } else {
      const newHabit: Habit = {
        id: generateId(),
        name: habitForm.name.trim(),
        category: habitForm.category,
        frequency: habitForm.frequency,
        reminderTime: habitForm.reminderTime,
        createdAt: new Date().toISOString(),
        color: CATEGORY_COLORS[habitForm.category] ?? CATEGORY_COLORS.Custom,
      }
      setHabits((prev) => [...prev, newHabit])
      setStatusMessage('Habit added successfully.')
    }
    setHabitDialogOpen(false)
    setTimeout(() => setStatusMessage(null), 3000)
  }, [editingHabit, habitForm])

  const deleteHabit = useCallback((id: string) => {
    setHabits((prev) => prev.filter((h) => h.id !== id))
    setCompletions((prev) => prev.filter((c) => c.habitId !== id))
    setDeleteConfirmId(null)
    setStatusMessage('Habit deleted.')
    setTimeout(() => setStatusMessage(null), 3000)
  }, [])

  // ─── Calendar data ───
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(calendarMonth)
    const monthEnd = endOfMonth(calendarMonth)
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 })
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
    return eachDayOfInterval({ start: gridStart, end: gridEnd })
  }, [calendarMonth])

  const handleDateSelect = useCallback((date: Date) => {
    setSelectedDate(date)
    setSheetOpen(true)
  }, [])

  const selectedDateStr = useMemo(() => (selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''), [selectedDate])
  const selectedDateCompletions = useMemo(() => completions.filter((c) => c.date === selectedDateStr && c.completed), [completions, selectedDateStr])

  // ─── Analytics data ───
  const weeklyBarData = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const data: { day: string; completed: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = subDays(new Date(), i)
      const dateStr = format(d, 'yyyy-MM-dd')
      const count = completions.filter((c) => c.date === dateStr && c.completed).length
      data.push({ day: days[d.getDay()], completed: count })
    }
    return data
  }, [completions])

  const monthlyLineData = useMemo(() => {
    const data: { date: string; rate: number }[] = []
    for (let i = 29; i >= 0; i--) {
      const d = subDays(new Date(), i)
      const dateStr = format(d, 'yyyy-MM-dd')
      const total = habits.length
      const done = completions.filter((c) => c.date === dateStr && c.completed).length
      const rate = total > 0 ? Math.round((done / total) * 100) : 0
      data.push({ date: format(d, 'MM/dd'), rate })
    }
    return data
  }, [completions, habits.length])

  const categoryPieData = useMemo(() => {
    const catCounts: Record<string, number> = {}
    habits.forEach((h) => {
      catCounts[h.category] = (catCounts[h.category] ?? 0) + 1
    })
    return Object.entries(catCounts).map(([name, value]) => ({ name, value }))
  }, [habits])

  const overallCompletion = useMemo(() => {
    if (habits.length === 0) return 0
    const last30Days = Array.from({ length: 30 }, (_, i) => format(subDays(new Date(), i), 'yyyy-MM-dd'))
    const totalPossible = habits.length * 30
    const totalDone = last30Days.reduce((sum, dateStr) => sum + completions.filter((c) => c.date === dateStr && c.completed).length, 0)
    return totalPossible > 0 ? Math.round((totalDone / totalPossible) * 100) : 0
  }, [habits, completions])

  const activeStreaks = useMemo(() => Object.values(streaksMap).filter((s) => s > 0).length, [streaksMap])

  const topCategory = useMemo(() => {
    if (habits.length === 0) return '--'
    const catCounts: Record<string, number> = {}
    completions.filter((c) => c.completed).forEach((c) => {
      const habit = habits.find((h) => h.id === c.habitId)
      if (habit) catCounts[habit.category] = (catCounts[habit.category] ?? 0) + 1
    })
    const entries = Object.entries(catCounts)
    if (entries.length === 0) return '--'
    entries.sort((a, b) => b[1] - a[1])
    return entries[0][0]
  }, [habits, completions])

  // ─── Generate AI Insights ───
  const generateInsights = useCallback(async () => {
    setInsightsLoading(true)
    setInsightsError(null)
    setActiveAgentId(AGENT_ID)

    const habitSummary = habits.map((h) => {
      const streak = streaksMap[h.id] ?? 0
      const totalDone = completions.filter((c) => c.habitId === h.id && c.completed).length
      return `- ${h.name} (${h.category}, ${h.frequency}): streak=${streak} days, total_completions=${totalDone}`
    }).join('\n')

    const catStats = Object.entries(
      habits.reduce<Record<string, { total: number; completed: number }>>((acc, h) => {
        if (!acc[h.category]) acc[h.category] = { total: 0, completed: 0 }
        acc[h.category].total++
        acc[h.category].completed += completions.filter((c) => c.habitId === h.id && c.completed).length
        return acc
      }, {})
    ).map(([cat, stats]) => `${cat}: ${stats.total} habits, ${stats.completed} total completions`).join('; ')

    const message = `Analyze my habit tracking data and provide insights:

Total habits: ${habits.length}
Overall completion rate (30 days): ${overallCompletion}%
Active streaks: ${activeStreaks}
Best streak: ${bestStreak} days
Weekly trend: ${weeklyTrend >= 0 ? '+' : ''}${weeklyTrend} vs last week

Habits:
${habitSummary}

Category stats: ${catStats}

Please provide consistency_score (0-100), score_label, trend_analysis (2-3 observations), strengths (1-2), improvements (3-5 suggestions), and category_insights (one observation per category).`

    try {
      const result = await callAIAgent(message, AGENT_ID)
      if (result.success && result?.response?.result) {
        const data = result.response.result
        setInsightsData({
          consistency_score: typeof data.consistency_score === 'number' ? data.consistency_score : 0,
          score_label: typeof data.score_label === 'string' ? data.score_label : 'N/A',
          trend_analysis: Array.isArray(data.trend_analysis) ? data.trend_analysis : [],
          strengths: Array.isArray(data.strengths) ? data.strengths : [],
          improvements: Array.isArray(data.improvements) ? data.improvements : [],
          category_insights: data.category_insights && typeof data.category_insights === 'object' ? data.category_insights : {},
        })
      } else {
        setInsightsError(result?.error ?? 'Failed to generate insights. Please try again.')
      }
    } catch {
      setInsightsError('Network error. Please check your connection and try again.')
    } finally {
      setInsightsLoading(false)
      setActiveAgentId(null)
    }
  }, [habits, completions, streaksMap, overallCompletion, activeStreaks, bestStreak, weeklyTrend])

  // ─── Filtered habits for Manage ───
  const filteredHabits = useMemo(() => {
    return habits.filter((h) => {
      const matchesSearch = h.name.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = categoryFilter === 'all' || h.category === categoryFilter
      return matchesSearch && matchesCategory
    })
  }, [habits, searchQuery, categoryFilter])

  // ─── Nav Items ───
  const navItems: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: <FiHome className="w-5 h-5" /> },
    { key: 'calendar', label: 'Calendar', icon: <FiCalendar className="w-5 h-5" /> },
    { key: 'analytics', label: 'Analytics', icon: <FiBarChart2 className="w-5 h-5" /> },
    { key: 'manage', label: 'Manage', icon: <FiList className="w-5 h-5" /> },
  ]

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading HabitFlow...</div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background text-foreground flex">
        {/* ─── Sidebar (Desktop) ─── */}
        <aside className="hidden md:flex md:flex-col md:w-60 bg-card border-r border-border p-4 fixed h-full z-30">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <FiActivity className="w-5 h-5 text-emerald-400" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">HabitFlow</h1>
          </div>
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => (
              <button key={item.key} onClick={() => setActiveTab(item.key)} className={cn('flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200', activeTab === item.key ? 'bg-emerald-500/15 text-emerald-400' : 'text-muted-foreground hover:bg-secondary hover:text-foreground')}>
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>
          <div className="mt-auto pt-4">
            <Separator className="mb-4" />
            <Card className="bg-secondary/50 border-border">
              <CardContent className="p-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">Agent Status</p>
                <div className="flex items-center gap-2">
                  <div className={cn('w-2 h-2 rounded-full', activeAgentId ? 'bg-emerald-400 animate-pulse' : 'bg-muted-foreground/40')} />
                  <p className="text-xs text-muted-foreground">{activeAgentId ? 'Analyzing...' : 'Habit Insights Agent'}</p>
                </div>
                <p className="text-xs text-muted-foreground/60 mt-1 truncate">ID: {AGENT_ID}</p>
              </CardContent>
            </Card>
          </div>
        </aside>

        {/* ─── Mobile Sidebar Overlay ─── */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
            <aside className="absolute left-0 top-0 bottom-0 w-64 bg-card border-r border-border p-4 flex flex-col">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                    <FiActivity className="w-5 h-5 text-emerald-400" />
                  </div>
                  <h1 className="text-xl font-bold tracking-tight">HabitFlow</h1>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="p-1 rounded-lg hover:bg-secondary">
                  <FiX className="w-5 h-5" />
                </button>
              </div>
              <nav className="flex flex-col gap-1">
                {navItems.map((item) => (
                  <button key={item.key} onClick={() => { setActiveTab(item.key); setSidebarOpen(false) }} className={cn('flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200', activeTab === item.key ? 'bg-emerald-500/15 text-emerald-400' : 'text-muted-foreground hover:bg-secondary hover:text-foreground')}>
                    {item.icon}
                    {item.label}
                  </button>
                ))}
              </nav>
            </aside>
          </div>
        )}

        {/* ─── Main Content ─── */}
        <main className="flex-1 md:ml-60">
          {/* Header */}
          <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-lg border-b border-border px-4 md:px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button className="md:hidden p-2 rounded-xl hover:bg-secondary" onClick={() => setSidebarOpen(true)}>
                  <FiMenu className="w-5 h-5" />
                </button>
                <div>
                  <h2 className="text-lg font-bold capitalize">{activeTab}</h2>
                  <p className="text-xs text-muted-foreground">{currentDate}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Label htmlFor="sample-toggle" className="text-xs text-muted-foreground cursor-pointer">Sample Data</Label>
                <Switch id="sample-toggle" checked={sampleDataEnabled} onCheckedChange={handleSampleToggle} />
              </div>
            </div>
          </header>

          {/* Status message */}
          {statusMessage && (
            <div className="mx-4 md:mx-6 mt-3 px-4 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-sm flex items-center gap-2">
              <FiCheck className="w-4 h-4 flex-shrink-0" />
              {statusMessage}
            </div>
          )}

          <div className="p-4 md:p-6">
            {/* ═══════════════ DASHBOARD ═══════════════ */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                {/* Stats Row */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard icon={<FiTarget className="w-5 h-5" />} label="Today's Progress" value={`${todayProgress}%`} sub={`${todaysCompletions.length} of ${habits.length}`} accent />
                  <StatCard icon={<HiOutlineFire className="w-5 h-5" />} label="Best Streak" value={`${bestStreak}d`} sub="consecutive days" />
                  <StatCard icon={<FiCheck className="w-5 h-5" />} label="Completed Today" value={`${todaysCompletions.length}/${habits.length}`} />
                  <StatCard icon={weeklyTrend >= 0 ? <FiTrendingUp className="w-5 h-5" /> : <FiTrendingDown className="w-5 h-5" />} label="Weekly Trend" value={weeklyTrend >= 0 ? `+${weeklyTrend}` : `${weeklyTrend}`} sub="vs last week" />
                </div>

                {/* Progress Bar */}
                <Card className="border border-border shadow-md bg-card">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium">Daily Progress</p>
                      <p className="text-sm font-bold text-emerald-400">{todayProgress}%</p>
                    </div>
                    <Progress value={todayProgress} className="h-2" />
                  </CardContent>
                </Card>

                {/* Today's Habits */}
                <div>
                  <h3 className="text-base font-semibold mb-3">Today's Habits</h3>
                  {habits.length === 0 ? (
                    <Card className="border border-border shadow-md bg-card">
                      <CardContent className="p-8 text-center">
                        <FiTarget className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No habits yet</h3>
                        <p className="text-sm text-muted-foreground mb-4">Add your first habit to get started!</p>
                        <Button onClick={() => { setActiveTab('manage'); setTimeout(openAddDialog, 100) }} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                          <FiPlus className="w-4 h-4 mr-2" />
                          Add Habit
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <ScrollArea className="max-h-[500px]">
                      <div className="space-y-3">
                        {habits.map((habit) => {
                          const completed = todaysCompletions.some((c) => c.habitId === habit.id)
                          return (
                            <HabitCard key={habit.id} habit={habit} completed={completed} streak={streaksMap[habit.id] ?? 0} onToggle={() => toggleCompletion(habit.id, todayStr)} />
                          )
                        })}
                      </div>
                    </ScrollArea>
                  )}
                </div>

                {/* Floating Add Button */}
                {habits.length > 0 && (
                  <button onClick={() => { setActiveTab('manage'); setTimeout(openAddDialog, 100) }} className="fixed bottom-6 right-6 z-20 w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-900/30 flex items-center justify-center transition-all duration-200 hover:scale-105">
                    <FiPlus className="w-6 h-6" />
                  </button>
                )}
              </div>
            )}

            {/* ═══════════════ CALENDAR ═══════════════ */}
            {activeTab === 'calendar' && (
              <div className="space-y-4">
                <Card className="border border-border shadow-md bg-card">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <Button variant="ghost" size="sm" onClick={() => setCalendarMonth((m) => subMonths(m, 1))}>
                        <FiChevronLeft className="w-4 h-4" />
                      </Button>
                      <h3 className="text-base font-semibold">{format(calendarMonth, 'MMMM yyyy')}</h3>
                      <Button variant="ghost" size="sm" onClick={() => setCalendarMonth((m) => addMonths(m, 1))}>
                        <FiChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4">
                    {/* Day headers */}
                    <div className="grid grid-cols-7 gap-1 mb-1">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                        <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
                      ))}
                    </div>
                    {/* Day cells */}
                    <div className="grid grid-cols-7 gap-1">
                      {calendarDays.map((date, i) => (
                        <CalendarDayCell key={i} date={date} currentMonth={calendarMonth} habits={habits} completions={completions} onSelect={handleDateSelect} />
                      ))}
                    </div>
                    {/* Legend */}
                    <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" /> All done
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <div className="w-2 h-2 rounded-full bg-amber-500" /> Partial
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Day Sheet */}
                <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                  <SheetContent side="bottom" className="bg-card border-border rounded-t-2xl">
                    <SheetHeader>
                      <SheetTitle>{selectedDate ? format(selectedDate, 'EEEE, MMMM d, yyyy') : ''}</SheetTitle>
                      <SheetDescription>
                        {selectedDateCompletions.length} of {habits.length} habits completed
                      </SheetDescription>
                    </SheetHeader>
                    <div className="mt-4 space-y-3 max-h-[50vh] overflow-y-auto">
                      {habits.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">No habits to display.</p>
                      ) : (
                        habits.map((habit) => {
                          const isCompleted = selectedDateCompletions.some((c) => c.habitId === habit.id)
                          return (
                            <div key={habit.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50">
                              <Checkbox checked={isCompleted} onCheckedChange={() => { if (selectedDateStr) toggleCompletion(habit.id, selectedDateStr) }} className="h-5 w-5 rounded-md border-2 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500" />
                              <div className="flex-1">
                                <p className={cn('text-sm font-medium', isCompleted && 'line-through text-muted-foreground')}>{habit.name}</p>
                                <Badge variant="outline" className={cn('text-xs mt-0.5', CATEGORY_BG[habit.category] ?? '')}>{habit.category}</Badge>
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            )}

            {/* ═══════════════ ANALYTICS ═══════════════ */}
            {activeTab === 'analytics' && (
              <div className="space-y-6">
                {/* Stat Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard icon={<FiTarget className="w-5 h-5" />} label="Overall Completion" value={`${overallCompletion}%`} sub="Last 30 days" accent />
                  <StatCard icon={<HiOutlineSparkles className="w-5 h-5" />} label="AI Score" value={insightsData ? `${insightsData.consistency_score}` : '--'} sub={insightsData?.score_label ?? 'Not analyzed'} />
                  <StatCard icon={<HiOutlineFire className="w-5 h-5" />} label="Active Streaks" value={activeStreaks} sub={`of ${habits.length} habits`} />
                  <StatCard icon={<FiAward className="w-5 h-5" />} label="Top Category" value={topCategory} />
                </div>

                {/* Charts */}
                {habits.length === 0 ? (
                  <Card className="border border-border shadow-md bg-card">
                    <CardContent className="p-8 text-center">
                      <HiOutlineChartBar className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
                      <p className="text-sm text-muted-foreground">Add habits and track completions to see analytics.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Weekly Bar Chart */}
                    <Card className="border border-border shadow-md bg-card">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold">This Week</CardTitle>
                        <CardDescription className="text-xs">Daily completions</CardDescription>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <div className="h-48">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={weeklyBarData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(160, 22%, 15%)" />
                              <XAxis dataKey="day" tick={{ fill: 'hsl(160, 15%, 60%)', fontSize: 12 }} axisLine={{ stroke: 'hsl(160, 22%, 15%)' }} />
                              <YAxis tick={{ fill: 'hsl(160, 15%, 60%)', fontSize: 12 }} axisLine={{ stroke: 'hsl(160, 22%, 15%)' }} allowDecimals={false} />
                              <Tooltip contentStyle={{ backgroundColor: 'hsl(160, 30%, 9%)', border: '1px solid hsl(160, 22%, 15%)', borderRadius: '0.75rem', color: 'hsl(160, 20%, 95%)' }} />
                              <Bar dataKey="completed" fill="hsl(160, 75%, 50%)" radius={[6, 6, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>

                    {/* 30-Day Line Chart */}
                    <Card className="border border-border shadow-md bg-card">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold">30-Day Trend</CardTitle>
                        <CardDescription className="text-xs">Completion rate %</CardDescription>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <div className="h-48">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={monthlyLineData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(160, 22%, 15%)" />
                              <XAxis dataKey="date" tick={{ fill: 'hsl(160, 15%, 60%)', fontSize: 10 }} axisLine={{ stroke: 'hsl(160, 22%, 15%)' }} interval={6} />
                              <YAxis tick={{ fill: 'hsl(160, 15%, 60%)', fontSize: 12 }} axisLine={{ stroke: 'hsl(160, 22%, 15%)' }} domain={[0, 100]} />
                              <Tooltip contentStyle={{ backgroundColor: 'hsl(160, 30%, 9%)', border: '1px solid hsl(160, 22%, 15%)', borderRadius: '0.75rem', color: 'hsl(160, 20%, 95%)' }} />
                              <Line type="monotone" dataKey="rate" stroke="hsl(142, 65%, 45%)" strokeWidth={2} dot={false} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Category Pie Chart */}
                    <Card className="border border-border shadow-md bg-card">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold">Category Breakdown</CardTitle>
                        <CardDescription className="text-xs">Habits by category</CardDescription>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <div className="h-48">
                          {categoryPieData.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No data</div>
                          ) : (
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie data={categoryPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value" nameKey="name">
                                  {categoryPieData.map((entry, index) => (
                                    <Cell key={index} fill={CATEGORY_COLORS[entry.name] ?? CHART_COLORS[index % CHART_COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: 'hsl(160, 30%, 9%)', border: '1px solid hsl(160, 22%, 15%)', borderRadius: '0.75rem', color: 'hsl(160, 20%, 95%)' }} />
                                <Legend wrapperStyle={{ fontSize: '12px', color: 'hsl(160, 15%, 60%)' }} />
                              </PieChart>
                            </ResponsiveContainer>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* AI Insights Section */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <HiOutlineSparkles className="w-5 h-5 text-emerald-400" />
                      <h3 className="text-base font-semibold">AI Insights</h3>
                    </div>
                    <Button onClick={generateInsights} disabled={insightsLoading || habits.length === 0} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                      {insightsLoading ? (
                        <>
                          <FiActivity className="w-4 h-4 mr-2 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <HiOutlineSparkles className="w-4 h-4 mr-2" />
                          Generate Insights
                        </>
                      )}
                    </Button>
                  </div>

                  {habits.length === 0 && (
                    <Card className="border border-border shadow-md bg-card">
                      <CardContent className="p-6 text-center">
                        <p className="text-sm text-muted-foreground">Add habits and track them for a few days to generate AI insights.</p>
                      </CardContent>
                    </Card>
                  )}

                  {insightsError && (
                    <Card className="border border-destructive/30 shadow-md bg-card">
                      <CardContent className="p-4 flex items-center gap-3">
                        <FiX className="w-5 h-5 text-red-400 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm text-red-400">{insightsError}</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={generateInsights}>Retry</Button>
                      </CardContent>
                    </Card>
                  )}

                  {insightsLoading && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[1, 2, 3, 4].map((i) => (
                        <Card key={i} className="border border-border bg-card">
                          <CardContent className="p-4 space-y-3">
                            <Skeleton className="h-4 w-1/3" />
                            <Skeleton className="h-3 w-full" />
                            <Skeleton className="h-3 w-4/5" />
                            <Skeleton className="h-3 w-2/3" />
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}

                  {!insightsLoading && insightsData && (
                    <div className="space-y-4">
                      {/* Score Card */}
                      <Card className="border border-emerald-500/30 shadow-md bg-emerald-500/5">
                        <CardContent className="p-6">
                          <div className="flex items-center gap-6">
                            <div className="relative w-20 h-20 flex-shrink-0">
                              <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                                <circle cx="40" cy="40" r="35" fill="none" stroke="hsl(160, 22%, 15%)" strokeWidth="6" />
                                <circle cx="40" cy="40" r="35" fill="none" stroke="hsl(160, 75%, 50%)" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${(insightsData.consistency_score / 100) * 220} 220`} />
                              </svg>
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-lg font-bold">{insightsData.consistency_score}</span>
                              </div>
                            </div>
                            <div>
                              <h4 className="text-lg font-bold">Consistency Score</h4>
                              <Badge className="mt-1 bg-emerald-500/20 text-emerald-400 border-emerald-500/30">{insightsData.score_label}</Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Trend Analysis */}
                        <Card className="border border-border shadow-md bg-card">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                              <FiTrendingUp className="w-4 h-4 text-emerald-400" />
                              Trend Analysis
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-4 pt-0">
                            <ul className="space-y-2">
                              {insightsData.trend_analysis.map((item, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm">
                                  <FiActivity className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                                  <span className="text-muted-foreground">{item}</span>
                                </li>
                              ))}
                              {insightsData.trend_analysis.length === 0 && (
                                <p className="text-sm text-muted-foreground">No trend data available.</p>
                              )}
                            </ul>
                          </CardContent>
                        </Card>

                        {/* Strengths */}
                        <Card className="border border-border shadow-md bg-card">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                              <FiStar className="w-4 h-4 text-amber-400" />
                              Strengths
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-4 pt-0">
                            <ul className="space-y-2">
                              {insightsData.strengths.map((item, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm">
                                  <FiCheck className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                                  <span className="text-muted-foreground">{item}</span>
                                </li>
                              ))}
                              {insightsData.strengths.length === 0 && (
                                <p className="text-sm text-muted-foreground">No strengths data available.</p>
                              )}
                            </ul>
                          </CardContent>
                        </Card>

                        {/* Improvements */}
                        <Card className="border border-border shadow-md bg-card">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                              <HiOutlineLightBulb className="w-4 h-4 text-amber-400" />
                              Improvements
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-4 pt-0">
                            <ul className="space-y-2">
                              {insightsData.improvements.map((item, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm">
                                  <FiZap className="w-3.5 h-3.5 text-sky-400 mt-0.5 flex-shrink-0" />
                                  <span className="text-muted-foreground">{item}</span>
                                </li>
                              ))}
                              {insightsData.improvements.length === 0 && (
                                <p className="text-sm text-muted-foreground">No improvement suggestions available.</p>
                              )}
                            </ul>
                          </CardContent>
                        </Card>

                        {/* Category Insights */}
                        <Card className="border border-border shadow-md bg-card">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                              <HiOutlineChartBar className="w-4 h-4 text-emerald-400" />
                              Category Insights
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-4 pt-0">
                            {Object.keys(insightsData.category_insights).length === 0 ? (
                              <p className="text-sm text-muted-foreground">No category-specific insights available.</p>
                            ) : (
                              <div className="space-y-3">
                                {Object.entries(insightsData.category_insights).map(([cat, insight]) => (
                                  <div key={cat}>
                                    <Badge variant="outline" className={cn('text-xs mb-1', CATEGORY_BG[cat] ?? 'bg-muted text-muted-foreground')}>{cat}</Badge>
                                    <p className="text-sm text-muted-foreground">{typeof insight === 'string' ? insight : JSON.stringify(insight)}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ═══════════════ MANAGE HABITS ═══════════════ */}
            {activeTab === 'manage' && (
              <div className="space-y-4">
                {/* Search & Filter */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Search habits..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 bg-card border-border" />
                  </div>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-full sm:w-40 bg-card border-border">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={openAddDialog} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    <FiPlus className="w-4 h-4 mr-2" />
                    Add Habit
                  </Button>
                </div>

                {/* Habits List */}
                {filteredHabits.length === 0 ? (
                  <Card className="border border-border shadow-md bg-card">
                    <CardContent className="p-8 text-center">
                      <FiList className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">{habits.length === 0 ? 'No habits yet' : 'No matching habits'}</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        {habits.length === 0 ? 'Add your first habit to get started!' : 'Try adjusting your search or filter.'}
                      </p>
                      {habits.length === 0 && (
                        <Button onClick={openAddDialog} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                          <FiPlus className="w-4 h-4 mr-2" />
                          Add Habit
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <ScrollArea className="max-h-[600px]">
                    <div className="space-y-3">
                      {filteredHabits.map((habit) => (
                        <Card key={habit.id} className="border border-border shadow-md bg-card hover:border-muted-foreground/20 transition-all duration-200">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-4">
                              <div className="w-2 h-10 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[habit.category] ?? CATEGORY_COLORS.Custom }} />
                              <div className="flex-1 min-w-0">
                                <p className="text-base font-semibold truncate">{habit.name}</p>
                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                  <Badge variant="outline" className={cn('text-xs', CATEGORY_BG[habit.category] ?? '')}>{habit.category}</Badge>
                                  <Badge variant="outline" className="text-xs border-border text-muted-foreground">{habit.frequency}</Badge>
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <FiClock className="w-3 h-3" />
                                    {habit.reminderTime}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 text-sm font-medium mr-2" style={{ color: 'hsl(160, 75%, 50%)' }}>
                                <HiOutlineFire className="w-4 h-4" />
                                <span>{streaksMap[habit.id] ?? 0}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="sm" onClick={() => openEditDialog(habit)} className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground">
                                  <FiEdit2 className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => setDeleteConfirmId(habit.id)} className="h-8 w-8 p-0 text-muted-foreground hover:text-red-400">
                                  <FiTrash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            )}
          </div>
        </main>

        {/* ═══════════════ ADD / EDIT HABIT DIALOG ═══════════════ */}
        <Dialog open={habitDialogOpen} onOpenChange={setHabitDialogOpen}>
          <DialogContent className="bg-card border-border sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingHabit ? 'Edit Habit' : 'Add New Habit'}</DialogTitle>
              <DialogDescription>
                {editingHabit ? 'Update your habit details.' : 'Create a new habit to track.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label htmlFor="habit-name" className="text-sm">Name</Label>
                <Input id="habit-name" placeholder="e.g., Morning Run" value={habitForm.name} onChange={(e) => setHabitForm((prev) => ({ ...prev, name: e.target.value }))} className="mt-1 bg-secondary border-border" />
              </div>
              <div>
                <Label className="text-sm">Category</Label>
                <Select value={habitForm.category} onValueChange={(v) => setHabitForm((prev) => ({ ...prev, category: v as Category }))}>
                  <SelectTrigger className="mt-1 bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">Frequency</Label>
                <Select value={habitForm.frequency} onValueChange={(v) => setHabitForm((prev) => ({ ...prev, frequency: v as Frequency }))}>
                  <SelectTrigger className="mt-1 bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="reminder-time" className="text-sm">Reminder Time</Label>
                <Input id="reminder-time" type="time" value={habitForm.reminderTime} onChange={(e) => setHabitForm((prev) => ({ ...prev, reminderTime: e.target.value }))} className="mt-1 bg-secondary border-border" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setHabitDialogOpen(false)}>Cancel</Button>
              <Button onClick={saveHabit} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {editingHabit ? 'Update' : 'Add Habit'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ═══════════════ DELETE CONFIRMATION ═══════════════ */}
        <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null) }}>
          <AlertDialogContent className="bg-card border-border">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Habit</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this habit and all its completion records. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => { if (deleteConfirmId) deleteHabit(deleteConfirmId) }} className="bg-red-600 hover:bg-red-700 text-white">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </ErrorBoundary>
  )
}
