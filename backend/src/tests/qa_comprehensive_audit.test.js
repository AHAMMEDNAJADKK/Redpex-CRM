import { jest } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

// Mock Redis to isolate test from external network dependency
jest.unstable_mockModule('../config/redis.js', () => ({
  __esModule: true,
  default: {
    exists: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(1),
    set: jest.fn().mockResolvedValue('OK'),
    get: jest.fn().mockResolvedValue(null),
    keys: jest.fn().mockResolvedValue([]),
    del: jest.fn().mockResolvedValue(0),
    status: 'ready'
  }
}));

const { default: app } = await import('../../app.js');
const { default: connectDB } = await import('../config/db.js');
const { default: Lead } = await import('../models/lead.model.js');
const { default: Client } = await import('../models/client.model.js');
const { default: Task } = await import('../models/task.model.js');
const { default: Project } = await import('../models/project.model.js');
const { default: Income } = await import('../models/income.model.js');
const { default: Expense } = await import('../models/expense.model.js');
const { default: Capital } = await import('../models/capital.model.js');
const { default: Course } = await import('../models/course.model.js');
const { default: Batch } = await import('../models/batch.model.js');
const { default: CalendarWork } = await import('../models/calendarWork.model.js');
const { default: Notification } = await import('../models/notification.model.js');
const { default: LeaveRequest } = await import('../models/leaveRequest.model.js');
const { default: User } = await import('../models/user.model.js');

const TEST_TAG = 'QA_AUDIT_20261027';

