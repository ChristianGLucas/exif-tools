import exifr from 'exifr';
import { ImageBytes, ExifData } from '../gen/messages_pb';
import { AxiomContext } from '../gen/axiomContext';
import { toSafeBuffer, classifyParseError, toJsonString, formatExposureTime, dateToIso } from './lib';

/**
 * Extract the EXIF/TIFF camera & exposure tags — Make, Model, LensModel,
 * Software, ExposureTime, FNumber, ISO, FocalLength (+ 35mm-equivalent),
 * Orientation, the three EXIF date/time tags, ColorSpace, and the
 * EXIF-reported image dimensions — as typed fields, plus the complete raw
 * EXIF/TIFF tag set as a JSON string for anything not promoted to a field.
 * found=false with no error means the image parsed but carried no EXIF/TIFF
 * block at all (common for PNGs/screenshots/web-re-encoded photos). Input
 * must be the image's leading header bytes, capped at ~3 MiB.
 *
 * @param ax - Platform context: ax.log for logging, ax.secrets for secrets.
 */
export async function extractExif(ax: AxiomContext, input: ImageBytes): Promise<ExifData> {
  const out = new ExifData();
  const safe = toSafeBuffer(input);
  if (safe.ok === false) {
    out.setError(safe.error);
    return out;
  }

  try {
    const result: any = await exifr.parse(safe.buffer, {
      tiff: true,
      exif: true,
      gps: false,
      xmp: false,
      icc: false,
      iptc: false,
      mergeOutput: true,
      sanitize: true,
      // Keep translateKeys (named keys like "Orientation") but disable
      // translateValues: some tags (notably Orientation) have a
      // human-readable string dictionary ("Rotate 90 CW") that would
      // otherwise silently replace the raw 1-8 code this node promises.
      translateValues: false,
    });

    if (!result || Object.keys(result).length === 0) {
      out.setFound(false);
      return out;
    }

    out.setFound(true);
    if (result.Make) out.setMake(String(result.Make));
    if (result.Model) out.setModel(String(result.Model));
    if (result.Software) out.setSoftware(String(result.Software));
    if (result.LensModel) out.setLensModel(String(result.LensModel));
    if (typeof result.ExposureTime === 'number') {
      out.setExposureTime(result.ExposureTime);
      out.setExposureTimeFormatted(formatExposureTime(result.ExposureTime));
    }
    if (typeof result.FNumber === 'number') out.setFNumber(result.FNumber);
    if (typeof result.ISO === 'number') out.setIso(result.ISO);
    if (typeof result.FocalLength === 'number') out.setFocalLengthMm(result.FocalLength);
    if (typeof result.FocalLengthIn35mmFormat === 'number') out.setFocalLength35mmMm(result.FocalLengthIn35mmFormat);
    if (typeof result.Orientation === 'number') out.setOrientation(result.Orientation);
    if (result.DateTimeOriginal) out.setDateTimeOriginal(dateToIso(result.DateTimeOriginal));
    if (result.CreateDate) out.setDateTimeDigitized(dateToIso(result.CreateDate));
    if (result.ModifyDate) out.setDateTime(dateToIso(result.ModifyDate));
    if (result.ColorSpace !== undefined) out.setColorSpace(String(result.ColorSpace));
    if (typeof result.ExifImageWidth === 'number') out.setExifImageWidth(result.ExifImageWidth);
    if (typeof result.ExifImageHeight === 'number') out.setExifImageHeight(result.ExifImageHeight);
    out.setExifJson(toJsonString(result));
  } catch (e) {
    out.setError(classifyParseError(e));
  }

  return out;
}
