/**
 * Word-level diff utility using Longest Common Subsequence (LCS) algorithm
 * Provides both visual diff tokens and unified diff format for storage
 */

export interface DiffToken {
  type: 'unchanged' | 'deleted' | 'added';
  text: string;
}

export interface UnifiedDiff {
  visualTokens: DiffToken[];
  unifiedFormat: string;
}

/**
 * Tokenize text into words while preserving whitespace
 * Returns array of tokens where each token is either a word or whitespace
 */
export function tokenize(text: string): string[] {
  if (!text) return [];

  const tokens: string[] = [];
  const regex = /(\S+|\s+)/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    tokens.push(match[0]);
  }

  return tokens;
}

/**
 * Compute LCS (Longest Common Subsequence) table using dynamic programming
 * Returns 2D array where dp[i][j] represents length of LCS for a[0..i-1] and b[0..j-1]
 */
export function computeLCSTable(a: string[], b: string[]): number[][] {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array(m + 1).fill(0).map(() => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  return dp;
}

/**
 * Build diff tokens by backtracking through LCS table
 * Returns array of diff tokens showing deletions, additions, and unchanged parts
 */
export function buildDiffTokens(a: string[], b: string[], dp: number[][]): DiffToken[] {
  const tokens: DiffToken[] = [];
  let i = a.length;
  let j = b.length;

  // Backtrack through DP table to build diff
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      // Match - add to front since we're backtracking
      tokens.unshift({ type: 'unchanged', text: a[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      // Addition in b
      tokens.unshift({ type: 'added', text: b[j - 1] });
      j--;
    } else if (i > 0) {
      // Deletion from a
      tokens.unshift({ type: 'deleted', text: a[i - 1] });
      i--;
    }
  }

  return tokens;
}

/**
 * Generate unified diff format string (similar to git diff)
 * Used for storage in provenance events
 */
export function generateUnifiedFormat(original: string, proposed: string): string {
  const aTokens = tokenize(original);
  const bTokens = tokenize(proposed);
  const dp = computeLCSTable(aTokens, bTokens);
  const diffTokens = buildDiffTokens(aTokens, bTokens, dp);

  const lines: string[] = [];
  lines.push('--- original');
  lines.push('+++ proposed');

  // Count total changes for header
  const deletions = diffTokens.filter(t => t.type === 'deleted').length;
  const additions = diffTokens.filter(t => t.type === 'added').length;

  if (deletions > 0 || additions > 0) {
    lines.push(`@@ -1,${aTokens.length} +1,${bTokens.length} @@`);

    // Group consecutive tokens of same type for cleaner output
    let currentLine = '';
    let currentType: 'unchanged' | 'deleted' | 'added' | null = null;

    for (const token of diffTokens) {
      if (token.type !== currentType) {
        if (currentLine) {
          lines.push(currentLine);
        }
        currentType = token.type;
        currentLine = token.type === 'deleted' ? '-' : token.type === 'added' ? '+' : ' ';
      }
      currentLine += token.text;
    }

    if (currentLine) {
      lines.push(currentLine);
    }
  }

  return lines.join('\n');
}

/**
 * Compute word-level diff between original and proposed text
 * Returns both visual tokens for UI rendering and unified format for storage
 */
export function computeWordDiff(original: string, proposed: string): UnifiedDiff {
  const aTokens = tokenize(original);
  const bTokens = tokenize(proposed);
  const dp = computeLCSTable(aTokens, bTokens);
  const visualTokens = buildDiffTokens(aTokens, bTokens, dp);
  const unifiedFormat = generateUnifiedFormat(original, proposed);

  return {
    visualTokens,
    unifiedFormat
  };
}

/**
 * Helper to merge consecutive tokens of the same type
 * Useful for cleaner visual display
 */
export function mergeAdjacentTokens(tokens: DiffToken[]): DiffToken[] {
  if (tokens.length === 0) return [];

  const merged: DiffToken[] = [];
  let current = { ...tokens[0] };

  for (let i = 1; i < tokens.length; i++) {
    if (tokens[i].type === current.type) {
      current.text += tokens[i].text;
    } else {
      merged.push(current);
      current = { ...tokens[i] };
    }
  }
  merged.push(current);

  return merged;
}
