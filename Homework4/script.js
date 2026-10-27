// Add an event listener to the button: when clicked, it executes runSimulation
document.getElementById('startBtn').addEventListener('click', runSimulation);

function runSimulation() {
    // ==========================================
    // 1. READ USER INPUTS
    // ==========================================
    const model = document.getElementById('modelSelect').value;
    const n = parseInt(document.getElementById('inputN').value);
    const m = parseInt(document.getElementById('inputM').value);
    const p = parseFloat(document.getElementById('inputP').value);

    // Arrays that will contain all the lines (trajectories) to be drawn
    let tracesTotal = [];
    let tracesAverage = [];
    let tracesNormalized = [];

    // Create the X-axis for time (from 1 to n systems)
    let xAxis = [];
    for(let i = 1; i <= n; i++) {
        xAxis.push(i);
    }

    // ==========================================
    // 2. SIMULATION ENGINE (MONTE CARLO)
    // ==========================================
    // Outer loop: iterate over each attacker (from 1 to m)
    for (let attacker = 0; attacker < m; attacker++) {
        
        let S = 0; // Total score (S_n) starting at 0 for each attacker
        
        // Arrays to store the Y points for this specific attacker
        let yTotal = [];
        let yAverage = [];
        let yNormalized = [];

        // Inner loop: time steps (from 1 to n systems)
        for (let i = 1; i <= n; i++) {
            let X = 0; // The score of this single step (increment)

            // Stochastic value generation based on the selected model
            if (model === 'bernoulli') {
                // Generate a random number between 0 and 1. If less than p, success (1), else (0)
                X = Math.random() < p ? 1 : 0;
            } else if (model === 'rademacher') {
                // Generate a random number. 50% probability for +1, 50% probability for -1
                X = Math.random() < 0.5 ? 1 : -1;
            }

            S += X; // Update the total sum
            
            // Save the 3 calculated values for step 'i'
            yTotal.push(S);
            yAverage.push(S / i);
            yNormalized.push(S / Math.sqrt(i));
        }

        // ==========================================
        // 3. PREPARE DATA FOR PLOTLY
        // ==========================================
        // Create the configuration for a single line trace
        let traceConfig = {
            x: xAxis,
            mode: 'lines',
            type: 'scatter',
            line: { width: 1.5 }, // Line thickness
            opacity: 0.6,         // Slightly transparent to visualize overlapping lines
            showlegend: false     // Hide legend because we have m lines
        };

        // Append the calculated line to the respective charts
        tracesTotal.push({ ...traceConfig, y: yTotal });
        tracesAverage.push({ ...traceConfig, y: yAverage });
        tracesNormalized.push({ ...traceConfig, y: yNormalized });
    }

    // ==========================================
    // 4. RENDER CHARTS
    // ==========================================
    // Aesthetic layout matching your CSS (Dracula Theme)
    const layout = {
        plot_bgcolor: '#1e1e29',  // Chart background
        paper_bgcolor: '#1e1e29', // Background around the chart
        font: { color: '#d1d1e0', family: 'Courier New' },
        xaxis: { gridcolor: '#444', zerolinecolor: '#ff5555', title: 'Number of Systems (n)' },
        yaxis: { gridcolor: '#444', zerolinecolor: '#ff5555' },
        margin: { l: 50, r: 20, t: 20, b: 50 }
    };

    // Instruct Plotly to draw/update the 3 div containers with the new data
    Plotly.newPlot('chartTotal', tracesTotal, layout);
    Plotly.newPlot('chartAverage', tracesAverage, layout);
    Plotly.newPlot('chartNormalized', tracesNormalized, layout);
}

// Automatically run the simulation as soon as the page loads
window.onload = runSimulation;
