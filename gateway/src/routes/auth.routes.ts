import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { staffAccounts, DEADLINE_MS } from '../clients.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'seats-jwt-secret-key-change-in-prod';

// In-Memory Blacklist สำหรับเก็บ Token ที่ทำการ Logout แล้ว
const tokenBlacklist = new Set<string>();

// Helper function แปลง gRPC Callback เป็น Promise
const unary = <Res>(run: (cb: (err: any, res?: Res) => void) => void) =>
  new Promise<Res>((resolve, reject) => run((err, res) => (err ? reject(err) : resolve(res as Res))));

interface AuthenticatedRequest extends Request {
  user?: any;
}

// 1. Middleware สำหรับตรวจสอบ JWT Bearer Token และ Blacklist
const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access token is required.' });
  }

  // เช็กว่า Token ถูก Logout ไปแล้วหรือยัง
  if (tokenBlacklist.has(token)) {
    return res.status(401).json({ success: false, message: 'Token has been invalidated (Logged out).' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Invalid or expired token.' });
    }
    req.user = decoded;
    next();
  });
};

// 2. Middleware สำหรับ RBAC (Role-Based Access Control)
const requireRole = (...allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User information missing.',
      });
    }

    const hasRole = allowedRoles.includes(req.user.role);

    if (!hasRole) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access denied. Required role: [${allowedRoles.join(', ')}]`,
      });
    }

    next();
  };
};

// POST /api/v1/auth/login (สำหรับ Back-Office Login ด้วย username/password)
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required.' });
    }

    const session = await unary<any>((cb) =>
      staffAccounts.signIn(
        { username, password },
        { deadline: Date.now() + DEADLINE_MS },
        cb
      )
    );

    const token = jwt.sign(
      {
        id: session.staff_account_id,
        userId: session.staff_account_id,
        username,
        role: session.role, // manager | front_staff | owner
      },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        sessionToken: session.token,
        token,
        user: {
          id: session.staff_account_id,
          username,
          role: session.role,
        },
      },
    });
  } catch (error: any) {
    const status = error.code === 16 ? 401 : 500;
    return res.status(status).json({
      success: false,
      message: error.details || error.message || 'Authentication failed',
    });
  }
});

// POST /api/v1/auth/register (ล็อกสิทธิ์ให้เฉพาะ manager หรือ owner เท่านั้นสร้างได้)
router.post(
  '/register',
  authenticateToken,
  requireRole('manager', 'owner'),
  async (req: Request, res: Response) => {
    try {
      const { username, password, role } = req.body;

      if (!username || !password || !role) {
        return res.status(400).json({ success: false, message: 'Username, password, and role are required.' });
      }

      const account = await unary<any>((cb) =>
        staffAccounts.createStaffAccount(
          { username, password, role },
          { deadline: Date.now() + DEADLINE_MS },
          cb
        )
      );

      return res.status(201).json({
        success: true,
        message: 'Staff account created successfully',
        data: account,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.details || error.message || 'Failed to create staff account',
      });
    }
  }
);

// GET /api/v1/auth/me (ดึง Profile ของผู้ใช้ที่ล็อกอินอยู่)
router.get('/me', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: req.user.id || req.user.userId,
          username: req.user.username,
          role: req.user.role,
        },
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch user profile',
    });
  }
});

// POST /api/v1/auth/logout (ออกจากระบบ และบันทึก Token เข้า Blacklist)
router.post('/logout', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      tokenBlacklist.add(token);
    }

    const { sessionToken } = req.body || {};
    if (sessionToken && staffAccounts.signOut) {
      await unary<any>((cb) =>
        staffAccounts.signOut(
          { token: sessionToken },
          { deadline: Date.now() + DEADLINE_MS },
          cb
        )
      ).catch(() => {});
    }

    return res.status(200).json({
      success: true,
      message: 'Logout successful',
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Logout failed',
    });
  }
});

export default router;