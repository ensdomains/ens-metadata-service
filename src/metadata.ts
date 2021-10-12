const btoa = require('btoa');
import { SERVER_URL } from './config';
const { createCanvas } = require('canvas');

export enum Version {
  v1,
  v1w,
  v2,
}

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
    } else if(charLength > 25) {
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
    <tspan x="40" dy="-1.2em">${str.substring(0, index)}</tspan>
    <tspan x="40" dy="1.2em">${str.substring(index, str.length)}</tspan>
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
    const canvas = createCanvas(286, 270)
    const ctx = canvas.getContext('2d');
    ctx.font = "20px PlusJakartaSans";
    const text = ctx.measureText(name);
    // some nasty hack on calculation
    const fontSize = Math.floor(20 * ((210 - name.length) / text.width));
    return fontSize < 34 ? fontSize : 32;
  }

  static _hasNonAscii = (name: string) => {
    const ascii = /^[ -~]+$/;
    return !ascii.test(decodeURI(name));
  };

  private _filterUnformalized(name: string, tokenId: string) {
    // this method can be used to filter many unformal name type
    // for now it does check only for uppercase names
    return name === name.toLowerCase()
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
    return `
    <svg width="286" height="270" viewBox="0 0 286 270" fill="none" xmlns="http://www.w3.org/2000/svg">
      ${
        this.background_image
          ? `<defs>
            <pattern id="backImg" patternUnits="userSpaceOnUse" x="0" y="0" width="286" height="270">
              <image href="data:${this.mimeType};base64,${this.background_image}" width="286" height="270" /> 
            </pattern>
            <filter id="shadowy">
              <feDiffuseLighting in="SourceGraphic" result="light"
                  lighting-color="white">
                <feDistantLight azimuth="240" elevation="40"/>
              </feDiffuseLighting>
              <feComposite in="SourceGraphic" in2="light"
                          operator="arithmetic" k1="1" k2="0" k3="0" k4="0"/>
            </filter>
          </defs>
          <rect width="286" height="270" fill="url(#backImg)" filter="url(#shadowy)"/>`
          : `<rect width="286" height="270" fill="url(#paint0_linear)"/>`
      }
      <path d="M38.0397 51.0875C38.5012 52.0841 39.6435 54.0541 39.6435 54.0541L52.8484 32L39.9608 41.0921C39.1928 41.6096 38.5628 42.3102 38.1263 43.1319C37.5393 44.3716 37.2274 45.7259 37.2125 47.1C37.1975 48.4742 37.4799 49.8351 38.0397 51.0875Z" fill="white"/>
      <path d="M32.152 59.1672C32.3024 61.2771 32.9122 63.3312 33.9405 65.1919C34.9689 67.0527 36.3921 68.6772 38.1147 69.9567L52.8487 80C52.8487 80 43.6303 67.013 35.8549 54.0902C35.0677 52.7249 34.5385 51.2322 34.2926 49.6835C34.1838 48.9822 34.1838 48.2689 34.2926 47.5676C34.0899 47.9348 33.6964 48.6867 33.6964 48.6867C32.908 50.2586 32.371 51.9394 32.1043 53.6705C31.9508 55.5004 31.9668 57.3401 32.152 59.1672Z" fill="white"/>
      <path d="M70.1927 60.9125C69.6928 59.9159 68.4555 57.946 68.4555 57.946L54.1514 80L68.1118 70.9138C68.9436 70.3962 69.6261 69.6956 70.099 68.8739C70.7358 67.6334 71.0741 66.2781 71.0903 64.9029C71.1065 63.5277 70.8001 62.1657 70.1927 60.9125Z" fill="white"/>
      <path d="M74.8512 52.8328C74.7008 50.7229 74.0909 48.6688 73.0624 46.8081C72.0339 44.9473 70.6105 43.3228 68.8876 42.0433L54.1514 32C54.1514 32 63.3652 44.987 71.1478 57.9098C71.933 59.2755 72.4603 60.7682 72.7043 62.3165C72.8132 63.0178 72.8132 63.7311 72.7043 64.4324C72.9071 64.0652 73.3007 63.3133 73.3007 63.3133C74.0892 61.7414 74.6262 60.0606 74.893 58.3295C75.0485 56.4998 75.0345 54.66 74.8512 52.8328Z" fill="white"/>
      ${subdomainText || ''}
      <text
        x="32.5"
        y="231"
        font-size="${domainFontSize}px"
        ${isSubdomain ? 'opacity="0.4"' : ''}
        fill="white">
          ${domain}
      </text>
      <defs>
        <style type="text/css">@import url("${SERVER_URL}/assets/font.css");</style>
        <style>
          text {
            font-family:PlusJakartaSans;
            font-weight:bold;
            font-style: normal;
            line-height: 34px;
            letter-spacing:-0.01em;
          }
        </style>
        <linearGradient id="paint0_linear" x1="190.5" y1="302" x2="-64" y2="-172.5" gradientUnits="userSpaceOnUse">
        ${
          version !== Version.v1w
            ? `<stop stop-color="#44BCF0"/>
            <stop offset="0.428185" stop-color="#628BF3"/>
            <stop offset="1" stop-color="#A099FF"/>`
            : `<stop stop-color="#C1C1C1"/>
          <stop offset="1" stop-color="#4F4F4F"/>`
        }
        </linearGradient>
      </defs>
    </svg>`;
  }
}
