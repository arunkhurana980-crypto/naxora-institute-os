import mongoose from "mongoose";

// Part 47 fix: Mongoose buffering off, taki MongoDB disconnected ho to
// users.findOne() buffering timed out after 10000ms jaisa error na aaye.
mongoose.set("bufferCommands", false);

export async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri || uri.includes("YOUR_") || uri.trim().length < 20) {
    console.warn("⚠️ MONGODB_URI missing/placeholder hai. App MOCK MODE me start ho raha hai.");
    console.warn("   Backend crash nahi karega. Real data ke liye backend/.env me Atlas URI lagao.");
    globalThis.NAXORA_DB_MODE = "mock";
    return null;
  }

  try {
    const connection = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: Number(process.env.MONGO_TIMEOUT_MS) || 5000,
      connectTimeoutMS: Number(process.env.MONGO_TIMEOUT_MS) || 5000,
      socketTimeoutMS: Number(process.env.MONGO_SOCKET_TIMEOUT_MS) || 15000,
    });
    globalThis.NAXORA_DB_MODE = "mongodb";
    console.log(`✅ MongoDB connected: ${connection.connection.host}`);
    return connection;
  } catch (error) {
    globalThis.NAXORA_DB_MODE = "mock";
    console.error("❌ MongoDB connection failed:", error.message);
    console.error("⚠️ App ko crash nahi kar rahe. MOCK MODE me server start hoga.");
    console.error("Check: exact Atlas URI, Database User, password, Network Access/IP allowlist.");
    return null;
  }
}
