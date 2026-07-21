// Test-only fixture builders. These construct real, spec-conformant binary
// segments (TIFF/EXIF IFDs, JPEG APPn segments, PNG chunks) by hand, directly
// from the TIFF6/EXIF2.3/IPTC-IIM/PNG specs — independent of exifr's own
// internals — so that a test asserting a node's decoded output against the
// values encoded here is a genuine independent-oracle check, not
// self-consistency through the same library.
//
// Not part of the published package (only imported from *_test.ts files).

// ---- Low-level TIFF/IFD writer -------------------------------------------

export const TYPE_BYTE = 1;
export const TYPE_ASCII = 2;
export const TYPE_SHORT = 3;
export const TYPE_LONG = 4;
export const TYPE_RATIONAL = 5;
export const TYPE_SRATIONAL = 10;

interface RawEntry {
  tag: number;
  type: number;
  count: number;
  bytes: Buffer;
}

export class IfdBuilder {
  private entries: RawEntry[] = [];

  addAscii(tag: number, value: string) {
    const bytes = Buffer.from(value + '\0', 'utf8');
    this.entries.push({ tag, type: TYPE_ASCII, count: bytes.length, bytes });
    return this;
  }

  addShort(tag: number, value: number) {
    const bytes = Buffer.alloc(2);
    bytes.writeUInt16LE(value, 0);
    this.entries.push({ tag, type: TYPE_SHORT, count: 1, bytes });
    return this;
  }

  addLong(tag: number, value: number) {
    const bytes = Buffer.alloc(4);
    bytes.writeUInt32LE(value, 0);
    this.entries.push({ tag, type: TYPE_LONG, count: 1, bytes });
    return this;
  }

  addByte(tag: number, value: number) {
    const bytes = Buffer.from([value]);
    this.entries.push({ tag, type: TYPE_BYTE, count: 1, bytes });
    return this;
  }

  addRational(tag: number, num: number, den: number) {
    const bytes = Buffer.alloc(8);
    bytes.writeUInt32LE(num, 0);
    bytes.writeUInt32LE(den, 4);
    this.entries.push({ tag, type: TYPE_RATIONAL, count: 1, bytes });
    return this;
  }

  /** GPS-style degrees/minutes/seconds triplet, each a [numerator,
   * denominator] pair encoded as a RATIONAL. */
  addRationalTriplet(tag: number, values: [number, number][]) {
    const bytes = Buffer.alloc(24);
    values.forEach(([num, den], i) => {
      bytes.writeUInt32LE(num, i * 8);
      bytes.writeUInt32LE(den, i * 8 + 4);
    });
    this.entries.push({ tag, type: TYPE_RATIONAL, count: 3, bytes });
    return this;
  }

  addRaw(tag: number, type: number, count: number, bytes: Buffer) {
    this.entries.push({ tag, type, count, bytes });
    return this;
  }

  /** Total byte size of this IFD once written (entries + overflow area). */
  size(): number {
    let overflow = 0;
    for (const e of this.entries) {
      if (e.bytes.length > 4) overflow += e.bytes.length + (e.bytes.length % 2);
    }
    return 2 + this.entries.length * 12 + 4 + overflow;
  }

  /** Serialize at `selfOffset` (this IFD's own absolute offset from the TIFF
   * header start — needed to compute absolute offsets for overflow values),
   * chaining to `nextIfdOffset` (0 if none). */
  write(selfOffset: number, nextIfdOffset: number): Buffer {
    const buf = Buffer.alloc(this.size());
    buf.writeUInt16LE(this.entries.length, 0);
    let entryPos = 2;
    let overflowPos = 2 + this.entries.length * 12 + 4;
    for (const e of this.entries) {
      buf.writeUInt16LE(e.tag, entryPos);
      buf.writeUInt16LE(e.type, entryPos + 2);
      buf.writeUInt32LE(e.count, entryPos + 4);
      if (e.bytes.length <= 4) {
        e.bytes.copy(buf, entryPos + 8);
      } else {
        buf.writeUInt32LE(selfOffset + overflowPos, entryPos + 8);
        e.bytes.copy(buf, overflowPos);
        overflowPos += e.bytes.length + (e.bytes.length % 2);
      }
      entryPos += 12;
    }
    buf.writeUInt32LE(nextIfdOffset, 2 + this.entries.length * 12);
    return buf;
  }
}

