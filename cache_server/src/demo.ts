import { graphql } from "graphql";
import { readFileSync } from "fs";
import { schema } from './schema';

const query = readFileSync("schemas/query.graphql", "utf-8");
graphql(schema, query).then((result) => console.log(JSON.stringify(result, null, 2)));