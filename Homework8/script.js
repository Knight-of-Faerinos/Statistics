// ==========================================================
// PART 1: MODES OF CONVERGENCE & SQRT(N) SIMULATOR
// ==========================================================
document.getElementById('runConvBtn').addEventListener('click', runConvergenceSimulation);

function sampleFromDistribution(distType) {
    if (distType === 'bernoulli') {
        return {
            x: Math.random() < 0.5 ? 1 : 0,
            mu: 0.5,
            variance: 0.25
        };
    } else if (distType === 'uniform') {
        return {
            x: Math.random(),
            mu: 0.5,
            variance: 1 / 12
        };
    } else {
        // Exponential(lambda = 1): inverse transform sampling -ln(1 - U)
        return {
            x: -Math.log(1 - Math.random()),
            mu: 1.0,
            variance: 1.0
        };
    }
}

function runConvergenceSimulation() {
    const distType = document.getElementById('convDistSelect').value;
    const n = Math.max(10, Math.min(2000, parseInt(document.getElementById('convN').value) || 200));
    const m = Math.max(20, Math.min(500, parseInt(document.getElementById('convM').value) || 150));
    const eps = Math.max(0.005, parseFloat(document.getElementById('convEps').value) || 0.05);

    const meta = sampleFromDistribution(distType);
    const mu = meta.mu;
    const sigma2 = meta.variance;
    const sigma = Math.sqrt(sigma2);

    let xAxis = [];
    for (let k = 1; k <= n; k++) xAxis.push(k);

    let pathTraces = [];
    let finalSampleMeans = [];
    let standardizedValues = [];

    let exceedCount = 0;
    let squaredErrorSum = 0;

    // Simulate m independent trajectories of length n
    for (let traj = 0; traj < m; traj++) {
        let runningSum = 0;
        let runningMeans = [];

        for (let k = 1; k <= n; k++) {
            const draw = sampleFromDistribution(distType).x;
            runningSum += draw;
            runningMeans.push(runningSum / k);
        }

        const xBarN = runningMeans[n - 1];
        finalSampleMeans.push(xBarN);

        const err = xBarN - mu;
        if (Math.abs(err) > eps) exceedCount++;
        squaredErrorSum += err * err;

        // Standardized CLT statistic: sqrt(n) * (X_bar_n - mu) / sigma
        const zN = Math.sqrt(n) * err / sigma;
        standardizedValues.push(zN);

        // Plot up to 60 trajectories to keep visual clarity and fast rendering
        if (traj < 60) {
            pathTraces.push({
                x: xAxis,
                y: runningMeans,
                mode: 'lines',
                type: 'scatter',
                line: { width: 1, color: '#8be9fd' },
                opacity: 0.35,
                showlegend: false,
                hoverinfo: 'none'
            });
        }
    }

    // Add reference lines for mu and mu +/- epsilon
    pathTraces.push({
        x: [1, n],
        y: [mu, mu],
        mode: 'lines',
        name: `True Mean μ = ${mu.toFixed(2)}`,
        line: { color: '#50fa7b', width: 2.5 }
    });
    pathTraces.push({
        x: [1, n],
        y: [mu + eps, mu + eps],
        mode: 'lines',
        name: `μ ± ε (${eps})`,
        line: { color: '#ff5555', width: 2, dash: 'dash' }
    });
    pathTraces.push({
        x: [1, n],
        y: [mu - eps, mu - eps],
        mode: 'lines',
        showlegend: false,
        line: { color: '#ff5555', width: 2, dash: 'dash' }
    });

    // Compute empirical metrics at step n
    const empTailProb = exceedCount / m;
    const empMSE = squaredErrorSum / m;
    const theoMSE = sigma2 / n;

    const meanZ = standardizedValues.reduce((a, b) => a + b, 0) / m;
    const varZ = standardizedValues.reduce((acc, z) => acc + Math.pow(z - meanZ, 2), 0) / (m - 1);

    document.getElementById('emp-prob-out').innerText = `${empTailProb.toFixed(4)} (${exceedCount}/${m} paths outside ±${eps})`;
    document.getElementById('emp-mse-out').innerText = `${empMSE.toFixed(6)} (Theoretical σ²/n = ${theoMSE.toFixed(6)})`;
    document.getElementById('emp-clt-var-out').innerText = `${varZ.toFixed(4)} (Target = 1.0000)`;

    const baseLayout = {
        plot_bgcolor: '#252533',
        paper_bgcolor: '#1e1e29',
        font: { color: '#d1d1e0', family: 'Courier New' },
        margin: { l: 55, r: 25, t: 35, b: 50 },
        legend: { orientation: 'h', x: 0.5, xanchor: 'center', y: 1.15 }
    };

    Plotly.newPlot('chartConvPaths', pathTraces, {
        ...baseLayout,
        xaxis: { gridcolor: '#444', title: 'Sample Size (k)' },
        yaxis: { gridcolor: '#444', title: 'Sample Mean X̄ₖ' }
    });

    // Empirical CDF vs Standard Normal CDF N(0, 1)
    const sortedZ = [...standardizedValues].sort((a, b) => a - b);
    let ecdfX = [-4];
    let ecdfY = [0];
    for (let i = 0; i < m; i++) {
        ecdfX.push(sortedZ[i]);
        ecdfY.push((i + 1) / m);
    }
    ecdfX.push(4);
    ecdfY.push(1);

    let normX = [];
    let normY = [];
    for (let z = -4; z <= 4; z += 0.05) {
        normX.push(z);
        normY.push(standardNormalCDF(z));
    }

    const traceECDF = {
        x: ecdfX,
        y: ecdfY,
        mode: 'lines',
        line: { shape: 'hv', color: '#ff79c6', width: 2.5 },
        name: `Empirical CDF Fₙ(z) [n=${n}]`
    };

    const traceNormalCDF = {
        x: normX,
        y: normY,
        mode: 'lines',
        line: { color: '#50fa7b', width: 2.5, dash: 'dash' },
        name: 'Standard Normal CDF Φ(z)'
    };

    Plotly.newPlot('chartConvCDF', [traceNormalCDF, traceECDF], {
        ...baseLayout,
        xaxis: { gridcolor: '#444', title: 'Standardized Score z = √n(X̄ₙ − μ)/σ', range: [-3.8, 3.8] },
        yaxis: { gridcolor: '#444', title: 'Cumulative Probability', range: [0, 1.05] }
    });
}

