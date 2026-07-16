const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');

// Track socket connections in memory
const connectedUsers = new Map(); // userId -> Set of socketIds

module.exports = (io) => {
  // Middleware to authenticate socket connections
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      if (!token) {
        return next(new Error('Authentication error: Token missing'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'templeSecretKeyKey123456789!');
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      socket.user = user;
      next();
    } catch (err) {
      console.error('Socket auth error:', err);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.user._id.toString();
    const username = socket.user.username;
    const role = socket.user.role;

    console.log(`User connected: ${username} (${role}), Socket ID: ${socket.id}`);

    // Track user's sockets
    if (!connectedUsers.has(userId)) {
      connectedUsers.set(userId, new Set());
    }
    connectedUsers.get(userId).add(socket.id);

    // Join personal user room to receive targeted alerts/notifications
    socket.join(userId);

    // Join admin-wide room if role is admin
    if (role === 'admin') {
      socket.join('admins');
    }

    // Set online status in database & broadcast
    try {
      const user = await User.findById(userId);
      if (user) {
        user.status = 'online';
        user.lastSeen = new Date();
        await user.save();
        
        io.emit('user_status_changed', {
          userId,
          status: 'online',
          username
        });
      }
    } catch (err) {
      console.error('Error setting user online status:', err);
    }

    // Event: User joins a specific ticket chat room
    socket.on('join_ticket', async ({ ticketId }) => {
      if (!ticketId) return;

      socket.join(ticketId);
      socket.currentTicketId = ticketId;
      console.log(`Socket ${socket.id} (${username}) joined ticket chat: ${ticketId}`);

      // Mark all messages in this ticket not sent by this user as read
      try {
        const result = await Message.updateMany(
          { 
            ticketId, 
            senderId: { $ne: userId }, 
            'readBy.userId': { $ne: userId } 
          },
          { 
            $push: { readBy: { userId, readAt: new Date() } },
            $set: { status: 'read' }
          }
        );

        if (result.modifiedCount > 0) {
          // Find the modified messages to send update
          const readMessages = await Message.find({ ticketId, senderId: { $ne: userId } });
          const messageIds = readMessages.map(m => m._id);

          // Emit read status update to the room
          io.to(ticketId).emit('messages_read', {
            ticketId,
            userId,
            messageIds
          });
        }
      } catch (err) {
        console.error('Error marking messages as read on join:', err);
      }
    });

    // Event: User leaves a specific ticket chat room
    socket.on('leave_ticket', ({ ticketId }) => {
      if (!ticketId) return;
      socket.leave(ticketId);
      socket.currentTicketId = null;
      console.log(`Socket ${socket.id} (${username}) left ticket chat: ${ticketId}`);
    });

    // Event: User starts/stops typing in a ticket chat room
    socket.on('typing', ({ ticketId, isTyping }) => {
      if (!ticketId) return;
      
      socket.to(ticketId).emit('user_typing', {
        ticketId,
        userId,
        username,
        isTyping
      });
    });

    // Event: Message sent check helper (real-time receipt update checks)
    // When a message is sent via HTTP, this helper assists in checking recipient online status
    socket.on('message_sent', async ({ messageId, ticketId, recipientId }) => {
      try {
        const message = await Message.findById(messageId);
        if (!message) return;

        // Check if recipient has a socket in the ticket room currently
        const recipientSockets = connectedUsers.get(recipientId.toString());
        let isRecipientInRoom = false;

        if (recipientSockets) {
          // Check if any socket of the recipient is in the ticketId room
          for (const sId of recipientSockets) {
            const clientSocket = io.sockets.sockets.get(sId);
            if (clientSocket && clientSocket.currentTicketId === ticketId.toString()) {
              isRecipientInRoom = true;
              break;
            }
          }
        }

        if (isRecipientInRoom) {
          // Recipient is actively viewing the room: status -> read
          message.status = 'read';
          message.readBy.push({ userId: recipientId, readAt: new Date() });
          await message.save();
          
          io.to(ticketId).emit('message_status_updated', {
            messageId: message._id,
            status: 'read',
            ticketId
          });
        } else if (connectedUsers.has(recipientId.toString()) && connectedUsers.get(recipientId.toString()).size > 0) {
          // Recipient is online but not viewing the room: status -> delivered
          message.status = 'delivered';
          await message.save();

          io.to(ticketId).emit('message_status_updated', {
            messageId: message._id,
            status: 'delivered',
            ticketId
          });
        } else {
          // Recipient is offline: status remains sent (single tick)
          // No DB change needed as default is 'sent'
        }
      } catch (err) {
        console.error('Error evaluating message receipt ticks:', err);
      }
    });

    // Event: Disconnection
    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${username}, Socket ID: ${socket.id}`);
      
      const userSockets = connectedUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          connectedUsers.delete(userId);

          // Update status to offline in database
          try {
            const user = await User.findById(userId);
            if (user) {
              user.status = 'offline';
              user.lastSeen = new Date();
              await user.save();
              
              // Broadcast user offline status
              io.emit('user_status_changed', {
                userId,
                status: 'offline',
                lastSeen: user.lastSeen,
                username
              });
            }
          } catch (err) {
            console.error('Error setting user offline status on disconnect:', err);
          }
        }
      }
    });
  });
};
