// ==========================================
// --- STEP 1 & 2: ECC MATH ---
// ==========================================
let P = 17; 
let A = 0; 
let B = 7;
let O = "O"; 

function mod(n, p) { return ((n % p) + p) % p; }

function modInverse(a, p) {
    a = mod(a, p);
    if (a === 0) throw new Error("Division by zero");
    let res = 1, power = a, exponent = p - 2;
    while (exponent > 0) {
        if (exponent % 2 === 1) res = mod(res * power, p);
        power = mod(power * power, p);
        exponent = Math.floor(exponent / 2);
    }
    return res;
}

function addPoints(p1, p2) {
    if (p1 === O) return p2;
    if (p2 === O) return p1;
    let x1 = p1[0], y1 = p1[1];
    let x2 = p2[0], y2 = p2[1];
    if (x1 === x2 && mod(y1, P) === mod(-y2, P)) return O;

    let m;
    if (x1 !== x2) {
        m = mod(mod(y2 - y1, P) * modInverse(mod(x2 - x1, P), P), P);
    } else {
        m = mod(mod(3 * x1 * x1 + A, P) * modInverse(mod(2 * y1, P), P), P);
    }
    let x3 = mod(m * m - x1 - x2, P);
    let y3 = mod(m * (x1 - x3) - y1, P);
    return [x3, y3];
}

function generateSequence(basePoint, privateKey) {
    let sequence = [];
    let currentPoint = basePoint;
    sequence.push({ step: 1, point: currentPoint });
    for (let i = 2; i <= privateKey; i++) {
        currentPoint = addPoints(currentPoint, basePoint);
        sequence.push({ step: i, point: currentPoint });
    }
    return sequence;
}

// ==========================================
// --- STEP 3: INTERACTIVE UI & ANIMATION ---
// ==========================================
let currentInterval = null;

function runCalculation() {
    // Read new inputs
    const gx = parseInt(document.getElementById('base-point-x').value);
    const gy = parseInt(document.getElementById('base-point-y').value);
    const baseG = [gx, gy];
    const privateK = parseInt(document.getElementById('private-key-input').value);

    const eccSequence = generateSequence(baseG, privateK);
    const toyPublicKey = eccSequence[eccSequence.length - 1].point;

    const listElement = document.getElementById('points-list');
    const outputElement = document.getElementById('public-key-output');
    listElement.innerHTML = '';

    eccSequence.forEach(item => {
        let li = document.createElement('li');
        let pointStr = (item.point === O) ? "Infinity" : `[${item.point[0]}, ${item.point[1]}]`;
        li.innerHTML = `<strong>${item.step}G</strong> = ${pointStr}`;
        listElement.appendChild(li);
    });

    let pkStr = (toyPublicKey === O) ? "Infinity" : `[${toyPublicKey[0]}, ${toyPublicKey[1]}]`;
    outputElement.textContent = pkStr;

    const canvas = document.getElementById('ecc-canvas');
    const ctx = canvas.getContext('2d');
    const scale = 20, padding = 30;

    function drawGrid() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#444'; ctx.lineWidth = 0.5;
        for (let i = 0; i <= P; i++) {
            ctx.beginPath(); ctx.moveTo(padding + i * scale, padding); ctx.lineTo(padding + i * scale, padding + P * scale); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(padding, padding + i * scale); ctx.lineTo(padding + P * scale, padding + i * scale); ctx.stroke();
            ctx.fillStyle = '#cccccc'; ctx.font = '10px Arial';
            if (i % 2 === 0) {
                ctx.fillText(i, padding + i * scale - 4, padding + P * scale + 15);
                ctx.fillText(P - i, padding - 20, padding + i * scale + 4);
            }
        }
    }

    function drawAllValidPoints() {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        for (let x = 0; x < P; x++) {
            let rhs = mod(x * x * x + A * x + B, P);
            for (let y = 0; y < P; y++) {
                if (mod(y * y, P) === rhs) {
                    ctx.beginPath(); ctx.arc(padding + x * scale, padding + (P - y) * scale, 3, 0, Math.PI * 2); ctx.fill();
                }
            }
        }
    }

    drawGrid();
    drawAllValidPoints();

    if (currentInterval) clearInterval(currentInterval);

    let step = 0;
    currentInterval = setInterval(() => {
        if (step >= eccSequence.length) {
            clearInterval(currentInterval);
            return;
        }
        let pt = eccSequence[step].point;
        if (pt !== O) {
            ctx.fillStyle = (step === eccSequence.length - 1) ? '#03dac6' : '#bb86fc';
            ctx.beginPath(); ctx.arc(padding + pt[0] * scale, padding + (P - pt[1]) * scale, 6, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.font = 'bold 12px Courier';
            ctx.fillText(`${step+1}G`, padding + pt[0] * scale + 8, padding + (P - pt[1]) * scale - 8);
        }
        step++;
    }, 800);
}

// Function to update global curve variables
function updateCurve() {
    A = parseInt(document.getElementById('val-a').value);
    B = parseInt(document.getElementById('val-b').value);
    P = parseInt(document.getElementById('val-p').value);
    runCalculation();
}

document.getElementById('calculate-btn').addEventListener('click', runCalculation);
runCalculation();
