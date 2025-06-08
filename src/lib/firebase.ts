
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';

// Ensure these variable names match exactly what's in your .env.local
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// console.log('Firebase Config Loaded in firebase.ts:', firebaseConfig); // For debugging

const PLACEHOLDER_VALUES = [
  'YOUR_API_KEY',
  'YOUR_AUTH_DOMAIN',
  'YOUR_PROJECT_ID',
  'YOUR_STORAGE_BUCKET',
  'YOUR_MESSAGING_SENDER_ID',
  'YOUR_APP_ID',
  undefined,
  null,
  ''
];

let configIsValid = true;
const errorMessages: string[] = [];

if (!firebaseConfig.apiKey || PLACEHOLDER_VALUES.includes(firebaseConfig.apiKey)) {
  errorMessages.push(`NEXT_PUBLIC_FIREBASE_API_KEY is missing or using a placeholder value. Current value: ${firebaseConfig.apiKey}`);
  configIsValid = false;
}
if (!firebaseConfig.authDomain || PLACEHOLDER_VALUES.includes(firebaseConfig.authDomain)) {
  errorMessages.push('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN is missing or using a placeholder value.');
  configIsValid = false;
}
if (!firebaseConfig.projectId || PLACEHOLDER_VALUES.includes(firebaseConfig.projectId)) {
  errorMessages.push('NEXT_PUBLIC_FIREBASE_PROJECT_ID is missing or using a placeholder value.');
  configIsValid = false;
}
// Add checks for other essential variables if needed

if (!configIsValid) {
  const fullErrorMessage =
    'Firebase configuration is invalid. Critical environment variables are missing or are using placeholder values. ' +
    'Please create or check your .env.local file and ensure it contains your actual Firebase project credentials prefixed with NEXT_PUBLIC_. ' +
    'The application cannot start without valid Firebase configuration. Details: ' +
    errorMessages.join('; ');
  console.error(fullErrorMessage); // Log it for server-side visibility
  throw new Error(fullErrorMessage); // Throw to halt client-side execution if critical
}

let app: FirebaseApp;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

const db: Firestore = getFirestore(app);
const auth: Auth = getAuth(app);

export { db, auth, app };
