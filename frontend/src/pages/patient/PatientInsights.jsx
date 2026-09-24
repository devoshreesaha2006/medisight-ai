import React from 'react'
import { Link } from 'react-router-dom'
import { Sparkles, Loader2 } from 'lucide-react'
import { PageHeader, EmptyState, ErrorNote } from '../../components/ui.jsx'
import RiskDetails from '../../components/RiskDetails.jsx'
import { isEmptyRecord } from '../../lib/records.js'
import { usePatient } from './PatientLayout.jsx'

export default function PatientInsights() {
  const { record, risk, reloadRisk } = usePatient()

  return (
    <>
      <PageHeader
        title="AI insights"
        subtitle="A model estimates your risk from your record and shows which facts moved the number."
        actions={
          risk.status === 'ready' && (
            <button onClick={reloadRisk} className="btn-outline btn-sm">
              Recalculate
            </button>
          )
        }
      />

      {isEmptyRecord(record) ? (
        <div className="card">
          <EmptyState icon={Sparkles} title="No insights yet">
            A score built from age and gender alone would be misleading. Insights appear once your record has conditions, labs, visits or prescriptions.
          </EmptyState>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          <section className="card p-5 sm:p-6">
            {risk.status === 'loading' && (
              <div className="flex items-center gap-2 py-10 text-sm text-ink-500 dark:text-ink-400" role="status">
                <Loader2 size={16} className="animate-spin" aria-hidden="true" /> Calculating…
              </div>
            )}
            {risk.status === 'error' && <ErrorNote>{risk.error}</ErrorNote>}
            {risk.status === 'ready' && <RiskDetails risk={risk.data} audience="patient" ringSize={144} />}
          </section>

          <aside className="card h-fit p-5 sm:p-6">
            <h2 className="text-[0.95rem] font-bold text-ink-900 dark:text-blush-50">How to read this</h2>
            <ul className="mt-3 space-y-3 text-sm leading-relaxed text-ink-600 dark:text-ink-300">
              <li>The percentage is the model’s estimate of elevated risk, not a diagnosis.</li>
              <li>Red bars raised your score. Green bars lowered it. Longer bars mattered more.</li>
              <li>Only facts in your record are used. Missing information is treated as normal.</li>
            </ul>
            <Link to="/patient/share" className="btn-outline btn-sm mt-5">
              Share with a clinician
            </Link>
          </aside>
        </div>
      )}
    </>
  )
}
