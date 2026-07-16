const Ticket = require('../models/Ticket');
const ActivityLog = require('../models/ActivityLog');
const Notification = require('../models/Notification');
const User = require('../models/User');
const Message = require('../models/Message');

// Helper to log activities
const logActivity = async (ticketId, userId, action, statusBefore, statusAfter, comment = '') => {
  const log = new ActivityLog({
    ticketId,
    userId,
    action,
    statusBefore,
    statusAfter,
    comment
  });
  await log.save();
  return log;
};

// Helper to create notifications
const createNotification = async (userId, ticketId, type, message) => {
  const notif = new Notification({
    userId,
    ticketId,
    type,
    message
  });
  await notif.save();
  return notif;
};

// Create a new ticket booking (Starts as Draft)
exports.createTicket = async (req, res) => {
  try {
    const {
      clientName1,
      clientName2,
      gothram,
      mobileNumber,
      bookersDate,
      bookedDate,
      timeSlot
    } = req.body;

    if (!clientName1 || !clientName2 || !bookersDate || !bookedDate || !timeSlot) {
      return res.status(400).json({ message: 'Missing required client fields' });
    }

    // Find the highest serialNumber
    const lastTicket = await Ticket.findOne().sort({ serialNumber: -1 });
    const nextSerialNumber = lastTicket && lastTicket.serialNumber ? lastTicket.serialNumber + 1 : 1;

    const ticket = new Ticket({
      serialNumber: nextSerialNumber,
      clientName1,
      clientName2,
      gothram,
      mobileNumber: mobileNumber || '',
      bookersDate,
      bookedDate,
      timeSlot,
      status: 'Draft',
      paymentStatus: 'Draft',
      employeeId: req.user.id
    });

    await ticket.save();
    await logActivity(ticket._id, req.user.id, 'Ticket Created as Draft', '', 'Draft');

    return res.status(201).json(ticket);
  } catch (err) {
    console.error('Create ticket error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Get list of tickets (with filtering and search)
exports.getTickets = async (req, res) => {
  try {
    const { status, paymentStatus, search } = req.query;
    let query = {};

    // Role restrictions: Employees only see their own tickets. Admins see all.
    if (req.user.role === 'employee') {
      query.employeeId = req.user.id;
    }

    // Apply status filter
    if (status && status !== 'All') {
      query.status = status;
    }

    // Apply payment filter
    if (paymentStatus && paymentStatus !== 'All') {
      query.paymentStatus = paymentStatus;
    }

    // Apply text search on clientName or mobileNumber
    if (search) {
      query.$or = [
        { clientName1: { $regex: search, $options: 'i' } },
        { clientName2: { $regex: search, $options: 'i' } },
        { mobileNumber: { $regex: search, $options: 'i' } }
      ];
    }

    const tickets = await Ticket.find(query)
      .populate('employeeId', 'username email avatar')
      .populate('adminId', 'username email avatar')
      .sort({ updatedAt: -1 });

    return res.status(200).json(tickets);
  } catch (err) {
    console.error('Get tickets error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Get single ticket details
exports.getTicketDetails = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate('employeeId', 'username email avatar')
      .populate('adminId', 'username email avatar')
      .populate('pdfHistory.uploadedBy', 'username role');

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Authorization check
    if (req.user.role === 'employee' && ticket.employeeId._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized access to this ticket' });
    }

    // Get activity timeline logs
    const activityLogs = await ActivityLog.find({ ticketId: ticket._id })
      .populate('userId', 'username role')
      .sort({ createdAt: 1 });

    return res.status(200).json({
      ticket,
      timeline: activityLogs
    });
  } catch (err) {
    console.error('Get ticket details error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Update ticket details (Allowed only in Draft status)
exports.updateTicket = async (req, res) => {
  try {
    const {
      clientName1,
      clientName2,
      gothram,
      mobileNumber,
      bookersDate,
      bookedDate,
      timeSlot,
      paymentStatus
    } = req.body;

    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Employee check: only owner can edit
    if (req.user.role === 'employee' && ticket.employeeId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    // Editing constraints: Only editable in Draft mode (unless it's an admin overriding)
    // Employees are allowed to update paymentStatus even after confirmation/sending, but cannot edit other fields.
    const hasOtherFields = clientName1 !== undefined || clientName2 !== undefined || gothram !== undefined || mobileNumber !== undefined || bookersDate !== undefined || bookedDate !== undefined || timeSlot !== undefined;
    if (req.user.role === 'employee' && ticket.status !== 'Draft' && hasOtherFields) {
      return res.status(400).json({ message: 'Cannot edit ticket details once it is out of Draft status' });
    }

    // Update details
    ticket.clientName1 = clientName1 !== undefined ? clientName1 : ticket.clientName1;
    ticket.clientName2 = clientName2 !== undefined ? clientName2 : ticket.clientName2;
    ticket.gothram = gothram !== undefined ? gothram : ticket.gothram;
    ticket.mobileNumber = mobileNumber !== undefined ? mobileNumber : ticket.mobileNumber;
    ticket.bookersDate = bookersDate !== undefined ? bookersDate : ticket.bookersDate;
    ticket.bookedDate = bookedDate !== undefined ? bookedDate : ticket.bookedDate;
    ticket.timeSlot = timeSlot !== undefined ? timeSlot : ticket.timeSlot;

    // Admin or employee can change payment status
    if (paymentStatus && paymentStatus !== ticket.paymentStatus) {
      ticket.paymentStatus = paymentStatus;
      
      const chatMessage = new Message({
        ticketId: ticket._id,
        senderId: req.user.id,
        messageType: 'text',
        content: `📢 Payment Status updated to "${paymentStatus}"`,
        status: 'sent'
      });
      await chatMessage.save();

      const populatedMsg = await Message.findById(chatMessage._id)
        .populate('senderId', 'username role avatar');

      const io = req.app.get('io');
      if (io) {
        io.to(ticket._id.toString()).emit('message_received', populatedMsg);
      }
    }

    await ticket.save();
    await logActivity(ticket._id, req.user.id, 'Ticket Details Updated', ticket.status, ticket.status);

    return res.status(200).json(ticket);
  } catch (err) {
    console.error('Update ticket error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Confirm ticket (Draft -> Confirmed)
exports.confirmTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    if (ticket.employeeId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    if (ticket.status !== 'Draft') {
      return res.status(400).json({ message: 'Ticket is already confirmed or processed' });
    }

    const previousStatus = ticket.status;
    ticket.status = 'Confirmed';
    ticket.paymentStatus = 'Pending'; // Confirmed bookings require payment updates
    await ticket.save();

    await logActivity(ticket._id, req.user.id, 'Confirmed Ticket Details', previousStatus, 'Confirmed');

    return res.status(200).json(ticket);
  } catch (err) {
    console.error('Confirm ticket error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Send to Admin (Confirmed -> Waiting for Admin)
exports.sendToAdmin = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    if (ticket.employeeId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    if (ticket.status !== 'Confirmed') {
      return res.status(400).json({ message: 'Ticket must be Confirmed before sending to Admin' });
    }

    const previousStatus = ticket.status;
    ticket.status = 'Waiting for Admin';
    await ticket.save();

    await logActivity(ticket._id, req.user.id, 'Submitted Ticket to Admin', previousStatus, 'Waiting for Admin');

    // Notify all admins
    const admins = await User.find({ role: 'admin' });
    const notificationMessage = `New booking request by the client: ${ticket.clientName1}
employee Name : ${req.user.username}
client Names : ${ticket.clientName1} & ${ticket.clientName2}
ticket Number : #${ticket.serialNumber}`;
    
    for (const admin of admins) {
      await createNotification(admin._id, ticket._id, 'ticket_assignment', notificationMessage);
    }

    // Trigger socket broadcast to admins
    const io = req.app.get('io');
    if (io) {
      io.to('admins').emit('new_ticket_submitted', {
        ticketId: ticket._id,
        serialNumber: ticket.serialNumber,
        clientName: `${ticket.clientName1} & ${ticket.clientName2}`,
        clientName1: ticket.clientName1,
        templeName: ticket.templeName,
        status: ticket.status,
        submittedBy: req.user.username
      });
      // Send notification alerts to admins
      admins.forEach(admin => {
        io.to(admin._id.toString()).emit('notification_received', {
          message: notificationMessage,
          ticketId: ticket._id,
          type: 'ticket_assignment'
        });
      });
    }

    return res.status(200).json(ticket);
  } catch (err) {
    console.error('Send to admin error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Admin updates ticket status and optionally assigns adminId
exports.updateStatus = async (req, res) => {
  try {
    const { status, paymentStatus, comment } = req.body;
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    const previousStatus = ticket.status;
    
    if (status) {
      ticket.status = status;
    }

    if (paymentStatus) {
      ticket.paymentStatus = paymentStatus;
    }

    // Auto assign current admin if not assigned
    if (req.user.role === 'admin' && !ticket.adminId) {
      ticket.adminId = req.user.id;
    }

    await ticket.save();
    await logActivity(ticket._id, req.user.id, `Status updated by Admin`, previousStatus, ticket.status, comment || '');

    // Notify the employee
    const employeeNotification = `Ticket status for ${ticket.clientName1} & ${ticket.clientName2} has been updated to "${ticket.status}" by Admin.`;
    await createNotification(ticket.employeeId, ticket._id, 'status_change', employeeNotification);

    // Trigger socket broadcast
    const io = req.app.get('io');
    if (io) {
      // Room for this ticket
      io.to(ticket._id.toString()).emit('ticket_status_updated', {
        ticketId: ticket._id,
        status: ticket.status,
        paymentStatus: ticket.paymentStatus,
        updatedBy: req.user.username,
        comment: comment || ''
      });

      // Direct notification to employee
      io.to(ticket.employeeId.toString()).emit('notification_received', {
        message: employeeNotification,
        ticketId: ticket._id,
        type: 'status_change'
      });
    }

    return res.status(200).json(ticket);
  } catch (err) {
    console.error('Update status error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Admin uploads ticket PDF
exports.uploadPdf = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const previousStatus = ticket.status;
    const versionNumber = ticket.pdfHistory.length + 1;

    const newPdf = {
      pdfPath: `/uploads/${req.file.filename}`,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      uploadedBy: req.user.id,
      uploadedAt: new Date(),
      version: versionNumber
    };

    ticket.pdfHistory.push(newPdf);
    ticket.status = 'PDF Uploaded'; // Transition state
    ticket.adminId = req.user.id; // Assign to processing admin
    await ticket.save();

    await logActivity(ticket._id, req.user.id, `Uploaded Ticket PDF (v${versionNumber})`, previousStatus, 'PDF Uploaded', `File: ${req.file.originalname}`);

    // Notify employee
    const employeeNotification = `Official ticket PDF uploaded for ${ticket.clientName1} & ${ticket.clientName2} - v${versionNumber}`;
    await createNotification(ticket.employeeId, ticket._id, 'pdf_upload', employeeNotification);

    // Automatically create and save the message in the chat database
    const fileMessage = new Message({
      ticketId: ticket._id,
      senderId: req.user.id,
      messageType: 'file',
      content: `Official Ticket PDF Uploaded (v${versionNumber}): ${req.file.originalname}`,
      fileUrl: `/uploads/${req.file.filename}`,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      status: 'sent'
    });
    await fileMessage.save();

    const populatedMsg = await Message.findById(fileMessage._id)
      .populate('senderId', 'username role avatar');

    // Emit event on sockets
    const io = req.app.get('io');
    if (io) {
      // Broadcast to room
      io.to(ticket._id.toString()).emit('ticket_pdf_uploaded', {
        ticketId: ticket._id,
        pdf: newPdf,
        status: ticket.status,
        uploadedBy: req.user.username
      });

      // Broadcast message in chat room
      io.to(ticket._id.toString()).emit('message_received', populatedMsg);

      // Send alert to employee
      io.to(ticket.employeeId.toString()).emit('notification_received', {
        message: employeeNotification,
        ticketId: ticket._id,
        type: 'pdf_upload'
      });
    }

    return res.status(200).json({
      message: 'PDF uploaded successfully',
      ticket
    });
  } catch (err) {
    console.error('PDF upload error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Delete ticket (Only in Draft status for employees, allowed for admins)
exports.deleteTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Role permission check
    if (req.user.role === 'employee') {
      if (ticket.employeeId.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Unauthorized' });
      }
      if (ticket.status !== 'Draft' && ticket.status !== 'Completed' && ticket.status !== 'Cancelled' && ticket.status !== 'Rejected') {
        return res.status(400).json({ message: 'Only Draft, Completed, Cancelled, or Rejected tickets can be deleted' });
      }
    }

    const clientNames = `${ticket.clientName1} & ${ticket.clientName2}`;

    await Ticket.findByIdAndDelete(req.params.id);
    
    // Clear associated activity logs and notifications
    await ActivityLog.deleteMany({ ticketId: req.params.id });
    await Notification.deleteMany({ ticketId: req.params.id });

    // Emit socket event to notify other clients
    const io = req.app.get('socketio');
    if (io) {
      io.emit('ticket_deleted', {
        ticketId: req.params.id,
        clientNames,
        message: `Booking for ${clientNames} has been deleted`
      });
    }

    return res.status(200).json({ message: 'Ticket deleted successfully' });
  } catch (err) {
    console.error('Delete ticket error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
