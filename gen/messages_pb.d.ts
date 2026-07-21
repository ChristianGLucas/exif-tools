// package: christiangeorgelucas.exif_tools
// file: messages.proto

import * as jspb from "google-protobuf";

export class ImageBytes extends jspb.Message {
  getData(): Uint8Array | string;
  getData_asU8(): Uint8Array;
  getData_asB64(): string;
  setData(value: Uint8Array | string): void;

  getFilename(): string;
  setFilename(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ImageBytes.AsObject;
  static toObject(includeInstance: boolean, msg: ImageBytes): ImageBytes.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ImageBytes, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ImageBytes;
  static deserializeBinaryFromReader(message: ImageBytes, reader: jspb.BinaryReader): ImageBytes;
}

export namespace ImageBytes {
  export type AsObject = {
    data: Uint8Array | string,
    filename: string,
  }
}

export class MetadataError extends jspb.Message {
  getCode(): string;
  setCode(value: string): void;

  getMessage(): string;
  setMessage(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): MetadataError.AsObject;
  static toObject(includeInstance: boolean, msg: MetadataError): MetadataError.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: MetadataError, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): MetadataError;
  static deserializeBinaryFromReader(message: MetadataError, reader: jspb.BinaryReader): MetadataError;
}

export namespace MetadataError {
  export type AsObject = {
    code: string,
    message: string,
  }
}

export class ParseAllOutput extends jspb.Message {
  getFoundAny(): boolean;
  setFoundAny(value: boolean): void;

  hasError(): boolean;
  clearError(): void;
  getError(): MetadataError | undefined;
  setError(value?: MetadataError): void;

  clearBlocksPresentList(): void;
  getBlocksPresentList(): Array<string>;
  setBlocksPresentList(value: Array<string>): void;
  addBlocksPresent(value: string, index?: number): string;

  getExifJson(): string;
  setExifJson(value: string): void;

  getGpsJson(): string;
  setGpsJson(value: string): void;

  getIptcJson(): string;
  setIptcJson(value: string): void;

  getXmpJson(): string;
  setXmpJson(value: string): void;

  getIccJson(): string;
  setIccJson(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ParseAllOutput.AsObject;
  static toObject(includeInstance: boolean, msg: ParseAllOutput): ParseAllOutput.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ParseAllOutput, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ParseAllOutput;
  static deserializeBinaryFromReader(message: ParseAllOutput, reader: jspb.BinaryReader): ParseAllOutput;
}

export namespace ParseAllOutput {
  export type AsObject = {
    foundAny: boolean,
    error?: MetadataError.AsObject,
    blocksPresentList: Array<string>,
    exifJson: string,
    gpsJson: string,
    iptcJson: string,
    xmpJson: string,
    iccJson: string,
  }
}

export class ExifData extends jspb.Message {
  getFound(): boolean;
  setFound(value: boolean): void;

  hasError(): boolean;
  clearError(): void;
  getError(): MetadataError | undefined;
  setError(value?: MetadataError): void;

  getMake(): string;
  setMake(value: string): void;

  getModel(): string;
  setModel(value: string): void;

  getSoftware(): string;
  setSoftware(value: string): void;

  getLensModel(): string;
  setLensModel(value: string): void;

  getExposureTime(): number;
  setExposureTime(value: number): void;

  getExposureTimeFormatted(): string;
  setExposureTimeFormatted(value: string): void;

  getFNumber(): number;
  setFNumber(value: number): void;

  getIso(): number;
  setIso(value: number): void;

  getFocalLengthMm(): number;
  setFocalLengthMm(value: number): void;

  getFocalLength35mmMm(): number;
  setFocalLength35mmMm(value: number): void;

  getOrientation(): number;
  setOrientation(value: number): void;

  getDateTimeOriginal(): string;
  setDateTimeOriginal(value: string): void;

  getDateTimeDigitized(): string;
  setDateTimeDigitized(value: string): void;

  getDateTime(): string;
  setDateTime(value: string): void;

  getColorSpace(): string;
  setColorSpace(value: string): void;

  getExifImageWidth(): number;
  setExifImageWidth(value: number): void;

  getExifImageHeight(): number;
  setExifImageHeight(value: number): void;

