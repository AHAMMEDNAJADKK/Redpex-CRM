/**
 * REDPEX CRM — Safe, Repeatable, Idempotent Sample Data Seeder
 * Populates all CRM modules with realistic, interrelated data.
 * 
 * Safety Guaranteed:
 * - NEVER drops, resets, or deletes existing data.
 * - NEVER alters or overwrites the Super Admin user credentials.
 * - Idempotent: checks for existence by unique identifiers before inserting.
 * - Refuses to run against production cluster without explicit ALLOW_SAMPLE_SEED=true.
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { sanitizeMongoUri } from '../config/db.js';

// Models
import User from '../models/user.model.js';
import Department from '../modules/departments/department.model.js';
import Designation from '../models/designation.model.js';
import Lead from '../models/lead.model.js';
import LeadFollowup from '../models/leadFollowup.model.js';
import ClientLead from '../models/clientLead.model.js';
import Client from '../models/client.model.js';
import Project from '../models/project.model.js';
import ProjectCategory from '../models/projectCategory.model.js';
import ProjectMilestone from '../models/projectMilestone.model.js';
import Task from '../models/task.model.js';
import Attendance from '../models/attendance.model.js';
import LeaveRequest from '../models/leaveRequest.model.js';
import Income from '../models/income.model.js';
import Expense from '../models/expense.model.js';
import ExpenseCategory from '../models/expenseCategory.model.js';
import Capital from '../models/capital.model.js';
import Course from '../models/course.model.js';
import Batch from '../models/batch.model.js';
import Enrollment from '../models/enrollment.model.js';
import Recruitment from '../models/recruitment.model.js';
import CalendarWork from '../models/calendarWork.model.js';
import { DailyRoutine } from '../models/dailyOperations.model.js';
import Notification from '../models/notification.model.js';

const SAMPLE_TAG = '[SAMPLE]';

export const seedInitialData = async () => {
  const mongoUri = process.env.SEED_MONGODB_URI || process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DATABASE_URL;

  if (!mongoUri) {
    throw new Error('No MongoDB URI found. Define MONGODB_URI in backend/.env');
  }

  const isProductionTarget = mongoUri.includes('cluster0') || process.env.NODE_ENV === 'production';
  const allowSampleSeed = process.env.ALLOW_SAMPLE_SEED === 'true' || process.argv.includes('--force');

  console.log(`🔌 Initializing database connection for seeding...`);
  console.log(`   Target URI: ${sanitizeMongoUri(mongoUri)}`);

  if (isProductionTarget && !allowSampleSeed) {
    console.warn('\n⚠️  SAFETY GUARD TRIGGERED:');
    console.warn('   Target database appears to be the production Atlas cluster.');
    console.warn('   To safely seed sample records without altering existing data, set ALLOW_SAMPLE_SEED=true or pass --force.');
    console.warn('   Example: ALLOW_SAMPLE_SEED=true npm run seed\n');
    return { success: false, reason: 'safety_guard_blocked' };
  }

  await mongoose.connect(mongoUri, {
    dbName: process.env.DB_NAME || 'crm',
    serverSelectionTimeoutMS: 15000
  });
  console.log('✅ Connected to database successfully.');

  const stats = {
    departments: { created: 0, skipped: 0 },
    designations: { created: 0, skipped: 0 },
    users: { created: 0, skipped: 0 },
    leads: { created: 0, skipped: 0 },
    clients: { created: 0, skipped: 0 },
    projects: { created: 0, skipped: 0 },
    tasks: { created: 0, skipped: 0 },
    attendance: { created: 0, skipped: 0 },
    leaves: { created: 0, skipped: 0 },
    accounts: { created: 0, skipped: 0 },
    academy: { created: 0, skipped: 0 },
    recruitment: { created: 0, skipped: 0 },
    calendarWork: { created: 0, skipped: 0 },
    notifications: { created: 0, skipped: 0 }
  };

  // 1. SEED DEPARTMENTS
  console.log('\n📁 [1/13] Seeding Departments...');
  const departmentDefs = [
    { name: 'Executive & Management', code: 'MGMT', description: 'Executive leadership and strategic governance' },
    { name: 'Information Technology', code: 'IT', description: 'Software engineering, DevOps, and cloud systems' },
    { name: 'Sales & Marketing', code: 'SALES', description: 'Business development, lead generation, and client outreach' },
    { name: 'Operations', code: 'OPS', description: 'Client project delivery, quality assurance, and execution' },
    { name: 'Finance & Accounts', code: 'FIN', description: 'Bookkeeping, billing, payroll, and statutory reporting' },
    { name: 'Human Resources', code: 'HR', description: 'Talent acquisition, employee engagement, and personnel' },
    { name: 'Redpex Academy', code: 'ACAD', description: 'Professional training programs, batches, and student success' }
  ];

  const deptMap = {};
  for (const d of departmentDefs) {
    let dept = await Department.findOne({
      $or: [{ code: d.code }, { name: d.name }]
    });
    if (!dept) {
      dept = await Department.create(d);
      stats.departments.created++;
    } else {
      stats.departments.skipped++;
    }
    deptMap[d.code] = dept;
    deptMap[dept.name] = dept;
  }

  // 2. SEED DESIGNATIONS
  console.log('🏷️  [2/13] Seeding Designations...');
  const designationNames = [
    'Super Administrator',
    'Operations Manager',
    'Senior Full Stack Engineer',
    'UI/UX & Graphic Designer',
    'Telecaller / Sales Lead',
    'Academic Counselor',
    'Accountant',
    'HR Executive',
    'Lead Video Editor'
  ];

  const desigMap = {};
  for (const name of designationNames) {
    let desig = await Designation.findOne({ name });
    if (!desig) {
      desig = await Designation.create({ name, isActive: true });
      stats.designations.created++;
    } else {
      stats.designations.skipped++;
    }
    desigMap[name] = desig;
  }

  // 3. SEED REALISTIC USERS (PRESERVING SUPER ADMIN)
  console.log('👥 [3/13] Seeding Team Members...');
  const salt = await bcrypt.genSalt(10);
  const samplePassword = await bcrypt.hash('Redpex@2026!', salt);

  // Retrieve existing superadmin
  const superAdminUser = await User.findOne({ email: 'superadmin@gmail.com' });

  const userDefs = [
    {
      name: 'Rahul Sharma',
      email: 'rahul.ops@redpex.com',
      phone: '+919876543210',
      role: 'manager',
      role_id: '2',
      employeeId: 'EMP-OPS-01',
      designation: 'Operations Manager',
      designationId: desigMap['Operations Manager']?._id,
      department: 'Operations',
      departmentId: deptMap['OPS']?._id,
      password: samplePassword,
      status: 'active',
      isActive: true,
      salary: 65000,
      permissions: ['all_tasks', 'all_projects', 'view_reports', 'manage_operations']
    },
    {
      name: 'Priya Nair',
      email: 'priya.hr@redpex.com',
      phone: '+919876543211',
      role: 'hr',
      role_id: '1',
      employeeId: 'EMP-HR-02',
      designation: 'HR Executive',
      designationId: desigMap['HR Executive']?._id,
      department: 'Human Resources',
      departmentId: deptMap['HR']?._id,
      password: samplePassword,
      status: 'active',
      isActive: true,
      salary: 50000,
      permissions: ['manage_users', 'manage_leaves', 'manage_attendance', 'view_reports']
    },
    {
      name: 'Arun Kumar',
      email: 'arun.dev@redpex.com',
      phone: '+919876543212',
      role: 'developer',
      role_id: '3',
      employeeId: 'EMP-DEV-03',
      designation: 'Senior Full Stack Engineer',
      designationId: desigMap['Senior Full Stack Engineer']?._id,
      department: 'Information Technology',
      departmentId: deptMap['IT']?._id,
      password: samplePassword,
      status: 'active',
      isActive: true,
      salary: 75000,
      permissions: ['view_projects', 'edit_tasks', 'view_attendance']
    },
    {
      name: 'Ananya Sen',
      email: 'ananya.sales@redpex.com',
      phone: '+919876543213',
      role: 'telecaller',
      role_id: '3',
      employeeId: 'EMP-SLS-04',
      designation: 'Telecaller / Sales Lead',
      designationId: desigMap['Telecaller / Sales Lead']?._id,
      department: 'Sales & Marketing',
      departmentId: deptMap['SALES']?._id,
      password: samplePassword,
      status: 'active',
      isActive: true,
      salary: 40000,
      permissions: ['manage_leads', 'view_client_leads', 'view_attendance']
    },
    {
      name: 'Deepak Menon',
      email: 'deepak.accounts@redpex.com',
      phone: '+919876543214',
      role: 'accountant',
      role_id: '3',
      employeeId: 'EMP-ACC-05',
      designation: 'Accountant',
      designationId: desigMap['Accountant']?._id,
      department: 'Finance & Accounts',
      departmentId: deptMap['FIN']?._id,
      password: samplePassword,
      status: 'active',
      isActive: true,
      salary: 55000,
      permissions: ['financial_access', 'manage_invoices', 'view_expenses']
    },
    {
      name: 'Kavita Patel',
      email: 'kavita.acad@redpex.com',
      phone: '+919876543215',
      role: 'counselor',
      role_id: '3',
      employeeId: 'EMP-ACAD-06',
      designation: 'Academic Counselor',
      designationId: desigMap['Academic Counselor']?._id,
      department: 'Redpex Academy',
      departmentId: deptMap['ACAD']?._id,
      password: samplePassword,
      status: 'active',
      isActive: true,
      salary: 45000,
      permissions: ['manage_courses', 'manage_batches', 'view_students']
    }
  ];

  const userMap = {};
  if (superAdminUser) {
    userMap['superadmin'] = superAdminUser;
  }

  for (const u of userDefs) {
    let user = await User.findOne({ email: u.email });
    if (!user) {
      user = await User.create(u);
      stats.users.created++;
    } else {
      stats.users.skipped++;
    }
    userMap[u.role] = user;
  }

  const primaryOwner = superAdminUser || userMap['manager'];
  const devUser = userMap['developer'] || primaryOwner;
  const salesUser = userMap['telecaller'] || primaryOwner;
  const hrUser = userMap['hr'] || primaryOwner;
  const accUser = userMap['accountant'] || primaryOwner;

  // 4. SEED LEADS & FOLLOWUPS
  console.log('📈 [4/13] Seeding Leads & Activities...');
  const leadDefs = [
    {
      leadName: 'Vikrant Deshmukh',
      companyName: 'Sahyadri Industrial Solvers',
      email: 'vikrant@sahyadri.in',
      phone: '+919822012345',
      city: 'Pune',
      source: 'Website Form',
      interestedService: 'CRM & Cloud Automation',
      campaignName: 'Q4 Industrial Outreach',
      leadPlatform: 'Google Ads',
      assignedTo: salesUser._id,
      status: 'New',
      priority: 'High'
    },
    {
      leadName: 'Meera Krishnan',
      companyName: 'Lumina Digital Health',
      email: 'meera@luminamed.com',
      phone: '+919845098765',
      city: 'Bangalore',
      source: 'LinkedIn InMail',
      interestedService: 'HIPAA Cloud Portal',
      campaignName: 'HealthTech 2026',
      leadPlatform: 'LinkedIn',
      assignedTo: salesUser._id,
      status: 'Contacted',
      priority: 'High'
    },
    {
      leadName: 'Rohan Bhasin',
      companyName: 'Zenith Logistics Hub',
      email: 'rohan.bhasin@zenithhub.co',
      phone: '+919910011223',
      city: 'New Delhi',
      source: 'Referral',
      interestedService: 'Fleet Tracking Dashboard',
      campaignName: 'Logistics Referral Net',
      leadPlatform: 'Direct',
      assignedTo: salesUser._id,
      status: 'Follow Up',
      priority: 'Medium'
    },
    {
      leadName: 'Sneha Roy',
      companyName: 'Calcutta FinTech Labs',
      email: 'sneha@calcuttafintech.org',
      phone: '+919830055443',
      city: 'Kolkata',
      source: 'Webinar',
      interestedService: 'Payment Gateway Integration',
      campaignName: 'Fintech Summit 2026',
      leadPlatform: 'Webinar',
      assignedTo: salesUser._id,
      status: 'Interested',
      priority: 'High'
    },
    {
      leadName: 'Tariq Mansoor',
      companyName: 'Falcon Trading Corp',
      email: 'tariq@falcontrading.ae',
      phone: '+971501234567',
      city: 'Dubai',
      source: 'Direct Outreach',
      interestedService: 'B2B Wholesale Portal',
      campaignName: 'GCC Expansion',
      leadPlatform: 'Referral',
      assignedTo: salesUser._id,
      status: 'Converted',
      priority: 'High'
    },
    {
      leadName: 'Amit Gokhale',
      companyName: 'Gokhale Retail Stores',
      email: 'amit@gokhale-retail.com',
      phone: '+919890099887',
      city: 'Mumbai',
      source: 'Cold Call',
      interestedService: 'POS Sync Module',
      campaignName: 'Retail Calling Q3',
      leadPlatform: 'Phone',
      assignedTo: salesUser._id,
      status: 'Lost',
      lostReason: 'Budget constraints for custom enterprise software'
    }
  ];

  for (const l of leadDefs) {
    let lead = await Lead.findOne({ email: l.email });
    if (!lead) {
      lead = await Lead.create({
        ...l,
        createdBy: primaryOwner._id
      });
      stats.leads.created++;

      // Create a related followup
      await LeadFollowup.create({
        leadId: lead._id,
        leadName: lead.leadName,
        phone: lead.phone,
        summary: `Initial consultation call with ${lead.leadName} regarding ${lead.interestedService}.`,
        followupDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        status: lead.status === 'Lost' ? 'Closed' : 'Scheduled',
        createdBy: salesUser._id
      });
    } else {
      stats.leads.skipped++;
    }
  }

  // 5. SEED CLIENTS & PROJECTS
  console.log('🏢 [5/13] Seeding Corporate Clients & Projects...');
  const clientDefs = [
    {
      companyName: 'Apex Global Technologies',
      clientName: 'Sunil Aggarwal',
      clientId: 'CLT-APEX-01',
      industry: 'Technology & Cloud',
      website: 'https://apextech.example.com',
      gstNumber: '27AABCA1234A1Z5',
      email: 'contact@apextech.example.com',
      phone: '+919820011223',
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      status: 'Active',
      clientType: 'Enterprise',
      accountManager: primaryOwner._id,
      assignedTeamLead: devUser._id,
      createdBy: primaryOwner._id
    },
    {
      companyName: 'Zenith Healthcare Systems',
      clientName: 'Dr. Shalini Verghese',
      clientId: 'CLT-ZENITH-02',
      industry: 'Healthcare & Biotech',
      website: 'https://zenithhealth.example.com',
      gstNumber: '29ABCDE5678B1Z2',
      email: 'operations@zenithhealth.example.com',
      phone: '+919844033445',
      city: 'Bangalore',
      state: 'Karnataka',
      country: 'India',
      status: 'Active',
      clientType: 'SMB',
      accountManager: primaryOwner._id,
      assignedTeamLead: devUser._id,
      createdBy: primaryOwner._id
    },
    {
      companyName: 'Horizon Retailers Pvt Ltd',
      clientName: 'Naveen Poddar',
      clientId: 'CLT-HORIZON-03',
      industry: 'E-commerce & Retail',
      website: 'https://horizonretail.example.com',
      gstNumber: '07AAACR9012C1Z8',
      email: 'admin@horizonretail.example.com',
      phone: '+919911044556',
      city: 'New Delhi',
      state: 'Delhi',
      country: 'India',
      status: 'Active',
      clientType: 'Retainer',
      accountManager: primaryOwner._id,
      assignedTeamLead: devUser._id,
      createdBy: primaryOwner._id
    }
  ];

  const clientMap = {};
  for (const c of clientDefs) {
    let client = await Client.findOne({
      $or: [{ clientId: c.clientId }, { companyName: c.companyName }]
    });
    if (!client) {
      client = await Client.create(c);
      stats.clients.created++;
    } else {
      stats.clients.skipped++;
    }
    clientMap[c.clientId] = client;
  }

  // Seed Project Categories
  const categoryDefs = ['Cloud & DevOps', 'Web Application', 'Mobile App', 'Enterprise ERP'];
  const targetDeptId = deptMap['IT']?._id || deptMap['OPS']?._id || Object.values(deptMap)[0]?._id;
  for (const catName of categoryDefs) {
    const existingCat = await ProjectCategory.findOne({ name: catName });
    if (!existingCat && targetDeptId) {
      await ProjectCategory.create({
        name: catName,
        departmentId: targetDeptId,
        createdBy: primaryOwner._id
      });
    }
  }

  // Seed Projects
  const projectDefs = [
    {
      projectName: 'Apex Cloud Migration & Multi-tenant Architecture',
      projectCode: 'PRJ-APX-01',
      client: clientMap['CLT-APEX-01']?._id,
      description: 'Full migration of legacy monolithic CRM backend to microservices running on AWS EKS with Redis caching.',
      projectCategory: 'Cloud & DevOps',
      priority: 'Urgent',
      status: 'Development',
      estimatedBudget: 450000,
      technologyStack: ['Node.js', 'React', 'MongoDB', 'Docker', 'AWS'],
      startDate: new Date('2026-09-01'),
      targetCompletionDate: new Date('2026-12-15'),
      projectManager: primaryOwner._id,
      assignedLead: devUser._id,
      assignedTeamLead: devUser._id,
      teamMembers: [devUser._id, primaryOwner._id],
      createdBy: primaryOwner._id
    },
    {
      projectName: 'Zenith Telehealth Video Consultation Portal',
      projectCode: 'PRJ-ZNT-02',
      client: clientMap['CLT-ZENITH-02']?._id,
      description: 'WebRTC video consultation portal with end-to-end encryption, digital prescription generation, and appointment calendar.',
      projectCategory: 'Web Application',
      priority: 'High',
      status: 'Testing',
      estimatedBudget: 320000,
      technologyStack: ['React', 'Node.js', 'WebRTC', 'Tailwind CSS'],
      startDate: new Date('2026-08-15'),
      targetCompletionDate: new Date('2026-11-30'),
      projectManager: primaryOwner._id,
      assignedLead: devUser._id,
      assignedTeamLead: devUser._id,
      teamMembers: [devUser._id],
      createdBy: primaryOwner._id
    },
    {
      projectName: 'Horizon Multi-Vendor Marketplace',
      projectCode: 'PRJ-HRZ-03',
      client: clientMap['CLT-HORIZON-03']?._id,
      description: 'B2B multi-vendor ordering engine with live inventory management, Razorpay payment routing, and automated invoicing.',
      projectCategory: 'Web Application',
      priority: 'Medium',
      status: 'Completed',
      estimatedBudget: 280000,
      technologyStack: ['React', 'Express', 'MongoDB Atlas'],
      startDate: new Date('2026-06-01'),
      targetCompletionDate: new Date('2026-09-30'),
      actualCompletionDate: new Date('2026-09-28'),
      projectManager: primaryOwner._id,
      assignedLead: devUser._id,
      assignedTeamLead: devUser._id,
      teamMembers: [devUser._id],
      createdBy: primaryOwner._id
    }
  ];

  for (const p of projectDefs) {
    if (!p.client) continue;
    let proj = await Project.findOne({
      $or: [{ projectCode: p.projectCode }, { projectName: p.projectName }]
    });
    if (!proj) {
      proj = await Project.create(p);
      stats.projects.created++;

      // Create initial milestones
      await ProjectMilestone.create({
        project: proj._id,
        title: 'Phase 1: Architecture Sign-off',
        description: 'Completed technical specification and cloud topology blueprint.',
        status: 'Completed',
        dueDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        completedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        completedBy: primaryOwner._id
      });
      await ProjectMilestone.create({
        project: proj._id,
        title: 'Phase 2: MVP Core Delivery',
        description: 'Core functional workflows deployed to staging environment.',
        status: p.status === 'Completed' ? 'Completed' : 'In Progress',
        dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)
      });
    } else {
      stats.projects.skipped++;
    }
  }

  // 6. SEED TASKS (TODO / KANBAN)
  console.log('📋 [6/13] Seeding Team Tasks & Kanban Board...');
  const taskDefs = [
    {
      title: 'Audit AWS VPC security group inbound rules',
      description: 'Ensure only HTTPS 443 and SSH via bastion host are permitted across production clusters.',
      assigned_to: [devUser._id],
      created_by: primaryOwner._id,
      user_id: primaryOwner._id,
      status: 'current',
      priority: 'high',
      due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      labels: ['DevOps', 'Security']
    },
    {
      title: 'Implement Razorpay Webhook Idempotency Check',
      description: 'Verify signature and avoid double-crediting customer account on duplicate webhook deliveries.',
      assigned_to: [devUser._id],
      created_by: primaryOwner._id,
      user_id: primaryOwner._id,
      status: 'pending',
      priority: 'high',
      due_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      labels: ['Backend', 'Payment']
    },
    {
      title: 'Review candidate submissions for Frontend Engineer opening',
      description: 'Screen GitHub repos and code challenges submitted for React 19 position.',
      assigned_to: [hrUser._id],
      created_by: primaryOwner._id,
      user_id: primaryOwner._id,
      status: 'current',
      priority: 'medium',
      due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      labels: ['HR', 'Recruitment']
    },
    {
      title: 'Q3 Tax Invoice Reconciliation with Tally',
      description: 'Match GST Input Tax Credit figures against GSTR-2B portal before month-end filing.',
      assigned_to: [accUser._id],
      created_by: primaryOwner._id,
      user_id: primaryOwner._id,
      status: 'preview',
      priority: 'high',
      due_date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
      labels: ['Finance', 'GST']
    },
    {
      title: 'Complete Redpex CRM Vercel & Render Integration Testing',
      description: 'Verify all route aliases, RLS permissions, and client-side data rendering post-login.',
      assigned_to: [devUser._id, primaryOwner._id],
      created_by: primaryOwner._id,
      user_id: primaryOwner._id,
      status: 'done',
      priority: 'high',
      due_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      labels: ['QA', 'Deployment']
    }
  ];

  for (const t of taskDefs) {
    let task = await Task.findOne({ title: t.title });
    if (!task) {
      await Task.create(t);
      stats.tasks.created++;
    } else {
      stats.tasks.skipped++;
    }
  }

  // 7. SEED ATTENDANCE LOGS
  console.log('⏱️  [7/13] Seeding Attendance Records...');
  const todayIST = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  const usersForAttendance = [primaryOwner, devUser, salesUser, hrUser, accUser];

  for (const u of usersForAttendance) {
    if (!u) continue;
    let att = await Attendance.findOne({ user_id: u._id, date: todayIST });
    if (!att) {
      const checkInTime = new Date();
      checkInTime.setHours(9, 30, 0, 0);

      await Attendance.create({
        user_id: u._id,
        date: todayIST,
        status: 'PRESENT',
        check_in_time: checkInTime,
        check_out_time: null,
        working_hours: '5.50',
        is_late: false
      });
      stats.attendance.created++;
    } else {
      stats.attendance.skipped++;
    }
  }

  // 8. SEED LEAVES
  console.log('🌴 [8/13] Seeding Leave Requests...');
  const leaveDefs = [
    {
      user: devUser._id,
      userName: devUser.name,
      userEmail: devUser.email,
      department: 'Information Technology',
      leaveType: 'Personal Leave',
      startDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
      totalDays: 2,
      reason: 'Attending family wedding ceremony out of town.',
      status: 'Approved'
    },
    {
      user: salesUser._id,
      userName: salesUser.name,
      userEmail: salesUser.email,
      department: 'Sales & Marketing',
      leaveType: 'Sick Leave',
      startDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      totalDays: 1,
      reason: 'Routine medical dental checkup.',
      status: 'Pending'
    }
  ];

  for (const lv of leaveDefs) {
    let leave = await LeaveRequest.findOne({ user: lv.user, reason: lv.reason });
    if (!leave) {
      await LeaveRequest.create(lv);
      stats.leaves.created++;
    } else {
      stats.leaves.skipped++;
    }
  }

  // 9. SEED ACCOUNTS & INVOICES
  console.log('💳 [9/13] Seeding Financial Invoices & Expenses...');
  // Expense Categories
  const expCats = ['Cloud Hosting & Servers', 'Office Rent & Facilities', 'Marketing & Advertising', 'Software Licenses'];
  const expCatMap = {};
  for (const cName of expCats) {
    let ec = await ExpenseCategory.findOne({ name: cName });
    if (!ec) {
      ec = await ExpenseCategory.create({ name: cName, isActive: true });
    }
    expCatMap[cName] = ec;
  }

  // Capital Account
  const existingCapital = await Capital.findOne({ voucherNo: 'CAP-2026-001' });
  if (!existingCapital) {
    await Capital.create({
      voucherNo: 'CAP-2026-001',
      investorName: 'Redpex Founders Equity',
      amount: 500000,
      openingBalance: 500000,
      date: '2026-01-01',
      paymentMethod: 'Bank Transfer',
      referenceNo: 'TXN-CAP-001',
      status: 'Verified',
      remarks: 'Initial equity investment for infrastructure and talent setup.'
    });
    stats.accounts.created++;
  }

  // Incomes / Invoices
  const incomeDefs = [
    {
      title: 'Tax Invoice: Apex Cloud Migration Phase 1',
      amount: 150000,
      totalAmount: 177000,
      department: 'IT',
      sourceType: 'Client',
      client: clientMap['CLT-APEX-01']?._id,
      clientName: 'Apex Global Technologies',
      taxOption: 'GST',
      gstCategory: 'IGST',
      gstRate: 18,
      gstAmount: 27000,
      igstAmount: 27000,
      paymentMethod: 'Bank Transfer',
      status: 'Paid',
      receiptNo: 'REC-2026-001',
      date: new Date('2026-09-15')
    },
    {
      title: 'Proforma Invoice: Zenith Telehealth Milestone 2',
      amount: 100000,
      totalAmount: 118000,
      department: 'IT',
      sourceType: 'Client',
      client: clientMap['CLT-ZENITH-02']?._id,
      clientName: 'Zenith Healthcare Systems',
      taxOption: 'GST',
      gstCategory: 'IGST',
      gstRate: 18,
      gstAmount: 18000,
      igstAmount: 18000,
      paymentMethod: 'Bank Transfer',
      status: 'Pending',
      date: new Date('2026-10-10')
    }
  ];

  for (const inc of incomeDefs) {
    let incRecord = await Income.findOne({ title: inc.title });
    if (!incRecord) {
      await Income.create(inc);
      stats.accounts.created++;
    } else {
      stats.accounts.skipped++;
    }
  }

  // Expenses
  const expDefs = [
    {
      categoryName: 'Cloud Hosting & Servers',
      category: expCatMap['Cloud Hosting & Servers']?._id,
      amount: 18500,
      paymentMode: 'Bank Transfer',
      paidTo: 'Amazon Web Services India Pvt Ltd',
      description: 'AWS Production Cluster & S3 usage invoice for September 2026.',
      status: 'APPROVED',
      addedBy: primaryOwner._id,
      addedByName: primaryOwner.name,
      date: new Date('2026-10-02')
    },
    {
      categoryName: 'Marketing & Advertising',
      category: expCatMap['Marketing & Advertising']?._id,
      amount: 12000,
      paymentMode: 'Bank',
      paidTo: 'Google India Ads',
      description: 'Search ad campaign spend for CRM solution leads.',
      status: 'APPROVED',
      addedBy: primaryOwner._id,
      addedByName: primaryOwner.name,
      date: new Date('2026-10-05')
    }
  ];

  for (const ex of expDefs) {
    let exRecord = await Expense.findOne({ description: ex.description });
    if (!exRecord) {
      await Expense.create(ex);
      stats.accounts.created++;
    } else {
      stats.accounts.skipped++;
    }
  }

  // 10. SEED ACADEMY & LMS
  console.log('🎓 [10/13] Seeding Academy Courses, Batches & LMS...');
  const courseDefs = [
    {
      courseCode: 'CRS-MERN-01',
      courseName: 'Full-Stack Web Development Mastery (MERN Stack)',
      category: 'Web Development',
      durationValue: 6,
      durationUnit: 'Months',
      status: 'ACTIVE',
      shortDescription: 'Master modern full-stack development with React 19, Node.js, Express, and MongoDB.',
      description: 'Comprehensive program covering production-grade architecture, JWT authentication, state management, and cloud deployments.',
      syllabus: [
        {
          moduleId: 'MOD-01',
          title: 'Frontend Architecture with React 19 & Tailwind',
          description: 'Component composition, hooks, context API, and Framer Motion UI.',
          order: 1
        },
        {
          moduleId: 'MOD-02',
          title: 'Backend Engineering & API Design with Express',
          description: 'RESTful API contracts, MongoDB Atlas schemas, Redis caching, and JWT.',
          order: 2
        }
      ]
    },
    {
      courseCode: 'CRS-UIUX-02',
      courseName: 'UI/UX Design & Design Systems Bootcamp',
      category: 'Design',
      durationValue: 3,
      durationUnit: 'Months',
      status: 'ACTIVE',
      shortDescription: 'From wireframes to production design systems with Figma and design tokens.',
      description: 'Hands-on practical training creating user flows, high-fidelity prototypes, and design handoff files.',
      syllabus: [
        {
          moduleId: 'MOD-UI-01',
          title: 'Design Thinking & Wireframing',
          description: 'User interviews, problem scoping, and low-fi wireframing in Figma.',
          order: 1
        }
      ]
    }
  ];

  const courseMap = {};
  for (const c of courseDefs) {
    let crs = await Course.findOne({
      $or: [{ courseCode: c.courseCode }, { courseName: c.courseName }]
    });
    if (!crs) {
      crs = await Course.create(c);
      stats.academy.created++;
    } else {
      stats.academy.skipped++;
    }
    courseMap[c.courseCode] = crs;
  }

  // Batch
  const batchCode = 'BAT-2026-MERN-A';
  let batch = await Batch.findOne({
    $or: [{ batchCode }, { batchName: 'MERN Masters Batch October 2026' }]
  });
  if (!batch && courseMap['CRS-MERN-01']) {
    batch = await Batch.create({
      batchCode,
      batchName: 'MERN Masters Batch October 2026',
      courseId: courseMap['CRS-MERN-01']._id,
      instructorId: devUser._id,
      instructors: [devUser._id],
      startDate: new Date('2026-10-01'),
      endDate: new Date('2027-03-31'),
      daysOfWeek: ['Monday', 'Wednesday', 'Friday'],
      startTime: '10:00 AM',
      endTime: '12:00 PM',
      status: 'ONGOING',
      maxStrength: 25
    });
    stats.academy.created++;
  }

  // 11. SEED RECRUITMENT
  console.log('💼 [11/13] Seeding Recruitment Pipeline...');
  const candidateDefs = [
    {
      name: 'Tanvi Saxena',
      phone: '+919876500111',
      address: 'Indiranagar, Bangalore',
      status: 'Interviewing',
      interview_1: 'Passed',
      interview_2: 'Scheduled',
      salary_expectation: '₹6,50,000 / annum'
    },
    {
      name: 'Aditya Deshmukh',
      phone: '+919876500222',
      address: 'Kothrud, Pune',
      status: 'Shortlisted',
      interview_1: 'Scheduled',
      salary_expectation: '₹5,00,000 / annum'
    },
    {
      name: 'Farhan Zaidi',
      phone: '+919876500333',
      address: 'Bandra West, Mumbai',
      status: 'Hired',
      interview_1: 'Passed',
      interview_2: 'Passed',
      interview_3: 'Passed',
      salary_expectation: '₹7,20,000 / annum'
    }
  ];

  for (const cand of candidateDefs) {
    let cRecord = await Recruitment.findOne({ phone: cand.phone });
    if (!cRecord) {
      await Recruitment.create(cand);
      stats.recruitment.created++;
    } else {
      stats.recruitment.skipped++;
    }
  }

  // 12. SEED CALENDAR & DAILY OPERATIONS
  console.log('🗓️  [12/13] Seeding Content Calendar & Operations...');
  const calDefs = [
    {
      title: 'Publish LinkedIn Technical Case Study: Zero Downtime Migration',
      description: 'Highlight technical architecture and AWS deployment metrics.',
      contentType: 'LinkedIn Article',
      assignedTo: devUser._id,
      createdBy: primaryOwner._id,
      workStatus: 'in_progress',
      scheduledDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
    },
    {
      title: 'Instagram Carousel: 5 Best Practices for React 19 Context Management',
      description: 'Educational design carousel with code snippets and clean illustrations.',
      contentType: 'Instagram Carousel',
      assignedTo: salesUser._id,
      createdBy: primaryOwner._id,
      workStatus: 'draft',
      scheduledDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000)
    }
  ];

  for (const cal of calDefs) {
    let calRecord = await CalendarWork.findOne({ title: cal.title });
    if (!calRecord) {
      await CalendarWork.create(cal);
      stats.calendarWork.created++;
    } else {
      stats.calendarWork.skipped++;
    }
  }

  // Seed Daily Routine Milestones
  const routineDefs = [
    {
      dateString: todayIST,
      time: '09:30 AM',
      title: 'Morning Operations Sync & Daily Standup',
      subtitle: 'Review blockers, client priority tickets, and daily task assignments',
      status: 'completed',
      completedBy: primaryOwner._id,
      completedByName: primaryOwner.name,
      completedAt: new Date()
    },
    {
      dateString: todayIST,
      time: '04:30 PM',
      title: 'Evening Deployment & Code Review Window',
      subtitle: 'Merge approved pull requests and verify staging deployments',
      status: 'pending'
    }
  ];

  for (const r of routineDefs) {
    let rRecord = await DailyRoutine.findOne({ dateString: r.dateString, title: r.title });
    if (!rRecord) {
      await DailyRoutine.create(r);
    }
  }

  // 13. SEED NOTIFICATIONS
  console.log('🔔 [13/13] Seeding Notifications...');
  const notifDefs = [
    {
      title: 'New Enterprise Project Assigned',
      description: 'You have been assigned as the technical lead for "Apex Cloud Migration".',
      category: 'official',
      assignedTo: primaryOwner._id,
      createdBy: primaryOwner._id,
      createdByName: 'System Bot',
      isRead: false
    },
    {
      title: 'Scheduled System Maintenance Completed',
      description: 'Vercel frontend and Render backend API routes updated successfully.',
      category: 'system',
      assignedTo: primaryOwner._id,
      createdBy: primaryOwner._id,
      createdByName: 'DevOps Automated Alert',
      isRead: true
    }
  ];

  for (const n of notifDefs) {
    let notif = await Notification.findOne({ title: n.title, assignedTo: n.assignedTo });
    if (!notif) {
      await Notification.create(n);
      stats.notifications.created++;
    } else {
      stats.notifications.skipped++;
    }
  }

  console.log('\n======================================================');
  console.log('✨ SAMPLE DATA SEEDING COMPLETE');
  console.log('======================================================');
  for (const [moduleName, counts] of Object.entries(stats)) {
    console.log(`   ${moduleName.padEnd(16)}: ${counts.created} created, ${counts.skipped} already existed`);
  }
  console.log('======================================================\n');

  return { success: true, stats };
};

// Allow CLI execution: node backend/src/seeds/seedInitialData.js
if (process.argv[1]?.endsWith('seedInitialData.js')) {
  seedInitialData()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('❌ Seeding failed with error:', err);
      process.exit(1);
    });
}

export default seedInitialData;
