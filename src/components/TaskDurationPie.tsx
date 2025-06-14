
"use client";
import React from 'react';
import { cn } from '@/lib/utils';

interface TaskDurationPieProps {
  remainingPercentage: number; // 0-100
  totalDurationDays?: number; // New prop
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
    if (totalDurationDays === 1) {
      durationText = '1d';
    } else {
      durationText = `${totalDurationDays}d`;
    }
  }

  // Adjust font size based on text length and pie size
  let fontSize = size / 3; // Default font size
  if (durationText.length > 2) { // e.g., "10d"
    fontSize = size / 3.5;
  }
  if (durationText.length > 3) { // e.g., "100d"
    fontSize = size / 4;
  }
   if (size < 16) { // For very small pies, reduce more
    fontSize = size / 2.5;
    if (durationText.length > 2) fontSize = size / 3;
  }


  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={cn("transform -rotate-90", className)} // -rotate-90 to start from top
    >
      {/* Background circle (gray part - represents what's passed or the total track) */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="hsl(var(--muted-foreground))"
        strokeWidth={strokeWidth}
        fill="transparent"
        opacity="0.25"
      />
      {/* Foreground circle (theme color part - represents remaining) */}
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
          transform={`rotate(90 ${size/2} ${size/2})`} // Counter-rotate the text
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

