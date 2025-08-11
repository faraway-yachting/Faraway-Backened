import express from 'express'; // ✅ Import express first
import auth from './auth.js';
import yachtRouter from './yacht.js';
import blogRouter from './blog.js';
const router = express.Router(); // ✅ Use express.Router()
router.use('/auth', auth);
router.use('/yacht', yachtRouter);
router.use('/blog', blogRouter); 
export default router;
