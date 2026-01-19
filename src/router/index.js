import express from 'express'; // ✅ Import express first
import auth from './auth.js';
import yachtRouter from './yacht.js';
import blogRouter from './blog.js';
import tagsRouter from './tags.js';
import migrationRouter from './migration.js';
const router = express.Router(); // ✅ Use express.Router()
router.use('/auth', auth);
router.use('/yacht', yachtRouter);
router.use('/blog', blogRouter); 
router.use('/tags', tagsRouter);
router.use('/migrate', migrationRouter);
export default router;
