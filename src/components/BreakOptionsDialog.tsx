
"use client";
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useI18n } from '@/lib/i18n/client';
import type { default as enLocale } from '@/lib/i18n/locales/en';

type TranslationKeys = keyof typeof enLocale;

interface BreakOption {
  id: string;
  labelKey: TranslationKeys; 
}

const breakOptions: BreakOption[] = [
  { id: 'stretch', labelKey: 'pomodoro.break.option.stretch' },
  { id: 'deepBreath', labelKey: 'pomodoro.break.option.deepBreath' },
  { id: 'mindfulDrink', labelKey: 'pomodoro.break.option.mindfulDrink' },
  { id: 'chat', labelKey: 'pomodoro.break.option.chat' },
  { id: 'drawObject', labelKey: 'pomodoro.break.option.drawObject' },
  { id: 'lookOutside', labelKey: 'pomodoro.break.option.lookOutside' },
  { id: 'walk', labelKey: 'pomodoro.break.option.walk' },
  { id: 'meditate', labelKey: 'pomodoro.break.option.meditate' },
  { id: 'listenMusic', labelKey: 'pomodoro.break.option.listenMusic' },
  { id: 'microExercise', labelKey: 'pomodoro.break.option.microExercise' },
  { id: 'lightAdjust', labelKey: 'pomodoro.break.option.lightAdjust' },
  { id: 'workflowWrapUp', labelKey: 'pomodoro.break.option.workflowWrapUp' },
  { id: 'ritualRest', labelKey: 'pomodoro.break.option.ritualRest' },
];

interface BreakOptionsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onStartRest: (selectedOptionId: string) => void;
}

export default function BreakOptionsDialog({ isOpen, onClose, onStartRest }: BreakOptionsDialogProps) {
  const t = useI18n();
  const [selectedOption, setSelectedOption] = useState<string>(breakOptions[0].id);

  const handleStartRest = () => {
    onStartRest(selectedOption);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{t('pomodoro.break.dialog.title')}</DialogTitle>
          <DialogDescription>
            {t('pomodoro.break.dialog.description')}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <RadioGroup value={selectedOption} onValueChange={setSelectedOption} className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
            {breakOptions.map((option) => (
              <div key={option.id} className="flex items-center space-x-3 p-2 border rounded-md hover:bg-muted/50 transition-colors">
                <RadioGroupItem value={option.id} id={option.id} />
                <Label htmlFor={option.id} className="font-normal cursor-pointer flex-1">
                  {t(option.labelKey)}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            {t('pomodoro.break.dialog.button.skip')}
          </Button>
          <Button type="button" onClick={handleStartRest}>
            {t('pomodoro.break.dialog.button.startRest', { duration: 5 })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
