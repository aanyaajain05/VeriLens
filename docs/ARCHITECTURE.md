# VeriLens: System Architecture

## 1. Overview

A user selects text on a web page. The browser extension sends it to the VeriLens API, which returns a label, a likelihood score, reasons, and a limitations note.

## 2. Request Flow

```
Web page
  |    |  (the context-menu click hands over the selected text)
  v
Extension service worker --HTTPS POST /analyze/text--> FastAPI backend (Docker)
  ^                                                         |
  |                                                         v
Result panel  <------------- JSON result ------------  Detector module
                                                            |
                                           +----------------+----------------+
                                           v                                 v
                                  Fine-tuned classifier             Feature extractor
                                  (loaded from model folder)        (perplexity, burstiness,
                                                                     repetition)
                                           +----------------+----------------+
                                                            v
                                         Ensemble + calibration + abstain rule
```

## 3. MLOps Pipeline

```
Colab/Kaggle training --> MLflow run log --> Model registry --> Docker image --> Cloud
                               ^                                      ^
                        Evaluation harness                    GitHub Actions CI/CD
```

Notes:

- The selected text comes from the right-click menu event, so no content script is needed.
- The result panel is drawn into the page by the service worker, using the `activeTab` and `scripting` permissions, so the extension only touches a page when the user asks it to.
- During development the extension may only contact `http://127.0.0.1:8000`. This will change to the deployed HTTPS address later.

## 4. Design Decisions

### Decision 1: The service worker makes the network call

The extension's service worker, not the content script, sends the request to the backend. Content scripts run inside web pages and are subject to the page's security rules, while the service worker is part of the extension itself, so it avoids cross-origin problems and keeps the backend address out of page scripts.

### Decision 2: The model sits behind one interface

The detector takes text in and returns a result out, and the rest of the system does not know which model is running. This lets us replace or upgrade the model without changing the extension or the API.

### Decision 3: The backend is stateless and does not store user text

The backend keeps no user text. It logs only metadata (text length, score, label, response time, model version), which is enough for monitoring and protects user privacy.

## 5. API Contract

### POST /analyze/text

Request (sent by the extension):

```json
{ "text": "the selected text" }
```

Response (returned by the backend):

```json
{
  "label": "likely_ai",
  "ai_likelihood": 0.78,
  "reasons": [
    "Low variation in sentence length",
    "High text predictability"
  ],
  "limitations": "This is an estimate, not proof. Results can be wrong, especially for short or edited text.",
  "model_version": "baseline-0.1"
}
```

Field rules:

- `label` is one of `likely_ai`, `likely_human`, or `uncertain`.
- `ai_likelihood` is a number from 0 to 1, or `null` when no analysis was done (for example, when the text is too short or no model is connected).
- `reasons` are derived from measured text features, not written by a language model.
- `limitations` always contains the short notice from the requirements.
- `model_version` is always included, so every result can be traced to a logged experiment run.
- Text below the minimum length returns `uncertain`, with a reason saying the text is too short.

### GET /health

Returns `{ "status": "ok" }` when the service is running. Used for health checks and monitoring.