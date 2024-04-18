import avaTest, { ExecutionContext, TestFn } from 'ava';
import { TestContext } from '../../mock/interface';
import { Metadata } from './metadata';
import { Version } from '../base';

const test = avaTest as TestFn<TestContext>;

test('should compute metadata correctly', async (t: ExecutionContext<TestContext>) => {
    const nickMetadataObj = {
        name: 'nick.eth',
        description: 'nick.eth, an ENS name.',
        created_date: 1571924851000,
        tokenId: '0x5d5727cb0fb76e4944eafb88ec9a3cf0b3c9025a4b2f947729137c5d7f84f68f',
        version: Version.v1,
        last_request_date: Date.now()
    };
    const testMetadata = new Metadata(nickMetadataObj);

    t.is(testMetadata.name, nickMetadataObj.name);
    t.is(testMetadata.description, nickMetadataObj.description);
    t.is(testMetadata.attributes[0].value, nickMetadataObj.created_date * 1000);
    t.is(testMetadata.version, Version.v1);
  });

test('should return correct font size', async (t: ExecutionContext<TestContext>) => {
  const textSize = Metadata._getFontSize('nick.eth');
  t.is(textSize, 32);
});
