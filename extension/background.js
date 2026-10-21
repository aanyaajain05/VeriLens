const MENU_ID = "verilens-analyze";
const API_URL = "http://127.0.0.1:8000/analyze/text";

// Runs when the extension is installed or reloaded: create the menu item.
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: MENU_ID,
    title: "Analyze with VeriLens",
    contexts: ["selection"],
  });
});

// Sends the text to the VeriLens API and returns the parsed JSON result.
async function analyzeText(text) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!response.ok) {
    throw new Error("API returned status " + response.status);
  }
  return response.json();
}

// This function runs INSIDE the web page (not in the service worker), so it
// must be self-contained: it cannot use any variable defined outside it.
function renderVeriLensPanel(state) {
  const PANEL_ID = "verilens-panel";
  const existing = document.getElementById(PANEL_ID);
  if (existing) existing.remove();

  const LABELS = {
    likely_ai: "Likely AI-generated",
    likely_human: "Likely human-written",
    uncertain: "Uncertain",
  };

  // Small helper: create an element with a CSS class and plain text.
  // textContent (never innerHTML) keeps any text from being run as HTML.
  function make(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  const host = document.createElement("div");
  host.id = PANEL_ID;
  // Shadow DOM keeps the website's own CSS from changing how the panel looks.
  const root = host.attachShadow({ mode: "closed" });

  const style = document.createElement("style");
  style.textContent = `
    :host { all: initial; }
    .panel {
      position: fixed; top: 16px; right: 16px; z-index: 2147483647;
      box-sizing: border-box; width: 320px; max-width: calc(100vw - 32px);
      background: #ffffff; color: #1a1a1a;
      border: 1px solid #d0d0d0; border-radius: 10px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
      padding: 14px 16px;
      font: 14px/1.45 system-ui, -apple-system, "Segoe UI", sans-serif;
    }
    .header { display: flex; justify-content: space-between; align-items: center; }
    .brand { font-weight: 700; }
    .close { border: none; background: none; font-size: 20px; line-height: 1; cursor: pointer; color: #555; }
    .label { font-size: 17px; font-weight: 700; margin: 10px 0 2px; }
    .score { color: #444; margin-bottom: 8px; }
    ul { margin: 6px 0 8px; padding-left: 18px; }
    .note { font-size: 12px; color: #555; margin-top: 8px; }
    .meta { font-size: 11px; color: #777; margin-top: 6px; }
    .error { color: #a12020; }
  `;

  const panel = make("div", "panel");
  const header = make("div", "header");
  header.appendChild(make("span", "brand", "VeriLens"));
  const close = make("button", "close", "\u00d7");
  close.setAttribute("aria-label", "Close");
  close.addEventListener("click", () => host.remove());
  header.appendChild(close);
  panel.appendChild(header);

  if (state.status === "loading") {
    panel.appendChild(make("div", "score", "Analyzing\u2026"));
  } else if (state.status === "error") {
    panel.appendChild(make("div", "score error", state.message));
  } else {
    const r = state.result;
    panel.appendChild(make("div", "label", LABELS[r.label] || r.label));
    const score =
      typeof r.ai_likelihood === "number"
        ? "AI likelihood: " + Math.round(r.ai_likelihood * 100) + "%"
        : "AI likelihood: not available";
    panel.appendChild(make("div", "score", score));
    const list = document.createElement("ul");
    for (const reason of r.reasons) list.appendChild(make("li", "", reason));
    panel.appendChild(list);
    panel.appendChild(make("div", "note", r.limitations));
    panel.appendChild(make("div", "meta", "Model: " + r.model_version));
  }

  root.appendChild(style);
  root.appendChild(panel);
  document.documentElement.appendChild(host);
}

// Draws (or updates) the panel on the given tab.
async function showPanel(tabId, state) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: renderVeriLensPanel,
      args: [state],
    });
  } catch (error) {
    console.error("VeriLens could not show the panel:", error);
  }
}

// Runs when the user clicks the menu item.
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== MENU_ID) return;
  await showPanel(tab.id, { status: "loading" });
  try {
    const result = await analyzeText(info.selectionText);
    await showPanel(tab.id, { status: "result", result });
  } catch (error) {
    console.error("VeriLens request failed:", error);
    await showPanel(tab.id, {
      status: "error",
      message: "Could not get a result from the VeriLens server. Make sure it is running.",
    });
  }
});