export interface TiffFixture {
  ifd0: IfdBuilder;
  exif?: IfdBuilder;
  gps?: IfdBuilder;
  ifd1?: IfdBuilder;
  thumbnail?: Buffer;
}

const TAG_EXIF_IFD_POINTER = 0x8769;
const TAG_GPS_IFD_POINTER = 0x8825;

/** Assemble a full little-endian TIFF byte stream (header + IFD0 [+ Exif
 * sub-IFD] [+ GPS sub-IFD] [+ IFD1 thumbnail directory + thumbnail bytes]),
 * wiring up all inter-IFD offsets. Returns bytes starting at the TIFF
 * header ("II*\0..."), i.e. everything internal offsets are relative to. */
export function buildTiff(fixture: TiffFixture): Buffer {
  const ifd0 = fixture.ifd0;
  if (fixture.exif) ifd0.addLong(TAG_EXIF_IFD_POINTER, 0); // placeholder, real value patched below via rebuild
  if (fixture.gps) ifd0.addLong(TAG_GPS_IFD_POINTER, 0);

  // We need final IFD0 size to plan offsets, but we already added the
  // pointer entries above (their VALUE doesn't affect IFD size, only their
  // presence does — LONG is always inline). So size is now final.
  const ifd0Offset = 8;
  const ifd0Size = ifd0.size();

  let exifOffset = 0;
  let exifSize = 0;
  if (fixture.exif) {
    exifOffset = ifd0Offset + ifd0Size;
    exifSize = fixture.exif.size();
  }

  let gpsOffset = 0;
  let gpsSize = 0;
  if (fixture.gps) {
    gpsOffset = fixture.exif ? exifOffset + exifSize : ifd0Offset + ifd0Size;
    gpsSize = fixture.gps.size();
  }

  let ifd1Offset = 0;
  let ifd1Size = 0;
  let thumbOffset = 0;
  if (fixture.ifd1) {
    ifd1Offset = (fixture.gps ? gpsOffset + gpsSize : fixture.exif ? exifOffset + exifSize : ifd0Offset + ifd0Size);
    ifd1Size = fixture.ifd1.size();
    thumbOffset = ifd1Offset + ifd1Size;
  }

  // IFD0's Exif/GPS-IFD-pointer entries were added above as LONG(0)
  // placeholders (their presence, not value, is what size() needed to be
  // final) — patch in the now-known real absolute offsets in place.
  const ifd0Bytes = ifd0.write(ifd0Offset, ifd1Offset);
  if (fixture.exif) patchPointerEntry(ifd0Bytes, TAG_EXIF_IFD_POINTER, exifOffset);
  if (fixture.gps) patchPointerEntry(ifd0Bytes, TAG_GPS_IFD_POINTER, gpsOffset);

  const parts: Buffer[] = [];
  const header = Buffer.alloc(8);
  header.write('II', 0, 'ascii');
  header.writeUInt16LE(42, 2);
  header.writeUInt32LE(ifd0Offset, 4);
  parts.push(header, ifd0Bytes);

  if (fixture.exif) parts.push(fixture.exif.write(exifOffset, 0));
  if (fixture.gps) parts.push(fixture.gps.write(gpsOffset, 0));
  if (fixture.ifd1) {
    // Same deal for IFD1's ThumbnailOffset (0x0201): caller adds it as a
    // LONG(0) placeholder, we patch in the real offset here.
    const ifd1Bytes = fixture.ifd1.write(ifd1Offset, 0);
    patchPointerEntry(ifd1Bytes, 0x0201, thumbOffset);
    parts.push(ifd1Bytes);
    if (fixture.thumbnail) parts.push(fixture.thumbnail);
  }

  return Buffer.concat(parts);
}

/** Find a LONG entry by tag in a serialized IFD buffer and overwrite its
 * inline value in place — used to backfill a sub-IFD pointer once the
 * sub-IFD's real absolute offset is known. */
function patchPointerEntry(ifdBytes: Buffer, tag: number, value: number) {
  const count = ifdBytes.readUInt16LE(0);
  let pos = 2;
  for (let i = 0; i < count; i++) {
    if (ifdBytes.readUInt16LE(pos) === tag) {
      ifdBytes.writeUInt32LE(value, pos + 8);
      return;
    }
    pos += 12;
  }
  throw new Error(`patchPointerEntry: tag 0x${tag.toString(16)} not found`);
}

// ---- JPEG container -------------------------------------------------------

