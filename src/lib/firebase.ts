
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAuth, type Auth, type ActionCodeSettings as FirebaseAuthActionCodeSettings } from 'firebase/auth';

// Ensure these variable names match exactly what's in your .env.local
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_APP_ID,
};

let configIsValid = true;
const errorMessages: string[] = [];

if (!firebaseConfig.apiKey ) {
  errorMessages.push(`NEXT_PUBLIC_API_KEY is missing or using a placeholder value. Current value: ${firebaseConfig.apiKey}`);
  configIsValid = false;
}
if (!firebaseConfig.authDomain ) {
  errorMessages.push('NEXT_PUBLIC_AUTH_DOMAIN is missing or using a placeholder value.');
  configIsValid = false;
}
if (!firebaseConfig.projectId ) {
  errorMessages.push('NEXT_PUBLIC_PROJECT_ID is missing or using a placeholder value.');
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

const actionCodeSettings: FirebaseAuthActionCodeSettings = {
  // URL you want to redirect back to. The domain (www.example.com)
  // must be whitelisted in the Firebase Console.
  url: typeof window !== 'undefined' ? `${window.location.origin}/auth` : 'http://localhost:9002/auth', // Fallback for server context, adjust port if needed
  handleCodeInApp: true, // This must be true.
  // iOS: {
  //   bundleId: 'com.example.ios'
  // },
  // android: {
  //   packageName: 'com.example.android',
  //   installApp: true,
  //   minimumVersion: '12'
  // },
  // dynamicLinkDomain: 'yourapp.page.link' // If you use dynamic links
};


export { db, auth, app, actionCodeSettings };
