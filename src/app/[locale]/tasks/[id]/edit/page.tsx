
"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DeprecatedEditTaskPage() {
  const router = useRouter();

  useEffect(() => {
    // Editing is now handled in a panel within the main TasksClient.
    // This page is obsolete. Redirect to the main tasks page.
    router.replace('/tasks');
  }, [router]);

  return null; // Render nothing while redirecting
}
