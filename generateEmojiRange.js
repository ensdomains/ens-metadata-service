const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const UNICODE_EMOJI_LIST_URL =
  'https://www.unicode.org/Public/UCD/latest/ucd/emoji/emoji-data.txt';

fetch(UNICODE_EMOJI_LIST_URL)
  .then(async (res) => {
    const { status, headers } = res;
    const contentType = headers.get('content-type');

    try {
      if (status !== 200) {
        throw new Error(`Unable to fetch. Status Code: ${status}`);
      }
      if (!contentType.toLowerCase().startsWith('text/plain')) {
        throw new Error(
          `Expected text/plain content-type but received ${contentType}`
        );
      }
    } catch (error) {
      console.error(`Error: ${error.message}`);
      return;
    }

    const rawData = await res.text();
    try {
      const lines = rawData
        .split('\n')
        .filter((line) => line.length > 0 && !line.startsWith('#'));
      const ranges = lines.map(
        (line) => 'U+' + line.split(';')[0].trim().replace('..', '-')
      );
      const unicodeRange =
        '{\n"unicodeRange": ' + '"' + ranges.join(',') + '"\n}\n';
      fs.writeFileSync(
        path.join(__dirname, 'src', 'assets', 'unicode_range.json'),
        unicodeRange
      );
    } catch (error) {
      console.error(`Error: ${error.message}`);
    }
  })
  .catch((error) => {
    console.error(`Error: ${error.message}`);
  });
