
"use client";
import * as React from 'react';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import type { Task, TaskStatus, RepeatFrequency, TimeInfo, ArtifactLink } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Save, CalendarIcon, Link2, Tags, RotateCcw, Clock, HelpCircle } from 'lucide-react';
import { useI18n } from '@/lib/i18n/client';
import { cn } from '@/lib/utils';
import { format, parseISO, isValid } from 'date-fns';

const timeInfoSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("no_time") }),
  z.object({
    type: z.literal("datetime"),
    startDate: z.string().min(1, 'task.form.error.timeInfo.startDateRequired'),
    time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'task.form.error.timeInfo.invalidTime').min(1, 'task.form.error.timeInfo.timeRequired'),
  }),
  z.object({
    type: z.literal("all_day"),
    startDate: z.string().min(1, 'task.form.error.timeInfo.startDateRequired'),
  }),
  z.object({
    type: z.literal("date_range"),
    startDate: z.string().min(1, 'task.form.error.timeInfo.startDateRequired'),
    endDate: z.string().min(1, 'task.form.error.timeInfo.endDateRequired'),
  }),
]).refine(data => {
  if (data.type === 'date_range' && data.startDate && data.endDate) {
    return new Date(data.endDate) >= new Date(data.startDate);
  }
  return true;
}, {
  message: 'task.form.error.timeInfo.endDateAfterStartDate',
  path: ["endDate"],
});

const artifactLinkSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("none") }),
  z.object({
    type: z.literal("flashcard"),
    flashcardId: z.string().min(1, 'task.form.error.artifactLink.flashcardIdRequired'),
    linkTitle: z.string().optional().nullable(),
  }),
  z.object({
    type: z.literal("url"),
    urlValue: z.string().url('task.form.error.artifactLink.invalidUrl').min(1, 'task.form.error.artifactLink.urlRequired'),
    linkTitle: z.string().optional().nullable(),
  }),
]);

const taskSchema = z.object({
  title: z.string().min(1, 'toast.task.error.titleRequired'),
  description: z.string().optional().nullable(),
  status: z.enum(['pending', 'in_progress', 'completed']),
  repeat: z.enum(['none', 'daily', 'weekly', 'monthly', 'annually']).default('none'),
  timeInfo: timeInfoSchema.default({ type: 'no_time' }),
  artifactLink: artifactLinkSchema.default({ type: 'none' }),
});

export type TaskFormData = z.infer<typeof taskSchema>;

interface TaskFormProps {
  onSubmit: (data: TaskFormData) => Promise<void>;
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
  
  const watchedTimeInfoType = useWatch({ control: form.control, name: "timeInfo.type" });
  const watchedArtifactLinkType = useWatch({ control: form.control, name: "artifactLink.type" });

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

  const repeatOptions: { value: RepeatFrequency; labelKey: string }[] = [
    { value: 'none', labelKey: 'task.form.repeat.none' },
    { value: 'daily', labelKey: 'task.form.repeat.daily' },
    { value: 'weekly', labelKey: 'task.form.repeat.weekly' },
    { value: 'monthly', labelKey: 'task.form.repeat.monthly' },
    { value: 'annually', labelKey: 'task.form.repeat.annually' },
  ];
  
  const timeInfoTypeOptions: { value: TimeInfo['type']; labelKey: string }[] = [
    { value: 'no_time', labelKey: 'task.form.timeInfo.type.no_time'},
    { value: 'datetime', labelKey: 'task.form.timeInfo.type.datetime'},
    { value: 'all_day', labelKey: 'task.form.timeInfo.type.all_day'},
    { value: 'date_range', labelKey: 'task.form.timeInfo.type.date_range'},
  ];

