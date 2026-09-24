from datetime import datetime
from pydantic import BaseModel


class QRGenerateResponse(BaseModel):
    token: str
    qr_payload: str          # the string encoded in the QR image, e.g. medisight://patient/<token>
    qr_image_base64: str     # PNG, base64-encoded, ready for <img src="data:image/png;base64,...">
    expires_at: datetime


class QRValidateRequest(BaseModel):
    token: str


class QRValidateResponse(BaseModel):
    valid: bool
    patient_id: int | None = None
    reason: str | None = None


class RiskFeatureContribution(BaseModel):
    feature: str
    value: float | str
    shap_value: float


class RiskPredictionOut(BaseModel):
    risk_score: float
    risk_level: str
    model_version: str
    shap_explanation: list[RiskFeatureContribution]
    disclaimer: str = (
        "This is AI-generated decision support, not a diagnosis. "
        "Clinical judgment must confirm any action taken."
    )


class DiseaseDistributionItem(BaseModel):
    condition: str
    count: int | None
    suppressed: bool
    reason: str | None = None


class DiseaseTrendPoint(BaseModel):
    period: str
    condition: str
    count: int | None
    suppressed: bool
    reason: str | None = None


class RegionalDistributionItem(BaseModel):
    region: str
    count: int | None
    suppressed: bool
    reason: str | None = None


class AuditLogOut(BaseModel):
    id: int
    timestamp: datetime
    actor_role: str
    action: str
    resource: str
    success: bool
    detail: str

    class Config:
        from_attributes = True
