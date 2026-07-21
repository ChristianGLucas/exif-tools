import { ImageBytes } from '../gen/messages_pb';
import { extractXmp } from './extract_xmp';
import { testContext } from './testdata/context';
import { buildFullJpeg, buildBareJpeg } from './testdata/fixtures';

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
});
