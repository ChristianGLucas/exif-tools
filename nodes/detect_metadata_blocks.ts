import exifr from 'exifr';
import { ImageBytes, BlockPresence } from '../gen/messages_pb';
import { AxiomContext } from '../gen/axiomContext';
import { toSafeBuffer, classifyParseError, sniffFormat, cleanXmpResult } from './lib';

/**
 * Fast presence check for every metadata block type this package can
 * extract (EXIF, GPS, IPTC, XMP, ICC, embedded thumbnail) plus the sniffed
 * container format (jpeg/png/tiff/webp/heic/gif/bmp/unknown) — without
 * decoding any block's actual contents. Use this to decide which of the
 * more specific Extract* nodes are worth calling on a given image. An
 * error is only set when the input can't be parsed as an image at all;
 * every has_* field simply being false is a normal, valid result (most
 * images have no GPS/IPTC block, for instance). Input must be the image's
 * leading header bytes, capped at ~3 MiB.
 *
 * @param ax - Platform context: ax.log for logging, ax.secrets for secrets.
 */
export async function detectMetadataBlocks(ax: AxiomContext, input: ImageBytes): Promise<BlockPresence> {
  const out = new BlockPresence();
  const safe = toSafeBuffer(input);
  if (safe.ok === false) {
    out.setError(safe.error);
    return out;
  }

  out.setDetectedFormat(sniffFormat(safe.buffer, input.getFilename()));

  try {
    // exifr flattens XMP's namespace properties (dc, photoshop, ...) into
    // the result root rather than nesting them under an "xmp" key even with
    // mergeOutput:false, so XMP presence can't be read off the same call as
    // the other blocks — a second, XMP-only call is needed (see ParseAll
    // and ExtractXmp, which hit the same thing).
    const [main, xmp]: [any, any] = await Promise.all([
      exifr.parse(safe.buffer, {
        tiff: true,
        xmp: false,
        icc: true,
        iptc: true,
        exif: true,
        gps: true,
        ifd1: true,
        mergeOutput: false,
        sanitize: true,
      }),
      // ihdr/jfif must be explicitly disabled here too: exifr's PNG file
      // parser enables `ihdr` by default regardless of these options, so a
      // plain PNG with no XMP at all would otherwise come back as
      // {ihdr:{...}} and be mistaken for XMP data (has_xmp:true).
      exifr.parse(safe.buffer, {
        tiff: false,
        xmp: true,
        icc: false,
        iptc: false,
        ihdr: false,
        jfif: false,
        mergeOutput: false,
        sanitize: true,
      }),
    ]);

    const exifPresent = Boolean(
      (main?.ifd0 && Object.keys(main.ifd0).length > 0) ||
      (main?.exif && Object.keys(main.exif).length > 0)
    );
    out.setHasExif(exifPresent);
    out.setHasGps(Boolean(main?.gps && Object.keys(main.gps).length > 0));
    out.setHasIptc(Boolean(main?.iptc && Object.keys(main.iptc).length > 0));
    // exifr's default silentErrors behavior means a truncated/malformed XMP
    // segment comes back as {errors: [...]} instead of throwing — that must
    // not be mistaken for "XMP present".
    const { data: xmpData, onlyErrors: xmpOnlyErrors } = cleanXmpResult(xmp);
    out.setHasXmp(!xmpOnlyErrors && Object.keys(xmpData).length > 0);
    out.setHasIcc(Boolean(main?.icc && Object.keys(main.icc).length > 0));
    out.setHasThumbnail(Boolean(main?.ifd1 && Object.keys(main.ifd1).length > 0));
  } catch (e) {
    out.setError(classifyParseError(e));
  }

  return out;
}
