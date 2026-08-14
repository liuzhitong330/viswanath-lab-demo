(function () {
  "use strict";

  const config = window.VISWANATH_DEMO_DATA;
  if (!config) return;

  const treatmentFilter = document.getElementById("treatment-filter");
  const qcFilter = document.getElementById("qc-filter");
  const scanSelect = document.getElementById("scan-select");
  const scanQueue = document.getElementById("scan-queue");
  const scanSummary = document.getElementById("review-summary");
  const scanReadout = document.getElementById("scan-readout");
  const spectrum = document.getElementById("spectrum-viz");
  const inhibitorSelect = document.getElementById("inhibitor-select");
  const threshold = document.getElementById("effect-threshold");
  const thresholdOutput = document.getElementById("threshold-output");
  const responseBody = document.getElementById("response-body");
  const responseReadout = document.getElementById("response-readout");
  const nextExperiment = document.getElementById("next-experiment");

  let scans = [];
  let selectedScanId = null;

  function svgElement(tag, attrs, text) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
    Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
    if (text !== undefined) el.textContent = text;
    return el;
  }

  function scanPasses(scan, levelName) {
    const level = config.qcLevels[levelName];
    return scan.completion === 1 &&
      scan.snrProxy >= level.snr &&
      scan.shapeCorrelation >= level.correlation &&
      Math.abs(scan.driftHz) <= level.drift;
  }

  function scanFailures(scan, levelName) {
    const level = config.qcLevels[levelName];
    const failures = [];
    if (scan.completion < 1) failures.push("incomplete acquisition log");
    if (scan.snrProxy < level.snr) failures.push(`signal/noise proxy ${scan.snrProxy} < ${level.snr}`);
    if (scan.shapeCorrelation < level.correlation) failures.push(`shape correlation ${scan.shapeCorrelation} < ${level.correlation}`);
    if (Math.abs(scan.driftHz) > level.drift) failures.push(`relative drift ${Math.abs(scan.driftHz).toFixed(1)} Hz > ${level.drift} Hz`);
    return failures;
  }

  function reviewScore(scan, levelName) {
    const level = config.qcLevels[levelName];
    return (scan.snrProxy < level.snr ? (level.snr - scan.snrProxy) / level.snr : 0) +
      (scan.shapeCorrelation < level.correlation ? (level.correlation - scan.shapeCorrelation) / level.correlation : 0) +
      (Math.abs(scan.driftHz) > level.drift ? (Math.abs(scan.driftHz) - level.drift) / level.drift : 0) +
      (scan.completion < 1 ? 2 : 0);
  }

  function visibleScans() {
    const treatment = treatmentFilter.value;
    return scans.filter((scan) => treatment === "All" || scan.treatment === treatment);
  }

  function drawSpectrum(scan) {
    spectrum.replaceChildren();
    const width = 600;
    const height = 300;
    const left = 46;
    const right = 15;
    const top = 18;
    const bottom = 42;
    const plotWidth = width - left - right;
    const plotHeight = height - top - bottom;
    const xMin = Math.min(...scan.frequencyHz);
    const xMax = Math.max(...scan.frequencyHz);
    const yMax = Math.max(1, ...scan.spectrum) * 1.04;

    [0, 0.5, 1].forEach((fraction) => {
      const y = top + plotHeight * (1 - fraction);
      spectrum.appendChild(svgElement("line", { x1:left, y1:y, x2:left + plotWidth, y2:y, class:"grid-line" }));
      spectrum.appendChild(svgElement("text", { x:left - 7, y:y + 4, "text-anchor":"end", class:"axis-label" }, fraction.toFixed(1)));
    });

    [2000, 1000, 0, -1000, -2000].forEach((tick) => {
      const x = left + (xMax - tick) / (xMax - xMin) * plotWidth;
      spectrum.appendChild(svgElement("line", { x1:x, y1:top, x2:x, y2:top + plotHeight, class:"grid-line" }));
      spectrum.appendChild(svgElement("text", { x, y:height - 17, "text-anchor":"middle", class:"axis-label" }, tick));
    });

    const points = scan.frequencyHz.map((frequency, index) => {
      const x = left + (xMax - frequency) / (xMax - xMin) * plotWidth;
      const y = top + plotHeight * (1 - scan.spectrum[index] / yMax);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
    spectrum.appendChild(svgElement("polyline", { points, class:"spectrum-line" }));
    spectrum.appendChild(svgElement("text", { x:left + plotWidth / 2, y:height - 1, "text-anchor":"middle", class:"axis-label" }, "Relative frequency offset (Hz)"));
  }

  function renderSelectedScan(scan) {
    if (!scan) return;
    selectedScanId = scan.id;
    scanSelect.value = String(scan.id);
    drawSpectrum(scan);
    const levelName = qcFilter.value;
    const failures = scanFailures(scan, levelName);
    const status = failures.length ? "Manual review" : "Ready for fitting review";
    const day = scan.day === null ? "not encoded" : `day ${scan.day}`;
    scanReadout.innerHTML = `
      <div class="readout-grid">
        <div><span>Selected acquisition</span><strong>Scan ${scan.id} · ${scan.comment}</strong></div>
        <div><span>Recorded condition</span><strong>${scan.treatment} · ${day}</strong></div>
        <div><span>Acquisition</span><strong>${scan.points.toLocaleString()} complex points · ${scan.averages} averages · TE ${scan.teMs} ms · TR ${scan.trS} s</strong></div>
        <div><span>QC summary</span><strong>${status}</strong></div>
        <div><span>Signal / shape</span><strong>SNR proxy ${scan.snrProxy} · correlation ${scan.shapeCorrelation}</strong></div>
        <div><span>Alignment / record</span><strong>${scan.driftHz.toFixed(1)} Hz relative drift · ${scan.completedBlocks}/${scan.averages} complete</strong></div>
      </div>
      <div class="readout-actions">
        <p><strong>What this lets the lab do:</strong> ${failures.length ? `Route this acquisition to manual review because ${failures.join("; ")}.` : "Move this acquisition into validated metabolite fitting while preserving a transparent QC record."}</p>
        <p><strong>Where Cathy adds value:</strong> I parsed the raw Varian files, reconstructed the review spectrum, and made the acceptance rule explicit so it can be reused on the lab's next imaging cohort.</p>
      </div>`;
    Array.from(scanQueue.children).forEach((button) => {
      button.dataset.selected = String(Number(button.dataset.scanId) === scan.id);
    });
  }

  function renderScanExplorer() {
    const levelName = qcFilter.value;
    const level = config.qcLevels[levelName];
    const filtered = visibleScans();
    const ranked = [...filtered].sort((a, b) => reviewScore(b, levelName) - reviewScore(a, levelName) || a.id - b.id);
    const eligible = filtered.filter((scan) => scanPasses(scan, levelName));
    const review = filtered.length - eligible.length;

    scanSummary.textContent = `${filtered.length} scans in view · ${eligible.length} pass · ${review} need review · gate: SNR ≥ ${level.snr}, correlation ≥ ${level.correlation}, |drift| ≤ ${level.drift} Hz`;
    document.getElementById("metric-eligible").textContent = String(eligible.length);

    scanSelect.replaceChildren();
    filtered.forEach((scan) => {
      const option = document.createElement("option");
      option.value = scan.id;
      option.textContent = `Scan ${scan.id} · ${scan.comment}`;
      scanSelect.appendChild(option);
    });

    scanQueue.replaceChildren();
    ranked.slice(0, 10).forEach((scan) => {
      const pass = scanPasses(scan, levelName);
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.scanId = scan.id;
      button.dataset.state = pass ? "pass" : "review";
      button.innerHTML = `<strong>Scan ${scan.id}</strong>${pass ? "Pass" : "Review"} · SNR ${scan.snrProxy}`;
      button.addEventListener("click", () => renderSelectedScan(scan));
      scanQueue.appendChild(button);
    });

    let selected = filtered.find((scan) => scan.id === selectedScanId);
    if (!selected) selected = ranked.find((scan) => !scanPasses(scan, levelName)) || ranked[0];
    renderSelectedScan(selected);
  }

  function percentChange(control, treated) {
    return (treated - control) / control * 100;
  }

  function renderResponseGate() {
    const inhibitor = inhibitorSelect.value;
    const gate = Number(threshold.value);
    thresholdOutput.value = `${gate}%`;
    thresholdOutput.textContent = `${gate}%`;
    responseBody.replaceChildren();

    const results = config.responseModels.map((entry) => {
      const changes = {
        "2-HG": percentChange(entry.values.Control["2-HG"], entry.values[inhibitor]["2-HG"]),
        Glu: percentChange(entry.values.Control.Glu, entry.values[inhibitor].Glu),
        GLX: percentChange(entry.values.Control.GLX, entry.values[inhibitor].GLX)
      };
      const checks = {
        "2-HG": changes["2-HG"] <= -gate,
        Glu: changes.Glu >= gate,
        GLX: changes.GLX >= gate
      };
      return { ...entry, changes, checks, pass: Object.values(checks).every(Boolean) };
    });

    results.forEach((entry) => {
      const row = document.createElement("tr");
      const changeCell = (name) => {
        const value = entry.changes[name];
        const sign = value > 0 ? "+" : "";
        return `<td><span class="change ${entry.checks[name] ? "good" : "weak"}">${sign}${value.toFixed(1)}%</span></td>`;
      };
      row.innerHTML = `
        <td><strong>${entry.model}</strong><small>${entry.context}<br>${entry.timepoint} · n=${entry.n[inhibitor]} treated</small></td>
        ${changeCell("2-HG")}${changeCell("Glu")}${changeCell("GLX")}
        <td><span class="gate-badge ${entry.pass ? "pass" : "hold"}">${entry.pass ? "Advance" : "Hold"}</span></td>`;
      responseBody.appendChild(row);
    });

    const passing = results.filter((entry) => entry.pass);
    const treatedN = results.reduce((sum, entry) => sum + entry.n[inhibitor], 0);
    const markerRows = results.flatMap((entry) => [
      { model:entry.model, marker:"2-HG", effect:Math.abs(entry.changes["2-HG"]) },
      { model:entry.model, marker:"Glu", effect:entry.changes.Glu },
      { model:entry.model, marker:"GLX", effect:entry.changes.GLX }
    ]);
    const weakest = markerRows.reduce((a, b) => a.effect < b.effect ? a : b);
    const largestGlu = results.reduce((a, b) => a.changes.Glu > b.changes.Glu ? a : b);

    document.getElementById("metric-treated-n").textContent = String(treatedN);
    document.getElementById("metric-pass-models").textContent = `${passing.length}/3`;
    responseReadout.innerHTML = `<strong>${inhibitor}</strong> clears the ${gate}% three-marker gate in <strong>${passing.length} of 3 models</strong>. The weakest component is ${weakest.model} ${weakest.marker} at ${weakest.effect.toFixed(1)}% absolute change; the largest Glu rise is ${largestGlu.model} at +${largestGlu.changes.Glu.toFixed(1)}%.<div class="readout-actions"><p><strong>What this lets the lab do:</strong> See exactly when a cross-model imaging signature survives a stricter biological-effect requirement.</p><p><strong>Where Cathy adds value:</strong> I recalculated every effect from the reported means and linked the weakest result to a controlled next experiment instead of treating all models as equally resolved.</p></div>`;

    const focus = passing.length === 3 ? "Confirm the weakest edge while preserving the two patient-derived models as the translational core." : `Resolve ${results.filter((entry) => !entry.pass).map((entry) => entry.model).join(" and ")} before calling the signature cross-model.`;
    nextExperiment.innerHTML = `
      <strong>Proposed next experiment · ${focus}</strong>
      <ul>
        <li><b>Cell/organoid arm:</b> vehicle and ${inhibitor} dose response in patient-derived models plus an IDH-wild-type comparator; measure viability, 2-HG target engagement, and downstream signaling.</li>
        <li><b>Mechanism arm:</b> [U-<sup>13</sup>C]-glutamine tracing for Glu/GLX and pathway compensation, with isotope-free and vehicle controls.</li>
        <li><b>In vivo/PK arm:</b> luciferase-tagged orthotopic tumors, matched dosing, longitudinal IVIS plus MRS, plasma/brain/tumor concentrations at 0.5, 2, 6, and 24 hours, and survival.</li>
        <li><b>Discriminating outcome:</b> require brain exposure and 2-HG suppression before interpreting Glu/GLX or IVIS changes as pharmacodynamic response.</li>
      </ul>`;
  }

  treatmentFilter.addEventListener("change", renderScanExplorer);
  qcFilter.addEventListener("change", renderScanExplorer);
  scanSelect.addEventListener("change", () => renderSelectedScan(scans.find((scan) => scan.id === Number(scanSelect.value))));
  inhibitorSelect.addEventListener("change", renderResponseGate);
  threshold.addEventListener("input", renderResponseGate);
  renderResponseGate();

  scanSummary.innerHTML = '<div class="loading">Loading 77 raw acquisitions…</div>';
  fetch("derived_mrs.json")
    .then((response) => {
      if (!response.ok) throw new Error(`Data request failed (${response.status})`);
      return response.json();
    })
    .then((payload) => {
      scans = payload.scans;
      document.getElementById("metric-scans").textContent = payload.summary.scanCount;
      document.getElementById("metric-complete").textContent = payload.summary.completeCount;
      renderScanExplorer();
    })
    .catch((error) => {
      scanSummary.innerHTML = `<div class="error-note">The raw-scan data could not be loaded: ${error.message}</div>`;
    });
}());
