import exifr from 'exifr';
import { ImageBytes, CameraInfo } from '../gen/messages_pb';
import { AxiomContext } from '../gen/axiomContext';
import { toSafeBuffer, classifyParseError } from './lib';

/**
 * Extract a normalized camera/lens identity summary: Make, Model,
 * LensMake, LensModel, Software, and (when present — note this is
 * PII-like and callers should treat it accordingly) the camera body's
 * SerialNumber, plus a human-readable one-line summary ("<make> <model>"
 * with " + <lens>" appended when a lens is identified). found=false means
 * neither a camera Make nor Model was present. Input must be the image's
 * leading header bytes, capped at ~3 MiB.
 *
 * @param ax - Platform context: ax.log for logging, ax.secrets for secrets.
 */
export async function extractCameraInfo(ax: AxiomContext, input: ImageBytes): Promise<CameraInfo> {
  const out = new CameraInfo();
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
    });

    const make = result?.Make ? String(result.Make).trim() : '';
    const model = result?.Model ? String(result.Model).trim() : '';
    if (!make && !model) {
      out.setFound(false);
      return out;
    }

    out.setFound(true);
    out.setMake(make);
    out.setModel(model);
    if (result.LensMake) out.setLensMake(String(result.LensMake));
    if (result.LensModel) out.setLensModel(String(result.LensModel));
    if (result.Software) out.setSoftware(String(result.Software));
    if (result.SerialNumber) out.setBodySerialNumber(String(result.SerialNumber));

    let summary = [make, model].filter(Boolean).join(' ');
    if (result.LensModel) summary += ` + ${String(result.LensModel)}`;
    out.setSummary(summary);
  } catch (e) {
    out.setError(classifyParseError(e));
  }

  return out;
}
