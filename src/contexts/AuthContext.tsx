
"use client";
import type { AppUser } from '@/types';
import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { auth, actionCodeSettings } from '@/lib/firebase'; // Added actionCodeSettings
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
} from 'firebase/auth';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/lib/i18n/client';
import { useRouter, usePathname } from 'next/navigation';

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
          // User opened the link on a different device. To prevent session fixation
          // attacks, ask the user to provide the email again. For simplicity,
          // we'll use a prompt. In a real app, you'd use a dedicated UI.
          email = window.prompt(t('auth.emailLink.promptEmail'));
        }
        if (email) {
          try {
            const result = await firebaseSignInWithEmailLink(auth, email, window.location.href);
            setUser(mapFirebaseUserToAppUser(result.user));
            window.localStorage.removeItem(EMAIL_FOR_SIGN_IN_LINK_KEY);
            toast({ title: t('success'), description: t('auth.emailLink.success') });
            // Redirect to home or dashboard after successful sign-in
            const locale = pathname.split('/')[1] || 'en';
            router.push(`/${locale}/`);
          } catch (error: any) {
            console.error("Error signing in with email link:", error);
            toast({ title: t('error'), description: t(error.code as any) || t('auth.emailLink.error.generic'), variant: 'destructive' });
          }
        } else {
           toast({ title: t('error'), description: t('auth.emailLink.error.noEmail'), variant: 'destructive' });
        }
        // Clean up the URL
        if (window.history && window.history.replaceState) {
            window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
      setIsProcessingLink(false);
    };
    completeLinkSignIn();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, toast, router, pathname]); // pathname to re-evaluate on route change for potential link in URL

  const signInWithGoogle = async () => {
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      // onAuthStateChanged will handle setting the user state
      // User will be redirected or state will update, causing re-render
    } catch (error: any) {
      console.error("Error signing in with Google:", error);
      toast({ title: t('error'), description: t(error.code as any) || t('auth.error.googleSignInFailed'), variant: "destructive" });
    } finally {
        // setLoading(false) // onAuthStateChanged will handle this
    }
  };

  const signUpWithEmailPassword = async (email: string, pass: string): Promise<AppUser | null> => {
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      // onAuthStateChanged will set the user
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
      // onAuthStateChanged will set the user
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
      toast({ title: t('error'), description: t(error.code as any) || t('auth.emailLink.error.sendFailed'), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await firebaseSignOut(auth);
      // onAuthStateChanged will handle setting the user state to null
      // User will be redirected or state will update causing re-render.
    } catch (error: any) {
      console.error("Error signing out:", error);
      toast({ title: t('error'), description: t(error.code as any) || t('auth.error.signOutFailed'), variant: "destructive" });
    } finally {
      // setLoading(false); // onAuthStateChanged will handle this
    }
  };

  if (loading && isProcessingLink) { // Show loader if initial auth check or link processing is happening
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading: loading || isProcessingLink, // Combine loading states for consumers
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
