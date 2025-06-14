
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
    durationText = `${totalDurationDays}d`;
  }

  let fontSize = size * 0.4; // Base for 16px -> 6.4px
  if (durationText.length > 2 && size >=16) { // For "10d", "12d" etc.
    fontSize = size * 0.35; // For 16px -> 5.6px
  }
  if (durationText.length > 3 && size >= 16) { // For "100d" etc.
    fontSize = size * 0.3; // For 16px -> 4.8px
  }
  if (size < 12 && size > 0) { // Ensure very small pies still try to render something
      fontSize = Math.max(4, size * 0.35);
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
      {durationText && (
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
