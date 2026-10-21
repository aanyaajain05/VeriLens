from typing import Literal, Optional

from fastapi import FastAPI
from pydantic import BaseModel, Field

MODEL_VERSION = "placeholder-0.0"
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
    # Detection logic will be implemented and evaluated separately.
    # Until then, we honestly report that we cannot tell.
    return AnalysisResult(
        label="uncertain",
        ai_likelihood=None,
        reasons=["No detection model is connected yet."],
        limitations=LIMITATIONS,
        model_version=MODEL_VERSION,
    )