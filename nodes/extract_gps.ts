import exifr from 'exifr';
import { ImageBytes, GpsData } from '../gen/messages_pb';
import { AxiomContext } from '../gen/axiomContext';
import { toSafeBuffer, classifyParseError, toJsonString, padGpsTimeStamp } from './lib';

/**
 * Extract the GPS block and return DECODED decimal latitude/longitude
 * (signed degrees, negative = South/West) plus altitude, speed, direction
 * and GPS timestamp when present — independent of the raw sexagesimal
 * (degrees/minutes/seconds) EXIF GPS tags. found=false (with no error)
 * means the image parsed but carried no usable GPS coordinates — this is
 * the common case for the large majority of photos, which have no GPS
 * block at all. Input must be the image's leading header bytes.
 *
 * @param ax - Platform context: ax.log for logging, ax.secrets for secrets.
 */
export async function extractGps(ax: AxiomContext, input: ImageBytes): Promise<GpsData> {
  const out = new GpsData();
  const safe = toSafeBuffer(input);
  if (safe.ok === false) {
    out.setError(safe.error);
    return out;
  }

  try {
    const gps: any = await exifr.parse(safe.buffer, {
      tiff: true,
      exif: false,
      gps: true,
      xmp: false,
      icc: false,
      iptc: false,
      mergeOutput: false,
      sanitize: true,
    }).then((r: any) => r?.gps);

    if (!gps || typeof gps.latitude !== 'number' || typeof gps.longitude !== 'number') {
      out.setFound(false);
      return out;
    }

    out.setFound(true);
    out.setLatitude(gps.latitude);
    out.setLongitude(gps.longitude);

    if (typeof gps.GPSAltitude === 'number') {
      out.setHasAltitude(true);
      const belowSeaLevel = gps.GPSAltitudeRef === 1 || gps.GPSAltitudeRef === '1';
      out.setAltitudeMeters(belowSeaLevel ? -gps.GPSAltitude : gps.GPSAltitude);
    }
    if (typeof gps.GPSSpeed === 'number') {
      out.setHasSpeed(true);
      out.setSpeed(gps.GPSSpeed);
      if (gps.GPSSpeedRef) out.setSpeedRef(String(gps.GPSSpeedRef));
    }
    if (typeof gps.GPSImgDirection === 'number') {
      out.setHasDirection(true);
      out.setDirectionDegrees(gps.GPSImgDirection);
      if (gps.GPSImgDirectionRef) out.setDirectionRef(String(gps.GPSImgDirectionRef));
    }
    if (gps.GPSDateStamp && gps.GPSTimeStamp) {
      // GPSDateStamp is raw EXIF-format "YYYY:MM:DD"; GPSTimeStamp is
      // colon-joined by exifr's reviver but NOT zero-padded (real cameras
      // can produce "14:27:7.24"). Normalize both into a real ISO 8601 UTC
      // timestamp.
      const isoDate = String(gps.GPSDateStamp).replace(/:/g, '-');
      out.setTimestamp(`${isoDate}T${padGpsTimeStamp(String(gps.GPSTimeStamp))}Z`);
    }
    out.setGpsJson(toJsonString(gps));
  } catch (e) {
    out.setError(classifyParseError(e));
  }

  return out;
}
