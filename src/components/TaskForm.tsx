
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
import type { Task, RepeatFrequency, TimeInfo, ArtifactLink, ReminderInfo, ReminderType, Flashcard as FlashcardType, Deck } from '@/types';
import { Save, CalendarIcon, Link2, RotateCcw, Clock, Bell, Trash2, X, Loader2, FilePlus, ListChecks, Search } from 'lucide-react';
import { useI18n, useCurrentLocale } from '@/lib/i18n/client';
import { cn } from '@/lib/utils';
import { format, parseISO, isValid } from 'date-fns';
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


const artifactLinkSchema = z.object({
  flashcardId: z.string().nullable().optional(),
});

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

const reminderInfoSchema = z.object({
  type: z.enum(['none', 'at_event_time', '5_minutes_before', '10_minutes_before', '15_minutes_before', '30_minutes_before', '1_hour_before', '1_day_before']).default('none'),
});

const taskSchema = z.object({
  title: z.string().min(1, 'toast.task.error.titleRequired'),
  description: z.string().optional().nullable(),
  repeat: z.enum(['none', 'daily', 'weekly', 'monthly', 'annually']).default('none'),
  timeInfo: timeInfoSchema,
  artifactLink: artifactLinkSchema.default({ flashcardId: null }),
  reminderInfo: reminderInfoSchema.default({ type: 'none' }),
});

export type TaskFormData = z.infer<typeof taskSchema>;

interface TaskFormProps {
  onSubmit: (data: TaskFormData) => Promise<void>;
  initialData?: Partial<Task>;
  isLoading?: boolean;
  mode: 'create' | 'edit';
  onCancel?: () => void;
  onIntermediateSave?: (updates: Partial<TaskFormData>) => Promise<boolean>;
  onDelete?: () => Promise<void>; // New prop for delete action
}

