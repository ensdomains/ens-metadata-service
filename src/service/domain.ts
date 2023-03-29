import { request }        from 'graphql-request';
import { ethers }         from 'ethers';
import {
  GET_REGISTRATIONS,
  GET_DOMAINS,
  GET_DOMAINS_BY_LABELHASH,
  GET_WRAPPED_DOMAIN,
}                         from './subgraph';
import { Metadata }       from './metadata';
import { getAvatarImage } from './avatar';
import {
  ExpiredNameError,
  NamehashMismatchError,
  SubgraphRecordNotFound,
  Version,
}                         from '../base';
import { NetworkName }    from './network';
import { 
  decodeFuses, 
  getWrapperState 
}                         from '../utils/fuse';
import { getNamehash }    from '../utils/namehash';

const eth =
  '0x93cdeb708b7545dc668eb9280176169d1c33cfd8ed6f04690a0bcc88a93fc4ae';
const GRACE_PERIOD_MS = 7776000000; // 90 days as milliseconds

export async function getDomain(
  provider: ethers.providers.BaseProvider,
  networkName: NetworkName,
  SUBGRAPH_URL: string,
  contractAddress: string,
  tokenId: string,
  version: Version,
  loadImages: boolean = true
): Promise<Metadata> {
  let hexId: string, intId;
  if (!tokenId.match(/^0x/)) {
    intId = tokenId;
    hexId = ethers.utils.hexZeroPad(
      ethers.utils.hexlify(ethers.BigNumber.from(tokenId)),
      32
    );
  } else {
    intId = ethers.BigNumber.from(tokenId).toString();
    hexId = tokenId;
  }
  const queryDocument: string =
    version !== Version.v2 ? GET_DOMAINS_BY_LABELHASH : GET_DOMAINS;
  const result = await request(SUBGRAPH_URL, queryDocument, { tokenId: hexId });
  const domain = version !== Version.v2 ? result.domains[0] : result.domain;
  if (!(domain && Object.keys(domain).length))
    throw new SubgraphRecordNotFound(`No record for ${hexId}`);
  const { name, labelhash, createdAt, parent, resolver, id: namehash } = domain;

  /**
   * IMPORTANT
   *
   * This check must be done in any case,
   * the reason is unfortunately the graph does strip null characters
   * from names, so even though the namehash is different,
   * domains with or without null byte look identical
   */
  if (getNamehash(name) !== namehash) {
    throw new NamehashMismatchError(
      `TokenID of the query does not match with namehash of ${name}`,
      404
    );
  }

  const metadata = new Metadata({
    name,
    created_date: createdAt,
    tokenId: hexId,
    version,
  });

  async function requestAvatar() {
    try {
      const [buffer, mimeType] = await getAvatarImage(provider, name);
      if (mimeType === 'text/html') return;
      const base64 = buffer.toString('base64');
      return [base64, mimeType];
    } catch {
      /* do nothing */
    }
  }

  async function requestMedia(isAvatarExist: boolean) {
    if (loadImages) {
      if (isAvatarExist) {
        const avatar = await requestAvatar();
        if (avatar) {
          const [base64, mimeType] = avatar;
          metadata.setBackground(base64, mimeType);
        }
      }
      metadata.generateImage();
    } else {
      metadata.setBackground(
        `https://metadata.ens.domains/${networkName}/avatar/${name}`
      );
      metadata.setImage(
        `https://metadata.ens.domains/${networkName}/${contractAddress}/${hexId}/image`
      );
    }
  }

  async function requestAttributes() {
    if (parent.id === eth) {
      const { registrations } = await request(SUBGRAPH_URL, GET_REGISTRATIONS, {
        labelhash,
      });
      const registration = registrations[0];
      const registered_date = registration.registrationDate * 1000;
      const expiration_date = registration.expiryDate * 1000;
      if (expiration_date + GRACE_PERIOD_MS < +new Date()) {
        throw new ExpiredNameError(
          `'${name}' is already been expired at ${new Date(
            expiration_date
          ).toUTCString()}.`,
          410
        );
      }
      if (registration) {
        metadata.addAttribute({
          trait_type: 'Registration Date',
          display_type: 'date',
          value: registered_date,
        });
        metadata.addAttribute({
          trait_type: 'Expiration Date',
          display_type: 'date',
          value: expiration_date,
        });
      }
    }

    if (version === Version.v2) {
      const {
        wrappedDomain: { fuses, expiryDate },
      } = await request(SUBGRAPH_URL, GET_WRAPPED_DOMAIN, {
        tokenId: namehash,
      });
      const decodedFuses = decodeFuses(fuses);
      metadata.addAttribute({
        trait_type: 'Namewrapper Fuse States',
        display_type: 'object',
        value: decodedFuses,
      });

      metadata.addAttribute({
        trait_type: 'Namewrapper Expiry Date',
        display_type: 'date',
        value: expiryDate * 1000,
      });

      metadata.addAttribute({
        trait_type: 'Namewrapper State',
        display_type: 'string',
        value: getWrapperState(decodedFuses),
      });
    }
  }
  const isAvatarExist = resolver?.texts && resolver.texts.includes('avatar');
  await Promise.all([requestMedia(isAvatarExist), requestAttributes()]);
  return metadata;
}
