
"use client";
import { useFlashcards } from '@/contexts/FlashcardsContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Layers, CheckCircle2, BookOpen, AlertTriangle, Loader2, ShieldAlert } from 'lucide-react';
import { useI18n } from '@/lib/i18n/client';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


export default function ProgressDashboard() {
  const { user, loading: authLoading } = useAuth();
  const { getStatistics, isLoading: flashcardsLoading, isSeeding } = useFlashcards();
  const t = useI18n();
  
  const isLoading = authLoading || (flashcardsLoading && user) || (isSeeding && user);

  if (isLoading) {
    return (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, index) => (
          <Card key={index} className="shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 bg-muted rounded w-3/4 animate-pulse"></div>
              <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-1/2 animate-pulse"></div>
               <p className="text-xs text-muted-foreground animate-pulse">{t('progress.loading')}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!user && !authLoading) {
    return (
       <Alert variant="destructive" className="my-8">
          <ShieldAlert className="h-5 w-5" />
          <AlertTitle>{t('error')}</AlertTitle>
          <AlertDescription>{t('auth.pleaseSignIn')}</AlertDescription>
        </Alert>
    );
  }


  const stats = getStatistics();
  const statItems = [
    { titleKey: 'progress.total', value: stats.total, icon: Layers, color: 'text-blue-500' },
    { titleKey: 'progress.mastered', value: stats.mastered, icon: CheckCircle2, color: 'text-green-500' },
    { titleKey: 'progress.learning', value: stats.learning, icon: BookOpen, color: 'text-yellow-500' },
    { titleKey: 'progress.dueToday', value: stats.dueToday, icon: AlertTriangle, color: 'text-red-500' },
  ];

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {statItems.map((item) => (
        <Card key={item.titleKey} className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t(item.titleKey as any)}</CardTitle>
            <item.icon className={`h-5 w-5 ${item.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{item.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
