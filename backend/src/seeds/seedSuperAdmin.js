import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../models/user.model.js';
import { sanitizeMongoUri } from '../config/db.js';

const SUPERADMIN_EMAIL = 'superadmin@gmail.com';
const INITIAL_PASSWORD = process.env.SUPERADMIN_INITIAL_PASSWORD || 'superadmin@111';

/**
 * Idempotent, secure Super Admin provisioning script for Redpex CRM
 */
export const provisionSuperAdmin = async () => {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DATABASE_URL;

  if (!mongoUri) {
    throw new Error('No MongoDB URI configured. Define MONGODB_URI in your environment.');
  }

  console.log(`🔌 Connecting to MongoDB for Super Admin provisioning (${sanitizeMongoUri(mongoUri)})...`);
  await mongoose.connect(mongoUri, { dbName: process.env.DB_NAME || 'crm', serverSelectionTimeoutMS: 10000 });
  console.log('✅ Connected to MongoDB Atlas.');

  const existing = await User.findOne({ email: SUPERADMIN_EMAIL });

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(INITIAL_PASSWORD, salt);

  const superAdminData = {
    name: 'Redpex Super Admin',
    email: SUPERADMIN_EMAIL,
    phone: '9999999999',
    role: 'superadmin',
    role_id: '0',
    isSuperAdmin: true,
    password: hashedPassword,
    passwordHash: hashedPassword,
    status: 'active',
    isActive: true,
    designation: 'Super Administrator',
    department: 'Executive & Management',
    permissions: [
      'all',
      'admin',
      'superadmin',
      'manage_users',
      'manage_roles',
      'manage_permissions',
      'manage_departments',
      'manage_clients',
      'manage_leads',
      'manage_tasks',
      'view_reports',
      'export_data',
      'audit_logs',
      'financial_access',
      'executive_access'
    ]
  };

  if (!existing) {
    const newSuperAdmin = new User(superAdminData);
    await newSuperAdmin.save();
    console.log(`✨ Successfully provisioned NEW Super Admin account: ${SUPERADMIN_EMAIL}`);
  } else {
    // Safely update the existing Super Admin account without altering other user records
    existing.name = existing.name || 'Redpex Super Admin';
    existing.role = 'superadmin';
    existing.role_id = '0';
    existing.isSuperAdmin = true;
    existing.status = 'active';
    existing.isActive = true;
    existing.password = hashedPassword;
    existing.passwordHash = hashedPassword;
    existing.designation = existing.designation || 'Super Administrator';
    existing.department = existing.department || 'Executive & Management';
    existing.permissions = superAdminData.permissions;

    await existing.save();
    console.log(`🔒 Existing account (${SUPERADMIN_EMAIL}) successfully updated with verified Super Admin credentials and permissions.`);
  }

  // Verification step
  const verified = await User.findOne({ email: SUPERADMIN_EMAIL });
  const isPasswordValid = await bcrypt.compare(INITIAL_PASSWORD, verified.password || verified.passwordHash);

  if (!isPasswordValid) {
    throw new Error('Verification failed: Stored password hash does not match initial password.');
  }

  console.log('----------------------------------------------------');
  console.log('✅ SUPER ADMIN PROVISIONING VERIFIED SUCCESSFULLY:');
  console.log(`   Email:        ${verified.email}`);
  console.log(`   Role:         ${verified.role} (role_id: ${verified.role_id})`);
  console.log(`   isSuperAdmin: ${verified.isSuperAdmin}`);
  console.log(`   Status:       ${verified.status}`);
  console.log('   Password:     [SECURELY HASHED WITH BCRYPT]');
  console.log('----------------------------------------------------');

  return verified;
};

// Auto-run if executed directly via CLI
const isDirectExecution = () => {
  if (!process.argv[1]) return false;
  const currentPath = fileURLToPath(import.meta.url).toLowerCase().replace(/\\/g, '/');
  const executedPath = path.resolve(process.argv[1]).toLowerCase().replace(/\\/g, '/');
  return currentPath === executedPath || executedPath.endsWith('seed_superadmin.js');
};

if (isDirectExecution()) {
  provisionSuperAdmin()
    .then(async () => {
      await mongoose.disconnect();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('❌ Super Admin Provisioning Failed:', err.message);
      try { await mongoose.disconnect(); } catch (_) {}
      process.exit(1);
    });
}