  getExifJson(): string;
  setExifJson(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ExifData.AsObject;
  static toObject(includeInstance: boolean, msg: ExifData): ExifData.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ExifData, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ExifData;
  static deserializeBinaryFromReader(message: ExifData, reader: jspb.BinaryReader): ExifData;
}

export namespace ExifData {
  export type AsObject = {
    found: boolean,
    error?: MetadataError.AsObject,
    make: string,
    model: string,
    software: string,
    lensModel: string,
    exposureTime: number,
    exposureTimeFormatted: string,
    fNumber: number,
    iso: number,
    focalLengthMm: number,
    focalLength35mmMm: number,
    orientation: number,
    dateTimeOriginal: string,
    dateTimeDigitized: string,
    dateTime: string,
    colorSpace: string,
    exifImageWidth: number,
    exifImageHeight: number,
    exifJson: string,
  }
}

export class GpsData extends jspb.Message {
  getFound(): boolean;
  setFound(value: boolean): void;

  hasError(): boolean;
  clearError(): void;
  getError(): MetadataError | undefined;
  setError(value?: MetadataError): void;

  getLatitude(): number;
  setLatitude(value: number): void;

  getLongitude(): number;
  setLongitude(value: number): void;

  getHasAltitude(): boolean;
  setHasAltitude(value: boolean): void;

  getAltitudeMeters(): number;
  setAltitudeMeters(value: number): void;

  getHasSpeed(): boolean;
  setHasSpeed(value: boolean): void;

  getSpeed(): number;
  setSpeed(value: number): void;

  getSpeedRef(): string;
  setSpeedRef(value: string): void;

  getHasDirection(): boolean;
  setHasDirection(value: boolean): void;

  getDirectionDegrees(): number;
  setDirectionDegrees(value: number): void;

  getDirectionRef(): string;
  setDirectionRef(value: string): void;

  getTimestamp(): string;
  setTimestamp(value: string): void;

  getGpsJson(): string;
  setGpsJson(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): GpsData.AsObject;
  static toObject(includeInstance: boolean, msg: GpsData): GpsData.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: GpsData, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): GpsData;
  static deserializeBinaryFromReader(message: GpsData, reader: jspb.BinaryReader): GpsData;
}

export namespace GpsData {
  export type AsObject = {
    found: boolean,
    error?: MetadataError.AsObject,
    latitude: number,
    longitude: number,
    hasAltitude: boolean,
    altitudeMeters: number,
    hasSpeed: boolean,
    speed: number,
    speedRef: string,
    hasDirection: boolean,
    directionDegrees: number,
    directionRef: string,
    timestamp: string,
    gpsJson: string,
  }
}

export class IptcData extends jspb.Message {
  getFound(): boolean;
  setFound(value: boolean): void;

  hasError(): boolean;
  clearError(): void;
  getError(): MetadataError | undefined;
  setError(value?: MetadataError): void;

  getCaption(): string;
  setCaption(value: string): void;

  clearKeywordsList(): void;
  getKeywordsList(): Array<string>;
  setKeywordsList(value: Array<string>): void;
  addKeywords(value: string, index?: number): string;

  getByline(): string;
  setByline(value: string): void;

  getBylineTitle(): string;
  setBylineTitle(value: string): void;

  getCredit(): string;
  setCredit(value: string): void;

  getSource(): string;
  setSource(value: string): void;

  getCopyrightNotice(): string;
  setCopyrightNotice(value: string): void;

  getHeadline(): string;
  setHeadline(value: string): void;

  getCity(): string;
  setCity(value: string): void;

  getState(): string;
  setState(value: string): void;

  getCountry(): string;
  setCountry(value: string): void;

  getCategory(): string;
  setCategory(value: string): void;

  clearSupplementalCategoriesList(): void;
  getSupplementalCategoriesList(): Array<string>;
  setSupplementalCategoriesList(value: Array<string>): void;
  addSupplementalCategories(value: string, index?: number): string;

  getObjectName(): string;
  setObjectName(value: string): void;

  getSpecialInstructions(): string;
  setSpecialInstructions(value: string): void;

