import { ImageBytes } from '../gen/messages_pb';
import { extractExif } from './extract_exif';
import { testContext } from './testdata/context';
import { buildFullJpeg, buildBareJpeg, buildPng, KNOWN } from './testdata/fixtures';

function makeInput(data: Buffer): ImageBytes {
  const input = new ImageBytes();
  input.setData(data);
  return input;
}

describe('ExtractExif', () => {
  it('decodes camera/exposure tags to exactly the hand-encoded fixture values', async () => {
    const result = await extractExif(testContext, makeInput(buildFullJpeg()));
    expect(result.getError()).toBeUndefined();
    expect(result.getFound()).toBe(true);
    expect(result.getMake()).toBe(KNOWN.make);
    expect(result.getModel()).toBe(KNOWN.model);
    expect(result.getSoftware()).toBe(KNOWN.software);
    expect(result.getLensModel()).toBe(KNOWN.lensModel);
    expect(result.getExposureTime()).toBeCloseTo(KNOWN.exposureTimeNum / KNOWN.exposureTimeDen, 6);
    expect(result.getExposureTimeFormatted()).toBe('1/500');
    expect(result.getFNumber()).toBeCloseTo(KNOWN.fNumberNum / KNOWN.fNumberDen, 6);
    expect(result.getIso()).toBe(KNOWN.iso);
    expect(result.getFocalLengthMm()).toBeCloseTo(KNOWN.focalLengthNum / KNOWN.focalLengthDen, 6);
    expect(result.getFocalLength35mmMm()).toBe(KNOWN.focalLength35mm);
    expect(result.getOrientation()).toBe(KNOWN.orientation);
    expect(result.getColorSpace()).toBe(String(KNOWN.colorSpace));
    expect(result.getExifImageWidth()).toBe(KNOWN.pixelXDimension);
    expect(result.getExifImageHeight()).toBe(KNOWN.pixelYDimension);
    expect(result.getDateTimeOriginal()).toContain('2024');

    const raw = JSON.parse(result.getExifJson());
    expect(raw.LensMake).toBe(KNOWN.lensMake);
  });

  it('never leaks GPS data into exif_json, even though the fixture has a GPS block (regression)', async () => {
    // exifr does not fully honor gps:false when tiff+exif are both true with
    // mergeOutput:true — GPS keys (and the derived latitude/longitude) leak
    // into the merged result regardless. This node is EXIF-only by
    // contract; GPS belongs to ExtractGps. Found by independent review.
    const result = await extractExif(testContext, makeInput(buildFullJpeg()));
    const raw = JSON.parse(result.getExifJson());
    const leakedKeys = Object.keys(raw).filter((k) => k.startsWith('GPS') || k === 'latitude' || k === 'longitude');
    expect(leakedKeys).toEqual([]);
  });

  it('found=false (no error) for a JPEG with no EXIF block', async () => {
    const result = await extractExif(testContext, makeInput(buildBareJpeg()));
    expect(result.getError()).toBeUndefined();
    expect(result.getFound()).toBe(false);
  });

  it('found=false for a plain PNG, not the PNG IHDR chunk mislabeled as EXIF (regression)', async () => {
    // exifr's PNG file parser enables `ihdr` by default regardless of the
    // options this node passes — a bare PNG with NO real EXIF data used to
    // come back found=true with exif_json full of the PNG's own IHDR fields
    // (ImageWidth/BitDepth/ColorType/...) mislabeled as EXIF. No
    // truncation/crafting needed: any ordinary PNG hits this. Found via
    // follow-up investigation after a second review pass caught the same
    // bug class in the XMP nodes.
    const png = buildPng(64, 32, 8, 2);
    const result = await extractExif(testContext, makeInput(png));
    expect(result.getFound()).toBe(false);
    expect(result.getExifJson()).toBe('');
  });

  it('rejects empty input with a structured error', async () => {
    const result = await extractExif(testContext, makeInput(Buffer.alloc(0)));
    expect(result.getError()?.getCode()).toBe('EMPTY_INPUT');
  });

  it('rejects oversized input with INPUT_TOO_LARGE', async () => {
    const result = await extractExif(testContext, makeInput(Buffer.alloc(3 * 1024 * 1024 + 100)));
    expect(result.getError()?.getCode()).toBe('INPUT_TOO_LARGE');
  });
});