function appSegment(marker: number, payload: Buffer): Buffer {
  const seg = Buffer.alloc(2 + 2 + payload.length);
  seg.writeUInt8(0xff, 0);
  seg.writeUInt8(marker, 1);
  seg.writeUInt16BE(payload.length + 2, 2);
  payload.copy(seg, 4);
  return seg;
}

export function exifApp1(tiffBytes: Buffer): Buffer {
  const payload = Buffer.concat([Buffer.from('Exif\0\0', 'ascii'), tiffBytes]);
  return appSegment(0xe1, payload);
}

export function xmpApp1(xmpXml: string): Buffer {
  const payload = Buffer.concat([
    Buffer.from('http://ns.adobe.com/xap/1.0/\0', 'ascii'),
    Buffer.from(xmpXml, 'utf8'),
  ]);
  return appSegment(0xe1, payload);
}

interface IptcField {
  dataset: number;
  value: string;
}

function iptcRecord(dataset: number, value: string): Buffer {
  const data = Buffer.from(value, 'utf8');
  const header = Buffer.alloc(5);
  header.writeUInt8(0x1c, 0);
  header.writeUInt8(2, 1); // record 2 = Application Record
  header.writeUInt8(dataset, 2);
  header.writeUInt16BE(data.length, 3);
  return Buffer.concat([header, data]);
}

export function iptcApp13(fields: IptcField[]): Buffer {
  const versionRecord = (() => {
    const header = Buffer.alloc(5);
    header.writeUInt8(0x1c, 0);
    header.writeUInt8(2, 1);
    header.writeUInt8(0, 2); // ApplicationRecordVersion
    header.writeUInt16BE(2, 3);
    const val = Buffer.alloc(2);
    val.writeUInt16BE(4, 0);
    return Buffer.concat([header, val]);
  })();
  const records = Buffer.concat([versionRecord, ...fields.map((f) => iptcRecord(f.dataset, f.value))]);

  const resourceId = Buffer.alloc(2);
  resourceId.writeUInt16BE(0x0404, 0);
  const nameAndPad = Buffer.from([0x00, 0x00]); // empty Pascal string, padded to even
  const sizeField = Buffer.alloc(4);
  sizeField.writeUInt32BE(records.length, 0);
  const recordsPadded = records.length % 2 === 0 ? records : Buffer.concat([records, Buffer.from([0])]);

  const block8bim = Buffer.concat([Buffer.from('8BIM', 'ascii'), resourceId, nameAndPad, sizeField, recordsPadded]);
  const payload = Buffer.concat([Buffer.from('Photoshop 3.0\0', 'ascii'), block8bim]);
  return appSegment(0xed, payload);
}

/** A minimal but structurally valid JPEG carrying whichever APPn segments
 * are supplied, terminated with EOI. No SOF/scan data — exifr's JPEG file
 * parser only needs to walk APPn segments to find metadata, it does not
 * require a decodable image. */
export function wrapJpeg(...segments: Buffer[]): Buffer {
  return Buffer.concat([Buffer.from([0xff, 0xd8]), ...segments, Buffer.from([0xff, 0xd9])]);
}

// ---- PNG container ----------------------------------------------------

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function pngChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4); // exifr's PNG parser does not validate CRC
  return Buffer.concat([length, typeBuf, data, crc]);
}

export function buildPng(width: number, height: number, bitDepth: number, colorType: number): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(bitDepth, 8);
  ihdr.writeUInt8(colorType, 9);
  ihdr.writeUInt8(0, 10); // compression
  ihdr.writeUInt8(0, 11); // filter
  ihdr.writeUInt8(0, 12); // interlace
  const iend = Buffer.alloc(0);
  return Buffer.concat([PNG_SIGNATURE, pngChunk('IHDR', ihdr), pngChunk('IEND', iend)]);
}

// ---- Shared realistic values, reused by tests as the oracle ---------------

