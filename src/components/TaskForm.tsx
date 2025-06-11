
"use client";
import * as React from 'react';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import type { Task, TaskStatus, RepeatFrequency, TimeInfo, ArtifactLink, ReminderInfo, Flashcard as FlashcardType, Deck } from '@/types';
import { Save, CalendarIcon, Link2, RotateCcw, Clock, Bell, Trash2, X, Loader2, FilePlus, Pencil, Replace } from 'lucide-react';
import { useI18n, useCurrentLocale } from '@/lib/i18n/client';
import { cn } from '@/lib/utils';
import { format, parseISO, isValid } from 'date-fns';
import { useFlashcards } from '@/contexts/FlashcardsContext';
import FlashcardForm from '@/components/FlashcardForm'; // Import FlashcardForm
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

const timeInfoSchema = z.object({
  type: z.enum(['no_time', 'datetime', 'all_day', 'date_range']).default('no_time'),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'task.form.error.timeInfo.invalidTime').nullable().optional(),
}).refine(data => {
  if (data.type === 'date_range' && data.startDate && data.endDate) {
    return new Date(data.endDate) >= new Date(data.startDate);
  }
  if (data.type === 'datetime' && !data.startDate) return false;
  if (data.type === 'all_day' && !data.startDate) return false;
  if (data.type === 'date_range' && (!data.startDate || !data.endDate)) return false;
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


const artifactLinkSchema = z.object({
  flashcardId: z.string().nullable().optional(),
  urlValue: z.string().url('task.form.error.artifactLink.invalidUrl').nullable().optional(),
}).refine(data => !(data.flashcardId && data.urlValue), {
  message: "task.form.error.artifactLink.multipleLinks",
  path: ["flashcardId"], // Arbitrary path, error can be handled generally
});


const reminderInfoSchema = z.object({
  type: z.enum(['none', 'at_event_time', '5_minutes_before', '10_minutes_before', '15_minutes_before', '30_minutes_before', '1_hour_before', '1_day_before']).default('none'),
});

const taskSchema = z.object({
  title: z.string().min(1, 'toast.task.error.titleRequired'),
  description: z.string().optional().nullable(),
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
  const { toast } = useToast();
  const currentLocale = useCurrentLocale();
  const { getFlashcardById, addFlashcard, decks, isLoadingDecks } = useFlashcards();

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: initialData?.title || '',
      description: initialData?.description || '',
      repeat: initialData?.repeat || 'none',
      timeInfo: initialData?.timeInfo || { type: 'no_time', startDate: null, endDate: null, time: null },
      artifactLink: initialData?.artifactLink || { flashcardId: null, urlValue: null },
      reminderInfo: initialData?.reminderInfo || { type: 'none' },
    },
  });

  const watchedArtifactLink = useWatch({ control: form.control, name: "artifactLink" });
  const [isTimeSectionOpen, setIsTimeSectionOpen] = React.useState(false);
  
  const [tempStartDate, setTempStartDate] = React.useState<Date | undefined>(
    initialData?.timeInfo?.startDate && isValid(parseISO(initialData.timeInfo.startDate)) ? parseISO(initialData.timeInfo.startDate) : undefined
  );
  const [tempTime, setTempTime] = React.useState<string>(initialData?.timeInfo?.time || '');
  const [tempEndDate, setTempEndDate] = React.useState<Date | undefined>(
    initialData?.timeInfo?.endDate && isValid(parseISO(initialData.timeInfo.endDate)) ? parseISO(initialData.timeInfo.endDate) : undefined
  );

  const [linkedFlashcard, setLinkedFlashcard] = React.useState<FlashcardType | null | undefined>(undefined);
  const [isFetchingFlashcard, setIsFetchingFlashcard] = React.useState(false);

  const [isNewFlashcardDialogOpen, setIsNewFlashcardDialogOpen] = React.useState(false);
  const [isSubmittingNewFlashcard, setIsSubmittingNewFlashcard] = React.useState(false);

  React.useEffect(() => {
    if (watchedArtifactLink?.flashcardId) {
      setIsFetchingFlashcard(true);
      const card = getFlashcardById(watchedArtifactLink.flashcardId);
      setLinkedFlashcard(card || null);
      setIsFetchingFlashcard(false);
    } else {
      setLinkedFlashcard(null);
    }
  }, [watchedArtifactLink?.flashcardId, getFlashcardById]);


  React.useEffect(() => {
    if (initialData) {
      const defaultTimeInfo = initialData.timeInfo || { type: 'no_time', startDate: null, endDate: null, time: null };
      form.reset({
        title: initialData.title || '',
        description: initialData.description || '',
        repeat: initialData.repeat || 'none',
        timeInfo: defaultTimeInfo,
        artifactLink: initialData.artifactLink || { flashcardId: null, urlValue: null },
        reminderInfo: initialData.reminderInfo || { type: 'none' },
      });
      setTempStartDate(defaultTimeInfo.startDate && isValid(parseISO(defaultTimeInfo.startDate)) ? parseISO(defaultTimeInfo.startDate) : undefined);
      setTempTime(defaultTimeInfo.time || '');
      setTempEndDate(defaultTimeInfo.endDate && isValid(parseISO(defaultTimeInfo.endDate)) ? parseISO(defaultTimeInfo.endDate) : undefined);
      
      if (defaultTimeInfo.type !== 'no_time') {
        setIsTimeSectionOpen(true);
      } else {
        setIsTimeSectionOpen(false);
      }
    } else {
        setTempStartDate(undefined);
        setTempTime('');
        setTempEndDate(undefined);
        setIsTimeSectionOpen(false);
    }
  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  }, [initialData, form.reset]);


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

  const handleSetTimeInfo = () => {
    const startDateStr = tempStartDate ? format(tempStartDate, "yyyy-MM-dd") : null;
    const endDateStr = tempEndDate ? format(tempEndDate, "yyyy-MM-dd") : null;
    const timeStr = tempTime || null;

    if (startDateStr && timeStr && !endDateStr) { 
      form.setValue('timeInfo', { type: 'datetime', startDate: startDateStr, time: timeStr, endDate: null });
    } else if (startDateStr && !timeStr && !endDateStr) { 
      form.setValue('timeInfo', { type: 'all_day', startDate: startDateStr, time: null, endDate: null });
    } else if (startDateStr && endDateStr) { 
       form.setValue('timeInfo', { type: 'date_range', startDate: startDateStr, endDate: endDateStr, time: timeStr });
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
  
  const handleRemoveLink = () => {
    form.setValue('artifactLink', { flashcardId: null, urlValue: null });
    setLinkedFlashcard(null);
  };

  const handleNewFlashcardSubmit = async (data: { front: string; back: string; deckId?: string | null }) => {
    setIsSubmittingNewFlashcard(true);
    try {
      const newCard = await addFlashcard(data);
      if (newCard && newCard.id) {
        form.setValue('artifactLink.flashcardId', newCard.id);
        form.setValue('artifactLink.urlValue', null); // Ensure URL value is cleared
        toast({ title: t('success'), description: t('toast.task.flashcardLinked') });
        setIsNewFlashcardDialogOpen(false);
      } else {
        throw new Error("Failed to create flashcard or get ID.");
      }
    } catch (error) {
      console.error("Error creating and linking flashcard:", error);
      toast({ title: t('error'), description: t('toast.task.error.flashcardLinkFailed'), variant: 'destructive' });
    } finally {
      setIsSubmittingNewFlashcard(false);
    }
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
            
            <FormItem>
                <FormLabel className="text-base flex items-center text-muted-foreground">
                    <Link2 className="mr-2 h-4 w-4" />
                    {t('task.form.label.artifactLink.sectionTitle')}
                </FormLabel>
                <div className="p-3 border rounded-md space-y-3 text-sm">
                    {isFetchingFlashcard && watchedArtifactLink?.flashcardId && (
                        <div className="flex items-center text-muted-foreground">
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {t('task.form.artifactLink.loadingFlashcard')}
                        </div>
                    )}
                    {!isFetchingFlashcard && watchedArtifactLink?.flashcardId && linkedFlashcard && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center flex-grow min-w-0">
                                    <span className="font-medium mr-1 text-foreground">{t('task.form.artifactLink.flashcardPrefix')}</span>
                                    <Link href={`/${currentLocale}/flashcards/${linkedFlashcard.id}/edit`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate flex-grow" title={linkedFlashcard.front}>
                                        {linkedFlashcard.front.substring(0, 30)}{linkedFlashcard.front.length > 30 ? "..." : ""}
                                    </Link>
                                </div>
                                <div className="flex gap-2 flex-shrink-0">
                                    <Button type="button" variant="outline" size="xs" onClick={() => {/* Placeholder for Change Flashcard */}}>
                                      <Replace className="mr-1 h-3 w-3" /> {t('task.form.artifactLink.button.change')}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                     {!isFetchingFlashcard && watchedArtifactLink?.flashcardId && !linkedFlashcard && (
                        <div className="space-y-1">
                           <p className="text-destructive">{t('task.form.artifactLink.flashcardNotFound')}</p>
                           <div className="flex gap-2">
                                <Button type="button" variant="outline" size="xs" onClick={() => {/* Placeholder for Change Flashcard */}}>
                                    <Replace className="mr-1 h-3 w-3" /> {t('task.form.artifactLink.button.change')}
                                </Button>
                            </div>
                        </div>
                    )}

                    {watchedArtifactLink?.urlValue && (
                         <div className="space-y-1">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center flex-grow min-w-0">
                                    <span className="font-medium mr-1 text-foreground">{t('task.form.artifactLink.urlPrefix')}</span>
                                    <a href={watchedArtifactLink.urlValue} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate flex-grow" title={watchedArtifactLink.urlValue}>
                                        {watchedArtifactLink.urlValue.substring(0,50)}{watchedArtifactLink.urlValue.length > 50 ? "..." : ""}
                                    </a>
                                </div>
                                <div className="flex-shrink-0">
                                    <Button type="button" variant="outline" size="xs" onClick={() => {/* Placeholder for Edit URL */}}>
                                        <Pencil className="mr-1 h-3 w-3" /> {t('task.form.artifactLink.button.editUrl')}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {!watchedArtifactLink?.flashcardId && !watchedArtifactLink?.urlValue && (
                        <div className="flex flex-wrap gap-2">
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
                                    />
                                </DialogContent>
                            </Dialog>
                            <Button type="button" variant="outline" size="xs" onClick={() => {/* Placeholder for Select Flashcard */}}>
                                {t('task.form.artifactLink.button.selectFlashcard')}
                            </Button>
                            <Button type="button" variant="outline" size="xs" onClick={() => form.setValue('artifactLink.urlValue', '') /* Opens URL input indirectly */}>
                                {t('task.form.artifactLink.button.addUrl')}
                            </Button>
                        </div>
                    )}
                     {/* Hidden input to allow URL editing when addUrl or editUrl is conceptually clicked */}
                    {watchedArtifactLink?.urlValue === '' && !watchedArtifactLink?.flashcardId && (
                        <FormField
                            control={form.control}
                            name="artifactLink.urlValue"
                            render={({ field }) => (
                            <FormItem className="mt-2">
                                <FormLabel className="text-xs">{t('task.form.label.urlValue')}</FormLabel>
                                <FormControl>
                                    <Input
                                    type="url"
                                    placeholder={t('task.form.placeholder.urlValue')}
                                    {...field}
                                    value={field.value ?? ""}
                                    className="h-8 text-xs"
                                    autoFocus
                                    onBlur={() => {
                                        if (!field.value && !form.getValues("artifactLink.flashcardId")) {
                                            form.setValue('artifactLink.urlValue', null);
                                        }
                                        form.trigger("artifactLink.urlValue");
                                    }}
                                    />
                                </FormControl>
                                <FormMessage className="text-xs">{form.formState.errors.artifactLink?.urlValue?.message && t(form.formState.errors.artifactLink.urlValue.message as any)}</FormMessage>
                            </FormItem>
                            )}
                        />
                    )}
                    { (watchedArtifactLink?.flashcardId || watchedArtifactLink?.urlValue) &&
                        <Button type="button" variant="ghost" size="xs" onClick={handleRemoveLink} className="text-destructive hover:text-destructive-foreground hover:bg-destructive/90 w-full mt-2">
                            <Trash2 className="mr-1 h-3 w-3" /> {t('task.form.artifactLink.button.removeLink')}
                        </Button>
                    }
                </div>
                <FormMessage>{form.formState.errors.artifactLink?.root?.message && t(form.formState.errors.artifactLink.root.message as any)}</FormMessage>
            </FormItem>


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
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t mt-auto">
          {onCancel && (
            <Button type="button" variant="ghost" onClick={onCancel} disabled={isLoading || isSubmittingNewFlashcard} size="sm">
               <X className="mr-2 h-4 w-4" /> {t('deck.item.delete.confirm.cancel')}
            </Button>
          )}
          <Button type="submit" disabled={isLoading || isFetchingFlashcard || isSubmittingNewFlashcard} className="min-w-[100px]" size="sm">
            <Save className="mr-2 h-4 w-4" />
            {isLoading ? t('task.form.button.saving') : (mode === 'edit' ? t('task.form.button.update') : t('task.form.button.create'))}
          </Button>
        </div>
      </form>
    </Form>
  );
}

