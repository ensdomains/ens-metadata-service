import { GoogleAuth } from 'google-auth-library';

const auth = new GoogleAuth();
const grRasterize = 'https://us-central1-ens-metadata-service.cloudfunctions.net/rasterize'

type Resolution = 'low' | 'high';

export function rasterize(
  contractAddress: string,
  networkName: string,
  tokenId: string,
  resolution: Resolution
): Promise<string> {
  return new Promise(async (resolve, reject) => {
    const client = await auth.getIdTokenClient(grRasterize);
    client
      .request({
        url: `${grRasterize}?res=${resolution}`,
        method: 'POST',
        responseType: 'arraybuffer',
        data: {
          contractAddress,
          networkName,
          tokenId,
        },
      })
      .then((response: any) =>
        resolve(Buffer.from(response.data, 'binary').toString('base64'))
      )
      .catch((error: any) => {
        // On a connection-level failure (DNS, refused, reset, timeout) there is no
        // `response`, so destructuring it would throw inside this .catch — itself an
        // unhandled rejection — and leave the outer promise unsettled (request hangs).
        const status = error?.response?.status ?? 502;
        const statusText =
          error?.response?.statusText ?? error?.message ?? 'Rasterization request failed';
        reject({ status, statusText });
      });
  });
}
