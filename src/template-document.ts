import { CANVAS_FONT_PATH } from './config';
import { importFont } from './utils/importFont';

const fontSatoshiBold = importFont(CANVAS_FONT_PATH, 'font/truetype');

interface DocumentMetadata {
  name: string;
  network: string;
  image_url?: string;
}

interface DocumentTemplateFields {
  buffer?: Buffer;
  metadata: DocumentMetadata;
  mimeType?: string;
  mediaType?: "avatar" | "header";
}

export default function createDocumentfromTemplate({
  buffer,
  metadata,
  mimeType,
  mediaType = "avatar",
}: DocumentTemplateFields) {
  const _mediaType = mediaType === "avatar" ? "Avatar" : "Header";
  if (!metadata && !buffer) {
    throw 'Either image url, or image buffer needs to be provided for the document template';
  }
  const image =
    (metadata && metadata.image_url) ||
    (buffer &&
      `data:${mimeType};base64,${Buffer.from(buffer).toString('base64')}`);
  return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>${metadata.name}</title>
    <style type="text/css">
      @font-face {
        font-family: 'Satoshi';
        font-style: normal;
        font-weight: 600 900;
        src: url(${fontSatoshiBold});
      }
      body {
        font-family: 'Satoshi', 'Noto Color Emoji', 'Apple Color Emoji',
          sans-serif;
        font-style: normal;
        font-variant-numeric: tabular-nums;
        font-weight: bold;
        font-variant-ligatures: none;
        font-feature-settings: 'ss01' on, 'ss03' on;
        -moz-font-feature-settings: 'ss01' on, 'ss03' on;
        line-height: 34px;
      }
      table {
        width: 100%;
      }
      pre {
        display: inline;
        order-radius: 2px;
        word-break: break-word;
        background-color: rgba(51, 51, 51, 0.05);
        color: rgba(51, 51, 51, 0.9);
        padding: 0px 5px;
        border: 1px solid rgba(51, 51, 51, 0.1);
        font-family: Courier, monospace;
      }
      .banner {
        display: flex;
        align-items: center;
        justify-content: space-between;

        padding: 0 25px;

        background: #011a25;
        color: white;

        font-size: 1rem;
        text-align: right;
      }
      .preview {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 50px;

        padding: 0 25px;
        box-sizing: border-box;
      }
      .container {
        position: relative;
        overflow: hidden;
        width: 100%;
      }
      #imgSource {
        position: absolute;
        top: 0;
        left: 0;
        bottom: 0;
        right: 0;
        width: 100%;
        height: 100%;

        user-select: none !important;
        pointer-events: none !important;
      }
      .docs {
        font-family: Roboto, sans-serif;
        font-size: 14px;
        font-weight: 400;
        line-height: 1.5em;
        color: rgb(51, 51, 51);
        text-align: left;
        -webkit-font-smoothing: antialiased;
        text-size-adjust: 100%;
        text-rendering: optimizespeed !important;
        position: relative;
        padding: 0px;
        box-sizing: border-box;
        -webkit-tap-highlight-color: rgba(255, 255, 255, 0);
      }
      .required {
        color: rgb(212, 31, 28);
        font-size: 0.9em;
        font-weight: normal;
        margin-left: 20px;
        line-height: 1;
      }
      h5 {
        text-transform: uppercase;
        border-bottom: 1px solid rgb(159, 180, 190);
      }
      .field {
        box-sizing: border-box;
        position: relative;
        padding: 10px 10px 10px 0px;

        vertical-align: top;
        line-height: 20px;
        white-space: nowrap;
        font-size: 13px;
        font-family: Courier, monospace;

        border-left: 1px solid rgb(124, 124, 187);
        border-left-width: 1px;
        box-sizing: border-box;
        position: relative;
        padding: 10px 10px 10px 0px;
      }
      tr:first-of-type > .field {
        background-image: linear-gradient(transparent 0%, transparent 22px, rgb(124, 124, 187) 22px, rgb(124, 124, 187) 100%);
      }
      tr:first-of-type > .field, tr.last > .field {
        background-size: 1px 100%;
        background-repeat: no-repeat;
        background-position: left top;
        border-left-width: 0px;
      }

      tr.last > .field {
        background-image: linear-gradient(rgb(124, 124, 187) 0%, rgb(124, 124, 187) 22px, transparent 22px, transparent 100%);
      }
      .flow::before {
        content: "";
        display: inline-block;
        vertical-align: middle;
        width: 10px;
        height: 1px;
        background: rgb(124, 124, 187);
      }
      .flow::after {
        content: "";
        display: inline-block;
        vertical-align: middle;
        width: 1px;
        background: rgb(124, 124, 187);
        height: 7px;
      }
      .response {
        display: block;
        border: 0px;
        width: 100%;
        text-align: left;
        padding: 10px;
        border-radius: 2px;
        margin-bottom: 4px;
        line-height: 1.5em;
        cursor: default;
      }
      .response::before {
        content: "—";
        font-weight: bold;
        width: 1.5em;
        text-align: center;
        display: inline-block;
        vertical-align: top;
      }
      .response--success {
        color: rgb(29, 129, 39);
        background-color: rgba(29, 129, 39, 0.07);
      }
      .response--fail {
        color: rgb(212, 31, 28);
        background-color: rgba(212, 31, 28, 0.07);
      }
      td:nth-child(even) {
        border-bottom: 1px solid rgb(159, 180, 190);
        padding: 10px 0px;
        width: 75%;
      }
      @media only screen and (max-width: 800px) {
        .preview {
          display: block;
        }
        img {
          max-width: 600px;
        }
    </style>
  </head>
  <body>
    <div class="banner">
      <svg
        width="100"
        height="94"
        viewBox="0 0 300 94"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M270.119 82.3988C254.461 82.3988 241.388 76.1878 239.652 61.3515C239.598 60.8924 239.929 60.4768 240.387 60.4182L256.452 58.3615C256.955 58.2971 257.401 58.6827 257.446 59.1884C258.09 66.5786 263.318 69.9176 270.521 69.9176C278.158 69.9176 282.044 67.0992 282.044 62.1335C282.044 57.7047 276.953 56.0942 266.367 53.5443C253.503 50.4575 241.711 46.4313 241.711 32.6079C241.711 17.8451 254.709 12.0742 269.181 12.0742C283.656 12.0742 296.063 16.8631 298.154 31.525C298.218 31.9776 297.906 32.3997 297.456 32.4765L281.924 35.1295C281.417 35.2161 280.95 34.8377 280.896 34.3255C280.178 27.4881 275.854 24.4213 269.449 24.4213C263.955 24.4213 259.399 26.4344 259.399 31.1317C259.399 35.6947 264.223 37.3052 273.201 39.3183C285.126 42.0024 300 45.2234 300 61.1941C300 77.299 285.796 82.3988 270.119 82.3988Z"
          fill="#F6F6F6"
        />
        <path
          d="M229.159 18.464C234.519 23.8323 235.189 31.0795 235.189 39.803V80.9511C235.189 81.4268 234.804 81.8125 234.329 81.8125H217.156C216.681 81.8125 216.296 81.4268 216.296 80.9511V41.4134C216.296 35.2399 215.76 32.0189 212.812 29.2006C210.4 26.9191 208.122 26.5164 204.102 26.5164C198.34 26.5164 191.64 30.4084 191.64 44.2318V80.9511C191.64 81.4268 191.255 81.8125 190.78 81.8125H173.741C173.266 81.8125 172.881 81.4268 172.881 80.9511V14.6281C172.881 14.1524 173.266 13.7667 173.741 13.7667H190.646C191.121 13.7667 191.506 14.1524 191.506 14.6281V21.9314C191.506 22.344 192.118 22.4745 192.31 22.1093C196.08 14.936 203.246 12.1562 211.338 12.1562C219.913 12.1562 224.871 14.1694 229.159 18.464Z"
          fill="#F6F6F6"
        />
        <path
          d="M158.035 20.7042C164.541 27.3302 167.818 37.4008 168.094 50.1542C168.104 50.623 167.733 51.0117 167.266 51.0265L119.959 52.5242C119.481 52.5394 119.105 52.9456 119.138 53.4242C119.872 64.1042 125.381 69.4054 135.163 69.0957C143.417 68.8344 147.583 65.0913 148.88 58.5475C148.966 58.1142 149.352 57.7998 149.792 57.8247L166.268 58.7565C166.799 58.7866 167.175 59.2901 167.045 59.8062C163.383 74.3043 152.478 81.8407 135.582 82.3756C125.136 82.7063 116.726 79.6157 110.927 74.2941C104.3 68.193 100.806 59.4415 100.45 48.1737C100.112 37.4425 102.77 28.2277 109.134 21.7153C114.845 15.7607 122.783 12.421 133.23 12.0903C143.81 11.7553 152.22 14.8459 158.035 20.7042ZM133.64 25.1019C128.149 25.2758 124.316 27.0084 121.877 30.4425C120.239 32.6962 119.284 35.4855 118.91 38.712C118.851 39.222 119.265 39.6559 119.777 39.6396L147.737 38.7544C148.244 38.7384 148.628 38.2871 148.549 37.7848C147.962 34.0559 146.778 30.9359 144.478 28.6528C141.848 26.0505 138.462 24.9493 133.64 25.1019Z"
          fill="#F6F6F6"
        />
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M42.4734 1.5491C42.1294 1.02598 42.7618 0.413402 43.2749 0.772602L64.7575 15.8095C78.2972 25.2867 84.5315 42.208 80.2388 58.1544C79.8987 59.4177 79.5339 60.5235 79.1912 61.45C78.9787 62.0244 78.134 61.9004 78.0914 61.2895C77.7292 56.0972 73.9905 50.1611 71.2769 45.8527C70.7925 45.0835 70.3408 44.3663 69.9467 43.7144C67.3093 39.3512 48.2169 10.2849 42.4734 1.5491ZM14.0286 43.8411L39.7425 1.53062C40.0411 1.03949 39.5038 0.466613 38.9939 0.732504C34.4986 3.07609 22.3693 9.85687 12.8466 19.3674C2.41081 29.7898 10.8445 41.225 13.1082 43.9128C13.3584 44.2098 13.8269 44.1729 14.0286 43.8411ZM39.1069 92.8848C39.4509 93.4079 38.8185 94.0205 38.3054 93.6614L16.8228 78.6244C3.28314 69.1472 -2.95117 52.2259 1.34153 36.2795C1.68156 35.0162 2.04642 33.9104 2.38911 32.9839C2.6016 32.4095 3.44632 32.5335 3.48892 33.1444C3.85109 38.3366 7.58981 44.2728 10.3034 48.5812C10.7878 49.3503 11.2395 50.0676 11.6336 50.7195C14.271 55.0827 33.3634 84.149 39.1069 92.8848ZM41.8398 92.8988L67.5538 50.5883C67.7555 50.2566 68.224 50.2196 68.4742 50.5166C70.7379 53.2044 79.1716 64.6396 68.7358 75.062C59.2131 84.5725 47.0838 91.3533 42.5886 93.6969C42.0786 93.9628 41.5413 93.3899 41.8398 92.8988Z"
          fill="#F6F6F6"
        />
      </svg>
    </div>
    <div class="preview">
      <div class="container">
        <iframe srcdoc="${(mimeType !== 'image/svg+xml'
          ? `<img
          src="${image}"
          alt="${metadata.name}"
          style="width:100%;"
        />`
          : "<div style='width:100%;'>" + buffer?.toString() + '</div>' || ''
        ).replace(/"/g, "'")}"
          sandbox="allow-same-origin"
          id="imgSource"
          frameborder="0"
          scrolling="no">
        </iframe>
      </div>
      <div class="docs">
        <div>
          <div>
            <div>
              <div>
                <h3>ENS NFT ${buffer ? _mediaType : ''} Image API Endpoint</h3>
                <p>
                  <a href="https://metadata.ens.domains/${metadata.network}/${
    buffer ? _mediaType.toLowerCase() : '0x57f1887a8BF19b14fC0dF6Fd9B2acc9Af147eA85'
  }/${metadata.name}${buffer ? '' : '/image'}">
                    https://metadata.ens.domains/${metadata.network}/${
    buffer ? _mediaType.toLowerCase() : '0x57f1887a8BF19b14fC0dF6Fd9B2acc9Af147eA85'
  }/${metadata.name}${buffer ? '' : '/image'}
                  </a>
                </p>
              </div>
            </div>
            <div>
              <h5>path Parameters</h5>
              <table>
                <tbody>
                  <tr>
                    <td kind="field" title="networkName" class="field">
                      <span class="flow"></span>
                      <span>networkName</span>
                      <div class="required">required</div>
                    </td>
                    <td>
                      <div>
                        <div>
                          <span></span>
                          <span>string</span>
                          <span>(networkName)</span>
                        </div>
                        <div>
                          <span>Enum:</span>
                          <pre>"mainnet"</pre>
                          <pre>"sepolia"</pre>
                        </div>
                        <div>
                          <div>
                            <p>Name of the chain to query for.</p>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                  ${
                    buffer
                      ? ''
                      : `<tr>
                    <td kind="field" title="contractAddress" class="field">
                      <span class="flow"></span>
                      <span>contractAddress</span>
                      <div class="required">required</div>
                    </td>
                    <td>
                      <div>
                        <div class="fieldType">
                          <span></span>
                          <span>string</span>
                          <span>(contractAddress)</span>
                        </div>
                        <div>
                          <span>Example: </span>
                          <pre>0x57f1887a8BF19b14fC0dF6Fd9B2acc9Af147eA85</pre>
                        </div>
                        <div>
                          <div></div>
                        </div>
                      </div>
                    </td>
                  </tr>`
                  }
                  ${
                    buffer
                      ? `<tr class="last">
                    <td kind="field" title="ensName" class="field">
                      <span class="flow"></span>
                      <span>name</span>
                      <div class="required">required</div>
                    </td>
                    <td>
                      <div>
                        <div>
                          <span></span>
                          <span>string</span>
                          <span>(ensName)</span>
                        </div>
                        <div>
                          Example: <pre>${metadata.name}</pre>
                        </div>
                        <div>
                          <div>
                            <p>ENS Name</p>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>`
                      : `<tr class="last">
                    <td kind="field" title="tokenId" class="field">
                      <span class="flow"></span>
                      <span>tokenId</span>
                      <div class="required">required</div>
                    </td>
                    <td>
                      <div>
                        <div>
                          <span></span>
                          <span>string</span>
                          <span>(tokenId / ENS name)</span>
                        </div>
                        <div>
                          <span>Example: </span>
                          <br/>
                          <pre>4221908525551133525058944220830153...</pre> /  <pre>${metadata.name}</pre>
                        </div>
                        <div>
                          <div>
                            <p>TokenID = Labelhash(v1) /Namehash(v2) of your ENS name.</p>
                            <p>
                              More:
                              <a href="https://docs.ens.domains/contract-api-reference/name-processing#hashing-names">https://docs.ens.domains/contract-api-reference/name-processing#hashing-names</a>
                            </p>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>`
                  }
                </tbody>
              </table>
            </div>
            <div>
              <h3>Responses</h3>
              <div>
                <button disabled="" class="response response--success">
                  <strong>200 </strong>
                  <div>
                    <p>Image file</p>
                  </div>
                </button>
                <button disabled="" class="response response--fail">
                  <strong>404 </strong>
                  <div>
                    <p>No results found</p>
                  </div>
                </button>
                <button disabled="" class="response response--fail">
                  <strong>501 </strong>
                  <div>
                    <p>Unsupported network</p>
                  </div>
                </button>
                <button disabled="" class="response response--fail">
                  <strong>504 </strong>
                  <div>
                    <p>Gateway Timeout</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </body>
</html>
`;
}
