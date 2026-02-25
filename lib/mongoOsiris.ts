import { MongoClient, Collection } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error("MONGODB_URI environment variable is required for Osiris Mongo connection.");
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  var __osiris_mongo_client__: MongoClient | undefined;
}

async function connectClient(): Promise<MongoClient> {
  if (global.__osiris_mongo_client__) {
    return global.__osiris_mongo_client__;
  }

  const client = new MongoClient(uri);
  await client.connect();
  global.__osiris_mongo_client__ = client;
  return client;
}

export async function getOsirisCollection(): Promise<Collection> {
  const client = await connectClient();
  return client.db("osiris").collection("daily_summaries");
}

export default getOsirisCollection;
