import exifr from 'exifr';
import { ImageBytes, OrientationInfo } from '../gen/messages_pb';
import { AxiomContext } from '../gen/axiomContext';
import { toSafeBuffer, classifyParseError } from './lib';

// The EXIF orientation tag (1-8) decoded into the concrete transform a
// viewer must apply to display the image upright: rotate clockwise by
// `deg`, and mirror horizontally/vertically per flipH/flipV. This is the
// standard, unambiguous EXIF Orientation table (TIFF tag 0x0112) — not
// something exifr or this package computes, just how the 8 defined values
// are conventionally interpreted.
const ORIENTATION_TABLE: Record<number, { deg: number; flipH: boolean; flipV: boolean; description: string }> = {
  1: { deg: 0, flipH: false, flipV: false, description: 'Normal — no rotation or mirroring needed' },
  2: { deg: 0, flipH: true, flipV: false, description: 'Mirror horizontal' },
  3: { deg: 180, flipH: false, flipV: false, description: 'Rotate 180°' },
  4: { deg: 180, flipH: true, flipV: false, description: 'Mirror horizontal and rotate 180°' },
  5: { deg: 90, flipH: true, flipV: false, description: 'Mirror horizontal and rotate 90° CW' },
  6: { deg: 90, flipH: false, flipV: false, description: 'Rotate 90° CW' },
  7: { deg: 270, flipH: true, flipV: false, description: 'Mirror horizontal and rotate 270° CW' },
  8: { deg: 270, flipH: false, flipV: false, description: 'Rotate 270° CW' },
};

/**
 * Extract the raw EXIF orientation tag (1-8) and decode it into the
 * concrete rotation (clockwise degrees: one of 0/90/180/270) and mirroring
 * a viewer must apply to display the image upright — per the standard EXIF
 * Orientation table. found=false means no orientation tag was present; the
 * output still reports orientation=1 (rotation_degrees=0, no flip) since
 * that IS the EXIF-defined default meaning of "absent", but note that
 * default was not actually asserted by the file. Input must be the image's
 * leading header bytes.
 *
 * @param ax - Platform context: ax.log for logging, ax.secrets for secrets.
 */
export async function getOrientation(ax: AxiomContext, input: ImageBytes): Promise<OrientationInfo> {
  const out = new OrientationInfo();
  const safe = toSafeBuffer(input);
  if (safe.ok === false) {
    out.setError(safe.error);
    return out;
  }

  try {
    const raw = await exifr.orientation(safe.buffer);
    const value = typeof raw === 'number' && ORIENTATION_TABLE[raw] ? raw : 1;
    const entry = ORIENTATION_TABLE[value];

    out.setFound(typeof raw === 'number' && ORIENTATION_TABLE[raw] !== undefined);
    out.setOrientation(value);
    out.setRotationDegrees(entry.deg);
    out.setFlipHorizontal(entry.flipH);
    out.setFlipVertical(entry.flipV);
    out.setDescription(entry.description);
  } catch (e) {
    out.setError(classifyParseError(e));
  }

  return out;
}
