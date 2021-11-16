import { Version } from "./base";
import createSVGfromTemplate from "./svg-template";

const btoa = require('btoa');
const { createCanvas, registerFont } = require('canvas');
const namehash = require('@ensdomains/eth-ens-namehash');

// registerFont('./src/assets/PlusJakartaSans-Bold.woff', {family: "Plus Jakarta Sans", weight: "600", style: "normal"})

export interface MetadataInit {
  name: string;
  description?: string;
  created_date: number;
  registered_date?: Date | null;
  expiration_date?: Date | null;
  tokenId: string;
  version: Version;
}

export interface Metadata {
  name: string;
  description?: string;
  attributes: object[];
  name_length?: number;
  short_name?: string | null;
  length?: number;
  image_url?: string;
  background_image?: string;
  mimeType?: string;
  url?: string | null;
  version: Version;
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
    this.name = this._filterUnformalized(name, tokenId);
    const isUnformal = this.name.includes('...');

    this.description =
      description ||
      `${this.name}, an ENS name.${isUnformal ? ` (${name} is not in normalized form)` : ''}`;
    if (Metadata._hasNonAscii(name)) {
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
    this.name_length = name.length;
    this.short_name = null; // not implemented
    this.length = 0; // not implemented
    this.url = !isUnformal ? `https://app.ens.domains/name/${name}` : null;
    this.version = version;
  }

  addAttribute(attribute: object) {
    this.attributes.push(attribute);
  }

  setImage(image_url: string) {
    if (!this.name.includes('...')) {
      this.image_url = image_url;
    }
  }

  setBackground(base64: string, mimeType?: string) {
    if (!this.name.includes('...')) {
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
      if (Metadata._getCharLength(subdomain) > Metadata.MAX_CHAR) {
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
    const charLength = Metadata._getCharLength(domain);
    domainFontSize = Metadata._getFontSize(domain);
    if (charLength > Metadata.MAX_CHAR) {
      domain = Metadata._textEllipsis(domain);
    }
    if (charLength > 25) {
      domain = this._addSpan(domain, domain.length / 2);
      domainFontSize *= 2
    }
    const svg = this._generateByVersion(
      domainFontSize,
      subdomainText,
      isSubdomain,
      domain
    );
    try {
      this.image_url =
        'data:image/svg+xml;base64,' + Metadata._b64EncodeUnicode(svg);
    } catch (e) {
      console.log(domain, e);
      this.image_url = '';
    }
  }

  private _addSpan(str: string, index: number){
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

  static _b64EncodeUnicode(str: string) {
    return btoa(
      encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function (match, p1) {
        return String.fromCharCode(parseInt(p1, 16));
      })
    );
  }

  static _textEllipsis(name: string) {
    return name.substring(0, Metadata.MAX_CHAR - 3) + '...';
  }

  static _getCharLength(name: string): number {
    let byteLength = Buffer.byteLength(name);
    byteLength = byteLength === name.length ? byteLength : byteLength / 1.6;
    return Math.floor(byteLength);
  }

  static _getFontSize(name: string): number {
    const canvas = createCanvas(270, 270)
    const ctx = canvas.getContext('2d');
    ctx.font = "20px PlusJakartaSans";
    const text = ctx.measureText(name);
    // some nasty hack on calculation
    const fontSize = Math.floor(20 * ((196 - name.length) / text.width));
    return fontSize < 34 ? fontSize : 32;
  }

  static _hasNonAscii = (name: string) => {
    const ascii = /^[ -~]+$/;
    return !ascii.test(decodeURI(name));
  };

  private _filterUnformalized(name: string, tokenId: string) {
    // this method can be used to filter many unformal name type
    // for now it does check only for uppercase names
    return name === namehash.normalize(name)
      ? name
      : tokenId.replace(
          new RegExp('^(.{0,6}).*(.{4})$', 'im'),
          '[$1...$2].eth'
        );
  }

  private _renderSVG(
    domainFontSize: number,
    subdomainText: string | undefined,
    isSubdomain: boolean,
    domain: string,
    version: Version
  ) {
    return createSVGfromTemplate({
      background_image: this.background_image,
      domain,
      domainFontSize,
      isSubdomain,
      mimeType: this.mimeType,
      subdomainText,
      version
    });
  }
}
