import { Router } from 'express';
import verifyJWT from '../middleware/auth.middleware.js';
import {
  createLeaveRequest,
  getMyLeaveRequests,
  getTeamLeaveRequests,
  getAllLeaveRequests,
  getLeaveHistory,
  approveOrRejectLeave,
  cancelLeaveRequest,
  updateLeaveRequest
} from '../controllers/leave.controller.js';

const router = Router();

router.use(verifyJWT);

// Employee routes
router.get('/', (req, res, next) => {
  const role = String(req.user?.role || req.user?.role_id || '').toLowerCase().trim();
  const isPrivileged = req.user?.isSuperAdmin === true || ['0', '1', '2', 'admin', 'hr', 'superadmin'].includes(role);
  if (isPrivileged) {
    return getAllLeaveRequests(req, res, next);
  }
  return getMyLeaveRequests(req, res, next);
});
router.post('/', createLeaveRequest);
router.get('/my', getMyLeaveRequests);
router.get('/history', getLeaveHistory);
router.put('/:id', updateLeaveRequest);
router.delete('/:id', cancelLeaveRequest);

// Manager / Team Lead routes
router.get('/team', getTeamLeaveRequests);

// HR / Admin routes
router.get('/all', getAllLeaveRequests);

// Action route for HR / Admin
router.put('/:id/action', approveOrRejectLeave);

export default router;

