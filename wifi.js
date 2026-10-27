/* SimuMath Wi-Fi · Laboratorio de propagación y métodos numéricos
 * Todos los datos permanecen en el navegador. Los ejemplos son sintéticos.
 */
'use strict';
(function () {
  const byId = (id) => document.getElementById(id);
  const state = { rows: [], groups: [], source: 'none', label: '', sweep: [], sweepTimer: null, sweepChart: null, analysisChart: null, fit: null };
  const chartColors = { theory: '#149a8a', observed: '#e39c48', fitted: '#7970cf', grid: 'rgba(49,85,108,.11)', text: '#687f91' };
  const fmt = (v, digits = 1) => Number.isFinite(v) ? Number(v).toFixed(digits) : '—';
  const finite = (v) => Number.isFinite(v);
  const rawNumber = (id) => Number(byId(id).value);
  const escapeCSV = (v) => '"' + String(v).replace(/"/g, '""') + '"';

  function params() {
    const d0 = rawNumber('referenceDistance'), r0 = rawNumber('referenceRSSI'), n = rawNumber('exponent');
    const walls = rawNumber('wallCount'), wallLoss = rawNumber('wallLoss');
    if (![d0, r0, n, walls, wallLoss].every(finite) || d0 <= 0 || n <= 0 || walls < 0 || wallLoss < 0 || Math.abs(r0) > 300)
      throw new Error('Revisa los parámetros: d₀ y n deben ser positivos; la atenuación no puede ser negativa.');
    return { d0, r0, n, walls, wallLoss, band: byId('band').value };
  }
  function model(d, p) {
    if (!finite(d) || d <= 0) return NaN;
    return p.r0 - 10 * p.n * Math.log10(d / p.d0) - p.walls * p.wallLoss;
  }
  function modelFit(d, fit, d0) { return fit.intercept + fit.slope * Math.log10(d / d0); }
  function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }
  function report(id, message, mode) {
    const el = byId(id);
    el.textContent = message;
    if (id === 'importStatus') el.className = 'import-status' + (mode ? ' ' + mode : '');
  }
  function readScene() {
    let p;
    try { p = params(); } catch (err) { report('sweepMessage', err.message); return; }
    const input = byId('distance');
    const d = Math.max(.1, Number(input.value) || p.d0);
    const rssi = model(d, p);
    const band = p.band;
    byId('exponentOut').textContent = fmt(p.n);
    byId('wallCountOut').textContent = String(p.walls);
    byId('distanceOut').textContent = fmt(d) + ' m';
    byId('scene-band').textContent = band;
    byId('signalValue').innerHTML = fmt(rssi) + ' <small>dBm</small>';
    byId('signalDistance').innerHTML = fmt(d) + ' <small>m</small>';
    byId('signalLoss').textContent = 'Pérdida relativa: ' + fmt(p.r0 - rssi) + ' dB';
    byId('theoreticalN').textContent = fmt(p.n, 2);
    let label = 'Muy débil', klass = 'quality-bad', bars = 0;
    if (rssi >= -50) { label = 'Excelente'; klass = 'quality-good'; bars = 5; }
    else if (rssi >= -60) { label = 'Buena señal'; klass = 'quality-good'; bars = 4; }
    else if (rssi >= -70) { label = 'Aceptable'; klass = 'quality-mid'; bars = 3; }
    else if (rssi >= -80) { label = 'Señal débil'; klass = 'quality-mid'; bars = 2; }
    else if (rssi >= -90) { label = 'Muy débil'; bars = 1; }
    const badge = byId('signalStatus');
    badge.textContent = label;
    badge.className = 'quality ' + klass;
    Array.from(byId('signalBars').children).forEach((bar, i) => bar.classList.toggle('on', i < bars));
    const maxDistance = Math.max(.1, Number(input.max) || 12);
    const minDistance = Math.max(.1, Number(input.min) || 1);
    const x = 26 + clamp((d - minDistance) / Math.max(.1, maxDistance - minDistance), 0, 1) * 63;
    byId('receiver').style.left = x + '%';
    const wallsNode = byId('sceneWalls');
    wallsNode.replaceChildren();
    for (let i = 0; i < p.walls; i++) {
      const wall = document.createElement('span');
      wall.className = 'wall';
      wall.style.left = (12 + (x - 12) * (i + 1) / (p.walls + 1)) + '%';
      const caption = document.createElement('span'); caption.className = 'wall-label'; caption.textContent = 'PARED'; wall.appendChild(caption);
      wallsNode.appendChild(wall);
    }
    byId('sceneEnd').textContent = fmt(maxDistance, 0) + ' m';
    const feedback = p.walls > 0
      ? 'Hay ' + p.walls + (p.walls === 1 ? ' pared' : ' paredes') + ' en el trayecto: añadimos ' + fmt(p.walls * p.wallLoss) + ' dB de pérdida estimada.'
      : d < maxDistance * .4 ? '¡Bien! Al acercar el teléfono, el modelo predice una señal más intensa.' : 'El teléfono está más lejos. Observa cómo la señal disminuye mientras lo mueves.';
    byId('sceneFeedback').textContent = feedback;
    byId('phoneBubble').textContent = label;
    const device = byId('receiver');
    device.setAttribute('aria-valuemin', String(minDistance));
    device.setAttribute('aria-valuemax', String(maxDistance));
    device.setAttribute('aria-valuenow', String(d));
    device.setAttribute('aria-valuetext', fmt(d, 1) + ' metros; ' + fmt(rssi, 1) + ' dBm; ' + label);
    if (state.sweepChart) {
      const signature = [p.d0, p.r0, p.n, p.walls, p.wallLoss, minDistance, maxDistance].join('|');
      const chart = state.sweepChart;
      if (state.plotSignature !== signature) {
        state.plotSignature = signature;
        const curve = [];
        for (let i = 0; i <= 70; i++) {
          const dx = minDistance + (maxDistance - minDistance) * i / 70;
          curve.push({ x: dx, y: model(dx, p) });
        }
        chart.data.datasets[1].data = curve;
      }
      chart.data.datasets[2].data = [{ x: d, y: rssi }];
      chart.update('none');
    }
  }
  function chartOptions(xTitle, yTitle) {
    return {
      responsive: true, maintainAspectRatio: false, animation: false, parsing: false,
      interaction: { mode: 'nearest', intersect: false },
      plugins: { legend: { display: false }, tooltip: { backgroundColor: '#102836', titleColor: '#f4fafb', bodyColor: '#bbd3d9', callbacks: { label: (ctx) => ctx.dataset.label + ': ' + fmt(ctx.parsed.y, 2) + ' dBm a ' + fmt(ctx.parsed.x, 2) + ' m' } } },
      scales: { x: { type: 'linear', grid: { color: chartColors.grid }, ticks: { color: chartColors.text, maxTicksLimit: 9 }, title: { display: true, text: xTitle, color: chartColors.text } },
                y: { grid: { color: chartColors.grid }, ticks: { color: chartColors.text }, title: { display: true, text: yTitle, color: chartColors.text } } }
    };
  }
  function initCharts() {
    if (!window.Chart) {
      byId('sweepChart').hidden = true; byId('analysisChart').hidden = true;
      byId('sweepFallback').hidden = false; byId('analysisFallback').hidden = false;
      return;
    }
    state.sweepChart = new Chart(byId('sweepChart'), {
      type: 'scatter',
      data: { datasets: [
        { label: 'Recorrido simulado', data: [], showLine: true, borderColor: chartColors.theory, backgroundColor: chartColors.theory, pointRadius: 3, borderWidth: 3, tension: .12 },
        { label: 'Modelo teórico', data: [], showLine: true, borderColor: '#92cfc7', backgroundColor: '#92cfc7', pointRadius: 0, borderWidth: 1.5, borderDash: [5, 6] },
        { label: 'Posición del celular', data: [], showLine: false, borderColor: '#e68e6f', backgroundColor: '#e68e6f', pointRadius: 7, pointHoverRadius: 9 }
      ] },
      options: chartOptions('Distancia (m)', 'RSSI (dBm)')
    });
    state.analysisChart = new Chart(byId('analysisChart'), {
      type: 'scatter',
      data: { datasets: [
        { label: 'Modelo teórico', data: [], showLine: true, borderColor: chartColors.theory, backgroundColor: chartColors.theory, borderWidth: 2, pointRadius: 0, tension: .08 },
        { label: 'RSSI medido (promedios)', data: [], showLine: false, borderColor: chartColors.observed, backgroundColor: chartColors.observed, pointRadius: 5, pointHoverRadius: 7 },
        { label: 'Ajuste por mínimos cuadrados', data: [], showLine: true, borderColor: chartColors.fitted, backgroundColor: chartColors.fitted, borderWidth: 2, pointRadius: 0, borderDash: [7, 5], tension: .08 }
      ] },
      options: chartOptions('Distancia (m)', 'RSSI (dBm)')
    });
  }
  function stopSweep(completed) {
    if (state.sweepTimer) { clearInterval(state.sweepTimer); state.sweepTimer = null; }
    byId('runSweep').disabled = false;
    byId('stopSweep').disabled = true;
    if (!completed && state.sweep.length > 0) report('sweepMessage', 'Recorrido detenido. Las muestras simuladas se conservan.');
  }
  function startSweep() {
    let p;
    try { p = params(); } catch (err) { report('sweepMessage', err.message); return; }
    const start = rawNumber('startDistance'), end = rawNumber('endDistance'), step = rawNumber('stepDistance');
    if (![start, end, step].every(finite) || start <= 0 || end < start || step <= 0 || end > 100 || (end - start) / step > 149) {
      report('sweepMessage', 'Verifica inicio > 0, final ≥ inicio, paso > 0 y como máximo 150 muestras (final ≤ 100 m).');
      return;
    }
    stopSweep(false);
    state.sweep = [];
    if (state.sweepChart) { state.sweepChart.data.datasets[0].data = []; state.sweepChart.update('none'); }
    byId('distance').max = String(Math.max(12, end));
    const distances = [];
    for (let k = 0; k < 150 && start + k * step <= end + 1e-7; k++) distances.push(Number((start + k * step).toFixed(6)));
    if (distances.length === 0 || distances[distances.length - 1] < end - .00001) distances.push(end);
    if (distances.length > 150) { report('sweepMessage', 'Demasiados puntos: aumenta el paso.'); return; }
    let i = 0;
    byId('runSweep').disabled = true;
    byId('stopSweep').disabled = false;
    const tick = () => {
      if (i >= distances.length) {
        stopSweep(true);
        report('sweepMessage', 'Recorrido completo. Estos puntos son predicciones, no mediciones tomadas por un dispositivo.');
        return;
      }
      const d = distances[i++];
      byId('distance').value = String(d);
      readScene();
      state.sweep.push({ x: d, y: model(d, p) });
      if (state.sweepChart) {
        state.sweepChart.data.datasets[0].data = state.sweep.slice();
        state.sweepChart.update('none');
      }
      byId('sweepProgress').style.width = (i / distances.length * 100) + '%';
      byId('sweepCounter').textContent = i + ' muestras simuladas';
      report('sweepMessage', 'Receptor a ' + fmt(d, 2) + ' m · RSSI teórico ' + fmt(model(d, p)) + ' dBm');
    };
    tick();
    if (i < distances.length) state.sweepTimer = setInterval(tick, distances.length > 45 ? 65 : 200);
    else { stopSweep(true); report('sweepMessage', 'Muestra calculada. Es una predicción del modelo.'); }
  }
  function csvMatrix(text) {
    const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim());
    if (!lines.length) return [];
    const header = lines[0];
    const sep = header.includes('\t') ? '\t' : header.includes(';') ? ';' : ',';
    return lines.map((line) => {
      const cols = []; let token = '', quoted = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') { if (quoted && line[i + 1] === '"') { token += '"'; i++; } else quoted = !quoted; }
        else if (c === sep && !quoted) { cols.push(token.trim()); token = ''; }
        else token += c;
      }
      cols.push(token.trim()); return cols;
    });
  }
  function normalized(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, ''); }
  function parseValue(value) {
    if (typeof value === 'number') return value;
    const text = String(value ?? '').trim().replace(/\u2212/g, '-').replace(/\s/g, '').replace(',', '.');
    return text === '' ? NaN : Number(text);
  }
  function rowsFromMatrix(matrix) {
    const data = matrix.filter((row) => Array.isArray(row) && row.some((cell) => String(cell ?? '').trim() !== ''));
    if (!data.length) throw new Error('El archivo o texto está vacío.');
    const heads = data[0].map(normalized);
    let di = heads.findIndex((h) => /distancia|distance|metros|distanciam|^dm$|^dist/.test(h));
    let ri = heads.findIndex((h) => /rssi|dbm|senal|signal|potencia|intensidad|nivel/.test(h));
    const firstIsHeader = (di >= 0 || ri >= 0 || !finite(parseValue(data[0][0])));
    if (di < 0) di = ri === 0 ? 1 : 0;
    if (ri < 0) ri = di === 0 ? 1 : 0;
    if (di === ri) { di = 0; ri = 1; }
    const items = []; let invalid = 0;
    for (let i = firstIsHeader ? 1 : 0; i < data.length; i++) {
      const d = parseValue(data[i][di]), y = parseValue(data[i][ri]);
      if (!finite(d) || !finite(y) || d <= 0 || d > 100000 || y > 30 || y < -180) { invalid++; continue; }
      items.push({ distance: d, rssi: y });
      if (items.length >= 10000) break;
    }
    if (!items.length) throw new Error('No se encontraron filas válidas. Se necesitan dos columnas numéricas: distancia en metros (> 0) y RSSI en dBm.');
    return { items, invalid };
  }
  function groupRows(rows) {
    const map = new Map();
    for (const r of rows) {
      const d = Math.round(r.distance * 10000) / 10000;
      const key = String(d);
      if (!map.has(key)) map.set(key, { distance: d, values: [] });
      map.get(key).values.push(r.rssi);
    }
    return [...map.values()].map((item) => {
      const mean = item.values.reduce((sum, y) => sum + y, 0) / item.values.length;
      const variance = item.values.length < 2 ? 0 : item.values.reduce((s, y) => s + (y - mean) ** 2, 0) / (item.values.length - 1);
      return { distance: item.distance, mean, n: item.values.length, sd: Math.sqrt(variance) };
    }).sort((a, b) => a.distance - b.distance);
  }
  function fitMeasurements(rows, d0) {
    if (rows.length < 2) return null;
    const x = rows.map((r) => Math.log10(r.distance / d0)), y = rows.map((r) => r.rssi);
    const xbar = x.reduce((a, b) => a + b, 0) / x.length, ybar = y.reduce((a, b) => a + b, 0) / y.length;
    const sxx = x.reduce((s, xi) => s + (xi - xbar) ** 2, 0);
    if (sxx < 1e-12) return null;
    const sxy = x.reduce((s, xi, i) => s + (xi - xbar) * (y[i] - ybar), 0);
    const slope = sxy / sxx, intercept = ybar - slope * xbar;
    const residual = y.map((yi, i) => yi - (intercept + slope * x[i]));
    const sse = residual.reduce((s, e) => s + e * e, 0);
    const syy = y.reduce((s, yi) => s + (yi - ybar) ** 2, 0);
    return { intercept, slope, n: -slope / 10, rmse: Math.sqrt(sse / rows.length), r2: syy > 0 ? 1 - sse / syy : null };
  }
  function updateMeasurements() {
    const has = state.rows.length > 0;
    byId('measurementsPanel').hidden = !has;
    byId('realCount').textContent = String(state.rows.length);
    byId('realCountNote').textContent = state.source === 'demo' ? 'Datos sintéticos; no son mediciones' : has ? 'Lecturas importadas al navegador' : 'Carga Excel para calcular';
    const badge = byId('sourceBadge');
    badge.textContent = state.source === 'demo' ? 'DEMOSTRACIÓN' : state.source === 'loaded' ? 'DATOS IMPORTADOS' : 'SIN DATOS';
    badge.className = 'source-badge ' + (state.source === 'demo' ? 'demo' : state.source === 'loaded' ? 'real' : 'empty');
    if (!has) return;
    byId('dataMetrics').textContent = state.rows.length + ' lecturas · ' + state.groups.length + ' distancias';
    const tbody = byId('measurementsBody');
    tbody.replaceChildren();
    for (const item of state.groups) {
      const row = document.createElement('tr');
      for (const value of [fmt(item.distance, 2), String(item.n), fmt(item.mean, 2), item.n > 1 ? fmt(item.sd, 2) : '—']) {
        const td = document.createElement('td'); td.textContent = value; row.appendChild(td);
      }
      tbody.appendChild(row);
    }
    byId('dataCaption').textContent = state.source === 'demo'
      ? 'Ejemplo sintético generado para probar el sistema. No representa una campaña de medición real.'
      : 'Se muestran promedios por distancia; la desviación estándar es muestral. Comprueba que todas las lecturas corresponden a la misma red, banda y condiciones.';
  }
  function useMeasurements(rows, source, label, invalid = 0) {
    stopSweep(true);
    state.rows = rows;
    state.groups = groupRows(rows);
    state.source = source;
    state.label = label;
    updateMeasurements();
    updateAnalysis();
    const kind = source === 'demo' ? 'DEMO SINTÉTICA' : 'ARCHIVO/TEXTO IMPORTADO';
    report('importStatus', kind + ': ' + rows.length + ' lecturas en ' + state.groups.length + ' distancias. ' + (invalid ? invalid + ' filas omitidas. ' : '') + 'Los cálculos están listos.', 'success');
  }
  function makeDemo() {
    const rows = [];
    const offsets = [1.1, -.9, .45, -.3, 1.65];
    for (let d = 1; d <= 8; d++) {
      const mean = -41.5 - 23.9 * Math.log10(d) - (d >= 6 ? 2 : 0);
      for (let i = 0; i < 3; i++) rows.push({ distance: d, rssi: Math.round((mean + offsets[(d + i) % offsets.length]) * 10) / 10 });
    }
    useMeasurements(rows, 'demo', 'Ejemplo sintético');
  }
  async function readFile(file) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { report('importStatus', 'El archivo supera el máximo de 5 MB.', 'error'); return; }
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls', 'csv', 'txt', 'tsv'].includes(ext)) { report('importStatus', 'Formato no admitido. Usa .xlsx, .xls o .csv.', 'error'); return; }
    try {
      let matrix;
      if (ext === 'xlsx' || ext === 'xls') {
        if (!window.XLSX) throw new Error('No se pudo cargar el lector Excel. Vuelve a conectarte o exporta el archivo como CSV.');
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: 'array' });
        matrix = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true, defval: '' });
      } else matrix = csvMatrix(await file.text());
      const parsed = rowsFromMatrix(matrix);
      useMeasurements(parsed.items, 'loaded', file.name, parsed.invalid);
    } catch (err) { report('importStatus', 'No se pudo importar: ' + err.message, 'error'); }
  }
  function processPaste() {
    try {
      const parsed = rowsFromMatrix(csvMatrix(byId('pasteData').value));
      useMeasurements(parsed.items, 'loaded', 'Texto pegado desde tabla', parsed.invalid);
    } catch (err) { report('importStatus', err.message, 'error'); }
  }
  function download(name, content, mime) {
    const blob = new Blob(['\uFEFF', content], { type: mime || 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2500);
  }
  function templateRows() {
    const matrix = [['distancia_m', 'rssi_dbm', 'repeticion', 'observacion']];
    for (let d = 1; d <= 8; d++) for (let r = 1; r <= 3; r++) matrix.push([d, '', r, '']);
    return matrix;
  }
  function downloadTemplate(asCsv) {
    const matrix = templateRows();
    if (!asCsv && window.XLSX) {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(matrix);
      ws['!cols'] = [{ wch: 15 }, { wch: 16 }, { wch: 13 }, { wch: 28 }];
      XLSX.utils.book_append_sheet(wb, ws, 'Mediciones WiFi');
      XLSX.writeFile(wb, 'SimuMath_Plantilla_WiFi.xlsx');
      return;
    }
    download('SimuMath_Plantilla_WiFi.csv', matrix.map((r) => r.join(';')).join('\r\n'));
    if (!asCsv) report('importStatus', 'No se pudo acceder al generador XLSX; se descargó una plantilla CSV compatible con Excel.');
  }
  function metrics(p) {
    if (!state.rows.length) return null;
    const errors = state.rows.map((r) => r.rssi - model(r.distance, p));
    const mae = errors.reduce((s, e) => s + Math.abs(e), 0) / errors.length;
    const rmse = Math.sqrt(errors.reduce((s, e) => s + e ** 2, 0) / errors.length);
    return { mae, rmse };
  }
  function interpolated(points, x) {
    let sum = 0;
    for (let i = 0; i < points.length; i++) {
      let li = 1;
      for (let j = 0; j < points.length; j++) {
        if (j !== i) li *= (x - points[j].distance) / (points[i].distance - points[j].distance);
      }
      sum += points[i].mean * li;
    }
    return sum;
  }
  function calculateInterpolation() {
    const groups = state.groups, x = rawNumber('interpolationDistance'), box = byId('interpolationResult');
    if (!groups.length) { box.textContent = 'Importa mediciones para interpolar.'; return; }
    if (!finite(x) || x < groups[0].distance || x > groups[groups.length - 1].distance) {
      box.textContent = 'Elige una distancia dentro del intervalo medido: ' + fmt(groups[0].distance, 2) + ' a ' + fmt(groups[groups.length - 1].distance, 2) + ' m.'; return;
    }
    if (groups.length < 2) { box.textContent = 'Se necesitan dos distancias diferentes como mínimo.'; return; }
    const nearest = groups.slice().sort((a, b) => Math.abs(a.distance - x) - Math.abs(b.distance - x)).slice(0, 3).sort((a, b) => a.distance - b.distance);
    const y = interpolated(nearest, x);
    box.innerHTML = '<strong>' + fmt(y, 2) + ' dBm</strong><br>' + 'Estimación a ' + fmt(x, 2) + ' m con ' + nearest.length + ' nodos: ' + nearest.map((r) => fmt(r.distance, 2)).join(', ') + ' m.';
  }
  function derivatives(groups) {
    const out = [];
    for (let i = 0; i < groups.length; i++) {
      let value, name;
      if (i === 0) {
        value = (groups[1].mean - groups[0].mean) / (groups[1].distance - groups[0].distance); name = 'Progresiva';
      } else if (i === groups.length - 1) {
        value = (groups[i].mean - groups[i - 1].mean) / (groups[i].distance - groups[i - 1].distance); name = 'Regresiva';
      } else {
        const hL = groups[i].distance - groups[i - 1].distance, hR = groups[i + 1].distance - groups[i].distance;
        value = -hR / (hL * (hL + hR)) * groups[i - 1].mean +
                (hR - hL) / (hL * hR) * groups[i].mean +
                hL / (hR * (hL + hR)) * groups[i + 1].mean;
        name = 'Central';
      }
      out.push({ distance: groups[i].distance, value, name });
    }
    return out;
  }
  function calculateDerivatives() {
    const box = byId('derivativeResult'), tbody = byId('derivativesBody'); tbody.replaceChildren();
    if (state.groups.length < 2) { box.textContent = 'Se necesitan mediciones en al menos dos distancias.'; return; }
    const results = derivatives(state.groups);
    for (const r of results) {
      const tr = document.createElement('tr');
      [fmt(r.distance, 2) + ' m', r.name, fmt(r.value, 3) + ' dBm/m'].forEach((t) => { const td = document.createElement('td'); td.textContent = t; tr.appendChild(td); });
      tbody.appendChild(tr);
    }
    const central = results.find((r) => r.name === 'Central') || results[0];
    box.innerHTML = 'En <strong>' + fmt(central.distance, 2) + ' m</strong>: cambio local ≈ <strong>' + fmt(central.value, 3) + ' dBm/m</strong> (' + central.name.toLowerCase() + ').';
  }
  function calculateThreshold() {
    const box = byId('thresholdResult'), threshold = rawNumber('threshold');
    let p;
    try { p = params(); } catch (err) { box.textContent = err.message; return; }
    if (!finite(threshold) || threshold < -180 || threshold > 30) { box.textContent = 'Ingresa un umbral válido en dBm.'; return; }
    const f = (d) => model(d, p) - threshold;
    const fp = (d) => -10 * p.n / (d * Math.LN10);
    let d = p.d0, iterations = 0, converged = false;
    for (let k = 0; k < 70; k++) {
      const delta = f(d) / fp(d);
      if (!finite(delta)) break;
      const next = delta >= d ? d / 2 : d - delta;
      if (!finite(next) || next <= 0 || next > 1e12) break;
      iterations++;
      if (Math.abs(next - d) < Math.max(1e-8, next * 1e-9)) { d = next; converged = true; break; }
      d = next;
    }
    if (!converged) {
      const exact = p.d0 * Math.pow(10, (p.r0 - p.walls * p.wallLoss - threshold) / (10 * p.n));
      if (!finite(exact)) { box.textContent = 'El umbral está fuera de un rango numérico calculable.'; return; }
      d = exact;
    }
    const caution = d > 30 ? ' Atención: es una extrapolación fuera de un escenario interior típico.' : d < p.d0 ? ' El umbral se alcanza antes de la distancia de referencia.' : '';
    box.innerHTML = '<strong>' + fmt(d, d < 1 ? 3 : 2) + ' m</strong> para ' + fmt(threshold, 0) + ' dBm.<br>' + (converged ? 'Newton-Raphson convergió en ' + iterations + ' iteraciones.' : 'Se usó la solución analítica como respaldo.') + caution;
  }
  function updateAnalysis() {
    let p;
    try { p = params(); } catch (err) { byId('analysisNote').textContent = err.message; return; }
    const fit = fitMeasurements(state.rows, p.d0);
    state.fit = fit;
    const m = metrics(p);
    byId('fittedN').textContent = fit ? fmt(fit.n, 2) : '—';
    byId('modelRmse').textContent = m ? fmt(m.rmse, 2) + ' dB' : '—';
    const unusual = !!fit && fit.n <= 0;
    const sourceText = state.source === 'demo' ? ' Los puntos amarillos son un ejemplo sintético, no mediciones reales.' : '';
    const warnings = unusual ? ' Atención: el ajuste produce n ≤ 0; revisa el protocolo o las lecturas.' : '';
    const insightTitle = byId('insightTitle'), insightText = byId('insightText');
    if (!state.rows.length) {
      insightTitle.textContent = '¡Primero juega con la simulación!';
      insightText.textContent = 'La línea muestra lo que predice el modelo. Cuando cargues mediciones podrás comprobar qué tan cerca estuvo de la realidad.';
    } else if (state.source === 'demo') {
      insightTitle.textContent = '¡Así funciona el análisis!';
      insightText.textContent = 'Estás usando datos inventados para practicar: ' + state.rows.length + ' lecturas en ' + state.groups.length + ' distancias. Cuando los sustituyas por tu Excel, verás el resultado de tu experimento.';
    } else {
      insightTitle.textContent = '¡Ya podemos comparar teoría y mediciones!';
      insightText.textContent = 'Tu tabla contiene ' + state.rows.length + ' lecturas. El error RMSE del modelo inicial es ' + fmt(m.rmse, 2) + ' dB; cuanto menor sea, más cerca está el modelo de estos datos.';
    }
    byId('analysisNote').textContent = state.rows.length
      ? 'Datos: ' + state.rows.length + ' lecturas, ' + state.groups.length + ' distancias. El ajuste usa todas las lecturas importadas. ' + (fit ? 'R² = ' + (fit.r2 === null ? 'no definido' : fmt(fit.r2, 3)) + '.' : 'Se requieren al menos dos distancias diferentes para la regresión.') + sourceText + warnings
      : 'La línea verde muestra el modelo teórico. Importa tu Excel para ver las mediciones (puntos amarillos) y el ajuste (línea violeta).';
    updateAnalysisChart(p, fit);
    calculateInterpolation();
    calculateDerivatives();
    updateComparison(p, m, fit);
    calculateThreshold();
  }
  function updateAnalysisChart(p, fit) {
    if (!state.analysisChart) return;
    const endRaw = rawNumber('endDistance');
    const allDistances = state.groups.map((r) => r.distance);
    const maxD = Math.max(3, finite(endRaw) ? endRaw : 12, ...allDistances);
    const minD = Math.max(.1, Math.min(p.d0, 1, ...allDistances));
    const theory = [], fitted = [];
    for (let i = 0; i <= 100; i++) {
      const d = minD + (maxD - minD) * i / 100;
      theory.push({ x: d, y: model(d, p) });
      if (fit) fitted.push({ x: d, y: modelFit(d, fit, p.d0) });
    }
    const chart = state.analysisChart;
    chart.data.datasets[0].data = theory;
    chart.data.datasets[1].data = state.groups.map((r) => ({ x: r.distance, y: r.mean }));
    chart.data.datasets[2].data = fitted;
    chart.update('none');
  }
  function updateComparison(p, m, fit) {
    const available = !!m;
    byId('comparisonState').hidden = available;
    byId('comparisonGrid').hidden = !available;
    byId('downloadResults').hidden = !available;
    if (!available) {
      byId('comparisonConclusion').textContent = 'Haz el experimento, carga las lecturas en el paso 02 y vuelve aquí para interpretar la diferencia.';
      return;
    }
    byId('compareMAE').textContent = fmt(m.mae, 2) + ' dB';
    byId('compareFitRMSE').textContent = fit ? fmt(fit.rmse, 2) + ' dB' : '—';
    byId('comparePoints').textContent = String(state.groups.length);
    const stateLabel = state.source === 'demo' ? 'Este resultado procede de DATOS SINTÉTICOS de demostración. ' : 'Este resultado procede de lecturas importadas; confirma cómo se obtuvieron. ';
    const relative = fit && fit.n > 0 ? 'Con estos datos, el exponente estimado es n = ' + fmt(fit.n, 2) + ', frente a n = ' + fmt(p.n, 2) + ' configurado en el simulador. ' : 'Los datos no permiten estimar un exponente físico positivo de forma confiable. ';
    byId('comparisonConclusion').textContent = stateLabel + 'El error absoluto medio del modelo inicial es ' + fmt(m.mae, 2) + ' dB; la RMSE inicial es ' + fmt(m.rmse, 2) + ' dB. ' + relative + 'Las diferencias pueden reflejar paredes, interferencia, orientación y variaciones temporales del entorno. No se usa error porcentual sobre dBm.';
  }
  function downloadResults() {
    if (!state.groups.length) return;
    let p; try { p = params(); } catch (err) { report('importStatus', err.message, 'error'); return; }
    const lines = [['distancia_m', 'numero_lecturas', 'rssi_promedio_dbm', 'desviacion_db', 'modelo_inicial_dbm', 'error_promedio_menos_modelo_db', 'modelo_ajustado_dbm']];
    for (const g of state.groups) {
      const theor = model(g.distance, p);
      lines.push([g.distance, g.n, g.mean, g.n > 1 ? g.sd : '', theor, g.mean - theor, state.fit ? modelFit(g.distance, state.fit, p.d0) : '']);
    }
    download('SimuMath_Resultados_WiFi.csv', lines.map((row) => row.map(escapeCSV).join(';')).join('\r\n'));
  }
  function setupPhoneDragging() {
    const phone = byId('receiver');
    const scene = byId('roomScene');
    const distanceInput = byId('distance');
    let activePointer = null;
    const pointerToDistance = (clientX) => {
      const rect = scene.getBoundingClientRect();
      const part = clamp(((clientX - rect.left) / rect.width * 100 - 26) / 63, 0, 1);
      const min = Number(distanceInput.min), max = Number(distanceInput.max);
      return Math.round((min + (max - min) * part) * 10) / 10;
    };
    const updateFromPointer = (evt) => {
      if (activePointer !== evt.pointerId) return;
      distanceInput.value = String(pointerToDistance(evt.clientX));
      readScene();
    };
    phone.addEventListener('pointerdown', (evt) => {
      if (evt.button !== undefined && evt.button !== 0) return;
      if (state.sweepTimer) stopSweep(false);
      activePointer = evt.pointerId;
      phone.classList.add('dragging');
      phone.setPointerCapture(evt.pointerId);
      evt.preventDefault();
      updateFromPointer(evt);
    });
    phone.addEventListener('pointermove', updateFromPointer);
    const endDrag = (evt) => {
      if (activePointer !== evt.pointerId) return;
      activePointer = null;
      phone.classList.remove('dragging');
      if (phone.hasPointerCapture(evt.pointerId)) phone.releasePointerCapture(evt.pointerId);
    };
    phone.addEventListener('pointerup', endDrag);
    phone.addEventListener('pointercancel', endDrag);
    phone.addEventListener('lostpointercapture', () => { activePointer = null; phone.classList.remove('dragging'); });
    phone.addEventListener('keydown', (evt) => {
      const step = evt.shiftKey ? 1 : .1;
      let target = Number(distanceInput.value);
      if (evt.key === 'ArrowLeft' || evt.key === 'ArrowDown') target -= step;
      else if (evt.key === 'ArrowRight' || evt.key === 'ArrowUp') target += step;
      else if (evt.key === 'Home') target = Number(distanceInput.min);
      else if (evt.key === 'End') target = Number(distanceInput.max);
      else return;
      evt.preventDefault();
      if (state.sweepTimer) stopSweep(false);
      distanceInput.value = String(Math.round(clamp(target, Number(distanceInput.min), Number(distanceInput.max)) * 10) / 10);
      readScene();
    });
  }

  function setupEvents() {
    for (const id of ['referenceDistance', 'referenceRSSI', 'exponent', 'wallCount', 'wallLoss', 'band']) {
      byId(id).addEventListener('input', () => { readScene(); updateAnalysis(); });
    }
    byId('distance').addEventListener('input', readScene);
    for (const id of ['startDistance', 'endDistance']) byId(id).addEventListener('input', () => {
      const max = Math.max(12, rawNumber('endDistance') || 12);
      byId('distance').max = String(max);
      readScene(); updateAnalysis();
    });
    byId('runSweep').addEventListener('click', startSweep);
    byId('stopSweep').addEventListener('click', () => stopSweep(false));
    byId('loadDemo').addEventListener('click', makeDemo);
    byId('clearData').addEventListener('click', () => {
      state.rows = []; state.groups = []; state.source = 'none'; state.fit = null;
      byId('fileInput').value = ''; byId('pasteData').value = '';
      updateMeasurements(); updateAnalysis();
      report('importStatus', 'Datos borrados de esta sesión. Ningún archivo se envió a servidores.');
    });
    byId('downloadTemplate').addEventListener('click', () => downloadTemplate(false));
    byId('downloadCsv').addEventListener('click', () => downloadTemplate(true));
    byId('processPaste').addEventListener('click', processPaste);
    byId('fileInput').addEventListener('change', (e) => { readFile(e.target.files[0]); });
    const zone = byId('dropzone');
    zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('dragging'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('dragging'));
    zone.addEventListener('drop', (e) => { e.preventDefault(); zone.classList.remove('dragging'); readFile(e.dataTransfer.files[0]); });
    byId('interpolateButton').addEventListener('click', calculateInterpolation);
    byId('thresholdButton').addEventListener('click', calculateThreshold);
    byId('downloadResults').addEventListener('click', downloadResults);
    const sections = ['laboratorio', 'mediciones', 'analisis', 'comparacion'];
    if (window.IntersectionObserver) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) document.querySelectorAll('.site-nav a').forEach((a) => a.classList.toggle('nav-active', a.getAttribute('href') === '#' + entry.target.id));
        });
      }, { rootMargin: '-25% 0px -60% 0px' });
      sections.forEach((id) => observer.observe(byId(id)));
    }
  }
  function runSelfChecks() {
    const p = { d0: 1, r0: -40, n: 2, walls: 0, wallLoss: 5 };
    const close = (a, b, e = 1e-6) => Math.abs(a - b) <= e;
    const fit = fitMeasurements([{ distance: 1, rssi: -40 }, { distance: 10, rssi: -60 }, { distance: 100, rssi: -80 }], 1);
    const interp = interpolated([{ distance: 1, mean: -40 }, { distance: 2, mean: -46 }, { distance: 3, mean: -50 }], 2);
    const d = derivatives([{ distance: 1, mean: -2 }, { distance: 2, mean: -4 }, { distance: 4, mean: -8 }]);
    return close(model(1, p), -40) && close(model(10, p), -60) && close(fit.n, 2) && close(interp, -46) && close(d[1].value, -2);
  }
  function init() {
    if (!runSelfChecks()) console.error('SimuMath: fallo en pruebas internas de los métodos numéricos.');
    initCharts();
    setupEvents();
    setupPhoneDragging();
    readScene();
    updateMeasurements();
    updateAnalysis();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
