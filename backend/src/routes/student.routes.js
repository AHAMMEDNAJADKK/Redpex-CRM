import express from 'express';
import protectRoute from '../middleware/auth.middleware.js';
import {
  markAttendance,
  getAttendanceByDate,
  getStudentProfile,
  deleteStudent
} from '../controllers/student.controller.js';

const router = express.Router();

router.post('/attendance/mark', protectRoute, markAttendance);
router.get('/attendance/student/:date', protectRoute, getAttendanceByDate);
router.get('/student/profile/:id', protectRoute, getStudentProfile);
router.get('/students/:id/profile', protectRoute, getStudentProfile);
router.delete('/student/:id', protectRoute, deleteStudent);
router.delete('/students/:id', protectRoute, deleteStudent);

export default router;
