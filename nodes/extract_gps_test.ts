import { ImageBytes } from '../gen/messages_pb';
import { extractGps } from './extract_gps';
import { testContext } from './testdata/context';
import { buildFullJpeg, buildBareJpeg, KNOWN, IfdBuilder, buildTiff, exifApp1, wrapJpeg } from './testdata/fixtures';

function makeInput(data: Buffer): ImageBytes {
  const input = new ImageBytes();
  input.setData(data);
  return input;
}

describe('ExtractGps', () => {
  it('decodes DMS GPS tags to the exact expected decimal lat/lon/altitude/speed/direction', async () => {
    const result = await extractGps(testContext, makeInput(buildFullJpeg()));
    expect(result.getError()).toBeUndefined();
    expect(result.getFound()).toBe(true);
    expect(result.getLatitude()).toBeCloseTo(KNOWN.expectedLat, 4);
    expect(result.getLongitude()).toBeCloseTo(KNOWN.expectedLon, 4);
    expect(result.getHasAltitude()).toBe(true);
    expect(result.getAltitudeMeters()).toBeCloseTo(KNOWN.gpsAltitudeNum / KNOWN.gpsAltitudeDen, 3);
    expect(result.getHasSpeed()).toBe(true);
    expect(result.getSpeed()).toBeCloseTo(KNOWN.gpsSpeedNum / KNOWN.gpsSpeedDen, 3);
    expect(result.getSpeedRef()).toBe(KNOWN.gpsSpeedRef);
    expect(result.getHasDirection()).toBe(true);
    expect(result.getDirectionDegrees()).toBeCloseTo(KNOWN.gpsDirectionNum / KNOWN.gpsDirectionDen, 3);
    expect(result.getDirectionRef()).toBe(KNOWN.gpsDirectionRef);
    expect(result.getTimestamp()).toBe('2024-06-15T14:29:55Z');
  });

  it('negative longitude/latitude sign matches the S/W reference (independent-oracle: sign check)', async () => {
    const result = await extractGps(testContext, makeInput(buildFullJpeg()));
    // West longitude must be negative; the fixture used ref "W".
    expect(result.getLongitude()).toBeLessThan(0);
    // North latitude must be positive; the fixture used ref "N".
    expect(result.getLatitude()).toBeGreaterThan(0);
  });

  it('found=false (no error) for a JPEG with no GPS block', async () => {
    const result = await extractGps(testContext, makeInput(buildBareJpeg()));
    expect(result.getError()).toBeUndefined();
    expect(result.getFound()).toBe(false);
  });

  it('rejects empty input with a structured error', async () => {
    const result = await extractGps(testContext, makeInput(Buffer.alloc(0)));
    expect(result.getError()?.getCode()).toBe('EMPTY_INPUT');
  });

  it('zero-pads a real-camera single-digit GPS seconds value into valid ISO 8601', async () => {
    // Regression for a real defect found by live-invoking against an actual
    // camera JPEG (Nikon COOLPIX sample): exifr's own GPSTimeStamp reviver
    // does not zero-pad, producing e.g. "14:27:7.24" — not valid ISO 8601,
    // which this node's docs explicitly claim to produce.
    const gps = new IfdBuilder()
      .addAscii(0x0001, 'N')
      .addRationalTriplet(0x0002, [[1, 1], [2, 1], [3, 1]])
      .addAscii(0x0003, 'E')
      .addRationalTriplet(0x0004, [[1, 1], [2, 1], [3, 1]])
      .addRationalTriplet(0x0007, [[9, 1], [8, 1], [724, 100]]) // 09:08:7.24
      .addAscii(0x001d, '2024:01:05');
    const tiff = buildTiff({ ifd0: new IfdBuilder(), gps });
    const result = await extractGps(testContext, makeInput(wrapJpeg(exifApp1(tiff))));
    expect(result.getFound()).toBe(true);
    expect(result.getTimestamp()).toBe('2024-01-05T09:08:07.24Z');
  });
});
