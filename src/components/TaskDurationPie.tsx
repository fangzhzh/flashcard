
"use client";
import React from 'react';
import { cn } from '@/lib/utils';

interface TaskDurationPieProps {
  remainingPercentage: number; // 0-100
  totalDurationDays?: number;
  size?: number;
  className?: string;
  strokeWidth?: number;
  variant?: 'active' | 'upcoming';
}

const TaskDurationPie: React.FC<TaskDurationPieProps> = ({
  remainingPercentage,
  totalDurationDays,
  size = 16,
  className,
  strokeWidth = 2.5,
  variant = 'active',
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedPercentage = Math.max(0, Math.min(remainingPercentage, 100));
  const offset = circumference - (clampedPercentage / 100) * circumference;

  const strokeColor = variant === 'upcoming'
    ? 'hsl(var(--accent))'
    : 'hsl(var(--primary))';

  const textColor = 'hsl(var(--primary-foreground))';

  let durationText = '';
  if (totalDurationDays !== undefined && totalDurationDays > 0) {
    durationText = `${totalDurationDays}`; // Display just the number
  }

  // Aim for a font size that's roughly half the pie size, capped for very small pies.
  // For a 16px pie, this would be around 8px.
  // For a 12px pie, this would be 6px.
  // Badge text is often around 0.75rem (12px) for its default height,
  // but our pie is smaller, so we need a proportionally smaller font.
  let fontSize = Math.max(6, size * 0.45); // Adjusted for better visibility
  if (totalDurationDays && totalDurationDays >= 100) { // Slightly reduce for 3-digit numbers
      fontSize = Math.max(5, size * 0.35);
  } else if (totalDurationDays && totalDurationDays >= 10) { // Slightly reduce for 2-digit numbers
      fontSize = Math.max(5.5, size * 0.4);
  }


  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={cn("transform -rotate-90", className)}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="hsl(var(--muted-foreground))"
        strokeWidth={strokeWidth}
        fill="transparent"
        opacity="0.25"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        fill="transparent"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
      />
      {durationText && fontSize > 0 && (
        <text
          x="50%"
          y="50%"
          transform={`rotate(90 ${size/2} ${size/2})`}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={fontSize}
          fill={textColor}
          fontWeight="medium"
        >
          {durationText}
        </text>
      )}
    </svg>
  );
};

export default TaskDurationPie;