  const artifactLinkTypeOptions: { value: ArtifactLink['type']; labelKey: string }[] = [
    { value: 'none', labelKey: 'task.form.artifactLink.type.none'},
    { value: 'flashcard', labelKey: 'task.form.artifactLink.type.flashcard'},
    { value: 'url', labelKey: 'task.form.artifactLink.type.url'},
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
                  <FormLabel className="text-lg flex items-center"><Tags className="mr-2 h-5 w-5 text-muted-foreground" />{t('task.form.label.status')}</FormLabel>
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
            <FormField
              control={form.control}
              name="repeat"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-lg flex items-center"><RotateCcw className="mr-2 h-5 w-5 text-muted-foreground" />{t('task.form.label.repeat')}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('task.form.label.repeat')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {repeatOptions.map(option => (
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

            {/* Time Information Section */}
            <div className="space-y-4 p-4 border rounded-md">
              <h3 className="text-md font-medium flex items-center"><Clock className="mr-2 h-5 w-5 text-muted-foreground" />{t('task.form.label.timeInfo')}</h3>
              <FormField
                control={form.control}
                name="timeInfo.type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('task.form.timeInfo.type')}</FormLabel>
                    <Select 
                        onValueChange={(value) => {
                            field.onChange(value);
                            // Reset related fields when type changes
                            form.setValue('timeInfo.startDate', null);
                            form.setValue('timeInfo.endDate', null);
                            form.setValue('timeInfo.time', null);
                        }} 
                        defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder={t('task.form.timeInfo.type')} /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {timeInfoTypeOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{t(opt.labelKey as any)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {(watchedTimeInfoType === 'datetime' || watchedTimeInfoType === 'all_day' || watchedTimeInfoType === 'date_range') && (
                <FormField
                  control={form.control}
                  name="timeInfo.startDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>{t('task.form.label.startDate')}</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                            >
                              {field.value ? format(parseISO(field.value), "PPP") : <span>{t('task.form.placeholder.startDate')}</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value ? parseISO(field.value) : undefined}
                            onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : null)}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage>{form.formState.errors.timeInfo?.startDate && t(form.formState.errors.timeInfo.startDate.message as any)}</FormMessage>
                    </FormItem>
                  )}
                />
              )}
              {watchedTimeInfoType === 'datetime' && (
                <FormField
                  control={form.control}
                  name="timeInfo.time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('task.form.label.time')}</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage>{form.formState.errors.timeInfo?.time && t(form.formState.errors.timeInfo.time.message as any)}</FormMessage>
                    </FormItem>
                  )}
                />
              )}
              {watchedTimeInfoType === 'date_range' && (
                <FormField
                  control={form.control}
                  name="timeInfo.endDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>{t('task.form.label.endDate')}</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                            >
                              {field.value ? format(parseISO(field.value), "PPP") : <span>{t('task.form.placeholder.endDate')}</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value ? parseISO(field.value) : undefined}
                            onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : null)}
                            disabled={(date) => {
                                const startDate = form.getValues("timeInfo.startDate");
                                return startDate ? date < parseISO(startDate) : false;
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage>{form.formState.errors.timeInfo?.endDate && t(form.formState.errors.timeInfo.endDate.message as any)}</FormMessage>
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* Artifact Link Section */}
            <div className="space-y-4 p-4 border rounded-md">
              <h3 className="text-md font-medium flex items-center"><Link2 className="mr-2 h-5 w-5 text-muted-foreground" />{t('task.form.label.artifactLink')}</h3>
              <FormField
                control={form.control}
                name="artifactLink.type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('task.form.artifactLink.type')}</FormLabel>
                    <Select 
                        onValueChange={(value) => {
                            field.onChange(value)
                            form.setValue('artifactLink.flashcardId', null);
                            form.setValue('artifactLink.urlValue', null);
                            form.setValue('artifactLink.linkTitle', null);
                        }} 
                        defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder={t('task.form.artifactLink.type')} /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {artifactLinkTypeOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{t(opt.labelKey as any)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {watchedArtifactLinkType === 'flashcard' && (
                <>
                  <FormField
                    control={form.control}
                    name="artifactLink.flashcardId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('task.form.label.flashcardId')}</FormLabel>
                        <FormControl><Input placeholder={t('task.form.placeholder.flashcardId')} {...field} value={field.value ?? ""} /></FormControl>
                        <FormMessage>{form.formState.errors.artifactLink?.flashcardId && t(form.formState.errors.artifactLink.flashcardId.message as any)}</FormMessage>
                      </FormItem>
                    )}
                  />
                   <FormField
                    control={form.control}
                    name="artifactLink.linkTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('task.form.label.linkTitle')}</FormLabel>
                        <FormControl><Input placeholder={t('task.form.placeholder.linkTitle')} {...field} value={field.value ?? ""} /></FormControl>
                        <FormMessage/>
                      </FormItem>
                    )}
                  />
                </>
              )}
              {watchedArtifactLinkType === 'url' && (
                <>
                  <FormField
                    control={form.control}
                    name="artifactLink.urlValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('task.form.label.urlValue')}</FormLabel>
                        <FormControl><Input type="url" placeholder={t('task.form.placeholder.urlValue')} {...field} value={field.value ?? ""} /></FormControl>
                        <FormMessage>{form.formState.errors.artifactLink?.urlValue && t(form.formState.errors.artifactLink.urlValue.message as any)}</FormMessage>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="artifactLink.linkTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('task.form.label.linkTitle')}</FormLabel>
                        <FormControl><Input placeholder={t('task.form.placeholder.linkTitle')} {...field} value={field.value ?? ""} /></FormControl>
                        <FormMessage/>
                      </FormItem>
                    )}
                  />
                </>
              )}
            </div>


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
