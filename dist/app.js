const form = document.querySelector("#simulationForm");
const conditionsFields = document.querySelector("#conditionsFields");
const fixedFields = document.querySelector("#fixedFields");
const denomination = document.querySelector("#denomination");
const samplingMode = document.querySelector("#samplingMode");
const precisionField = document.querySelector("#precisionField");
const sampleField = document.querySelector("#sampleField");
const samplingHint = document.querySelector("#samplingHint");
const runButton = document.querySelector("#runButton");
const cancelButton = document.querySelector("#cancelButton");
const progressBar = document.querySelector("#progressBar");
const progressLabel = document.querySelector("#progressLabel");
const progressCount = document.querySelector("#progressCount");
const formError = document.querySelector("#formError");
const emptyState = document.querySelector("#emptyState");
const resultContent = document.querySelector("#resultContent");
const copyButton = document.querySelector("#copyButton");
const installButton = document.querySelector("#installButton");
const networkBadge = document.querySelector("#networkBadge");
const languageSelect = document.querySelector("#languageSelect");

let mode = "conditions";
let worker = null;
let lastResult = null;
let installPrompt = null;
let language = (() => {
  try { return localStorage.getItem("bridge-language") === "en" ? "en" : "zh-Hant"; }
  catch { return "zh-Hant"; }
})();

const STATIC_EN = {
  "橋牌合約模擬器": "Bridge Contract Simulator",
  "Double-dummy 最佳攻防分析": "Double-dummy optimal play analysis",
  "語言": "Language",
  "離線可用": "Offline ready",
  "安裝應用": "Install app",
  "模擬條件": "Simulation setup",
  "條件模擬": "Constraint mode",
  "固定南北牌": "Fixed North/South hands",
  "北家條件": "North constraints",
  "南家條件": "South constraints",
  "HCP 範圍": "HCP range",
  "牌型": "Shape",
  "S-H-D-C 張數": "S-H-D-C lengths",
  "特定花色牌張": "Specific suit holding",
  "至少一門單張": "At least one singleton",
  "至少一門缺門": "At least one void",
  "南北合計 HCP": "Combined N/S HCP",
  "北家 13 張牌": "North's 13 cards",
  "南家 13 張牌": "South's 13 cards",
  "依 S.H.D.C 輸入；缺門可留空或輸入 -。": "Enter cards in S.H.D.C order; leave a void empty or use -.",
  "合約與模擬設定": "Contract and simulation settings",
  "線位": "Level",
  "花色": "Strain",
  "莊家": "Declarer",
  "N 北家": "N North",
  "S 南家": "S South",
  "最少王牌配合": "Minimum trump fit",
  "最多王牌配合": "Maximum trump fit",
  "東西王牌分布": "E/W trump split",
  "東／西各自 HCP 上限": "HCP cap for each opponent",
  "樣本數模式": "Sample-size mode",
  "依目標誤差自動": "Automatic by target margin",
  "手動輸入": "Manual entry",
  "95% 目標誤差": "95% target margin",
  "±5%（385 副，快速）": "±5% (385 deals, fast)",
  "±3%（1,068 副）": "±3% (1,068 deals)",
  "±2%（2,401 副）": "±2% (2,401 deals)",
  "±1%（9,604 副）": "±1% (9,604 deals)",
  "有效模擬副數": "Valid deals to simulate",
  "隨機種子": "Random seed",
  "開始模擬": "Run simulation",
  "停止": "Stop",
  "就緒": "Ready",
  "模擬結果": "Simulation results",
  "複製結果": "Copy results",
  "設定條件後開始模擬": "Set the conditions and run a simulation",
  "結果會顯示成約率、95% 信賴區間、磴數分布和代表牌例。": "Results include the making rate, 95% confidence interval, trick distribution, and example deals.",
  "成約率": "Making rate",
  "平均磴數": "Average tricks",
  "有效樣本": "Valid samples",
  "磴數分布": "Trick distribution",
  "綠色為成約": "Green indicates a made contract",
  "成約與失敗": "Made vs. down",
  "成約": "Made",
  "失敗": "Down",
  "完整數據": "Full data",
  "總耗時": "Elapsed time",
  "候選牌局": "Candidate deals",
  "平均候選/有效牌": "Candidates per valid deal",
  "磴數": "Tricks",
  "副數": "Deals",
  "比例": "Share",
  "東西王牌分布（不分方向）": "E/W trump split (either direction)",
  "分布": "Split",
  "成約牌例": "Made-contract examples",
  "失敗牌例": "Failed-contract examples",
  "所有發牌與 DDS 分析都在這台裝置上完成；安裝後可全程離線使用。": "All dealing and DDS analysis run on this device. Once installed, the app works fully offline."
};

