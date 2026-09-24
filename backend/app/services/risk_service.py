"""
Loads the trained XGBoost model (produced by ml/src/train_model.py) and
produces a risk score + SHAP explanation for a given patient.

If no trained model is found on disk, endpoints using this service return
a clear 503 rather than fabricating a score — see api/risk.py.
"""
import json
import os
from datetime import date

import joblib
import numpy as np
import pandas as pd
import shap
from sqlalchemy.orm import Session

from app.ml.features import FEATURE_NAMES, build_feature_row
from app.models.patient import Patient, Condition, Visit, LabResult, Prescription

MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..", "ml", "models")
MODEL_PATH = os.path.join(MODEL_DIR, "risk_model.joblib")
METADATA_PATH = os.path.join(MODEL_DIR, "model_metadata.json")

RISK_LEVEL_BANDS = [
    (0.66, "HIGH"),
    (0.33, "MODERATE"),
    (0.0, "LOW"),
]


def risk_level_for_score(score: float) -> str:
    for threshold, label in RISK_LEVEL_BANDS:
        if score >= threshold:
            return label
    return "LOW"


class RiskModelUnavailable(Exception):
    pass


class RiskService:
    _model = None
    _explainer = None
    _metadata = None

    @classmethod
    def _load(cls):
        if cls._model is not None:
            return
        if not os.path.exists(MODEL_PATH):
            raise RiskModelUnavailable(
                "No trained model found. Run `python -m ml.src.train_model` first."
            )
        cls._model = joblib.load(MODEL_PATH)
        cls._explainer = shap.TreeExplainer(cls._model)
        with open(METADATA_PATH) as f:
            cls._metadata = json.load(f)

    @classmethod
    def model_version(cls) -> str:
        cls._load()
        return cls._metadata.get("version", "unknown")

    @staticmethod
    def summarize_patient_for_model(db: Session, patient: Patient) -> dict:
        """Pull a patient's clinical data and reduce it to model-ready fields."""
        conditions = db.query(Condition).filter(
            Condition.patient_id == patient.id, Condition.active.is_(True)
        ).all()
        one_year_ago = date.today().replace(year=date.today().year - 1)
        visits_last_year = db.query(Visit).filter(
            Visit.patient_id == patient.id, Visit.visit_date >= one_year_ago
        ).count()
        labs = db.query(LabResult).filter(LabResult.patient_id == patient.id).all()
        prescriptions = db.query(Prescription).filter(
            Prescription.patient_id == patient.id
        ).count()

        abnormal_ratio = (
            sum(1 for l in labs if l.abnormal) / len(labs) if labs else 0.0
        )

        def latest_value(test_name: str, default: float) -> float:
            matches = [l for l in labs if l.test_name == test_name]
            if not matches:
                return default
            return sorted(matches, key=lambda l: l.result_date)[-1].value

        return {
            "age": patient.age,
            "gender": patient.gender,
            "num_active_conditions": len(conditions),
            "num_visits_last_year": visits_last_year,
            "num_prescriptions": prescriptions,
            "abnormal_lab_ratio": abnormal_ratio,
            "condition_names": [c.name for c in conditions],
            "latest_glucose": latest_value("Fasting Glucose", 90.0),
            "latest_systolic_bp": latest_value("Systolic BP", 120.0),
        }

    @classmethod
    def predict(cls, db: Session, patient: Patient) -> dict:
        cls._load()

        record = cls.summarize_patient_for_model(db, patient)
        feature_row = build_feature_row(record)
        X = pd.DataFrame([feature_row], columns=FEATURE_NAMES)

        proba = float(cls._model.predict_proba(X)[0, 1])
        level = risk_level_for_score(proba)

        shap_values = cls._explainer.shap_values(X)
        # shap_values shape: (1, n_features) for binary XGBoost classifier
        row_shap = shap_values[0] if isinstance(shap_values, np.ndarray) else shap_values[0][0]

        contributions = [
            {
                "feature": feat,
                "value": feature_row[feat],
                "shap_value": float(val),
            }
            for feat, val in zip(FEATURE_NAMES, row_shap)
        ]
        contributions.sort(key=lambda c: abs(c["shap_value"]), reverse=True)

        return {
            "risk_score": round(proba, 4),
            "risk_level": level,
            "model_version": cls.model_version(),
            "shap_explanation": contributions[:6],  # top 6 contributing features
        }