export const KNOWN = {
  make: 'FixtureCam',
  model: 'FX-9000',
  software: 'exif-tools test fixture v1',
  lensModel: 'FX 24-70mm f/2.8',
  lensMake: 'FixtureLens',
  serialNumber: 'SN-00012345',
  orientation: 6, // Rotate 90 CW
  exposureTimeNum: 1,
  exposureTimeDen: 500, // 1/500s
  fNumberNum: 28,
  fNumberDen: 10, // f/2.8
  iso: 400,
  focalLengthNum: 50,
  focalLengthDen: 1, // 50mm
  focalLength35mm: 75,
  colorSpace: 1, // sRGB
  pixelXDimension: 4032,
  pixelYDimension: 3024,
  dateTimeOriginal: '2024:06:15 14:30:00',
  dateTimeDigitized: '2024:06:15 14:30:00',
  dateTime: '2024:06:15 14:31:00',
  // GPS: 37° 46' 29.64" N, 122° 25' 9.84" W  ==  37.774900, -122.419400
  gpsLatDeg: 37,
  gpsLatMin: 46,
  gpsLatSecNum: 2964,
  gpsLatSecDen: 100,
  gpsLatRef: 'N',
  gpsLonDeg: 122,
  gpsLonMin: 25,
  gpsLonSecNum: 984,
  gpsLonSecDen: 100,
  gpsLonRef: 'W',
  expectedLat: 37.7749,
  expectedLon: -122.4194,
  gpsAltitudeNum: 1000,
  gpsAltitudeDen: 10, // 100.0m
  gpsAltitudeRef: 0, // above sea level
  gpsSpeedNum: 45,
  gpsSpeedDen: 1,
  gpsSpeedRef: 'K',
  gpsDirectionNum: 1800,
  gpsDirectionDen: 10, // 180.0 degrees
  gpsDirectionRef: 'T',
  gpsDateStamp: '2024:06:15',
  gpsHour: 14,
  gpsMin: 29,
  gpsSec: 55,
  caption: 'A fixture image used only for automated tests.',
  keywords: ['fixture', 'unit-test', 'exif-tools'],
  byline: 'Test Author',
  bylineTitle: 'Staff Tester',
  credit: 'exif-tools test suite',
  source: 'exif-tools',
  copyrightNotice: '(c) 2026 Christian George Lucas',
  headline: 'Fixture Headline',
  city: 'Springfield',
  state: 'IL',
  country: 'USA',
  category: 'TST',
  objectName: 'fixture-001',
  specialInstructions: 'Do not use outside tests.',
  pngWidth: 64,
  pngHeight: 32,
  pngBitDepth: 8,
  pngColorType: 2, // RGB
  thumbBytesLength: 50,
};

/** A full JPEG carrying EXIF (with GPS + thumbnail IFD1), IPTC, and XMP —
 * the primary "everything present" fixture. */
