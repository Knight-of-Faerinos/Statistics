function buildPresetDependent() {
    // N = 120 observations with strong association (satisfies Cochran's rule)
    const counts = [
        ['Phishing', 'Blocked', 12],
        ['Phishing', 'Detected', 22],
        ['Phishing', 'Compromised', 16],
        ['ZeroDay', 'Blocked', 3],
        ['ZeroDay', 'Detected', 7],
        ['ZeroDay', 'Compromised', 20],
        ['BruteForce', 'Blocked', 31],
        ['BruteForce', 'Detected', 6],
        ['BruteForce', 'Compromised', 3]
    ];
    let rows = [];
    for (const [x, f, n] of counts) {
        for (let i = 0; i < n; i++) rows.push(`${x}, ${f}`);
    }
    return rows.join('\n');
}

function buildPresetIndependent() {
    // N = 120 observations with exact conditional invariance across regions
    const counts = [
        ['EU-Server', 'Timeout', 20],
        ['EU-Server', 'InvalidToken', 16],
        ['EU-Server', 'RateLimited', 14],
        ['US-Server', 'Timeout', 16],
        ['US-Server', 'InvalidToken', 13],
        ['US-Server', 'RateLimited', 11],
        ['Asia-Server', 'Timeout', 12],
        ['Asia-Server', 'InvalidToken', 10],
        ['Asia-Server', 'RateLimited', 8]
    ];
    let rows = [];
    for (const [x, f, n] of counts) {
        for (let i = 0; i < n; i++) rows.push(`${x}, ${f}`);
    }
    return rows.join('\n');
}

const presets = {
    dependent: buildPresetDependent(),
    independent: buildPresetIndependent(),
    small: `Phishing, Compromised
Phishing, Compromised
Phishing, Compromised
Phishing, Blocked
ZeroDay, Compromised
ZeroDay, Compromised
ZeroDay, Compromised
ZeroDay, Compromised
ZeroDay, Blocked
BruteForce, Blocked
BruteForce, Blocked
BruteForce, Blocked
BruteForce, Blocked
BruteForce, Compromised
Phishing, Compromised
BruteForce, Blocked
ZeroDay, Compromised
BruteForce, Blocked`
};

// ==========================================
// EVENT LISTENERS (Presets, CSV, Generator)
// ==========================================
document.getElementById('presetSelect').addEventListener('change', (e) => {
    const selected = e.target.value;
    if (presets[selected]) {
        document.getElementById('datasetInput').value = presets[selected];
        analyzeDataset();
    }
});

document.getElementById('datasetInput').addEventListener('input', () => {
    document.getElementById('presetSelect').value = 'custom';
});

document.getElementById('genStrength').addEventListener('input', (e) => {
    document.getElementById('genStrengthVal').innerText = `${e.target.value}%`;
});

document.getElementById('generateBtn').addEventListener('click', generateSyntheticDataset);
document.getElementById('analyzeBtn').addEventListener('click', analyzeDataset);

document.getElementById('csvFileInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        let lines = event.target.result.split(/\r?\n/).filter(l => l.trim() !== '');
        if (document.getElementById('hasHeaderCheck').checked && lines.length > 0) {
            lines.shift();
        }
        document.getElementById('datasetInput').value = lines.join('\n');
        document.getElementById('presetSelect').value = 'custom';
        analyzeDataset();
    };
    reader.readAsText(file);
});

// ==========================================
// SYNTHETIC BIVARIATE DATASET GENERATOR
// ==========================================
function generateSyntheticDataset() {
    const N = Math.max(15, Math.min(20000, parseInt(document.getElementById('genN').value) || 300));
    const strength = parseInt(document.getElementById('genStrength').value) / 100; // [0, 1]

    const xCats = ['Phishing', 'ZeroDay', 'BruteForce'];
    const xMarginals = [0.45, 0.20, 0.35];

    const fCats = ['Blocked', 'Detected', 'Compromised'];
    const fMarginals = [0.50, 0.30, 0.20];

    // Strong dependence conditional profiles P(F | X_i)
    const depProfiles = [
        [0.25, 0.45, 0.30], // Phishing
        [0.10, 0.20, 0.70], // ZeroDay
        [0.80, 0.15, 0.05]  // BruteForce
    ];

    function sampleCategorical(probs) {
        const u = Math.random();
        let cum = 0;
        for (let i = 0; i < probs.length; i++) {
            cum += probs[i];
            if (u <= cum) return i;
        }
        return probs.length - 1;
    }

    let generatedLines = [];
    for (let i = 0; i < N; i++) {
        const xIdx = sampleCategorical(xMarginals);
        // Convex interpolation between independence P(F) and dependence P_dep(F | X)
        const condProbs = fMarginals.map((pMarg, j) => (1 - strength) * pMarg + strength * depProfiles[xIdx][j]);
        const fIdx = sampleCategorical(condProbs);
        generatedLines.push(`${xCats[xIdx]}, ${fCats[fIdx]}`);
    }

    document.getElementById('datasetInput').value = generatedLines.join('\n');
    document.getElementById('presetSelect').value = 'custom';
    analyzeDataset();
}

