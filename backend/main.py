from pathlib import Path
import joblib
from typing import Literal, Optional

from fastapi import FastAPI
from pydantic import BaseModel, Field

MODEL_VERSION = "tfidf-logreg-0.1"
model = joblib.load(Path(__file__).parent / "model.joblib")
LIMITATIONS = (
    "This is an estimate, not proof. "
    "Results can be wrong, especially for short or edited text."
)

app = FastAPI(
    title="VeriLens API",
    description="API foundation for AI-generated text analysis.",
    version="0.1.0",
)


class TextRequest(BaseModel):
    text: str = Field(min_length=1, max_length=20000)


class AnalysisResult(BaseModel):
    label: Literal["likely_ai", "likely_human", "uncertain"]
    ai_likelihood: Optional[float] = Field(default=None, ge=0, le=1)
    reasons: list[str]
    limitations: str
    model_version: str


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/analyze/text", response_model=AnalysisResult)
def analyze_text(request: TextRequest):
    p = float(model.predict_proba([request.text])[0][1])
    if p >= 0.65:
        label = "likely_ai"
    elif p <= 0.40:
        label = "likely_human"
    else:
        label = "uncertain"
    return AnalysisResult(
        label=label,
        ai_likelihood=round(p, 2),
        reasons=[f"Text-style classifier scored this {p:.0%} likely AI-generated."],
        limitations=LIMITATIONS,
        model_version=MODEL_VERSION,
    )