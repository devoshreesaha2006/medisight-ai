import React, { useEffect, useState } from 'react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'
import { Layers, EyeOff, Eye, Activity, Lock, Stethoscope, MapPin, TrendingUp } from 'lucide-react'
import { PageHeader, CardHeader, StatCard, Spinner, ErrorNote, Tabs } from '../components/ui.jsx'
import { colorFor, pivotTrends, formatPeriod } from '../lib/analytics.js'
import api, { errorMessage } from '../services/api'

function useAdminData(path) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  useEffect(() => {
    let cancelled = false
    api
      .get(path)
      .then((r) => !cancelled && setData(r.data))
      .catch((e) => !cancelled && setError(errorMessage(e, 'Could not load analytics.')))
    return () => {
      cancelled = true
    }
  }, [path])
  return { data, error }
}

function HiddenGroups({ items, noun }) {
  const hidden = items.filter((d) => d.suppressed)
  return (
    <section className="card p-5">
      <CardHeader title="Hidden groups" description={`${noun} with fewer than 5 patients.`} />
      {hidden.length === 0 ? (
        <p className="text-sm text-ink-500 dark:text-ink-400">Every {noun.toLowerCase()} meets the threshold.</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {hidden.map((d) => (
            <li key={d.condition || d.region} className="flex items-center gap-2 rounded-full border border-wine-100 dark:border-ink-700 bg-blush-100 dark:bg-ink-800 py-1 pl-3 pr-1.5 text-xs font-semibold text-ink-700 dark:text-blush-200">
              {d.condition || d.region}
              <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-ink-500 dark:text-ink-400 dark:bg-ink-700">Hidden</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function GuardrailCard({ children }) {
  return (
    <section className="rounded-2xl bg-gradient-to-br from-ink-900 to-wine-900 p-5 text-white shadow-lift">
      <Lock size={20} className="text-wine-300" aria-hidden="true" />
      <h2 className="mt-3 text-base font-bold">Privacy guardrail</h2>
      <p className="mt-1.5 text-sm leading-relaxed text-white/70">{children}</p>
    </section>
  )
}

function ByCondition() {
  const { data, error } = useAdminData('/analytics/disease-distribution')
  const shown = (data || []).filter((d) => !d.suppressed).sort((a, b) => b.count - a.count)
  const hidden = (data || []).filter((d) => d.suppressed)

  return (
    <>
      <ErrorNote>{error}</ErrorNote>
      {!data && !error && <Spinner label="Loading condition data…" />}
      {data && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatCard icon={Layers} label="Conditions tracked" value={data.length} />
            <StatCard icon={Eye} label="Groups shown" value={shown.length} tone="good" note="At least 5 people" noteTone="good" />
            <StatCard icon={EyeOff} label="Groups hidden" value={hidden.length} tone={hidden.length ? 'warn' : 'good'} note="Fewer than 5 people" noteTone={hidden.length ? 'warn' : 'good'} />
            <StatCard icon={Activity} label="Active diagnoses" value={shown.reduce((s, d) => s + d.count, 0)} note="In shown groups" />
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-[1.7fr_1fr]">
            <section className="card p-5">
              <CardHeader title="Disease distribution" description="Patients with an active diagnosis, by condition." />
              {shown.length === 0 ? (
                <p className="rounded-xl bg-blush-100 dark:bg-ink-800 px-4 py-8 text-center text-sm text-ink-500 dark:text-ink-400">No condition has enough patients to display yet.</p>
              ) : (
                <div style={{ height: Math.max(220, shown.length * 46) }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={shown} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F6E3E2" />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#7C6268' }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="condition" width={190} tick={{ fontSize: 12, fill: '#3A222A' }} axisLine={false} tickLine={false} />
                      <Tooltip cursor={{ fill: '#FDF5F5' }} contentStyle={{ borderRadius: 12, border: '1px solid #F1CDD1', fontSize: 12 }} formatter={(value) => [`${value} patients`, 'Active']} />
                      <Bar dataKey="count" radius={[0, 8, 8, 0]} barSize={20}>
                        {shown.map((d, i) => (
                          <Cell key={d.condition} fill={i === 0 ? '#7A1A36' : '#C4566B'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>

            <div className="space-y-5">
              <GuardrailCard>
                Any group with fewer than 5 patients is removed on the server before the data is sent, so a small group can't point to a person.
              </GuardrailCard>
              <HiddenGroups items={data} noun="Conditions" />
            </div>
          </div>
        </>
      )}
    </>
  )
}

function ByRegion() {
  const { data, error } = useAdminData('/analytics/regional-distribution')
  const shown = (data || []).filter((d) => !d.suppressed).sort((a, b) => b.count - a.count)
  const hidden = (data || []).filter((d) => d.suppressed)

  return (
    <>
      <ErrorNote>{error}</ErrorNote>
      {!data && !error && <Spinner label="Loading regional data…" />}
      {data && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatCard icon={MapPin} label="Regions reporting" value={data.length} />
            <StatCard icon={Eye} label="Regions shown" value={shown.length} tone="good" note="At least 5 people" noteTone="good" />
            <StatCard icon={EyeOff} label="Regions hidden" value={hidden.length} tone={hidden.length ? 'warn' : 'good'} note="Fewer than 5 people" noteTone={hidden.length ? 'warn' : 'good'} />
            <StatCard icon={Activity} label="Active cases" value={shown.reduce((s, d) => s + d.count, 0)} note="In shown regions" />
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-[1.7fr_1fr]">
            <section className="card p-5">
              <CardHeader title="Cases by region" description="Patients with an active diagnosis, by reporting region." />
              {shown.length === 0 ? (
                <p className="rounded-xl bg-blush-100 dark:bg-ink-800 px-4 py-8 text-center text-sm text-ink-500 dark:text-ink-400">No region has enough patients to display yet.</p>
              ) : (
                <div style={{ height: Math.max(220, shown.length * 52) }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={shown} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F6E3E2" />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#7C6268' }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="region" width={130} tick={{ fontSize: 12, fill: '#3A222A' }} axisLine={false} tickLine={false} />
                      <Tooltip cursor={{ fill: '#FDF5F5' }} contentStyle={{ borderRadius: 12, border: '1px solid #F1CDD1', fontSize: 12 }} formatter={(value) => [`${value} patients`, 'Active cases']} />
                      <Bar dataKey="count" radius={[0, 8, 8, 0]} barSize={24}>
                        {shown.map((d, i) => (
                          <Cell key={d.region} fill={i === 0 ? '#7A1A36' : '#C4566B'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>

            <div className="space-y-5">
              <GuardrailCard>
                This is a case-count map, not a location trace: it shows how many people in a region have an active diagnosis, never who they are.
              </GuardrailCard>
              <HiddenGroups items={data} noun="Regions" />
            </div>
          </div>
        </>
      )}
    </>
  )
}

function Trends() {
  const { data, error } = useAdminData('/analytics/disease-trends')
  const { periods, conditions, data: chartData } = pivotTrends(data || [])
  const suppressedCount = (data || []).filter((d) => d.suppressed).length

  return (
    <>
      <ErrorNote>{error}</ErrorNote>
      {!data && !error && <Spinner label="Loading trend data…" />}
      {data && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatCard icon={TrendingUp} label="Months covered" value={periods.length} />
            <StatCard icon={Stethoscope} label="Conditions plotted" value={Math.max(0, conditions.length - (conditions.includes('All conditions') ? 1 : 0))} note="Top by volume" />
            <StatCard icon={Eye} label="Points shown" value={data.length - suppressedCount} tone="good" noteTone="good" />
            <StatCard icon={EyeOff} label="Points hidden" value={suppressedCount} tone={suppressedCount ? 'warn' : 'good'} note="Fewer than 5 people" noteTone={suppressedCount ? 'warn' : 'good'} />
          </div>

          <section className="card mt-5 p-5">
            <CardHeader title="Diagnoses over time" description="New active diagnoses per month, for the conditions with the most cases." />
            {chartData.length === 0 ? (
              <p className="rounded-xl bg-blush-100 dark:bg-ink-800 px-4 py-8 text-center text-sm text-ink-500 dark:text-ink-400">Not enough months of data to plot a trend yet.</p>
            ) : (
              <div style={{ height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ left: 4, right: 20, top: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F6E3E2" vertical={false} />
                    <XAxis dataKey="period" tickFormatter={formatPeriod} tick={{ fontSize: 11, fill: '#7C6268' }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#7C6268' }} axisLine={false} tickLine={false} />
                    <Tooltip labelFormatter={formatPeriod} contentStyle={{ borderRadius: 12, border: '1px solid #F1CDD1', fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    {conditions.map((c, i) => (
                      <Line
                        key={c}
                        type="monotone"
                        dataKey={c}
                        stroke={colorFor(i, c)}
                        strokeWidth={c === 'All conditions' ? 3 : 2}
                        strokeDasharray={c === 'All conditions' ? undefined : '5 3'}
                        dot={{ r: c === 'All conditions' ? 3.5 : 2.5 }}
                        connectNulls={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
            <p className="mt-4 text-xs leading-relaxed text-ink-500 dark:text-ink-400">
              A gap in a line means that month's count fell below the k=5 privacy threshold for that condition, not that there were zero cases.
            </p>
          </section>
        </>
      )}
    </>
  )
}

const TABS = [
  { id: 'condition', label: 'By condition' },
  { id: 'region', label: 'By region' },
  { id: 'trends', label: 'Trends over time' },
]

export default function AdminDashboard() {
  const [tab, setTab] = useState('condition')

  return (
    <>
      <PageHeader title="Population intelligence" subtitle="Aggregate insight for the whole population. Patient-level records are never available on this screen." />

      <div className="mb-5">
        <Tabs tabs={TABS} value={tab} onChange={setTab} />
      </div>

      {tab === 'condition' && <ByCondition />}
      {tab === 'region' && <ByRegion />}
      {tab === 'trends' && <Trends />}
    </>
  )
}
