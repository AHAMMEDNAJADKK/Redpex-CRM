import mongoose from 'mongoose';
import dns from 'dns';
import Designation from '../models/designation.model.js';
import Department from '../modules/departments/department.model.js';

// Prioritize IPv4 and configure stable DNS resolvers for Atlas SRV lookup
dns.setDefaultResultOrder('ipv4first');
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (err) {
  // Safe fallback to default system DNS
}

/**
 * Strips credentials from MongoDB URI for safe logging
 */
export const sanitizeMongoUri = (uri) => {
  if (!uri) return 'undefined';
  return uri.replace(/\/\/[^@]+@/, '//***:***@');
};

/**
 * Connect to MongoDB Atlas through a centralized connection manager
 */
export const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DATABASE_URL;

  if (!mongoUri) {
    const errorMsg = 'CRITICAL: No MongoDB URI configured. Define MONGODB_URI in your environment.';
    console.error(`❌ ${errorMsg}`);
    throw new Error(errorMsg);
  }

  try {
    const conn = await mongoose.connect(mongoUri, {
      dbName: process.env.DB_NAME || 'crm',
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });

    const safeHost = conn.connection.host || 'Atlas Cluster';
    const dbName = conn.connection.name || 'crm';
    console.log(`✅ MongoDB Atlas Connected Successfully: ${safeHost}/${dbName}`);

    // Seed default designations if empty
    try {
      if (mongoose.connection.readyState === 1) {
        const count = await mongoose.model('Designation').countDocuments();
        if (count === 0) {
          const defaultDesignations = [
            "Super Admin",
            "Operations Manager",
            "Fire Safety Engineer",
            "Field Technician",
            "Telecaller / Sales",
            "Accountant",
            "HR Manager",
            "Admin"
          ];
          await mongoose.model('Designation').insertMany(defaultDesignations.map(name => ({ name, isActive: true })));
          console.log(' 🌱 Successfully seeded default designations.');
        }
      }
    } catch (seedErr) {
      console.warn(' ⚠️ Designation seed warning:', seedErr.message);
    }

    // Seed default departments if empty
    try {
      if (mongoose.connection.readyState === 1) {
        const deptCount = await mongoose.model('Department').countDocuments();
        if (deptCount === 0) {
          const defaultDepartments = [
            { name: "Executive & Management", code: "EXEC" },
            { name: "Operations & Safety", code: "OPS" },
            { name: "Sales & Client Relations", code: "SALES" },
            { name: "Finance & Accounts", code: "ACC" },
            { name: "HR & Administration", code: "HR" }
          ];
          await mongoose.model('Department').insertMany(defaultDepartments.map(d => ({ 
            name: d.name, 
            code: d.code, 
            status: true 
          })));
          console.log(' 🌱 Successfully seeded default departments.');
        }
      }
    } catch (seedErr) {
      console.warn(' ⚠️ Department seed warning:', seedErr.message);
    }

    return conn;
  } catch (error) {
    console.error('❌ Database Connection Error:', error.message);
    throw error;
  }
};

/**
 * Graceful database disconnect
 */
export const disconnectDB = async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log('🔌 MongoDB connection closed gracefully.');
    }
  } catch (err) {
    console.error('Error closing MongoDB connection:', err.message);
  }
};

export default connectDB;