// ==========================================
// MAIN STATISTICAL ANALYSIS ENGINE
// ==========================================
function analyzeDataset() {
    const rawText = document.getElementById('datasetInput').value.trim();
    const lines = rawText.split(/\r?\n/);

    let pairs = [];
    let xSet = new Set();
    let fSet = new Set();

    // 1. PARSE BIVARIATE OBSERVATIONS (X, F)
    for (let line of lines) {
        line = line.trim();
        if (!line) continue;

        const parts = line.includes(',') ? line.split(',') : line.split(';');
        if (parts.length >= 2) {
            const xVal = parts[0].trim();
            const fVal = parts[1].trim();
            if (xVal !== '' && fVal !== '') {
                pairs.push([xVal, fVal]);
                xSet.add(xVal);
                fSet.add(fVal);
            }
        }
    }

    const N = pairs.length;
    const xCategories = Array.from(xSet).sort();
    const fCategories = Array.from(fSet).sort();
    const numRows = xCategories.length;
    const numCols = fCategories.length;

    if (N === 0 || numRows < 2 || numCols < 2) {
        alert("Please provide a valid bivariate dataset with at least 2 distinct categories for both X and F.");
        return;
    }

    const xIndex = {};
    xCategories.forEach((val, idx) => xIndex[val] = idx);
    const fIndex = {};
    fCategories.forEach((val, idx) => fIndex[val] = idx);

    // 2. OBSERVED CONTINGENCY TABLE & MARGINALS
    let observed = Array.from({ length: numRows }, () => Array(numCols).fill(0));
    let rowTotals = Array(numRows).fill(0);
    let colTotals = Array(numCols).fill(0);

    for (let [x, f] of pairs) {
        const r = xIndex[x];
        const c = fIndex[f];
        observed[r][c]++;
        rowTotals[r]++;
        colTotals[c]++;
    }

    // 3. CONDITIONAL FREQUENCIES, EXPECTED COUNTS, RESIDUALS & CHI-SQUARE
    let condRow = Array.from({ length: numRows }, () => Array(numCols).fill(0));
    let condCol = Array.from({ length: numRows }, () => Array(numCols).fill(0));
    let expected = Array.from({ length: numRows }, () => Array(numCols).fill(0));
    let residuals = Array.from({ length: numRows }, () => Array(numCols).fill(0));

    let chiSquare = 0;
    let cellsGe5 = 0;
    let minExpected = Infinity;
    const totalCells = numRows * numCols;

    for (let r = 0; r < numRows; r++) {
        for (let c = 0; c < numCols; c++) {
            // Row-conditional P(F = f_j | X = x_i)
            condRow[r][c] = rowTotals[r] > 0 ? (observed[r][c] / rowTotals[r]) : 0;

            // Column-conditional P(X = x_i | F = f_j)
            condCol[r][c] = colTotals[c] > 0 ? (observed[r][c] / colTotals[c]) : 0;

            // Expected frequency under independence E_ij
            const expVal = (rowTotals[r] * colTotals[c]) / N;
            expected[r][c] = expVal;

            if (expVal >= 5) cellsGe5++;
            if (expVal < minExpected) minExpected = expVal;

            // Pearson Standardized Residual R_ij = (O_ij - E_ij) / sqrt(E_ij)
            if (expVal > 0) {
                const res = (observed[r][c] - expVal) / Math.sqrt(expVal);
                residuals[r][c] = res;
                chiSquare += res * res;
            }
        }
    }

    // 4. DEGREES OF FREEDOM, P-VALUE, CRAMER'S V & COCHRAN CHECK
    const df = (numRows - 1) * (numCols - 1);
    const pValue = chiSquarePValue(chiSquare, df);

    const minDim = Math.min(numRows - 1, numCols - 1);
    const cramersV = minDim > 0 ? Math.sqrt(chiSquare / (N * minDim)) : 0;

    let strengthLabel = "Negligible";
    if (cramersV >= 0.50) strengthLabel = "Strong Association";
    else if (cramersV >= 0.30) strengthLabel = "Moderate Association";
    else if (cramersV >= 0.10) strengthLabel = "Weak Association";

    const pctGe5 = (cellsGe5 / totalCells) * 100;
    const cochranValid = (pctGe5 >= 80 && minExpected >= 1);

    // 5. UPDATE SUMMARY RESULTS
    document.getElementById('total-n-out').innerText = N;
    document.getElementById('df-out').innerText = df;
    document.getElementById('chi2-out').innerText = chiSquare.toFixed(4);
    document.getElementById('pvalue-out').innerText = pValue < 0.0001 ? pValue.toExponential(4) : pValue.toFixed(4);
    document.getElementById('cramers-v-out').innerText = `${cramersV.toFixed(4)} (${strengthLabel})`;

    const cochranEl = document.getElementById('cochran-out');
    if (cochranValid) {
        cochranEl.innerText = `Valid (${pctGe5.toFixed(0)}% of expected cells ≥ 5, min Eᵢⱼ = ${minExpected.toFixed(2)})`;
        cochranEl.className = "success-data";
    } else {
        cochranEl.innerText = `Warning (${pctGe5.toFixed(0)}% of expected cells ≥ 5, min Eᵢⱼ = ${minExpected.toFixed(2)}) — Increase N`;
        cochranEl.className = "danger-data";
    }

    const verdictEl = document.getElementById('verdict-out');
    if (pValue < 0.05) {
        verdictEl.innerText = `Reject H₀ → Statistically Dependent (${strengthLabel})`;
        verdictEl.className = "danger-data";
    } else {
        verdictEl.innerText = "Fail to Reject H₀ → Statistically Independent";
        verdictEl.className = "success-data";
    }

    // 6. RENDER TABLES & CHARTS
    renderObservedTable(xCategories, fCategories, observed, rowTotals, colTotals, N);
    renderRowConditionalTable(xCategories, fCategories, condRow, colTotals, N);
    renderColConditionalTable(xCategories, fCategories, condCol, rowTotals, N);
    renderExpectedTable(xCategories, fCategories, expected, rowTotals, colTotals, N);
    renderResidualsTable(xCategories, fCategories, residuals);
    renderComparisonChart(xCategories, fCategories, observed, expected);
    renderResidualsHeatmap(xCategories, fCategories, residuals);
}

