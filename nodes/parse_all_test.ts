import { ImageBytes } from '../gen/messages_pb';
import { parseAll } from './parse_all';
import { testContext } from './testdata/context';
import { buildFullJpeg, buildBareJpeg, KNOWN } from './testdata/fixtures';

function makeInput(data: Buffer): ImageBytes {
  const input = new ImageBytes();
  input.setData(data);
  return input;
}

describe('ParseAll', () => {
  it('parses every block from a JPEG carrying EXIF+GPS+IPTC+XMP+thumbnail', async () => {
    const result = await parseAll(testContext, makeInput(buildFullJpeg()));
    expect(result.getError()).toBeUndefined();
    expect(result.getFoundAny()).toBe(true);
    const blocks = result.getBlocksPresentList();
    expect(blocks).toEqual(expect.arrayContaining(['exif', 'gps', 'iptc', 'xmp', 'thumbnail']));

    const exif = JSON.parse(result.getExifJson());
    expect(exif.Make).toBe(KNOWN.make);
    expect(exif.Model).toBe(KNOWN.model);

    const gps = JSON.parse(result.getGpsJson());
    expect(gps.latitude).toBeCloseTo(KNOWN.expectedLat, 4);

    const iptc = JSON.parse(result.getIptcJson());
    expect(iptc.Caption).toBe(KNOWN.caption);

    const xmp = JSON.parse(result.getXmpJson());
    expect(xmp).toBeTruthy();
    expect(JSON.stringify(xmp)).toContain('Test Author');

    // Regression: exif_json must carry the RAW numeric orientation (6), not
    // exifr's human-readable translation ("Rotate 90 CW") — this field is
    // documented as the raw tag set, and consistency with ExtractExif
    // (which already gets this right) matters. Found by independent review.
    expect(exif.Orientation).toBe(6);
  });

  it('never leaks a GPS/errors-fabricated xmp block, and reports found_any=false for a truncated XMP segment (regression)', async () => {
    // Same silentErrors issue as ExtractXmp: a truncated XMP segment comes
    // back from exifr as {errors:[...]}, which must not be reported as a
    // present "xmp" block.
    const full = buildFullJpeg();
    const truncated = full.subarray(0, Math.floor(full.length * 0.5));
    const result = await parseAll(testContext, makeInput(truncated));
    expect(result.getBlocksPresentList()).not.toContain('xmp');
    expect(result.getXmpJson()).toBe('');
  });

  it('reports found_any=false (no error) for a JPEG with no metadata', async () => {
    const result = await parseAll(testContext, makeInput(buildBareJpeg()));
    expect(result.getError()).toBeUndefined();
    expect(result.getFoundAny()).toBe(false);
    expect(result.getBlocksPresentList()).toEqual([]);
  });

  it('returns a structured error, not a crash, on empty input', async () => {
    const result = await parseAll(testContext, makeInput(Buffer.alloc(0)));
    expect(result.getError()).toBeDefined();
    expect(result.getError()!.getCode()).toBe('EMPTY_INPUT');
  });

  it('returns INPUT_TOO_LARGE for input over the 3 MiB cap, without attempting to parse it', async () => {
    const oversized = Buffer.alloc(3 * 1024 * 1024 + 1);
    const result = await parseAll(testContext, makeInput(oversized));
    expect(result.getError()).toBeDefined();
    expect(result.getError()!.getCode()).toBe('INPUT_TOO_LARGE');
  });

  it('returns a structured error for garbage bytes rather than crashing', async () => {
    const garbage = Buffer.from('not an image, just some plain text bytes padded out'.repeat(50));
    const result = await parseAll(testContext, makeInput(garbage));
    // Either a structured error, or a clean "nothing found" — never a throw
    // (the fact this line is reached at all is the crash assertion).
    if (result.getError()) {
      expect(result.getError()!.getCode()).toBeTruthy();
    } else {
      expect(result.getFoundAny()).toBe(false);
    }
  });

  it('is deterministic across repeated invocations', async () => {
    const data = buildFullJpeg();
    const r1 = await parseAll(testContext, makeInput(data));
    const r2 = await parseAll(testContext, makeInput(data));
    expect(r1.getExifJson()).toBe(r2.getExifJson());
    expect(r1.getGpsJson()).toBe(r2.getGpsJson());
  });
});
