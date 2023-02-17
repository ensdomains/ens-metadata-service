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
    `.replace(/\n/g, '').replace(/\s\s+/g, ' ').trim();
  }
}

export function createBatchQuery(queryName: string) {
  return new BatchedQuery(queryName);
}
