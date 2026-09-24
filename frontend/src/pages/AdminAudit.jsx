import React, { useCallback, useEffect, useState } from 'react'
import { RefreshCw, ShieldCheck, ShieldAlert, Loader2 } from 'lucide-react'
import { PageHeader, CardHeader, ErrorNote, Spinner, StatCard } from '../components/ui.jsx'
import { ScrollText, Ban, CheckCircle2 } from 'lucide-react'
import api, { errorMessage } from '../services/api'

export default function AdminAudit() {
  const [logs, setLogs] = useState(null)
  const [error, setError] = useState(null)
  const [attempt, setAttempt] = useState(null)
  const [testing, setTesting] = useState(false)

  const refresh = useCallback(() => {
    api
      .get('/audit/logs?limit=50')
      .then((r) => setLogs(r.data))
      .catch((e) => setError(errorMessage(e, 'Could not load the audit log.')))
  }, [])

  useEffect(refresh, [refresh])

  async function tryPatientAccess() {
    setTesting(true)
    setAttempt(null)
    try {
      await api.get('/patients/1')
      setAttempt({ ok: true })
    } catch (e) {
      setAttempt({ ok: false, status: e?.response?.status, detail: e?.response?.data?.detail })
    } finally {
      setTesting(false)
      refresh()
    }
  }

  const denied = (logs || []).filter((l) => !l.success).length

  return (
    <>
      <PageHeader
        title="Audit & access"
        subtitle="Who did what, and proof that admins cannot open patient records."
        actions={
          <button onClick={refresh} className="btn-outline btn-sm">
            <RefreshCw size={14} aria-hidden="true" /> Refresh
          </button>
        }
      />

      <ErrorNote>{error}</ErrorNote>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <StatCard icon={ScrollText} label="Recent events" value={logs ? logs.length : '–'} note="Latest 50" />
        <StatCard icon={CheckCircle2} label="Allowed" value={logs ? logs.length - denied : '–'} tone="good" />
        <StatCard icon={Ban} label="Denied" value={logs ? denied : '–'} tone={denied ? 'bad' : 'good'} noteTone="bad" />
      </div>

      <section className="card mt-5 p-5">
        <CardHeader
          title="Access control check"
          description="Calls the same endpoint clinicians use to open a patient record, with your admin session."
          action={
            <button onClick={tryPatientAccess} disabled={testing} className="btn-dark btn-sm shrink-0">
              {testing && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
              {testing ? 'Requesting…' : 'Attempt patient access'}
            </button>
          }
        />
        {attempt && (
          <div
            className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm ${
              attempt.ok ? 'border-crimson-500/30 bg-crimson-50 text-crimson-700 dark:bg-crimson-500/15 dark:text-crimson-300' : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300'
            }`}
            role="status"
          >
            {attempt.ok ? <ShieldAlert size={18} className="mt-0.5 shrink-0" /> : <ShieldCheck size={18} className="mt-0.5 shrink-0" />}
            <span>
              {attempt.ok
                ? 'Unexpected: access was allowed. This should not happen.'
                : `Blocked as expected. The server answered ${attempt.status}: ${attempt.detail}`}
            </span>
          </div>
        )}
      </section>

      <section className="card mt-5 p-5">
        <CardHeader title="Recent audit log" />
        {!logs && !error && <Spinner />}
        {logs && (
          <div className="-mx-1 overflow-x-auto">
            <table className="w-full min-w-[36rem] text-sm">
              <thead>
                <tr className="table-head">
                  <th className="px-1 py-2 font-semibold">Time</th>
                  <th className="px-1 py-2 font-semibold">Role</th>
                  <th className="px-1 py-2 font-semibold">Action</th>
                  <th className="px-1 py-2 font-semibold">Resource</th>
                  <th className="px-1 py-2 font-semibold">Result</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-wine-50 dark:border-ink-700 last:border-0">
                    <td className="whitespace-nowrap px-1 py-2.5 text-xs text-ink-500 dark:text-ink-400">
                      {new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(log.timestamp) ? log.timestamp : `${log.timestamp}Z`).toLocaleString(undefined, {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-1 py-2.5 capitalize text-ink-600 dark:text-ink-300">{log.actor_role}</td>
                    <td className="px-1 py-2.5 font-semibold text-ink-800 dark:text-blush-100">{log.action.replaceAll('_', ' ').toLowerCase()}</td>
                    <td className="px-1 py-2.5 text-ink-500 dark:text-ink-400">{log.resource}</td>
                    <td className="px-1 py-2.5">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${log.success ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-crimson-50 text-crimson-700 dark:bg-crimson-500/15 dark:text-crimson-300'}`}>
                        {log.success ? 'Allowed' : 'Denied'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  )
}
