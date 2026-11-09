// ==========================================
// EVENT LISTENERS
// ==========================================
document.getElementById('calcIntegrationBtn').addEventListener('click', computeExercise1);
document.getElementById('calcCdfBtn').addEventListener('click', computeExercise2);

// ==========================================
// EXERCISE 1: RIEMANN VS LEBESGUE
// ==========================================

// Dictionary of functions and their domains [a, b]
const functions = {
    'sin': { 
        fn: x => Math.sin(x), 
        a: 0, b: Math.PI 
    },
    'x2': { 
        fn: x => x * x, 
        a: 0, b: 1 
    },
    'step': { 
        fn: x => (x < 0.5) ? 1 : 3, 
        a: 0, b: 1 
    },
    'abs': { 
        fn: x => Math.abs(x - 0.5), 
        a: 0, b: 1 
    },
    'pathological': { 
        // Simulated Dirichlet: 
        // Returns 1 if 'x' is a clean grid fraction (simulating Rationals)
        // Returns 0 for random floating points (simulating Irrationals)
        fn: (x, N) => (Math.abs((x * N) % 1) < 1e-9) ? 1 : 0, 
        a: 0, b: 1 
    }
};

function computeExercise1() {
    const funcKey = document.getElementById('functionSelect').value;
    const N = parseInt(document.getElementById('inputN').value);
    
    const { fn, a, b } = functions[funcKey];

    // 1. RIEMANN INTEGRATION (Domain Partitioning)
    let riemannSum = 0;
    let dx = (b - a) / N;
    for (let i = 0; i < N; i++) {
        // Evaluate at the left endpoint of the subinterval
        let x = a + i * dx; 
        riemannSum += fn(x, N) * dx;
    }

    // 2. LEBESGUE INTEGRATION (Range Partitioning / Measure Theory)
    // We sample N random points in the domain to represent continuous space
    let lebesgueSum = 0;
    const numBins = 1000; // Partition the Y-axis into 1000 measurable subsets
    let yValues = [];
    
    let minY = Infinity;
    let maxY = -Infinity;

    // Step A: Sample random points and find Range (min Y, max Y)
    for (let i = 0; i < N; i++) {
        let x = a + Math.random() * (b - a);
        let y = fn(x, N);
        yValues.push(y);
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
    }

    // Step B: If the function is constant, avoid division by zero in bins
    if (maxY === minY) {
        lebesgueSum = minY * (b - a);
    } else {
        // Step C: Create Bins for the Range (Y-axis)
        let bins = new Array(numBins).fill(0);
        let dy = (maxY - minY) / numBins;

        // Step D: Calculate the "Measure" of each preimage
        for (let i = 0; i < N; i++) {
            let binIndex = Math.floor((yValues[i] - minY) / dy);
            if (binIndex >= numBins) binIndex = numBins - 1; // Edge case
            bins[binIndex]++;
        }

        // Step E: Lebesgue Integral = Sum of (Y_val * Measure_of_Preimage)
        for (let j = 0; j < numBins; j++) {
            let y_mid = minY + (j + 0.5) * dy;
            let measure = (bins[j] / N) * (b - a); // Probability mass * domain width
            lebesgueSum += y_mid * measure;
        }
    }

    // Output formatting
    const diff = Math.abs(riemannSum - lebesgueSum);
    document.getElementById('riemann-out').innerText = riemannSum.toFixed(6);
    document.getElementById('lebesgue-out').innerText = lebesgueSum.toFixed(6);
    
    // Highlight if they diverge (Pathological case)
    const diffOut = document.getElementById('diff-out');
    diffOut.innerText = diff.toFixed(6);
    if (diff > 0.1) {
        diffOut.style.color = '#ff5555'; // Red if they disagree completely
        diffOut.innerText += " (Divergence Detected!)";
    } else {
        diffOut.style.color = '#50fa7b'; // Green if they converge
        diffOut.innerText += " (Converged)";
    }
}


// ==========================================
// EXERCISE 2: NORMAL CDF COMPUTATION
// ==========================================

// Standard Normal PDF function: f(x) = (1 / sqrt(2*PI)) * e^(-x^2 / 2)
function normalPDF(x) {
    return (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * x * x);
}

// Trusted Reference CDF using Error Function (Abramowitz and Stegun Approximation)
function referenceCDF(z) {
    // ERF Approximation logic
    function erf(x) {
        const sign = (x >= 0) ? 1 : -1;
        x = Math.abs(x);
        
        const p = 0.3275911;
        const a1 = 0.254829592;
        const a2 = -0.284496736;
        const a3 = 1.421413741;
        const a4 = -1.453152027;
        const a5 = 1.061405429;
        
        const t = 1 / (1 + p * x);
        const poly = t * (a1 + t * (a2 + t * (a3 + t * (a4 + t * a5))));
        
        return sign * (1 - poly * Math.exp(-x * x));
    }
    
    // Normal CDF expressed via ERF
    return 0.5 * (1 + erf(z / Math.sqrt(2)));
}

function computeExercise2() {
    const z = parseFloat(document.getElementById('inputZ').value);
    
    // 1. NUMERICAL INTEGRATION (Simpson's Rule)
    const N = 10000; // Must be even
    const a = -8;    // Start from -8 to simulate -Infinity (tails are ~0 here)
    const b = z;
    const h = (b - a) / N;
    
    let simpsonSum = normalPDF(a) + normalPDF(b);
    
    for (let i = 1; i < N; i++) {
        let x = a + i * h;
        if (i % 2 !== 0) {
            simpsonSum += 4 * normalPDF(x); // Odd indices multiplied by 4
        } else {
            simpsonSum += 2 * normalPDF(x); // Even indices multiplied by 2
        }
    }
    
    const computedCDF = (h / 3) * simpsonSum;
    
    // 2. THEORETICAL REFERENCE (Erf Approximation)
    const refCDF = referenceCDF(z);
    
    // 3. ERROR CALCULATION
    const error = Math.abs(computedCDF - refCDF);

    // Update Output
    document.getElementById('simpson-out').innerText = computedCDF.toFixed(8);
    document.getElementById('ref-out').innerText = refCDF.toFixed(8);
    document.getElementById('cdf-error-out').innerText = error.toExponential(4);
}

// Run initial calculations on page load
window.onload = () => {
    computeExercise1();
    computeExercise2();
};
