// ==========================================
// PRESET DATASETS & EVENT LISTENERS
// ==========================================
const presets = {
    dependent: `Phishing, Compromised
Phishing, Compromised
Phishing, Compromised
Phishing, Compromised
Phishing, Blocked
ZeroDay, Compromised
ZeroDay, Compromised
ZeroDay, Compromised
ZeroDay, Compromised
ZeroDay, Compromised
ZeroDay, Blocked
BruteForce, Blocked
BruteForce, Blocked
BruteForce, Blocked
BruteForce, Blocked
BruteForce, Blocked
BruteForce, Blocked
BruteForce, Compromised
Phishing, Compromised
BruteForce, Blocked`,

    independent: `EU-Server, Timeout
EU-Server, Timeout
EU-Server, InvalidToken
EU-Server, InvalidToken
EU-Server, InvalidToken
US-Server, Timeout
US-Server, Timeout
US-Server, InvalidToken
US-Server, InvalidToken
US-Server, InvalidToken
Asia-Server, Timeout
Asia-Server, Timeout
Asia-Server, InvalidToken
Asia-Server, InvalidToken
Asia-Server, InvalidToken`
};

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

document.getElementById('analyzeBtn').addEventListener('click', analyzeDataset);

// ==========================================
// MAIN ANALYSIS ENGINE
// ==========================================
function analyzeDataset() {
    const rawText = document.getElementById('datasetInput').value.trim();
    const lines = rawText.split('\n');

    let pairs = [];
    let xSet = new Set();
    let fSet = new Set();

    // 1. PARSE BIVARIATE OBSERVATIONS (X, F)
    for (let line of lines) {
        line = line.trim();
        if (!line) continue;

        // Support comma or semicolon separated values
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

    // Map category names to matrix indices
    const xIndex = {};
    xCategories.forEach((val, idx) => xIndex[val] = idx);
    const fIndex = {};
    fCategories.forEach((val, idx) => fIndex[val] = idx);

    // 2. CONSTRUCT OBSERVED CONTINGENCY TABLE & MARGINALS
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

    // 3. COMPUTE CONDITIONAL & EXPECTED FREQUENCIES + CHI-SQUARE
    let conditional = Array.from({ length: numRows }, () => Array(numCols).fill(0));
    let expected = Array.from({ length: numRows }, () => Array(numCols).fill(0));
    let chiSquare = 0;

    for (let r = 0; r < numRows; r++) {
        for (let c = 0; c < numCols; c++) {
            // Conditional frequency: P(F = f_j | X = x_i)
            conditional[r][c] = rowTotals[r] > 0 ? (observed[r][c] / rowTotals[r]) : 0;

            // Expected frequency under independence: E_ij = (Row_i * Col_j) / N
            const expVal = (rowTotals[r] * colTotals[c]) / N;
            expected[r][c] = expVal;

            // Accumulate Chi-Square statistic
            if (expVal > 0) {
                chiSquare += Math.pow(observed[r][c] - expVal, 2) / expVal;
            }
        }
    }

    // 4. DEGREES OF FREEDOM & P-VALUE
    const df = (numRows - 1) * (numCols - 1);
    const pValue = chiSquarePValue(chiSquare, df);

    // 5. UPDATE SUMMARY RESULTS
    document.getElementById('total-n-out').innerText = N;
    document.getElementById('df-out').innerText = df;
    document.getElementById('chi2-out').innerText = chiSquare.toFixed(4);
    document.getElementById('pvalue-out').innerText = pValue < 0.0001 ? pValue.toExponential(4) : pValue.toFixed(4);

    const verdictEl = document.getElementById('verdict-out');
    if (pValue < 0.05) {
        verdictEl.innerText = "Reject H₀ → Statistically Dependent (Associated)";
        verdictEl.className = "danger-data";
    } else {
        verdictEl.innerText = "Fail to Reject H₀ → Statistically Independent";
        verdictEl.className = "success-data";
    }

    // 6. RENDER HTML TABLES & PLOTLY CHART
    renderObservedTable(xCategories, fCategories, observed, rowTotals, colTotals, N);
    renderConditionalTable(xCategories, fCategories, conditional, colTotals, N);
    renderExpectedTable(xCategories, fCategories, expected, rowTotals, colTotals, N);
    renderComparisonChart(xCategories, fCategories, observed, expected);
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

    // Column marginals row
    html += '<tr><th>Marginal P(F)</th>';
    for (let c = 0; c < cols.length; c++) {
        const colMargPct = ((colTotals[c] / N) * 100).toFixed(1);
        html += `<td class="marginal-cell">${colTotals[c]} (${colMargPct}%)</td>`;
    }
    html += `<td class="marginal-cell">N = ${N} (100%)</td></tr></tbody></table>`;

    document.getElementById('observed-table-container').innerHTML = html;
}

function renderConditionalTable(rows, cols, conditional, colTotals, N) {
    let html = '<table><thead><tr><th>P(F | X)</th>';
    cols.forEach(c => html += `<th>${c}</th>`);
    html += '<th>Row Sum</th></tr></thead><tbody>';

    for (let r = 0; r < rows.length; r++) {
        html += `<tr><th>X = ${rows[r]}</th>`;
        for (let c = 0; c < cols.length; c++) {
            const pct = (conditional[r][c] * 100).toFixed(2);
            html += `<td>${conditional[r][c].toFixed(4)} <span style="color:#bd93f9;">(${pct}%)</span></td>`;
        }
        html += `<td class="marginal-cell">1.0000 (100%)</td></tr>`;
    }

    // Add Marginal P(F) row at the bottom for direct visual comparison
    html += '<tr><th>Marginal P(F)</th>';
    for (let c = 0; c < cols.length; c++) {
        const margProb = colTotals[c] / N;
        const pct = (margProb * 100).toFixed(2);
        html += `<td class="marginal-cell">${margProb.toFixed(4)} (${pct}%)</td>`;
    }
    html += `<td class="marginal-cell">1.0000 (100%)</td></tr></tbody></table>`;

    document.getElementById('conditional-table-container').innerHTML = html;
}

function renderExpectedTable(rows, cols, expected, rowTotals, colTotals, N) {
    let html = '<table><thead><tr><th>Eᵢⱼ</th>';
    cols.forEach(c => html += `<th>${c}</th>`);
    html += '<th>Row Total</th></tr></thead><tbody>';

    for (let r = 0; r < rows.length; r++) {
        html += `<tr><th>${rows[r]}</th>`;
        for (let c = 0; c < cols.length; c++) {
            html += `<td>${expected[r][c].toFixed(2)}</td>`;
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

// ==========================================
// PLOTLY GROUPED BAR CHART
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
        // Series representation for lower gamma, then subtract from 1
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
        // Continued fraction (Lentz's method) for upper gamma Q(a, x)
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

// Run analysis on page load
window.onload = () => {
    document.getElementById('datasetInput').value = presets.dependent;
    analyzeDataset();
};
