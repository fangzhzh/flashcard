
"use client";
import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { TimeInfo, RepeatFrequency, ReminderType, ReminderInfo as ReminderInfoType } from '@/types';
import { format, parseISO, isValid, isSameDay } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import { zhCN } from 'date-fns/locale/zh-CN';
import type { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { useI18n, useCurrentLocale } from '@/lib/i18n/client';

interface TaskDateTimeReminderDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  initialTimeInfo: TimeInfo;
  initialRepeat: RepeatFrequency;
  initialReminderInfo: ReminderInfoType;
  onSave: (data: { timeInfo: TimeInfo; repeat: RepeatFrequency; reminderInfo: ReminderInfoType }) => void;
}

const repeatOptions: { value: RepeatFrequency; labelKey: string }[] = [
    { value: 'none', labelKey: 'task.form.repeat.none' },
    { value: 'daily', labelKey: 'task.form.repeat.daily' },
    { value: 'weekday', labelKey: 'task.form.repeat.weekday' },
    { value: 'weekend', labelKey: 'task.form.repeat.weekend' },
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

export default function TaskDateTimeReminderDialog({
  isOpen,
  onOpenChange,
  initialTimeInfo,
  initialRepeat,
  initialReminderInfo,
  onSave,
}: TaskDateTimeReminderDialogProps) {
  const t = useI18n();
  const currentLocale = useCurrentLocale();
  const dateFnsLocale = currentLocale === 'zh' ? zhCN : enUS;

  const [selectedDates, setSelectedDates] = React.useState<DateRange | undefined>(undefined);
  const [startTime, setStartTime] = React.useState<string>('');
  // const [endTime, setEndTime] = React.useState<string>(''); // End time input is not explicitly used for setting a range's time
  const [currentRepeat, setCurrentRepeat] = React.useState<RepeatFrequency>('none');
  const [currentReminder, setCurrentReminder] = React.useState<ReminderType>('none');

  React.useEffect(() => {
    if (isOpen) {
      let initialDateRange: DateRange | undefined = undefined;
      if (initialTimeInfo.startDate && isValid(parseISO(initialTimeInfo.startDate))) {
        const sDate = parseISO(initialTimeInfo.startDate);
        initialDateRange = { from: sDate, to: undefined };
        if (initialTimeInfo.endDate && isValid(parseISO(initialTimeInfo.endDate))) {
          const eDate = parseISO(initialTimeInfo.endDate);
          if (eDate >= sDate) {
            initialDateRange.to = eDate;
          }
        } else if (initialTimeInfo.type !== 'date_range') {
             initialDateRange.to = sDate; 
        }
      }
      setSelectedDates(initialDateRange);
      setStartTime(initialTimeInfo.time || '');
      // setEndTime(''); 
      setCurrentRepeat(initialRepeat);
      setCurrentReminder(initialReminderInfo.type);
    }
  }, [isOpen, initialTimeInfo, initialRepeat, initialReminderInfo]);

  const handleSave = () => {
    let newTimeInfo: TimeInfo;

    if (selectedDates?.from) {
      const sDateStr = format(selectedDates.from, "yyyy-MM-dd");
      if (selectedDates.to && !isSameDay(selectedDates.from, selectedDates.to) && selectedDates.to > selectedDates.from) {
        newTimeInfo = {
          type: 'date_range',
          startDate: sDateStr,
          endDate: format(selectedDates.to, "yyyy-MM-dd"),
          time: null, 
        };
      } else {
        if (startTime && /^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/.test(startTime)) {
          newTimeInfo = { type: 'datetime', startDate: sDateStr, time: startTime, endDate: null };
        } else {
          newTimeInfo = { type: 'all_day', startDate: sDateStr, time: null, endDate: null };
        }
      }
    } else {
      newTimeInfo = { type: 'no_time', startDate: null, endDate: null, time: null };
    }
    onSave({ timeInfo: newTimeInfo, repeat: currentRepeat, reminderInfo: {type: currentReminder} });
    onOpenChange(false);
  };

  const handleClearTimeInfo = () => {
    setSelectedDates(undefined);
    setStartTime('');
    // setEndTime('');
    onSave({ 
        timeInfo: { type: 'no_time', startDate: null, endDate: null, time: null }, 
        repeat: currentRepeat, // Keep current repeat/reminder or reset them too? For now, keep.
        reminderInfo: {type: currentReminder} 
    });
    onOpenChange(false);
  };
  
  const handleDateSelect = (range: DateRange | undefined) => {
    if (range?.from && range?.to && range.from > range.to) {
      setSelectedDates({ from: range.to, to: range.from });
    } else {
      setSelectedDates(range);
    }
  };


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          {/* DialogTitle removed as per request */}
          <DialogDescription className="sr-only">
            {t('task.form.dateTimeReminder.dialog.title')}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-x-6 overflow-y-auto pr-1 md:pr-2">
          <div className="flex flex-col items-center justify-start md:border-r md:pr-6 ">
            <Calendar
              mode="range"
              selected={selectedDates}
              onSelect={handleDateSelect}
              locale={dateFnsLocale}
              numberOfMonths={1}
              className="p-0 [&_button]:text-sm"
            />
          </div>

          <div className="space-y-3 py-2 pr-1">
            <div className="text-sm text-center font-medium min-h-[1.5em]">
              {selectedDates?.from ? (
                <>
                  {format(selectedDates.from, 'PPP', { locale: dateFnsLocale })}
                  {selectedDates.to && !isSameDay(selectedDates.from, selectedDates.to) && selectedDates.to > selectedDates.from
                    ? ` - ${format(selectedDates.to, 'PPP', { locale: dateFnsLocale })}`
                    : ''}
                </>
              ) : (
                <span className="text-muted-foreground italic">{t('task.form.dateTimeReminder.dialog.selectDate')}</span>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Label htmlFor="startTime" className="whitespace-nowrap min-w-[70px] text-right text-sm">
                {t('task.form.dateTimeReminder.dialog.startTimeLabel')}
              </Label>
              <Input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="text-sm flex-grow"
                disabled={!selectedDates?.from}
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Label htmlFor="repeat" className="whitespace-nowrap min-w-[70px] text-right text-sm">
                {t('task.form.dateTimeReminder.dialog.repeatLabel')}
              </Label>
              <Select value={currentRepeat} onValueChange={(value) => setCurrentRepeat(value as RepeatFrequency)}>
                <SelectTrigger id="repeat" className="text-sm flex-grow">
                  <SelectValue placeholder={t('task.form.label.repeat')} />
                </SelectTrigger>
                <SelectContent>
                  {repeatOptions.map(option => (
                    <SelectItem key={option.value} value={option.value} className="text-sm">
                      {t(option.labelKey as any)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Label htmlFor="reminder" className="whitespace-nowrap min-w-[70px] text-right text-sm">
                {t('task.form.dateTimeReminder.dialog.reminderLabel')}
              </Label>
              <Select value={currentReminder} onValueChange={(value) => setCurrentReminder(value as ReminderType)}>
                <SelectTrigger id="reminder" className="text-sm flex-grow">
                  <SelectValue placeholder={t('task.form.label.reminder')} />
                </SelectTrigger>
                <SelectContent>
                  {reminderOptions.map(option => (
                    <SelectItem key={option.value} value={option.value} className="text-sm">
                      {t(option.labelKey as any)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter className="pt-4 border-t mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('deck.item.delete.confirm.cancel')}
          </Button>
           <Button variant="ghost" onClick={handleClearTimeInfo} className="mr-auto">
            {t('task.form.dateTimeReminder.dialog.clearTime')}
          </Button>
          <Button onClick={handleSave}>{t('task.form.dateTimeReminder.dialog.save')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


    
