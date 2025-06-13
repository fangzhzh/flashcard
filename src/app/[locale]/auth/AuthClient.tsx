
"use client";
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n, useCurrentLocale } from '@/lib/i18n/client';
import { useRouter } from 'next/navigation';
import { Loader2, Mail, LogIn, UserPlus, KeyRound, ExternalLink } from 'lucide-react'; // Added UserPlus

const emailPasswordSchema = z.object({
  email: z.string().email('auth.validation.emailInvalid'),
  password: z.string().min(6, 'auth.validation.passwordTooShort'),
});
type EmailPasswordFormData = z.infer<typeof emailPasswordSchema>;

const emailLinkSchema = z.object({
  email: z.string().email('auth.validation.emailInvalid'),
});
type EmailLinkFormData = z.infer<typeof emailLinkSchema>;

export default function AuthClient() {
  const t = useI18n();
  const currentLocale = useCurrentLocale();
  const router = useRouter();
  const { 
    user, 
    loading: authLoading, 
    isProcessingLink,
    signInWithGoogle, 
    signUpWithEmailPassword, 
    signInWithEmailPassword,
    sendSignInLinkToEmail 
  } = useAuth();

  const [isSignUp, setIsSignUp] = useState(false);
  const [emailLinkSent, setEmailLinkSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const emailPasswordForm = useForm<EmailPasswordFormData>({
    resolver: zodResolver(emailPasswordSchema),
    defaultValues: { email: '', password: '' },
  });

  const emailLinkForm = useForm<EmailLinkFormData>({
    resolver: zodResolver(emailLinkSchema),
    defaultValues: { email: '' },
  });

  useEffect(() => {
    if (user && !authLoading && !isProcessingLink) {
        router.replace(`/${currentLocale}/tasks`); // Redirect to tasks if already logged in
    }
  }, [user, authLoading, isProcessingLink, router, currentLocale]);

  const handleEmailPasswordSubmit = async (data: EmailPasswordFormData) => {
    setIsSubmitting(true);
    let success = false;
    if (isSignUp) {
      const result = await signUpWithEmailPassword(data.email, data.password);
      if (result) success = true;
    } else {
      const result = await signInWithEmailPassword(data.email, data.password);
      if (result) success = true;
    }
    if (success) {
      router.replace(`/${currentLocale}/tasks`); // Redirect to tasks on successful login/signup
    }
    setIsSubmitting(false);
  };

  const handleEmailLinkSubmit = async (data: EmailLinkFormData) => {
    setIsSubmitting(true);
    // Note: sendSignInLinkToEmail will handle redirection in AuthContext after link is clicked
    await sendSignInLinkToEmail(data.email); 
    setEmailLinkSent(true);
    setIsSubmitting(false);
  };

  if (authLoading || isProcessingLink) {
    return (
      <div className="flex flex-col items-center justify-center mt-12">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">{isProcessingLink ? t('auth.emailLink.processing') : t('auth.loading')}</p>
      </div>
    );
  }
  
  if (user) { 
     return (
      <div className="flex flex-col items-center justify-center mt-12">
        <p>{t('auth.alreadyLoggedInRedirecting')}</p>
        <Loader2 className="h-8 w-8 animate-spin text-primary mt-4" />
      </div>
    );
  }

  return (
    <Tabs defaultValue="email-password" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="email-password">{t('auth.tab.emailPassword')}</TabsTrigger>
        <TabsTrigger value="email-link">{t('auth.tab.emailLink')}</TabsTrigger>
      </TabsList>

      <TabsContent value="email-password">
        <Card>
          <CardHeader>
            <CardTitle>{isSignUp ? t('auth.emailPassword.title.signUp') : t('auth.emailPassword.title.signIn')}</CardTitle>
            <CardDescription>
              {isSignUp ? t('auth.emailPassword.description.signUp') : t('auth.emailPassword.description.signIn')}
            </CardDescription>
          </CardHeader>
          <Form {...emailPasswordForm}>
            <form onSubmit={emailPasswordForm.handleSubmit(handleEmailPasswordSubmit)}>
              <CardContent className="space-y-4">
                <FormField
                  control={emailPasswordForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('auth.form.emailLabel')}</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder={t('auth.form.emailPlaceholder')} {...field} disabled={isSubmitting} />
                      </FormControl>
                      <FormMessage>{emailPasswordForm.formState.errors.email && t(emailPasswordForm.formState.errors.email.message as any)}</FormMessage>
                    </FormItem>
                  )}
                />
                <FormField
                  control={emailPasswordForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('auth.form.passwordLabel')}</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder={t('auth.form.passwordPlaceholder')} {...field} disabled={isSubmitting} />
                      </FormControl>
                      <FormMessage>{emailPasswordForm.formState.errors.password && t(emailPasswordForm.formState.errors.password.message as any)}</FormMessage>
                    </FormItem>
                  )}
                />
              </CardContent>
              <CardFooter className="flex flex-col gap-4">
                <Button type="submit" className="w-full" disabled={isSubmitting || authLoading}>
                  {(isSubmitting || authLoading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isSignUp ? t('auth.emailPassword.button.signUp') : t('auth.emailPassword.button.signIn')}
                </Button>
                <Button variant="link" type="button" onClick={() => setIsSignUp(!isSignUp)} disabled={isSubmitting || authLoading}>
                  {isSignUp ? t('auth.emailPassword.toggle.alreadyHaveAccount') : t('auth.emailPassword.toggle.dontHaveAccount')}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>
      </TabsContent>

      <TabsContent value="email-link">
        <Card>
          <CardHeader>
            <CardTitle>{t('auth.emailLink.title')}</CardTitle>
            <CardDescription>{t('auth.emailLink.description')}</CardDescription>
          </CardHeader>
          {emailLinkSent ? (
            <CardContent>
              <div className="p-4 bg-green-50 border border-green-200 rounded-md text-green-700">
                <Mail className="inline-block mr-2 h-5 w-5" />
                {t('auth.emailLink.checkYourEmail')}
              </div>
               <Button variant="link" onClick={() => setEmailLinkSent(false)} className="mt-4">
                 {t('auth.emailLink.sendAnotherLink')}
               </Button>
            </CardContent>
          ) : (
            <Form {...emailLinkForm}>
              <form onSubmit={emailLinkForm.handleSubmit(handleEmailLinkSubmit)}>
                <CardContent className="space-y-4">
                  <FormField
                    control={emailLinkForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('auth.form.emailLabel')}</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder={t('auth.form.emailPlaceholder')} {...field} disabled={isSubmitting} />
                        </FormControl>
                        <FormMessage>{emailLinkForm.formState.errors.email && t(emailLinkForm.formState.errors.email.message as any)}</FormMessage>
                      </FormItem>
                    )}
                  />
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full" disabled={isSubmitting || authLoading}>
                    {(isSubmitting || authLoading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t('auth.emailLink.button.sendLink')}
                  </Button>
                </CardFooter>
              </form>
            </Form>
          )}
        </Card>
      </TabsContent>
      
      <div className="mt-6 flex items-center justify-center">
        <div className="flex-grow border-t border-muted"></div>
        <span className="mx-4 text-xs text-muted-foreground uppercase">{t('auth.orContinueWith')}</span>
        <div className="flex-grow border-t border-muted"></div>
      </div>

      <Button variant="outline" className="w-full mt-6" onClick={signInWithGoogle} disabled={isSubmitting || authLoading}>
        {(isSubmitting || authLoading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
          <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
        </svg>
        {t('auth.signInWithGoogle')}
      </Button>
    </Tabs>
  );
}
