
"use client";
import React, { useEffect, useState, useMemo } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useFlashcards } from '@/contexts/FlashcardsContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, ArrowLeft, Edit3, PlusCircle, Info, GitFork, ListChecks, AlertTriangle, CheckSquare, Hourglass, Zap, ShieldAlert } from 'lucide-react';
import { useI18n, useCurrentLocale } from '@/lib/i18n/client';
import type { Overview, Task, TimeInfo } from '@/types';
import { Alert, AlertTitle, AlertDescription as UiAlertDescription } from '@/components/ui/alert';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { CodeProps } from 'react-markdown/lib/ast-to-react';
import MermaidDiagram from '@/components/MermaidDiagram';
import { cn } from '@/lib/utils';
import { format, parseISO, differenceInCalendarDays, isToday, isTomorrow, isValid, isSameYear, startOfDay, addDays, startOfWeek, endOfWeek, areIntervalsOverlapping, endOfDay } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import { zhCN } from 'date-fns/locale/zh-CN';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import TaskDurationPie from '@/components/TaskDurationPie';

interface FormattedTimeInfo {
  visibleLabel: string;
  tooltipLabel: string;
  timeStatus: 'upcoming' | 'active' | 'overdue' | 'none';
}
type TranslationKeys = keyof typeof import('@/lib/i18n/locales/en').default;

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
};


export default function OverviewDetailClient({ overviewId }: { overviewId: string }) {
  const { user, loading: authLoading } = useAuth();
  const { getOverviewById, tasks, isLoadingOverviews, isLoadingTasks, getTaskById, overviews } = useFlashcards();
  const t = useI18n();
  const currentLocale = useCurrentLocale();
  const router = useRouter();
  const today = startOfDay(new Date());
  const dateFnsLocale = currentLocale === 'zh' ? zhCN : enUS;

  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [currentOverview, setCurrentOverview] = useState<Overview | null | undefined>(undefined);

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


  const linkedTasks = useMemo(() => {
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

  const returnToPath = encodeURIComponent(pathname + searchParams.toString());

  const renderTaskItem = (task: Task) => {
    const { visibleLabel, tooltipLabel, timeStatus } = formatTimeLabel(task.timeInfo);
    let statusIcon: React.ReactNode = null;
    let statusIconTooltipContent: React.ReactNode | null = null;
    let currentRemainingPercentage = 0;
    let totalDaysInRangeForLabel = 0;

     if (task.status !== 'completed') {
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
                statusIcon = <TaskDurationPie remainingPercentage={currentRemainingPercentage} totalDurationDays={totalDaysInRangeForLabel} variant="active" size={16} className="mx-1 flex-shrink-0" />;
                const durationTextKey: TranslationKeys = totalDaysInRangeForLabel === 1 ? 'task.display.totalDurationDay' : 'task.display.totalDurationDaysPlural';
                statusIconTooltipContent = <p>{formatDateStringForDisplay(sDate, today, dateFnsLocale, true)} - {formatDateStringForDisplay(eDate, today, dateFnsLocale, true)} {t(durationTextKey, {count: totalDaysInRangeForLabel})}</p>;
            }
        } else if (timeStatus === 'active') {
             statusIcon = <Zap className="h-4 w-4 text-green-500 mx-1 flex-shrink-0" />;
             statusIconTooltipContent = <p>{t('task.display.status.active')}</p>;
        } else if (timeStatus === 'overdue') {
            statusIcon = <AlertTriangle className="h-4 w-4 text-red-500 mx-1 flex-shrink-0" />;
            statusIconTooltipContent = <p>{t('task.display.status.overdue')}</p>;
        }
    }


    return (
      <TooltipProvider key={task.id}>
        <Link href={`/${currentLocale}/tasks/${task.id}/edit?returnTo=${returnToPath}`} passHref>
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-3 flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" title={task.title}>{task.title}</p>
                {task.description && (
                  <p className="text-xs text-muted-foreground truncate">{task.description}</p>
                )}
              </div>
              <div className="flex items-center flex-shrink-0 ml-2">
                  {visibleLabel && (
                    <Tooltip delayDuration={300}>
                      <TooltipTrigger asChild>
                        <span className="text-xs text-muted-foreground mr-1 cursor-default">{visibleLabel}</span>
                      </TooltipTrigger>
                      <TooltipContent><p>{tooltipLabel}</p></TooltipContent>
                    </Tooltip>
                  )}
                  {statusIcon && statusIconTooltipContent && (
                    <Tooltip delayDuration={300}>
                        <TooltipTrigger asChild>
                            <div className="flex items-center">{statusIcon}</div>
                        </TooltipTrigger>
                        <TooltipContent>{statusIconTooltipContent}</TooltipContent>
                    </Tooltip>
                  )}
              </div>
            </CardContent>
          </Card>
        </Link>
      </TooltipProvider>
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

      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold tracking-tight">{t('overviewDetail.linkedTasksTitle')}</h2>
          <Link href={`/${currentLocale}/tasks/new?overviewId=${overviewId}&returnTo=${returnToPath}`} passHref>
            <Button variant="default" size="sm">
              <PlusCircle className="mr-2 h-4 w-4" /> {t('overviewDetail.button.addTask')}
            </Button>
          </Link>
        </div>
        {linkedTasks.length > 0 ? (
          <div className="space-y-3">
            {linkedTasks.map(task => renderTaskItem(task))}
          </div>
        ) : (
          <Alert>
            <Info className="h-5 w-5" />
            <AlertTitle>{t('overviewDetail.noLinkedTasks.title')}</AlertTitle>
            <UiAlertDescription>{t('overviewDetail.noLinkedTasks.description')}</UiAlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
