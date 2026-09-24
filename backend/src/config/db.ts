import dns from 'dns';
import mongoose from 'mongoose';
import { MongoClient, Db, Collection } from 'mongodb';
import { env } from './env.js';

// Force Google Public DNS for SRV record resolution on Windows
try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch {
  // Fallback if DNS server override fails
}

let nativeDb: Db | null = null;
export let usersCollection: Collection | null = null;
export let countersCollection: Collection | null = null;
export let reportsCollection: Collection | null = null;

export async function connectDB(): Promise<void> {
  try {
    // Connect Mongoose for Schema models with production pooling & timeouts
    await mongoose.connect(env.MONGODB_URI, {
      dbName: env.MONGODB_DB,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000
    });
    console.log('✅ Mongoose connected for Threaded Comments & Models.');

    // Connect native MongoClient for atomic operations
    const mongoClient = new MongoClient(env.MONGODB_URI);
    await mongoClient.connect();
    nativeDb = mongoClient.db(env.MONGODB_DB);
    usersCollection = nativeDb.collection('users');
    countersCollection = nativeDb.collection('counters');
    reportsCollection = nativeDb.collection('reports');

    // Ensure the atomic counter document exists
    await countersCollection.updateOne(
      { _id: 'userid' as any },
      { $setOnInsert: { seq: 1000 } },
      { upsert: true }
    );

    console.log('✅ MongoDB Native Client connected for user sequences and reporting.');
  } catch (error) {
    console.error('❌ MONGODB CONNECTION ERROR:', error);
  }
}
