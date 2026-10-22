const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
  name: String,
  status: Boolean,
});
const Department = mongoose.model('Department', departmentSchema);

async function run() {
  await mongoose.connect('mongodb+srv://najadahammed34_db_user:TxIXECCRZ2hIkdBB@cluster0.e6luv3h.mongodb.net/crm');
  const depts = await Department.find({});
  console.log(JSON.stringify(depts, null, 2));
  process.exit(0);
}
run().catch(console.error);
