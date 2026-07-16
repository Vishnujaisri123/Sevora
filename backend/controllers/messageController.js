const Message = require('../models/Message');
const Ticket = require('../models/Ticket');
const Notification = require('../models/Notification');

// Get messages for a specific ticket (lazy loading)
exports.getMessages = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { limit = 50, before } = req.query;

    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Auth check
    if (req.user.role === 'employee' && ticket.employeeId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized access to this chat room' });
    }

    let query = { ticketId };
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await Message.find(query)
      .populate('senderId', 'username role avatar')
      .sort({ createdAt: -1 }) // Get newest first for pagination
      .limit(parseInt(limit));

    // Reverse to chronological order for client display
    messages.reverse();

    // Mark unread messages sent by others as read
    const unreadMessages = messages.filter(msg => 
      msg.senderId && 
      msg.senderId._id.toString() !== req.user.id && 
      !msg.readBy.some(read => read.userId.toString() === req.user.id)
    );

    if (unreadMessages.length > 0) {
      for (const msg of unreadMessages) {
        msg.readBy.push({ userId: req.user.id, readAt: new Date() });
        msg.status = 'read';
        await msg.save();
      }

      // Broadcast read receipt updates to room
      const io = req.app.get('io');
      if (io) {
        io.to(ticketId).emit('messages_read', {
          ticketId,
          userId: req.user.id,
          messageIds: unreadMessages.map(m => m._id)
        });
      }
    }

    return res.status(200).json(messages);
  } catch (err) {
    console.error('Get messages error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Send a text message
exports.sendMessage = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { content, replyTo } = req.body;

    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    if (req.user.role === 'employee' && ticket.employeeId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const message = new Message({
      ticketId,
      senderId: req.user.id,
      messageType: 'text',
      content,
      replyTo: replyTo || undefined,
      status: 'sent'
    });

    await message.save();

    const populatedMsg = await Message.findById(message._id)
      .populate('senderId', 'username role avatar')
      .populate('replyTo');

    // Notify recipient (Admin or assigned Employee)
    const recipientId = req.user.role === 'admin' ? ticket.employeeId : (ticket.adminId || null);
    if (recipientId) {
      const msgNotification = `${req.user.username} sent a message regarding client ${ticket.clientName1} & ${ticket.clientName2}: "${content.substring(0, 40)}${content.length > 40 ? '...' : ''}"`;
      
      const newNotif = new Notification({
        userId: recipientId,
        ticketId: ticket._id,
        type: 'message',
        message: msgNotification
      });
      await newNotif.save();

      const io = req.app.get('io');
      if (io) {
        io.to(recipientId.toString()).emit('notification_received', {
          message: msgNotification,
          ticketId: ticket._id,
          type: 'message'
        });
      }
    }

    // Broadcast message to Room
    const io = req.app.get('io');
    if (io) {
      io.to(ticketId).emit('message_received', populatedMsg);
    }

    return res.status(201).json(populatedMsg);
  } catch (err) {
    console.error('Send message error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Send a file message
exports.sendFileMessage = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { replyTo } = req.body;

    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    if (req.user.role === 'employee' && ticket.employeeId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const message = new Message({
      ticketId,
      senderId: req.user.id,
      messageType: 'file',
      content: `Sent attachment: ${req.file.originalname}`,
      fileUrl: `/uploads/${req.file.filename}`,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      replyTo: replyTo || undefined,
      status: 'sent'
    });

    await message.save();

    const populatedMsg = await Message.findById(message._id)
      .populate('senderId', 'username role avatar')
      .populate('replyTo');

    // Notify recipient
    const recipientId = req.user.role === 'admin' ? ticket.employeeId : (ticket.adminId || null);
    if (recipientId) {
      const msgNotification = `${req.user.username} sent a file attachment for client ${ticket.clientName1} & ${ticket.clientName2}`;
      
      const newNotif = new Notification({
        userId: recipientId,
        ticketId: ticket._id,
        type: 'message',
        message: msgNotification
      });
      await newNotif.save();

      const io = req.app.get('io');
      if (io) {
        io.to(recipientId.toString()).emit('notification_received', {
          message: msgNotification,
          ticketId: ticket._id,
          type: 'message'
        });
      }
    }

    // Broadcast to room
    const io = req.app.get('io');
    if (io) {
      io.to(ticketId).emit('message_received', populatedMsg);
    }

    return res.status(201).json(populatedMsg);
  } catch (err) {
    console.error('Send file message error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Edit message (Within 5 minutes of creation limit)
exports.editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    if (message.senderId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Cannot edit someone else\'s message' });
    }

    if (message.messageType === 'file') {
      return res.status(400).json({ message: 'Cannot edit file attachments' });
    }

    // Check time limit (5 minutes)
    const now = new Date();
    const createdTime = new Date(message.createdAt);
    const diffMinutes = (now - createdTime) / 1000 / 60;

    if (diffMinutes > 5) {
      return res.status(400).json({ message: 'Time limit of 5 minutes to edit this message has expired' });
    }

    message.content = content;
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();

    const populatedMsg = await Message.findById(messageId)
      .populate('senderId', 'username role avatar')
      .populate('replyTo');

    // Broadcast message update to Room
    const io = req.app.get('io');
    if (io) {
      io.to(message.ticketId.toString()).emit('message_updated', populatedMsg);
    }

    return res.status(200).json(populatedMsg);
  } catch (err) {
    console.error('Edit message error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Delete message
exports.deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Allow sender or Admin to delete message
    if (message.senderId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized to delete this message' });
    }

    message.content = 'This message was deleted';
    message.isDeleted = true;
    message.fileUrl = '';
    message.fileName = '';
    message.fileSize = undefined;
    await message.save();

    const populatedMsg = await Message.findById(messageId)
      .populate('senderId', 'username role avatar')
      .populate('replyTo');

    // Broadcast message update to Room
    const io = req.app.get('io');
    if (io) {
      io.to(message.ticketId.toString()).emit('message_updated', populatedMsg);
    }

    return res.status(200).json(populatedMsg);
  } catch (err) {
    console.error('Delete message error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
