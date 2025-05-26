"use client";
import { useFlashcards } from '@/contexts/FlashcardsContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Layers, CheckCircle2, BookOpen, AlertTriangle } from 'lucide-react';

export default function ProgressDashboard() {
  const { getStatistics } = useFlashcards();
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
            {/* You can add a small description or percentage change here if needed */}
            {/* <p className="text-xs text-muted-foreground">+20.1% from last month</p> */}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