// ==========================================
// TABLE RENDERING HELPERS
// ==========================================
function renderObservedTable(rows, cols, observed, rowTotals, colTotals, N) {
    let html = '<table><thead><tr><th>X \\ F</th>';
    cols.forEach(c => html += `<th>${c}</th>`);
    html += '<th>Marginal P(X)</th></tr></thead><tbody>';

    for (let r = 0; r < rows.length; r++) {
        html += `<tr><th>${rows[r]}</th>`;
        for (let c = 0; c < cols.length; c++) {
            const relJoint = ((observed[r][c] / N) * 100).toFixed(1);
            html += `<td>${observed[r][c]} <span style="color:#888; font-size:0.85em;">(${relJoint}%)</span></td>`;
        }
        const rowMargPct = ((rowTotals[r] / N) * 100).toFixed(1);
        html += `<td class="marginal-cell">${rowTotals[r]} (${rowMargPct}%)</td></tr>`;
    }

    html += '<tr><th>Marginal P(F)</th>';
    for (let c = 0; c < cols.length; c++) {
        const colMargPct = ((colTotals[c] / N) * 100).toFixed(1);
        html += `<td class="marginal-cell">${colTotals[c]} (${colMargPct}%)</td>`;
    }
    html += `<td class="marginal-cell">N = ${N} (100%)</td></tr></tbody></table>`;

    document.getElementById('observed-table-container').innerHTML = html;
}

function renderRowConditionalTable(rows, cols, condRow, colTotals, N) {
    let html = '<table><thead><tr><th>P(F | X)</th>';
    cols.forEach(c => html += `<th>${c}</th>`);
    html += '<th>Row Sum</th></tr></thead><tbody>';

    for (let r = 0; r < rows.length; r++) {
        html += `<tr><th>X = ${rows[r]}</th>`;
        for (let c = 0; c < cols.length; c++) {
            const pct = (condRow[r][c] * 100).toFixed(2);
            html += `<td>${condRow[r][c].toFixed(4)} <span style="color:#bd93f9;">(${pct}%)</span></td>`;
        }
        html += `<td class="marginal-cell">1.0000 (100%)</td></tr>`;
    }

    html += '<tr><th>Marginal P(F)</th>';
    for (let c = 0; c < cols.length; c++) {
        const margProb = colTotals[c] / N;
        const pct = (margProb * 100).toFixed(2);
        html += `<td class="marginal-cell">${margProb.toFixed(4)} (${pct}%)</td>`;
    }
    html += `<td class="marginal-cell">1.0000 (100%)</td></tr></tbody></table>`;

    document.getElementById('cond-row-table-container').innerHTML = html;
}

