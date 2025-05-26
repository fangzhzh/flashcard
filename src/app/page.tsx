// This file is no longer the main entry point.
// Content has been moved to src/app/[locale]/page.tsx
// This file can be deleted or kept as a redirect placeholder if necessary,
// but next-international middleware should handle root redirection.

export default function DeprecatedRootPage() {
  // Optional: redirect logic if middleware isn't catching it, though it should.
  // useEffect(() => {
  //   router.push('/en'); // or based on detected preference
  // }, [router]);
  return null; 
}
