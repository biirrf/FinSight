// Simple DB connection test script for local use
require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

async function testConnection() {
  if (!MONGODB_URI) {
    console.error('MONGODB_URI is not set. Create a .env.local (or .env) with MONGODB_URI.');
    process.exit(1);
  }

  console.log('Attempting to connect to MongoDB...');

  try {
    // mongoose.connect returns a promise that resolves to the mongoose instance
    await mongoose.connect(MONGODB_URI, { bufferCommands: false });
    console.log('✅ Successfully connected to MongoDB');

    // Optionally show the host/port parsed from the connection
    const host = mongoose.connection.host;
    const port = mongoose.connection.port;
    const name = mongoose.connection.name;
    console.log(`Connected to host=${host} port=${port} db=${name}`);

    await mongoose.disconnect();
    console.log('Disconnected. Test complete.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to connect to MongoDB:');
    console.error(err && err.message ? err.message : err);
    process.exit(2);
  }
}

testConnection();
