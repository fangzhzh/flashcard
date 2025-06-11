
"use client";
import * as React from 'react';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'; // Removed FormDescription
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import type { Task, TaskStatus, RepeatFrequency, TimeInfo, ArtifactLink, ReminderInfo, ReminderType } from '@/types';
import { Save, CalendarIcon, Link2, RotateCcw, Clock, Bell, Trash2, X } from 'lucide-react'; // Added X for cancel button
import { useI18n } from '@/lib/i18n/client';
import { cn } from '@/lib/utils';
import { format, parseISO, isValid } from 'date-fns';

// Adjusted Zod schema for timeInfo and artifactLink to better match the simplified form logic
const timeInfoSchema = z.object({
  type: z.enum(['no_time', 'datetime', 'all_day', 'date_range']).default('no_time'),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'task.form.error.timeInfo.invalidTime').nullable().optional(),
}).refine(data => {
  if (data.type === 'date_range' && data.startDate && data.endDate) {
    return new Date(data.endDate) >= new Date(data.startDate);
  }
  if (data.type === 'datetime' && !data.startDate) return false; // Start date required for datetime
  if (data.type === 'all_day' && !data.startDate) return false; // Start date required for all_day
  if (data.type === 'date_range' && (!data.startDate || !data.endDate)) return false; // Both required for date_range
  return true;
}, (data) => {
    if (data.type === 'date_range' && data.startDate && data.endDate && new Date(data.endDate) < new Date(data.startDate)) {
        return { message: 'task.form.error.timeInfo.endDateAfterStartDate', path: ["endDate"] };
    }
    if ((data.type === 'datetime' || data.type === 'all_day') && !data.startDate) {
        return { message: 'task.form.error.timeInfo.startDateRequired', path: ["startDate"] };
    }
    if (data.type === 'date_range' && (!data.startDate || !data.endDate)) {
        return { message: 'task.form.error.timeInfo.dateRangeFieldsRequired', path: ["startDate"] }; // Or a more general path
    }
    return { message: 'Invalid time configuration' }; // Fallback, should be caught by specific checks
});


const artifactLinkSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("none") }),
  z.object({
    type: z.literal("flashcard"),
    flashcardId: z.string().min(1, 'task.form.error.artifactLink.flashcardIdRequired').nullable().optional(),
    linkTitle: z.string().nullable().optional(),
  }),
  z.object({
    type: z.literal("url"),
    urlValue: z.string().url('task.form.error.artifactLink.invalidUrl').min(1, 'task.form.error.artifactLink.urlRequired').nullable().optional(),
    linkTitle: z.string().nullable().optional(),
  }),
]).default({ type: 'none' });


const reminderInfoSchema = z.object({
  type: z.enum(['none', 'at_event_time', '5_minutes_before', '10_minutes_before', '15_minutes_before', '30_minutes_before', '1_hour_before', '1_day_before']).default('none'),
});

