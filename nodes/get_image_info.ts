import exifr from 'exifr';
import { ImageBytes, ImageInfo } from '../gen/messages_pb';
import { AxiomContext } from '../gen/axiomContext';
import { toSafeBuffer, classifyParseError, sniffFormat } from './lib';

/**
 * Basic image dimensions/format read directly from the file header's own
 * structural fields — no pixel decoding. For PNG this is the exact IHDR
 * chunk (width/height/bit depth are authoritative). For JPEG/TIFF this is
 * the EXIF-recorded PixelXDimension/PixelYDimension (JPEG) or native TIFF
 * ImageWidth/ImageHeight tags — reliable for camera-original files, but
 * note these are metadata fields, not a re-measurement of the actual
 * encoded pixels, so an externally-cropped file with stale EXIF can disagree
 * with the true image. found=false means no dimensions could be read from
 * the header at all (e.g. WEBP/GIF/BMP, which this package does not carry
 * a dedicated header parser for beyond format sniffing — detected_format is
 * still set via DetectMetadataBlocks in that case). Input must be the
 * image's leading header bytes, capped at ~3 MiB.
 *
 * @param ax - Platform context: ax.log for logging, ax.secrets for secrets.
 */
export async function getImageInfo(ax: AxiomContext, input: ImageBytes): Promise<ImageInfo> {
  const out = new ImageInfo();
  const safe = toSafeBuffer(input);
  if (safe.ok === false) {
    out.setError(safe.error);
    return out;
  }

  const format = sniffFormat(safe.buffer, input.getFilename());
  out.setFormat(format);

  try {
    const result: any = await exifr.parse(safe.buffer, {
      tiff: true,
      exif: true,
      ihdr: true,
      gps: false,
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

    let width = 0;
    let height = 0;
    let bitDepth = 0;

    // PNG's IHDR chunk is authoritative for its own file.
    if (typeof result.ImageWidth === 'number' && typeof result.ImageHeight === 'number') {
      width = result.ImageWidth;
      height = result.ImageHeight;
    } else if (typeof result.ExifImageWidth === 'number' && typeof result.ExifImageHeight === 'number') {
      width = result.ExifImageWidth;
      height = result.ExifImageHeight;
    }
    if (typeof result.BitDepth === 'number') bitDepth = result.BitDepth;
    else if (typeof result.BitsPerSample === 'number') bitDepth = result.BitsPerSample;
    else if (Array.isArray(result.BitsPerSample) && result.BitsPerSample.length > 0) bitDepth = result.BitsPerSample[0];

    out.setFound(width > 0 && height > 0);
    out.setWidth(width);
    out.setHeight(height);
    out.setBitDepth(bitDepth);
  } catch (e) {
    out.setError(classifyParseError(e));
  }

  return out;
}
