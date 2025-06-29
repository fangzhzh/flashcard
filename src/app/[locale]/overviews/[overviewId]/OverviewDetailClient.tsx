
"use client";
import React, { useEffect, useState, useMemo } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useFlashcards } from '@/contexts/FlashcardsContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, ArrowLeft, Edit3, PlusCircle, Info, GitFork, ListChecks, AlertTriangle, CheckSquare, Hourglass, Zap, ShieldAlert, FilePenLine } from 'lucide-react';
import { useI18n, useCurrentLocale } from '@/lib/i18n/client';
import type { Overview, Task, TimeInfo, Flashcard as FlashcardType } from '@/types';
import { Alert, AlertTitle, AlertDescription as UiAlertDescription } from '@/components/ui/alert';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { CodeProps } from 'react-markdown/lib/ast-to-react';
import MermaidDiagram from '@/components/MermaidDiagram';
import { cn } from '@/lib/utils';
import { format, parseISO, differenceInCalendarDays, isToday, isTomorrow, isValid, isSameYear, startOfDay, addDays, startOfWeek, endOfWeek, areIntervalsOverlapping, endOfDay, subWeeks, subMonths, subDays } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import { zhCN } from 'date-fns/locale/zh-CN';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import TaskDurationPie from '@/components/TaskDurationPie';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

interface FormattedTimeInfo {
  visibleLabel: string;
  tooltipLabel: string;
  timeStatus: 'upcoming' | 'active' | 'overdue' | 'none';
}
type TranslationKeys = keyof typeof import('@/lib/i18n/locales/en').default;
type CompletedTaskFilter = 'lastWeek' | 'last2Weeks' | 'lastMonth' | 'last3Months' | 'custom';

const CustomMarkdownComponents = {
  code({ node, inline, className, children, ...props }: CodeProps) {
    const match = /language-(\w+)/.exec(className || '');
    if (!inline && match && match[1] === 'mermaid') {
      return <MermaidDiagram chart={String(children).trim()} />;
    }
    if (!inline && match) {
      return (
        <pre className={className} {...props}>
          <code className={`language-${match[1]}`}>{children}</code>
        </pre>
      );
    }
    return (
      <code className={className} {...props}>
        {children}
      </code>
    );
  },
  a({ node, ...props }: React.ComponentPropsWithoutRef<'a'>) {
    if (props.href && (props.href.startsWith('http://') || props.href.startsWith('https://'))) {
      return <a {...props} target="_blank" rel="noopener noreferrer" />;
    }
    return <a {...props} />;
  },
};