  getIptcJson(): string;
  setIptcJson(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): IptcData.AsObject;
  static toObject(includeInstance: boolean, msg: IptcData): IptcData.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: IptcData, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): IptcData;
  static deserializeBinaryFromReader(message: IptcData, reader: jspb.BinaryReader): IptcData;
}

export namespace IptcData {
  export type AsObject = {
    found: boolean,
    error?: MetadataError.AsObject,
    caption: string,
    keywordsList: Array<string>,
    byline: string,
    bylineTitle: string,
    credit: string,
    source: string,
    copyrightNotice: string,
    headline: string,
    city: string,
    state: string,
    country: string,
    category: string,
    supplementalCategoriesList: Array<string>,
    objectName: string,
    specialInstructions: string,
    iptcJson: string,
  }
}

export class XmpData extends jspb.Message {
  getFound(): boolean;
  setFound(value: boolean): void;

  hasError(): boolean;
  clearError(): void;
  getError(): MetadataError | undefined;
  setError(value?: MetadataError): void;

  getXmpJson(): string;
  setXmpJson(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): XmpData.AsObject;
  static toObject(includeInstance: boolean, msg: XmpData): XmpData.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: XmpData, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): XmpData;
  static deserializeBinaryFromReader(message: XmpData, reader: jspb.BinaryReader): XmpData;
}

export namespace XmpData {
  export type AsObject = {
    found: boolean,
    error?: MetadataError.AsObject,
    xmpJson: string,
  }
}

export class OrientationInfo extends jspb.Message {
  getFound(): boolean;
  setFound(value: boolean): void;

  hasError(): boolean;
  clearError(): void;
  getError(): MetadataError | undefined;
  setError(value?: MetadataError): void;

  getOrientation(): number;
  setOrientation(value: number): void;

  getRotationDegrees(): number;
  setRotationDegrees(value: number): void;

  getFlipHorizontal(): boolean;
  setFlipHorizontal(value: boolean): void;

  getFlipVertical(): boolean;
  setFlipVertical(value: boolean): void;

  getDescription(): string;
  setDescription(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): OrientationInfo.AsObject;
  static toObject(includeInstance: boolean, msg: OrientationInfo): OrientationInfo.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: OrientationInfo, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): OrientationInfo;
  static deserializeBinaryFromReader(message: OrientationInfo, reader: jspb.BinaryReader): OrientationInfo;
}

export namespace OrientationInfo {
  export type AsObject = {
    found: boolean,
    error?: MetadataError.AsObject,
    orientation: number,
    rotationDegrees: number,
    flipHorizontal: boolean,
    flipVertical: boolean,
    description: string,
  }
}

export class TimestampData extends jspb.Message {
  getFound(): boolean;
  setFound(value: boolean): void;

  hasError(): boolean;
  clearError(): void;
  getError(): MetadataError | undefined;
  setError(value?: MetadataError): void;

  getDateTimeOriginal(): string;
  setDateTimeOriginal(value: string): void;

  getDateTimeDigitized(): string;
  setDateTimeDigitized(value: string): void;

  getDateTimeModified(): string;
  setDateTimeModified(value: string): void;

  getGpsTimestamp(): string;
  setGpsTimestamp(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): TimestampData.AsObject;
  static toObject(includeInstance: boolean, msg: TimestampData): TimestampData.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: TimestampData, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): TimestampData;
  static deserializeBinaryFromReader(message: TimestampData, reader: jspb.BinaryReader): TimestampData;
}

export namespace TimestampData {
  export type AsObject = {
    found: boolean,
    error?: MetadataError.AsObject,
    dateTimeOriginal: string,
    dateTimeDigitized: string,
    dateTimeModified: string,
    gpsTimestamp: string,
  }
}

export class CameraInfo extends jspb.Message {
  getFound(): boolean;
  setFound(value: boolean): void;

  hasError(): boolean;
  clearError(): void;
  getError(): MetadataError | undefined;
  setError(value?: MetadataError): void;

  getMake(): string;
  setMake(value: string): void;

  getModel(): string;
  setModel(value: string): void;

  getLensMake(): string;
  setLensMake(value: string): void;

  getLensModel(): string;
  setLensModel(value: string): void;

  getSoftware(): string;
  setSoftware(value: string): void;

