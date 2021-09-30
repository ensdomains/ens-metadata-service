import { strict as assert } from 'assert';
import { ethers }           from 'ethers';
import { ResolverNotFound, TextRecordNotFound } from './error'

export interface KeybaseSignatures {
  signatures: KeybaseSignature[];
}

export interface KeybaseSignature {
  kb_username: string;
  sig_hash: string;
}

export class Keybase {
  defaultProvider: ethers.providers.EnsProvider;
  name: string;

  constructor(provider: ethers.providers.EnsProvider, name: string) {
    this.defaultProvider = provider;
    this.name = name;
  }

  async getRecord(): Promise<string> {
    try {
      // retrieve resolver by ENS name
      var resolver = await this.defaultProvider.getResolver(this.name);
    } catch (e) {
      throw new ResolverNotFound('There is no resolver set under given address');
    }

    try {
      // determine and return if any Keybase signature stored as a text record
      var record = await resolver.getText('io.keybase');

      assert(record, 'Keybase signature is empty');
    } catch (e) {
      throw new TextRecordNotFound('There is no io.keybase record under given address');
    }

    return record;
  }

  async getSignatures(): Promise<KeybaseSignatures> {
    const record = await this.getRecord();
    const parts = record.split(';');

    const username = parts[0];
    const hash = parts[1];

    return {
      signatures: [
        {
          kb_username: username,
          sig_hash: hash
        }
      ]
    };
  }
}

export async function getKeybaseSignatures(provider: ethers.providers.EnsProvider, name: string): Promise<any> {
  const keybase = new Keybase(provider, name);
  return await keybase.getSignatures();
}
