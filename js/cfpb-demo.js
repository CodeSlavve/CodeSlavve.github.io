const API_BASE_URL = "https://supportticket-complaintclassifier.onrender.com";
const MAX_TEXT_LENGTH = 2000;
const MAX_BATCH_SIZE = 600;
const REQUEST_TIMEOUT_MS = 60000;
const SLOW_START_DELAY_MS = 3000;

const form = document.querySelector("#demo-form");
const textInput = document.querySelector("#complaint-text");
const characterCount = document.querySelector("#character-count");
const classifyButton = document.querySelector("#classify-button");
const result = document.querySelector("#demo-result");
const statusMessage = document.querySelector("#demo-status");
const batchForm = document.querySelector("#batch-form");
const batchInput = document.querySelector("#batch-complaints");
const batchCount = document.querySelector("#batch-count");
const batchButton = document.querySelector("#batch-button");
const batchResult = document.querySelector("#batch-result");
const batchStatus = document.querySelector("#batch-status");

function updateCharacterCount() {
  const remaining = Math.max(0, MAX_TEXT_LENGTH - textInput.value.length);
  characterCount.textContent = `${remaining} character${remaining === 1 ? "" : "s"} remaining`;
}

function getBatchComplaints() {
  return batchInput.value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function updateBatchCount() {
  const count = getBatchComplaints().length;
  batchCount.textContent = `${count} complaint${count === 1 ? "" : "s"}`;
}

function appendRetryAction(target, owningForm) {
  const retryButton = document.createElement("button");
  retryButton.className = "button button-secondary";
  retryButton.type = "button";
  retryButton.textContent = "Try again";
  retryButton.addEventListener("click", () => owningForm.requestSubmit());
  target.append(retryButton);
}

function showError(target, message, owningForm) {
  target.replaceChildren();
  const heading = document.createElement("h3");
  heading.textContent = "Prediction unavailable";
  const description = document.createElement("p");
  description.textContent = message;
  target.append(heading, description);
  appendRetryAction(target, owningForm);
  target.focus();
}

function asPercentage(value) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) {
    return null;
  }
  return value * 100;
}

function readProbabilities(payload) {
  if (!payload.probabilities || typeof payload.probabilities !== "object") {
    return [];
  }

  const entries = Array.isArray(payload.probabilities)
    ? payload.probabilities.map((entry) => [entry?.category, entry?.probability ?? entry?.confidence])
    : Object.entries(payload.probabilities);

  return entries
    .filter(([category]) => typeof category === "string" && category.trim())
    .map(([category, value]) => ({ category: category.trim(), percentage: asPercentage(value) }))
    .filter(({ percentage }) => percentage !== null)
    .sort((a, b) => b.percentage - a.percentage);
}

function createProbabilityList(probabilities, predictedCategory) {
  const others = probabilities.filter(({ category }) => category !== predictedCategory);
  if (!others.length) {
    return null;
  }

  const list = document.createElement("ul");
  list.className = "probability-list";
  list.setAttribute("aria-label", "Other category probabilities");
  others.forEach(({ category, percentage }) => {
    const item = document.createElement("li");
    item.className = "probability-row";
    const label = document.createElement("div");
    label.className = "probability-label";
    const categoryText = document.createElement("span");
    categoryText.textContent = category;
    const percentageText = document.createElement("span");
    percentageText.textContent = `${percentage.toFixed(1)}%`;
    const track = document.createElement("div");
    track.className = "probability-track";
    track.setAttribute("aria-hidden", "true");
    const bar = document.createElement("div");
    bar.className = "probability-bar";
    bar.style.width = `${Math.min(100, percentage)}%`;
    track.append(bar);
    label.append(categoryText, percentageText);
    item.append(label, track);
    list.append(item);
  });
  return list;
}

function validatePrediction(payload) {
  if (!payload || typeof payload.category !== "string" || !payload.category.trim()) {
    throw new Error("The prediction response did not include a category.");
  }
  const confidence = asPercentage(payload.confidence);
  if (confidence === null) {
    throw new Error("The prediction response did not include a valid confidence.");
  }
  return { category: payload.category.trim(), confidence };
}

function renderPrediction(payload) {
  const prediction = validatePrediction(payload);
  const heading = document.createElement("h3");
  heading.textContent = prediction.category;
  const confidenceText = document.createElement("p");
  confidenceText.textContent = `Confidence: ${prediction.confidence.toFixed(1)}%`;
  const content = [heading, confidenceText];
  const probabilities = createProbabilityList(readProbabilities(payload), prediction.category);
  if (probabilities) {
    content.push(probabilities);
  }
  result.replaceChildren(...content);
  result.focus();
}

