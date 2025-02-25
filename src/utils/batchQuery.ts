import {
  DocumentNode,
  OperationDefinitionNode,
  VariableDefinitionNode,
  parse,
  print,
}              from 'graphql';
import { gql } from 'graphql-request';

class BatchedQuery {
  documentNodes: DocumentNode[] = [];
  queryName: string = '';
  constructor(queryName: string) {
    this.queryName = queryName;
  }

  /**
   * Adds a new GraphQL document to the batch.
   *
   * @param document - A string containing the GraphQL query or mutation.
   * @returns The current instance of `BatchedQuery` for chaining.
   * @throws Error if the document parameter is empty.
   *
   * Example:
   * ```typescript
   * const batch = createBatchQuery('MyBatchQuery');
   * batch.add(`
   *   query GetUser($id: ID!) {
   *     user(id: $id) {
   *       id
   *       name
   *     }
   *   }
   * `);
   * batch.add(`
   *   query GetPosts($limit: Int!) {
   *     posts(limit: $limit) {
   *       id
   *       title
   *     }
   *   }
   * `);
   * const query = batch.query();
   * console.log(query);
   * ```
   *
   * Console Output:
   * ```
   * query MyBatchQuery($id: ID!, $limit: Int!) {
   *   user(id: $id) {
   *     id
   *     name
   *   }
   *   posts(limit: $limit) {
   *     id
   *     title
   *   }
   * }
   * ```
   */
  add(document: string) {
    if (!document) throw Error('Parameters cannot be empty.');
    const documentNode: DocumentNode = parse(document);
    this.documentNodes.push(documentNode);
    return this;
  }

  _genNodes() {
    const variables = new Set();
    const documentNodes: string[] = [];
    this.documentNodes.forEach((documentNode: DocumentNode) => {
      const vars = (
        documentNode.definitions[0] as OperationDefinitionNode
      ).variableDefinitions
        ?.map(
          (def: VariableDefinitionNode) =>
            `$${def.variable.name.value}:${(def.type as any).name.value}`
        )
        .toString();
      variables.add(vars);
      const node = print(documentNode)
        .replace(/query.*\{/, '')
        .slice(0, -1)
        .trim();
      documentNodes.push(node);
    });
    return [[...variables].join(', '), documentNodes];
  }

  query() {
    const [variables, documentNodes] = this._genNodes();
    return gql`
    query ${this.queryName}(${variables}) {
      ${documentNodes}
    }
    `
      .replace(/\n/g, '')
      .replace(/\s\s+/g, ' ')
      .trim();
  }
}

export function createBatchQuery(queryName: string) {
  return new BatchedQuery(queryName);
}
