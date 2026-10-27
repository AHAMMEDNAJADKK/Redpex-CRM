const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
  name: String,
  status: Boolean,
});
const Department = mongoose.model('Department', departmentSchema);

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DATABASE_URL);
  const depts = await Department.find({});
  console.log(JSON.stringify(depts, null, 2));
  process.exit(0);
}
run().catch(console.error);
