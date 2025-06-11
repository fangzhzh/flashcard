
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
import type { Task, TaskStatus, RepeatFrequency, TimeInfo, ArtifactLink, ReminderInfo, ReminderType } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Save, CalendarIcon, Link2, Tags, RotateCcw, Clock, Bell, Trash2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n/client';
import { cn } from '@/lib/utils';
import { format, parseISO, isValid, differenceInCalendarDays, isToday, isTomorrow } from 'date-fns';

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

const reminderInfoSchema = z.object({
  type: z.enum(['none', 'at_event_time', '5_minutes_before', '10_minutes_before', '15_minutes_before', '30_minutes_before', '1_hour_before', '1_day_before']).default('none'),
});

const taskSchema = z.object({
  title: z.string().min(1, 'toast.task.error.titleRequired'),
  description: z.string().optional().nullable(),
  status: z.enum(['pending', 'in_progress', 'completed']),
  repeat: z.enum(['none', 'daily', 'weekly', 'monthly', 'annually']).default('none'),
  timeInfo: timeInfoSchema.default({ type: 'no_time' }),
  artifactLink: artifactLinkSchema.default({ type: 'none' }),
  reminderInfo: reminderInfoSchema.default({ type: 'none' }),
});

export type TaskFormData = z.infer<typeof taskSchema>;

interface TaskFormProps {
  onSubmit: (data: TaskFormData) => Promise<void>;
  initialData?: Partial<Task>;
  isLoading?: boolean;
  mode: 'create' | 'edit';
  onCancel?: () => void;
}

