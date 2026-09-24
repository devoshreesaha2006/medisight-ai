import React, { useState } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import api, { errorMessage } from '../services/api'
import RiskDetails from './RiskDetails.jsx'
import { CardHeader, ErrorNote } from './ui.jsx'

export default function RiskPanel({ patientId }) {
  const [risk, setRisk] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function runPrediction() {
    setError(null)
    setLoading(true)
    try {
      const resp = await api.get(`/patients/${patientId}/risk`)
      setRisk(resp.data)
    } catch (e) {
      setError(errorMessage(e, 'Risk model unavailable.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="card p-5">
      <CardHeader
        title="AI risk assessment"
        description="XGBoost score, explained with SHAP."
        action={
          <button onClick={runPrediction} disabled={loading} className="btn-primary btn-sm shrink-0">
            {loading ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Sparkles size={14} aria-hidden="true" />}
            {loading ? 'Scoring…' : risk ? 'Re-run' : 'Run risk model'}
          </button>
        }
      />
      <ErrorNote>{error}</ErrorNote>
      {!risk && !error && (
        <p className="rounded-xl bg-blush-100 dark:bg-ink-800 px-4 py-6 text-center text-sm text-ink-500 dark:text-ink-400">
          Run the model to see a risk score and the factors behind it.
        </p>
      )}
      {risk && <RiskDetails risk={risk} audience="clinician" ringSize={124} />}
    </section>
  )
}
