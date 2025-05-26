import type { ReactNode } from 'react';

interface PageContainerProps {
  children: ReactNode;
  className?: string;
}

export default function PageContainer({ children, className }: PageContainerProps) {
  return (
    <div className={`container mx-auto px-4 py-8 sm:px-6 lg:px-8 ${className || ''}`}>
      {children}
    </div>
  );
}
