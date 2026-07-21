import { ImageBytes } from '../gen/messages_pb';
import { extractTimestamps } from './extract_timestamps';
import { testContext } from './testdata/context';
import { buildFullJpeg, buildBareJpeg } from './testdata/fixtures';

function makeInput(data: Buffer): ImageBytes {
  const input = new ImageBytes();
  input.setData(data);
  return input;
}

describe('ExtractTimestamps', () => {
  it('gathers every timestamp from the fixture (EXIF x3 + GPS)', async () => {
    const result = await extractTimestamps(testContext, makeInput(buildFullJpeg()));
    expect(result.getError()).toBeUndefined();
    expect(result.getFound()).toBe(true);
    expect(result.getDateTimeOriginal()).toContain('2024-06-15');
    expect(result.getDateTimeDigitized()).toContain('2024-06-15');
    expect(result.getDateTimeModified()).toBe('');
    expect(result.getGpsTimestamp()).toBe('2024-06-15T14:29:55Z');
  });

  it('found=false when no timestamp tags are present', async () => {
    const result = await extractTimestamps(testContext, makeInput(buildBareJpeg()));
    expect(result.getError()).toBeUndefined();
    expect(result.getFound()).toBe(false);
  });

  it('rejects empty input with a structured error', async () => {
    const result = await extractTimestamps(testContext, makeInput(Buffer.alloc(0)));
    expect(result.getError()?.getCode()).toBe('EMPTY_INPUT');
  });
});