describe('REDPEX CRM — Full End-to-End Senior QA Audit & Module Regression Suite', () => {
  let superadminToken = '';
  let superadminId = '';
  let studentToken = '';

  // Track created test record IDs for safe deterministic cleanup
  const createdIds = {
    leads: [],
    clients: [],
    tasks: [],
    projects: [],
    incomes: [],
    expenses: [],
    capitals: [],
    courses: [],
    batches: [],
    calendarWorks: [],
    notifications: [],
    leaves: [],
    users: []
  };

  beforeAll(async () => {
    await connectDB();

    // 1. Authenticate Superadmin to acquire valid JWT session token
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'superadmin@gmail.com',
        password: 'superadmin@111'
      });

    if (loginRes.status === 200 && loginRes.body.token) {
      superadminToken = loginRes.body.token;
      superadminId = loginRes.body.user?._id || loginRes.body.user?.id;
    }

    // 2. Synthesize a mock student token for RBAC privilege escalation tests
    const secret = process.env.JWT_SECRET || 'supersecretjwtkey_12345';
    studentToken = jwt.sign(
      {
        id: new mongoose.Types.ObjectId().toString(),
        role: 'student',
        role_id: '10',
        isSuperAdmin: false
      },
      secret,
      { expiresIn: '1h' }
    );
  }, 30000);

  afterAll(async () => {
    try {
      // Deterministic cleanup: only delete records created with our test tag
      if (createdIds.leads.length) await Lead.deleteMany({ _id: { $in: createdIds.leads } });
      await Lead.deleteMany({ leadName: { $regex: new RegExp(TEST_TAG, 'i') } });

      if (createdIds.clients.length) await Client.deleteMany({ _id: { $in: createdIds.clients } });
      await Client.deleteMany({ companyName: { $regex: new RegExp(TEST_TAG, 'i') } });

      if (createdIds.tasks.length) await Task.deleteMany({ _id: { $in: createdIds.tasks } });
      await Task.deleteMany({ title: { $regex: new RegExp(TEST_TAG, 'i') } });

      if (createdIds.projects.length) await Project.deleteMany({ _id: { $in: createdIds.projects } });
      await Project.deleteMany({ projectName: { $regex: new RegExp(TEST_TAG, 'i') } });

      if (createdIds.incomes.length) await Income.deleteMany({ _id: { $in: createdIds.incomes } });
      await Income.deleteMany({ title: { $regex: new RegExp(TEST_TAG, 'i') } });

      if (createdIds.expenses.length) await Expense.deleteMany({ _id: { $in: createdIds.expenses } });
      await Expense.deleteMany({ description: { $regex: new RegExp(TEST_TAG, 'i') } });

      if (createdIds.capitals.length) await Capital.deleteMany({ _id: { $in: createdIds.capitals } });
      await Capital.deleteMany({ investorName: { $regex: new RegExp(TEST_TAG, 'i') } });

      if (createdIds.courses.length) await Course.deleteMany({ _id: { $in: createdIds.courses } });
      await Course.deleteMany({ courseName: { $regex: new RegExp(TEST_TAG, 'i') } });

      if (createdIds.batches.length) await Batch.deleteMany({ _id: { $in: createdIds.batches } });
      await Batch.deleteMany({ batchName: { $regex: new RegExp(TEST_TAG, 'i') } });

      if (createdIds.calendarWorks.length) await CalendarWork.deleteMany({ _id: { $in: createdIds.calendarWorks } });
      await CalendarWork.deleteMany({ title: { $regex: new RegExp(TEST_TAG, 'i') } });

      if (createdIds.notifications.length) await Notification.deleteMany({ _id: { $in: createdIds.notifications } });
      await Notification.deleteMany({ title: { $regex: new RegExp(TEST_TAG, 'i') } });

      if (createdIds.leaves.length) await LeaveRequest.deleteMany({ _id: { $in: createdIds.leaves } });
      await LeaveRequest.deleteMany({ reason: { $regex: new RegExp(TEST_TAG, 'i') } });

      if (createdIds.users.length) await User.deleteMany({ _id: { $in: createdIds.users } });
      await User.deleteMany({ email: { $regex: new RegExp(TEST_TAG, 'i') } });

      await mongoose.disconnect();
    } catch (_) {}
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // 1. AUTHENTICATION & SECURITY LIFECYCLE AUDIT
  // ═════════════════════════════════════════════════════════════════════════════
  describe('Phase Two — Authentication & Security Lifecycles', () => {
    test('AUTH-01: Valid superadmin credentials succeed and return token + role', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'superadmin@gmail.com', password: 'superadmin@111' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.role).toBe('superadmin');
      expect(res.body.user.isSuperAdmin).toBe(true);
      expect(res.body.user.password).toBeUndefined();
      expect(res.body.user.passwordHash).toBeUndefined();
    });

    test('AUTH-02: Invalid credentials rejected with 401 Unauthorized', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'superadmin@gmail.com', password: 'wrongpassword' });

      expect(res.status).toBe(401);
      expect(res.body.detail).toContain('Invalid credentials');
    });

    test('AUTH-03: Empty login body rejected with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.detail).toContain('required');
    });

    test('AUTH-04: Protected endpoints reject unauthenticated access with 401', async () => {
      const endpoints = [
        '/api/v1/users',
        '/api/v1/leads',
        '/api/v1/clients',
        '/api/v1/tasks',
        '/api/v1/accounts/income',
        '/api/v1/academy/courses'
      ];

      for (const ep of endpoints) {
        const res = await request(app).get(ep);
        expect(res.status).toBe(401);
      }
    });

    test('AUTH-05: Student token cannot access restricted administrative routes (RBAC)', async () => {
      const res = await request(app)
        .post('/api/v1/departments')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ name: `${TEST_TAG}_Restricted_Dept` });

      expect([401, 403]).toContain(res.status);
    });

    test('AUTH-06: Passwords never returned in user listing query', async () => {
      const res = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(res.status).toBe(200);
      const users = Array.isArray(res.body) ? res.body : (res.body?.data || []);
      expect(users.length).toBeGreaterThan(0);
      for (const u of users) {
        expect(u.password).toBeUndefined();
        expect(u.passwordHash).toBeUndefined();
      }
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // 2. LEADS MODULE FULL CRUD AUDIT
  // ═════════════════════════════════════════════════════════════════════════════
  describe('Phase Three — Leads Module CRUD Workflow', () => {
    let leadId = '';

    test('LEAD-01: Create Lead with valid data', async () => {
      const payload = {
        leadName: `${TEST_TAG}_John_Safety`,
        phone: '9876543210',
        email: 'qa_lead_john@example.com',
        city: 'Cochin',
        interestedService: 'Fire Protection Systems',
        priority: 'High',
        status: 'New'
      };

      const res = await request(app)
        .post('/api/v1/leads')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send(payload);

      expect([200, 201]).toContain(res.status);
      expect(res.body.success).toBe(true);
      leadId = res.body.data?._id || res.body.data?.id;
      expect(leadId).toBeDefined();
      createdIds.leads.push(leadId);
    });

    test('LEAD-02: Get Lead by ID returns accurate data', async () => {
      const res = await request(app)
        .get(`/api/v1/leads/${leadId}`)
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const leadData = res.body.data?.lead || res.body.data;
      expect(leadData?.leadName).toBe(`${TEST_TAG}_John_Safety`);
      expect(leadData?.phone).toBe('9876543210');
    });

    test('LEAD-03: Update Lead status transition to Contacted', async () => {
      const res = await request(app)
        .put(`/api/v1/leads/${leadId}`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({ status: 'Contacted', remarks: 'QA Initial Call Completed' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const updatedData = res.body.data?.lead || res.body.data;
      expect(updatedData?.status).toBe('Contacted');
    });

    test('LEAD-04: Search Leads includes newly created lead', async () => {
      const res = await request(app)
        .get(`/api/v1/leads?search=${TEST_TAG}_John_Safety`)
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(res.status).toBe(200);
      const leads = res.body?.data?.leads || res.body?.data || [];
      expect(leads.some(l => (l._id === leadId || l.id === leadId) || l.leadName?.includes(TEST_TAG))).toBe(true);
    });

    test('LEAD-05: Delete Lead removes record from database', async () => {
      const res = await request(app)
        .delete(`/api/v1/leads/${leadId}`)
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const verifyRes = await request(app)
        .get(`/api/v1/leads/${leadId}`)
        .set('Authorization', `Bearer ${superadminToken}`);
      expect([404, 400]).toContain(verifyRes.status);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // 3. CLIENTS & PROJECTS MODULE CRUD AUDIT
  // ═════════════════════════════════════════════════════════════════════════════
  describe('Phase Three — Clients & Projects Module CRUD', () => {
    let clientId = '';
    let projectId = '';

    test('CLIENT-01: Create Enterprise Client', async () => {
      const res = await request(app)
        .post('/api/v1/clients')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          companyName: `${TEST_TAG}_Metro_Rail_Safety`,
          clientName: 'Sarah Jenkins',
          email: 'sarah@metrorailtest.com',
          phone: '+91 98888 11111',
          industry: 'Infrastructure & Safety',
          status: 'Active',
          priority: 'High'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      clientId = res.body.data._id || res.body.data.id;
      createdIds.clients.push(clientId);
    });

    test('CLIENT-02: Get Client by ID & Update Priority', async () => {
      const getRes = await request(app)
        .get(`/api/v1/clients/${clientId}`)
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.data?.client?.companyName).toContain(TEST_TAG);

      const updateRes = await request(app)
        .put(`/api/v1/clients/${clientId}`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({ priority: 'VIP' });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data?.priority).toBe('VIP');
    });

    test('PROJECT-01: Create Project associated with Client and Assigned Employees', async () => {
      const res = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          projectName: `${TEST_TAG}_Fire_Suppression_Install`,
          client: clientId,
          projectManager: superadminId,
          assignedEmployees: [superadminId],
          status: 'Planning',
          priority: 'High',
          startDate: new Date(),
          deadline: new Date(Date.now() + 30 * 86400000).toISOString()
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      projectId = res.body.data?._id || res.body.data?.id;
      createdIds.projects.push(projectId);
    });

    test('PROJECT-02: Fetch Project Details & Verify Relationship', async () => {
      const res = await request(app)
        .get(`/api/v1/projects/${projectId}`)
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data?.project?.projectName).toContain(TEST_TAG);
      expect(Array.isArray(res.body.data?.milestones)).toBe(true);
    });

    test('PROJECT-03: Delete Project & Client', async () => {
      const pDel = await request(app)
        .delete(`/api/v1/projects/${projectId}`)
        .set('Authorization', `Bearer ${superadminToken}`);
      expect(pDel.status).toBe(200);

      const cDel = await request(app)
        .delete(`/api/v1/clients/${clientId}`)
        .set('Authorization', `Bearer ${superadminToken}`);
      expect(cDel.status).toBe(200);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // 4. TASKS MANAGEMENT WORKFLOW AUDIT
  // ═════════════════════════════════════════════════════════════════════════════
  describe('Phase Three — Tasks Module Workflow', () => {
    let taskId = '';

    test('TASK-01: Create Task and Assign to User', async () => {
      const res = await request(app)
        .post('/api/v1/tasks/create')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          title: `${TEST_TAG}_Fire_Sprinkler_Pressure_Test`,
          description: 'Quarterly pressure testing on line A',
          assigned_to: superadminId,
          status: 'pending',
          priority: 'high',
          due_date: new Date(Date.now() + 86400000).toISOString()
        });

      expect([200, 201]).toContain(res.status);
      const data = res.body.task || res.body.data || res.body;
      taskId = data._id || data.id;
      expect(taskId).toBeDefined();
      createdIds.tasks.push(taskId);
    });

    test('TASK-02: Transition Task Status to In-Progress (current)', async () => {
      const res = await request(app)
        .put(`/api/v1/tasks/task-status/${taskId}?status=current`)
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(res.status).toBe(200);
    });

    test('TASK-03: Add Comment to Task', async () => {
      const res = await request(app)
        .post(`/api/v1/tasks/${taskId}/comments`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({ comment: 'Inspection in progress, pressure verified at 150 PSI.' });

      expect([200, 201]).toContain(res.status);
    });

    test('TASK-04: Delete Task', async () => {
      const res = await request(app)
        .delete(`/api/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(res.status).toBe(200);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // 5. ACCOUNTS & FINANCIAL MANAGEMENT AUDIT
  // ═════════════════════════════════════════════════════════════════════════════
  describe('Phase Three — Accounts & Financial Operations', () => {
    let incomeId = '';
    let capitalId = '';

    test('ACCOUNTS-01: Create Income Record (Invoice)', async () => {
      const res = await request(app)
        .post('/api/v1/accounts/income')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          title: `${TEST_TAG}_Safety_System_Sale`,
          amount: 45000,
          department: 'Operations',
          paymentMethod: 'Bank Transfer',
          status: 'Pending',
          description: 'QA Automated Accounts Testing'
        });

      expect([200, 201]).toContain(res.status);
      expect(res.body.success).toBe(true);
      incomeId = res.body.data?._id || res.body.data?.id;
      createdIds.incomes.push(incomeId);
    });

    test('ACCOUNTS-02: Fetch Cash Book & Daily Report', async () => {
      const cashRes = await request(app)
        .get('/api/v1/accounts/cash-book')
        .set('Authorization', `Bearer ${superadminToken}`);
      expect(cashRes.status).toBe(200);

      const repRes = await request(app)
        .get('/api/v1/accounts/reports/daily')
        .set('Authorization', `Bearer ${superadminToken}`);
      expect(repRes.status).toBe(200);
    });

    test('ACCOUNTS-03: Create and Delete Capital Account Entry', async () => {
      const capRes = await request(app)
        .post('/api/v1/accounts/capital')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          investorName: `${TEST_TAG}_Angel_Capital`,
          amount: 100000,
          notes: 'QA Seed Testing'
        });

      expect([200, 201]).toContain(capRes.status);
      capitalId = capRes.body.data?._id || capRes.body.data?.id;
      createdIds.capitals.push(capitalId);

      const delCap = await request(app)
        .delete(`/api/v1/accounts/capital/${capitalId}`)
        .set('Authorization', `Bearer ${superadminToken}`);
      expect(delCap.status).toBe(200);
    });

    test('ACCOUNTS-04: Delete Income Record', async () => {
      const res = await request(app)
        .delete(`/api/v1/accounts/income/${incomeId}`)
        .set('Authorization', `Bearer ${superadminToken}`);
      expect(res.status).toBe(200);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // 6. ACADEMY & LMS MODULE AUDIT
  // ═════════════════════════════════════════════════════════════════════════════
  describe('Phase Three — Academy & LMS Module', () => {
    let courseId = '';

    test('ACADEMY-01: Create Course with Admin Privileges', async () => {
      const res = await request(app)
        .post('/api/v1/academy/courses')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          courseName: `${TEST_TAG}_Fire_Safety_Officer_Course`,
          description: 'Industrial Safety Standards and Extinguisher Protocols',
          code: `FSO-${Date.now().toString().slice(-4)}`,
          fee: 15000,
          status: 'ACTIVE'
        });

      expect([200, 201]).toContain(res.status);
      courseId = res.body.data?._id || res.body.data?.id;
      expect(courseId).toBeDefined();
      createdIds.courses.push(courseId);
    });

    test('ACADEMY-02: Get Course Details & Verify Structure', async () => {
      const res = await request(app)
        .get(`/api/v1/academy/courses/${courseId}`)
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data?.courseName).toContain(TEST_TAG);
    });

    test('ACADEMY-03: Delete Course', async () => {
      const res = await request(app)
        .delete(`/api/v1/academy/courses/${courseId}`)
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(res.status).toBe(200);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // 7. CALENDAR & NOTIFICATION MODULES AUDIT
  // ═════════════════════════════════════════════════════════════════════════════
  describe('Phase Three — Calendar & Notifications', () => {
    let notifId = '';
    let calId = '';

    test('NOTIF-01: Create and Fetch In-App Notification', async () => {
      const res = await request(app)
        .post('/api/v1/notifications')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          title: `${TEST_TAG}_System_Alert`,
          description: 'Quarterly compliance audit scheduled for next Monday',
          assignedTo: superadminId,
          type: 'task'
        });

      expect([200, 201]).toContain(res.status);
      const data = Array.isArray(res.body.data) ? res.body.data[0] : res.body.data;
      notifId = data?._id || data?.id;
      expect(notifId).toBeDefined();
      createdIds.notifications.push(notifId);

      const listRes = await request(app)
        .get('/api/v1/notifications/my-notifications')
        .set('Authorization', `Bearer ${superadminToken}`);
      expect(listRes.status).toBe(200);
    });

    test('NOTIF-02: Mark Notification Read & Clean Up', async () => {
      const markRes = await request(app)
        .put(`/api/v1/notifications/${notifId}/read`)
        .set('Authorization', `Bearer ${superadminToken}`);
      expect(markRes.status).toBe(200);

      const delRes = await request(app)
        .delete(`/api/v1/notifications/${notifId}`)
        .set('Authorization', `Bearer ${superadminToken}`);
      expect(delRes.status).toBe(200);
    });

    test('CAL-01: Create and Delete Calendar Work Item', async () => {
      const createRes = await request(app)
        .post('/api/v1/calendar-work')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          title: `${TEST_TAG}_Onsite_Inspection`,
          description: 'Annual facility certification',
          assignedTo: superadminId,
          workDate: new Date(),
          workDueDate: new Date(Date.now() + 86400000),
          workStatus: 'in_progress',
          contentType: 'reel'
        });

      expect([200, 201]).toContain(createRes.status);
      calId = createRes.body.data?._id || createRes.body.data?.id;
      createdIds.calendarWorks.push(calId);

      const delRes = await request(app)
        .delete(`/api/v1/calendar-work/${calId}`)
        .set('Authorization', `Bearer ${superadminToken}`);
      expect(delRes.status).toBe(200);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // 8. LEAVES & HR WORKFLOWS AUDIT
  // ═════════════════════════════════════════════════════════════════════════════
  describe('Phase Four — Leaves & HR Workflow Operations', () => {
    let leaveId = '';

    test('LEAVE-01: Apply for Leave Request with valid enum type', async () => {
      const res = await request(app)
        .post('/api/v1/leaves')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          leaveType: 'Personal Leave',
          startDate: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
          endDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
          reason: `${TEST_TAG}_Family_Function`
        });

      expect([200, 201]).toContain(res.status);
      leaveId = res.body.data?._id || res.body.data?.id;
      expect(leaveId).toBeDefined();
      createdIds.leaves.push(leaveId);
    });

    test('LEAVE-02: Admin Approves Leave Request', async () => {
      const res = await request(app)
        .put(`/api/v1/leaves/${leaveId}/action`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({ action: 'APPROVED', comment: 'Approved by QA Suite' });

      expect(res.status).toBe(200);
    });

    test('LEAVE-03: Invalid Leave ID returns 400 Bad Request safely without crash', async () => {
      const res = await request(app)
        .put('/api/v1/leaves/invalid_id_format/action')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({ action: 'APPROVED' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test('LEAVE-04: Cancel and Clean Up Leave Record', async () => {
      const res = await request(app)
        .delete(`/api/v1/leaves/${leaveId}`)
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(res.status).toBe(200);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // 9. MD DASHBOARD & ANALYTICS READINESS
  // ═════════════════════════════════════════════════════════════════════════════
  describe('Phase Four — MD Dashboard & Analytics Services', () => {
    test('MD-01: GET /api/v1/md-dashboard returns consolidated executive metrics', async () => {
      const res = await request(app)
        .get('/api/v1/md-dashboard')
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });

    test('ANALYTICS-01: GET /api/v1/analytics/summary returns marketing metrics summary', async () => {
      const res = await request(app)
        .get('/api/v1/analytics/summary')
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });
  });
});
