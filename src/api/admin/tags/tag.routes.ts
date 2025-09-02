import express from 'express';
import { 
    createTag, 
    getAllTags,
    updateTag, 
    deleteTag
} from './tag.controller.js';
import { verifyToken } from '../../../core/middleware/Auth.middleware.js';
import { requestValidator } from '../../../core/middleware/requestValidator.middleware.js';

const router = express.Router();

// Admin Tag Routes
// Create tag
router.post('/add-tag', verifyToken, requestValidator, createTag);

// Get all tags (with pagination and search)
router.get('/all-tags', getAllTags);

// Update tag
router.put('/edit-tag', verifyToken, requestValidator, updateTag);

// Delete tag
router.delete('/delete-tag', verifyToken, requestValidator, deleteTag);

export default router;