const originalText = new WeakMap();
const originalAttributes = new WeakMap();
let number;
let percent;

function tr(chinese, english) { return language === "en" ? english : chinese; }

function updateFormatters() {
  const locale = language === "en" ? "en-US" : "zh-TW";
  number = new Intl.NumberFormat(locale);
  percent = new Intl.NumberFormat(locale, { style: "percent", minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function translateStaticText() {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const current = node.nodeValue.trim();
    if (!current) continue;
    if (!originalText.has(node)) originalText.set(node, current);
    const source = originalText.get(node);
    const translated = language === "en" ? (STATIC_EN[source] ?? source) : source;
    const leading = node.nodeValue.match(/^\s*/)?.[0] ?? "";
    const trailing = node.nodeValue.match(/\s*$/)?.[0] ?? "";
    node.nodeValue = `${leading}${translated}${trailing}`;
  }
  for (const element of document.querySelectorAll("[placeholder], [aria-label]")) {
    if (!originalAttributes.has(element)) {
      originalAttributes.set(element, {
        placeholder: element.getAttribute("placeholder"),
        ariaLabel: element.getAttribute("aria-label")
      });
    }
    const original = originalAttributes.get(element);
    if (original.placeholder !== null) {
      const placeholders = { "自動產生": "Auto-generate" };
      element.setAttribute("placeholder", language === "en" ? (placeholders[original.placeholder] ?? original.placeholder) : original.placeholder);
    }
    if (original.ariaLabel !== null) {
      const labels = {
        "介面語言": "Interface language",
        "模擬模式": "Simulation mode",
        "DDS 磴數分布長條圖": "DDS trick distribution bar chart",
        "成約與失敗圓環圖": "Made versus down doughnut chart"
      };
      element.setAttribute("aria-label", language === "en" ? (labels[original.ariaLabel] ?? original.ariaLabel) : original.ariaLabel);
    }
  }
  document.title = tr("橋牌合約成約率模擬器", "Bridge Contract Making-rate Simulator");
  document.documentElement.lang = language;
  document.querySelector('meta[name="description"]').content = tr(
    "離線橋牌 Double-dummy 合約成約率模擬器",
    "Offline double-dummy bridge contract making-rate simulator"
  );
}

function applyLanguage(nextLanguage) {
  language = nextLanguage === "en" ? "en" : "zh-Hant";
  languageSelect.value = language;
  try { localStorage.setItem("bridge-language", language); } catch { /* storage can be unavailable */ }
  updateFormatters();
  translateStaticText();
  syncSampling();
  updateNetworkBadge();
  if (lastResult) {
    renderResult(lastResult);
    if (!worker) {
      progressLabel.textContent = tr("完成", "Complete");
      progressCount.textContent = tr(`${lastResult.elapsedSeconds.toFixed(1)} 秒`, `${lastResult.elapsedSeconds.toFixed(1)} sec`);
    }
  }
  else if (!worker) resetProgress();
}

function field(name) { return form.elements.namedItem(name); }
function fieldValue(name) { return String(field(name)?.value ?? "").trim(); }
function recommendedSamples(marginPercent) {
  const margin = marginPercent / 100;
  return Math.ceil(0.25 * (1.959963984540054 / margin) ** 2);
}

function syncMode() {
  conditionsFields.hidden = mode !== "conditions";
  fixedFields.hidden = mode !== "fixed";
  document.querySelectorAll(".segment").forEach(button => {
    const active = button.dataset.mode === mode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });
  syncFitField();
}

function syncFitField() {
  const hidden = denomination.value === "NT";
  document.querySelectorAll(".trump-only").forEach(element => { element.hidden = hidden; });
  for (const name of ["minimumFit", "maximumFit", "opponentTrumpSplits"]) field(name).disabled = hidden;
  if (hidden) {
    field("minimumFit").value = "0";
    field("maximumFit").value = "13";
    field("opponentTrumpSplits").value = "";
  } else if (fieldValue("minimumFit") === "0") {
    field("minimumFit").value = "8";
  }
}

function syncSampling() {
  const automatic = samplingMode.value === "auto";
  precisionField.hidden = !automatic;
  sampleField.hidden = automatic;
  field("marginPercent").disabled = !automatic;
  field("samples").disabled = automatic;
  if (automatic) {
    const samples = recommendedSamples(Number(fieldValue("marginPercent")));
    samplingHint.textContent = tr(
      `自動模式會以最保守的成約率估算樣本數；目前約需 ${number.format(samples)} 副。`,
      `Automatic mode uses the worst-case making rate; approximately ${number.format(samples)} deals are needed.`
    );
  } else {
    samplingHint.textContent = tr(
      "手動模式可自行輸入 1 到 100,000 副；數量越多，抽樣誤差越小。",
      "Manual mode accepts 1 to 100,000 deals; more deals reduce sampling error."
    );
  }
}

document.querySelectorAll(".segment").forEach(button => {
  button.addEventListener("click", () => { mode = button.dataset.mode; syncMode(); });
});
denomination.addEventListener("change", syncFitField);
samplingMode.addEventListener("change", syncSampling);
field("marginPercent").addEventListener("change", syncSampling);
languageSelect.addEventListener("change", () => applyLanguage(languageSelect.value));

function makeRequest() {
  const samples = samplingMode.value === "auto"
    ? recommendedSamples(Number(fieldValue("marginPercent")))
    : Number(fieldValue("samples"));
  const seedText = fieldValue("seed");
  const request = {
    mode,
    language,
    contract: {
      level: Number(fieldValue("level")),
      denomination: denomination.value,
      declarer: fieldValue("declarer")
    },
    samples,
    samplingMode: samplingMode.value,
    marginPercent: samplingMode.value === "auto" ? Number(fieldValue("marginPercent")) : null,
    minimumFit: denomination.value === "NT" ? 0 : Number(fieldValue("minimumFit")),
    maximumFit: denomination.value === "NT" ? 13 : Number(fieldValue("maximumFit")),
    opponentTrumpSplits: denomination.value === "NT" ? "" : fieldValue("opponentTrumpSplits"),
    opponentHcpMax: Number(fieldValue("opponentHcpMax")),
    seed: seedText === "" ? null : Number(seedText)
  };
  if (mode === "fixed") {
    request.fixedNorth = fieldValue("fixedNorth");
    request.fixedSouth = fieldValue("fixedSouth");
  } else {
    request.north = {
      hcp: fieldValue("northHcp"), shapes: fieldValue("northShapes"), suitLengths: fieldValue("northSuitLengths"),
      holdings: fieldValue("northHoldings"), singleton: field("northSingleton").checked, void: field("northVoid").checked
    };
    request.south = {
      hcp: fieldValue("southHcp"), shapes: fieldValue("southShapes"), suitLengths: fieldValue("southSuitLengths"),
      holdings: fieldValue("southHoldings"), singleton: field("southSingleton").checked, void: field("southVoid").checked
    };
    request.combinedHcp = fieldValue("combinedHcp");
  }
  return request;
}

function showError(message) {
  formError.textContent = message;
  formError.hidden = false;
}

function clearError() {
  formError.textContent = "";
  formError.hidden = true;
}

function setRunning(running) {
  runButton.disabled = running;
  cancelButton.hidden = !running;
  document.querySelectorAll("#simulationForm input, #simulationForm select, .segment").forEach(element => element.disabled = running);
  if (!running) { syncFitField(); syncSampling(); }
}

function resetProgress() {
  progressBar.max = 100;
  progressBar.value = 0;
  progressLabel.textContent = tr("就緒", "Ready");
  progressCount.textContent = "";
}

function onWorkerMessage(event) {
  const message = event.data;
  if (message.type === "progress") {
    if (message.stage === "loading") {
      progressBar.removeAttribute("value");
      progressLabel.textContent = tr("載入離線 DDS 引擎", "Loading offline DDS engine");
      progressCount.textContent = "";
      return;
    }
    progressBar.max = message.total || 1;
    progressBar.value = message.done;
    if (message.stage === "generation") {
      progressLabel.textContent = tr("產生符合條件的牌局", "Generating matching deals");
      progressCount.textContent = tr(
        `${number.format(message.done)} / ${number.format(message.total)}（候選 ${number.format(message.attempts)}）`,
        `${number.format(message.done)} / ${number.format(message.total)} (${number.format(message.attempts)} candidates)`
      );
    } else {
      progressLabel.textContent = tr("DDS 分析", "DDS analysis");
      progressCount.textContent = `${number.format(message.done)} / ${number.format(message.total)}`;
    }
  } else if (message.type === "complete") {
    lastResult = message.result;
    renderResult(lastResult);
    progressBar.max = lastResult.completedSamples;
    progressBar.value = lastResult.completedSamples;
    progressLabel.textContent = tr("完成", "Complete");
    progressCount.textContent = tr(`${lastResult.elapsedSeconds.toFixed(1)} 秒`, `${lastResult.elapsedSeconds.toFixed(1)} sec`);
    finishWorker();
  } else if (message.type === "error") {
    showError(message.message);
    progressLabel.textContent = tr("模擬失敗", "Simulation failed");
    progressCount.textContent = "";
    finishWorker();
  }
}

function finishWorker() {
  worker?.terminate();
  worker = null;
  setRunning(false);
}

form.addEventListener("submit", event => {
  event.preventDefault();
  clearError();
  const request = makeRequest();
  if (!Number.isInteger(request.samples) || request.samples < 1 || request.samples > 100000) {
    showError(tr("有效模擬副數必須介於 1 到 100,000。", "The number of valid deals must be between 1 and 100,000."));
    return;
  }
  if (request.seed !== null && (!Number.isInteger(request.seed) || request.seed < 0 || request.seed > 4294967295)) {
    showError(tr("隨機種子必須是 0 到 4,294,967,295 的整數。", "The random seed must be an integer from 0 to 4,294,967,295."));
    return;
  }
  setRunning(true);
  progressBar.removeAttribute("value");
  progressLabel.textContent = tr("啟動模擬引擎", "Starting simulation engine");
  progressCount.textContent = "";
  worker = new Worker("./simulator.worker.js", { type: "module" });
  worker.addEventListener("message", onWorkerMessage);
  worker.addEventListener("error", event => {
    showError(event.message || tr("無法啟動離線 DDS 引擎。", "Unable to start the offline DDS engine."));
    progressLabel.textContent = tr("模擬失敗", "Simulation failed");
    finishWorker();
  });
  worker.postMessage({ type: "start", request });
});

cancelButton.addEventListener("click", () => {
  finishWorker();
  resetProgress();
  progressLabel.textContent = tr("已停止", "Stopped");
});

function contractText(contract) { return `${contract.level}${contract.denomination} by ${contract.declarer}`; }

function formatDealExample(example, contract) {
  if (typeof example === "string") return example;
  const seatNames = language === "en"
    ? { N: "North", E: "East", S: "South", W: "West" }
    : { N: "北家", E: "東家", S: "南家", W: "西家" };
  const made = example.tricks >= contract.level + 6;
  const lines = [
    tr(
      `合約 ${contractText(contract)}｜DDS ${example.tricks} 磴｜${made ? "成約" : "失敗"}`,
      `Contract ${contractText(contract)} | DDS ${example.tricks} tricks | ${made ? "Made" : "Down"}`
    )
  ];
  for (const hand of example.hands) {
    lines.push(
      "",
      tr(
        `${hand.seat} ${seatNames[hand.seat]}｜${hand.hcp} HCP｜牌型 ${hand.shape.join("-")}`,
        `${hand.seat} ${seatNames[hand.seat]} | ${hand.hcp} HCP | Shape ${hand.shape.join("-")}`
      ),
      `  ♠ ${hand.suits.S}`,
      `  ♥ ${hand.suits.H}`,
      `  ♦ ${hand.suits.D}`,
      `  ♣ ${hand.suits.C}`
    );
  }
  return lines.join("\n");
}

function renderResult(result) {
  emptyState.hidden = true;
  resultContent.hidden = false;
  copyButton.disabled = false;
  document.querySelector("#makingRate").textContent = percent.format(result.makingRate);
  document.querySelector("#confidenceInterval").textContent = tr(
    `95% 信賴區間 ${percent.format(result.confidenceInterval[0])} – ${percent.format(result.confidenceInterval[1])}`,
    `95% confidence interval ${percent.format(result.confidenceInterval[0])} – ${percent.format(result.confidenceInterval[1])}`
  );
  document.querySelector("#averageTricks").textContent = result.averageTricks.toFixed(3);
  document.querySelector("#contractLabel").textContent = contractText(result.contract);
  document.querySelector("#completedSamples").textContent = number.format(result.completedSamples);
  document.querySelector("#attemptsLabel").textContent = tr(
    `成約 ${number.format(result.makingCount)}／失敗 ${number.format(result.failingCount)}`,
    `Made ${number.format(result.makingCount)} / Down ${number.format(result.failingCount)}`
  );
  document.querySelector("#madeCount").textContent = number.format(result.makingCount);
  document.querySelector("#downCount").textContent = number.format(result.failingCount);
  document.querySelector("#seedLabel").textContent = number.format(result.seed);
  document.querySelector("#elapsedLabel").textContent = tr(`${result.elapsedSeconds.toFixed(2)} 秒`, `${result.elapsedSeconds.toFixed(2)} sec`);
  document.querySelector("#attemptCount").textContent = number.format(result.attempts);
  document.querySelector("#attemptRatio").textContent = (result.attempts / result.completedSamples).toFixed(2);
  document.querySelector("#makingExamples").textContent = result.makingExamples.map(example => formatDealExample(example, result.contract)).join("\n\n────────────\n\n") || tr("無", "None");
  document.querySelector("#failingExamples").textContent = result.failingExamples.map(example => formatDealExample(example, result.contract)).join("\n\n────────────\n\n") || tr("無", "None");

  const warning = document.querySelector("#sampleWarning");
  warning.hidden = !result.generationExhausted;
  warning.textContent = result.generationExhausted
    ? tr(
      `條件牌局少於要求的 ${number.format(result.requestedSamples)} 副；本次僅分析找到的 ${number.format(result.completedSamples)} 副不重複有效牌局。`,
      `Fewer matching deals exist than the requested ${number.format(result.requestedSamples)}; this run analyzed the ${number.format(result.completedSamples)} unique valid deals found.`
    )
    : "";

  const tbody = document.querySelector("#distributionBody");
  tbody.replaceChildren(...result.trickCounts.map((count, tricks) => {
    const row = document.createElement("tr");
    const status = tricks >= result.contract.level + 6 ? tr(" · 成約", " · Made") : "";
    row.innerHTML = `<td>${tricks} ${tr("磴", "tricks")}${status}</td><td>${number.format(count)}</td><td>${percent.format(count / result.completedSamples)}</td>`;
    return row;
  }));

  const splitEntries = Object.entries(result.opponentTrumpSplits ?? {})
    .sort(([first], [second]) => first.localeCompare(second, undefined, { numeric: true }));
  const splitWrap = document.querySelector("#opponentSplitWrap");
  splitWrap.hidden = splitEntries.length === 0;
  document.querySelector("#opponentSplitBody").replaceChildren(...splitEntries.map(([split, count]) => {
    const row = document.createElement("tr");
    row.innerHTML = `<td>${split}</td><td>${number.format(count)}</td><td>${percent.format(count / result.completedSamples)}</td>`;
    return row;
  }));
  drawTrickChart(result);
  drawMakingChart(result);
}

function setupCanvas(canvas) {
  const ratio = Math.max(1, window.devicePixelRatio || 1);
  const width = Math.max(260, canvas.clientWidth);
  const height = Math.max(170, canvas.clientHeight);
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  const context = canvas.getContext("2d");
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { context, width, height };
}

function drawTrickChart(result) {
  const canvas = document.querySelector("#trickChart");
  const { context: ctx, width, height } = setupCanvas(canvas);
  ctx.clearRect(0, 0, width, height);
  const left = 30, right = 8, top = 18, bottom = 28;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const maxCount = Math.max(...result.trickCounts, 1);
  const gap = Math.max(2, plotWidth * 0.008);
  const barWidth = (plotWidth - gap * 13) / 14;
  ctx.strokeStyle = "rgba(160, 196, 210, .25)";
  ctx.beginPath(); ctx.moveTo(left, top + plotHeight); ctx.lineTo(width - right, top + plotHeight); ctx.stroke();
  ctx.textAlign = "center"; ctx.font = "11px system-ui"; ctx.fillStyle = "#8da5b2";
  result.trickCounts.forEach((count, tricks) => {
    const x = left + tricks * (barWidth + gap);
    const barHeight = count / maxCount * (plotHeight - 12);
    ctx.fillStyle = tricks >= result.contract.level + 6 ? "#2dd4bf" : "#587482";
    ctx.fillRect(x, top + plotHeight - barHeight, barWidth, barHeight);
    ctx.fillStyle = "#8da5b2";
    ctx.fillText(String(tricks), x + barWidth / 2, height - 8);
    if (count && width > 390) {
      ctx.fillStyle = "#c7d8df"; ctx.font = "10px system-ui";
      ctx.fillText(`${Math.round(count / result.completedSamples * 100)}%`, x + barWidth / 2, Math.max(10, top + plotHeight - barHeight - 5));
    }
  });
}

function drawMakingChart(result) {
  const canvas = document.querySelector("#makingChart");
  const { context: ctx, width, height } = setupCanvas(canvas);
  ctx.clearRect(0, 0, width, height);
  const centerX = width / 2, centerY = height / 2;
  const radius = Math.min(width, height) * 0.34;
  const lineWidth = Math.max(18, radius * 0.3);
  ctx.lineWidth = lineWidth; ctx.lineCap = "butt";
  ctx.strokeStyle = "#587482"; ctx.beginPath(); ctx.arc(centerX, centerY, radius, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = "#2dd4bf"; ctx.beginPath(); ctx.arc(centerX, centerY, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * result.makingRate); ctx.stroke();
  ctx.fillStyle = "#e6f0f4"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.font = `700 ${Math.max(22, radius * 0.42)}px system-ui`;
  ctx.fillText(`${(result.makingRate * 100).toFixed(1)}%`, centerX, centerY - 5);
  ctx.fillStyle = "#8da5b2"; ctx.font = "12px system-ui"; ctx.fillText(tr("成約率", "Making rate"), centerX, centerY + 20);
}

function resultAsText(result) {
  const lines = [
    tr("橋牌合約成約率模擬（Double-dummy）", "Bridge contract making-rate simulation (Double-dummy)"),
    tr(`合約：${contractText(result.contract)}`, `Contract: ${contractText(result.contract)}`),
    tr(`有效樣本：${number.format(result.completedSamples)}`, `Valid samples: ${number.format(result.completedSamples)}`),
    tr(`成約／失敗：${number.format(result.makingCount)}／${number.format(result.failingCount)}`, `Made / Down: ${number.format(result.makingCount)} / ${number.format(result.failingCount)}`),
    tr(`成約率：${percent.format(result.makingRate)}`, `Making rate: ${percent.format(result.makingRate)}`),
    tr(`95% 信賴區間：${percent.format(result.confidenceInterval[0])} – ${percent.format(result.confidenceInterval[1])}`, `95% confidence interval: ${percent.format(result.confidenceInterval[0])} – ${percent.format(result.confidenceInterval[1])}`),
    tr(`平均磴數：${result.averageTricks.toFixed(3)}`, `Average tricks: ${result.averageTricks.toFixed(3)}`),
    tr(`隨機種子：${result.seed}`, `Random seed: ${result.seed}`),
    "",
    tr("磴數分布", "Trick distribution"),
    ...result.trickCounts.map((count, tricks) => `${tricks} ${tr("磴", "tricks")}\t${count}\t${percent.format(count / result.completedSamples)}`)
  ];
  const splitEntries = Object.entries(result.opponentTrumpSplits ?? {});
  if (splitEntries.length) {
    lines.push("", tr("東西王牌分布（不分方向）", "E/W trump split (either direction)"));
    lines.push(...splitEntries.map(([split, count]) => `${split}\t${count}\t${percent.format(count / result.completedSamples)}`));
  }
  if (result.makingExamples.length) {
    lines.push("", tr("成約牌例", "Made-contract examples"));
    lines.push(...result.makingExamples.map(example => formatDealExample(example, result.contract)));
  }
  if (result.failingExamples.length) {
    lines.push("", tr("失敗牌例", "Failed-contract examples"));
    lines.push(...result.failingExamples.map(example => formatDealExample(example, result.contract)));
  }
  if (result.generationExhausted) lines.splice(8, 0, tr(
    `注意：要求 ${result.requestedSamples} 副，只找到 ${result.completedSamples} 副不重複有效牌局。`,
    `Note: ${result.requestedSamples} deals were requested, but only ${result.completedSamples} unique valid deals were found.`
  ));
  return lines.join("\n");
}

copyButton.addEventListener("click", async () => {
  if (!lastResult) return;
  await navigator.clipboard.writeText(resultAsText(lastResult));
  const original = copyButton.textContent;
  copyButton.textContent = tr("已複製", "Copied");
  setTimeout(() => { copyButton.textContent = original; }, 1500);
});

window.addEventListener("resize", () => {
  if (!lastResult) return;
  clearTimeout(window.__bridgeChartTimer);
  window.__bridgeChartTimer = setTimeout(() => { drawTrickChart(lastResult); drawMakingChart(lastResult); }, 120);
});

window.addEventListener("beforeinstallprompt", event => {
  event.preventDefault();
  installPrompt = event;
  installButton.hidden = false;
});
installButton.addEventListener("click", async () => {
  if (!installPrompt) return;
  await installPrompt.prompt();
  installPrompt = null;
  installButton.hidden = true;
});
window.addEventListener("appinstalled", () => { installButton.hidden = true; });

function updateNetworkBadge() {
  networkBadge.textContent = navigator.onLine ? tr("離線可用", "Offline ready") : tr("目前離線", "Currently offline");
}
window.addEventListener("online", updateNetworkBadge);
window.addEventListener("offline", updateNetworkBadge);

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./service-worker.js").catch(() => {
    networkBadge.textContent = tr("無法啟用離線快取", "Offline cache unavailable");
  });
}

updateFormatters();
syncMode();
applyLanguage(language);
