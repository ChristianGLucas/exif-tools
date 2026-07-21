import { ImageBytes } from '../gen/messages_pb';
import { extractIptc } from './extract_iptc';
import { testContext } from './testdata/context';
import { buildFullJpeg, buildBareJpeg, KNOWN } from './testdata/fixtures';

function makeInput(data: Buffer): ImageBytes {
  const input = new ImageBytes();
  input.setData(data);
  return input;
}

describe('ExtractIptc', () => {
  it('decodes IPTC-IIM fields to exactly the hand-encoded fixture values', async () => {
    const result = await extractIptc(testContext, makeInput(buildFullJpeg()));
    expect(result.getError()).toBeUndefined();
    expect(result.getFound()).toBe(true);
    expect(result.getCaption()).toBe(KNOWN.caption);
    expect(result.getKeywordsList()).toEqual(KNOWN.keywords);
    expect(result.getByline()).toBe(KNOWN.byline);
    expect(result.getBylineTitle()).toBe(KNOWN.bylineTitle);
    expect(result.getCredit()).toBe(KNOWN.credit);
    expect(result.getSource()).toBe(KNOWN.source);
    expect(result.getCopyrightNotice()).toBe(KNOWN.copyrightNotice);
    expect(result.getHeadline()).toBe(KNOWN.headline);
    expect(result.getCity()).toBe(KNOWN.city);
    expect(result.getState()).toBe(KNOWN.state);
    expect(result.getCountry()).toBe(KNOWN.country);
    expect(result.getCategory()).toBe(KNOWN.category);
    expect(result.getObjectName()).toBe(KNOWN.objectName);
    expect(result.getSpecialInstructions()).toBe(KNOWN.specialInstructions);
  });

  it('found=false (no error) for a JPEG with no IPTC block', async () => {
    const result = await extractIptc(testContext, makeInput(buildBareJpeg()));
    expect(result.getError()).toBeUndefined();
    expect(result.getFound()).toBe(false);
  });

  it('rejects empty input with a structured error', async () => {
    const result = await extractIptc(testContext, makeInput(Buffer.alloc(0)));
    expect(result.getError()?.getCode()).toBe('EMPTY_INPUT');
  });
});
