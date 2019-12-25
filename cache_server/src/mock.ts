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
const schema = makeExecutableSchema({ typeDefs: schemaString });

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
    Hash: genRandomFunc(16),
    Address: genRandomFunc(16),
    Bloom: genRandomFunc(16),
    Bytes: genRandomFunc(16),
    UserAddress: genRandomFunc(16),
    ContractAddress: genRandomFunc(16),
    AssetID: genRandomFunc(16),
    Balance: genRandomFunc(16)
  }
  // preserveResolvers: true,
});

// const query = readFileSync("schemas/query.graphql", "utf-8");
// graphql(schema, query).then((result) => console.log(JSON.stringify(result, null, 2)));

const server = new ApolloServer({
  schema
});
server.listen().then(({ url }) => {
  console.log(`🚀 Server ready at ${url}`);
});
