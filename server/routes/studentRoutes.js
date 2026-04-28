const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/auth');
const studentController = require('../controllers/studentController');
const multer = require('multer');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

// Create the uploads directory if it doesn't exist
const fs = require('fs');
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

const upload = multer({ storage });

// Routes
router.post('/upload', protect, admin, upload.single('file'), studentController.uploadStudents);
router.get('/', protect, admin, studentController.getAllStudents);
router.get('/filter', protect, admin, studentController.getStudentsByFilter);
router.get('/:id', protect, admin, studentController.getStudentById);
router.post('/', protect, admin, studentController.createStudent);
router.put('/:id', protect, admin, studentController.updateStudent);
router.delete('/:id', protect, admin, studentController.deleteStudent);

module.exports = router;
