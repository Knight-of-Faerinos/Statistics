// ==========================================
// EVENT LISTENERS
// ==========================================
document.getElementById('calcIntegrationBtn').addEventListener('click', computeExercise1);
document.getElementById('calcCdfBtn').addEventListener('click', computeExercise2);

// ==========================================
// EXERCISE 1: RIEMANN VS LEBESGUE
// ==========================================
const functions = {
    'sin': { fn: x => Math.sin(x), a: 0, b: Math.PI },
    'x2': { fn: x => x * x, a: 0, b: 1 },
    'step': { fn: x => (x < 0.5) ? 1 : 3, a: 0, b: 1 },
    'abs': { fn: x => Math.abs(x - 0.5), a: 0, b: 1 },
    'pathological': { 
        fn: (x, N) => (Math.abs((x * N) % 1) < 1e-9) ? 1 : 0, 
        a: 0, b: 1 
    }
};

const baseLayout = {
    plot_bgcolor: '#252533', paper_bgcolor: '#1e1e29',
    font: { color: '#d1d1e0', family: 'Courier New' },
    margin: { l: 50, r: 30, t: 30, b: 40 }, showlegend: false,
    xaxis: { gridcolor: '#444', zerolinecolor: '#ff5555' },
    yaxis: { gridcolor: '#444', zerolinecolor: '#ff5555' }
};

function computeExercise1() {
    const funcKey = document.getElementById('functionSelect').value;
    const N = parseInt(document.getElementById('inputN').value);
    const { fn, a, b } = functions[funcKey];

    // 1. RIEMANN INTEGRATION
    let riemannSum = 0;
    let dx = (b - a) / N;
    for (let i = 0; i < N; i++) {
        let x = a + i * dx; 
        riemannSum += fn(x, N) * dx;
    }

    // 2. LEBESGUE INTEGRATION
    let lebesgueSum = 0;
    const numBins = 1000; 
    let yValues = [];
    let minY = Infinity, maxY = -Infinity;

    for (let i = 0; i < N; i++) {
        let x = a + Math.random() * (b - a);
        let y = fn(x, N);
        yValues.push(y);
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
    }

    if (maxY === minY) {
        lebesgueSum = minY * (b - a);
    } else {
        let bins = new Array(numBins).fill(0);
        let dy = (maxY - minY) / numBins;
        for (let i = 0; i < N; i++) {
            let binIndex = Math.floor((yValues[i] - minY) / dy);
            if (binIndex >= numBins) binIndex = numBins - 1; 
            bins[binIndex]++;
        }
        for (let j = 0; j < numBins; j++) {
            let y_mid = minY + (j + 0.5) * dy;
            let measure = (bins[j] / N) * (b - a); 
            lebesgueSum += y_mid * measure;
        }
    }

    // OUTPUT TEXT
    const diff = Math.abs(riemannSum - lebesgueSum);
    document.getElementById('riemann-out').innerText = riemannSum.toFixed(6);
    document.getElementById('lebesgue-out').innerText = lebesgueSum.toFixed(6);
    
    const diffOut = document.getElementById('diff-out');
    diffOut.innerText = diff.toFixed(6);
    if (diff > 0.1) {
        diffOut.style.color = '#ff5555'; diffOut.innerText += " (Divergence Detected!)";
    } else {
        diffOut.style.color = '#50fa7b'; diffOut.innerText += " (Converged)";
    }

    // ==========================================
    // PLOTTING EXERCISE 1
    // ==========================================
    // Chart 1: Function Curve
    let plotX = [], plotY = [];
    let plotPoints = 2000; // Fixed resolution for charting
    let dxPlot = (b - a) / plotPoints;
    for(let i=0; i<=plotPoints; i++) {
        let x = a + i*dxPlot;
        plotX.push(x);
        plotY.push(fn(x, plotPoints));
    }
    
    let traceFunc = { 
        x: plotX, y: plotY, 
        mode: (funcKey === 'pathological') ? 'markers' : 'lines', 
        line: {color: '#8be9fd', width: 2},
        marker: {color: '#ff5555', size: 3}
    };
    
    Plotly.newPlot('chartFunc', [traceFunc], {
        ...baseLayout, xaxis: { ...baseLayout.xaxis, title: 'Domain (x)' }, yaxis: { ...baseLayout.yaxis, title: 'f(x)' }
    });

    // Chart 2: Lebesgue Histogram (Measure of preimages)
    // We sample up to 5000 points from our generated Y-values to prevent browser lag
    let sampleForPlot = yValues.slice(0, Math.min(yValues.length, 5000));
    let traceLebesgue = { 
        x: sampleForPlot, type: 'histogram', 
        marker: {color: '#bd93f9', line: {color: '#1e1e29', width: 1}} 
    };
    
    Plotly.newPlot('chartLebesgue', [traceLebesgue], {
        ...baseLayout, xaxis: { ...baseLayout.xaxis, title: 'Function Values (Y)' }, yaxis: { ...baseLayout.yaxis, title: 'Measure / Frequency' }
    });
}