export default function TaskForm({
  onSubmit,
  initialData,
  isLoading = false,
  mode,
  onCancel,
  onIntermediateSave,
  onDelete
}: TaskFormProps) {
  const t = useI18n();
  const { toast } = useToast();
  const currentLocale = useCurrentLocale();
  const { getFlashcardById, addFlashcard, updateFlashcard, decks, isLoadingDecks, flashcards: allFlashcardsFromContext } = useFlashcards();

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: initialData?.title || '',
      description: initialData?.description || '',
      repeat: initialData?.repeat || 'none',
      timeInfo: initialData?.timeInfo || { type: 'no_time', startDate: null, endDate: null, time: null },
      artifactLink: initialData?.artifactLink || { flashcardId: null },
      reminderInfo: initialData?.reminderInfo || { type: 'none' },
    },
  });

  const watchedArtifactLink = useWatch({ control: form.control, name: "artifactLink" });
  const [isTimeSectionOpen, setIsTimeSectionOpen] = React.useState(false);

  const [tempStartDate, setTempStartDate] = React.useState<Date | undefined>(undefined);
  const [tempTime, setTempTime] = React.useState<string>('');
  const [tempEndDate, setTempEndDate] = React.useState<Date | undefined>(undefined);

  const [linkedFlashcard, setLinkedFlashcard] = React.useState<FlashcardType | null | undefined>(undefined);
  const [isFetchingFlashcard, setIsFetchingFlashcard] = React.useState(false);

  const [isNewFlashcardDialogOpen, setIsNewFlashcardDialogOpen] = React.useState(false);
  const [isSubmittingNewFlashcard, setIsSubmittingNewFlashcard] = React.useState(false);

  const [isEditFlashcardDialogOpen, setIsEditFlashcardDialogOpen] = React.useState(false);
  const [editingFlashcardData, setEditingFlashcardData] = React.useState<FlashcardType | null>(null);
  const [isSubmittingEditedFlashcard, setIsSubmittingEditedFlashcard] = React.useState(false);

  const [isSelectFlashcardDialogOpen, setIsSelectFlashcardDialogOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false); // For delete button loader

  React.useEffect(() => {
    const fetchCard = async () => {
        if (watchedArtifactLink?.flashcardId) {
            setIsFetchingFlashcard(true);
            const card = getFlashcardById(watchedArtifactLink.flashcardId);
            setLinkedFlashcard(card || null); 
            setIsFetchingFlashcard(false);
        } else {
            setLinkedFlashcard(null);
        }
    };
    fetchCard();
  }, [watchedArtifactLink?.flashcardId, getFlashcardById]);


  React.useEffect(() => {
    const dataForReset = initialData || {
      title: '',
      description: '',
      repeat: 'none' as RepeatFrequency,
      timeInfo: { type: 'no_time' as 'no_time', startDate: null, endDate: null, time: null },
      artifactLink: { flashcardId: null as string | null },
      reminderInfo: { type: 'none' as ReminderType },
    };
  
    form.reset({
      title: dataForReset.title || '',
      description: dataForReset.description || '',
      repeat: dataForReset.repeat || 'none',
      timeInfo: dataForReset.timeInfo || { type: 'no_time', startDate: null, endDate: null, time: null },
      artifactLink: dataForReset.artifactLink || { flashcardId: null },
      reminderInfo: dataForReset.reminderInfo || { type: 'none' },
    });
  
    const currentTI = dataForReset.timeInfo || { type: 'no_time' };
    setTempStartDate(currentTI.startDate && isValid(parseISO(currentTI.startDate)) ? parseISO(currentTI.startDate) : undefined);
    setTempTime(currentTI.time || '');
    setTempEndDate(currentTI.endDate && isValid(parseISO(currentTI.endDate)) ? parseISO(currentTI.endDate) : undefined);
    
    const shouldOpenTimeSection = currentTI.type !== 'no_time' && !!currentTI.startDate;
    if (isTimeSectionOpen !== shouldOpenTimeSection) { 
        setIsTimeSectionOpen(shouldOpenTimeSection);
    }
  
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

  const handleRemoveLink = async () => {
    const clearedArtifactLink: ArtifactLink = { flashcardId: null };
    if (mode === 'edit' && initialData?.id && onIntermediateSave) {
        const success = await onIntermediateSave({ artifactLink: clearedArtifactLink });
        if (success) {
            form.setValue('artifactLink', clearedArtifactLink);
            setLinkedFlashcard(null);
            setEditingFlashcardData(null); 
            toast({ title: t('success'), description: t('toast.task.linkRemovedAndTaskUpdated') });
        } else {
            toast({ title: t('error'), description: t('toast.task.error.intermediateSaveFailed'), variant: 'destructive' });
        }
    } else {
        form.setValue('artifactLink', clearedArtifactLink);
        setLinkedFlashcard(null);
        setEditingFlashcardData(null);
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
      console.error("Error creating and linking flashcard:", error);
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
      console.error("Error updating linked flashcard:", error);
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
            // Toast for successful deletion will be handled in TasksClient
        } catch (error) {
            toast({ title: t('error'), description: t('toast.task.error.delete'), variant: "destructive" });
        } finally {
            setIsDeleting(false);
        }
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
                         <div className="flex items-center justify-between text-sm">
                            <span className="font-medium mr-1 text-foreground whitespace-nowrap">{t('task.form.artifactLink.flashcardPrefix')}</span>
                            <Button
                                variant="link"
                                type="button"
                                onClick={() => { setEditingFlashcardData(linkedFlashcard); setIsEditFlashcardDialogOpen(true); }}
                                className="text-primary hover:underline truncate p-0 h-auto leading-tight flex-grow justify-start text-left"
                                title={linkedFlashcard.front}
                            >
                                {linkedFlashcard.front}
                            </Button>
                            <div className="flex gap-1 flex-shrink-0 ml-2">
                                <Button type="button" variant="ghost" size="xsIcon" onClick={() => setIsSelectFlashcardDialogOpen(true)} title={t('task.form.artifactLink.button.change')}>
                                    <ListChecks className="h-4 w-4" />
                                </Button>
                                <Button type="button" variant="ghost" size="xsIcon" onClick={handleRemoveLink} title={t('task.form.artifactLink.button.remove')}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </div>
                        </div>
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

        <div className="flex justify-between items-center pt-4 border-t mt-auto">
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
            <div className="flex gap-2">
                {onCancel && (
                    <Button type="button" variant="ghost" onClick={onCancel} disabled={isLoading || isSubmittingNewFlashcard || isSubmittingEditedFlashcard || isFetchingFlashcard || isDeleting} size="sm">
                       <X className="mr-2 h-4 w-4" /> {t('deck.item.delete.confirm.cancel')}
                    </Button>
                )}
                <Button type="submit" disabled={isLoading || isFetchingFlashcard || isSubmittingNewFlashcard || isSubmittingEditedFlashcard || isDeleting} className="min-w-[100px]" size="sm">
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    {isLoading ? t('task.form.button.saving') : (mode === 'edit' ? t('task.form.button.update') : t('task.form.button.create'))}
                </Button>
            </div>
        </div>
      </form>

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

    </Form>
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
    
