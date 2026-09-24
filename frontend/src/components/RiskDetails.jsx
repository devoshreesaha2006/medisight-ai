import React from 'react'
import { RiskRing } from './ui.jsx'
import { featureLabel, formatFeatureValue, levelMeta } from '../lib/risk.js'

const LEVEL_COPY = {
  LOW: 'Few of the recorded factors are pushing the score up.',
  MODERATE: 'Some recorded factors are raising the score. Worth discussing at your next visit.',
  HIGH: 'Several recorded factors are raising the score. A clinician should review this soon.',
}

/**
 * The score, its band and the factors that moved it. `audience` only changes
 * wording ("your" vs neutral); the numbers are identical for everyone.
 */
export default function RiskDetails({ risk, audience = 'patient', ringSize = 132 }) {
  const meta = levelMeta(risk.risk_level)
  const maxAbs = Math.max(...risk.shap_explanation.map((f) => Math.abs(f.shap_value)), 0.001)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-5">
        <RiskRing score={risk.risk_score} level={risk.risk_level} size={ringSize} />
        <div className="min-w-[12rem] flex-1">
          <p className={`text-sm font-bold ${meta.text}`}>{meta.label} risk</p>
          <p className="mt-1 text-sm leading-relaxed text-ink-600 dark:text-ink-300">{LEVEL_COPY[risk.risk_level]}</p>
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-xs font-bold text-ink-500 dark:text-ink-400">
          {audience === 'patient' ? 'What is moving your score' : 'Top contributing factors'}
        </h3>
        <ul className="space-y-3.5">
          {risk.shap_explanation.map((f) => {
            const up = f.shap_value >= 0
            const width = Math.max(4, (Math.abs(f.shap_value) / maxAbs) * 100)
            return (
              <li key={f.feature}>
                <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-semibold text-ink-800 dark:text-blush-100">
                    {featureLabel(f.feature)} <span className="font-medium text-ink-400">{formatFeatureValue(f.feature, f.value)}</span>
                  </span>
                  <span className={`shrink-0 text-xs font-bold ${up ? 'text-crimson-700 dark:text-crimson-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                    {up ? 'Raises' : 'Lowers'}
                    {/* The raw SHAP value is only meaningful to a clinician. */}
                    {audience !== 'patient' && ` ${up ? '+' : '−'}${Math.abs(f.shap_value).toFixed(2)}`}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-blush-200 dark:bg-ink-700">
                  <div className={`h-full rounded-full ${up ? 'bg-crimson-500' : 'bg-emerald-500'}`} style={{ width: `${width}%` }} />
                </div>
              </li>
            )
          })}
        </ul>
      </div>

      <p className="border-t border-wine-100 dark:border-ink-700 pt-3 text-xs leading-relaxed text-ink-500 dark:text-ink-400">
        {risk.disclaimer} Model {risk.model_version}.
      </p>
    </div>
  )
}
