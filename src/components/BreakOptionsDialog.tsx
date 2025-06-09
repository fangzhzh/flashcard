
"use client";
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useI18n } from '@/lib/i18n/client';
import type { default as enLocale } from '@/lib/i18n/locales/en'; // For type safety

type TranslationKeys = keyof typeof enLocale;

interface BreakOption {
  id: string;
  labelKey: TranslationKeys;
  effectiveness: number; // 0-5 stars
  benefitKey: TranslationKeys;
}

const breakOptions: BreakOption[] = [
  { id: 'stretch', labelKey: 'pomodoro.break.option.stretch', effectiveness: 4, benefitKey: 'pomodoro.break.benefit.stretch' },
  { id: 'deepBreath', labelKey: 'pomodoro.break.option.deepBreath', effectiveness: 4, benefitKey: 'pomodoro.break.benefit.deepBreath' },
  { id: 'mindfulDrink', labelKey: 'pomodoro.break.option.mindfulDrink', effectiveness: 4, benefitKey: 'pomodoro.break.benefit.mindfulDrink' },
  { id: 'chat', labelKey: 'pomodoro.break.option.chat', effectiveness: 3, benefitKey: 'pomodoro.break.benefit.chat' },
  { id: 'drawObject', labelKey: 'pomodoro.break.option.drawObject', effectiveness: 3, benefitKey: 'pomodoro.break.benefit.drawObject' },
  { id: 'lookOutside', labelKey: 'pomodoro.break.option.lookOutside', effectiveness: 4, benefitKey: 'pomodoro.break.benefit.lookOutside' },
  { id: 'walk', labelKey: 'pomodoro.break.option.walk', effectiveness: 5, benefitKey: 'pomodoro.break.benefit.walk' },
  { id: 'meditate', labelKey: 'pomodoro.break.option.meditate', effectiveness: 5, benefitKey: 'pomodoro.break.benefit.meditate' },
  { id: 'listenMusic', labelKey: 'pomodoro.break.option.listenMusic', effectiveness: 4, benefitKey: 'pomodoro.break.benefit.listenMusic' },
  { id: 'microExercise', labelKey: 'pomodoro.break.option.microExercise', effectiveness: 4, benefitKey: 'pomodoro.break.benefit.microExercise' },
  { id: 'lightAdjust', labelKey: 'pomodoro.break.option.lightAdjust', effectiveness: 3, benefitKey: 'pomodoro.break.benefit.lightAdjust' },
  { id: 'workflowWrapUp', labelKey: 'pomodoro.break.option.workflowWrapUp', effectiveness: 5, benefitKey: 'pomodoro.break.benefit.workflowWrapUp' },
  { id: 'ritualRest', labelKey: 'pomodoro.break.option.ritualRest', effectiveness: 4, benefitKey: 'pomodoro.break.benefit.ritualRest' },
];

const renderStars = (count: number) => {
  const totalStars = 5;
  return (
    <span className="ml-1 text-sm" role="img" aria-label={`${count} out of ${totalStars} stars`}>
      {'★'.repeat(count)}{'☆'.repeat(totalStars - count)}
    </span>
  );
};

interface BreakOptionsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onStartRest: (selectedOptionId: string) => void;
}

export default function BreakOptionsDialog({ isOpen, onClose, onStartRest }: BreakOptionsDialogProps) {
  const t = useI18n();
  const [selectedOptions, setSelectedOptions] = useState<string[]>([breakOptions[0].id]); // Default to first option

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    // Reset to default selection when dialog opens if nothing is selected
    if (isOpen && selectedOptions.length === 0 && breakOptions.length > 0) {
      setSelectedOptions([breakOptions[0].id]);
    }
  }, [isOpen]);


  const handleSelectionChange = (optionId: string, checked: boolean) => {
    setSelectedOptions(prev => {
      if (checked) {
        return [...prev, optionId];
      }
      return prev.filter(id => id !== optionId);
    });
  };

  const handleStartRest = () => {
    // For now, use the first selected option if multiple are checked, or default if none
    const optionToStart = selectedOptions.length > 0 ? selectedOptions[0] : breakOptions[0]?.id;
    if (optionToStart) {
      onStartRest(optionToStart);
    } else {
      onClose(); // Should not happen if default is set, but as a fallback
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md md:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('pomodoro.break.dialog.title')}</DialogTitle>
          <DialogDescription>
            {t('pomodoro.break.dialog.description')}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
            {breakOptions.map((option) => (
              <TooltipProvider key={option.id} delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center space-x-3 p-3 border rounded-md hover:bg-muted/50 transition-colors cursor-pointer">
                      <Checkbox
                        id={option.id}
                        checked={selectedOptions.includes(option.id)}
                        onCheckedChange={(checked) => handleSelectionChange(option.id, !!checked)}
                      />
                      <Label htmlFor={option.id} className="font-normal cursor-pointer flex-1 flex items-center">
                        <span>{t(option.labelKey)}</span>
                        {renderStars(option.effectiveness)}
                      </Label>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" align="start" className="max-w-xs text-sm">
                    <p>{t(option.benefitKey)}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            {t('pomodoro.break.dialog.button.skip')}
          </Button>
          <Button type="button" onClick={handleStartRest} disabled={selectedOptions.length === 0}>
            {t('pomodoro.break.dialog.button.startRest', { duration: 5 })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
