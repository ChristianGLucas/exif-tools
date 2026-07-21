import exifr from 'exifr';
import { ImageBytes, ParseAllOutput } from '../gen/messages_pb';
import { AxiomContext } from '../gen/axiomContext';
import { toSafeBuffer, classifyParseError, toJsonString, cleanXmpResult } from './lib';

/**
 * Parse every metadata block exifr can find in an image's header bytes —
 * EXIF/TIFF, GPS, IPTC, XMP, and ICC — into one structured object. Each
 * block is returned as a JSON-object string (the tag sets are open-ended and
 * heterogeneous across cameras/software, so JSON is the honest structured
 * representation); a block that wasn't found is an empty string and omitted
 * from blocks_present. For a single well-known block, prefer the more
 * specific ExtractExif/ExtractGps/ExtractIptc/ExtractXmp nodes, which
 * decode common tags into typed fields. Input must be the leading header
 * bytes of the image (no network fetch, no full-file requirement), capped
 * at ~3 MiB. found_any=false with no error means the input parsed as a
 * valid image but carried no recognized metadata segment.
 *
 * @param ax - Platform context: ax.log for logging, ax.secrets for secrets.
 */
export async function parseAll(ax: AxiomContext, input: ImageBytes): Promise<ParseAllOutput> {
  const out = new ParseAllOutput();
  const safe = toSafeBuffer(input);
  if (safe.ok === false) {
    out.setError(safe.error);
    return out;
  }

  try {
    // exifr flattens XMP's namespace properties (dc, photoshop, xmpRights,
    // ...) directly into the result root rather than nesting them under a
    // single "xmp" key — even with mergeOutput:false — so it can't share one
    // exifr.parse() call with the other blocks and still be told apart. Two
    // calls on the same small (<=3 MiB) buffer is a trivial cost.
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
        // Raw tag values, not human-readable translations (e.g. Orientation
        // as 6, not "Rotate 90 CW") — this field is documented as the raw
        // tag set, and ExtractExif already makes the same choice.
        translateValues: false,
      }),
      // ihdr/jfif must be explicitly disabled here too: exifr's PNG file
      // parser enables `ihdr` by default regardless of these options, so a
      // plain PNG with no XMP at all would otherwise come back as
      // {ihdr:{...}} and be mistaken for XMP data.
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

    // exifr's default silentErrors behavior means a truncated/malformed XMP
    // segment comes back as {errors: [...]} instead of throwing or being
    // empty — strip that internal marker so it isn't mistaken for real data.
    const { data: xmpData, onlyErrors: xmpOnlyErrors } = cleanXmpResult(xmp);

    const blocksPresent: string[] = [];

    const exifBlock = { ...(main?.ifd0 ?? {}), ...(main?.exif ?? {}) };
    if (Object.keys(exifBlock).length > 0) {
      blocksPresent.push('exif');
      out.setExifJson(toJsonString(exifBlock));
    }
    if (main?.gps) {
      blocksPresent.push('gps');
      out.setGpsJson(toJsonString(main.gps));
    }
    if (main?.iptc) {
      blocksPresent.push('iptc');
      out.setIptcJson(toJsonString(main.iptc));
    }
    if (!xmpOnlyErrors && Object.keys(xmpData).length > 0) {
      blocksPresent.push('xmp');
      out.setXmpJson(toJsonString(xmpData));
    }
    if (main?.icc) {
      blocksPresent.push('icc');
      out.setIccJson(toJsonString(main.icc));
    }
    if (main?.ifd1 && Object.keys(main.ifd1).length > 0) {
      blocksPresent.push('thumbnail');
    }

    out.setBlocksPresentList(blocksPresent);
    out.setFoundAny(blocksPresent.length > 0);
  } catch (e) {
    out.setError(classifyParseError(e));
  }

  return out;
}
