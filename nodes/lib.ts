// Shared helpers for christiangeorgelucas/exif-tools.
//
// SECURITY NOTE (read before touching this file):
// exifr's `file` argument accepts a `string` and, when it does, will treat it
// as a filesystem path OR fetch it as a URL (see exifr/src/reader.mjs:
// readString() -> fs read / fetch()) depending on its shape. This package's
// whole contract is "bytes in, structured metadata out, no network, no
// filesystem" — so every call into exifr in this package MUST pass a Buffer
// (Uint8Array), never a string. `toSafeBuffer` below is the only sanctioned
// way to turn a node's `ImageBytes` input into something exifr may parse:
// it always returns a Buffer, never forwards `filename` or any other string
// into exifr. Do not "helpfully" pass input.getFilename() to exifr — that
// reopens the SSRF/path-traversal hole this helper exists to close.

import { ImageBytes, MetadataError } from '../gen/messages_pb';

/** Hard cap on accepted input size. Axiom's node transport caps a single
 * message at ~4 MiB; we reject above 3 MiB (3,145,728 bytes) so there is
 * headroom for the rest of the envelope and so a caller gets a clear,
 * structured reason instead of a transport-level failure. EXIF/IPTC/XMP/ICC
 * segments live in the file HEADER, so the caller is expected to send a
 * leading prefix of the file, not the whole photo — see ImageBytes's doc
 * comment in messages.proto. */
export const MAX_INPUT_BYTES = 3 * 1024 * 1024;

export function newError(code: string, message: string): MetadataError {
  const err = new MetadataError();
  err.setCode(code);
  err.setMessage(message);
  return err;
}

export type SafeBufferResult =
  | { ok: true; buffer: Buffer }
  | { ok: false; error: MetadataError };

/** Validate + convert an ImageBytes input into a Buffer safe to hand to
 * exifr. Never returns/forwards a string. */
export function toSafeBuffer(input: ImageBytes): SafeBufferResult {
  const bytes = input.getData_asU8();
  if (!bytes || bytes.length === 0) {
    return { ok: false, error: newError('EMPTY_INPUT', 'data is empty — supply at least the leading header bytes of the image file') };
  }
  if (bytes.length > MAX_INPUT_BYTES) {
    return {
      ok: false,
      error: newError(
        'INPUT_TOO_LARGE',
        `data is ${bytes.length} bytes, exceeding the ${MAX_INPUT_BYTES}-byte cap; metadata segments live in the file header, so send a smaller leading prefix of the file rather than the whole image`
      ),
    };
  }
  return { ok: true, buffer: Buffer.from(bytes) };
}

/** JSON.stringify replacer that makes exifr's output (which can contain
 * Date objects and, for a few binary tags like MakerNote/UserComment,
 * Buffer/Uint8Array values) safe to serialize deterministically instead of
 * throwing or dumping raw binary into the JSON string. */
export function metadataJsonReplacer(_key: string, value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Uint8Array) return `<binary:${value.length} bytes>`;
  if (typeof value === 'bigint') return value.toString();
  return value;
}

export function toJsonString(obj: unknown): string {
  if (obj === undefined || obj === null) return '';
  try {
    const s = JSON.stringify(obj, metadataJsonReplacer);
    return s === undefined ? '' : s;
  } catch {
    return '';
  }
}

/** Classify a thrown error from exifr into one of this package's stable
 * error codes. exifr throws plain Errors with free-text messages, not typed
 * exceptions, so this is a best-effort message-based classification — the
 * fallback (MALFORMED_IMAGE) is always a safe, honest answer. */
export function classifyParseError(e: unknown): MetadataError {
  const msg = e instanceof Error ? e.message : String(e);
  const lower = msg.toLowerCase();
  if (lower.includes('unknown file format') || lower.includes('invalid input argument') || lower.includes('unsupported')) {
    return newError('UNSUPPORTED_FORMAT', msg);
  }
  if (lower.includes('truncated') || lower.includes('unexpected end') || lower.includes('out of range') || lower.includes('outside of file')) {
    return newError('TRUNCATED_INPUT', `the supplied bytes appear to be an incomplete header — include more of the file's leading bytes: ${msg}`);
  }
  return newError('MALFORMED_IMAGE', msg);
}

/** Format an exposure time in seconds as a fraction, matching common camera
 * UI conventions (e.g. 0.002 -> "1/500", 2 -> "2\""). */
export function formatExposureTime(seconds: number): string {
  if (!seconds || seconds <= 0) return '';
  if (seconds >= 1) return `${Number(seconds.toFixed(1))}s`;
  const denom = Math.round(1 / seconds);
  return `1/${denom}`;
}

/** exifr's GPSTimeStamp reviver joins the raw HH/MM/SS.ss rational values
 * with ':' but does not zero-pad them (real cameras can produce e.g.
 * "14:27:7.24"), which is not valid ISO 8601. Re-pad each component so the
 * combined GPS date+time we emit is actually the ISO 8601 this package
 * documents. Returns the input unchanged if it doesn't look like H:M:S. */
export function padGpsTimeStamp(raw: string): string {
  const m = /^(\d{1,2}):(\d{1,2}):(\d{1,2}(?:\.\d+)?)$/.exec(raw);
  if (!m) return raw;
  const [, h, mi, s] = m;
  const secNum = Number(s);
  const secPadded = secNum < 10 ? `0${s}` : s;
  return `${h.padStart(2, '0')}:${mi.padStart(2, '0')}:${secPadded}`;
}

export function dateToIso(value: unknown): string {
  if (value instanceof Date && !isNaN(value.getTime())) return value.toISOString();
  if (typeof value === 'string') return value;
  return '';
}

/** Sniff the container format from magic bytes at the start of the buffer.
 * This is deliberately independent of exifr (which is a metadata parser,
 * not a general file-type sniffer) and only needs the same small header
 * prefix every node in this package already requires. Returns 'unknown'
 * rather than throwing on anything unrecognized. */
export function sniffFormat(buf: Buffer): string {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg';
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) return 'png';
  if (buf.length >= 4 && buf[0] === 0x49 && buf[1] === 0x49 && buf[2] === 0x2a && buf[3] === 0x00) return 'tiff';
  if (buf.length >= 4 && buf[0] === 0x4d && buf[1] === 0x4d && buf[2] === 0x00 && buf[3] === 0x2a) return 'tiff';
  if (
    buf.length >= 12 &&
    buf.toString('ascii', 0, 4) === 'RIFF' &&
    buf.toString('ascii', 8, 12) === 'WEBP'
  ) return 'webp';
  if (buf.length >= 6 && (buf.toString('ascii', 0, 6) === 'GIF87a' || buf.toString('ascii', 0, 6) === 'GIF89a')) return 'gif';
  if (buf.length >= 2 && buf[0] === 0x42 && buf[1] === 0x4d) return 'bmp';
  if (buf.length >= 12 && buf.toString('ascii', 4, 8) === 'ftyp') {
    const brand = buf.toString('ascii', 8, 12);
    if (brand.startsWith('avif') || brand.startsWith('avis')) return 'avif';
    if (brand.startsWith('heic') || brand.startsWith('heix') || brand.startsWith('hevc') || brand.startsWith('mif1') || brand.startsWith('heim') || brand.startsWith('heis')) return 'heic';
    return 'heif';
  }
  return 'unknown';
}
