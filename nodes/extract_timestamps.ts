import exifr from 'exifr';
import { ImageBytes, TimestampData } from '../gen/messages_pb';
import { AxiomContext } from '../gen/axiomContext';
import { toSafeBuffer, classifyParseError, dateToIso, padGpsTimeStamp } from './lib';

/**
 * Gather every capture/modification timestamp EXIF and GPS can carry into
 * one place: DateTimeOriginal (when the picture was actually taken),
 * CreateDate/DateTimeDigitized (when digitized/scanned), ModifyDate (last
 * file modification per EXIF), and the GPS timestamp (UTC, from satellite
 * time — often the most reliable of the four since it doesn't depend on the
 * camera's own clock being set correctly). found=false means none of these
 * were present. Input must be the image's leading header bytes, capped at
 * ~3 MiB.
 *
 * @param ax - Platform context: ax.log for logging, ax.secrets for secrets.
 */
export async function extractTimestamps(ax: AxiomContext, input: ImageBytes): Promise<TimestampData> {
  const out = new TimestampData();
  const safe = toSafeBuffer(input);
  if (safe.ok === false) {
    out.setError(safe.error);
    return out;
  }

  try {
    const result: any = await exifr.parse(safe.buffer, {
      tiff: true,
      exif: true,
      gps: true,
      xmp: false,
      icc: false,
      iptc: false,
      mergeOutput: true,
      sanitize: true,
    });

    if (!result) {
      out.setFound(false);
      return out;
    }

    let found = false;
    if (result.DateTimeOriginal) {
      out.setDateTimeOriginal(dateToIso(result.DateTimeOriginal));
      found = true;
    }
    if (result.CreateDate) {
      out.setDateTimeDigitized(dateToIso(result.CreateDate));
      found = true;
    }
    if (result.ModifyDate) {
      out.setDateTimeModified(dateToIso(result.ModifyDate));
      found = true;
    }
    if (result.GPSDateStamp && result.GPSTimeStamp) {
      const isoDate = String(result.GPSDateStamp).replace(/:/g, '-');
      out.setGpsTimestamp(`${isoDate}T${padGpsTimeStamp(String(result.GPSTimeStamp))}Z`);
      found = true;
    }
    out.setFound(found);
  } catch (e) {
    out.setError(classifyParseError(e));
  }

  return out;
}
