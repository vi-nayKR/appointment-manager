import { MongoClient } from 'mongodb';

export async function connectDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('Set MONGODB_URI in server/.env');

  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
  await client.connect();
  const db = client.db();
  await db.collection('appointments').createIndex({ date: 1, chairId: 1, startTime: 1 });
  await db.collection('appointments').createIndex({ date: 1, startTime: 1 });
  return { client, db };
}
