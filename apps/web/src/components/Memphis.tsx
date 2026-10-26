/**
 * Memphis accent — the ONLY ornaments allowed on the site (design.md §0.2).
 * Pieces are taken from the shared sprite /memphis-set.svg via fragment ids.
 * Rule: 1–3 pieces per screen, placed in whitespace only.
 */

export type MemphisId =
  | 'wave-1'
  | 'wave-2'
  | 'dots-1'
  | 'dots-2'
  | 'tri-1'
  | 'tri-2'
  | 'ring'
  | 'cross'
  | 'zigzag';

/** Each piece lives in a 240×160 cell of the 960×640 sprite. */
const CELLS: Record<MemphisId, string> = {
  'wave-1': '0 0 240 160',
  'dots-1': '240 0 240 160',
  'tri-1': '480 0 240 160',
  ring: '720 0 240 160',
  'wave-2': '0 160 240 160',
  'dots-2': '240 160 240 160',
  'tri-2': '480 160 240 160',
  cross: '720 160 240 160',
  zigzag: '0 320 240 160',
};

export default function Memphis({ id, className }: { id: MemphisId; className?: string }) {
  return (
    <svg viewBox={CELLS[id]} className={className} aria-hidden="true" focusable="false">
      <use href={`/memphis-set.svg#${id}`} />
    </svg>
  );
}
