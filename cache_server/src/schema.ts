import { ApolloServer, gql } from "apollo-server";
import {
  makeExecutableSchema,
  addMockFunctionsToSchema,
  addResolveFunctionsToSchema
} from "graphql-tools";
import { graphql, GraphQLResolveInfo } from "graphql";
import { readFileSync } from "fs";

// Fill this in with the schema string
const schemaString = readFileSync("schemas/muta_cache_server.graphql", "utf-8");
// Make a GraphQL schema with no resolvers
export const schema = makeExecutableSchema({ typeDefs: schemaString });

function randomHex(length: number) {
  var result = "";
  var characters = "abcdef0123456789";
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

function genRandomFunc(length: number) {
  return () => {
    return randomHex(length);
  };
}

const resolveFunctions = {
  TransactionAction: {
    __resolveType(data: any, context: any, info: GraphQLResolveInfo) {
      return info.schema.getType(data.__typename);
    }
  },
  ReceiptResult: {
    __resolveType(data: any, context: any, info: GraphQLResolveInfo) {
      return info.schema.getType(data.__typename);
    }
  }
};

// addResolveFunctionsToSchema(schema, resolveFunctions);
// Add mocks, modifies schema in place
addMockFunctionsToSchema({
  schema,
  mocks: {
    Uint64: genRandomFunc(3),
    Hash: genRandomFunc(64),
    Address: genRandomFunc(42),
    Bloom: genRandomFunc(40),
    Bytes: genRandomFunc(30),
    UserAddress: genRandomFunc(42),
    ContractAddress: genRandomFunc(42),
    AssetID: genRandomFunc(64),
    Balance: genRandomFunc(10)
  }
  // preserveResolvers: true,
});