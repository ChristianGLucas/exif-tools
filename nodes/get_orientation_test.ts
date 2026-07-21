import { ImageBytes } from '../gen/messages_pb';
import { getOrientation } from './get_orientation';
import { testContext } from './testdata/context';
import { buildFullJpeg, buildBareJpeg, IfdBuilder, buildTiff, exifApp1, wrapJpeg } from './testdata/fixtures';

function makeInput(data: Buffer): ImageBytes {
  const input = new ImageBytes();
  input.setData(data);
  return input;
}

function jpegWithOrientation(value: number): Buffer {
  const ifd0 = new IfdBuilder().addShort(0x0112, value);
  const tiff = buildTiff({ ifd0 });
  return wrapJpeg(exifApp1(tiff));
}

describe('GetOrientation', () => {
  it('decodes orientation 6 (fixture default) to Rotate 90 CW, no flip', async () => {
    const result = await getOrientation(testContext, makeInput(buildFullJpeg()));
    expect(result.getError()).toBeUndefined();
    expect(result.getFound()).toBe(true);
    expect(result.getOrientation()).toBe(6);
    expect(result.getRotationDegrees()).toBe(90);
    expect(result.getFlipHorizontal()).toBe(false);
    expect(result.getFlipVertical()).toBe(false);
  });

  // Independent oracle: the standard EXIF Orientation table (spec-defined,
  // not exifr's own code) is the ground truth for every one of the 8 values.
  it.each([
    [1, 0, false],
    [2, 0, true],
    [3, 180, false],
    [4, 180, true],
    [5, 90, true],
    [6, 90, false],
    [7, 270, true],
    [8, 270, false],
  ])('orientation %i -> %i deg, flipH=%s (per the EXIF spec table)', async (value, deg, flipH) => {
    const result = await getOrientation(testContext, makeInput(jpegWithOrientation(value as number)));
    expect(result.getFound()).toBe(true);
    expect(result.getOrientation()).toBe(value);
    expect(result.getRotationDegrees()).toBe(deg);
    expect(result.getFlipHorizontal()).toBe(flipH);
  });

  it('found=false but reports the EXIF-default orientation=1/0deg/no-flip when the tag is absent', async () => {
    const result = await getOrientation(testContext, makeInput(buildBareJpeg()));
    expect(result.getError()).toBeUndefined();
    expect(result.getFound()).toBe(false);
    expect(result.getOrientation()).toBe(1);
    expect(result.getRotationDegrees()).toBe(0);
    expect(result.getFlipHorizontal()).toBe(false);
    expect(result.getFlipVertical()).toBe(false);
  });

  it('rejects empty input with a structured error', async () => {
    const result = await getOrientation(testContext, makeInput(Buffer.alloc(0)));
    expect(result.getError()?.getCode()).toBe('EMPTY_INPUT');
  });
});
