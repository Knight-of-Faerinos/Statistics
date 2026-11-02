document.getElementById('startBtn').addEventListener('click', runSimulation);

function runSimulation() {
    const n = parseInt(document.getElementById('inputN').value);
    const m = parseInt(document.getElementById('inputM').value);

    // Arrays to store the final mean and variance for each hacker
    let hackersMeans = [];
    let hackersVariances = [];

    // Variables to calculate the "average of averages" across all m hackers
    let sumOfMeans = 0;
    let sumOfVariances = 0;

    // ==========================================
    // MONTE CARLO SIMULATION WITH WELFORD
    // ==========================================
    for (let attacker = 0; attacker < m; attacker++) {
        
        let currentMean = 0;
        let currentSS = 0;

        // The hacker attacks n systems
        for (let i = 1; i <= n; i++) {
            // Generate a random score from Continuous Uniform [0, 10]
            let x = Math.random() * 10;

            // WELFORD'S ALGORITHM (3 lines of core logic)
            let delta = x - currentMean;
            currentMean += delta / i;
            currentSS += delta * (x - currentMean);
        }

        // Calculate sample variance using Bessel's correction (n - 1)
        // Note: If n=1, variance is technically undefined (0 division), so we protect against it.
        let currentVariance = (n > 1) ? (currentSS / (n - 1)) : 0;

        // Store this hacker's results
        hackersMeans.push(currentMean);
        hackersVariances.push(currentVariance);

        // Add to global sums to later compute the average of all hackers
        sumOfMeans += currentMean;
        sumOfVariances += currentVariance;
    }

    // Compute the global averages across all m hackers
    const averageOfMeans = sumOfMeans / m;
    const averageOfVariances = sumOfVariances / m;

    // Update the HTML text with the empirical results (rounded to 4 decimals)
    document.getElementById('avg-means-out').innerText = averageOfMeans.toFixed(4);
    document.getElementById('avg-vars-out').innerText = averageOfVariances.toFixed(4);

    // ==========================================
    // PLOTLY CHARTS (Histograms)
    // ==========================================
    const baseLayout = {
        plot_bgcolor: '#252533', 
        paper_bgcolor: '#1e1e29',
        font: { color: '#d1d1e0', family: 'Courier New' },
        margin: { l: 50, r: 30, t: 30, b: 50 },
        showlegend: false
    };

    // Chart 1: Histogram of Means
    const traceMeans = {
        x: hackersMeans,
        type: 'histogram',
        marker: { color: '#8be9fd', line: { color: '#1e1e29', width: 1 } },
        opacity: 0.8
    };
    const layoutMeans = {
        ...baseLayout,
        xaxis: { gridcolor: '#444', zerolinecolor: '#ff5555', title: 'Sampling Mean (Expected: ~5.00)' },
        yaxis: { gridcolor: '#444', zerolinecolor: '#ff5555', title: 'Frequency' }
    };

    // Chart 2: Histogram of Variances
    const traceVariances = {
        x: hackersVariances,
        type: 'histogram',
        marker: { color: '#ff79c6', line: { color: '#1e1e29', width: 1 } },
        opacity: 0.8
    };
    const layoutVariances = {
        ...baseLayout,
        xaxis: { gridcolor: '#444', zerolinecolor: '#ff5555', title: 'Sampling Variance (Expected: ~8.333)' },
        yaxis: { gridcolor: '#444', zerolinecolor: '#ff5555', title: 'Frequency' }
    };

    Plotly.newPlot('chartMeans', [traceMeans], layoutMeans);
    Plotly.newPlot('chartVariances', [traceVariances], layoutVariances);
}

// Run simulation automatically on page load
window.onload = runSimulation;
