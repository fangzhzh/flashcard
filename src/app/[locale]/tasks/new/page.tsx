
"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function NewTaskRedirect() {
  const router = useRouter();

  useEffect(() => {
    // This page is now obsolete. The "New Task" functionality is handled by a dialog.
    // Redirect users to the main tasks page.
    router.replace('/tasks');
  }, [router]);

  // Render nothing, or a loading spinner, while redirecting.
  return null;
}