export default function TaskForm({
  onSubmit,
  initialData,
  isLoading = false,
  mode,
  onCancel
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
      reminderInfo: initialData?.reminderInfo || { type: 'none' },
    },
  });

  const watchedTimeInfoType = useWatch({ control: form.control, name: "timeInfo.type" });
  const watchedArtifactLinkType = useWatch({ control: form.control, name: "artifactLink.type" });
  const [isTimeSectionOpen, setIsTimeSectionOpen] = React.useState(false);

  React.useEffect(() => {
    if (initialData) {
      form.reset({
        title: initialData.title || '',
        description: initialData.description || '',
        status: initialData.status || 'pending',
        repeat: initialData.repeat || 'none',
        timeInfo: initialData.timeInfo || { type: 'no_time' },
        artifactLink: initialData.artifactLink || { type: 'none' },
        reminderInfo: initialData.reminderInfo || { type: 'none' },
      });
      // Open time section if initial data has specific time info
      if (initialData.timeInfo && initialData.timeInfo.type !== 'no_time') {
        setIsTimeSectionOpen(true);
      } else {
        setIsTimeSectionOpen(false);
      }
    }
  }, [initialData, form.reset]);

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

  const reminderOptions: { value: ReminderType; labelKey: string }[] = [
    { value: 'none', labelKey: 'task.form.reminder.type.none' },
    { value: 'at_event_time', labelKey: 'task.form.reminder.type.at_event_time' },
    { value: '5_minutes_before', labelKey: 'task.form.reminder.type.5_minutes_before' },
    { value: '10_minutes_before', labelKey: 'task.form.reminder.type.10_minutes_before' },
    { value: '15_minutes_before', labelKey: 'task.form.reminder.type.15_minutes_before' },
    { value: '30_minutes_before', labelKey: 'task.form.reminder.type.30_minutes_before' },
    { value: '1_hour_before', labelKey: 'task.form.reminder.type.1_hour_before' },
    { value: '1_day_before', labelKey: 'task.form.reminder.type.1_day_before' },
  ];

  const artifactLinkTypeOptions: { value: ArtifactLink['type']; labelKey: string }[] = [
    { value: 'none', labelKey: 'task.form.artifactLink.type.none'},
    { value: 'flashcard', labelKey: 'task.form.artifactLink.type.flashcard'},
    { value: 'url', labelKey: 'task.form.artifactLink.type.url'},
  ];

  const handleSetTimeInfo = (startDate: string | null, startTime: string | null, endDate: string | null) => {
    if (!startDate) {
      form.setValue('timeInfo', { type: 'no_time' });
    } else if (startDate && !startTime && !endDate) {
      form.setValue('timeInfo', { type: 'all_day', startDate });
    } else if (startDate && startTime && !endDate) {
      form.setValue('timeInfo', { type: 'datetime', startDate, time: startTime });
    } else if (startDate && endDate) { // startTime can be null for date_range
      form.setValue('timeInfo', { type: 'date_range', startDate, endDate });
    }
    setIsTimeSectionOpen(false); // Close after setting
  };

  const removeTimeInfo = () => {
    form.setValue('timeInfo', { type: 'no_time' });
    form.setValue('timeInfo.startDate', null);
    form.setValue('timeInfo.endDate', null);
    form.setValue('timeInfo.time', null);
    setIsTimeSectionOpen(false);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-1">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-lg sr-only">{t('task.form.label.title')}</FormLabel>
              <FormControl>
                <Input placeholder={t('task.form.placeholder.title')} {...field} className="text-xl font-semibold border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 px-0" />
              </FormControl>
              <FormMessage>{form.formState.errors.title && t(form.formState.errors.title.message as any)}</FormMessage>
            </FormItem>
          )}
        />

        {/* Time Section */}
        <FormItem>
          <FormLabel className="text-base flex items-center">
            <Clock className="mr-2 h-5 w-5 text-muted-foreground" />
            {t('task.form.label.timeInfo')}
          </FormLabel>
          {!isTimeSectionOpen && (
            <Button variant="outline" onClick={() => setIsTimeSectionOpen(true)} className="w-full justify-start font-normal">
              {form.getValues("timeInfo.type") === 'no_time' ? t('task.form.timeInfo.selectTimeButton') :
               form.getValues("timeInfo.type") === 'all_day' ? `${t('task.form.timeInfo.type.all_day')} - ${format(parseISO(form.getValues("timeInfo.startDate")!), 'PPP')}` :
               form.getValues("timeInfo.type") === 'datetime' ? `${format(parseISO(form.getValues("timeInfo.startDate")!), 'PPP')} ${t('task.display.on')} ${form.getValues("timeInfo.time")}` :
               form.getValues("timeInfo.type") === 'date_range' ? `${format(parseISO(form.getValues("timeInfo.startDate")!), 'PP')} - ${format(parseISO(form.getValues("timeInfo.endDate")!), 'PP')}` :
               t('task.form.timeInfo.selectTimeButton')
              }
            </Button>
          )}
          {isTimeSectionOpen && (
            <Card className="p-4 space-y-3">
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
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={removeTimeInfo} size="sm">
                  <Trash2 className="mr-1 h-3 w-3"/> {t('task.form.timeInfo.removeTimeButton')}
                </Button>
                <Button type="button" onClick={() => {
                    const { startDate, time, endDate } = form.getValues("timeInfo");
                    if (startDate && !time && !endDate) handleSetTimeInfo(startDate, null, null); // All day
                    else if (startDate && time && !endDate) handleSetTimeInfo(startDate, time, null); // Datetime
                    else if (startDate && endDate) handleSetTimeInfo(startDate, time, endDate); // Date range (time might be used or ignored depending on strictness)
                    else if (startDate) handleSetTimeInfo(startDate, null, null); // Fallback to all day if only start date
                    else handleSetTimeInfo(null, null, null); // No time
                  }}
                  size="sm"
                >
                  {t('task.form.timeInfo.setTimeButton')}
                </Button>
              </div>
            </Card>
          )}
          <FormMessage>{form.formState.errors.timeInfo?.root?.message && t(form.formState.errors.timeInfo.root.message as any)}</FormMessage>
        </FormItem>

        <FormField
          control={form.control}
          name="repeat"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base flex items-center"><RotateCcw className="mr-2 h-5 w-5 text-muted-foreground" />{t('task.form.label.repeat')}</FormLabel>
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

        <FormField
          control={form.control}
          name="reminderInfo.type"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base flex items-center"><Bell className="mr-2 h-5 w-5 text-muted-foreground" />{t('task.form.label.reminder')}</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t('task.form.label.reminder')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {reminderOptions.map(option => (
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
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base">{t('task.form.label.description')}</FormLabel>
              <FormControl>
                <Textarea placeholder={t('task.form.placeholder.description')} {...field} value={field.value ?? ''} className="min-h-[100px]" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Artifact Link Section - Kept compact */}
        <details className="group">
            <summary className="text-base flex items-center cursor-pointer text-muted-foreground hover:text-foreground py-2">
                <Link2 className="mr-2 h-5 w-5" />
                {t('task.form.label.artifactLink')}
                <span className="ml-1 text-xs transform transition-transform duration-200 group-open:rotate-90">{'>'}</span>
            </summary>
            <div className="space-y-4 p-3 border rounded-md mt-1">
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
        </details>

        <div className="flex justify-end gap-2 pt-4">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              {t('deck.item.delete.confirm.cancel')}
            </Button>
          )}
          <Button type="submit" disabled={isLoading} className="min-w-[120px]">
            <Save className="mr-2 h-5 w-5" />
            {isLoading ? t('task.form.button.saving') : (mode === 'edit' ? t('task.form.button.update') : t('task.form.button.create'))}
          </Button>
        </div>
      </form>
    </Form>
  );
}
