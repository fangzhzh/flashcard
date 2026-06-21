
const PLAYER_ATTACK = 30;

function pickBossPool(deckName) {
  return [
    { name: '石头傀儡',   emoji: '🪨', bg: ['from-emerald-950','via-green-900','to-teal-950']   },
  ];
}

function generateWaveStage(
  wave, worldId, deckName, totalCards,
) {
  const pool = pickBossPool(deckName);
  const boss = pool[(wave - 1) % pool.length];
  const isElite = wave % 5 === 0;
  const cardCount = Math.min(4 + Math.floor(wave * 1.2), Math.min(totalCards, 25));

  // Ensure boss HP is beatable with the given cardCount.
  // Max damage without items: Card 1&2 = 30 each, Card 3+ = 60 each (combo x2).
  // Total = 60 + (cardCount - 2) * 60 = (cardCount - 1) * 60.
  const maxPossibleDmg = cardCount >= 2 ? (cardCount - 1) * 60 : cardCount * 30;
  // Cap at 85% of max possible damage to allow for some mistakes or non-optimal play.
  const cappedHP = Math.floor(maxPossibleDmg * 0.85);

  const rawBossHP = Math.round(60 + wave * 28 * (isElite ? 1.8 : 1));
  const bossHP = Math.min(rawBossHP, Math.max(60, cappedHP));

  return { bossHP, cardCount };
}

// Test cases
console.log("Wave 1, 100 cards:", generateWaveStage(1, 'all', null, 100));
console.log("Wave 5 (Elite), 100 cards:", generateWaveStage(5, 'all', null, 100));
console.log("Wave 50, 100 cards:", generateWaveStage(50, 'all', null, 100));
console.log("Wave 100, 100 cards:", generateWaveStage(100, 'all', null, 100));
console.log("Wave 5, 4 cards:", generateWaveStage(5, 'all', null, 4));
