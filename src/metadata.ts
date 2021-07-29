const btoa = require('btoa');
import { SERVER_URL } from './config';

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
  url?: string;
  version: Version;
}

export class Metadata {
  static MAX_CHAR = 30;
  constructor({ name, description, created_date, version }: MetadataInit) {
    this.name = name;
    this.description = description || `${name}, an ENS name.`;
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
    this.short_name = null;
    this.length = 0;
    this.url = `https://ens.domains/name/${name}`;
    this.version = version;
  }

  addAttribute(attribute: object) {
    this.attributes.push(attribute);
  }

  setImage(image_url: string) {
    this.image_url = image_url;
  }

  generateImage() {
    const name = this.name;
    let subdomainText, domain, subdomain, domainFontSize, subdomainFontSize;
    const labels = name.split('.');
    const isSubdomain = labels.length > 2;
    if (isSubdomain) {
      subdomain = labels.slice(0, labels.length - 2).join('.') + '.';
      domain = labels.slice(-2).join('.');
      if (Metadata._getCharLength(subdomain) > Metadata.MAX_CHAR) {
        subdomain = Metadata._textEllipsis(subdomain);
      }
      subdomainFontSize = Metadata._getFontSize(subdomain);
      subdomainText = `
      <text
        x="30"
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
    if (Metadata._getCharLength(domain) > Metadata.MAX_CHAR) {
      domain = Metadata._textEllipsis(domain);
    }
    domainFontSize = Metadata._getFontSize(domain);
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

  private _generateByVersion(
    ...args: [
      domainFontSize: number,
      subdomainText: string | undefined,
      isSubdomain: boolean,
      domain: string
    ]
  ): string {
    if (this.version === Version.v1) return Metadata.v1SVG.apply(null, args);
    if (this.version === Version.v1w) return Metadata.v1wSVG.apply(null, args);
    if (this.version === Version.v2) return Metadata.v2SVG.apply(null, args);
    throw Error(`Unknown Metadata version: ${this.version}`);
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
    // For multi byte unicode chars
    const length = this._getCharLength(name);
    let size;
    if (length <= 8) {
      size = 35;
    } else if (length <= 15) {
      size = 27;
    } else if (length <= 18) {
      size = 24;
    } else if (length <= 21) {
      size = 13;
    } else {
      size = 8;
    }
    return size;
  }

  static _hasNonAscii = (name: string) => {
    const ascii = /^[ -~]+$/;
    return !ascii.test(decodeURI(name));
  };

  static v1SVG(
    domainFontSize: number,
    subdomainText: string | undefined,
    isSubdomain: boolean,
    domain: string
  ) {
    return `
<svg width="286" height="270" viewBox="0 0 286 270" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="286" height="270" rx="24" fill="url(#paint0_linear)"/>
    ${subdomainText || ''}
    <text
      x="50%"
      y="140"
      text-anchor="middle"
      font-size="${domainFontSize}px"
      ${isSubdomain ? 'opacity="0.4"' : ''}
      fill="white">
        ${domain}
    </text>
    <defs>
    <style type="text/css">@import url('${SERVER_URL}/assets/font.css');</style>
    <style>
    text {
        font-family:PlusJakartaSans;
        font-weight:bold;
        font-style: normal;
        line-height: 34px;
        letter-spacing:-0.01em;
    }
    </style>
    <linearGradient id="paint0_linear" x1="0" y1="0" x2="269.553" y2="285.527" gradientUnits="userSpaceOnUse">
    <stop stop-color="#FCCF31"/>
    <stop offset="1" stop-color="#F55555"/>
    </linearGradient>
    </defs>
</svg>`;
  }

  static v1wSVG(
    domainFontSize: number,
    subdomainText: string | undefined,
    isSubdomain: boolean,
    domain: string
  ) {
    return `
<svg width="286" height="270" viewBox="0 0 286 270" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="286" height="270" rx="24" fill="url(#paint0_linear)"/>
    ${subdomainText || ''}
        <text
          y="125"
          text-anchor="middle"
          font-size="${domainFontSize}px"
          ${isSubdomain ? 'opacity="0.4"' : ''}
          fill="white">
            <tspan x="50%">${domain}</tspan>
            <tspan x="50%" dy="1.5em">(Wrapped)</tspan>
        </text>
        <defs>
          <style type="text/css">@import url('${SERVER_URL}/assets/font.css');</style>
          <style>
            text {
              font-family:PlusJakartaSans;
              font-weight:bold;
              font-style: normal;
              line-height: 34px;
              letter-spacing:-0.01em;
            }
          </style>
    <linearGradient id="paint0_linear" x1="0" y1="0" x2="269.553" y2="285.527" gradientUnits="userSpaceOnUse">
    <stop stop-color="#CE9FFC"/>
    <stop offset="1" stop-color="#7367F0"/>
    </linearGradient>
    </defs>
</svg>`;
  }

  static v2SVG(
    domainFontSize: number,
    subdomainText: string | undefined,
    isSubdomain: boolean,
    domain: string
  ) {
    return `
<svg width="286" height="270" viewBox="0 0 286 270" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="286" height="270" rx="24" fill="url(#paint0_linear)"/>
        <g transform="translate(30,30)">
        <path d="M6.03972 19.0875C6.50123 20.0841 7.64346 22.0541 7.64346 22.0541L20.8484 0L7.96075 9.09205C7.19283 9.60962 6.5628 10.3102 6.12625 11.1319C5.53928 12.3716 5.22742 13.7259 5.21248 15.1C5.19753 16.4742 5.47986 17.8351 6.03972 19.0875Z" fill="white"/>
        <path d="M0.152014 27.1672C0.302413 29.2771 0.912202 31.3312 1.94055 33.1919C2.96889 35.0527 4.39206 36.6772 6.11475 37.9567L20.8487 48C20.8487 48 11.6303 35.013 3.85487 22.0902C3.06769 20.7249 2.5385 19.2322 2.29263 17.6835C2.1838 16.9822 2.1838 16.2689 2.29263 15.5676C2.0899 15.9348 1.69636 16.6867 1.69636 16.6867C0.907964 18.2586 0.371029 19.9394 0.104312 21.6705C-0.0492081 23.5004 -0.0332426 25.3401 0.152014 27.1672Z" fill="white"/>
        <path d="M38.1927 28.9125C37.6928 27.9159 36.4555 25.946 36.4555 25.946L22.1514 48L36.1118 38.9138C36.9436 38.3962 37.6261 37.6956 38.099 36.8739C38.7358 35.6334 39.0741 34.2781 39.0903 32.9029C39.1065 31.5277 38.8001 30.1657 38.1927 28.9125Z" fill="white"/>
        <path d="M42.8512 20.8328C42.7008 18.7229 42.0909 16.6688 41.0624 14.8081C40.0339 12.9473 38.6105 11.3228 36.8876 10.0433L22.1514 0C22.1514 0 31.3652 12.987 39.1478 25.9098C39.933 27.2755 40.4603 28.7682 40.7043 30.3165C40.8132 31.0178 40.8132 31.7311 40.7043 32.4324C40.9071 32.0652 41.3007 31.3133 41.3007 31.3133C42.0892 29.7414 42.6262 28.0606 42.893 26.3295C43.0485 24.4998 43.0345 22.66 42.8512 20.8328Z" fill="white"/>
    </g>
    ${subdomainText || ''}
    <text
      x="30"
      y="235"
      font-size="${domainFontSize}px"
      ${isSubdomain ? 'opacity="0.4"' : ''}
      fill="white">
        ${domain}
    </text>
    <defs>
    <style type="text/css">@import url('${SERVER_URL}/assets/font.css');</style>
    <style>
    text {
        font-family:PlusJakartaSans;
        font-weight:bold;
        font-style: normal;
        line-height: 34px;
        letter-spacing:-0.01em;
    }
    </style>
    <linearGradient id="paint0_linear" x1="0" y1="0" x2="269.553" y2="285.527" gradientUnits="userSpaceOnUse">
        <stop stop-color="#2EE6CF"/>
        <stop offset="1" stop-color="#5B51D1"/>
    </linearGradient>
    </defs>
</svg>`;
  }
}
