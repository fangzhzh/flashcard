
"use client";
import * as React from 'react';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import type { Task, RepeatFrequency, TimeInfo, ArtifactLink, ReminderInfo, Flashcard as FlashcardType, Deck, TaskType, CheckinInfo } from '@/types';
import { Save, CalendarIcon, Link2, RotateCcw, Clock, Bell, Trash2, X, Loader2, FilePlus, ListChecks, Search, Edit3, Repeat, Briefcase, User, Coffee, Eye, FileEdit, ArrowLeft, FilePenLine, CheckSquare, Square } from 'lucide-react'; // Added CheckSquare, Square
import { useI18n, useCurrentLocale } from '@/lib/i18n/client';
import { cn } from '@/lib/utils';
import { format, parseISO, isValid, isToday, isTomorrow } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import { zhCN } from 'date-fns/locale/zh-CN';
import { useFlashcards } from '@/contexts/FlashcardsContext';
import FlashcardForm from '@/components/FlashcardForm';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import TaskDateTimeReminderDialog from '@/components/TaskDateTimeReminderDialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label'; // Added Label import

const artifactLinkSchema = z.object({
  flashcardId: z.string().nullable().optional(),
});

const timeInfoSchema = z.object({
  type: z.enum(['no_time', 'datetime', 'all_day', 'date_range']).default('no_time'),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'task.form.error.timeInfo.invalidTime').nullable().optional(),
}).refine(data => {
  if (data.type === 'datetime' && !data.startDate) return false;
  if (data.type === 'all_day' && !data.startDate) return false;
  if (data.type === 'date_range' && (!data.startDate || !data.endDate)) return false;
  if (data.type === 'date_range' && data.startDate && data.endDate) {
    return new Date(data.endDate) >= new Date(data.startDate);
  }
  return true;
}, (data) => {
    if (data.type === 'date_range' && data.startDate && data.endDate && new Date(data.endDate) < new Date(data.startDate)) {
        return { message: 'task.form.error.timeInfo.endDateAfterStartDate', path: ["endDate"] };
    }
    if ((data.type === 'datetime' || data.type === 'all_day') && !data.startDate) {
        return { message: 'task.form.error.timeInfo.startDateRequired', path: ["startDate"] };
    }
    if (data.type === 'date_range' && (!data.startDate || !data.endDate)) {
        return { message: 'task.form.error.timeInfo.dateRangeFieldsRequired', path: ["startDate"] };
    }
    return { message: 'Invalid time configuration' };
});

const reminderInfoSchema = z.object({
  type: z.enum(['none', 'at_event_time', '5_minutes_before', '10_minutes_before', '15_minutes_before', '30_minutes_before', '1_hour_before', '1_day_before']).default('none'),
});

const checkinInfoSchema = z.object({
  totalCheckinsRequired: z.number().min(1, 'task.form.checkin.error.totalRequiredMin').max(100, 'task.form.checkin.error.totalRequiredMax'),
  currentCheckins: z.number().default(0),
}).nullable().optional();


const taskSchema = z.object({
  title: z.string().min(1, 'toast.task.error.titleRequired'),
  description: z.string().optional().nullable(),
  type: z.enum(['innie', 'outie', 'blackout']).default('innie'),
  repeat: z.enum(['none', 'daily', 'weekday', 'weekend', 'weekly', 'monthly', 'annually']).default('none'),
  timeInfo: timeInfoSchema,
  artifactLink: artifactLinkSchema.default({ flashcardId: null }),
  reminderInfo: reminderInfoSchema.default({ type: 'none' }),
  checkinInfo: checkinInfoSchema, // Added checkinInfo to the main schema
});

export type TaskFormData = z.infer<typeof taskSchema>;

interface TaskFormProps {
  onSubmit: (data: TaskFormData) => Promise<void>;
  initialData?: Partial<Task>;
  isLoading?: boolean;
  mode: 'create' | 'edit';
  onCancel?: () => void;
  onIntermediateSave?: (updates: Partial<TaskFormData>) => Promise<boolean>;
  onDelete?: () => Promise<void>;
  onDirtyChange?: (isDirty: boolean) => void;
}

