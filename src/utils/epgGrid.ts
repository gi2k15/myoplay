// Horizontal placement of a programme inside the guide window, in px; null when it falls outside
export function guideBlock(start: number, stop: number, winStart: number, winEnd: number, pxPerMin: number) {
  const s = Math.max(start, winStart);
  const e = Math.min(stop, winEnd);
  if (e <= s) return null;
  return { left: ((s - winStart) / 60000) * pxPerMin, width: ((e - s) / 60000) * pxPerMin };
}
