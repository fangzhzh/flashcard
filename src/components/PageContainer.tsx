
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageContainerProps {
  children: ReactNode;
  className?: string;
}

export default function PageContainer({ children, className }: PageContainerProps) {
  return (
    <div className={cn(
        "container mx-auto px-4 sm:px-6 lg:px-8 pt-16 h-full flex flex-col overflow-y-auto pb-44", // Added overflow-y-auto and pb-44
        className
      )}
    >
      {children}
    </div>
  );
}