export default function OverviewDetailClient({ overviewId }: { overviewId: string }) {
  const { user, loading: authLoading } = useAuth();
  const { getOverviewById, tasks, isLoadingOverviews, isLoadingTasks, getTaskById, overviews, getFlashcardById } = useFlashcards();
  const t = useI18n();
  const currentLocale = useCurrentLocale();
  const router = useRouter();
  const today = startOfDay(new Date());
  const dateFnsLocale = currentLocale === 'zh' ? zhCN : enUS;

  const currentPathname = usePathname();
  const currentSearchParams = useSearchParams();

  const [currentOverview, setCurrentOverview] = useState<Overview | null | undefined>(undefined);
  const [completedTaskFilter, setCompletedTaskFilter] = useState<CompletedTaskFilter>('lastWeek');
  const [customDays, setCustomDays] = useState<number>(7);

  useEffect(() => {
    if (!isLoadingOverviews && user) {
      const overview = getOverviewById(overviewId);
      setCurrentOverview(overview);
      if (!overview && !isLoadingOverviews && overviews && overviews.length > 0) { 
          router.push(`/${currentLocale}/overviews`);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overviewId, getOverviewById, isLoadingOverviews, user, router, currentLocale, overviews]);


  const pendingLinkedTasks = useMemo(() => {
    if (!currentOverview) return [];
    return tasks.filter(task => task.overviewId === currentOverview.id && task.status !== 'completed').sort((a,b) => {
      const aDate = a.timeInfo?.startDate && isValid(parseISO(a.timeInfo.startDate)) ? parseISO(a.timeInfo.startDate) : null;
      const bDate = b.timeInfo?.startDate && isValid(parseISO(b.timeInfo.startDate)) ? parseISO(b.timeInfo.startDate) : null;
      if (aDate && bDate) return aDate.getTime() - bDate.getTime();
      if (aDate) return -1;
      if (bDate) return 1;
      return (b.createdAt && a.createdAt) ? (new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) : 0;
    });
  }, [currentOverview, tasks]);

  const allCompletedLinkedTasks = useMemo(() => {
    if (!currentOverview) return [];
    return tasks.filter(task => task.overviewId === currentOverview.id && task.status === 'completed');
  }, [currentOverview, tasks]);

  const filteredCompletedLinkedTasks = useMemo(() => {
    const now = new Date();
    let cutoffDate: Date;

    switch (completedTaskFilter) {
      case 'last2Weeks':
        cutoffDate = subWeeks(now, 2);
        break;
      case 'lastMonth':
        cutoffDate = subMonths(now, 1);
        break;
      case 'last3Months':
        cutoffDate = subMonths(now, 3);
        break;
      case 'custom':
        cutoffDate = subDays(now, customDays > 0 ? customDays : 0);
        break;
      case 'lastWeek':
      default:
        cutoffDate = subWeeks(now, 1);
        break;
    }

    const filtered = allCompletedLinkedTasks
      .filter(task => {
        if (!task.updatedAt) return false;
        const completionDate = parseISO(task.updatedAt);
        return isValid(completionDate) && completionDate >= cutoffDate;
      });

    return filtered.sort((a, b) => {
        const dateA = new Date(a.updatedAt || 0).getTime();
        const dateB = new Date(b.updatedAt || 0).getTime();
        return dateB - dateA;
    });
  }, [allCompletedLinkedTasks, completedTaskFilter, customDays]);


  const relatedFlashcards = useMemo(() => {
    if (!currentOverview) return [];
    const ids = new Set<string>();

    if (currentOverview.artifactLink?.flashcardId) {
        ids.add(currentOverview.artifactLink.flashcardId);
    }
    const tasksForThisOverview = tasks.filter(task => task.overviewId === currentOverview.id);
    tasksForThisOverview.forEach(task => {
        if (task.artifactLink?.flashcardId) {
            ids.add(task.artifactLink.flashcardId);
        }
    });

    return Array.from(ids)
      .map(id => getFlashcardById(id))
      .filter((card): card is FlashcardType => !!card);
  }, [currentOverview, tasks, getFlashcardById]);


  const formatDateStringForDisplay = React.useCallback((date: Date, todayDate: Date, locale: Locale, includeYearIfDifferent = true): string => {
    const yearFormat = (includeYearIfDifferent && !isSameYear(date, todayDate)) ? 'yyyy/MM/dd' : 'MM/dd';
    return format(date, yearFormat, { locale });
  }, []);

  const formatTimeLabel = React.useCallback((timeInfo?: TimeInfo): FormattedTimeInfo => {
    const defaultReturn: FormattedTimeInfo = { visibleLabel: '', tooltipLabel: t('task.display.noTime'), timeStatus: 'none' };
    if (!timeInfo || !timeInfo.startDate) {
      return defaultReturn;
    }

    let parsedStartDate: Date;
    try {
      parsedStartDate = startOfDay(parseISO(timeInfo.startDate));
      if (!isValid(parsedStartDate)) return defaultReturn;
    } catch (e) { return defaultReturn; }


    let visibleLabel = '';
    let tooltipLabel = '';
    let timeStatus: FormattedTimeInfo['timeStatus'] = 'none';
    const daysToStart = differenceInCalendarDays(parsedStartDate, today);

    if (isToday(parsedStartDate)) {
      visibleLabel = t('task.display.label.today');
    } else if (isTomorrow(parsedStartDate)) {
      visibleLabel = t('task.display.label.tomorrowShort');
    } else {
      visibleLabel = formatDateStringForDisplay(parsedStartDate, today, dateFnsLocale, false);
    }

    if (timeInfo.type === 'date_range' && timeInfo.endDate) {
      let parsedEndDate: Date;
      try {
        parsedEndDate = startOfDay(parseISO(timeInfo.endDate));
        if (!isValid(parsedEndDate) || parsedEndDate < parsedStartDate) {
           tooltipLabel = `${formatDateStringForDisplay(parsedStartDate, today, dateFnsLocale, true)} (${t('task.display.overdue')})`;
           timeStatus = daysToStart < 0 ? 'overdue' : 'active';
        } else {
          const duration = differenceInCalendarDays(parsedEndDate, parsedStartDate) + 1;
          const fullStartDateStr = formatDateStringForDisplay(parsedStartDate, today, dateFnsLocale, true);
          const fullEndDateStr = formatDateStringForDisplay(parsedEndDate, today, dateFnsLocale, true);
          
          const durationTextKey: TranslationKeys = duration === 1 ? 'task.display.totalDurationDay' : 'task.display.totalDurationDaysPlural';
          const durationText = t(durationTextKey, { count: duration });
          tooltipLabel = `${fullStartDateStr} - ${fullEndDateStr} ${durationText}`;


          if (today > parsedEndDate) {
            timeStatus = 'overdue';
          } else if (today >= parsedStartDate && today <= parsedEndDate) {
            timeStatus = 'active';
          } else if (today < parsedStartDate) {
             timeStatus = 'upcoming';
          } else {
             timeStatus = 'active';
          }
        }
      } catch (e) {
          tooltipLabel = `${formatDateStringForDisplay(parsedStartDate, today, dateFnsLocale, true)} (${t('task.display.overdue')})`;
          timeStatus = 'overdue';
      }
    } else if (timeInfo.type === 'datetime' || timeInfo.type === 'all_day' || (timeInfo.type === 'date_range' && !timeInfo.endDate) ) {
      const fullStartDateStr = formatDateStringForDisplay(parsedStartDate, today, dateFnsLocale, true);
      if (isToday(parsedStartDate)) {
        tooltipLabel = t('task.display.today');
        timeStatus = 'active';
      } else if (daysToStart > 0) {
        tooltipLabel = `${fullStartDateStr} (${t('task.display.inXDays', { count: daysToStart })})`;
        timeStatus = 'upcoming';
      } else {
        tooltipLabel = `${fullStartDateStr} (${t('task.display.overdue')})`;
        timeStatus = 'overdue';
      }
      if (timeInfo.type === 'datetime' && timeInfo.time) {
        tooltipLabel += ` ${t('task.display.at')} ${timeInfo.time}`;
      }
    } else if (timeInfo.type === 'no_time' && timeInfo.startDate) {
      tooltipLabel = formatDateStringForDisplay(parsedStartDate, today, dateFnsLocale, true);
      if (isToday(parsedStartDate)) timeStatus = 'active';
      else if (daysToStart > 0) timeStatus = 'upcoming';
      else timeStatus = 'overdue';
    } else {
       tooltipLabel = t('task.display.noTime');
       visibleLabel = '';
       timeStatus = 'none';
    }

    return { visibleLabel, tooltipLabel, timeStatus };

  }, [t, dateFnsLocale, formatDateStringForDisplay, today]);


  if (authLoading || ((isLoadingOverviews || isLoadingTasks) && user)) {
    return (
      <div className="flex justify-center items-center mt-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user && !authLoading) {
    return (
      <Alert variant="destructive" className="mt-8">
        <ShieldAlert className="h-5 w-5" />
        <AlertTitle>{t('error')}</AlertTitle>
        <UiAlertDescription>{t('auth.pleaseSignIn')}</UiAlertDescription>
      </Alert>
    );
  }

  if (currentOverview === undefined && !isLoadingOverviews) {
      return (
        <div className="flex justify-center items-center mt-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
  }

  if (currentOverview === null && !isLoadingOverviews) {
    return (
      <Alert variant="destructive" className="mt-8">
        <ShieldAlert className="h-5 w-5" />
        <AlertTitle>{t('error')}</AlertTitle>
        <UiAlertDescription>{t('overview.notFound')}</UiAlertDescription>
      </Alert>
    );
  }
  
  if (!currentOverview) return null;

  const returnToPath = encodeURIComponent(currentPathname + currentSearchParams.toString());

  const renderTaskItem = (task: Task) => {
    const { visibleLabel, tooltipLabel, timeStatus } = formatTimeLabel(task.timeInfo);
    let statusIcon: React.ReactNode = null;
    let statusIconTooltipContent: React.ReactNode | null = null;
    let currentRemainingPercentage = 0;
    let totalDaysInRangeForLabel = 0;
  
    if (task.status === 'completed') {
      statusIcon = <CheckSquare className="h-4 w-4 text-green-500 mx-1 flex-shrink-0" />;
      statusIconTooltipContent = <p>{t('task.item.status.completed')}</p>;
    } else {
      if (timeStatus === 'upcoming' && task.timeInfo?.startDate) {
        const sDate = parseISO(task.timeInfo.startDate);
        if (isValid(sDate)) {
          statusIcon = <Hourglass className="h-4 w-4 text-yellow-500 mx-1 flex-shrink-0" />;
          statusIconTooltipContent = <p>{t('task.display.status.upcoming')}</p>;
        }
      } else if (timeStatus === 'active' && task.timeInfo?.type === 'date_range' && task.timeInfo.startDate && task.timeInfo.endDate) {
        const sDate = parseISO(task.timeInfo.startDate);
        const eDate = parseISO(task.timeInfo.endDate);
        if (isValid(sDate) && isValid(eDate) && eDate >= sDate) {
          totalDaysInRangeForLabel = differenceInCalendarDays(eDate, sDate) + 1;
          const now = new Date();
          const isTaskTodayOnly = isToday(sDate) && isToday(eDate) && totalDaysInRangeForLabel === 1;
  
          if (isTaskTodayOnly) {
            const taskStartDateTime = startOfDay(sDate);
            const taskEndDateTime = endOfDay(eDate);
            const totalDurationInMs = taskEndDateTime.getTime() - taskStartDateTime.getTime();
            if (totalDurationInMs > 0) {
              let elapsedMs = now.getTime() - taskStartDateTime.getTime();
              elapsedMs = Math.max(0, Math.min(elapsedMs, totalDurationInMs));
              const remainingMs = totalDurationInMs - elapsedMs;
              currentRemainingPercentage = (remainingMs / totalDurationInMs) * 100;
            } else {
              currentRemainingPercentage = (now >= taskEndDateTime) ? 0 : 100;
            }
          } else {
            if (now > endOfDay(eDate)) currentRemainingPercentage = 0;
            else if (now < startOfDay(sDate)) currentRemainingPercentage = 100;
            else {
              const daysEffectivelyRemaining = differenceInCalendarDays(eDate, startOfDay(now)) + 1;
              currentRemainingPercentage = totalDaysInRangeForLabel > 0 ? (daysEffectivelyRemaining / totalDaysInRangeForLabel) * 100 : 0;
            }
          }
          currentRemainingPercentage = Math.max(0, Math.min(currentRemainingPercentage, 100));
          statusIcon = <TaskDurationPie remainingPercentage={currentRemainingPercentage} totalDurationDays={totalDaysInRangeForLabel} size={16} className="mx-1 flex-shrink-0" />;
          const durationTextKey: TranslationKeys = totalDaysInRangeForLabel === 1 ? 'task.display.totalDurationDay' : 'task.display.totalDurationDaysPlural';
          statusIconTooltipContent = <p>{formatDateStringForDisplay(sDate, today, dateFnsLocale, true)} - {formatDateStringForDisplay(eDate, today, dateFnsLocale, true)} {t(durationTextKey, { count: totalDaysInRangeForLabel })}</p>;
        }
      } else if (timeStatus === 'active') {
        statusIcon = <Zap className="h-4 w-4 text-green-500 mx-1 flex-shrink-0" />;
        statusIconTooltipContent = <p>{t('task.display.status.active')}</p>;
      } else if (timeStatus === 'overdue') {
        statusIcon = <AlertTriangle className="h-4 w-4 text-red-500 mx-1 flex-shrink-0" />;
        statusIconTooltipContent = <p>{t('task.display.status.overdue')}</p>;
      }
    }
  
    const linkedFlashcard = task.artifactLink?.flashcardId ? getFlashcardById(task.artifactLink.flashcardId) : null;
  
    return (
      <AccordionItem value={task.id} key={task.id} className="border rounded-lg bg-card shadow-sm data-[state=open]:shadow-md">
        <AccordionTrigger className={cn("p-3 hover:no-underline w-full rounded-md", task.status === 'completed' && 'bg-muted/50')}>
          <div className="flex items-center justify-between w-full">
            <div className="flex-1 min-w-0 flex items-center gap-3">
              {statusIcon && statusIconTooltipContent ? (
                  <Tooltip>
                    <TooltipTrigger asChild><div className="flex items-center">{statusIcon}</div></TooltipTrigger>
                    <TooltipContent side="bottom">{statusIconTooltipContent}</TooltipContent>
                  </Tooltip>
              ) : (
                  <div className="w-4 h-4 mx-1 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className={cn("text-sm font-medium text-left truncate", task.status === 'completed' && "line-through text-muted-foreground")} title={task.title}>{task.title}</p>
                {task.description && (
                  <p className="text-xs text-muted-foreground text-left truncate">{task.description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center flex-shrink-0 ml-2">
              {visibleLabel && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-xs text-muted-foreground mr-1 cursor-default">{visibleLabel}</span>
                  </TooltipTrigger>
                  <TooltipContent><p>{tooltipLabel}</p></TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent className="p-4 pt-0 space-y-4">
          <div className="border-t pt-4 space-y-4">
            {task.description && (
              <div className="markdown-content">
                <h4 className="text-sm font-semibold mb-1 text-muted-foreground">{t('task.form.label.description')}</h4>
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={CustomMarkdownComponents}>{task.description}</ReactMarkdown>
              </div>
            )}
            {linkedFlashcard && (
              <div>
                <h4 className="text-sm font-semibold mb-2 text-muted-foreground">{t('overviewDetail.linkedFlashcardForTask')}</h4>
                <Card className="bg-muted/50">
                  <CardHeader className="p-3">
                    <CardTitle className="text-sm markdown-content whitespace-pre-wrap"><ReactMarkdown remarkPlugins={[remarkGfm]} components={CustomMarkdownComponents}>{linkedFlashcard.front}</ReactMarkdown></CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 border-t">
                    <div className="markdown-content text-sm whitespace-pre-wrap">
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={CustomMarkdownComponents}>{linkedFlashcard.back}</ReactMarkdown>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
            <div className="flex justify-end pt-2">
              <Link href={`/${currentLocale}/tasks/${task.id}/edit?returnTo=${returnToPath}`} passHref>
                <Button variant="outline" size="sm">
                  <FilePenLine className="mr-2 h-4 w-4" />
                  {t('task.item.edit')}
                </Button>
              </Link>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    );
  };
  

  const renderFlashcardItem = (flashcard: FlashcardType) => {
    return (
      <Card key={flashcard.id} className="shadow-sm">
        <Accordion type="single" collapsible>
          <AccordionItem value="item-1" className="border-b-0">
            <AccordionTrigger className="p-3 text-sm font-medium hover:no-underline">
              <div className="markdown-content whitespace-pre-wrap text-left flex-1">
                 <ReactMarkdown remarkPlugins={[remarkGfm]} components={CustomMarkdownComponents}>{flashcard.front}</ReactMarkdown>
              </div>
            </AccordionTrigger>
            <AccordionContent className="p-3 pt-0">
              <div className="border-t pt-3 markdown-content whitespace-pre-wrap text-sm">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={CustomMarkdownComponents}>{flashcard.back}</ReactMarkdown>
              </div>
              <div className="flex justify-end mt-2">
                <Link href={`/${currentLocale}/flashcards/${flashcard.id}/edit`} passHref>
                  <Button variant="ghost" size="sm">
                    <FilePenLine className="mr-2 h-4 w-4" />
                    {t('flashcard.item.edit')}
                  </Button>
                </Link>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Card>
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <Button variant="outline" onClick={() => router.push(`/${currentLocale}/overviews`)} className="self-start sm:self-center">
          <ArrowLeft className="mr-2 h-4 w-4" /> {t('overviewDetail.button.backToList')}
        </Button>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-center sm:text-left flex items-center order-first sm:order-none">
          <GitFork className="mr-3 h-7 w-7 text-primary/80 flex-shrink-0" />
          <span className="truncate" title={currentOverview.title}>{currentOverview.title}</span>
        </h1>
        <div className="w-full sm:w-auto flex justify-end">
        </div>
      </div>

      {currentOverview.description && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">{t('overviewDetail.descriptionTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="markdown-content">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={CustomMarkdownComponents}>{currentOverview.description}</ReactMarkdown>
          </CardContent>
        </Card>
      )}

      {relatedFlashcards.length > 0 && (
        <Accordion type="single" collapsible className="w-full" defaultValue="related-flashcards">
            <AccordionItem value="related-flashcards">
                <AccordionTrigger>
                    <div className="flex items-center text-lg font-semibold">
                        {t('overviewDetail.linkedFlashcardsTitle')}
                        <span className="ml-2 text-muted-foreground text-base">({relatedFlashcards.length})</span>
                    </div>
                </AccordionTrigger>
                <AccordionContent>
                    <div className="space-y-3 pt-2">
                        {relatedFlashcards.map(card => renderFlashcardItem(card))}
                    </div>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
      )}

      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold tracking-tight">{t('overviewDetail.linkedTasksTitle')}</h2>
          <Link href={`/${currentLocale}/tasks/new?overviewId=${overviewId}&returnTo=${returnToPath}`} passHref>
            <Button variant="default" size="sm">
              <PlusCircle className="mr-2 h-4 w-4" /> {t('overviewDetail.button.addTask')}
            </Button>
          </Link>
        </div>
        {pendingLinkedTasks.length > 0 ? (
           <TooltipProvider>
            <Accordion type="single" collapsible className="w-full space-y-3">
              {pendingLinkedTasks.map(task => renderTaskItem(task))}
            </Accordion>
          </TooltipProvider>
        ) : (
          <Alert>
            <Info className="h-5 w-5" />
            <AlertTitle>{t('overviewDetail.noLinkedTasks.title')}</AlertTitle>
            <UiAlertDescription>{t('overviewDetail.noLinkedTasks.description')}</UiAlertDescription>
          </Alert>
        )}
      </div>

      {allCompletedLinkedTasks.length > 0 && (
        <Accordion type="single" collapsible className="w-full mt-4 border-t pt-4" defaultValue="completed-tasks">
            <AccordionItem value="completed-tasks">
                <AccordionTrigger>
                    <div className="flex items-center text-lg font-semibold">
                        {t('overviewDetail.completedTasksTitle')}
                        <span className="ml-2 text-muted-foreground text-base">({allCompletedLinkedTasks.length})</span>
                    </div>
                </AccordionTrigger>
                <AccordionContent>
                    <div className="flex items-center gap-2 pb-4 border-b">
                        <Select value={completedTaskFilter} onValueChange={(value) => setCompletedTaskFilter(value as CompletedTaskFilter)}>
                            <SelectTrigger className="w-auto sm:w-[180px] text-sm h-9">
                                <SelectValue placeholder="Filter by date" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="lastWeek">{t('overviewDetail.filter.lastWeek')}</SelectItem>
                                <SelectItem value="last2Weeks">{t('overviewDetail.filter.last2Weeks')}</SelectItem>
                                <SelectItem value="lastMonth">{t('overviewDetail.filter.lastMonth')}</SelectItem>
                                <SelectItem value="last3Months">{t('overviewDetail.filter.last3Months')}</SelectItem>
                                <SelectItem value="custom">{t('overviewDetail.filter.custom')}</SelectItem>
                            </SelectContent>
                        </Select>
                        {completedTaskFilter === 'custom' && (
                            <div className="flex items-center gap-2">
                                <Input
                                    type="number"
                                    value={customDays}
                                    onChange={(e) => setCustomDays(parseInt(e.target.value, 10) || 0)}
                                    className="w-[70px] h-9"
                                    min="1"
                                />
                                <span className="text-sm text-muted-foreground hidden sm:inline">{t('overviewDetail.filter.daysAgo')}</span>
                            </div>
                        )}
                    </div>
                    <TooltipProvider>
                      <Accordion type="single" collapsible className="w-full space-y-3 pt-2">
                          {filteredCompletedLinkedTasks.length > 0 ? (
                            filteredCompletedLinkedTasks.map(task => renderTaskItem(task))
                          ) : (
                            <p className="text-sm text-muted-foreground py-4 text-center">
                                {t('overviewDetail.noCompletedTasksInFilter')}
                            </p>
                          )}
                      </Accordion>
                    </TooltipProvider>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
      )}
    </div>
  );
}


