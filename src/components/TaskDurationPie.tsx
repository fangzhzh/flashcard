
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
    : '#00FF00'; // Changed to #00FF00 for active variant

  const textColor = 'hsl(var(--foreground))'; 

  let durationText = '';
  if (totalDurationDays !== undefined && totalDurationDays > 0) {
    durationText = `${totalDurationDays}`;
  }

  let fontSize = Math.max(6, size * 0.45); 
  if (totalDurationDays && totalDurationDays >= 100) {
      fontSize = Math.max(5, size * 0.35);
  } else if (totalDurationDays && totalDurationDays >= 10) {
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