const taskSchema = z.object({
  title: z.string().min(1, 'toast.task.error.titleRequired'),
  description: z.string().optional().nullable(),
  status: z.enum(['pending', 'in_progress', 'completed']).default('pending'),
  repeat: z.enum(['none', 'daily', 'weekly', 'monthly', 'annually']).default('none'),
  timeInfo: timeInfoSchema,
  artifactLink: artifactLinkSchema,
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
      timeInfo: initialData?.timeInfo || { type: 'no_time', startDate: null, endDate: null, time: null },
      artifactLink: initialData?.artifactLink || { type: 'none' },
      reminderInfo: initialData?.reminderInfo || { type: 'none' },
    },
  });

  const watchedArtifactLinkType = useWatch({ control: form.control, name: "artifactLink.type" });
  const [isTimeSectionOpen, setIsTimeSectionOpen] = React.useState(false);
  
  const [tempStartDate, setTempStartDate] = React.useState<Date | undefined>(
    initialData?.timeInfo?.startDate ? parseISO(initialData.timeInfo.startDate) : undefined
  );
  const [tempTime, setTempTime] = React.useState<string>(initialData?.timeInfo?.time || '');
  const [tempEndDate, setTempEndDate] = React.useState<Date | undefined>(
    initialData?.timeInfo?.endDate ? parseISO(initialData.timeInfo.endDate) : undefined
  );


  React.useEffect(() => {
    if (initialData) {
      const defaultTimeInfo = initialData.timeInfo || { type: 'no_time', startDate: null, endDate: null, time: null };
      form.reset({
        title: initialData.title || '',
        description: initialData.description || '',
        status: initialData.status || 'pending',
        repeat: initialData.repeat || 'none',
        timeInfo: defaultTimeInfo,
        artifactLink: initialData.artifactLink || { type: 'none' },
        reminderInfo: initialData.reminderInfo || { type: 'none' },
      });
      setTempStartDate(defaultTimeInfo.startDate ? parseISO(defaultTimeInfo.startDate) : undefined);
      setTempTime(defaultTimeInfo.time || '');
      setTempEndDate(defaultTimeInfo.endDate ? parseISO(defaultTimeInfo.endDate) : undefined);
      
      if (defaultTimeInfo.type !== 'no_time') {
        setIsTimeSectionOpen(true);
      } else {
        setIsTimeSectionOpen(false);
      }
    } else {
        // For create mode, ensure temp states are also reset
        setTempStartDate(undefined);
        setTempTime('');
        setTempEndDate(undefined);
        setIsTimeSectionOpen(false);
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

  const handleSetTimeInfo = () => {
    const startDateStr = tempStartDate ? format(tempStartDate, "yyyy-MM-dd") : null;
    const endDateStr = tempEndDate ? format(tempEndDate, "yyyy-MM-dd") : null;
    const timeStr = tempTime || null;

    if (startDateStr && timeStr && !endDateStr) { // Datetime
      form.setValue('timeInfo', { type: 'datetime', startDate: startDateStr, time: timeStr, endDate: null });
    } else if (startDateStr && !timeStr && !endDateStr) { // All day
      form.setValue('timeInfo', { type: 'all_day', startDate: startDateStr, time: null, endDate: null });
    } else if (startDateStr && endDateStr) { // Date range
       form.setValue('timeInfo', { type: 'date_range', startDate: startDateStr, endDate: endDateStr, time: timeStr }); // Store time if provided, could be used for start time of range
    } else {
      form.setValue('timeInfo', { type: 'no_time', startDate: null, endDate: null, time: null });
    }
    setIsTimeSectionOpen(false);
  };
  
  const removeTimeInfo = () => {
    setTempStartDate(undefined);
    setTempTime('');
    setTempEndDate(undefined);
    form.setValue('timeInfo', { type: 'no_time', startDate: null, endDate: null, time: null });
    setIsTimeSectionOpen(false);
  };

  const getTimeDisplayValue = () => {
    const currentTi = form.getValues("timeInfo");
    if (!currentTi || currentTi.type === 'no_time' || !currentTi.startDate || !isValid(parseISO(currentTi.startDate))) {
        return t('task.form.timeInfo.selectTimeButton');
    }
    const startDate = parseISO(currentTi.startDate);
    if (currentTi.type === 'all_day') return `${t('task.form.timeInfo.type.all_day')} - ${format(startDate, 'PPP')}`;
    if (currentTi.type === 'datetime' && currentTi.time) return `${format(startDate, 'PPP')} ${t('task.display.at')} ${currentTi.time}`;
    if (currentTi.type === 'datetime') return `${format(startDate, 'PPP')} (${t('task.form.timeInfo.missingTime')})`;
    if (currentTi.type === 'date_range' && currentTi.endDate && isValid(parseISO(currentTi.endDate))) {
        const endDate = parseISO(currentTi.endDate);
        return `${format(startDate, 'PP')} - ${format(endDate, 'PP')}`;
    }
    return t('task.form.timeInfo.selectTimeButton');
  };


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 p-1 h-full flex flex-col">
        <div className="flex-grow space-y-4 overflow-y-auto pr-2">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-lg sr-only">{t('task.form.label.title')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('task.form.placeholder.title')} {...field} className="text-xl font-semibold border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 px-0 h-auto py-1" />
                  </FormControl>
                  <FormMessage>{form.formState.errors.title && t(form.formState.errors.title.message as any)}</FormMessage>
                </FormItem>
              )}
            />

            <FormItem>
              <FormLabel className="text-base flex items-center text-muted-foreground">
                <Clock className="mr-2 h-4 w-4" />
                {t('task.form.label.timeInfo')}
              </FormLabel>
              {!isTimeSectionOpen && (
                <Button variant="outline" onClick={() => setIsTimeSectionOpen(true)} className="w-full justify-start font-normal text-sm h-9">
                  {getTimeDisplayValue()}
                </Button>
              )}
              {isTimeSectionOpen && (
                <div className="p-3 border rounded-md space-y-3 text-sm">
                  <FormItem>
                    <FormLabel>{t('task.form.label.startDate')}</FormLabel>
                     <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn("w-full justify-start text-left font-normal h-9", !tempStartDate && "text-muted-foreground")}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {tempStartDate ? format(tempStartDate, "PPP") : <span>{t('task.form.placeholder.startDate')}</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={tempStartDate} onSelect={setTempStartDate} initialFocus />
                      </PopoverContent>
                    </Popover>
                  </FormItem>
                  <FormItem>
                    <FormLabel>{t('task.form.label.time')}</FormLabel>
                    <Input type="time" value={tempTime} onChange={(e) => setTempTime(e.target.value)} className="h-9 text-sm" />
                  </FormItem>
                  <FormItem>
                    <FormLabel>{t('task.form.label.endDate')}</FormLabel>
                     <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn("w-full justify-start text-left font-normal h-9", !tempEndDate && "text-muted-foreground")}
                        >
                           <CalendarIcon className="mr-2 h-4 w-4" />
                          {tempEndDate ? format(tempEndDate, "PPP") : <span>{t('task.form.placeholder.endDate')}</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                            mode="single"
                            selected={tempEndDate}
                            onSelect={setTempEndDate}
                            disabled={(date) => tempStartDate ? date < tempStartDate : false}
                            initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </FormItem>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="ghost" onClick={removeTimeInfo} size="sm">
                      <Trash2 className="mr-1 h-3 w-3"/> {t('task.form.timeInfo.removeTimeButton')}
                    </Button>
                    <Button type="button" onClick={handleSetTimeInfo} size="sm">
                      {t('task.form.timeInfo.setTimeButton')}
                    </Button>
                  </div>
                </div>
              )}
              <FormMessage>{form.formState.errors.timeInfo?.root?.message && t(form.formState.errors.timeInfo.root.message as any)}</FormMessage>
              <FormMessage>{form.formState.errors.timeInfo?.startDate?.message && t(form.formState.errors.timeInfo.startDate.message as any)}</FormMessage>
              <FormMessage>{form.formState.errors.timeInfo?.endDate?.message && t(form.formState.errors.timeInfo.endDate.message as any)}</FormMessage>
              <FormMessage>{form.formState.errors.timeInfo?.time?.message && t(form.formState.errors.timeInfo.time.message as any)}</FormMessage>
            </FormItem>

            <FormField
              control={form.control}
              name="repeat"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base flex items-center text-muted-foreground"><RotateCcw className="mr-2 h-4 w-4" />{t('task.form.label.repeat')}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value || 'none'}>
                    <FormControl>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder={t('task.form.label.repeat')} /></SelectTrigger>
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
                  <FormLabel className="text-base flex items-center text-muted-foreground"><Bell className="mr-2 h-4 w-4" />{t('task.form.label.reminder')}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value || 'none'}>
                    <FormControl>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder={t('task.form.label.reminder')} /></SelectTrigger>
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
                  <FormLabel className="text-base text-muted-foreground">{t('task.form.label.description')}</FormLabel>
                  <FormControl>
                    <Textarea placeholder={t('task.form.placeholder.description')} {...field} value={field.value ?? ''} className="min-h-[80px] text-sm" />
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
                  <FormLabel className="text-base flex items-center text-muted-foreground">{t('task.form.label.status')}</FormLabel>
                   <Select onValueChange={field.onChange} defaultValue={field.value || 'pending'}>
                    <FormControl>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder={t('task.form.label.status')} /></SelectTrigger>
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


            <details className="group">
                <summary className="text-base flex items-center cursor-pointer text-muted-foreground hover:text-foreground py-2 text-sm">
                    <Link2 className="mr-2 h-4 w-4" />
                    {t('task.form.label.artifactLink')}
                    <span className="ml-1 text-xs transform transition-transform duration-200 group-open:rotate-90">{'>'}</span>
                </summary>
                <div className="space-y-3 p-3 border rounded-md mt-1 text-sm">
                  <FormField
                    control={form.control}
                    name="artifactLink.type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('task.form.artifactLink.type')}</FormLabel>
                        <Select
                            onValueChange={(value) => {
                                field.onChange(value as ArtifactLink['type']);
                                form.setValue('artifactLink.flashcardId', null);
                                form.setValue('artifactLink.urlValue', null);
                                form.setValue('artifactLink.linkTitle', null);
                            }}
                            defaultValue={field.value || 'none'}
                        >
                          <FormControl>
                            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder={t('task.form.artifactLink.type')} /></SelectTrigger>
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
                            <FormControl><Input placeholder={t('task.form.placeholder.flashcardId')} {...field} value={field.value ?? ""} className="h-9 text-sm" /></FormControl>
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
                            <FormControl><Input placeholder={t('task.form.placeholder.linkTitle')} {...field} value={field.value ?? ""} className="h-9 text-sm" /></FormControl>
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
                            <FormControl><Input type="url" placeholder={t('task.form.placeholder.urlValue')} {...field} value={field.value ?? ""} className="h-9 text-sm" /></FormControl>
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
                            <FormControl><Input placeholder={t('task.form.placeholder.linkTitle')} {...field} value={field.value ?? ""} className="h-9 text-sm" /></FormControl>
                            <FormMessage/>
                          </FormItem>
                        )}
                      />
                    </>
                  )}
                </div>
            </details>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t mt-auto">
          {onCancel && (
            <Button type="button" variant="ghost" onClick={onCancel} disabled={isLoading} size="sm">
               <X className="mr-2 h-4 w-4" /> {t('deck.item.delete.confirm.cancel')}
            </Button>
          )}
          <Button type="submit" disabled={isLoading} className="min-w-[100px]" size="sm">
            <Save className="mr-2 h-4 w-4" />
            {isLoading ? t('task.form.button.saving') : (mode === 'edit' ? t('task.form.button.update') : t('task.form.button.create'))}
          </Button>
        </div>
      </form>
    </Form>
  );
}
