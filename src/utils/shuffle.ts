/**
 * Algorithme de mélange équitable de Fisher-Yates (Knuth Shuffle).
 * Garantit une permutation uniforme et équiprobable de tous les éléments sans biais statistique.
 */
export function fisherYatesShuffle<T>(array: readonly T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }
  return result;
}
