import { ImageBytes } from '../gen/messages_pb';
import { detectMetadataBlocks } from './detect_metadata_blocks';
import { testContext } from './testdata/context';
import { buildFullJpeg, buildBareJpeg, buildPng, KNOWN } from './testdata/fixtures';

function makeInput(data: Buffer): ImageBytes {
  const input = new ImageBytes();
  input.setData(data);
  return input;
}

describe('DetectMetadataBlocks', () => {
  it('reports every block present in the full fixture, and jpeg format', async () => {
    const result = await detectMetadataBlocks(testContext, makeInput(buildFullJpeg()));
    expect(result.getError()).toBeUndefined();
    expect(result.getHasExif()).toBe(true);
    expect(result.getHasGps()).toBe(true);
    expect(result.getHasIptc()).toBe(true);
    expect(result.getHasXmp()).toBe(true);
    expect(result.getHasThumbnail()).toBe(true);
    expect(result.getHasIcc()).toBe(false);
    expect(result.getDetectedFormat()).toBe('jpeg');
  });

  it('reports every block absent (not an error) for a bare JPEG', async () => {
    const result = await detectMetadataBlocks(testContext, makeInput(buildBareJpeg()));
    expect(result.getError()).toBeUndefined();
    expect(result.getHasExif()).toBe(false);
    expect(result.getHasGps()).toBe(false);
    expect(result.getHasIptc()).toBe(false);
    expect(result.getHasXmp()).toBe(false);
    expect(result.getHasIcc()).toBe(false);
    expect(result.getHasThumbnail()).toBe(false);
    expect(result.getDetectedFormat()).toBe('jpeg');
  });

  it('sniffs png format correctly from magic bytes', async () => {
    const result = await detectMetadataBlocks(
      testContext,
      makeInput(buildPng(KNOWN.pngWidth, KNOWN.pngHeight, KNOWN.pngBitDepth, KNOWN.pngColorType))
    );
    expect(result.getDetectedFormat()).toBe('png');
  });

  it('rejects empty input with a structured error', async () => {
    const result = await detectMetadataBlocks(testContext, makeInput(Buffer.alloc(0)));
    expect(result.getError()?.getCode()).toBe('EMPTY_INPUT');
  });
});