// ==========================================
// EXERCISE 2: NORMAL CDF COMPUTATION
// ==========================================
function normalPDF(x) {
    return (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * x * x);
}

function referenceCDF(z) {
    function erf(x) {
        const sign = (x >= 0) ? 1 : -1;
        x = Math.abs(x);
        const p = 0.3275911, a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429;
        const t = 1 / (1 + p * x);
        const poly = t * (a1 + t * (a2 + t * (a3 + t * (a4 + t * a5))));
        return sign * (1 - poly * Math.exp(-x * x));
    }
    return 0.5 * (1 + erf(z / Math.sqrt(2)));
}

function computeExercise2() {
    const z = parseFloat(document.getElementById('inputZ').value);
    
    // 1. NUMERICAL INTEGRATION (Simpson's Rule)
    const N = 10000; 
    const a = -8;    
    const b = z;
    const h = (b - a) / N;
    
    let simpsonSum = normalPDF(a) + normalPDF(b);
    for (let i = 1; i < N; i++) {
        let x = a + i * h;
        simpsonSum += (i % 2 !== 0) ? 4 * normalPDF(x) : 2 * normalPDF(x);
    }
    const computedCDF = (h / 3) * simpsonSum;
    
    const refCDF = referenceCDF(z);
    const error = Math.abs(computedCDF - refCDF);

    document.getElementById('simpson-out').innerText = computedCDF.toFixed(8);
    document.getElementById('ref-out').innerText = refCDF.toFixed(8);
    document.getElementById('cdf-error-out').innerText = error.toExponential(4);

    // ==========================================
    // PLOTTING EXERCISE 2
    // ==========================================
    let pdfX = [], pdfY = [], fillX = [], fillY = [];
    for(let x = -4; x <= 4; x += 0.05) {
        pdfX.push(x);
        let y = normalPDF(x);
        pdfY.push(y);
        if(x <= z) {
            fillX.push(x); fillY.push(y);
        }
    }
    
    // Exact Z point for a sharp cutoff
    if (z >= -4 && z <= 4) {
        fillX.push(z); fillY.push(normalPDF(z));
    } else if (z > 4) {
        fillX = pdfX; fillY = pdfY;
    }

    let tracePDF = { x: pdfX, y: pdfY, mode: 'lines', line: {color: '#d1d1e0', width: 2}, name: 'PDF' };
    let traceFill = { x: fillX, y: fillY, fill: 'tozeroy', mode: 'none', fillcolor: 'rgba(80, 250, 123, 0.4)', name: `CDF (z=${z})` };

    Plotly.newPlot('chartPDF', [tracePDF, traceFill], {
        ...baseLayout, showlegend: true, legend: {x: 0.8, y: 1},
        xaxis: { ...baseLayout.xaxis, title: 'Z-Score' }, yaxis: { ...baseLayout.yaxis, title: 'Probability Density' }
    });
}

// Run initial calculations on page load
window.onload = () => {
    computeExercise1();
    computeExercise2();
};
