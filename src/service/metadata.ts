import { ens_normalize, ens_beautify }              from '@adraffy/ens-normalize';
import { 
  CanvasRenderingContext2D, 
  createCanvas, 
  registerFont 
}                                                   from 'canvas';
import { Version }                                  from '../base';
import { CANVAS_FONT_PATH, CANVAS_EMOJI_FONT_PATH } from '../config';
import createSVGfromTemplate                        from '../svg-template';
import base64EncodeUnicode                          from '../utils/base64encode';
import { isASCII, findCharacterSet }                from '../utils/characterSet';
import { getCodePointLength, getSegmentLength }     from '../utils/charLength';
import { WrapperState }                             from '../utils/fuse';


interface Attribute {
  trait_type: string,
  display_type: string,
  value: any
}

export interface MetadataInit {
  name               : string;
  description?       : string;
  created_date       : number;
  registered_date?   : Date | null;
  expiration_date?   : Date | null;
  tokenId            : string;
  version            : Version;
  last_request_date? : number;
}

export interface Metadata {
  name               : string;
  description        : string;
  attributes         : Attribute[];
  name_length?       : number;
  segment_length?    : number;
  image              : string;
  image_url?         : string; // same as image, keep for backward compatibility
  is_normalized      : boolean;
  background_image?  : string;
  mimeType?          : string;
  url?               : string | null;
  version            : Version;
  last_request_date? : number;
}

export class Metadata {
  static MAX_CHAR = 60;
  static ctx: CanvasRenderingContext2D;

  constructor({
    name,
    description,
    created_date,
    tokenId,
    version,
    last_request_date,
  }: MetadataInit) {
    const label = this.getLabel(name);
    this.is_normalized = this._checkNormalized(name);
    this.name = this.formatName(name, tokenId);
    this.description = this.formatDescription(name, description);
    this.attributes = this.initializeAttributes(created_date, label);
    this.url = this.is_normalized
      ? `https://app.ens.domains/name/${name}`
      : null;
    this.last_request_date = last_request_date;
    this.version = version;
  }

  getLabel(name: string) {
    return name.substring(0, name.indexOf('.'));
  }

  formatName(name: string, tokenId: string) {
    return this.is_normalized
      ? ens_beautify(name)
      : tokenId.replace(
          new RegExp('^(.{0,6}).*(.{4})$', 'im'),
          '[$1...$2].eth'
        );
  }

  formatDescription(name: string, description?: string) {
    const baseDescription = description || `${this.name}, an ENS name.`;
    const normalizedNote = !this.is_normalized
      ? ` (${name} is not in normalized form)`
      : '';
    const asciiWarning = this.generateAsciiWarning(this.getLabel(name));
    return `${baseDescription}${normalizedNote}${asciiWarning}`;
  }

  generateAsciiWarning(label: string) {
    if (!isASCII(label)) {
      return (
        ' ⚠️ ATTENTION: This name contains non-ASCII characters as shown above. ' +
        'Please be aware that there are characters that look identical or very ' +
        'similar to English letters, especially characters from Cyrillic and Greek. ' +
        'Also, traditional Chinese characters can look identical or very similar to ' +
        'simplified variants. For more information: ' +
        'https://en.wikipedia.org/wiki/IDN_homograph_attack'
      );
    }
    return '';
  }

  generateRuggableWarning(
    label: string,
    version: Version,
    wrapperState: WrapperState
  ) {
    if (
      version == Version.v2 &&
      wrapperState === WrapperState.WRAPPED &&
      (label.split('.').length > 1 || !label.endsWith('.eth'))
    ) {
      return ' [ ⚠️ ATTENTION: THE NFT FOR THIS NAME CAN BE REVOKED AT ANY TIME WHILE IT IS IN THE WRAPPED STATE ]';
    }
    return '';
  }

  initializeAttributes(created_date: number, label: string) {
    const name_length = this._labelCharLength(label);
    const segment_length = this._labelSegmentLength(label);
    const character_set = findCharacterSet(label);
    return [
      {
        trait_type: 'Created Date',
        display_type: 'date',
        value: created_date * 1000,
      },
      {
        trait_type: 'Length',
        display_type: 'number',
        value: name_length,
      },
      {
        trait_type: 'Segment Length',
        display_type: 'number',
        value: segment_length,
      },
      {
        trait_type: 'Character Set',
        display_type: 'string',
        value: character_set,
      },
    ];
  }

  addAttribute(attribute: Attribute) {
    this.attributes.push(attribute);
  }

  setImage(image_url: string) {
    this.image = image_url;
    this.image_url = image_url;
  }

