const test = require('ava');
const http = require('http');
const got = require('got');
const listen = require('test-listen');
const app = require('../src/index.ts');

test.before(async (t: { context: any }) => {
  t.context.server = http.createServer(app);
  t.context.prefixUrl = await listen(t.context.server);
});

test.after.always((t: { context: any }) => {
  t.context.server.close();
});

test.serial('get /name/:tokenId', async (t: any) => {
//   console.log(t.context.server);
  const result = await got('name/0x9029c1574f91696026358d4edB0De773d0E04aeD', {
    prefixUrl: 'http://localhost:8080',
  }).json();
  t.deepEqual(result, {
    name: '',
    description: '',
    image: '',
    image_url: '',
    external_link: '',
    attributes: '',
  });
});
