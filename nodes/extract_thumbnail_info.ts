import exifr from 'exifr';
import { ImageBytes, ThumbnailInfo } from '../gen/messages_pb';
import { AxiomContext } from '../gen/axiomContext';
import { toSafeBuffer, classifyParseError, sniffFormat } from './lib';

function compressionToFormat(code: unknown): string {
  const n = typeof code === 'number' ? code : Number(code);
  if (n === 6 || n === 7) return 'JPEG';
  if (n === 1) return 'Uncompressed';
  return n ? `Unknown(${n})` : '';
}

/**
 * Report metadata ABOUT an embedded EXIF thumbnail — its pixel dimensions,
 * encoding, and declared byte length — WITHOUT returning the thumbnail's
 * own bytes (which would work against the same ~3 MiB input budget this
 * whole package is designed to stay under; use exifr's own
 * `exifr.thumbnail()` directly if you actually need the bytes and can
 * afford to send more of the file). found=false means the file's EXIF/TIFF
 * block declares no embedded thumbnail (most non-JPEG files, and many
 * software-re-encoded JPEGs). `offset_in_input`/`bytes_available_in_input`
 * are only computable when the caller's buffer IS a raw .tiff file (where
 * the TIFF header starts at byte 0); for JPEG's APP1-wrapped TIFF payload,
 * the TIFF segment's own start offset within the file isn't part of
 * exifr's stable public output, so offset_in_input is reported as -1
 * rather than guessed. Input must be the image's leading header bytes,
 * capped at ~3 MiB.
 *
 * @param ax - Platform context: ax.log for logging, ax.secrets for secrets.
 */
export async function extractThumbnailInfo(ax: AxiomContext, input: ImageBytes): Promise<ThumbnailInfo> {
  const out = new ThumbnailInfo();
  const safe = toSafeBuffer(input);
  if (safe.ok === false) {
    out.setError(safe.error);
    return out;
  }

  const format = sniffFormat(safe.buffer);

  try {
    const result: any = await exifr.parse(safe.buffer, {
      tiff: true,
      exif: false,
      gps: false,
      xmp: false,
      icc: false,
      iptc: false,
      ifd1: true,
      mergeOutput: false,
      sanitize: true,
    }).then((r: any) => r?.ifd1);

    if (!result || typeof result.ThumbnailOffset !== 'number' || typeof result.ThumbnailLength !== 'number') {
      out.setFound(false);
      return out;
    }

    out.setFound(true);
    if (typeof result.ImageWidth === 'number') out.setWidth(result.ImageWidth);
    if (typeof result.ImageHeight === 'number') out.setHeight(result.ImageHeight);
    out.setFormat(compressionToFormat(result.Compression));
    out.setByteLength(result.ThumbnailLength);

    if (format === 'tiff') {
      // Raw .tiff/.iiq: the TIFF header IS the start of the supplied
      // buffer, so ThumbnailOffset (TIFF-header-relative, per spec) is
      // already an offset into the caller's buffer.
      const offset = result.ThumbnailOffset;
      out.setOffsetInInput(offset);
      out.setBytesAvailableInInput(offset >= 0 && offset + result.ThumbnailLength <= safe.buffer.length);
    } else {
      out.setOffsetInInput(-1);
      out.setBytesAvailableInInput(false);
    }
  } catch (e) {
    out.setError(classifyParseError(e));
  }

  return out;
}
