import { request } from 'graphql-request';
import { ethers } from 'ethers';
import {
  GET_REGISTRATIONS,
  GET_DOMAINS,
  GET_DOMAINS_BY_LABELHASH,
} from './subgraph';
import { provider, SUBGRAPH_URL } from './config';
import { Metadata, Version } from './metadata';

const eth =
  '0x93cdeb708b7545dc668eb9280176169d1c33cfd8ed6f04690a0bcc88a93fc4ae';
const IMAGE_KEY = 'domains.ens.nft.image';

export async function getDomain(
  tokenId: string,
  version: Version
): Promise<Metadata> {
  let hexId, intId;
  if (!tokenId.match(/^0x/)) {
    intId = tokenId;
    hexId = ethers.utils.hexValue(ethers.BigNumber.from(tokenId));
  } else {
    intId = ethers.BigNumber.from(tokenId).toString();
    hexId = tokenId;
  }
  const queryDocument: any =
    version !== Version.v2 ? GET_DOMAINS_BY_LABELHASH : GET_DOMAINS;
  const result = await request(SUBGRAPH_URL, queryDocument, { tokenId: hexId });
  const domain = version !== Version.v2 ? result.domains[0] : result.domain;
  const { name, labelName, labelhash, createdAt, owner, parent, resolver } =
    domain;

  const hasImageKey =
    resolver && resolver.texts && resolver.texts.includes(IMAGE_KEY);
  const metadata = new Metadata({
    name,
    created_date: createdAt,
    version,
  });
  if (hasImageKey) {
    const r = await provider.getResolver(name);
    const image = await r.getText(IMAGE_KEY);
    metadata.setImage(image);
  } else {
    metadata.generateImage();
  }

  if (parent.id === eth) {
    const { registrations } = await request(SUBGRAPH_URL, GET_REGISTRATIONS, {
      labelhash,
    });
    const registration = registrations[0];
    console.log('registration', registration);
    if (registration) {
      metadata.addAttribute({
        trait_type: 'Registration Date',
        display_type: 'date',
        value: registration.registrationDate * 1000,
      });
      metadata.addAttribute({
        trait_type: 'Expiration Date',
        display_type: 'date',
        value: registration.expiryDate * 1000,
      });
    }
  }
  return metadata;
}
