# exif-tools

Deterministic extraction of embedded metadata from image files — EXIF/TIFF, IPTC-IIM, XMP,
ICC, and GPS — for the [Axiom](https://axiomide.com) marketplace, published as
`christiangeorgelucas/exif-tools`.

Wraps [`exifr`](https://github.com/MikeKovarik/exifr) (MIT, pure JS, zero runtime
dependencies), a fast and complete JS metadata reader notable for parsing directly from a
truncated buffer containing just the file header rather than requiring the whole image.

This package only **reads** metadata — it never touches, decodes, or transforms pixel data.
See [`image-tools`](https://github.com/ChristianGLucas/image-tools) and
[`opencv-tools`](https://github.com/ChristianGLucas/opencv-tools) for pixel operations.

## Use it from your agent or app

Every node in this package is a **live, auto-scaling API endpoint** on the
[Axiom](https://axiomide.com) marketplace — call it from an AI agent or your own
code, with nothing to self-host.

**📦 See it on the marketplace:**
https://dev.axiomide.com/marketplace/christiangeorgelucas/exif-tools@0.1.1

**Hook it up to an AI agent (MCP).** Add Axiom's hosted MCP server to any MCP
client and every node becomes a typed tool your agent can call — search the
catalog, inspect a schema, and invoke it directly.

```bash
# Claude Code
claude mcp add --transport http axiom https://api.axiomide.com/mcp \
  --header "Authorization: Bearer $AXIOM_API_KEY"
```

Claude Desktop, Cursor, or any config-based client:

```json
{
  "mcpServers": {
    "axiom": {
      "type": "http",
      "url": "https://api.axiomide.com/mcp",
      "headers": { "Authorization": "Bearer YOUR_AXIOM_API_KEY" }
    }
  }
}
```

**Call it from the CLI.**

```bash
axiom invoke christiangeorgelucas/exif-tools/ParseAll --input '{ ... }'
```

**Call it over HTTP.**

```bash
curl -X POST https://api.axiomide.com/invocations/v1/nodes/christiangeorgelucas/exif-tools/0.1.1/ParseAll \
  -H "Authorization: Bearer $AXIOM_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{ ... }'
```

> Input/output schema for each node is on the marketplace page above, or via
> `axiom inspect node christiangeorgelucas/exif-tools/ParseAll`.

### Get started free

Install the CLI:

```bash
# macOS / Linux — Homebrew
brew install axiomide/tap/axiom

# macOS / Linux — install script
curl -fsSL https://raw.githubusercontent.com/AxiomIDE/axiom-releases/main/install.sh | sh
```

**Windows:** download the `windows/amd64` `.zip` from the
[releases page](https://github.com/AxiomIDE/axiom-releases/releases), unzip it,
and put `axiom.exe` on your `PATH`.

Then `axiom version` to verify, `axiom login` (GitHub or Google) to authenticate,
and create an API key under **Console → API Keys**. Docs and sign-up at
**[axiomide.com](https://axiomide.com)**.

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
