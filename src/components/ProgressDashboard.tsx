"use client";
import { useFlashcards } from '@/contexts/FlashcardsContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Layers, CheckCircle2, BookOpen, AlertTriangle, Loader2 } from 'lucide-react';

export default function ProgressDashboard() {
  const { getStatistics, isLoading } = useFlashcards();
  
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
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const stats = getStatistics();
  const statItems = [
    { title: 'Total Cards', value: stats.total, icon: Layers, color: 'text-blue-500' },
    { title: 'Mastered', value: stats.mastered, icon: CheckCircle2, color: 'text-green-500' },
    { title: 'Learning', value: stats.learning, icon: BookOpen, color: 'text-yellow-500' },
    { title: 'Due Today', value: stats.dueToday, icon: AlertTriangle, color: 'text-red-500' },
  ];

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {statItems.map((item) => (
        <Card key={item.title} className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
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
