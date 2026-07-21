import { ImageBytes } from '../gen/messages_pb';
import { extractXmp } from './extract_xmp';
import { testContext } from './testdata/context';
import { buildFullJpeg, buildBareJpeg, buildPng, KNOWN } from './testdata/fixtures';

function makeInput(data: Buffer): ImageBytes {
  const input = new ImageBytes();
  input.setData(data);
  return input;
}

describe('ExtractXmp', () => {
  it('parses the embedded XMP RDF into structured properties matching the fixture', async () => {
    const result = await extractXmp(testContext, makeInput(buildFullJpeg()));
    expect(result.getError()).toBeUndefined();
    expect(result.getFound()).toBe(true);
    const xmp = JSON.parse(result.getXmpJson());
    expect(xmp.dc.creator).toBe('Test Author');
    expect(xmp.photoshop.City).toBe('Springfield');
  });

  it('found=false (no error) for a JPEG with no XMP packet', async () => {
    const result = await extractXmp(testContext, makeInput(buildBareJpeg()));
    expect(result.getError()).toBeUndefined();
    expect(result.getFound()).toBe(false);
    expect(result.getXmpJson()).toBe('');
  });

  it('rejects empty input with a structured error', async () => {
    const result = await extractXmp(testContext, makeInput(Buffer.alloc(0)));
    expect(result.getError()?.getCode()).toBe('EMPTY_INPUT');
  });

  it('does not choke on an XMP packet containing a DOCTYPE/entity declaration (XXE probe)', async () => {
    // exifr's XMP parser has no DTD/entity support at all — this should
    // parse as inert text (or fail structurally), never expand an entity or
    // reach the filesystem/network.
    const { exifApp1, wrapJpeg, xmpApp1, buildTiff, IfdBuilder } = await import('./testdata/fixtures');
    const maliciousXmp = `<?xml version="1.0"?>
<!DOCTYPE x:xmpmeta [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/">
   <dc:description>&xxe;</dc:description>
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>`;
    const tiny = wrapJpeg(xmpApp1(maliciousXmp));
    const input = new ImageBytes();
    input.setData(tiny);
    const result = await extractXmp(testContext, input);
    // Whatever comes back, it must not contain expanded /etc/passwd content.
    const json = result.getXmpJson();
    expect(json).not.toContain('root:');
    expect(json).not.toContain('/bin/bash');
  });

  it('reports found=false, not a fabricated match, for a truncated XMP segment (regression)', async () => {
    // exifr's default silentErrors behavior means a truncated XMP segment
    // does not throw — it returns {errors: [...]} instead of real
    // properties. Unfiltered, that used to read as found=true with garbage
    // xmp_json ("{\"errors\":[{}]}"). Found by independent review; this is
    // also exactly the "send a leading prefix of the file" pattern this
    // package's own docs recommend, so it's a realistic caller input, not a
    // contrived one.
    const full = buildFullJpeg();
    const truncated = full.subarray(0, Math.floor(full.length * 0.5));
    const result = await extractXmp(testContext, makeInput(truncated));
    expect(result.getFound()).toBe(false);
    expect(result.getXmpJson()).toBe('');
    expect(result.getXmpJson()).not.toContain('errors');
  });

  it('found=false for a plain PNG with no XMP, not the PNG IHDR chunk mislabeled as XMP (regression)', async () => {
    // exifr's PNG file parser enables the `ihdr` segment by default
    // regardless of the options passed to an "xmp only" parse call — an
    // XMP-only call on a plain PNG used to come back as {ihdr:{...}} and
    // get reported as found=true with the PNG's own structural metadata
    // mislabeled as XMP data. No truncation or crafting needed — any
    // ordinary PNG without an XMP packet hits this. Found by a second,
    // independent review pass after the first fix round.
    const png = buildPng(KNOWN.pngWidth, KNOWN.pngHeight, KNOWN.pngBitDepth, KNOWN.pngColorType);
    const result = await extractXmp(testContext, makeInput(png));
    expect(result.getFound()).toBe(false);
    expect(result.getXmpJson()).toBe('');
    expect(result.getXmpJson()).not.toContain('ihdr');
  });
});
