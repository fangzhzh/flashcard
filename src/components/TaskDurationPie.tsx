
"use client";
import React from 'react';
import { cn } from '@/lib/utils';

interface TaskDurationPieProps {
  remainingPercentage: number; // 0-100
  totalDurationDays?: number;
  size?: number;
  className?: string;
  activeSegmentColor?: string;
  inactiveSegmentColor?: string;
  textColor?: string;
  segmentGapColor?: string; // Color for the gaps, typically card background
  segmentGapWidth?: number; // Width of the gap stroke
}

// Helper function to convert polar coordinates to Cartesian
function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0; // Adjust by -90 to make 0 degrees at the top
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

// Helper function to describe an SVG path for a pie segment
function describePieSegment(
  x: number,
  y: number,
  outerRadius: number,
  startAngle: number, // in degrees
  endAngle: number // in degrees
): string {
  const startOuter = polarToCartesian(x, y, outerRadius, endAngle); // SVG arcs are drawn clockwise, so endAngle is first point
  const endOuter = polarToCartesian(x, y, outerRadius, startAngle);

  const arcSweep = endAngle - startAngle <= 180 ? "0" : "1";

  // Path: Move to center, Line to outer edge start, Arc to outer edge end, Line back to center (Close path)
  const d = [
    "M", x, y,
    "L", startOuter.x, startOuter.y,
    "A", outerRadius, outerRadius, 0, arcSweep, 1, endOuter.x, endOuter.y,
    "Z"
  ].join(" ");

  return d;
}


const TaskDurationPie: React.FC<TaskDurationPieProps> = ({
  remainingPercentage,
  totalDurationDays,
  size = 20, // Adjusted default size slightly for better segment visibility
  className,
  activeSegmentColor = '#2ECC71', // A pleasant green
  inactiveSegmentColor = 'hsl(var(--muted))',
  textColor = 'hsl(var(--foreground))',
  segmentGapColor = 'hsl(var(--card))', // Should match the card background
  segmentGapWidth = 1, // Adjust for desired gap size
}) => {
  const NUM_SEGMENTS = 12;
  const ANGLE_PER_SEGMENT = 360 / NUM_SEGMENTS;
  const radius = size / 2;
  const centerX = size / 2;
  const centerY = size / 2;

  const clampedPercentage = Math.max(0, Math.min(remainingPercentage, 100));
  // Calculate how many segments should be "active" (showing remaining time)
  const numActiveSegments = Math.round((clampedPercentage / 100) * NUM_SEGMENTS);

  const segments = [];
  for (let i = 0; i < NUM_SEGMENTS; i++) {
    const startAngle = i * ANGLE_PER_SEGMENT;
    const endAngle = (i + 1) * ANGLE_PER_SEGMENT;

    // Segments representing elapsed time are "inactive"
    // Segments are drawn clockwise starting from the top (0 index)
    // If numActiveSegments is 5, segments 0,1,2,3,4 are active. The rest (5-11) are inactive.
    // To achieve "clocking down" (emptying from the top):
    // A segment 'i' is active if 'i' is GREATER THAN OR EQUAL to (NUM_SEGMENTS - numActiveSegments)
    // Example: 100% remaining = 12 active. (12-12)=0. Segments 0..11 are active.
    // Example: 50% remaining = 6 active. (12-6)=6. Segments 6..11 are active. (0..5 are inactive)
    // Example: 0% remaining = 0 active. (12-0)=12. No segments active.
    const isActive = i >= (NUM_SEGMENTS - numActiveSegments);
    
    segments.push(
      <path
        key={`segment-${i}`}
        d={describePieSegment(centerX, centerY, radius, startAngle, endAngle)}
        fill={isActive ? activeSegmentColor : inactiveSegmentColor}
        stroke={segmentGapColor}
        strokeWidth={segmentGapWidth}
      />
    );
  }

  let durationText = '';
  if (totalDurationDays !== undefined && totalDurationDays >= 0) { // Allow 0 days to be shown
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
      className={cn(className)} // Removed -rotate-90 as polarToCartesian now handles 0 degrees at top
    >
      {segments}
      {durationText && fontSize > 0 && (
        <text
          x="50%"
          y="50%"
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
