/**
 * Firebase Admin SDK Configuration
 * Used for verifying Google ID tokens
 */

const admin = require("firebase-admin");
const logger = require("./logger");

let firebaseApp = null;

const initFirebase = () => {
  if (firebaseApp) return firebaseApp;

  try {
    // Support both JSON key file and individual env vars
    const serviceAccount = process.env.FIREBASE_KEY_FILE
      ? require(process.env.FIREBASE_KEY_FILE)
      : {
          type: "service_account",
          project_id: process.env.FIREBASE_PROJECT_ID,
          private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
          client_email: process.env.FIREBASE_CLIENT_EMAIL,
        };

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    logger.info("✅ Firebase Admin SDK initialized");
  } catch (error) {
    logger.warn(
      "⚠️  Firebase Admin SDK not initialized (Google login unavailable):",
      error.message
    );
    // Don't crash the server—Firebase is optional if using only JWT
  }

  return firebaseApp;
};

// Verify a Google ID token and return decoded user info
const verifyGoogleToken = async (idToken) => {
  const app = initFirebase();
  if (!app) {
    throw new Error("Firebase Admin SDK not configured");
  }
  const decodedToken = await admin.auth().verifyIdToken(idToken);
  return decodedToken;
};

module.exports = { initFirebase, verifyGoogleToken };
