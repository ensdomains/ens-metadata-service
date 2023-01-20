import { Version }                              from '../base';
import {
  CANVAS_FONT_PATH,
  CANVAS_EMOJI_FONT_PATH,
}                                               from '../config';
import createSVGfromTemplate                    from '../svg-template';
import base64EncodeUnicode                      from '../utils/base64encode';
import { isASCII, findCharacterSet }            from '../utils/characterSet';
import { getCodePointLength, getSegmentLength } from '../utils/charLength';

// no ts declaration files

const { createCanvas, registerFont } = require('canvas');
const namehash                       = require('@ensdomains/eth-ens-namehash');
const { validate }                   = require('@ensdomains/ens-validation');


try {
  registerFont(CANVAS_FONT_PATH, { family: 'Satoshi' });
  registerFont(CANVAS_EMOJI_FONT_PATH, { family: 'Noto Color Emoji' });
} catch(error) {
  console.warn("Font registeration is failed.");
  console.warn(error);
}


export interface MetadataInit {
  name            : string;
  description?    : string;
  created_date    : number;
  registered_date?: Date | null;
  expiration_date?: Date | null;
  tokenId         : string;
  version         : Version;
}

export interface Metadata {
  name             : string;
  description      : string;
  attributes       : object[];
  name_length?     : number;
  segment_length?  : number;
  image            : string;
  image_url?       : string; // same as image, keep for backward compatibility
  is_normalized    : boolean;
  background_image?: string;
  mimeType?        : string;
  url?             : string | null;
  version          : Version;
}

export class Metadata {
  static MAX_CHAR = 60;
  constructor({
    name,
    description,
    created_date,
    tokenId,
    version,
  }: MetadataInit) {
    const label = name.substring(0, name.indexOf('.'));
    const is_valid = validate(name);
    this.is_normalized = is_valid && this._checkNormalized(name);
    this.name = this.is_normalized
      ? name
      : tokenId.replace(
          new RegExp('^(.{0,6}).*(.{4})$', 'im'),
          '[$1...$2].eth'
        );
    this.description =
      description ||
      `${this.name}, an ENS name.${
        !this.is_normalized ? ` (${name} is not in normalized form)` : ''
      }`;
    if (!is_valid || !isASCII(label)) {
      this.description +=
        ' ⚠️ ATTENTION: This name contains non-ASCII characters as shown above. \
Please be aware that there are characters that look identical or very \
similar to English letters, especially characters from Cyrillic and Greek. \
Also, traditional Chinese characters can look identical or very similar to \
simplified variants. For more information: \
https://en.wikipedia.org/wiki/IDN_homograph_attack';
    }
    this.attributes = [
      {
        trait_type: 'Created Date',
        display_type: 'date',
        value: created_date * 1000,
      },
    ];
    this.name_length = this._labelCharLength(label);
    this.segment_length = this._labelSegmentLength(label);
    this.addAttribute({
      trait_type: 'Length',
      display_type: 'number',
      value: this.name_length,
    });
    this.addAttribute({
      trait_type: 'Segment Length',
      display_type: 'number',
      value: this.segment_length,
    });
    this.url = this.is_normalized
      ? `https://app.ens.domains/name/${name}`
      : null;
    this.version = version;
    this.addAttribute({
      trait_type: 'Character Set',
      display_type: 'string',
      value: findCharacterSet(label),
    });
  }

  addAttribute(attribute: object) {
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
    let subdomainText, domain, subdomain, domainFontSize, subdomainFontSize;
    const labels = name.split('.');
    const isSubdomain = labels.length > 2;
    if (isSubdomain && !name.includes('...')) {
      subdomain = labels.slice(0, labels.length - 2).join('.') + '.';
      domain = labels.slice(-2).join('.');
      if (getSegmentLength(subdomain) > Metadata.MAX_CHAR) {
        subdomain = Metadata._textEllipsis(subdomain);
      }
      subdomainFontSize = Metadata._getFontSize(subdomain);
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
    } else {
      domain = name;
    }
    let charSegmentLength = getSegmentLength(domain);
    if (charSegmentLength > Metadata.MAX_CHAR) {
      domain = Metadata._textEllipsis(domain);
      domainFontSize = Metadata._getFontSize(domain);
      charSegmentLength = Metadata.MAX_CHAR;
    } else {
      domainFontSize = Metadata._getFontSize(domain);
    }
    if (charSegmentLength > 25) {
      domain = this._addSpan(domain, charSegmentLength / 2);
      domainFontSize *= 2;
    }
    const svg = this._generateByVersion(
      domainFontSize,
      subdomainText,
      isSubdomain,
      domain
    );
    try {
      this.setImage('data:image/svg+xml;base64,' + base64EncodeUnicode(svg));
    } catch (e) {
      console.log(domain, e);
      this.setImage('');
    }
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
    const canvas = createCanvas(270, 270, 'svg');
    const ctx = canvas.getContext('2d');
    ctx.font =
      '20px Satoshi, Noto Color Emoji, Apple Color Emoji, sans-serif';
    const fontMetrics = ctx.measureText(name);
    const fontSize = Math.floor(20 * (200 / fontMetrics.width));
    return fontSize < 34 ? fontSize : 32;
  }

  private _checkNormalized(name: string) {
    // this method can be used to filter many informal name types
    try {
      return name === namehash.normalize(name);
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
