// ==========================================
// 1. SECP256K1 CURVE PARAMETERS (BigInt)
// ==========================================
// The secp256k1 curve is defined by y^2 = x^3 + ax + b over the finite field Fp.
// For secp256k1: a = 0, b = 7

// The prime modulus p
const P = 115792089237316195423570985008687907853269984665640564039457584007908834671663n;
const A = 0n;
const O = "O"; // Point at infinity

// The Generator point G (x, y)
const G = [
    55066263022277343669578718895168534326250603453777594175500187360389116729240n,
    32670510020758816978083085130507043184471273380659243275938904335757337482424n
];

// ==========================================
// 2. MODULAR ARITHMETIC CORE
// ==========================================

// Custom modulo function to handle negative numbers in JS correctly with BigInt
function mod(n, p) {
    return ((n % p) + p) % p;
}

// Modular inverse using Fermat's Little Theorem (a^(p-2) mod p == a^-1 mod p)
// since P is a prime number.
function modInverse(a, p) {
    a = mod(a, p);
    if (a === 0n) return 0n; // Avoid silent crash on division by zero
    
    let res = 1n;
    let power = a;
    let exponent = p - 2n;
    
    while (exponent > 0n) {
        if (exponent % 2n === 1n) {
            res = mod(res * power, p);
        }
        power = mod(power * power, p);
        exponent /= 2n;
    }
    return res;
}

// Elliptic Curve Point Addition: R = P1 + P2
function addPoints(p1, p2) {
    if (p1 === O) return p2;
    if (p2 === O) return p1;
    
    let x1 = p1[0], y1 = p1[1];
    let x2 = p2[0], y2 = p2[1];
    
    // If points are vertically aligned, the result is the point at infinity
    if (x1 === x2 && mod(y1, P) === mod(-y2, P)) return O;

    let m; // Slope of the line intersecting the curve
    if (x1 !== x2) {
        // Point addition (P1 != P2)
        m = mod(mod(y2 - y1, P) * modInverse(mod(x2 - x1, P), P), P);
    } else {
        // Point doubling (P1 == P2)
        m = mod(mod(3n * x1 * x1 + A, P) * modInverse(mod(2n * y1, P), P), P);
    }
    
    let x3 = mod(m * m - x1 - x2, P);
    let y3 = mod(m * (x1 - x3) - y1, P);
    
    return [x3, y3];
}

// Elliptic Curve Scalar Multiplication: R = k * P (Double and Add algorithm)
function scalarMultiply(k, P_point) {
    let result = O;
    let currentPoint = P_point;
    let tempK = BigInt(k); // Ensure k is a BigInt
    
    while (tempK > 0n) {
        if (tempK % 2n === 1n) {
            result = addPoints(result, currentPoint);
        }
        currentPoint = addPoints(currentPoint, currentPoint);
        tempK /= 2n;
    }
    return result;
}

// ==========================================
// 3. TOY ENCRYPTION USING ECIES CONCEPT
// ==========================================
// We use a simplified ElGamal/ECIES approach. We generate a Shared Secret Point.
// We use the X-coordinate of the secret to perform a Caesar-style shift on the text.

function eccEncrypt() {
    // 1. Fetch input values (Convert to BigInt for cryptographic operations)
    const bobPrivKStr = document.getElementById('ecc-bob-k').value;
    const aliceRandRStr = document.getElementById('ecc-alice-r').value;
    const message = document.getElementById('ecc-message').value.toUpperCase();

    if (!bobPrivKStr || !aliceRandRStr) {
        alert("Please enter both keys!");
        return;
    }

    const bobPrivK = BigInt(bobPrivKStr);
    const aliceRandR = BigInt(aliceRandRStr);

    // 2. Bob calculates his Public Key (Q = k * G)
    const bobPubQ = scalarMultiply(bobPrivK, G);
    
    // 3. Alice calculates the Ephemeral Point to send to Bob (R = r * G)
    const alicePointR = scalarMultiply(aliceRandR, G);
    
    // 4. Alice calculates the Shared Secret Point (S = r * Q)
    const sharedSecret = scalarMultiply(aliceRandR, bobPubQ);
    
    // 5. Encrypt the message using the X coordinate of the Shared Secret
    // We reduce the massive BigInt to a small number (modulo 26) to shift the alphabet
    const shiftKey = Number(sharedSecret[0] % 26n); 
    
    let ciphertext = "";
    for (let i = 0; i < message.length; i++) {
        let charCode = message.charCodeAt(i);
        if (charCode >= 65 && charCode <= 90) { // A-Z only
            ciphertext += String.fromCharCode(((charCode - 65 + shiftKey) % 26) + 65);
        } else {
            ciphertext += message[i]; // Leave spaces unchanged
        }
    }

    // 6. Display results on the UI
    document.getElementById('ecc-bob-q').innerText = `[${bobPubQ[0].toString().substring(0, 10)}..., ...]`;
    document.getElementById('ecc-alice-r-out').innerText = `[${alicePointR[0].toString().substring(0, 10)}..., ...]`;
    document.getElementById('ecc-secret-out').innerText = `Shift +${shiftKey} (Derived from Secret X)`;
    document.getElementById('ecc-cipher-out').innerText = ciphertext;

    // Store data needed for decryption in the DOM
    document.dataset = { 
        cipher: ciphertext, 
        rx: alicePointR[0].toString(), 
        ry: alicePointR[1].toString() 
    };
}

function eccDecrypt() {
    // 1. Fetch the stored ciphertext and Bob's private key
    const bobPrivKStr = document.getElementById('ecc-bob-k').value;
    const ciphertext = document.dataset?.cipher;
    
    if (!ciphertext) {
        alert("You must encrypt a message first!");
        return;
    }

    const bobPrivK = BigInt(bobPrivKStr);
    const pointR = [BigInt(document.dataset.rx), BigInt(document.dataset.ry)];

    // 2. Bob calculates the Shared Secret Point using his private key and Alice's point (S = k * R)
    const sharedSecret = scalarMultiply(bobPrivK, pointR);
    
    // 3. Extract the same shift key (modulo 26) from the X coordinate
    const shiftKey = Number(sharedSecret[0] % 26n);

    // 4. Decrypt the message by shifting backwards
    let plaintext = "";
    for (let i = 0; i < ciphertext.length; i++) {
        let charCode = ciphertext.charCodeAt(i);
        if (charCode >= 65 && charCode <= 90) {
            // Add 26 before modulo to handle negative JS numbers properly
            plaintext += String.fromCharCode(((charCode - 65 - shiftKey + 26) % 26) + 65);
        } else {
            plaintext += ciphertext[i];
        }
    }

    // 5. Display the decrypted message
    document.getElementById('ecc-plain-out').innerText = plaintext;
}
