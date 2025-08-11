import multer from 'multer';
import path from 'path';
import os from 'os';
import fs from 'fs';

const tempRoot = path.join(os.tmpdir(), 'uploads', 'Faraway');
console.log('📂 Temp root directory:', tempRoot);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    console.log('📁 Processing file:', file.fieldname, file.originalname);
    let subfolder = '';
    
    // Handle yacht images
    if (file.fieldname === 'primaryImage') {
      subfolder = path.join('yachts', 'primaryImage');
    } else if (file.fieldname === 'galleryImages' || file.fieldname === 'galleryImages[]') {
      subfolder = path.join('yachts', 'galleryImages');
    } 
    // Handle blog images
    else if (file.fieldname === 'image') {
      subfolder = path.join('blogs', 'images');
    } else {
      console.log('❌ Unexpected field name:', file.fieldname);
      return cb(new Error('Unexpected upload field: ' + file.fieldname), null);
    }
    
    const dest = path.join(tempRoot, subfolder);
    console.log('📂 Creating directory:', dest);
    fs.mkdirSync(dest, { recursive: true }); // Ensure the folder exists
    console.log('✅ Directory created/verified:', dest);
    cb(null, dest);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    // Remove brackets from fieldname for filename
    const cleanFieldName = file.fieldname.replace(/[\[\]]/g, '');
    // Add unique identifier to prevent filename collisions
    const uniqueId = Math.random().toString(36).substring(2, 15);
    const finalName = Date.now() + '-' + cleanFieldName + '-' + uniqueId + ext;
    
    console.log('📝 Generated filename:', finalName);
    console.log('📁 Temp root directory:', tempRoot);
    cb(null, finalName);
  },
});

const fileFilter = (req, file, cb) => {
  const field = file.fieldname;

  // Accept yacht image fields
  if (field === 'primaryImage' || field === 'galleryImages' || field === 'galleryImages[]') {
    cb(null, true);
  } 
  // Accept blog image field
  else if (field === 'image') {
    cb(null, true);
  } else {
    cb(new Error(`Unexpected upload field: ${field}`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
});

export default upload;