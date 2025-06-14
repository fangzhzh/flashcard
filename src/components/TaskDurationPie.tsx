
"use client";
import React from 'react';
import { cn } from '@/lib/utils';

interface TaskDurationPieProps {
  remainingPercentage: number; // 0-100, represents the "active" or "remaining" part
  size?: number;
  className?: string;
  strokeWidth?: number;
  variant?: 'active' | 'upcoming'; // New variant prop
}

const TaskDurationPie: React.FC<TaskDurationPieProps> = ({
  remainingPercentage,
  size = 16, // h-4 w-4 equivalent
  className,
  strokeWidth = 2.5, // Adjusted for better visibility at small sizes
  variant = 'active', // Default to 'active'
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  // Clamp percentage between 0 and 100
  const clampedPercentage = Math.max(0, Math.min(remainingPercentage, 100));
  const offset = circumference - (clampedPercentage / 100) * circumference;

  const strokeColor = variant === 'upcoming'
    ? 'hsl(var(--accent))' // Color for upcoming tasks (e.g., theme's accent color)
    : '#00FF00'; // Color for active tasks (theme's primary color)

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
        opacity="0.25" // Slightly more visible background
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
    </svg>
  );
};

export default TaskDurationPie;
