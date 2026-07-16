const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ticketController = require('../controllers/ticketController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Create uploads directory if not exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

// File filter (Only allow PDFs for official ticket PDF uploads)
const pdfFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (file.mimetype === 'application/pdf' || ext === '.pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed for official ticket uploads'), false);
  }
};

const uploadPdf = multer({ 
  storage, 
  fileFilter: pdfFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Routes
router.post('/', authenticateToken, authorizeRoles('employee'), ticketController.createTicket);
router.get('/', authenticateToken, ticketController.getTickets);
router.get('/:id', authenticateToken, ticketController.getTicketDetails);
router.put('/:id', authenticateToken, ticketController.updateTicket);
router.post('/:id/confirm', authenticateToken, authorizeRoles('employee'), ticketController.confirmTicket);
router.post('/:id/send-to-admin', authenticateToken, authorizeRoles('employee'), ticketController.sendToAdmin);
router.put('/:id/status', authenticateToken, authorizeRoles('admin'), ticketController.updateStatus);
router.delete('/:id', authenticateToken, ticketController.deleteTicket);

// Admin-only PDF upload
router.post('/:id/upload-pdf', authenticateToken, authorizeRoles('admin'), uploadPdf.single('pdf'), ticketController.uploadPdf);

module.exports = router;
