
"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DeprecatedTaskFormPage() {
  const router = useRouter();

  useEffect(() => {
    // This component is no longer used as forms are now handled in dialogs
    // or embedded directly in the main client components.
    // Redirect to a safe page like the main tasks view.
    router.replace('/tasks');
  }, [router]);

  return null; // Render nothing while redirecting
}
