import exifr from 'exifr';
import { ImageBytes, XmpData } from '../gen/messages_pb';
import { AxiomContext } from '../gen/axiomContext';
import { toSafeBuffer, classifyParseError, toJsonString, cleanXmpResult } from './lib';

/**
 * Extract the XMP packet (Adobe's RDF/XML metadata format) into a
 * structured JSON object — XMP's own data model is open-ended RDF, so a
 * JSON string is the honest structured representation rather than forcing
 * it into a fixed proto shape. Parsed as data only: this node never
 * resolves external XML entities and never follows any URL or reference an
 * XMP packet may contain (no XXE, no SSRF) — exifr's XMP parser is a
 * minimal, dependency-free reader with no DTD/entity support at all.
 * found=false (no error) means the image parsed but carried no *usable*
 * XMP packet — this includes both "no XMP segment at all" and "an XMP
 * segment was present but truncated/malformed" (exifr fails XMP silently
 * rather than throwing, so a truncated packet is indistinguishable from
 * absence at this node's contract level; ParseAll's overall parse would
 * still separately fail if the WHOLE input were unparseable). Input must
 * be the image's leading header bytes, capped at ~3 MiB.
 *
 * @param ax - Platform context: ax.log for logging, ax.secrets for secrets.
 */
export async function extractXmp(ax: AxiomContext, input: ImageBytes): Promise<XmpData> {
  const out = new XmpData();
  const safe = toSafeBuffer(input);
  if (safe.ok === false) {
    out.setError(safe.error);
    return out;
  }

  try {
    // exifr flattens XMP's namespace properties (dc, photoshop, xmpRights,
    // ...) directly into the parse result's root rather than nesting them
    // under a single "xmp" key. Disabling every other segment means
    // whatever comes back IS the XMP data, grouped by namespace prefix.
    const raw: any = await exifr.parse(safe.buffer, {
      tiff: false,
      iptc: false,
      icc: false,
      xmp: true,
      mergeOutput: false,
      sanitize: true,
    });

    // exifr's default silentErrors behavior means a truncated/malformed
    // XMP segment does not throw — it comes back as {errors: [...]}
    // instead of real properties. Strip that internal marker; treat
    // "nothing but the error marker" the same as "not present".
    const { data, onlyErrors } = cleanXmpResult(raw);
    if (onlyErrors || Object.keys(data).length === 0) {
      out.setFound(false);
      return out;
    }

    out.setFound(true);
    out.setXmpJson(toJsonString(data));
  } catch (e) {
    out.setError(classifyParseError(e));
  }

  return out;
}