function renderColConditionalTable(rows, cols, condCol, rowTotals, N) {
    let html = '<table><thead><tr><th>P(X | F)</th>';
    cols.forEach(c => html += `<th>F = ${c}</th>`);
    html += '<th>Marginal P(X)</th></tr></thead><tbody>';

    for (let r = 0; r < rows.length; r++) {
        html += `<tr><th>${rows[r]}</th>`;
        for (let c = 0; c < cols.length; c++) {
            const pct = (condCol[r][c] * 100).toFixed(2);
            html += `<td>${condCol[r][c].toFixed(4)} <span style="color:#8be9fd;">(${pct}%)</span></td>`;
        }
        const margProb = rowTotals[r] / N;
        const pct = (margProb * 100).toFixed(2);
        html += `<td class="marginal-cell">${margProb.toFixed(4)} (${pct}%)</td></tr>`;
    }

    html += '<tr><th>Col Sum</th>';
    for (let c = 0; c < cols.length; c++) {
        html += `<td class="marginal-cell">1.0000 (100%)</td>`;
    }
    html += `<td class="marginal-cell">1.0000 (100%)</td></tr></tbody></table>`;

    document.getElementById('cond-col-table-container').innerHTML = html;
}

function renderExpectedTable(rows, cols, expected, rowTotals, colTotals, N) {
    let html = '<table><thead><tr><th>Eᵢⱼ</th>';
    cols.forEach(c => html += `<th>${c}</th>`);
    html += '<th>Row Total</th></tr></thead><tbody>';

    for (let r = 0; r < rows.length; r++) {
        html += `<tr><th>${rows[r]}</th>`;
        for (let c = 0; c < cols.length; c++) {
            const lowFlag = expected[r][c] < 5 ? ' style="color:#ffb86c;" title="Expected count < 5"' : '';
            html += `<td${lowFlag}>${expected[r][c].toFixed(2)}</td>`;
        }
        html += `<td class="marginal-cell">${rowTotals[r]}</td></tr>`;
    }

    html += '<tr><th>Col Total</th>';
    for (let c = 0; c < cols.length; c++) {
        html += `<td class="marginal-cell">${colTotals[c]}</td>`;
    }
    html += `<td class="marginal-cell">${N}</td></tr></tbody></table>`;

    document.getElementById('expected-table-container').innerHTML = html;
}

function renderResidualsTable(rows, cols, residuals) {
    let html = '<table><thead><tr><th>Rᵢⱼ</th>';
    cols.forEach(c => html += `<th>${c}</th>`);
    html += '</tr></thead><tbody>';

    for (let r = 0; r < rows.length; r++) {
        html += `<tr><th>${rows[r]}</th>`;
        for (let c = 0; c < cols.length; c++) {
            const val = residuals[r][c];
            const sign = val >= 0 ? '+' : '';
            let style = '';
            if (val > 2.0) style = ' style="color:#50fa7b; font-weight:bold;"';
            else if (val < -2.0) style = ' style="color:#ff5555; font-weight:bold;"';
            html += `<td${style}>${sign}${val.toFixed(3)}</td>`;
        }
        html += '</tr>';
    }
    html += '</tbody></table>';

    document.getElementById('residuals-table-container').innerHTML = html;
}

