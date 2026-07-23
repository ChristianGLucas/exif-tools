# exif-tools

Deterministic extraction of embedded metadata from image files — EXIF/TIFF, IPTC-IIM, XMP,
ICC, and GPS — for the [Axiom](https://axiom.dev) marketplace, published as
`christiangeorgelucas/exif-tools`.

Wraps [`exifr`](https://github.com/MikeKovarik/exifr) (MIT, pure JS, zero runtime
dependencies), a fast and complete JS metadata reader notable for parsing directly from a
truncated buffer containing just the file header rather than requiring the whole image.

This package only **reads** metadata — it never touches, decodes, or transforms pixel data.
See [`image-tools`](https://github.com/ChristianGLucas/image-tools) and
[`opencv-tools`](https://github.com/ChristianGLucas/opencv-tools) for pixel operations.

## Nodes

| Node | What it returns |
|---|---|
| `ParseAll` | Every metadata block (EXIF, GPS, IPTC, XMP, ICC), each as a JSON string |
| `ExtractExif` | Camera/exposure EXIF tags as typed fields (Make, Model, ISO, FNumber, ...) |
| `ExtractGps` | Decoded decimal latitude/longitude + altitude/speed/direction |
| `ExtractIptc` | Caption, keywords, byline, copyright, and other IPTC-IIM fields |
| `ExtractXmp` | The XMP/RDF packet as structured JSON |
| `GetOrientation` | The orientation tag (1-8) decoded into rotation degrees + flip |
| `ExtractTimestamps` | Every capture/modification timestamp EXIF and GPS carry |
| `ExtractCameraInfo` | Normalized camera/lens identity summary |
| `DetectMetadataBlocks` | Fast presence check for each block + sniffed container format |
| `GetImageInfo` | Basic dimensions/format read from the file header |
| `ExtractThumbnailInfo` | Embedded-thumbnail dimensions/encoding/length (not its bytes) |

## Input contract

Every node takes the same `ImageBytes` envelope — the caller-supplied **leading bytes** of an
image file. EXIF/IPTC/XMP/ICC segments live in the file header, so a full photo is rarely
needed: send the first 64 KB–1 MB of the file.

No node ever fetches over the network or touches the filesystem — bytes must always be
supplied directly by the caller. XMP (RDF/XML) is parsed via exifr's own minimal,
dependency-free reader with no DTD/entity support, so there is no XXE surface either.

## License

MIT — see [LICENSE](./LICENSE). Copyright (c) 2026 Christian George Lucas.

Built for the Axiom marketplace.
