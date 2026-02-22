/**
 * Diff Computation Service
 * Computes minimal edit diff between input and output text
 */

export interface DiffSegment {
  type: 'delete' | 'insert' | 'equal';
  start: number;
  end: number;
  text: string;
}

/**
 * Simple word-based diff computation
 * Returns segments showing what was deleted, inserted, or unchanged
 */
export function computeDiff(original: string, modified: string): DiffSegment[] {
  const originalWords = original.split(/(\s+)/);
  const modifiedWords = modified.split(/(\s+)/);

  const diff: DiffSegment[] = [];
  let originalIndex = 0;
  let modifiedIndex = 0;
  let originalPos = 0;
  let modifiedPos = 0;

  // Simple LCS-based diff
  const lcs = longestCommonSubsequence(originalWords, modifiedWords);
  let lcsIndex = 0;

  while (originalIndex < originalWords.length || modifiedIndex < modifiedWords.length) {
    const originalWord = originalWords[originalIndex];
    const modifiedWord = modifiedWords[modifiedIndex];

    if (lcsIndex < lcs.length && originalWord === lcs[lcsIndex] && modifiedWord === lcs[lcsIndex]) {
      // Equal segment
      if (originalWord) {
        diff.push({
          type: 'equal',
          start: originalPos,
          end: originalPos + originalWord.length,
          text: originalWord,
        });
        originalPos += originalWord.length;
        modifiedPos += modifiedWord.length;
      }
      originalIndex++;
      modifiedIndex++;
      lcsIndex++;
    } else if (originalIndex < originalWords.length && 
               (lcsIndex >= lcs.length || originalWord !== lcs[lcsIndex])) {
      // Delete segment
      if (originalWord) {
        diff.push({
          type: 'delete',
          start: originalPos,
          end: originalPos + originalWord.length,
          text: originalWord,
        });
        originalPos += originalWord.length;
      }
      originalIndex++;
    } else if (modifiedIndex < modifiedWords.length && 
               (lcsIndex >= lcs.length || modifiedWord !== lcs[lcsIndex])) {
      // Insert segment
      if (modifiedWord) {
        diff.push({
          type: 'insert',
          start: modifiedPos,
          end: modifiedPos + modifiedWord.length,
          text: modifiedWord,
        });
        modifiedPos += modifiedWord.length;
      }
      modifiedIndex++;
    } else {
      // Should not reach here, but safety break
      break;
    }
  }

  // Merge consecutive segments of same type
  return mergeConsecutiveSegments(diff);
}

function longestCommonSubsequence(a: string[], b: string[]): string[] {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to find LCS
  const lcs: string[] = [];
  let i = m,
    j = n;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      lcs.unshift(a[i - 1]);
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  return lcs;
}

function mergeConsecutiveSegments(diff: DiffSegment[]): DiffSegment[] {
  if (diff.length === 0) return [];

  const merged: DiffSegment[] = [diff[0]];

  for (let i = 1; i < diff.length; i++) {
    const current = diff[i];
    const last = merged[merged.length - 1];

    if (current.type === last.type && last.end === current.start) {
      // Merge consecutive segments of same type
      last.end = current.end;
      last.text += current.text;
    } else {
      merged.push(current);
    }
  }

  return merged;
}

export default { computeDiff };