export function buildFullJpeg(): Buffer {
  const ifd0 = new IfdBuilder()
    .addAscii(0x010f, KNOWN.make) // Make
    .addAscii(0x0110, KNOWN.model) // Model
    .addAscii(0x0131, KNOWN.software) // Software
    .addShort(0x0112, KNOWN.orientation); // Orientation

  const exif = new IfdBuilder()
    .addRational(0x829a, KNOWN.exposureTimeNum, KNOWN.exposureTimeDen) // ExposureTime
    .addRational(0x829d, KNOWN.fNumberNum, KNOWN.fNumberDen) // FNumber
    .addShort(0x8827, KNOWN.iso) // ISOSpeedRatings
    .addAscii(0x9003, KNOWN.dateTimeOriginal) // DateTimeOriginal
    .addAscii(0x9004, KNOWN.dateTimeDigitized) // DateTimeDigitized
    .addRational(0x920a, KNOWN.focalLengthNum, KNOWN.focalLengthDen) // FocalLength
    .addShort(0xa405, KNOWN.focalLength35mm) // FocalLengthIn35mmFilm
    .addShort(0xa001, KNOWN.colorSpace) // ColorSpace
    .addLong(0xa002, KNOWN.pixelXDimension) // PixelXDimension
    .addLong(0xa003, KNOWN.pixelYDimension) // PixelYDimension
    .addAscii(0xa434, KNOWN.lensModel) // LensModel
    .addAscii(0xa433, KNOWN.lensMake) // LensMake
    .addAscii(0xa431, KNOWN.serialNumber); // SerialNumber (body)

  const gps = new IfdBuilder()
    .addAscii(0x0001, KNOWN.gpsLatRef) // GPSLatitudeRef
    .addRationalTriplet(0x0002, [
      [KNOWN.gpsLatDeg, 1],
      [KNOWN.gpsLatMin, 1],
      [KNOWN.gpsLatSecNum, KNOWN.gpsLatSecDen],
    ]) // GPSLatitude
    .addAscii(0x0003, KNOWN.gpsLonRef) // GPSLongitudeRef
    .addRationalTriplet(0x0004, [
      [KNOWN.gpsLonDeg, 1],
      [KNOWN.gpsLonMin, 1],
      [KNOWN.gpsLonSecNum, KNOWN.gpsLonSecDen],
    ]) // GPSLongitude
    .addByte(0x0005, KNOWN.gpsAltitudeRef) // GPSAltitudeRef
    .addRational(0x0006, KNOWN.gpsAltitudeNum, KNOWN.gpsAltitudeDen) // GPSAltitude
    .addRationalTriplet(0x0007, [
      [KNOWN.gpsHour, 1],
      [KNOWN.gpsMin, 1],
      [KNOWN.gpsSec, 1],
    ]) // GPSTimeStamp
    .addAscii(0x000c, KNOWN.gpsSpeedRef) // GPSSpeedRef
    .addRational(0x000d, KNOWN.gpsSpeedNum, KNOWN.gpsSpeedDen) // GPSSpeed
    .addAscii(0x0010, KNOWN.gpsDirectionRef) // GPSImgDirectionRef
    .addRational(0x0011, KNOWN.gpsDirectionNum, KNOWN.gpsDirectionDen) // GPSImgDirection
    .addAscii(0x001d, KNOWN.gpsDateStamp); // GPSDateStamp

  const ifd1 = new IfdBuilder()
    .addShort(0x0103, 6) // Compression = JPEG
    .addLong(0x0201, 0) // ThumbnailOffset (placeholder; buildTiff doesn't auto-patch this one — see note below)
    .addLong(0x0202, KNOWN.thumbBytesLength); // ThumbnailLength
  const thumbnail = Buffer.alloc(KNOWN.thumbBytesLength, 0xab);

  const tiff = buildTiff({ ifd0, exif, gps, ifd1, thumbnail });

  const xmp = `<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about=""
    xmlns:dc="http://purl.org/dc/elements/1.1/"
    xmlns:photoshop="http://ns.adobe.com/photoshop/1.0/">
   <dc:creator><rdf:Seq><rdf:li>Test Author</rdf:li></rdf:Seq></dc:creator>
   <photoshop:City>Springfield</photoshop:City>
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;

  const iptc = iptcApp13([
    { dataset: 120, value: KNOWN.caption },
    ...KNOWN.keywords.map((k) => ({ dataset: 25, value: k })),
    { dataset: 80, value: KNOWN.byline },
    { dataset: 85, value: KNOWN.bylineTitle },
    { dataset: 110, value: KNOWN.credit },
    { dataset: 115, value: KNOWN.source },
    { dataset: 116, value: KNOWN.copyrightNotice },
    { dataset: 105, value: KNOWN.headline },
    { dataset: 90, value: KNOWN.city },
    { dataset: 95, value: KNOWN.state },
    { dataset: 101, value: KNOWN.country },
    { dataset: 15, value: KNOWN.category },
    { dataset: 5, value: KNOWN.objectName },
    { dataset: 40, value: KNOWN.specialInstructions },
  ]);

  return wrapJpeg(exifApp1(tiff), xmpApp1(xmp), iptc);
}

/** A JPEG with no metadata segments at all. */
export function buildBareJpeg(): Buffer {
  return wrapJpeg();
}

/** A raw, standalone .tiff file (no JPEG wrapper) — the TIFF header IS byte
 * 0 of the buffer, which is what lets ExtractThumbnailInfo compute a real
 * offset_in_input. Carries native IFD0 ImageWidth/ImageHeight (authoritative
 * for TIFF, unlike JPEG) plus a thumbnail in IFD1. */
export function buildRawTiffWithThumbnail(): Buffer {
  const ifd0 = new IfdBuilder()
    .addShort(0x0100, 800) // ImageWidth
    .addShort(0x0101, 600) // ImageHeight
    .addShort(0x0102, 8) // BitsPerSample
    .addAscii(0x010f, KNOWN.make);

  const ifd1 = new IfdBuilder()
    .addShort(0x0100, 160) // thumbnail ImageWidth
    .addShort(0x0101, 120) // thumbnail ImageHeight
    .addShort(0x0103, 6) // Compression = JPEG
    .addLong(0x0201, 0)
    .addLong(0x0202, KNOWN.thumbBytesLength);
  const thumbnail = Buffer.alloc(KNOWN.thumbBytesLength, 0xcd);

  return buildTiff({ ifd0, ifd1, thumbnail });
}