  getBodySerialNumber(): string;
  setBodySerialNumber(value: string): void;

  getSummary(): string;
  setSummary(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): CameraInfo.AsObject;
  static toObject(includeInstance: boolean, msg: CameraInfo): CameraInfo.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: CameraInfo, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): CameraInfo;
  static deserializeBinaryFromReader(message: CameraInfo, reader: jspb.BinaryReader): CameraInfo;
}

export namespace CameraInfo {
  export type AsObject = {
    found: boolean,
    error?: MetadataError.AsObject,
    make: string,
    model: string,
    lensMake: string,
    lensModel: string,
    software: string,
    bodySerialNumber: string,
    summary: string,
  }
}

export class BlockPresence extends jspb.Message {
  hasError(): boolean;
  clearError(): void;
  getError(): MetadataError | undefined;
  setError(value?: MetadataError): void;

  getHasExif(): boolean;
  setHasExif(value: boolean): void;

  getHasGps(): boolean;
  setHasGps(value: boolean): void;

  getHasIptc(): boolean;
  setHasIptc(value: boolean): void;

  getHasXmp(): boolean;
  setHasXmp(value: boolean): void;

  getHasIcc(): boolean;
  setHasIcc(value: boolean): void;

  getHasThumbnail(): boolean;
  setHasThumbnail(value: boolean): void;

  getDetectedFormat(): string;
  setDetectedFormat(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): BlockPresence.AsObject;
  static toObject(includeInstance: boolean, msg: BlockPresence): BlockPresence.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: BlockPresence, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): BlockPresence;
  static deserializeBinaryFromReader(message: BlockPresence, reader: jspb.BinaryReader): BlockPresence;
}

export namespace BlockPresence {
  export type AsObject = {
    error?: MetadataError.AsObject,
    hasExif: boolean,
    hasGps: boolean,
    hasIptc: boolean,
    hasXmp: boolean,
    hasIcc: boolean,
    hasThumbnail: boolean,
    detectedFormat: string,
  }
}

export class ImageInfo extends jspb.Message {
  getFound(): boolean;
  setFound(value: boolean): void;

  hasError(): boolean;
  clearError(): void;
  getError(): MetadataError | undefined;
  setError(value?: MetadataError): void;

  getWidth(): number;
  setWidth(value: number): void;

  getHeight(): number;
  setHeight(value: number): void;

  getFormat(): string;
  setFormat(value: string): void;

  getBitDepth(): number;
  setBitDepth(value: number): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ImageInfo.AsObject;
  static toObject(includeInstance: boolean, msg: ImageInfo): ImageInfo.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ImageInfo, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ImageInfo;
  static deserializeBinaryFromReader(message: ImageInfo, reader: jspb.BinaryReader): ImageInfo;
}

export namespace ImageInfo {
  export type AsObject = {
    found: boolean,
    error?: MetadataError.AsObject,
    width: number,
    height: number,
    format: string,
    bitDepth: number,
  }
}

export class ThumbnailInfo extends jspb.Message {
  getFound(): boolean;
  setFound(value: boolean): void;

  hasError(): boolean;
  clearError(): void;
  getError(): MetadataError | undefined;
  setError(value?: MetadataError): void;

  getWidth(): number;
  setWidth(value: number): void;

  getHeight(): number;
  setHeight(value: number): void;

  getFormat(): string;
  setFormat(value: string): void;

  getByteLength(): number;
  setByteLength(value: number): void;

  getOffsetInInput(): number;
  setOffsetInInput(value: number): void;

  getBytesAvailableInInput(): boolean;
  setBytesAvailableInInput(value: boolean): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ThumbnailInfo.AsObject;
  static toObject(includeInstance: boolean, msg: ThumbnailInfo): ThumbnailInfo.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ThumbnailInfo, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ThumbnailInfo;
  static deserializeBinaryFromReader(message: ThumbnailInfo, reader: jspb.BinaryReader): ThumbnailInfo;
}

export namespace ThumbnailInfo {
  export type AsObject = {
    found: boolean,
    error?: MetadataError.AsObject,
    width: number,
    height: number,
    format: string,
    byteLength: number,
    offsetInInput: number,
    bytesAvailableInInput: boolean,
  }
}