// ==========================================
// PLOTLY CHARTS (Bar Comparison & Heatmap)
// ==========================================
function renderComparisonChart(rows, cols, observed, expected) {
    let labels = [];
    let obsValues = [];
    let expValues = [];

    for (let r = 0; r < rows.length; r++) {
        for (let c = 0; c < cols.length; c++) {
            labels.push(`(${rows[r]}, ${cols[c]})`);
            obsValues.push(observed[r][c]);
            expValues.push(expected[r][c]);
        }
    }

    const traceObserved = {
        x: labels,
        y: obsValues,
        name: 'Observed (Oᵢⱼ)',
        type: 'bar',
        marker: { color: '#8be9fd' }
    };

    const traceExpected = {
        x: labels,
        y: expValues,
        name: 'Expected under Independence (Eᵢⱼ)',
        type: 'bar',
        marker: { color: '#ff79c6' }
    };

    const layout = {
        barmode: 'group',
        plot_bgcolor: '#252533',
        paper_bgcolor: '#1e1e29',
        font: { color: '#d1d1e0', family: 'Courier New' },
        xaxis: { gridcolor: '#444', title: 'Joint Category Pairs (X, F)' },
        yaxis: { gridcolor: '#444', title: 'Frequency Count' },
        margin: { l: 50, r: 30, t: 40, b: 60 },
        legend: { orientation: 'h', x: 0.5, xanchor: 'center', y: 1.15 }
    };

    Plotly.newPlot('chartComparison', [traceObserved, traceExpected], layout);
}

function renderResidualsHeatmap(rows, cols, residuals) {
    // Reverse rows so top row in table appears at top of heatmap
    const revRows = [...rows].reverse();
    const revZ = [...residuals].reverse();
    const textLabels = revZ.map(row => row.map(v => `${v >= 0 ? '+' : ''}${v.toFixed(2)}`));

    const maxAbs = Math.max(2.5, ...residuals.flat().map(Math.abs));

    const traceHeatmap = {
        x: cols,
        y: revRows,
        z: revZ,
        text: textLabels,
        texttemplate: '%{text}',
        textfont: { color: '#ffffff', size: 13 },
        type: 'heatmap',
        zmin: -maxAbs,
        zmax: maxAbs,
        colorscale: [
            [0.0, '#ff5555'],
            [0.5, '#252533'],
            [1.0, '#50fa7b']
        ],
        colorbar: {
            title: 'Rᵢⱼ',
            titleside: 'right'
        }
    };

    const layout = {
        plot_bgcolor: '#252533',
        paper_bgcolor: '#1e1e29',
        font: { color: '#d1d1e0', family: 'Courier New' },
        xaxis: { title: 'Variable F' },
        yaxis: { title: 'Variable X' },
        margin: { l: 110, r: 40, t: 30, b: 50 }
    };

    Plotly.newPlot('chartResiduals', [traceHeatmap], layout);
}

// ==========================================
// EXACT CHI-SQUARE P-VALUE (Incomplete Gamma)
// ==========================================
function chiSquarePValue(chi2, df) {
    if (chi2 <= 0) return 1.0;
    return upperRegularizedGamma(df / 2, chi2 / 2);
}

function logGamma(z) {
    const coeffs = [
        76.18009172947146, -86.50532032941677,
        24.01409824083091, -1.231739572450155,
        0.1208650973866179e-2, -0.5395239384953e-5
    ];
    let x = z;
    let y = z;
    let tmp = x + 5.5;
    tmp -= (x + 0.5) * Math.log(tmp);
    let ser = 1.000000000190015;
    for (let j = 0; j < coeffs.length; j++) {
        ser += coeffs[j] / ++y;
    }
    return -tmp + Math.log(2.5066282746310005 * ser / x);
}

function upperRegularizedGamma(a, x) {
    const gln = logGamma(a);
    if (x < a + 1.0) {
        let ap = a;
        let sum = 1.0 / a;
        let del = sum;
        for (let n = 1; n <= 200; n++) {
            ap += 1.0;
            del *= x / ap;
            sum += del;
            if (Math.abs(del) < Math.abs(sum) * 1e-14) break;
        }
        const lowerP = sum * Math.exp(-x + a * Math.log(x) - gln);
        return Math.max(0, Math.min(1, 1.0 - lowerP));
    } else {
        let b = x + 1.0 - a;
        let c = 1.0 / 1e-30;
        let d = 1.0 / b;
        let h = d;
        for (let i = 1; i <= 200; i++) {
            let an = -i * (i - a);
            b += 2.0;
            d = an * d + b;
            if (Math.abs(d) < 1e-30) d = 1e-30;
            c = b + an / c;
            if (Math.abs(c) < 1e-30) c = 1e-30;
            d = 1.0 / d;
            let del = d * c;
            h *= del;
            if (Math.abs(del - 1.0) < 1e-14) break;
        }
        return Math.max(0, Math.min(1, Math.exp(-x + a * Math.log(x) - gln) * h));
    }
}

// ==========================================
// INITIALIZE ON PAGE LOAD
// ==========================================
window.onload = () => {
    document.getElementById('datasetInput').value = presets.dependent;
    analyzeDataset();
};
