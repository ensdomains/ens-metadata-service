import avaTest, { ExecutionContext, TestInterface } from 'ava';
import { TestContext } from './interface';

function requireUncached(module: string) {
    delete require.cache[require.resolve(module)];
    return require(module);
}

const test = avaTest as TestInterface<TestContext>;

test('should get SUBGRAPH_URL as local', async (t: ExecutionContext<TestContext>) => {
    process.env.NETWORK = 'local'
    const { SUBGRAPH_URL } = requireUncached('../src/config');
    t.is(SUBGRAPH_URL, 'http://127.0.0.1:8000/subgraphs/name/graphprotocol/ens');
});

test('should get SUBGRAPH_URL as local without NETWORK env variable', async (t: ExecutionContext<TestContext>) => {
    process.env.NETWORK = ""
    const { SUBGRAPH_URL } = requireUncached('../src/config');
    t.is(SUBGRAPH_URL, 'http://127.0.0.1:8000/subgraphs/name/graphprotocol/ens');
});

test('should get SUBGRAPH_URL as rinkeby', async (t: ExecutionContext<TestContext>) => {
    process.env.NETWORK = 'rinkeby'
    const { SUBGRAPH_URL } = requireUncached('../src/config');
    t.is(SUBGRAPH_URL, 'https://api.thegraph.com/subgraphs/name/makoto/ensrinkeby');
});

test('should get SUBGRAPH_URL as unknown network', async (t: ExecutionContext<TestContext>) => {
    process.env.NETWORK = 'unchain'
    const error = t.throws(() => {
	    requireUncached('../src/config');
	}, {instanceOf: Error});
    
    t.is(error.message, 'unknown network');
});

test('should get SERVER_URL as given custom host', async (t: ExecutionContext<TestContext>) => {
    const ENS = 'app.ens.domains';
    process.env.NETWORK = "local"
    process.env.HOST = ENS
    process.env.ENV = "main"
    const { SERVER_URL } = requireUncached('../src/config');
    t.is(SERVER_URL, `https://${ENS}`);
});
