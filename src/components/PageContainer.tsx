
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageContainerProps {
  children: ReactNode;
  className?: string;
  disableScroll?: boolean; // Added new prop
}

export default function PageContainer({ children, className, disableScroll = false }: PageContainerProps) {
  return (
    <div className={cn(
        "container mx-auto px-4 sm:px-6 lg:px-8 h-full flex flex-col", // Removed pt-16
        disableScroll ? "overflow-y-hidden pb-6" : "overflow-y-auto pb-44", // Conditional overflow and padding
        className
      )}
    >
      {children}
    </div>
  );
}
