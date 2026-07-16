const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const messageController = require('../controllers/messageController');
const { authenticateToken } = require('../middleware/auth');

// Create uploads directory if not exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const uploadMsgFile = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 } // 15MB limit
});

// Routes
router.get('/:ticketId', authenticateToken, messageController.getMessages);
router.post('/:ticketId', authenticateToken, messageController.sendMessage);
router.post('/:ticketId/file', authenticateToken, uploadMsgFile.single('file'), messageController.sendFileMessage);
router.put('/:messageId', authenticateToken, messageController.editMessage);
router.delete('/:messageId', authenticateToken, messageController.deleteMessage);

module.exports = router;
