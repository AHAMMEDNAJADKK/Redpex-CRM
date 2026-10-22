import cron from 'node-cron';
import User from '../models/user.model.js';
import Attendance from '../models/attendance.model.js';
import Department from '../modules/departments/department.model.js';
import redis from '../config/redis.js';
import notificationService, { sendNotification } from './notification.service.js';
import { calendarReminderService } from './calendarReminder.service.js';
import Task from '../models/task.model.js';
import logger from '../utils/logger.util.js';

const TIMEZONE = 'Asia/Kolkata'; // Operational IST Timezone

const activeJobs = [];

export const schedulerService = {
  /**
   * Registers and starts all node-cron jobs safely
   */
  start: () => {
    logger.info('⏰ SchedulerService: Initializing background cron automation processes...');

    // 1. Daily at 9:00 AM IST: Send shift report reminder
    const shiftReminderJob = cron.schedule('0 9 * * *', async () => {
      logger.info('⏰ CRON TRIGGERED: Daily Shift Report Reminder (9:00 AM IST)');
      try {
        const staff = await User.find({ isActive: true }).select('_id');
        const staffIds = staff.map((s) => s._id);
        
        if (staffIds.length > 0) {
          await notificationService.sendBulk(staffIds, ['IN_APP'], {
            title: '☀️ Daily Shift Commenced',
            body: 'Good morning! Please remember to log your tasks and goals on the Redpex CRM portal today.',
            type: 'SYSTEM'
          });
        }
      } catch (err) {
        logger.error(`❌ Cron Job: Shift Reminder failed: ${err.message}`);
      }
    }, { scheduled: true, timezone: TIMEZONE });
    activeJobs.push(shiftReminderJob);

    // 2. Daily at 6:00 PM IST: Alert staff of pending daily reports
    const reportAlertJob = cron.schedule('0 18 * * *', async () => {
      logger.info('⏰ CRON TRIGGERED: Missing Daily Report Audits (6:00 PM IST)');
      try {
        const activeStaff = await User.find({
          isActive: true,
          role: { $nin: ['MD', 'COO', 'superadmin'] }
        }).select('_id name departmentId');

        for (const staff of activeStaff) {
          try {
            await notificationService.dispatchMultiChannel({
              userId: staff._id,
              channels: ['IN_APP'],
              title: '📝 Pending Daily Report',
              body: 'Your shift has ended. Please log your tasks accomplished in the Daily Reports module.',
              type: 'REPORT'
            });
          } catch (itemErr) {
            // Non-fatal per-user notification failure
          }
        }
      } catch (err) {
        logger.error(`❌ Cron Job: Daily Report Audits failed: ${err.message}`);
      }
    }, { scheduled: true, timezone: TIMEZONE });
    activeJobs.push(reportAlertJob);

    // 3. Daily at 11:59 PM IST: Mark absent if no check-in recorded today
    const autoAbsentJob = cron.schedule('59 23 * * *', async () => {
      logger.info('⏰ CRON TRIGGERED: Auto-Attendance Absentees Check (11:59 PM IST)');
      try {
        const todayStr = new Date().toISOString().split('T')[0];
        const activeStaff = await User.find({
          isActive: true,
          role: { $nin: ['MD', 'COO', 'superadmin'] }
        });

        for (const staff of activeStaff) {
          try {
            const existing = await Attendance.findOne({ user_id: staff._id, date: todayStr });
            if (!existing) {
              await Attendance.create({
                user_id: staff._id,
                date: todayStr,
                status: 'ABSENT',
                check_in_time: null,
                check_out_time: null,
                working_hours: '0.00'
              });
              logger.info(`📝 Attendance auto-absent marked: ${staff.name}`);
            }
          } catch (attendErr) {
            logger.warn(`⚠️ Attendance auto-absent record failed for ${staff.name}: ${attendErr.message}`);
          }
        }
      } catch (err) {
        logger.error(`❌ Cron Job: Attendance Audits failed: ${err.message}`);
      }
    }, { scheduled: true, timezone: TIMEZONE });
    activeJobs.push(autoAbsentJob);

    // 4. Every Monday at 8:00 AM IST: Weekly operations report reminder
    const weeklySummaryJob = cron.schedule('0 8 * * 1', async () => {
      logger.info('⏰ CRON TRIGGERED: Weekly Operations Summary Trigger (Monday 8:00 AM IST)');
      try {
        const executives = await User.find({
          role: { $in: ['MD', 'COO', 'superadmin', 'admin'] }
        });

        for (const exec of executives) {
          try {
            await notificationService.dispatchMultiChannel({
              userId: exec._id,
              channels: ['IN_APP'],
              title: '📊 Weekly Performance Summary',
              body: 'A new weekly operations consolidated sheet has been compiled. Head over to the Dashboard to review weekly metrics.',
              type: 'REPORT'
            });
          } catch (execErr) {}
        }
      } catch (err) {
        logger.error(`❌ Cron Job: Weekly Summary failed: ${err.message}`);
      }
    }, { scheduled: true, timezone: TIMEZONE });
    activeJobs.push(weeklySummaryJob);

    // 5. Every 5 minutes: Check tasks due in 15 minutes or overdue, and send multi-channel reminders
    const taskDueReminderJob = cron.schedule('*/5 * * * *', async () => {
      try {
        const now = new Date();
        const fifteenMinsLater = new Date(now.getTime() + 15 * 60 * 1000);

        const upcomingTasks = await Task.find({
          status: { $ne: 'done' },
          dueDate: { $gte: now, $lte: fifteenMinsLater }
        }).populate('assigned_to', 'name email phone');

        for (const t of upcomingTasks) {
          if (t.assigned_to) {
            const userId = t.assigned_to._id || t.assigned_to.id;
            const dueTimeStr = new Date(t.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            if (userId) {
              await sendNotification(
                userId,
                `⏰ TASK DUE SOON: Your assigned task "${t.title}" is due at ${dueTimeStr}. Please complete or update its status.`,
                'warning',
                `⏰ Task Due Reminder: ${t.title}`
              );
            }
          }
        }
      } catch (err) {
        logger.error(`❌ Cron Job: Task Due Reminder failed: ${err.message}`);
      }
    }, { scheduled: true, timezone: TIMEZONE });
    activeJobs.push(taskDueReminderJob);

    // 6. Every 5 minutes: Refresh dashboard stats cache in Redis (safely handled if Redis offline)
    const cacheRefreshJob = cron.schedule('*/5 * * * *', async () => {
      try {
        if (redis && (redis.status === 'ready' || redis.status === 'connect')) {
          await redis.del('dashboard_overview_cache');
          logger.info('🧹 Evicted old Redis dashboard overview cache.');
        }
      } catch (err) {
        logger.warn(`⚠️ Background cache refresh bypassed: ${err.message}`);
      }
    }, { scheduled: true });
    activeJobs.push(cacheRefreshJob);

    // 7. Every 5 minutes: Check calendar work items with overdue posting times and send reminders
    const calendarReminderJob = cron.schedule('*/5 * * * *', async () => {
      try {
        if (calendarReminderService && typeof calendarReminderService.processPostingReminders === 'function') {
          const result = await calendarReminderService.processPostingReminders();
          if (result && result.processed > 0) {
            logger.info(`⏰ Calendar Reminder: Processed ${result.processed} items, Success: ${result.success}, Failed: ${result.failed}`);
          }
        }
      } catch (err) {
        logger.error(`❌ Cron Job: Calendar Reminder failed: ${err.message}`);
      }
    }, { scheduled: true, timezone: TIMEZONE });
    activeJobs.push(calendarReminderJob);

    logger.info(`⏰ SchedulerService: Registered and started ${activeJobs.length} active cron jobs.`);
  },

  /**
   * Stop all running cron jobs (for graceful shutdown cycles)
   */
  stop: () => {
    logger.info('⏰ Stopping all active Cron scheduling tasks...');
    activeJobs.forEach((job) => job.stop());
    activeJobs.length = 0;
  }
};

export default schedulerService;
