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
// ==========================================
// 3. CAESAR CIPHER IMPLEMENTATION
// ==========================================

function caesarEncrypt() {
    // Fetch input parameters
    const key = parseInt(document.getElementById('caesar-key').value);
    const message = document.getElementById('caesar-message').value.toUpperCase();

    if (isNaN(key) || key < 1 || key > 25) {
        alert("Please enter a valid key between 1 and 25.");
        return;
    }

    // Encrypt by shifting characters forward in the alphabet
    let ciphertext = "";
    for (let i = 0; i < message.length; i++) {
        let charCode = message.charCodeAt(i);
        if (charCode >= 65 && charCode <= 90) { // A-Z ASCII
            ciphertext += String.fromCharCode(((charCode - 65 + key) % 26) + 65);
        } else {
            ciphertext += message[i]; // Preserve spaces and punctuation
        }
    }

    // Output to UI
    document.getElementById('caesar-cipher-out').innerText = ciphertext;

    // Store the ciphertext in the DOM dataset for decryption
    document.dataset = { 
        ...document.dataset, 
        caesarCiphertext: ciphertext 
    };
}

function caesarDecrypt() {
    // Fetch input parameters
    const key = parseInt(document.getElementById('caesar-key').value);
    const ciphertext = document.dataset?.caesarCiphertext;

    if (!ciphertext) {
        alert("Please encrypt a message first using the Caesar Cipher!");
        return;
    }

    // Decrypt by shifting characters backward in the alphabet
    let plaintext = "";
    for (let i = 0; i < ciphertext.length; i++) {
        let charCode = ciphertext.charCodeAt(i);
        if (charCode >= 65 && charCode <= 90) { // A-Z ASCII
            // Add 2600 to ensure a positive modulo result in JS
            plaintext += String.fromCharCode(((charCode - 65 - key + 2600) % 26) + 65);
        } else {
            plaintext += ciphertext[i];
        }
    }

    // Output to UI
    document.getElementById('caesar-plain-out').innerText = plaintext;
}

// ==========================================
// 4. STATISTICAL CRYPTANALYSIS OF CAESAR CIPHER
// ==========================================

function caesarStatisticalAttack() {
    const ciphertext = document.getElementById('caesar-attack-input').value.toUpperCase();
    if (!ciphertext.trim()) {
        alert("Please enter or generate a ciphertext to attack!");
        return;
    }

    // 1. Count letter frequencies
    let counts = {};
    let totalLetters = 0;
    for (let i = 0; i < ciphertext.length; i++) {
        let code = ciphertext.charCodeAt(i);
        if (code >= 65 && code <= 90) { // A-Z ASCII
            let char = ciphertext[i];
            counts[char] = (counts[char] || 0) + 1;
            totalLetters++;
        }
    }

    if (totalLetters === 0) {
        alert("Ciphertext contains no alphabetic letters!");
        return;
    }

    // 2. Find the letter with the highest frequency
    let maxChar = 'A';
    let maxCount = 0;
    for (let char in counts) {
        if (counts[char] > maxCount) {
            maxCount = counts[char];
            maxChar = char;
        }
    }

    // 3. Assume the most frequent letter corresponds to 'E' (ASCII 69, index 4)
    let maxCharCode = maxChar.charCodeAt(0);
    let recoveredKey = (maxCharCode - 65 - (69 - 65) + 26) % 26;

    // 4. Decrypt using the recovered key
    let plaintext = "";
    for (let i = 0; i < ciphertext.length; i++) {
        let code = ciphertext.charCodeAt(i);
        if (code >= 65 && code <= 90) {
            plaintext += String.fromCharCode(((code - 65 - recoveredKey + 2600) % 26) + 65);
        } else {
            plaintext += ciphertext[i];
        }
    }

    // Output results to UI
    document.getElementById('stat-most-freq').innerText = `'${maxChar}' (${maxCount} times out of ${totalLetters} letters)`;
    document.getElementById('stat-recovered-key').innerText = recoveredKey;
    document.getElementById('stat-decrypted-text').innerText = plaintext;
}