  setBackground(base64: string, mimeType?: string) {
    if (this.is_normalized) {
      this.background_image = base64;
      this.mimeType = mimeType;
    }
  }

  generateImage() {
    const name = this.name;
    const labels = name.split('.');
    const isSubdomain = labels.length > 2;

    const { domain, subdomainText } = this.processSubdomain(name, isSubdomain);
    const { processedDomain, domainFontSize } = this.processDomain(domain);
    const svg = this._generateByVersion(
      domainFontSize,
      subdomainText,
      isSubdomain,
      processedDomain
    );

    try {
      this.setImage('data:image/svg+xml;base64,' + base64EncodeUnicode(svg));
    } catch (e) {
      console.log("generateImage", processedDomain, e);
      this.setImage('');
    }
  }

  processSubdomain(name: string, isSubdomain: boolean) {
    let subdomainText;
    let domain = name;

    if (isSubdomain && !name.includes('...')) {
      const labels = name.split('.');
      let subdomain = labels.slice(0, labels.length - 2).join('.') + '.';
      domain = labels.slice(-2).join('.');

      if (getSegmentLength(subdomain) > Metadata.MAX_CHAR) {
        subdomain = Metadata._textEllipsis(subdomain);
      }

      const subdomainFontSize = Metadata._getFontSize(subdomain);
      subdomainText = `
        <text
          x="32.5"
          y="200"
          font-size="${subdomainFontSize}px"
          fill="white"
        >
          ${subdomain}
        </text>
      `;
    }

    return { domain, subdomainText };
  }

  processDomain(domain: string) {
    let charSegmentLength = getSegmentLength(domain);

    if (charSegmentLength > Metadata.MAX_CHAR) {
      domain = Metadata._textEllipsis(domain);
      charSegmentLength = Metadata.MAX_CHAR;
    }

    let domainFontSize = Metadata._getFontSize(domain);

    if (charSegmentLength > 25) {
      domain = this._addSpan(domain, charSegmentLength / 2);
      domainFontSize = (domainFontSize - 1) * 2;
    }

    return { processedDomain: domain, domainFontSize };
  }

  private _addSpan(str: string, index: number) {
    return `
    <tspan x="32" dy="-1.2em">${str.substring(0, index)}</tspan>
    <tspan x="32" dy="1.2em">${str.substring(index, str.length)}</tspan>
    `;
  }

  private _generateByVersion(
    ...args: [
      domainFontSize: number,
      subdomainText: string | undefined,
      isSubdomain: boolean,
      domain: string
    ]
  ): string {
    if (!Object.values(Version).includes(this.version)) {
      throw Error(`Unknown Metadata version: ${this.version}`);
    }
    return this._renderSVG.apply(this, [...args, this.version]);
  }

  static _textEllipsis(name: string) {
    const _nameLength = name.length;
    return (
      name.substring(0, Metadata.MAX_CHAR - 7) +
      '...' +
      name.substring(_nameLength - 7, _nameLength - 4) +
      '.eth'
    );
  }

  static _getFontSize(name: string): number {
    if (!this.ctx) {
      try {
        registerFont(CANVAS_FONT_PATH, { family: 'Satoshi' });
        registerFont(CANVAS_EMOJI_FONT_PATH, { family: 'Noto Color Emoji' });
      } catch (error) {
        console.warn('Font registration is failed.');
        console.warn(error);
      }
      const canvas = createCanvas(270, 270, 'svg');
      this.ctx = canvas.getContext('2d');
      this.ctx.font =
        '20px Satoshi, Noto Color Emoji, Apple Color Emoji, sans-serif';
    }
    const fontMetrics = this.ctx.measureText(name);
    const fontSize = Math.floor(20 * (200 / fontMetrics.width));
    return fontSize < 34 ? fontSize : 32;
  }

  private _checkNormalized(name: string) {
    // this method can be used to filter many informal name types
    try {
      return name === ens_normalize(name);
    } catch {
      return false;
    }
  }

  private _labelCharLength(label: string): number {
    if (!label) throw Error('Label cannot be empty!');
    return getCodePointLength(label);
  }

  private _labelSegmentLength(label: string): number {
    if (!label) throw Error('Label cannot be empty!');
    return getSegmentLength(label);
  }

  private _renderSVG(
    domainFontSize: number,
    subdomainText: string | undefined,
    isSubdomain: boolean,
    domain: string,
    version: Version
  ) {
    return createSVGfromTemplate({
      backgroundImage: this.background_image,
      domain: domain.trim(),
      domainFontSize,
      isNormalized: this.is_normalized,
      isSubdomain,
      mimeType: this.mimeType,
      subdomainText,
      version,
    });
  }
}
