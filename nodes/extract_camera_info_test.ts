import { ImageBytes } from '../gen/messages_pb';
import { extractCameraInfo } from './extract_camera_info';
import { testContext } from './testdata/context';
import { buildFullJpeg, buildBareJpeg, KNOWN } from './testdata/fixtures';

function makeInput(data: Buffer): ImageBytes {
  const input = new ImageBytes();
  input.setData(data);
  return input;
}

describe('ExtractCameraInfo', () => {
  it('summarizes the camera/lens identity from the fixture', async () => {
    const result = await extractCameraInfo(testContext, makeInput(buildFullJpeg()));
    expect(result.getError()).toBeUndefined();
    expect(result.getFound()).toBe(true);
    expect(result.getMake()).toBe(KNOWN.make);
    expect(result.getModel()).toBe(KNOWN.model);
    expect(result.getLensMake()).toBe(KNOWN.lensMake);
    expect(result.getLensModel()).toBe(KNOWN.lensModel);
    expect(result.getSoftware()).toBe(KNOWN.software);
    expect(result.getBodySerialNumber()).toBe(KNOWN.serialNumber);
    expect(result.getSummary()).toBe(`${KNOWN.make} ${KNOWN.model} + ${KNOWN.lensModel}`);
  });

  it('found=false when neither Make nor Model is present', async () => {
    const result = await extractCameraInfo(testContext, makeInput(buildBareJpeg()));
    expect(result.getError()).toBeUndefined();
    expect(result.getFound()).toBe(false);
  });

  it('rejects empty input with a structured error', async () => {
    const result = await extractCameraInfo(testContext, makeInput(Buffer.alloc(0)));
    expect(result.getError()?.getCode()).toBe('EMPTY_INPUT');
  });
});
