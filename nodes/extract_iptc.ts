import exifr from 'exifr';
import { ImageBytes, IptcData } from '../gen/messages_pb';
import { AxiomContext } from '../gen/axiomContext';
import { toSafeBuffer, classifyParseError, toJsonString } from './lib';

function asStringList(value: unknown): string[] {
  if (value === undefined || value === null) return [];
  if (Array.isArray(value)) return value.map((v) => String(v));
  return [String(value)];
}

/**
 * Extract the IPTC-IIM photo cataloging & rights-attribution fields most
 * commonly used by news/stock-photo workflows: Caption, Keywords, Byline
 * (+ BylineTitle), Credit, Source, CopyrightNotice, Headline, City/State/
 * Country, Category (+ SupplementalCategories), ObjectName, and
 * SpecialInstructions — as typed fields, plus the complete raw IPTC tag
 * set as a JSON string. found=false (no error) means the image parsed but
 * carried no IPTC block — most photos don't have one; it's populated by
 * editorial/DAM tools (Photoshop, digiKam, news wire software), not
 * cameras. Input must be the image's leading header bytes, capped at ~3 MiB.
 *
 * @param ax - Platform context: ax.log for logging, ax.secrets for secrets.
 */
export async function extractIptc(ax: AxiomContext, input: ImageBytes): Promise<IptcData> {
  const out = new IptcData();
  const safe = toSafeBuffer(input);
  if (safe.ok === false) {
    out.setError(safe.error);
    return out;
  }

  try {
    const iptc: any = await exifr.parse(safe.buffer, {
      tiff: false,
      xmp: false,
      icc: false,
      iptc: true,
      mergeOutput: false,
      sanitize: true,
    }).then((r: any) => r?.iptc);

    if (!iptc || Object.keys(iptc).length === 0) {
      out.setFound(false);
      return out;
    }

    out.setFound(true);
    if (iptc.Caption) out.setCaption(String(iptc.Caption));
    out.setKeywordsList(asStringList(iptc.Keywords));
    if (iptc.Byline) out.setByline(String(iptc.Byline));
    if (iptc.BylineTitle) out.setBylineTitle(String(iptc.BylineTitle));
    if (iptc.Credit) out.setCredit(String(iptc.Credit));
    if (iptc.Source) out.setSource(String(iptc.Source));
    if (iptc.CopyrightNotice) out.setCopyrightNotice(String(iptc.CopyrightNotice));
    if (iptc.Headline) out.setHeadline(String(iptc.Headline));
    if (iptc.City) out.setCity(String(iptc.City));
    if (iptc.State) out.setState(String(iptc.State));
    if (iptc.Country) out.setCountry(String(iptc.Country));
    if (iptc.Category) out.setCategory(String(iptc.Category));
    out.setSupplementalCategoriesList(asStringList(iptc.SupplementalCategories));
    if (iptc.ObjectName) out.setObjectName(String(iptc.ObjectName));
    if (iptc.SpecialInstructions) out.setSpecialInstructions(String(iptc.SpecialInstructions));
    out.setIptcJson(toJsonString(iptc));
  } catch (e) {
    out.setError(classifyParseError(e));
  }

  return out;
}
