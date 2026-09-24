import React, { useEffect, useState } from 'react'
import { Loader2, QrCode, ShieldOff, RefreshCw, ScanLine, Clock, ScrollText } from 'lucide-react'
import { PageHeader, ErrorNote } from '../../components/ui.jsx'
import api, { errorMessage } from '../../services/api'

function useCountdown(expiresAt) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!expiresAt) return undefined
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [expiresAt])
  if (!expiresAt) return null
  // The API returns a naive UTC timestamp; add the zone so Date reads it as UTC.
  const iso = /[zZ]|[+-]\d\d:?\d\d$/.test(expiresAt) ? expiresAt : `${expiresAt}Z`
  return Math.max(0, Math.floor((new Date(iso).getTime() - now) / 1000))
}

function formatRemaining(seconds) {
  const m = Math.floor(seconds / 60)
  const s = String(seconds % 60).padStart(2, '0')
  return `${m}:${s}`
}

export default function PatientShare() {
  const [qr, setQr] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [revoked, setRevoked] = useState(false)
  const remaining = useCountdown(qr?.expires_at)
  const expired = qr && remaining === 0

  async function generate() {
    setLoading(true)
    setError(null)
    setRevoked(false)
    try {
      const resp = await api.post('/me/qr')
      setQr(resp.data)
    } catch (e) {
      setError(errorMessage(e, 'Could not create a QR code.'))
    } finally {
      setLoading(false)
    }
  }

  async function stopSharing() {
    if (!qr) return
    setError(null)
    try {
      await api.post(`/me/qr/revoke/${encodeURIComponent(qr.token)}`)
      setRevoked(true)
      setQr(null)
    } catch (e) {
      setError(errorMessage(e, 'Could not cancel this code.'))
    }
  }

  const live = qr && !expired

  return (
    <>
      <PageHeader title="Share access" subtitle="Let a clinician open your record for a short time with a QR code. You can cancel it whenever you like." />

      <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
        <section className="card flex flex-col items-center justify-center p-6 text-center sm:p-8">
          {live ? (
            <>
              <div className="rounded-2xl border border-wine-100 dark:border-ink-700 bg-white p-4 shadow-soft dark:bg-ink-800">
                <img src={`data:image/png;base64,${qr.qr_image_base64}`} alt="Your one-time QR code for clinicians to scan" className="h-56 w-56 sm:h-64 sm:w-64" />
              </div>
              <p className="mt-5 flex items-center gap-2 text-sm font-bold text-ink-900 dark:text-blush-50">
                <Clock size={16} className="text-wine-600 dark:text-wine-300" aria-hidden="true" />
                Expires in <span className="tabular-nums text-wine-700 dark:text-wine-300">{formatRemaining(remaining)}</span>
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <button onClick={stopSharing} className="btn-outline btn-sm">
                  <ShieldOff size={14} aria-hidden="true" /> Stop sharing
                </button>
                <button onClick={generate} disabled={loading} className="btn-outline btn-sm">
                  <RefreshCw size={14} aria-hidden="true" /> New code
                </button>
              </div>
            </>
          ) : (
            <>
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-wine-50 dark:bg-wine-900/30 text-wine-500">
                <QrCode size={28} aria-hidden="true" />
              </span>
              <h2 className="mt-4 text-lg font-bold text-ink-900 dark:text-blush-50">
                {expired ? 'That code has expired' : revoked ? 'Sharing stopped' : 'No active code'}
              </h2>
              <p className="mt-1 max-w-xs text-sm text-ink-500 dark:text-ink-400">
                {revoked
                  ? 'The code no longer opens your record. Create a new one whenever you need to.'
                  : 'Create a code when you are with a clinician. It works for 15 minutes.'}
              </p>
              <button onClick={generate} disabled={loading} className="btn-primary mt-5">
                {loading ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <QrCode size={16} aria-hidden="true" />}
                {loading ? 'Creating…' : 'Create QR code'}
              </button>
            </>
          )}
          {error && (
            <div className="mt-4 w-full">
              <ErrorNote>{error}</ErrorNote>
            </div>
          )}
        </section>

        <section className="card p-6 sm:p-8">
          <h2 className="text-[0.95rem] font-bold text-ink-900 dark:text-blush-50">What happens when a clinician scans it</h2>
          <ul className="mt-4 space-y-5">
            {[
              [ScanLine, 'They scan the code', 'It contains a random token only. Your name and health data are not inside the image.'],
              [Clock, 'It only lasts a short time', 'The token expires after 15 minutes. You can cancel it sooner with Stop sharing.'],
              [ScrollText, 'The access is logged', 'Each scan and record view is written to the audit trail, so there is a record of who looked.'],
            ].map(([Icon, title, text]) => (
              <li key={title} className="flex items-start gap-3.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-wine-50 dark:bg-wine-900/30 text-wine-600 dark:text-wine-300">
                  <Icon size={17} aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-bold text-ink-900 dark:text-blush-50">{title}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-ink-600 dark:text-ink-300">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  )
}
