// ==========================================
// 1. TOY ECC MATH CORE
// ==========================================
// Curve: y^2 = x^3 + 7 mod 17
const P = 17; 
const A = 0; 
const O = "O"; // Point at infinity
const baseG = [15, 13]; // Generator Point G

// Custom modulo function to handle negative numbers
function mod(n, p) { 
    return ((n % p) + p) % p; 
}

// Modular inverse using Fermat's Little Theorem
function modInverse(a, p) {
    a = mod(a, p);
    if (a === 0) return 0;
    let res = 1, power = a, exponent = p - 2;
    while (exponent > 0) {
        if (exponent % 2 === 1) res = mod(res * power, p);
        power = mod(power * power, p);
        exponent = Math.floor(exponent / 2);
    }
    return res;
}

// Elliptic Curve Point Addition
function addPoints(p1, p2) {
    if (p1 === O) return p2;
    if (p2 === O) return p1;
    
    let x1 = p1[0], y1 = p1[1];
    let x2 = p2[0], y2 = p2[1];
    
    // Vertical tangent (Result is infinity)
    if (x1 === x2 && mod(y1, P) === mod(-y2, P)) return O;

    let m;
    if (x1 !== x2) {
        // P1 != P2
        m = mod(mod(y2 - y1, P) * modInverse(mod(x2 - x1, P), P), P);
    } else {
        // P1 == P2 (Point doubling)
        m = mod(mod(3 * x1 * x1 + A, P) * modInverse(mod(2 * y1, P), P), P);
    }
    
    let x3 = mod(m * m - x1 - x2, P);
    let y3 = mod(m * (x1 - x3) - y1, P);
    
    return [x3, y3];
}

// Elliptic Curve Scalar Multiplication (Double and Add)
function scalarMultiply(k, P_point) {
    let result = O;
    let currentPoint = P_point;
    let tempK = k;
    
    while (tempK > 0) {
        if (tempK % 2 === 1) result = addPoints(result, currentPoint);
        currentPoint = addPoints(currentPoint, currentPoint);
        tempK = Math.floor(tempK / 2);
    }
    return result;
}


// ==========================================
// 2. TOY ECC ENCRYPTION / DECRYPTION
// ==========================================

function eccEncrypt() {
    // 1. Get input parameters from UI
    // Note: private keys are small (1 to 17) to fit the toy scheme
    const bobPrivK = parseInt(document.getElementById('ecc-bob-k').value);
    const aliceRandR = parseInt(document.getElementById('ecc-alice-r').value);
    const message = document.getElementById('ecc-message').value.toUpperCase();

    // 2. Recipient (Bob) generates Public Key Q = k * G
    const bobPubQ = scalarMultiply(bobPrivK, baseG);
    if (bobPubQ === O) {
        alert("Bob's key generates the Point at Infinity. Choose another 'k'.");
        return;
    }

    // 3. Sender (Alice) computes Ephemeral Point R = r * G (To be sent publicly)
    const alicePointR = scalarMultiply(aliceRandR, baseG);
    if (alicePointR === O) {
        alert("Alice's key generates the Point at Infinity. Choose another 'r'.");
        return;
    }

    // 4. Sender (Alice) computes Shared Secret S = r * Q
    const sharedSecret = scalarMultiply(aliceRandR, bobPubQ);
    if (sharedSecret === O) {
        alert("Shared Secret is the Point at Infinity. Change keys.");
        return;
    }

    // 5. Encrypt message using the X-coordinate of the Shared Secret as a shift key
    const shiftKey = sharedSecret[0]; 
    
    let ciphertext = "";
    for (let i = 0; i < message.length; i++) {
        let charCode = message.charCodeAt(i);
        if (charCode >= 65 && charCode <= 90) { // A-Z shift
            ciphertext += String.fromCharCode(((charCode - 65 + shiftKey) % 26) + 65);
        } else {
            ciphertext += message[i]; // Keep spaces
        }
    }

    // 6. Output to UI
    document.getElementById('ecc-bob-q').innerText = `[${bobPubQ[0]}, ${bobPubQ[1]}]`;
    document.getElementById('ecc-alice-r-out').innerText = `[${alicePointR[0]}, ${alicePointR[1]}]`;
    document.getElementById('ecc-secret-out').innerText = `Shift +${shiftKey}`;
    document.getElementById('ecc-cipher-out').innerText = ciphertext;

    // Save temporary data in DOM for the Decrypt function
    document.dataset = { 
        cipher: ciphertext, 
        rx: alicePointR[0], 
        ry: alicePointR[1] 
    };
}

function eccDecrypt() {
    // 1. Fetch data
    const bobPrivK = parseInt(document.getElementById('ecc-bob-k').value);
    const ciphertext = document.dataset?.cipher;
    
    if (!ciphertext) {
        alert("Please encrypt a message first!");
        return;
    }

    const pointR = [parseInt(document.dataset.rx), parseInt(document.dataset.ry)];

    // 2. Recipient (Bob) recalculates the Shared Secret S = k * R
    const sharedSecret = scalarMultiply(bobPrivK, pointR);
    
    // Extract the same shift key (X-coordinate)
    const shiftKey = sharedSecret[0];

    // 3. Decrypt by shifting backwards
    let plaintext = "";
    for (let i = 0; i < ciphertext.length; i++) {
        let charCode = ciphertext.charCodeAt(i);
        if (charCode >= 65 && charCode <= 90) {
            // Add 26 to handle negative modulo in JS
            plaintext += String.fromCharCode(((charCode - 65 - shiftKey + 26) % 26) + 65);
        } else {
            plaintext += ciphertext[i];
        }
    }

    // 4. Output to UI
    document.getElementById('ecc-plain-out').innerText = plaintext;
}
