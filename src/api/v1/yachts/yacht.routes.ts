import { Router } from 'express';
import { 
    createYacht, 
    getAllYachts, 
    getYachtById, 
    updateYacht, 
    deleteYacht,
    uploadYachtImages
} from './yacht.controller.js';
import { 
    validateCreateYacht, 
    validateUpdateYacht 
} from '../../../core/validators/yacht.validation.js';
import { authenticateToken } from '../../../core/middleware/Auth.middleware.js';
import { upload } from '../../../core/middleware/upload.middleware.js';

const router = Router();

// Public routes
router.get('/', getAllYachts);
router.get('/:id', getYachtById);

// Protected routes
router.post('/', authenticateToken, validateCreateYacht, createYacht);
router.put('/:id', authenticateToken, validateUpdateYacht, updateYacht);
router.delete('/:id', authenticateToken, deleteYacht);
router.post('/:id/images', authenticateToken, upload.array('images', 10), uploadYachtImages);

export default router;
