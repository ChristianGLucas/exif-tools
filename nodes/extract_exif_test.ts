import { ImageBytes } from '../gen/messages_pb';
import { extractExif } from './extract_exif';
import { testContext } from './testdata/context';
import { buildFullJpeg, buildBareJpeg, KNOWN } from './testdata/fixtures';

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

  it('found=false (no error) for a JPEG with no EXIF block', async () => {
    const result = await extractExif(testContext, makeInput(buildBareJpeg()));
    expect(result.getError()).toBeUndefined();
    expect(result.getFound()).toBe(false);
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
