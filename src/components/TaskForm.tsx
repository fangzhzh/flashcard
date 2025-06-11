
"use client";
import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Task, TaskStatus, RepeatFrequency, TimeInfo, ArtifactLink } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Save } from 'lucide-react';
import { useI18n } from '@/lib/i18n/client';
// DatePicker and other complex inputs will be added in a subsequent step

const taskSchema = z.object({
  title: z.string().min(1, 'toast.task.error.titleRequired'),
  description: z.string().optional().nullable(),
  status: z.enum(['pending', 'in_progress', 'completed']),
  // For now, keep repeat, timeInfo, artifactLink simple or optional
  repeat: z.enum(['none', 'daily', 'weekly', 'monthly', 'annually']).default('none'),
  timeInfo: z.object({
    type: z.enum(['no_time', 'datetime', 'all_day', 'date_range']).default('no_time'),
    startDate: z.string().optional().nullable(),
    endDate: z.string().optional().nullable(),
    time: z.string().optional().nullable(),
  }).default({ type: 'no_time' }),
  artifactLink: z.object({
    type: z.enum(['none', 'flashcard', 'url']).default('none'),
    flashcardId: z.string().optional().nullable(),
    linkTitle: z.string().optional().nullable(),
    urlValue: z.string().optional().nullable(),
  }).default({ type: 'none' }),
});

type TaskFormData = z.infer<typeof taskSchema>;

interface TaskFormProps {
  onSubmit: (data: TaskFormData) => Promise<void>; // Submitting only validated form data
  initialData?: Partial<Task>;
  isLoading?: boolean;
  mode: 'create' | 'edit';
}

export default function TaskForm({
  onSubmit,
  initialData,
  isLoading = false,
  mode
}: TaskFormProps) {
  const t = useI18n();
  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: initialData?.title || '',
      description: initialData?.description || '',
      status: initialData?.status || 'pending',
      repeat: initialData?.repeat || 'none',
      timeInfo: initialData?.timeInfo || { type: 'no_time' },
      artifactLink: initialData?.artifactLink || { type: 'none' },
    },
  });
  
  React.useEffect(() => {
    if (initialData) {
      form.reset({
        title: initialData.title || '',
        description: initialData.description || '',
        status: initialData.status || 'pending',
        repeat: initialData.repeat || 'none',
        timeInfo: initialData.timeInfo || { type: 'no_time' },
        artifactLink: initialData.artifactLink || { type: 'none' },
      });
    }
  }, [initialData, form.reset, form]);


  const taskStatusOptions: { value: TaskStatus; labelKey: string }[] = [
    { value: 'pending', labelKey: 'task.item.status.pending' },
    { value: 'in_progress', labelKey: 'task.item.status.in_progress' },
    { value: 'completed', labelKey: 'task.item.status.completed' },
  ];

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle>{mode === 'edit' ? t('task.form.title.edit') : t('task.form.title.create')}</CardTitle>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-lg">{t('task.form.label.title')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('task.form.placeholder.title')} {...field} />
                  </FormControl>
                  <FormMessage>{form.formState.errors.title && t(form.formState.errors.title.message as any)}</FormMessage>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-lg">{t('task.form.label.description')}</FormLabel>
                  <FormControl>
                    <Textarea placeholder={t('task.form.placeholder.description')} {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-lg">{t('task.form.label.status')}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('task.form.label.status')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {taskStatusOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {t(option.labelKey as any)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Repeat, TimeInfo, ArtifactLink fields will be added in a future step */}
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isLoading} className="w-full text-lg py-3">
              <Save className="mr-2 h-5 w-5" />
              {isLoading ? t('task.form.button.saving') : (mode === 'edit' ? t('task.form.button.update') : t('task.form.button.create'))}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
