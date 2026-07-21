import { ImageBytes } from '../gen/messages_pb';
import { extractThumbnailInfo } from './extract_thumbnail_info';
import { testContext } from './testdata/context';
import { buildFullJpeg, buildBareJpeg, buildRawTiffWithThumbnail, KNOWN } from './testdata/fixtures';

function makeInput(data: Buffer): ImageBytes {
  const input = new ImageBytes();
  input.setData(data);
  return input;
}

describe('ExtractThumbnailInfo', () => {
  it('reports thumbnail dimensions/format/length for a JPEG, with offset undetermined', async () => {
    const result = await extractThumbnailInfo(testContext, makeInput(buildFullJpeg()));
    expect(result.getError()).toBeUndefined();
    expect(result.getFound()).toBe(true);
    expect(result.getFormat()).toBe('JPEG');
    expect(result.getByteLength()).toBe(KNOWN.thumbBytesLength);
    // JPEG's APP1-wrapped TIFF payload offset isn't part of exifr's stable
    // public output (see the node's doc comment) — must be honestly -1, not
    // a guess.
    expect(result.getOffsetInInput()).toBe(-1);
    expect(result.getBytesAvailableInInput()).toBe(false);
  });

  it('computes a real, verifiable offset_in_input for a raw .tiff (TIFF header at byte 0)', async () => {
    const data = buildRawTiffWithThumbnail();
    const result = await extractThumbnailInfo(testContext, makeInput(data));
    expect(result.getError()).toBeUndefined();
    expect(result.getFound()).toBe(true);
    expect(result.getWidth()).toBe(160);
    expect(result.getHeight()).toBe(120);
    expect(result.getFormat()).toBe('JPEG');
    expect(result.getByteLength()).toBe(KNOWN.thumbBytesLength);
    const offset = result.getOffsetInInput();
    expect(offset).toBeGreaterThanOrEqual(0);
    // Independent-oracle check: the bytes actually AT that offset in our
    // own fixture buffer must be the thumbnail filler byte (0xcd) we wrote —
    // proving the offset is not just present but CORRECT.
    expect(data[offset]).toBe(0xcd);
    expect(data[offset + KNOWN.thumbBytesLength - 1]).toBe(0xcd);
    expect(result.getBytesAvailableInInput()).toBe(true);
  });

  it('found=false (no error) when the file declares no embedded thumbnail', async () => {
    const result = await extractThumbnailInfo(testContext, makeInput(buildBareJpeg()));
    expect(result.getError()).toBeUndefined();
    expect(result.getFound()).toBe(false);
  });

  it('rejects empty input with a structured error', async () => {
    const result = await extractThumbnailInfo(testContext, makeInput(Buffer.alloc(0)));
    expect(result.getError()?.getCode()).toBe('EMPTY_INPUT');
  });
});
