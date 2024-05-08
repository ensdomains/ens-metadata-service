import avaTest, { ExecutionContext, TestFn } from 'ava';
import { gql } from 'graphql-request';
import { TestContext } from '../../mock/interface';
import { createBatchQuery } from './batchQuery';

const test = avaTest as TestFn<TestContext>;

test('should retrieve letter character set for nick.eth', (t: ExecutionContext<TestContext>) => {
  const query1 = gql`
    query query1($id: String) {
      domain(id: $id) {
        name
      }
    }
  `;
  const query2 = gql`
    query query2($name: String) {
      registry(name: $name) {
        id
      }
    }
  `;
  const batchedQuery = createBatchQuery('combinedQuery');
  batchedQuery.add(query1).add(query2);
  t.deepEqual(
    batchedQuery.query(),
    'query combinedQuery($id:String, $name:String) { domain(id: $id) { name },registry(name: $name) { id } }'
  );
});