export default function TaskForm({
  onSubmit,
  initialData,
  isLoading = false,
  mode,
  onCancel,
  onIntermediateSave,
  onDelete,
  onDirtyChange
}: TaskFormProps) {
  const t = useI18n();
  const { toast } = useToast();
  const currentLocale = useCurrentLocale();
  const { getFlashcardById, addFlashcard, updateFlashcard, decks, isLoadingDecks, flashcards: allFlashcardsFromContext } = useFlashcards();
  const dateFnsLocale = currentLocale === 'zh' ? zhCN : enUS;

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: initialData?.title || '',
      description: initialData?.description || '',
      type: initialData?.type || 'innie',
      repeat: initialData?.repeat || 'none',
      timeInfo: initialData?.timeInfo || { type: 'no_time', startDate: null, endDate: null, time: null },
      artifactLink: initialData?.artifactLink || { flashcardId: null },
      reminderInfo: initialData?.reminderInfo || { type: 'none' },
      checkinInfo: initialData?.checkinInfo || null,
    },
  });

  const { formState: { isDirty: currentFormIsDirty }, control, watch, setValue } = form;

  React.useEffect(() => {
    if (onDirtyChange) {
      onDirtyChange(currentFormIsDirty);
    }
  }, [currentFormIsDirty, onDirtyChange]);


  const watchedArtifactLink = useWatch({ control, name: "artifactLink" });
  const watchedTimeInfo = useWatch({ control, name: "timeInfo" });
  const watchedRepeat = useWatch({ control, name: "repeat" });
  const watchedReminderInfo = useWatch({ control, name: "reminderInfo" });
  const watchedCheckinInfo = watch("checkinInfo"); // Watch for changes to show/hide related fields
  const isCheckinModeEnabled = !!watchedCheckinInfo;


  const [linkedFlashcard, setLinkedFlashcard] = React.useState<FlashcardType | null | undefined>(undefined);
  const [isFetchingFlashcard, setIsFetchingFlashcard] = React.useState(false);
  const [isNewFlashcardDialogOpen, setIsNewFlashcardDialogOpen] = React.useState(false);
  const [isSubmittingNewFlashcard, setIsSubmittingNewFlashcard] = React.useState(false);
  const [isEditFlashcardDialogOpen, setIsEditFlashcardDialogOpen] = React.useState(false);
  const [editingFlashcardData, setEditingFlashcardData] = React.useState<FlashcardType | null>(null);
  const [isSubmittingEditedFlashcard, setIsSubmittingEditedFlashcard] = React.useState(false);
  const [isSelectFlashcardDialogOpen, setIsSelectFlashcardDialogOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isDateTimeReminderDialogOpen, setIsDateTimeReminderDialogOpen] = React.useState(false);
  const [isPreviewingDescription, setIsPreviewingDescription] = React.useState(false);
  const [isPreviewingFlashcard, setIsPreviewingFlashcard] = React.useState(false);

  const taskTypeOptions: { value: TaskType; labelKey: string; icon: React.ElementType }[] = React.useMemo(() => [
    { value: 'innie', labelKey: 'task.type.innie', icon: Briefcase },
    { value: 'outie', labelKey: 'task.type.outie', icon: User },
    { value: 'blackout', labelKey: 'task.type.blackout', icon: Coffee },
  ], [t]);


  React.useEffect(() => {
    const fetchCard = async () => {
        if (watchedArtifactLink?.flashcardId) {
            setIsFetchingFlashcard(true);
            const card = getFlashcardById(watchedArtifactLink.flashcardId);
            setLinkedFlashcard(card || null);
            setIsFetchingFlashcard(false);
        } else {
            setLinkedFlashcard(null);
            setIsPreviewingFlashcard(false);
        }
    };
    fetchCard();
  }, [watchedArtifactLink?.flashcardId, getFlashcardById]);


  React.useEffect(() => {
     const normalizedTimeInfo: TimeInfo = {
      type: initialData?.timeInfo?.type || 'no_time',
      startDate: (initialData?.timeInfo?.startDate && isValid(parseISO(initialData.timeInfo.startDate))) ? initialData.timeInfo.startDate : null,
      endDate: (initialData?.timeInfo?.endDate && isValid(parseISO(initialData.timeInfo.endDate))) ? initialData.timeInfo.endDate : null,
      time: initialData?.timeInfo?.time || null,
    };

    const dataForReset: TaskFormData = {
      title: initialData?.title || '',
      description: initialData?.description || '',
      type: initialData?.type || 'innie',
      repeat: initialData?.repeat || 'none',
      timeInfo: normalizedTimeInfo,
      artifactLink: initialData?.artifactLink || { flashcardId: null },
      reminderInfo: initialData?.reminderInfo || { type: 'none' },
      checkinInfo: initialData?.checkinInfo || null,
    };
    form.reset(dataForReset);
  }, [initialData, form]);

  const repeatOptions: { value: RepeatFrequency; labelKey: string }[] = React.useMemo(() => [
    { value: 'none', labelKey: 'task.form.repeat.none' },
    { value: 'daily', labelKey: 'task.form.repeat.daily' },
    { value: 'weekday', labelKey: 'task.form.repeat.weekday' },
    { value: 'weekend', labelKey: 'task.form.repeat.weekend' },
    { value: 'weekly', labelKey: 'task.form.repeat.weekly' },
    { value: 'monthly', labelKey: 'task.form.repeat.monthly' },
    { value: 'annually', labelKey: 'task.form.repeat.annually' },
  ], []);

  const reminderOptions: { value: ReminderType; labelKey: string }[] = React.useMemo(() => [
    { value: 'none', labelKey: 'task.form.reminder.type.none' },
    { value: 'at_event_time', labelKey: 'task.form.reminder.type.at_event_time' },
    { value: '5_minutes_before', labelKey: 'task.form.reminder.type.5_minutes_before' },
    { value: '10_minutes_before', labelKey: 'task.form.reminder.type.10_minutes_before' },
    { value: '15_minutes_before', labelKey: 'task.form.reminder.type.15_minutes_before' },
    { value: '30_minutes_before', labelKey: 'task.form.reminder.type.30_minutes_before' },
    { value: '1_hour_before', labelKey: 'task.form.reminder.type.1_hour_before' },
    { value: '1_day_before', labelKey: 'task.form.reminder.type.1_day_before' },
  ], []);

  const formatDateTimeDisplay = React.useCallback(() => {
    const { timeInfo } = form.getValues();
    if (timeInfo.type === 'no_time' || !timeInfo.startDate || !isValid(parseISO(timeInfo.startDate))) {
        return t('task.form.dateTimeReminder.summary.addDateTime');
    }
    const startDate = parseISO(timeInfo.startDate);
    let dateStr = '';
    if (isToday(startDate)) dateStr = t('task.form.dateTimeReminder.summary.today');
    else if (isTomorrow(startDate)) dateStr = t('task.form.dateTimeReminder.summary.tomorrow');
    else dateStr = format(startDate, 'MMM d', { locale: dateFnsLocale });

    if (timeInfo.type === 'all_day') {
        return `${dateStr} (${t('task.form.dateTimeReminder.summary.allDay')})`;
    } else if (timeInfo.type === 'datetime' && timeInfo.time) {
        return `${dateStr} ${t('task.form.dateTimeReminder.summary.at')} ${timeInfo.time}`;
    } else if (timeInfo.type === 'date_range' && timeInfo.endDate && isValid(parseISO(timeInfo.endDate))) {
        const endDate = parseISO(timeInfo.endDate);
        let endDateStr = '';
        if (isToday(endDate)) endDateStr = t('task.form.dateTimeReminder.summary.today');
        else if (isTomorrow(endDate)) endDateStr = t('task.form.dateTimeReminder.summary.tomorrow');
        else endDateStr = format(endDate, 'MMM d', { locale: dateFnsLocale });
        return `${dateStr} ${t('task.form.dateTimeReminder.summary.rangeSeparator')} ${endDateStr}`;
    }
    return dateStr;
  }, [form, t, dateFnsLocale]);

  const formatRepeatDisplay = React.useCallback(() => {
    const { repeat } = form.getValues();
    if (repeat === 'none') {
        return t('task.form.dateTimeReminder.summary.noRepeat');
    }
    const repeatLabel = repeatOptions.find(opt => opt.value === repeat)?.labelKey;
    return t(repeatLabel as any);
  }, [form, t, repeatOptions]);

  const formatReminderDisplay = React.useCallback(() => {
    const { reminderInfo } = form.getValues();
    if (reminderInfo.type === 'none') {
        return t('task.form.dateTimeReminder.summary.noReminder');
    }
    const reminderLabel = reminderOptions.find(opt => opt.value === reminderInfo.type)?.labelKey;
    return t(reminderLabel as any);
  }, [form, t, reminderOptions]);


  const handleRemoveLink = async () => {
    const clearedArtifactLink: ArtifactLink = { flashcardId: null };
    if (mode === 'edit' && initialData?.id && onIntermediateSave) {
        const success = await onIntermediateSave({ artifactLink: clearedArtifactLink });
        if (success) {
            form.setValue('artifactLink', clearedArtifactLink);
            setLinkedFlashcard(null);
            setEditingFlashcardData(null);
            setIsPreviewingFlashcard(false);
            toast({ title: t('success'), description: t('toast.task.linkRemovedAndTaskUpdated') });
        } else {
            toast({ title: t('error'), description: t('toast.task.error.intermediateSaveFailed'), variant: 'destructive' });
        }
    } else {
        form.setValue('artifactLink', clearedArtifactLink);
        setLinkedFlashcard(null);
        setEditingFlashcardData(null);
        setIsPreviewingFlashcard(false);
        toast({ title: t('success'), description: t('toast.task.linkRemoved') });
    }
  };

  const handleNewFlashcardSubmit = async (data: { front: string; back: string; deckId?: string | null }) => {
    setIsSubmittingNewFlashcard(true);
    try {
      const newCard = await addFlashcard(data);
      if (newCard && newCard.id) {
        const newArtifactLink: ArtifactLink = { flashcardId: newCard.id };
        if (mode === 'edit' && initialData?.id && onIntermediateSave) {
            const success = await onIntermediateSave({ artifactLink: newArtifactLink });
            if (success) {
                form.setValue('artifactLink', newArtifactLink);
                toast({ title: t('success'), description: t('toast.task.flashcardLinkedAndTaskUpdated') });
            } else {
                toast({ title: t('error'), description: t('toast.task.error.intermediateSaveFailed'), variant: 'destructive' });
            }
        } else {
            form.setValue('artifactLink', newArtifactLink);
            toast({ title: t('success'), description: t('toast.task.flashcardLinked') });
        }
        setIsNewFlashcardDialogOpen(false);
      } else {
        throw new Error("Failed to create flashcard or get ID.");
      }
    } catch (error) {
      toast({ title: t('error'), description: t('toast.task.error.flashcardLinkFailed'), variant: 'destructive' });
    } finally {
      setIsSubmittingNewFlashcard(false);
    }
  };

  const handleEditFlashcardSubmit = async (data: { front: string; back: string; deckId?: string | null }) => {
    if (!editingFlashcardData || !editingFlashcardData.id) return;
    setIsSubmittingEditedFlashcard(true);
    try {
      await updateFlashcard(editingFlashcardData.id, data);
      toast({ title: t('success'), description: t('toast.flashcard.updated') });
      if (watchedArtifactLink?.flashcardId) {
        const updatedCard = getFlashcardById(watchedArtifactLink.flashcardId);
        setLinkedFlashcard(updatedCard || null);
      }
      setIsEditFlashcardDialogOpen(false);
      setEditingFlashcardData(null);
    } catch (error) {
      toast({ title: t('error'), description: t('toast.flashcard.error.save'), variant: 'destructive' });
    } finally {
      setIsSubmittingEditedFlashcard(false);
    }
  };

  const handleSelectFlashcardFromDialog = async (flashcardId: string) => {
    const newArtifactLink: ArtifactLink = { flashcardId: flashcardId };
     if (mode === 'edit' && initialData?.id && onIntermediateSave) {
        const success = await onIntermediateSave({ artifactLink: newArtifactLink });
        if (success) {
            form.setValue('artifactLink', newArtifactLink);
            toast({ title: t('success'), description: t('toast.task.flashcardSelectedAndTaskUpdated') });
        } else {
            toast({ title: t('error'), description: t('toast.task.error.intermediateSaveFailed'), variant: 'destructive' });
        }
    } else {
        form.setValue('artifactLink', newArtifactLink);
        toast({ title: t('success'), description: t('toast.task.flashcardSelected') });
    }
    setIsSelectFlashcardDialogOpen(false);
  };

  const handleDeleteConfirmed = async () => {
    if (mode === 'edit' && onDelete) {
        setIsDeleting(true);
        try {
            await onDelete();
        } catch (error) {
            toast({ title: t('error'), description: t('toast.task.error.delete'), variant: "destructive" });
        } finally {
            setIsDeleting(false);
        }
    }
  };

  const handleDateTimeReminderSave = (data: { timeInfo: TimeInfo; repeat: RepeatFrequency; reminderInfo: ReminderInfo }) => {
    form.setValue('timeInfo', data.timeInfo, { shouldValidate: true, shouldDirty: true });
    form.setValue('repeat', data.repeat, { shouldValidate: true, shouldDirty: true });
    form.setValue('reminderInfo', data.reminderInfo, { shouldValidate: true, shouldDirty: true });
  };

  const handleCheckinModeChange = (checked: boolean) => {
    if (checked) {
      setValue("checkinInfo", { totalCheckinsRequired: 5, currentCheckins: 0 }, { shouldValidate: true, shouldDirty: true });
    } else {
      setValue("checkinInfo", null, { shouldValidate: true, shouldDirty: true });
    }
  };

  const timeDisplay = formatDateTimeDisplay();
  const repeatDisplay = formatRepeatDisplay();
  const reminderDisplay = formatReminderDisplay();
  const isTimeSet = watchedTimeInfo.type !== 'no_time' && watchedTimeInfo.startDate && isValid(parseISO(watchedTimeInfo.startDate));


  return (
    <>
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="h-full flex flex-col w-full p-4 md:p-6">
        {onCancel && (
          <div className={cn("md:hidden mb-2", mode === 'create' ? "" : "")}>
            <Button variant="ghost" onClick={onCancel} size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('flashcard.form.page.button.back')}
            </Button>
          </div>
        )}
        <ScrollArea className="min-h-0 pb-4"> {/* Changed from div to ScrollArea for consistent scrollbar, remove flex-1 */}
          <div className="space-y-4"> {/* Inner div for padding/spacing if ScrollArea needs it */}
            <FormField
              control={control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-lg sr-only">{t('task.form.label.title')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('task.form.placeholder.title')} {...field} className="text-xl font-semibold border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 h-auto py-1 w-full" />
                  </FormControl>
                  <FormMessage>{form.formState.errors.title && t(form.formState.errors.title.message as any)}</FormMessage>
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <FormLabel htmlFor={field.name} className="text-sm text-muted-foreground whitespace-nowrap shrink-0">
                      {t('task.form.label.type')}:
                    </FormLabel>
                    <div className="flex-grow">
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        defaultValue={field.value}
                        disabled={isLoading}
                        name={field.name}
                      >
                        <FormControl>
                          <SelectTrigger id={field.name} className="w-full">
                            <SelectValue placeholder={t('task.form.placeholder.type')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {taskTypeOptions.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              <div className="flex items-center">
                                <option.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                                {t(option.labelKey as any)}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <FormMessage>
                    {form.formState.errors.type && t(form.formState.errors.type.message as any)}
                  </FormMessage>
                </FormItem>
              )}
            />

            <FormItem>
                <FormLabel className="text-base flex items-center text-muted-foreground sr-only">
                    {t('task.form.label.timeInfo')}
                </FormLabel>
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDateTimeReminderDialogOpen(true)}
                    className="w-full justify-between text-left font-normal text-sm h-auto py-2 px-3"
                >
                    <div className="flex flex-col w-full space-y-1">
                        <div className="flex items-center justify-between">
                            <span className="flex items-center">
                                <Clock className="mr-2 h-4 w-4 text-muted-foreground flex-shrink-0" />
                                <span className={cn(!isTimeSet && "text-muted-foreground italic")}>
                                    {timeDisplay}
                                </span>
                            </span>
                            {(isTimeSet || watchedRepeat !== 'none') && (
                                <span className="flex items-center text-muted-foreground">
                                    <Repeat className="mr-1.5 h-3.5 w-3.5" />
                                    {repeatDisplay}
                                </span>
                            )}
                        </div>
                        {(isTimeSet || watchedReminderInfo.type !== 'none') && (
                            <div className="flex items-center text-muted-foreground">
                                <Bell className="mr-2 h-4 w-4" />
                                <span>{reminderDisplay}</span>
                            </div>
                        )}
                    </div>
                    <Edit3 className="ml-2 h-3 w-3 text-muted-foreground flex-shrink-0 self-center"/>
                </Button>
                <FormMessage>{form.formState.errors.timeInfo?.root?.message && t(form.formState.errors.timeInfo.root.message as any)}</FormMessage>
                <FormMessage>{form.formState.errors.timeInfo?.startDate?.message && t(form.formState.errors.timeInfo.startDate.message as any)}</FormMessage>
                <FormMessage>{form.formState.errors.timeInfo?.endDate?.message && t(form.formState.errors.timeInfo.endDate.message as any)}</FormMessage>
                <FormMessage>{form.formState.errors.timeInfo?.time?.message && t(form.formState.errors.timeInfo.time.message as any)}</FormMessage>
            </FormItem>

            {/* Check-in Mode Section */}
            <FormItem className="space-y-3">
              <div className="flex items-center space-x-2 p-3 border rounded-md">
                <Switch
                  id="checkinModeSwitch"
                  checked={isCheckinModeEnabled}
                  onCheckedChange={handleCheckinModeChange}
                  aria-label={t('task.form.checkin.enableLabel')}
                />
                <Label htmlFor="checkinModeSwitch" className="text-sm font-normal">
                  {t('task.form.checkin.enableLabel')}
                </Label>
              </div>

              {isCheckinModeEnabled && (
                <FormField
                  control={control}
                  name="checkinInfo.totalCheckinsRequired"
                  render={({ field }) => (
                    <FormItem className="pl-3">
                      <FormLabel>{t('task.form.checkin.totalRequiredLabel')}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => field.onChange(e.target.value === '' ? null : parseInt(e.target.value, 10))}
                          placeholder={t('task.form.checkin.totalRequiredPlaceholder')}
                          min="1"
                          max="100"
                        />
                      </FormControl>
                      <FormMessage>{form.formState.errors.checkinInfo?.totalCheckinsRequired?.message && t(form.formState.errors.checkinInfo.totalCheckinsRequired.message as any)}</FormMessage>
                    </FormItem>
                  )}
                />
              )}
              <FormMessage>{form.formState.errors.checkinInfo?.root?.message && t(form.formState.errors.checkinInfo.root.message as any)}</FormMessage>
            </FormItem>


            <FormItem>
                <FormLabel className="text-base flex items-center text-muted-foreground">
                    <Link2 className="mr-2 h-4 w-4" />
                    {t('task.form.artifactLink.sectionTitle')}
                </FormLabel>
                <div className="p-3 border rounded-md space-y-3 text-sm">
                    {isFetchingFlashcard && watchedArtifactLink?.flashcardId && (
                        <div className="flex items-center text-muted-foreground">
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {t('task.form.artifactLink.loadingFlashcard')}
                        </div>
                    )}
                    {!isFetchingFlashcard && watchedArtifactLink?.flashcardId && linkedFlashcard && (
                         <>
                            {isPreviewingFlashcard ? (
                                <div
                                    onClick={() => setIsPreviewingFlashcard(false)}
                                    className="cursor-pointer space-y-3 p-2 bg-muted/30 rounded-md"
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setIsPreviewingFlashcard(false);}}
                                    aria-label={t('task.form.description.editMode')}
                                >
                                    <div>
                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('flashcard.form.label.front')}</p>
                                        <div className="markdown-content whitespace-pre-wrap p-2 bg-background rounded-sm border mt-1 text-sm overflow-x-auto">
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{linkedFlashcard.front}</ReactMarkdown>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('flashcard.form.label.back')}</p>
                                        <div className="markdown-content whitespace-pre-wrap p-2 bg-background rounded-sm border mt-1 text-sm overflow-x-auto">
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{linkedFlashcard.back}</ReactMarkdown>
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-1 mt-1">
                                        <Button
                                            type="button" variant="ghost" size="xsIcon"
                                            onClick={(e) => { e.stopPropagation(); setEditingFlashcardData(linkedFlashcard); setIsEditFlashcardDialogOpen(true); }}
                                            title={t('task.form.artifactLink.button.editLinkedFlashcard')}
                                        > <FilePenLine className="h-4 w-4" /> </Button>
                                        <Button
                                            type="button" variant="ghost" size="xsIcon"
                                            onClick={(e) => { e.stopPropagation(); setIsSelectFlashcardDialogOpen(true); }}
                                            title={t('task.form.artifactLink.button.change')}
                                        > <ListChecks className="h-4 w-4" /> </Button>
                                        <Button
                                            type="button" variant="ghost" size="xsIcon"
                                            onClick={(e) => { e.stopPropagation(); handleRemoveLink(); }}
                                            title={t('task.form.artifactLink.button.remove')}
                                        > <Trash2 className="h-4 w-4 text-destructive" /> </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between text-sm">
                                    <span className="font-medium mr-1 text-foreground whitespace-nowrap">{t('task.form.artifactLink.flashcardPrefix')}</span>
                                    <Button
                                        variant="link" type="button"
                                        onClick={() => setIsPreviewingFlashcard(true)}
                                        className="text-primary hover:underline truncate p-0 h-auto leading-tight flex-grow justify-start text-left"
                                        title={linkedFlashcard.front}
                                    >
                                        {linkedFlashcard.front}
                                    </Button>
                                    <div className="flex gap-1 flex-shrink-0 ml-2">
                                        <Button type="button" variant="ghost" size="xsIcon" onClick={() => { setEditingFlashcardData(linkedFlashcard); setIsEditFlashcardDialogOpen(true); }} title={t('task.form.artifactLink.button.editLinkedFlashcard')}>
                                            <FilePenLine className="h-4 w-4" />
                                        </Button>
                                        <Button type="button" variant="ghost" size="xsIcon" onClick={() => setIsSelectFlashcardDialogOpen(true)} title={t('task.form.artifactLink.button.change')}>
                                            <ListChecks className="h-4 w-4" />
                                        </Button>
                                        <Button type="button" variant="ghost" size="xsIcon" onClick={handleRemoveLink} title={t('task.form.artifactLink.button.remove')}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                     {!isFetchingFlashcard && watchedArtifactLink?.flashcardId && !linkedFlashcard && (
                        <div className="space-y-1 text-sm">
                           <p className="text-destructive">{t('task.form.artifactLink.flashcardNotFound')}</p>
                           <div className="flex gap-2">
                                <Button type="button" variant="outline" size="xs" onClick={() => setIsSelectFlashcardDialogOpen(true)}>
                                    <ListChecks className="mr-1 h-3 w-3" /> {t('task.form.artifactLink.button.change')}
                                </Button>
                                <Button type="button" variant="ghost" size="xsIcon" onClick={handleRemoveLink} title={t('task.form.artifactLink.button.remove')}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {!watchedArtifactLink?.flashcardId && (
                        <div className="flex flex-wrap gap-2 pt-1">
                             <Dialog open={isNewFlashcardDialogOpen} onOpenChange={setIsNewFlashcardDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button type="button" variant="outline" size="xs" onClick={() => setIsNewFlashcardDialogOpen(true)}>
                                        <FilePlus className="mr-1 h-3 w-3" /> {t('task.form.artifactLink.button.newFlashcard')}
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[600px]">
                                    <DialogHeader>
                                        <DialogTitle>{t('task.form.artifactLink.dialog.newFlashcard.title')}</DialogTitle>
                                        <DialogDescription>
                                          {t('task.form.artifactLink.dialog.newFlashcard.description')}
                                        </DialogDescription>
                                    </DialogHeader>
                                    <FlashcardForm
                                        onSubmit={handleNewFlashcardSubmit}
                                        decks={decks || []}
                                        isLoading={isSubmittingNewFlashcard}
                                        isLoadingDecks={isLoadingDecks}
                                        submitButtonTextKey="flashcard.form.button.create"
                                        onCancel={() => setIsNewFlashcardDialogOpen(false)}
                                        cancelButtonTextKey="deck.item.delete.confirm.cancel"
                                    />
                                </DialogContent>
                            </Dialog>
                            <Button type="button" variant="outline" size="xs" onClick={() => setIsSelectFlashcardDialogOpen(true)}>
                               <ListChecks className="mr-1 h-3 w-3" /> {t('task.form.artifactLink.button.selectFlashcard')}
                            </Button>
                        </div>
                    )}
                </div>
                <FormMessage>{form.formState.errors.artifactLink?.root?.message && t(form.formState.errors.artifactLink.root.message as any)}</FormMessage>
            </FormItem>

            <FormField
              control={control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center mb-1">
                    <FormLabel className="text-base text-muted-foreground">
                      {t('task.form.label.description')}
                    </FormLabel>
                    <Button
                      type="button"
                      variant="ghost"
                      size="xsIcon"
                      onClick={() => setIsPreviewingDescription(!isPreviewingDescription)}
                      title={isPreviewingDescription ? t('task.form.description.editMode') : t('task.form.description.previewMode')}
                      className="ml-2 text-muted-foreground hover:text-foreground"
                    >
                      {isPreviewingDescription ? <FileEdit className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  {isPreviewingDescription ? (
                    <div
                        className="markdown-content prose dark:prose-invert prose-sm max-w-none p-3 border rounded-md min-h-[120px] text-sm bg-muted/20 overflow-x-auto"
                        onClick={() => setIsPreviewingDescription(false)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setIsPreviewingDescription(false);}}
                        role="button"
                        tabIndex={0}
                        aria-label={t('task.form.description.editMode')}
                    >
                      {field.value && field.value.trim() !== '' ? (
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{field.value}</ReactMarkdown>
                      ) : (
                        <p className="italic text-muted-foreground">{t('task.form.description.emptyPreview')}</p>
                      )}
                    </div>
                  ) : (
                    <FormControl>
                      <Textarea
                        placeholder={t('task.form.placeholder.description')}
                        {...field}
                        value={field.value ?? ''}
                        className="min-h-[120px] text-sm"
                      />
                    </FormControl>
                  )}
                  <FormMessage>{form.formState.errors.description && t(form.formState.errors.description.message as any)}</FormMessage>
                </FormItem>
              )}
            />
          </div>
        </ScrollArea>

        <div className="flex-shrink-0 flex justify-between items-center pt-4 border-t mt-auto"> {/* Added mt-auto */}
            <div className="flex gap-2">
                <Button type="submit" disabled={isLoading || isFetchingFlashcard || isSubmittingNewFlashcard || isSubmittingEditedFlashcard || isDeleting} className="min-w-[100px]" size="sm">
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    {isLoading ? t('task.form.button.saving') : (mode === 'edit' ? t('task.form.button.update') : t('task.form.button.create'))}
                </Button>
                {onCancel && (
                    <Button type="button" variant="ghost" onClick={onCancel} disabled={isLoading || isSubmittingNewFlashcard || isSubmittingEditedFlashcard || isFetchingFlashcard || isDeleting} size="sm" className="hidden md:inline-flex">
                       <X className="mr-2 h-4 w-4" /> {t('deck.item.delete.confirm.cancel')}
                    </Button>
                )}
            </div>
            <div>
                {mode === 'edit' && onDelete && (
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button type="button" variant="destructive" size="sm" disabled={isLoading || isDeleting}>
                                {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                                {isDeleting ? t('task.form.button.deleting') : t('task.form.button.delete')}
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>{t('task.form.delete.confirm.title')}</AlertDialogTitle>
                                <AlertDialogDescription>
                                    {t('task.form.delete.confirm.description')}
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel disabled={isDeleting}>{t('deck.item.delete.confirm.cancel')}</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDeleteConfirmed} disabled={isDeleting}>
                                    {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    {t('deck.item.delete.confirm.delete')}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
            </div>
        </div>
      </form>
    </Form>

    <TaskDateTimeReminderDialog
        isOpen={isDateTimeReminderDialogOpen}
        onOpenChange={setIsDateTimeReminderDialogOpen}
        initialTimeInfo={form.getValues('timeInfo')}
        initialRepeat={form.getValues('repeat')}
        initialReminderInfo={form.getValues('reminderInfo')}
        onSave={handleDateTimeReminderSave}
    />

      {editingFlashcardData && (
        <Dialog open={isEditFlashcardDialogOpen} onOpenChange={(open) => {
          setIsEditFlashcardDialogOpen(open);
          if (!open) setEditingFlashcardData(null);
        }}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{t('task.form.artifactLink.dialog.editFlashcard.title')}</DialogTitle>
              <DialogDescription>{t('task.form.artifactLink.dialog.editFlashcard.description')}</DialogDescription>
            </DialogHeader>
            <FlashcardForm
              initialData={editingFlashcardData}
              onSubmit={handleEditFlashcardSubmit}
              decks={decks || []}
              isLoading={isSubmittingEditedFlashcard}
              isLoadingDecks={isLoadingDecks}
              submitButtonTextKey="flashcard.form.button.update"
              onCancel={() => { setIsEditFlashcardDialogOpen(false); setEditingFlashcardData(null); }}
              cancelButtonTextKey="deck.item.delete.confirm.cancel"
            />
          </DialogContent>
        </Dialog>
      )}

      <SelectFlashcardDialog
        isOpen={isSelectFlashcardDialogOpen}
        onOpenChange={setIsSelectFlashcardDialogOpen}
        onSelect={handleSelectFlashcardFromDialog}
        allFlashcards={allFlashcardsFromContext}
        isLoadingDecks={isLoadingDecks}
        t={t}
      />
    </>
  );
}
interface SelectFlashcardDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (flashcardId: string) => void;
  allFlashcards: FlashcardType[];
  isLoadingDecks: boolean;
  t: (key: any, params?: any) => string;
}

function SelectFlashcardDialog({
  isOpen,
  onOpenChange,
  onSelect,
  allFlashcards,
  isLoadingDecks,
  t,
}: SelectFlashcardDialogProps) {
  const [searchTerm, setSearchTerm] = React.useState('');

  const filteredFlashcards = React.useMemo(() => {
    if (!searchTerm.trim()) {
      return [...allFlashcards]
        .sort((a, b) => (new Date(b.createdAt || 0).getTime()) - (new Date(a.createdAt || 0).getTime()))
        .slice(0, 10);
    }
    return allFlashcards.filter(
      (card) =>
        card.front.toLowerCase().includes(searchTerm.toLowerCase()) ||
        card.back.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 20);
  }, [allFlashcards, searchTerm]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('task.form.artifactLink.dialog.selectFlashcard.title')}</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder={t('task.form.artifactLink.dialog.selectFlashcard.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <ScrollArea className="h-[300px] w-full">
            {isLoadingDecks && searchTerm === '' && allFlashcards.length === 0 ? (
              <div className="flex justify-center items-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredFlashcards.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t('task.form.artifactLink.dialog.selectFlashcard.noFlashcardsFound')}
              </p>
            ) : (
              <div className="space-y-2">
                {filteredFlashcards.map((card) => (
                  <Button
                    key={card.id}
                    variant="outline"
                    className="w-full justify-start text-left h-auto py-2"
                    onClick={() => {
                      onSelect(card.id);
                      onOpenChange(false);
                    }}
                  >
                    <div className="flex flex-col min-w-0 overflow-hidden">
                      <span className="block font-medium truncate" title={card.front}>{card.front}</span>
                    </div>
                  </Button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('deck.item.delete.confirm.cancel')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

