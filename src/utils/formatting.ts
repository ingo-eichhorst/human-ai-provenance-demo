import { ProvenanceEvent } from '../types/provenance';

export function truncateHash(hash: string, length = 16): string {
  if (hash.length <= length) return hash;
  const halfLength = Math.floor(length / 2);
  return `${hash.slice(0, halfLength)}...${hash.slice(-halfLength)}`;
}

export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

export function formatEventSummary(event: ProvenanceEvent): string {
  const maxLength = 50;
  const beforePreview = event.beforeText.length > 20
    ? event.beforeText.slice(0, 20) + '...'
    : event.beforeText;
  const afterPreview = event.afterText.length > 20
    ? event.afterText.slice(0, 20) + '...'
    : event.afterText;
  const summary = `Replaced "${beforePreview}" with "${afterPreview}"`;
  return summary.length > maxLength
    ? summary.slice(0, maxLength) + '...'
    : summary;
}
