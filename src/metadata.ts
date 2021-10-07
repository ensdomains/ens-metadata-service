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
  tokenId: string;
  version: Version;
}

export interface Metadata {
  name: string;
  description?: string;
  attributes: object[];
  name_length?: number;
  image_url?: string;
  is_normalized: boolean;
  background_image?: string;
  mimeType?: string;
  url?: string | null;
  version: Version;
}

export class Metadata {
  static MAX_CHAR = 30;
  constructor({
    name,
    description,
    created_date,
    tokenId,
    version,
  }: MetadataInit) {
    this.name = this._filterUnformalized(name, tokenId);

    this.description =
      description ||
      `${this.name}, an ENS name.${
        !this.is_normalized ? ` (${name} is not in normalized form)` : ''
      }`;
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
    this.name_length = this._labelLength(name);
    this.url = this.is_normalized
      ? `https://app.ens.domains/name/${name}`
      : null;
    this.version = version;
  }

  addAttribute(attribute: object) {
    this.attributes.push(attribute);
  }

  setImage(image_url: string) {
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

  private _filterUnformalized(name: string, tokenId: string) {
    // this method can be used to filter many unformal name type
    // for now it does check only for uppercase names
    this.is_normalized = name === name.toLowerCase();
    return this.is_normalized
      ? name
      : tokenId.replace(
          new RegExp('^(.{0,6}).*(.{4})$', 'im'),
          '[$1...$2].eth'
        );
  }

  private _labelLength(name: string): number {
    const parts = name.split('.');
    const label = parts[parts.length - 2];
    if (!label) throw Error('Label cannot be empty!');
    return label.length;
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
          : this.is_normalized
          ? `<rect width="286" height="270" fill="url(#paint0_linear)"/>`
          : `<rect width="286" height="270" fill="url(#paint0_linear)"/><rect width="286" height="270" fill="url(#paint1_linear)"/>`
      }
      <path d="M38.0397 51.0875C38.5012 52.0841 39.6435 54.0541 39.6435 54.0541L52.8484 32L39.9608 41.0921C39.1928 41.6096 38.5628 42.3102 38.1263 43.1319C37.5393 44.3716 37.2274 45.7259 37.2125 47.1C37.1975 48.4742 37.4799 49.8351 38.0397 51.0875Z" fill="white"/>
      <path d="M32.152 59.1672C32.3024 61.2771 32.9122 63.3312 33.9405 65.1919C34.9689 67.0527 36.3921 68.6772 38.1147 69.9567L52.8487 80C52.8487 80 43.6303 67.013 35.8549 54.0902C35.0677 52.7249 34.5385 51.2322 34.2926 49.6835C34.1838 48.9822 34.1838 48.2689 34.2926 47.5676C34.0899 47.9348 33.6964 48.6867 33.6964 48.6867C32.908 50.2586 32.371 51.9394 32.1043 53.6705C31.9508 55.5004 31.9668 57.3401 32.152 59.1672Z" fill="white"/>
      <path d="M70.1927 60.9125C69.6928 59.9159 68.4555 57.946 68.4555 57.946L54.1514 80L68.1118 70.9138C68.9436 70.3962 69.6261 69.6956 70.099 68.8739C70.7358 67.6334 71.0741 66.2781 71.0903 64.9029C71.1065 63.5277 70.8001 62.1657 70.1927 60.9125Z" fill="white"/>
      <path d="M74.8512 52.8328C74.7008 50.7229 74.0909 48.6688 73.0624 46.8081C72.0339 44.9473 70.6105 43.3228 68.8876 42.0433L54.1514 32C54.1514 32 63.3652 44.987 71.1478 57.9098C71.933 59.2755 72.4603 60.7682 72.7043 62.3165C72.8132 63.0178 72.8132 63.7311 72.7043 64.4324C72.9071 64.0652 73.3007 63.3133 73.3007 63.3133C74.0892 61.7414 74.6262 60.0606 74.893 58.3295C75.0485 56.4998 75.0345 54.66 74.8512 52.8328Z" fill="white"/>
      ${
        this.is_normalized
          ? version === Version.v1w
            ? `<path opacity="0.6" d="M36.128 190.965C36.128 188.245 38.032 186.953 39.885 186.953C41.755 186.953 43.659 188.245 43.659 190.965C43.659 193.685 41.755 194.977 39.885 194.977C38.032 194.977 36.128 193.685 36.128 190.965ZM33.697 190.982C33.697 194.858 36.621 197.255 39.885 197.255C43.166 197.255 46.09 194.858 46.09 190.982C46.09 187.089 43.166 184.692 39.885 184.692C36.621 184.692 33.697 187.089 33.697 190.982ZM53.4093 197H55.5683C55.5343 196.711 55.4833 196.133 55.4833 195.487V188.636H53.2223V193.498C53.2223 194.467 52.6443 195.147 51.6413 195.147C50.5873 195.147 50.1113 194.399 50.1113 193.464V188.636H47.8503V193.923C47.8503 195.742 49.0063 197.221 51.0293 197.221C51.9133 197.221 52.8823 196.881 53.3413 196.099C53.3413 196.439 53.3753 196.83 53.4093 197ZM60.7376 186.137H58.6976V187.31C58.6976 188.058 58.2896 188.636 57.4056 188.636H56.9806V190.642H58.4936V194.535C58.4936 196.15 59.5136 197.119 61.1456 197.119C61.8086 197.119 62.2166 197 62.4206 196.915V195.045C62.3016 195.079 61.9956 195.113 61.7236 195.113C61.0776 195.113 60.7376 194.875 60.7376 194.144V190.642H62.4206V188.636H60.7376V186.137ZM72.1482 195.198C71.0432 195.198 70.0232 194.382 70.0232 192.818C70.0232 191.237 71.0432 190.438 72.1482 190.438C73.2532 190.438 74.2732 191.237 74.2732 192.818C74.2732 194.399 73.2532 195.198 72.1482 195.198ZM72.1482 188.381C69.6492 188.381 67.7622 190.234 67.7622 192.818C67.7622 195.385 69.6492 197.255 72.1482 197.255C74.6472 197.255 76.5342 195.385 76.5342 192.818C76.5342 190.234 74.6472 188.381 72.1482 188.381ZM82.3657 186.562C82.7397 186.562 82.9607 186.613 83.0797 186.647V184.743C82.8927 184.658 82.4337 184.573 81.9577 184.573C80.1047 184.573 78.9147 185.797 78.9147 187.684V188.636H77.5207V190.574H78.9147V197H81.1927V190.574H83.0797V188.636H81.1927V187.718C81.1927 186.783 81.8557 186.562 82.3657 186.562ZM93.7345 197H95.8935C95.8595 196.711 95.8085 196.133 95.8085 195.487V188.636H93.5475V193.498C93.5475 194.467 92.9695 195.147 91.9665 195.147C90.9125 195.147 90.4365 194.399 90.4365 193.464V188.636H88.1755V193.923C88.1755 195.742 89.3315 197.221 91.3545 197.221C92.2385 197.221 93.2075 196.881 93.6665 196.099C93.6665 196.439 93.7005 196.83 93.7345 197ZM97.5608 194.671C97.6628 195.623 98.5298 197.255 101.046 197.255C103.239 197.255 104.293 195.861 104.293 194.501C104.293 193.277 103.46 192.274 101.811 191.934L100.621 191.679C100.162 191.594 99.8558 191.339 99.8558 190.931C99.8558 190.455 100.332 190.098 100.927 190.098C101.879 190.098 102.236 190.727 102.304 191.22L104.191 190.795C104.089 189.894 103.29 188.381 100.91 188.381C99.1078 188.381 97.7818 189.622 97.7818 191.118C97.7818 192.291 98.5128 193.26 100.128 193.617L101.233 193.872C101.879 194.008 102.134 194.314 102.134 194.688C102.134 195.13 101.777 195.521 101.029 195.521C100.043 195.521 99.5498 194.909 99.4988 194.246L97.5608 194.671ZM107.909 191.866C107.96 191.101 108.606 190.217 109.779 190.217C111.071 190.217 111.615 191.033 111.649 191.866H107.909ZM111.87 194.042C111.598 194.79 111.02 195.317 109.966 195.317C108.844 195.317 107.909 194.518 107.858 193.413H113.842C113.842 193.379 113.876 193.039 113.876 192.716C113.876 190.03 112.329 188.381 109.745 188.381C107.603 188.381 105.631 190.115 105.631 192.784C105.631 195.606 107.654 197.255 109.949 197.255C112.006 197.255 113.332 196.048 113.757 194.603L111.87 194.042Z" fill="white"/>
            <path opacity="0.5" d="M98.277 51.668H95.337L92.88 58.598L90.318 51.668H87.252L91.473 62H94.266L98.277 51.668ZM105.663 62V48.371H103.164C102.891 49.799 101.505 50.912 99.5099 50.933V52.886H102.786V62H105.663Z" fill="white"/>`
            : version === Version.v1
            ? `<path opacity="0.5" d="M98.277 51.668H95.337L92.88 58.598L90.318 51.668H87.252L91.473 62H94.266L98.277 51.668ZM105.663 62V48.371H103.164C102.891 49.799 101.505 50.912 99.5099 50.933V52.886H102.786V62H105.663Z" fill="white"/>`
            : ''
          : `
        <rect x="216" y="34" width="40" height="40" rx="20" fill="white" fill-opacity="0.2"/>
        <path fill-rule="evenodd" clip-rule="evenodd" d="M233.472 45.4655C234.581 43.5115 237.42 43.5115 238.528 45.4655L246.623 59.7184C247.711 61.6351 246.314 64 244.096 64H227.905C225.686 64 224.289 61.6351 225.377 59.7184L233.472 45.4655ZM237.451 59.6911C237.451 60.0722 237.298 60.4376 237.026 60.7071C236.754 60.9765 236.385 61.1279 236 61.1279C235.615 61.1279 235.246 60.9765 234.974 60.7071C234.702 60.4376 234.549 60.0722 234.549 59.6911C234.549 59.31 234.702 58.9446 234.974 58.6751C235.246 58.4057 235.615 58.2543 236 58.2543C236.385 58.2543 236.754 58.4057 237.026 58.6751C237.298 58.9446 237.451 59.31 237.451 59.6911ZM236 48.1968C235.615 48.1968 235.246 48.3482 234.974 48.6177C234.702 48.8871 234.549 49.2526 234.549 49.6336V53.944C234.549 54.325 234.702 54.6905 234.974 54.9599C235.246 55.2294 235.615 55.3807 236 55.3807C236.385 55.3807 236.754 55.2294 237.026 54.9599C237.298 54.6905 237.451 54.325 237.451 53.944V49.6336C237.451 49.2526 237.298 48.8871 237.026 48.6177C236.754 48.3482 236.385 48.1968 236 48.1968Z" fill="white"/>
        <path opacity="0.6" d="M36.791 196V183.947H34.411V196H36.791ZM41.6133 191.189C41.6133 190.22 42.1913 189.455 43.1773 189.455C44.2653 189.455 44.7243 190.186 44.7243 191.121V196H46.9853V190.73C46.9853 188.894 46.0333 187.415 43.9593 187.415C43.0583 187.415 42.0553 187.806 41.5453 188.673V187.636H39.3523V196H41.6133V191.189ZM56.9874 187.636H54.6074L52.6184 193.246L50.5444 187.636H48.0624L51.4794 196H53.7404L56.9874 187.636ZM57.6689 193.722C57.6689 195.031 58.7569 196.238 60.5419 196.238C61.7829 196.238 62.5819 195.66 63.0069 194.997C63.0069 195.32 63.0409 195.779 63.0919 196H65.1659C65.1149 195.711 65.0639 195.116 65.0639 194.674V190.56C65.0639 188.877 64.0779 187.381 61.4259 187.381C59.1819 187.381 57.9749 188.826 57.8389 190.135L59.8449 190.56C59.9129 189.829 60.4569 189.2 61.4429 189.2C62.3949 189.2 62.8539 189.693 62.8539 190.288C62.8539 190.577 62.7009 190.815 62.2249 190.883L60.1679 191.189C58.7739 191.393 57.6689 192.226 57.6689 193.722ZM61.0179 194.555C60.2869 194.555 59.9299 194.079 59.9299 193.586C59.9299 192.94 60.3889 192.617 60.9669 192.532L62.8539 192.243V192.617C62.8539 194.096 61.9699 194.555 61.0179 194.555ZM69.5703 196V183.692H67.3093V196H69.5703ZM74.1358 196V187.636H71.8748V196H74.1358ZM71.6028 184.899C71.6028 185.647 72.2318 186.276 72.9968 186.276C73.7788 186.276 74.3908 185.647 74.3908 184.899C74.3908 184.117 73.7788 183.488 72.9968 183.488C72.2318 183.488 71.6028 184.117 71.6028 184.899ZM84.5322 183.692H82.3052V188.469C82.0672 188.027 81.3872 187.432 79.9422 187.432C77.5792 187.432 75.9302 189.353 75.9302 191.801C75.9302 194.334 77.6302 196.204 80.0102 196.204C81.1322 196.204 81.9822 195.694 82.3562 195.031C82.3562 195.422 82.4072 195.83 82.4412 196H84.6002C84.5662 195.66 84.5322 195.048 84.5322 194.487V183.692ZM78.2082 191.801C78.2082 190.305 79.1262 189.455 80.2822 189.455C81.4382 189.455 82.3392 190.288 82.3392 191.784C82.3392 193.297 81.4382 194.181 80.2822 194.181C79.0922 194.181 78.2082 193.297 78.2082 191.801ZM93.1445 191.189C93.1445 190.22 93.7225 189.455 94.7085 189.455C95.7965 189.455 96.2555 190.186 96.2555 191.121V196H98.5165V190.73C98.5165 188.894 97.5645 187.415 95.4905 187.415C94.5895 187.415 93.5865 187.806 93.0765 188.673V187.636H90.8835V196H93.1445V191.189ZM100.252 193.722C100.252 195.031 101.34 196.238 103.125 196.238C104.366 196.238 105.165 195.66 105.59 194.997C105.59 195.32 105.624 195.779 105.675 196H107.749C107.698 195.711 107.647 195.116 107.647 194.674V190.56C107.647 188.877 106.661 187.381 104.009 187.381C101.765 187.381 100.558 188.826 100.422 190.135L102.428 190.56C102.496 189.829 103.04 189.2 104.026 189.2C104.978 189.2 105.437 189.693 105.437 190.288C105.437 190.577 105.284 190.815 104.808 190.883L102.751 191.189C101.357 191.393 100.252 192.226 100.252 193.722ZM103.601 194.555C102.87 194.555 102.513 194.079 102.513 193.586C102.513 192.94 102.972 192.617 103.55 192.532L105.437 192.243V192.617C105.437 194.096 104.553 194.555 103.601 194.555ZM112.153 196V191.104C112.153 190.186 112.731 189.455 113.717 189.455C114.737 189.455 115.196 190.135 115.196 191.036V196H117.44V191.104C117.44 190.203 118.018 189.455 118.987 189.455C120.024 189.455 120.466 190.135 120.466 191.036V196H122.659V190.577C122.659 188.333 121.18 187.398 119.633 187.398C118.528 187.398 117.644 187.772 116.981 188.792C116.556 187.891 115.638 187.398 114.499 187.398C113.581 187.398 112.51 187.84 112.051 188.656V187.636H109.892V196H112.153ZM126.669 190.866C126.72 190.101 127.366 189.217 128.539 189.217C129.831 189.217 130.375 190.033 130.409 190.866H126.669ZM130.63 193.042C130.358 193.79 129.78 194.317 128.726 194.317C127.604 194.317 126.669 193.518 126.618 192.413H132.602C132.602 192.379 132.636 192.039 132.636 191.716C132.636 189.03 131.089 187.381 128.505 187.381C126.363 187.381 124.391 189.115 124.391 191.784C124.391 194.606 126.414 196.255 128.709 196.255C130.766 196.255 132.092 195.048 132.517 193.603L130.63 193.042Z" fill="white"/>
      `
      }
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
        <linearGradient id="paint1_linear" x1="0" y1="0" x2="269.553" y2="285.527" gradientUnits="userSpaceOnUse">
          <stop stop-color="#EB9E9E"/>
          <stop offset="1" stop-color="#992222"/>
        </linearGradient>
      </defs>
    </svg>`;
  }
}