function renderBatchPredictions(payload, expectedCount) {
  if (!Array.isArray(payload?.predictions) || payload.predictions.length !== expectedCount) {
    throw new Error("The batch response did not include a result for every complaint.");
  }

  const items = payload.predictions.map((item, index) => {
    const prediction = validatePrediction(item);
    const article = document.createElement("article");
    article.className = "batch-prediction";
    const heading = document.createElement("h4");
    heading.textContent = `Complaint ${index + 1}: ${prediction.category}`;
    const confidence = document.createElement("p");
    confidence.textContent = `Confidence: ${prediction.confidence.toFixed(1)}%`;
    article.append(heading, confidence);
    const probabilities = createProbabilityList(readProbabilities(item), prediction.category);
    if (probabilities) {
      article.append(probabilities);
    }
    return article;
  });

  batchResult.replaceChildren(...items);
  batchResult.focus();
}

function errorMessageFor(error, response, timedOut) {
  if (timedOut && error?.name === "AbortError") {
    return "The request timed out. Try again in a moment.";
  }
  if (response?.status >= 400 && response.status < 500) {
    return "The server could not accept this text. Check it and try again.";
  }
  if (response?.status >= 500) {
    return "The prediction service encountered a problem. Try again in a moment.";
  }
  if (error instanceof TypeError) {
    return "A network or CORS error prevented the request. Check your connection and try again.";
  }
  return "The service returned an unreadable response. Try again in a moment.";
}

async function requestPrediction(path, body, target, owningForm, button, status) {
  button.disabled = true;
  button.setAttribute("aria-busy", "true");
  owningForm.setAttribute("aria-busy", "true");
  status.textContent = "Classifying complaint...";
  target.textContent = "Waiting for the prediction service.";

  const controller = new AbortController();
  let response;
  let timedOut = false;
  const timeoutId = window.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, REQUEST_TIMEOUT_MS);
  const slowStartId = window.setTimeout(() => {
    status.textContent = "The server may be starting up after being idle. This can take up to a minute.";
  }, SLOW_START_DELAY_MS);

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      mode: "cors",
      credentials: "omit",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    if (!response.ok) {
      throw new Error(`Prediction request failed with HTTP ${response.status}.`);
    }
    const payload = await response.json();
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new Error("Prediction response was not an object.");
    }
    return payload;
  } catch (error) {
    console.error("CFPB demo request failed", error);
    showError(target, errorMessageFor(error, response, timedOut), owningForm);
    return null;
  } finally {
    window.clearTimeout(timeoutId);
    window.clearTimeout(slowStartId);
    status.textContent = "";
    button.disabled = false;
    button.removeAttribute("aria-busy");
    owningForm.removeAttribute("aria-busy");
  }
}

async function submitSingleComplaint() {
  const text = textInput.value.trim();
  if (!text) {
    statusMessage.textContent = "";
    showError(result, "Enter complaint text before classifying it.", form);
    textInput.focus();
    return;
  }
  if (text.length > MAX_TEXT_LENGTH) {
    statusMessage.textContent = "";
    showError(result, `Keep the complaint to ${MAX_TEXT_LENGTH} characters or fewer.`, form);
    textInput.focus();
    return;
  }

  const payload = await requestPrediction("/predict", { text }, result, form, classifyButton, statusMessage);
  if (payload) {
    try {
      renderPrediction(payload);
    } catch (error) {
      console.error("CFPB demo returned an invalid prediction", error);
      showError(result, "The service returned an unreadable prediction. Try again in a moment.", form);
    }
  }
}

async function submitBatch() {
  const complaints = getBatchComplaints();
  if (!complaints.length) {
    batchStatus.textContent = "";
    showError(batchResult, "Enter at least one complaint, with one complaint per line.", batchForm);
    batchInput.focus();
    return;
  }
  if (complaints.length > MAX_BATCH_SIZE) {
    batchStatus.textContent = "";
    showError(batchResult, `A batch can contain up to ${MAX_BATCH_SIZE} complaints.`, batchForm);
    batchInput.focus();
    return;
  }
  const oversizedIndex = complaints.findIndex((complaint) => complaint.length > MAX_TEXT_LENGTH);
  if (oversizedIndex !== -1) {
    batchStatus.textContent = "";
    showError(batchResult, `Complaint ${oversizedIndex + 1} exceeds the ${MAX_TEXT_LENGTH}-character limit.`, batchForm);
    batchInput.focus();
    return;
  }

  const payload = await requestPrediction("/predict/batch", { text: complaints }, batchResult, batchForm, batchButton, batchStatus);
  if (payload) {
    try {
      renderBatchPredictions(payload, complaints.length);
    } catch (error) {
      console.error("CFPB demo returned invalid batch predictions", error);
      showError(batchResult, "The service returned an unreadable batch response. Try again in a moment.", batchForm);
    }
  }
}

textInput.addEventListener("input", updateCharacterCount);
batchInput.addEventListener("input", updateBatchCount);
document.querySelectorAll("[data-example]").forEach((button) => {
  button.addEventListener("click", () => {
    textInput.value = button.dataset.example;
    updateCharacterCount();
    textInput.focus();
  });
});
form.addEventListener("submit", (event) => {
  event.preventDefault();
  submitSingleComplaint();
});
batchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  submitBatch();
});
updateCharacterCount();
updateBatchCount();

fetch(`${API_BASE_URL}/health`, { mode: "cors", credentials: "omit" }).catch(() => {});
