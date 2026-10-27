// Attach event listener to the button
document.getElementById('startBtn').addEventListener('click', runSimulation);

function runSimulation() {
    // ==========================================
    // 1. READ & PARSE USER INPUTS
    // ==========================================
    const model = document.getElementById('modelSelect').value;
    const n = parseInt(document.getElementById('inputN').value);
    const m = parseInt(document.getElementById('inputM').value);
    const p = parseFloat(document.getElementById('inputP').value);

    // Arrays to hold the Plotly trace objects
    let tracesTotal = [];
    let tracesAverage = [];
    let tracesNormalized = [];
    
    // Array to store ONLY the final normalized value of each attacker (for the Histogram)
    let finalNormalizedValues = [];

    // Determine theoretical expected value based on the chosen model
    const expectedValue = (model === 'bernoulli') ? p : 0;

    // Create the X-axis representing time/steps (from 1 to n)
    let xAxis = [];
    for(let i = 1; i <= n; i++) {
        xAxis.push(i);
    }

    // ==========================================
    // 2. MONTE CARLO SIMULATION ENGINE
    // ==========================================
    for (let attacker = 0; attacker < m; attacker++) {
        
        let S = 0; // Total score (S_n) accumulator
        
        let yTotal = [];
        let yAverage = [];
        let yNormalized = [];

        // Simulate n steps for the current attacker
        for (let i = 1; i <= n; i++) {
            let X = 0; 

            // Stochastic increment generation
            if (model === 'bernoulli') {
                X = Math.random() < p ? 1 : 0;
            } else if (model === 'rademacher') {
                X = Math.random() < 0.5 ? 1 : -1;
            }

            S += X; // Aggregate score
            
            // Calculate and store the 3 metrics
            yTotal.push(S);
            yAverage.push(S / i);
            
            // Avoid division by zero at step 0 (though we start at i=1)
            let normalized = S / Math.sqrt(i);
            yNormalized.push(normalized);
        }

        // Store the very last normalized value for the CLT Histogram
        finalNormalizedValues.push(yNormalized[n - 1]);

        // Base configuration for a single trajectory line
        let traceConfig = {
            x: xAxis,
            mode: 'lines',
            type: 'scatter',
            line: { width: 1 },
            opacity: 0.5, // Semi-transparent for better visualization of density
            showlegend: false,
            hoverinfo: 'none' // Disabling hover on every single line improves rendering performance
        };

        tracesTotal.push({ ...traceConfig, y: yTotal });
        tracesAverage.push({ ...traceConfig, y: yAverage });
        tracesNormalized.push({ ...traceConfig, y: yNormalized });
    }

    // ==========================================
    // 3. ADD THEORETICAL BASELINES (LLN Proof)
    // ==========================================
    // Adding a red dashed line to the Average chart to show the Expected Value
    let expectedValueTrace = {
        x: [1, n],
        y: [expectedValue, expectedValue],
        mode: 'lines',
        type: 'scatter',
        line: { color: '#ff5555', width: 3, dash: 'dash' },
        name: 'Expected Value (μ)',
        showlegend: true
    };
    tracesAverage.push(expectedValueTrace);

    // ==========================================
    // 4. PREPARE THE HISTOGRAM (CLT Proof)
    // ==========================================
    let traceHistogram = {
        x: finalNormalizedValues,
        type: 'histogram',
        marker: {
            color: '#bd93f9', // Dracula purple
            line: {
                color: '#1e1e29',
                width: 1
            }
        },
        opacity: 0.8,
        name: 'Final Distribution'
    };

    // ==========================================
    // 5. RENDER CHARTS WITH PLOTLY
    // ==========================================
    
    // Aesthetic layout matching the Dracula CSS theme
    const baseLayout = {
        plot_bgcolor: '#252533', 
        paper_bgcolor: '#1e1e29',
        font: { color: '#d1d1e0', family: 'Courier New' },
        xaxis: { gridcolor: '#444', zerolinecolor: '#ff5555', title: 'Systems Penetrated (n)' },
        yaxis: { gridcolor: '#444', zerolinecolor: '#ff5555' },
        margin: { l: 50, r: 30, t: 30, b: 50 },
        showlegend: false
    };

    // Special layout for Average Chart (to show the legend for the Expected Value line)
    const layoutAverage = {
        ...baseLayout,
        showlegend: true,
        legend: { x: 0.5, y: 1.1, xanchor: 'center', orientation: 'h' }
    };

    // Special layout for the Histogram
    const layoutHistogram = {
        ...baseLayout,
        xaxis: { gridcolor: '#444', zerolinecolor: '#ff5555', title: 'Final Normalized Score (Sₙ / √n)' },
        yaxis: { gridcolor: '#444', zerolinecolor: '#ff5555', title: 'Frequency (Number of Attackers)' },
    };

    // Render all 4 charts
    Plotly.newPlot('chartTotal', tracesTotal, baseLayout);
    Plotly.newPlot('chartAverage', tracesAverage, layoutAverage);
    Plotly.newPlot('chartNormalized', tracesNormalized, baseLayout);
    Plotly.newPlot('chartHistogram', [traceHistogram], layoutHistogram);
}

// Automatically run the simulation on page load
window.onload = runSimulation;
