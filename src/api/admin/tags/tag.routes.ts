import express from 'express';
import { 
    createTag, 
    getAllTags,
    updateTag, 
    deleteTag
} from './tag.controller.js';
import { verifyToken } from '../../../core/middleware/Auth.middleware.js';

const router = express.Router();

// Admin Tag Routes
// Create tag
router.post('/add-tag', verifyToken, createTag);

// Get all tags (with pagination and search)
router.get('/view-tags', getAllTags);

// Update tag
router.put('/edit-tag', verifyToken, updateTag);

// Delete tag
router.delete('/delete-tag/:id', verifyToken, deleteTag);

export default router;