// ==========================================================
// PART 2: BETA-BINOMIAL BAYESIAN UPDATING SIMULATOR
// ==========================================================
document.getElementById('runBayesBtn').addEventListener('click', runBayesianSimulation);

document.getElementById('presetBayesUninf').addEventListener('click', () => {
    document.getElementById('bayesAlpha').value = 1;
    document.getElementById('bayesBeta').value = 1;
    document.getElementById('bayesK').value = 7;
    document.getElementById('bayesN').value = 10;
    runBayesianSimulation();
});

document.getElementById('presetBayesStrong').addEventListener('click', () => {
    document.getElementById('bayesAlpha').value = 4;
    document.getElementById('bayesBeta').value = 36;
    document.getElementById('bayesK').value = 7;
    document.getElementById('bayesN').value = 10;
    runBayesianSimulation();
});

document.getElementById('presetBayesLarge').addEventListener('click', () => {
    document.getElementById('bayesAlpha').value = 4;
    document.getElementById('bayesBeta').value = 36;
    document.getElementById('bayesK').value = 350;
    document.getElementById('bayesN').value = 500;
    runBayesianSimulation();
});

function runBayesianSimulation() {
    const alpha = Math.max(0.1, parseFloat(document.getElementById('bayesAlpha').value) || 2);
    const beta = Math.max(0.1, parseFloat(document.getElementById('bayesBeta').value) || 8);
    let n = Math.max(1, parseInt(document.getElementById('bayesN').value) || 10);
    let k = Math.max(0, parseInt(document.getElementById('bayesK').value) || 0);

    if (k > n) {
        k = n;
        document.getElementById('bayesK').value = n;
    }

    // Conjugate Beta-Binomial Posterior parameters
    const postAlpha = alpha + k;
    const postBeta = beta + (n - k);

    const priorMean = alpha / (alpha + beta);
    const mleEstimate = k / n;
    const postMean = postAlpha / (postAlpha + postBeta);

    // Evaluate densities over theta in (0, 1)
    const steps = 500;
    const dTheta = 1 / steps;
    let thetaGrid = [];
    let priorPDF = [];
    let likelihoodPDF = [];
    let postPDF = [];

    // Compute approximate 95% equal-tailed credible interval via numerical CDF integration
    let cumulative = 0;
    let ciLower = 0;
    let ciUpper = 1;
    let foundLower = false;
    let foundUpper = false;

    for (let i = 1; i < steps; i++) {
        const theta = i * dTheta;
        thetaGrid.push(theta);

        const pVal = betaPDF(theta, alpha, beta);
        // Normalized Likelihood Beta(k+1, n-k+1) has the exact shape theta^k * (1-theta)^(n-k)
        const lVal = betaPDF(theta, k + 1, n - k + 1);
        const postVal = betaPDF(theta, postAlpha, postBeta);

        priorPDF.push(pVal);
        likelihoodPDF.push(lVal);
        postPDF.push(postVal);

        cumulative += postVal * dTheta;
        if (!foundLower && cumulative >= 0.025) {
            ciLower = theta;
            foundLower = true;
        }
        if (!foundUpper && cumulative >= 0.975) {
            ciUpper = theta;
            foundUpper = true;
        }
    }

    document.getElementById('bayes-prior-out').innerText = `Beta(${alpha}, ${beta}) → Mean = ${priorMean.toFixed(4)}`;
    document.getElementById('bayes-mle-out').innerText = `${k} / ${n} → MLE = ${mleEstimate.toFixed(4)}`;
    document.getElementById('bayes-post-out').innerText = `Beta(${postAlpha}, ${postBeta}) → Mean = ${postMean.toFixed(4)}`;
    document.getElementById('bayes-ci-out').innerText = `[${ciLower.toFixed(4)}, ${ciUpper.toFixed(4)}]`;

    const tracePrior = {
        x: thetaGrid,
        y: priorPDF,
        mode: 'lines',
        name: `Prior Beta(${alpha}, ${beta})`,
        line: { color: '#ffb86c', width: 2.5, dash: 'dash' }
    };

    const traceLikelihood = {
        x: thetaGrid,
        y: likelihoodPDF,
        mode: 'lines',
        name: `Normalized Likelihood (k=${k}, n=${n})`,
        line: { color: '#8be9fd', width: 2.5, dash: 'dot' }
    };

    const tracePosterior = {
        x: thetaGrid,
        y: postPDF,
        mode: 'lines',
        fill: 'tozeroy',
        fillcolor: 'rgba(80, 250, 123, 0.25)',
        name: `Posterior Beta(${postAlpha}, ${postBeta})`,
        line: { color: '#50fa7b', width: 3 }
    };

    const layoutBayes = {
        plot_bgcolor: '#252533',
        paper_bgcolor: '#1e1e29',
        font: { color: '#d1d1e0', family: 'Courier New' },
        xaxis: { gridcolor: '#444', title: 'Parameter θ (Vulnerability / Success Probability)', range: [0, 1] },
        yaxis: { gridcolor: '#444', title: 'Probability Density' },
        margin: { l: 55, r: 25, t: 40, b: 50 },
        legend: { orientation: 'h', x: 0.5, xanchor: 'center', y: 1.15 }
    };

    Plotly.newPlot('chartBayes', [tracePrior, traceLikelihood, tracePosterior], layoutBayes);
}

// ==========================================================
// MATHEMATICAL HELPERS (Log-Gamma, Beta PDF, Normal CDF)
// ==========================================================
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

function betaPDF(x, alpha, beta) {
    if (x <= 0 || x >= 1) return 0;
    const logBeta = logGamma(alpha) + logGamma(beta) - logGamma(alpha + beta);
    const logDensity = (alpha - 1) * Math.log(x) + (beta - 1) * Math.log(1 - x) - logBeta;
    return Math.exp(logDensity);
}

function standardNormalCDF(z) {
    const sign = z >= 0 ? 1 : -1;
    const x = Math.abs(z) / Math.sqrt(2);
    const p = 0.3275911;
    const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429;
    const t = 1 / (1 + p * x);
    const poly = t * (a1 + t * (a2 + t * (a3 + t * (a4 + t * a5))));
    const erfVal = sign * (1 - poly * Math.exp(-x * x));
    return 0.5 * (1 + erfVal);
}

// ==========================================================
// INITIALIZE ON PAGE LOAD
// ==========================================================
window.onload = () => {
    runConvergenceSimulation();
    runBayesianSimulation();
};
