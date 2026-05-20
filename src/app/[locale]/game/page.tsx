'use client';

import { useSearchParams } from 'next/navigation';
import CardWarGame from '@/components/games/CardWarGame';

export default function GamePage() {
  const searchParams = useSearchParams();
  const deckId = searchParams.get('deckId') ?? undefined;

  return <CardWarGame initialDeckId={deckId} />;
}
