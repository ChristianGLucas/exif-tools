import { ImageBytes } from '../gen/messages_pb';
import { getImageInfo } from './get_image_info';
import { testContext } from './testdata/context';
import { buildFullJpeg, buildPng, buildRawTiffWithThumbnail, KNOWN } from './testdata/fixtures';

function makeInput(data: Buffer): ImageBytes {
  const input = new ImageBytes();
  input.setData(data);
  return input;
}

describe('GetImageInfo', () => {
  it('reads exact PNG dimensions/bit-depth/format from the IHDR chunk', async () => {
    const result = await getImageInfo(
      testContext,
      makeInput(buildPng(KNOWN.pngWidth, KNOWN.pngHeight, KNOWN.pngBitDepth, KNOWN.pngColorType))
    );
    expect(result.getError()).toBeUndefined();
    expect(result.getFound()).toBe(true);
    expect(result.getWidth()).toBe(KNOWN.pngWidth);
    expect(result.getHeight()).toBe(KNOWN.pngHeight);
    expect(result.getBitDepth()).toBe(KNOWN.pngBitDepth);
    expect(result.getFormat()).toBe('png');
  });

  it('reads JPEG dimensions from the EXIF PixelXDimension/PixelYDimension tags', async () => {
    const result = await getImageInfo(testContext, makeInput(buildFullJpeg()));
    expect(result.getError()).toBeUndefined();
    expect(result.getFound()).toBe(true);
    expect(result.getWidth()).toBe(KNOWN.pixelXDimension);
    expect(result.getHeight()).toBe(KNOWN.pixelYDimension);
    expect(result.getFormat()).toBe('jpeg');
  });

  it('reads native TIFF ImageWidth/ImageHeight/BitsPerSample from a raw .tiff', async () => {
    const result = await getImageInfo(testContext, makeInput(buildRawTiffWithThumbnail()));
    expect(result.getError()).toBeUndefined();
    expect(result.getFound()).toBe(true);
    expect(result.getWidth()).toBe(800);
    expect(result.getHeight()).toBe(600);
    expect(result.getBitDepth()).toBe(8);
    expect(result.getFormat()).toBe('tiff');
  });

  it('rejects empty input with a structured error', async () => {
    const result = await getImageInfo(testContext, makeInput(Buffer.alloc(0)));
    expect(result.getError()?.getCode()).toBe('EMPTY_INPUT');
  });

  it('falls back to the filename extension for format when magic bytes are ambiguous', async () => {
    const input = new ImageBytes();
    input.setData(Buffer.from('not a real image header'));
    input.setFilename('scan.png');
    const result = await getImageInfo(testContext, input);
    expect(result.getFormat()).toBe('png');
  });
});
