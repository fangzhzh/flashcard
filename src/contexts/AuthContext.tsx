
"use client";
import type { AppUser } from '@/types';
import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { auth, actionCodeSettings } from '@/lib/firebase'; // actionCodeSettings is already imported
import { 
  onAuthStateChanged, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut as firebaseSignOut, 
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendSignInLinkToEmail as firebaseSendSignInLinkToEmail,
  isSignInWithEmailLink as firebaseIsSignInWithEmailLink,
  signInWithEmailLink as firebaseSignInWithEmailLink,
  type ActionCodeSettings as FirebaseAuthActionCodeSettings, // For typing if needed, but actionCodeSettings is imported value
} from 'firebase/auth';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/lib/i18n/client';
import { useRouter, usePathname } from 'next/navigation';
import type { FieldValue } from 'firebase/firestore'; // Not used here, but good for consistency if other contexts use it

const EMAIL_FOR_SIGN_IN_LINK_KEY = 'emailForSignInLink';

interface AuthContextType {
  user: AppUser;
  loading: boolean;
  isProcessingLink: boolean;
  signInWithGoogle: () => Promise<void>;
  signUpWithEmailPassword: (email: string, pass: string) => Promise<AppUser | null>;
  signInWithEmailPassword: (email: string, pass: string) => Promise<AppUser | null>;
  sendSignInLinkToEmail: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AppUser>(null);
  const [loading, setLoading] = useState(true);
  const [isProcessingLink, setIsProcessingLink] = useState(true);
  const { toast } = useToast();
  const t = useI18n();
  const router = useRouter();
  const pathname = usePathname();


  const mapFirebaseUserToAppUser = (firebaseUser: FirebaseUser | null): AppUser => {
    if (!firebaseUser) return null;
    return {
      uid: firebaseUser.uid,
      displayName: firebaseUser.displayName,
      email: firebaseUser.email,
      photoURL: firebaseUser.photoURL,
    };
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      setUser(mapFirebaseUserToAppUser(firebaseUser));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const completeLinkSignIn = async () => {
      if (firebaseIsSignInWithEmailLink(auth, window.location.href)) {
        setIsProcessingLink(true);
        let email = window.localStorage.getItem(EMAIL_FOR_SIGN_IN_LINK_KEY);
        if (!email) {
          email = window.prompt(t('auth.emailLink.promptEmail'));
        }
        if (email) {
          try {
            const result = await firebaseSignInWithEmailLink(auth, email, window.location.href);
            setUser(mapFirebaseUserToAppUser(result.user));
            window.localStorage.removeItem(EMAIL_FOR_SIGN_IN_LINK_KEY);
            toast({ title: t('success'), description: t('auth.emailLink.success') });
            const locale = pathname.split('/')[1] || 'en';
            router.push(`/${locale}/`);
          } catch (error: any) {
            console.error("Error signing in with email link:", error);
            toast({ title: t('error'), description: t(error.code as any) || t('auth.emailLink.error.generic'), variant: 'destructive' });
          }
        } else {
           toast({ title: t('error'), description: t('auth.emailLink.error.noEmail'), variant: 'destructive' });
        }
        if (window.history && window.history.replaceState) {
            window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
      setIsProcessingLink(false);
    };
    completeLinkSignIn();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, toast, router, pathname]);

  const signInWithGoogle = async () => {
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error("Error signing in with Google:", error);
      toast({ title: t('error'), description: t(error.code as any) || t('auth.error.googleSignInFailed'), variant: "destructive" });
    }
  };

  const signUpWithEmailPassword = async (email: string, pass: string): Promise<AppUser | null> => {
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      return mapFirebaseUserToAppUser(userCredential.user);
    } catch (error: any) {
      console.error("Error signing up:", error);
      toast({ title: t('error'), description: t(error.code as any) || t('auth.error.signUpFailed'), variant: "destructive" });
      setLoading(false);
      return null;
    }
  };

  const signInWithEmailPassword = async (email: string, pass: string): Promise<AppUser | null> => {
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, pass);
      return mapFirebaseUserToAppUser(userCredential.user);
    } catch (error: any) {
      console.error("Error signing in:", error);
      toast({ title: t('error'), description: t(error.code as any) || t('auth.error.signInFailed'), variant: "destructive" });
      setLoading(false);
      return null;
    }
  };

  const sendSignInLinkToEmail = async (email: string) => {
    setLoading(true);
    try {
      await firebaseSendSignInLinkToEmail(auth, email, actionCodeSettings);
      window.localStorage.setItem(EMAIL_FOR_SIGN_IN_LINK_KEY, email);
      toast({ title: t('success'), description: t('auth.emailLink.sent') });
    } catch (error: any) {
      console.error("Error sending sign-in link:", error);
      // Default error message key
      let toastDescriptionKey: keyof typeof import('@/lib/i18n/locales/en').default = (error.code as keyof typeof import('@/lib/i18n/locales/en').default) || 'auth.emailLink.error.sendFailed';
      
      if (error.code === 'auth/unauthorized-continue-uri') {
        // actionCodeSettings.url will resolve correctly in the browser context here
        const unauthorizedUrl = actionCodeSettings.url; 
        console.error(
          `Firebase Auth Error (auth/unauthorized-continue-uri): The domain of the continue URL ('${unauthorizedUrl}') is not whitelisted. ` +
          `Please go to your Firebase project console -> Authentication -> Settings -> Authorized domains, and add the domain (e.g., '${new URL(unauthorizedUrl).hostname}').`
        );
        // Use a more specific translation key if the generic one for the code doesn't exist or to provide a clearer hint
        if (!t(error.code as any)) {
             toastDescriptionKey = 'auth.emailLink.error.config';
        } else {
            // If a specific translation for auth/unauthorized-continue-uri exists, use it.
            // Otherwise, you might still want to point to a general config error.
            // For now, let's assume if t(error.code) exists, it's good enough.
            // If not, or if you want to override:
            // toastDescriptionKey = 'auth.emailLink.error.config';
        }
      }
      toast({ title: t('error'), description: t(toastDescriptionKey), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await firebaseSignOut(auth);
    } catch (error: any) {
      console.error("Error signing out:", error);
      toast({ title: t('error'), description: t(error.code as any) || t('auth.error.signOutFailed'), variant: "destructive" });
    }
  };

  if (loading && isProcessingLink) { 
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading: loading || isProcessingLink, 
      isProcessingLink,
      signInWithGoogle, 
      signUpWithEmailPassword,
      signInWithEmailPassword,
      sendSignInLinkToEmail,
      signOut 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

