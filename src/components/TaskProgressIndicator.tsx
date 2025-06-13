
"use client";
import React from 'react';
import { cn } from '@/lib/utils';

interface TaskProgressIndicatorProps {
  percentage: number; // 0-100, how much of the bar is filled
  size?: number;
  className?: string;
  barHeightFraction?: number; // How much of the total icon height the bar takes (0 to 1)
}

const TaskProgressIndicator: React.FC<TaskProgressIndicatorProps> = ({
  percentage,
  size = 16, // Default icon size (h-4 w-4)
  className,
  barHeightFraction = 0.25, // Bar will be 1/4 of the icon's total height
}) => {
  const clampedPercentage = Math.max(0, Math.min(percentage, 100));
  
  const barHeight = Math.max(1, size * barHeightFraction); // Ensure barHeight is at least 1px
  const barYPosition = (size - barHeight) / 2; // Center the bar vertically

  const fillColor = 'hsl(var(--accent))';       // Color for the filled part (upcoming)
  const trackColor = 'hsl(var(--muted))'; // Color for the unfilled part (track)

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={cn("flex-shrink-0", className)} // Ensure it doesn't shrink in flex layouts
    >
      {/* Background track (full width) */}
      <rect
        x={0}
        y={barYPosition}
        width={size}
        height={barHeight}
        fill={trackColor}
        rx={barHeight / 3} // Optional: rounded corners for the track
      />
      {/* Foreground filled portion */}
      {clampedPercentage > 0 && ( // Only draw fill if there's some percentage
        <rect
          x={0}
          y={barYPosition}
          width={(size * clampedPercentage) / 100}
          height={barHeight}
          fill={fillColor}
          rx={barHeight / 3} // Optional: rounded corners for the fill
        />
      )}
    </svg>
  );
};

export default TaskProgressIndicator;
