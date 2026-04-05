/**
 * Fuzzy match: checks if all characters of `query` appear in `text` in order.
 * Returns a score (lower is better) or Infinity if no match.
 * 
 * Scoring favors:
 * - Consecutive character matches (less gaps = better)
 * - Matches at word boundaries (after _, after lowercase→uppercase transitions)
 * - Matches near the start of the string
 */
export function fuzzyMatch(text: string, query: string): number {
  const textLower = text.toLowerCase();
  const queryLower = query.toLowerCase();

  // Quick check: all query chars must exist in text
  let qi = 0;
  for (let ti = 0; ti < textLower.length && qi < queryLower.length; ti++) {
    if (textLower[ti] === queryLower[qi]) qi++;
  }
  if (qi < queryLower.length) return Infinity;

  // Score the match quality
  let score = 0;
  let textIdx = 0;
  let prevMatchIdx = -1;

  for (let i = 0; i < queryLower.length; i++) {
    const ch = queryLower[i];
    
    // Find next occurrence of this character
    let bestPos = -1;
    let bestPosScore = Infinity;
    
    for (let t = textIdx; t < textLower.length; t++) {
      if (textLower[t] !== ch) continue;
      
      let posScore = 0;
      
      // Penalty for gap between consecutive matches
      if (prevMatchIdx >= 0) {
        const gap = t - prevMatchIdx - 1;
        posScore += gap * 2;
      }
      
      // Bonus for word boundary match (after _ or camelCase transition)
      if (t === 0) {
        posScore -= 5;
      } else if (text[t - 1] === '_' || text[t - 1] === '.') {
        posScore -= 3;
      } else if (text[t] !== text[t].toLowerCase() && text[t - 1] === text[t - 1].toLowerCase()) {
        // camelCase boundary
        posScore -= 2;
      }
      
      // Penalty for distance from start
      posScore += t * 0.1;
      
      if (posScore < bestPosScore) {
        bestPosScore = posScore;
        bestPos = t;
      }
      
      // If we found an adjacent match, that's likely optimal
      if (prevMatchIdx >= 0 && t === prevMatchIdx + 1) break;
    }
    
    if (bestPos === -1) return Infinity;
    
    score += bestPosScore;
    prevMatchIdx = bestPos;
    textIdx = bestPos + 1;
  }

  // Bonus for exact prefix match
  if (textLower.startsWith(queryLower)) {
    score -= queryLower.length * 5;
  }

  // Penalty for length difference (prefer shorter names that match)
  score += (text.length - query.length) * 0.5;

  return score;
}

/**
 * Check if text fuzzy-matches the query. Simple boolean version.
 */
export function fuzzyContains(text: string, query: string): boolean {
  return isFinite(fuzzyMatch(text, query));
}

/**
 * Sort items by fuzzy match quality. Items that don't match are excluded.
 */
export function fuzzySort<T>(
  items: T[],
  getText: (item: T) => string,
  query: string,
): T[] {
  return items
    .map((item) => ({ item, score: fuzzyMatch(getText(item), query) }))
    .filter((x) => isFinite(x.score))
    .sort((a, b) => a.score - b.score)
    .map((x) => x.item);
}
