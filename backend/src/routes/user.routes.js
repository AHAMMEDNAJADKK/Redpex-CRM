import { Router } from 'express';
import { userController } from '../controllers/user.controller.js';
import checkAuth, { requireRole, requireAdmin, requireSuperAdmin } from '../middleware/auth.middleware.js';
import upload from '../middleware/upload.middleware.js';

const router = Router();

// ==========================================
// AUTH MIDDLEWARE
// ==========================================

router.use(checkAuth);

// ==========================================
// USER ROUTES
// ==========================================

// CHANGE PASSWORD (self)
router.post(
  '/change-password',
  userController.changePassword
);

// GET ALL USERS
router.get(
  '/',
  userController.getUsers
);

// SIMPLE USER LIST
router.get(
  '/list',
  userController.getUserList
);

// GET USER BY ID
router.get(
  '/:id',
  userController.getUserById
);

// ==========================================
// ADMIN ROUTES
// ==========================================

// CREATE USER
router.post(
  '/create',
  requireAdmin,
  upload.any(),
  userController.createUser
);
router.post(
  '/',
  requireAdmin,
  upload.any(),
  userController.createUser
);

// UPDATE USER
router.put(
  '/update/:id',
  upload.any(),
  userController.updateUser
);
router.post(
  '/update/:id',
  upload.any(),
  userController.updateUser
);
router.put(
  '/:id',
  upload.any(),
  userController.updateUser
);
router.put(
  '/update',
  upload.any(),
  (req, res, next) => {
    req.params.id = req.body.id || req.body._id;
    next();
  },
  userController.updateUser
);
router.post(
  '/update',
  upload.any(),
  (req, res, next) => {
    req.params.id = req.body.id || req.body._id;
    next();
  },
  userController.updateUser
);

// CHANGE ROLE
router.patch(
  '/:id/role',
  requireAdmin,
  userController.changeUserRole
);

// UPDATE PERMISSIONS & SIDEBAR ACCESS
router.put(
  '/:id/permissions',
  requireAdmin,
  userController.updatePermissions
);
router.post(
  '/:id/permissions',
  requireAdmin,
  userController.updatePermissions
);

// DEACTIVATE USER
router.patch(
  '/:id/deactivate',
  requireAdmin,
  userController.deactivateUser
);

// DELETE USER
router.delete(
  '/delete/:id',
  requireAdmin,
  userController.deleteUser
);
router.post(
  '/delete/:id',
  requireAdmin,
  userController.deleteUser
);
router.delete(
  '/:id',
  requireAdmin,
  userController.deleteUser
);
router.delete(
  '/delete',
  requireAdmin,
  (req, res, next) => {
    req.params.id = req.body.id || req.body._id;
    next();
  },
  userController.deleteUser
);
router.post(
  '/delete',
  requireAdmin,
  (req, res, next) => {
    req.params.id = req.body.id || req.body._id;
    next();
  },
  userController.deleteUser
);

export default router;