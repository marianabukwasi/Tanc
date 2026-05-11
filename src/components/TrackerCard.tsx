'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronUp, Plus, Trash2, Check, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Task {
  id: string
  name: string
  done: boolean
}

export interface OppDetail {
  id: string
  title: string
  organization_name: string | null
  opportunity_type: string
  application_deadline: string | null
  is_archived: boolean | null
  is_rolling: boolean | null
  requires_motivation_letter: boolean | null
  requires_cv: boolean | null
  requires_transcripts: boolean | null
  requires_recommendations: boolean | null
  min_recommendations: number | null
  requires_passport: boolean | null
  country: string | null
}

export interface TrackerEntry {
  id: string
  user_id: string
  opportunity_id: string
  match_score: number | null
  status: string | null
  notes: string | null
  tasks: Task[] | null
  created_at: string
  opportunities: OppDetail
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const STATUS_OPTIONS = [
  'Saved',
  'Researching',
  'Gathering Documents',
  'Writing Application',
  'Submitted',
  'Awaiting Decision',
  'Accepted',
  'Rejected',
  'Withdrawn',
]

const TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  Scholarships:          { bg: '#eff6ff', color: '#1d4ed8' },
  Fellowships:           { bg: '#f5f3ff', color: '#7c3aed' },
  Internships:           { bg: '#f0fdf4', color: '#15803d' },
  Conferences:           { bg: '#fdf4ff', color: '#a21caf' },
  Competitions:          { bg: '#fff1f2', color: '#be123c' },
  Grants:                { bg: '#fff7ed', color: '#c2410c' },
  'Exchange Programs':   { bg: '#f0f9ff', color: '#0369a1' },
  'Writing Retreats':    { bg: '#fef9c3', color: '#854d0e' },
  'Wellness Retreats':   { bg: '#f0fdf4', color: '#166534' },
  'Sports Events':       { bg: '#fff1f2', color: '#9f1239' },
  'Sports Camps':        { bg: '#fdf2f8', color: '#86198f' },
  'Cultural Events':     { bg: '#ecfdf5', color: '#065f46' },
  'Leadership Programs': { bg: '#fefce8', color: '#92400e' },
  'Volunteer Programs':  { bg: '#f0fdf4', color: '#15803d' },
  'Workshops & Training':{ bg: '#f8fafc', color: '#334155' },
  'Online Opportunities':{ bg: '#eff6ff', color: '#1d4ed8' },
  Camps:                 { bg: '#fdf4ff', color: '#a21caf' },
  Residencies:           { bg: '#fff7ed', color: '#c2410c' },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildDefaultTasks(opp: OppDetail): Task[] {
  const tasks: Task[] = []
  if (opp.requires_motivation_letter) tasks.push({ id: 'motivation_letter', name: 'Write motivation letter', done: false })
  if (opp.requires_cv)               tasks.push({ id: 'cv',                name: 'Update CV/Resume', done: false })
  if (opp.requires_transcripts)      tasks.push({ id: 'transcripts',       name: 'Request official transcripts', done: false })
  if (opp.requires_recommendations) {
    const n = opp.min_recommendations ?? 1
    tasks.push({ id: 'recommendations', name: `Request ${n} recommendation letter${n !== 1 ? 's' : ''}`, done: false })
  }
  if (opp.requires_passport) tasks.push({ id: 'passport', name: 'Check passport is valid', done: false })
  tasks.push({ id: 'submit', name: 'Submit application', done: false })
  return tasks
}

// ─── TrackerCard ──────────────────────────────────────────────────────────────

export default function TrackerCard({ entry, onRemove, onUpdate }: {
  entry: TrackerEntry
  onRemove: (id: string) => void
  onUpdate: (id: string, patch: Partial<Pick<TrackerEntry, 'status' | 'notes' | 'tasks'>>) => void
}) {
  const opp = entry.opportunities

  const [tasks, setTasks]           = useState<Task[]>(entry.tasks?.length ? entry.tasks : [])
  const [notes, setNotes]           = useState(entry.notes ?? '')
  const [status, setStatus]         = useState(entry.status ?? 'Saved')
  const [expanded, setExpanded]     = useState(false)
  const [newTask, setNewTask]       = useState('')
  const [showConfirm, setShowConfirm] = useState(false)
  const [saving, setSaving]         = useState(false)

  // Initialise tasks from DB or generate defaults on first render
  useEffect(() => {
    if (entry.tasks && entry.tasks.length > 0) {
      setTasks(entry.tasks)
    } else {
      const generated = buildDefaultTasks(opp)
      setTasks(generated)
      supabase.from('user_opportunities').update({ tasks: generated }).eq('id', entry.id).then(() => {})
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function persistTasks(next: Task[]) {
    setTasks(next)
    onUpdate(entry.id, { tasks: next })
    await supabase.from('user_opportunities').update({ tasks: next }).eq('id', entry.id)
  }

  async function toggleTask(taskId: string) {
    await persistTasks(tasks.map(t => t.id === taskId ? { ...t, done: !t.done } : t))
  }

  async function addTask() {
    const name = newTask.trim()
    if (!name) return
    const task: Task = { id: `custom_${Date.now()}`, name, done: false }
    await persistTasks([...tasks, task])
    setNewTask('')
  }

  async function removeTask(taskId: string) {
    await persistTasks(tasks.filter(t => t.id !== taskId))
  }

  async function handleStatusChange(val: string) {
    setStatus(val)
    onUpdate(entry.id, { status: val })
    await supabase.from('user_opportunities').update({ status: val }).eq('id', entry.id)
  }

  async function saveNotes() {
    if (saving) return
    setSaving(true)
    onUpdate(entry.id, { notes })
    await supabase.from('user_opportunities').update({ notes }).eq('id', entry.id)
    setSaving(false)
  }

  async function handleRemove() {
    await supabase.from('user_opportunities').delete().eq('id', entry.id)
    onRemove(entry.id)
  }

  const done  = tasks.filter(t => t.done).length
  const total = tasks.length
  const pct   = total ? Math.round((done / total) * 100) : 0
  const barColor = pct === 100 ? '#15803d' : pct >= 60 ? '#d4a017' : '#3b82f6'

  const days = opp.application_deadline
    ? Math.ceil((new Date(opp.application_deadline).getTime() - Date.now()) / 86400000)
    : null

  const deadlineLabel =
    opp.is_archived         ? 'Deadline Passed'
    : opp.is_rolling        ? 'Rolling / Open'
    : days === null         ? 'No deadline set'
    : days < 0              ? 'Deadline Passed'
    : days === 0            ? 'Due today!'
    : `${days} day${days !== 1 ? 's' : ''} left`

  const deadlineColor = opp.is_archived || (days !== null && days < 0) ? '#94a3b8'
    : days !== null && days <= 7 ? '#dc2626'
    : '#64748b'

  const badge = TYPE_COLORS[opp.opportunity_type] ?? { bg: '#f1f5f9', color: '#475569' }

  const scoreColor =
    entry.match_score !== null && entry.match_score >= 90 ? '#15803d'
    : entry.match_score !== null && entry.match_score >= 60 ? '#92400e'
    : '#475569'
  const scoreBg =
    entry.match_score !== null && entry.match_score >= 90 ? '#dcfce7'
    : entry.match_score !== null && entry.match_score >= 60 ? '#fef9c3'
    : '#f1f5f9'

  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: '14px', backgroundColor: '#fff', overflow: 'hidden' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ padding: '18px 20px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '10px' }}>

          {/* Left: badges + title + org + deadline */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 9px', borderRadius: '20px', backgroundColor: badge.bg, color: badge.color }}>
                {opp.opportunity_type}
              </span>
              {entry.match_score !== null && (
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 9px', borderRadius: '20px', backgroundColor: scoreBg, color: scoreColor }}>
                  {entry.match_score}% match
                </span>
              )}
            </div>

            <Link
              href={`/opportunities/${opp.id}`}
              style={{ fontSize: '15px', fontWeight: 700, color: '#0a1628', textDecoration: 'none', lineHeight: 1.3, display: 'block', marginBottom: '3px' }}
            >
              {opp.title}
            </Link>

            {opp.organization_name && (
              <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '6px' }}>{opp.organization_name}</div>
            )}

            <div style={{ fontSize: '12px', fontWeight: 600, color: deadlineColor }}>{deadlineLabel}</div>
          </div>

          {/* Right: status dropdown + remove */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', flexShrink: 0 }}>
            <select
              value={status}
              onChange={e => handleStatusChange(e.target.value)}
              style={{
                padding: '5px 10px', borderRadius: '8px', border: '1px solid #e2e8f0',
                fontSize: '12px', fontWeight: 600, color: '#0a1628', cursor: 'pointer',
                backgroundColor: '#f8fafc', fontFamily: 'inherit',
              }}
            >
              {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
            </select>

            {showConfirm ? (
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={handleRemove}
                  style={{ padding: '4px 10px', borderRadius: '6px', border: 'none', backgroundColor: '#dc2626', color: '#fff', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Remove
                </button>
                <button
                  onClick={() => setShowConfirm(false)}
                  style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', backgroundColor: '#fff', fontSize: '11px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowConfirm(true)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', padding: '2px 4px', fontFamily: 'inherit' }}
              >
                <Trash2 size={12} /> Remove
              </button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>{done} / {total} tasks complete</span>
            <span style={{ fontSize: '11px', fontWeight: 700, color: barColor }}>{pct}%</span>
          </div>
          <div style={{ height: '6px', backgroundColor: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, backgroundColor: barColor, borderRadius: '3px', transition: 'width 0.3s ease' }} />
          </div>
        </div>
      </div>

      {/* ── Tasks (collapsible) ─────────────────────────────────────────────── */}
      <div style={{ borderTop: '1px solid #f1f5f9', padding: '0 20px' }}>
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            width: '100%', padding: '10px 0', background: 'none', border: 'none',
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
            Tasks
          </span>
          {expanded ? <ChevronUp size={13} color="#94a3b8" /> : <ChevronDown size={13} color="#94a3b8" />}
        </button>

        {expanded && (
          <div style={{ paddingBottom: '14px' }}>
            {tasks.map(task => (
              <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '5px 0' }}>
                <button
                  onClick={() => toggleTask(task.id)}
                  style={{
                    width: '18px', height: '18px', borderRadius: '4px', flexShrink: 0,
                    border: `2px solid ${task.done ? '#d4a017' : '#cbd5e1'}`,
                    backgroundColor: task.done ? '#d4a017' : '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', padding: 0, transition: 'all 0.15s',
                  }}
                >
                  {task.done && <Check size={10} color="#fff" />}
                </button>
                <span style={{
                  flex: 1, fontSize: '13px', lineHeight: 1.4,
                  color: task.done ? '#94a3b8' : '#334155',
                  textDecoration: task.done ? 'line-through' : 'none',
                }}>
                  {task.name}
                </span>
                {task.id.startsWith('custom_') && (
                  <button
                    onClick={() => removeTask(task.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1', padding: '2px', display: 'flex', lineHeight: 1 }}
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            ))}

            {/* Add custom task */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              <input
                type="text"
                value={newTask}
                onChange={e => setNewTask(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addTask() }}
                placeholder="Add a task…"
                style={{
                  flex: 1, padding: '7px 10px', borderRadius: '8px',
                  border: '1px solid #e2e8f0', fontSize: '12px',
                  fontFamily: 'inherit', outline: 'none', color: '#334155',
                }}
              />
              <button
                onClick={addTask}
                style={{
                  padding: '7px 12px', borderRadius: '8px', border: 'none',
                  backgroundColor: '#d4a017', color: '#fff', cursor: 'pointer',
                  display: 'flex', alignItems: 'center',
                }}
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Notes ──────────────────────────────────────────────────────────── */}
      <div style={{ borderTop: '1px solid #f1f5f9', padding: '12px 20px 16px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '8px' }}>
          Notes
        </div>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          onBlur={saveNotes}
          placeholder="Notes, links, reminders…"
          rows={2}
          style={{
            width: '100%', padding: '8px 10px', borderRadius: '8px',
            border: '1px solid #e2e8f0', fontSize: '13px',
            fontFamily: 'inherit', resize: 'vertical', outline: 'none',
            color: '#334155', boxSizing: 'border-box',
          }}
        />
      </div>
    </div>
  )
}
