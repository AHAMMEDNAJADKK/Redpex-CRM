import mongoose from 'mongoose';
import User from './src/models/user.model.js';

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DATABASE_URL);
    const liyana = await User.findOne({ name: /Liyana km/i });
    console.log(liyana);
    process.exit(0);
  } catch(e) { console.error(e); process.exit(1); }
};
run();
