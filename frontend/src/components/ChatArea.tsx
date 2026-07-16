import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { 
  Send, Paperclip, X, Download, CornerUpLeft, Edit3, Trash2, 
  Smile, AlertTriangle, ArrowLeft, MoreVertical, File, Check, CheckCheck 
} from 'lucide-react';

interface Message {
  _id: string;
  ticketId: string;
  senderId: {
    _id: string;
    username: string;
    role: string;
    avatar?: string;
  };
  messageType: 'text' | 'file';
  content: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  status: 'sent' | 'delivered' | 'read';
  readBy: { userId: string; readAt: string }[];
  replyTo?: Message | null;
  isEdited?: boolean;
  editedAt?: string;
  isDeleted?: boolean;
  createdAt: string;
}

interface ChatAreaProps {
  ticketId: string;
  recipientId: string;
  recipientName: string;
  recipientRole: 'admin' | 'employee';
  onClose?: () => void;
  ticketStatus: string;
}

const ChatArea: React.FC<ChatAreaProps> = ({
  ticketId,
  recipientId,
  recipientName,
  recipientRole,
  onClose,
  ticketStatus
}) => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [replyMessage, setReplyMessage] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [recipientTyping, setRecipientTyping] = useState(false);
  const [recipientOnlineStatus, setRecipientOnlineStatus] = useState<string>('offline');
  const [recipientLastSeen, setRecipientLastSeen] = useState<string>('');
  
  // Drag and drop / file states
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Pagination states
  const [hasMore, setHasMore] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatBodyRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<any | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch initial messages and set up socket rooms
  useEffect(() => {
    setMessages([]);
    setHasMore(true);
    setReplyMessage(null);
    setEditingMessage(null);
    setRecipientTyping(false);

    const fetchMessages = async () => {
      try {
        const res = await axios.get(`/api/messages/${ticketId}?limit=50`);
        setMessages(res.data);
        if (res.data.length < 50) {
          setHasMore(false);
        }
        setTimeout(scrollToBottom, 50);
      } catch (err) {
        console.error('Error fetching messages:', err);
      }
    };

    const fetchRecipientStatus = async () => {
      try {
        const res = await axios.get('/api/auth/users');
        const target = res.data.find((u: any) => u._id === recipientId);
        if (target) {
          setRecipientOnlineStatus(target.status);
          setRecipientLastSeen(target.lastSeen);
        }
      } catch (e) {
        console.error(e);
      }
    };

    fetchMessages();
    fetchRecipientStatus();

    if (socket) {
      socket.emit('join_ticket', { ticketId });

      socket.on('message_received', (newMsg: Message) => {
        if (newMsg.ticketId === ticketId) {
          setMessages(prev => {
            // Avoid duplicate appends
            if (prev.some(m => m._id === newMsg._id)) return prev;
            return [...prev, newMsg];
          });
          setTimeout(scrollToBottom, 50);

          // Tell the socket server we've read it (triggers read receipt ticks)
          if (user && newMsg.senderId && newMsg.senderId._id !== user.id) {
            socket.emit('join_ticket', { ticketId }); // Triggers read update
          }
        }
      });

      socket.on('message_updated', (updatedMsg: Message) => {
        setMessages(prev => prev.map(m => m._id === updatedMsg._id ? updatedMsg : m));
      });

      socket.on('messages_read', ({ ticketId: tId, messageIds }: any) => {
        if (tId === ticketId) {
          setMessages(prev => prev.map(m => {
            if (messageIds.includes(m._id)) {
              return { ...m, status: 'read' };
            }
            return m;
          }));
        }
      });

      socket.on('message_status_updated', ({ messageId, status }: any) => {
        setMessages(prev => prev.map(m => m._id === messageId ? { ...m, status } : m));
      });

      socket.on('user_typing', ({ ticketId: tId, userId, isTyping: typing }: any) => {
        if (tId === ticketId && userId === recipientId) {
          setRecipientTyping(typing);
        }
      });

      socket.on('user_status_changed', ({ userId, status, lastSeen }: any) => {
        if (userId === recipientId) {
          setRecipientOnlineStatus(status);
          if (lastSeen) {
            setRecipientLastSeen(lastSeen);
          }
        }
      });
    }

    return () => {
      if (socket) {
        socket.emit('leave_ticket', { ticketId });
        socket.off('message_received');
        socket.off('message_updated');
        socket.off('messages_read');
        socket.off('message_status_updated');
        socket.off('user_typing');
        socket.off('user_status_changed');
      }
    };
  }, [ticketId, socket, recipientId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Scroll to load older messages
  const handleScroll = async () => {
    if (!chatBodyRef.current || loadingOlder || !hasMore) return;

    const { scrollTop } = chatBodyRef.current;
    if (scrollTop === 0 && messages.length > 0) {
      setLoadingOlder(true);
      const oldestMessageTimestamp = messages[0].createdAt;
      
      try {
        const res = await axios.get(`/api/messages/${ticketId}?limit=50&before=${oldestMessageTimestamp}`);
        if (res.data.length < 50) {
          setHasMore(false);
        }
        
        // Record scroll height before prepending
        const oldScrollHeight = chatBodyRef.current.scrollHeight;
        
        setMessages(prev => [...res.data, ...prev]);
        
        // Restore scroll position
        setTimeout(() => {
          if (chatBodyRef.current) {
            chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight - oldScrollHeight;
          }
        }, 10);
      } catch (err) {
        console.error('Error loading older messages:', err);
      } finally {
        setLoadingOlder(false);
      }
    }
  };

  // Typing emitter
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);

    if (socket && !isTyping) {
      setIsTyping(true);
      socket.emit('typing', { ticketId, isTyping: true });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      if (socket && isTyping) {
        setIsTyping(false);
        socket.emit('typing', { ticketId, isTyping: false });
      }
    }, 2000);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !user) return;

    const payloadText = text;
    setText('');
    
    if (socket && isTyping) {
      setIsTyping(false);
      socket.emit('typing', { ticketId, isTyping: false });
    }

    try {
      if (editingMessage) {
        // Edit message
        await axios.put(`/api/messages/${editingMessage._id}`, { content: payloadText });
        setEditingMessage(null);
      } else {
        // Send message
        const res = await axios.post(`/api/messages/${ticketId}`, {
          content: payloadText,
          replyTo: replyMessage ? replyMessage._id : undefined
        });
        setReplyMessage(null);
        
        // Check online status immediately
        if (socket) {
          socket.emit('message_sent', {
            messageId: res.data._id,
            ticketId,
            recipientId
          });
        }
      }
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  // File uploading handler
  const handleFileUpload = async (file: File) => {
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    if (replyMessage) {
      formData.append('replyTo', replyMessage._id);
    }

    try {
      const res = await axios.post(`/api/messages/${ticketId}/file`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setReplyMessage(null);
      if (socket) {
        socket.emit('message_sent', {
          messageId: res.data._id,
          ticketId,
          recipientId
        });
      }
    } catch (err) {
      console.error('File upload failed:', err);
      alert('File upload failed. Ensure size limits are met.');
    } finally {
      setUploading(false);
    }
  };

  const selectFile = () => {
    fileInputRef.current?.click();
  };

  // Drag and drop files events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const triggerDelete = async (msgId: string) => {
    if (!window.confirm('Are you sure you want to delete this message?')) return;
    try {
      await axios.delete(`/api/messages/${msgId}`);
    } catch (err) {
      console.error('Delete message error:', err);
    }
  };

  const startEdit = (msg: Message) => {
    setEditingMessage(msg);
    setText(msg.content);
    setReplyMessage(null);
    setActiveMenuId(null);
  };

  // Group messages by Date (e.g. TODAY, YESTERDAY, July 15)
  const groupMessagesByDate = (msgList: Message[]) => {
    const groups: { [key: string]: Message[] } = {};
    msgList.forEach(m => {
      const date = new Date(m.createdAt);
      const dateString = date.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);
      
      let groupName = dateString;
      if (date.toDateString() === today.toDateString()) {
        groupName = 'TODAY';
      } else if (date.toDateString() === yesterday.toDateString()) {
        groupName = 'YESTERDAY';
      }
      
      if (!groups[groupName]) {
        groups[groupName] = [];
      }
      groups[groupName].push(m);
    });
    return groups;
  };

  const grouped = groupMessagesByDate(messages);

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatLastSeen = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return 'last seen ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch (e) {
      return '';
    }
  };

  return (
    <div 
      style={styles.chatArea} 
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
    >
      {/* File Drag and Drop Overlay */}
      {dragActive && (
        <div style={styles.dragOverlay}>
          <div style={styles.dragContent}>
            <Paperclip size={48} style={{ color: 'var(--accent-color)', marginBottom: '16px' }} />
            <h2 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Drop Files Here</h2>
            <p style={{ color: 'var(--text-secondary)' }}>Send image, document or PDF to {recipientName}</p>
          </div>
        </div>
      )}

      {/* Chat Area Header */}
      <div style={styles.chatHeader}>
        <div style={styles.headerLeft}>
          {onClose && (
            <button onClick={onClose} style={styles.backBtn} title="Back">
              <ArrowLeft size={20} />
            </button>
          )}
          <div style={styles.avatar}>
            <span style={{ fontSize: '18px' }}>
              {recipientRole === 'admin' ? '🛡️' : '🧑'}
            </span>
          </div>
          <div style={styles.recipientMeta}>
            <h4 style={styles.recipientName}>{recipientName}</h4>
            <span style={styles.onlineText}>
              {recipientTyping ? (
                <span style={{ color: 'var(--accent-hover)', fontWeight: '600' }}>typing...</span>
              ) : (
                recipientOnlineStatus === 'online' ? (
                  <span style={{ color: '#00e676', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={styles.onlineDot} /> online
                  </span>
                ) : (
                  formatLastSeen(recipientLastSeen)
                )
              )}
            </span>
          </div>
        </div>
        <div style={styles.headerRight}>
          <button style={styles.headerIconBtn}><MoreVertical size={20} /></button>
        </div>
      </div>

      {/* Chat Body Container */}
      <div 
        ref={chatBodyRef}
        onScroll={handleScroll}
        style={styles.chatBody}
      >
        {loadingOlder && (
          <div style={{ textAlign: 'center', padding: '10px', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
            Loading older messages...
          </div>
        )}

        {messages.length === 0 ? (
          <div style={styles.emptyChat}>
            <div style={styles.infoBadge}>
              🛡️ Dedicated Chat Room for Ticket Booking
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '12px', textAlign: 'center' }}>
              All conversations here are encrypted and archived for auditing.<br />
              Start typing below to communicate.
            </p>
          </div>
        ) : (
          Object.keys(grouped).map(groupName => (
            <div key={groupName}>
              <div style={styles.dateSeparator}>
                <span style={styles.dateBadge}>{groupName}</span>
              </div>
              
              {grouped[groupName].map((msg) => {
                const isSelf = user && msg.senderId && msg.senderId._id === user.id;
                const canEdit = isSelf && msg.messageType === 'text' && !msg.isDeleted && 
                  ((new Date().getTime() - new Date(msg.createdAt).getTime()) / 1000 / 60 < 5);
                const canDelete = !msg.isDeleted && (isSelf || user?.role === 'admin');

                return (
                  <div 
                    key={msg._id}
                    onMouseEnter={() => setHoveredMessageId(msg._id)}
                    onMouseLeave={() => {
                      setHoveredMessageId(null);
                      setActiveMenuId(null);
                    }}
                    style={{
                      ...styles.messageRow,
                      justifyContent: isSelf ? 'flex-end' : 'flex-start'
                    }}
                  >
                    {/* Message Bubble wrapper */}
                    <div 
                      style={{
                        ...styles.bubble,
                        backgroundColor: isSelf ? 'var(--bubble-outgoing)' : 'var(--bubble-incoming)',
                        color: isSelf ? 'var(--bubble-outgoing-text)' : 'var(--bubble-incoming-text)',
                        borderRadius: isSelf ? '12px 0 12px 12px' : '0 12px 12px 12px'
                      }}
                    >
                      {/* Reply-to original message display header inside bubble */}
                      {msg.replyTo && !msg.isDeleted && (
                        <div style={styles.replyPreviewHeader}>
                          <div style={styles.replyBar} />
                          <div style={styles.replyHeaderContent}>
                            <span style={styles.replySender}>
                              {msg.replyTo.senderId?._id === user?.id ? 'You' : msg.replyTo.senderId?.username}
                            </span>
                            <span style={styles.replyText}>
                              {msg.replyTo.messageType === 'file' ? '📁 Attachment' : msg.replyTo.content}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* File Card content */}
                      {msg.messageType === 'file' && !msg.isDeleted && (
                        <div style={styles.fileCard}>
                          <div style={styles.fileCardIcon}>
                            <File size={28} style={{ color: '#53bdeb' }} />
                          </div>
                          <div style={styles.fileCardMeta}>
                            <span style={styles.fileCardName}>{msg.fileName}</span>
                            <span style={styles.fileCardSize}>{formatFileSize(msg.fileSize)}</span>
                          </div>
                          {msg.fileUrl && (
                            <a 
                              href={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${msg.fileUrl}`} 
                              download={msg.fileName}
                              target="_blank"
                              rel="noreferrer"
                              style={styles.fileDownloadBtn}
                              title="Download File"
                            >
                              <Download size={18} />
                            </a>
                          )}
                        </div>
                      )}

                      {/* Normal text or Deleted text content */}
                      <p style={{
                        ...styles.bubbleText,
                        color: msg.isDeleted ? 'var(--text-muted)' : 'inherit',
                        fontStyle: msg.isDeleted ? 'italic' : 'normal'
                      }}>
                        {msg.content}
                      </p>

                      {/* Time stamp & ticks receipts status footer */}
                      <div style={styles.bubbleFooter}>
                        {msg.isEdited && !msg.isDeleted && <span style={styles.editedText}>edited</span>}
                        <span style={styles.bubbleTime}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isSelf && !msg.isDeleted && (
                          <span className={`tick-icon ${msg.status}`}>
                            {msg.status === 'sent' && <Check size={14} />}
                            {(msg.status === 'delivered' || msg.status === 'read') && <CheckCheck size={14} />}
                          </span>
                        )}
                      </div>

                      {/* Hover action menu triggers */}
                      {hoveredMessageId === msg._id && !msg.isDeleted && (
                        <div style={isSelf ? styles.actionMenuLeft : styles.actionMenuRight}>
                          <button 
                            onClick={() => setActiveMenuId(activeMenuId === msg._id ? null : msg._id)} 
                            style={styles.menuTriggerBtn}
                          >
                            <MoreVertical size={14} />
                          </button>
                          
                          {activeMenuId === msg._id && (
                            <div style={styles.dropdownMenu} className="glass-panel">
                              <button onClick={() => { setReplyMessage(msg); setActiveMenuId(null); }} style={styles.dropdownItem}>
                                <CornerUpLeft size={12} /> Reply
                              </button>
                              {canEdit && (
                                <button onClick={() => startEdit(msg)} style={styles.dropdownItem}>
                                  <Edit3 size={12} /> Edit
                                </button>
                              )}
                              {canDelete && (
                                <button onClick={() => triggerDelete(msg._id)} style={{ ...styles.dropdownItem, color: '#f87171' }}>
                                  <Trash2 size={12} /> Delete
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply Preview Footer above input */}
      {replyMessage && (
        <div style={styles.replyPreviewBar}>
          <div style={styles.replyPreviewBarLeft}>
            <CornerUpLeft size={16} style={{ color: 'var(--accent-color)', marginRight: '8px' }} />
            <div style={styles.replyPreviewTextContainer}>
              <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--accent-color)' }}>
                Replying to {replyMessage.senderId?._id === user?.id ? 'yourself' : (replyMessage.senderId?.username || 'Unknown User')}
              </span>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '300px' }}>
                {replyMessage.messageType === 'file' ? '📁 Attachment' : replyMessage.content}
              </p>
            </div>
          </div>
          <button onClick={() => setReplyMessage(null)} style={styles.replyPreviewCloseBtn}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Edit Preview Footer above input */}
      {editingMessage && (
        <div style={{ ...styles.replyPreviewBar, borderLeft: '4px solid #34b7f1' }}>
          <div style={styles.replyPreviewBarLeft}>
            <Edit3 size={16} style={{ color: '#34b7f1', marginRight: '8px' }} />
            <div style={styles.replyPreviewTextContainer}>
              <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#34b7f1' }}>
                Editing Message (Time remaining: {Math.max(0, Math.ceil(5 - (new Date().getTime() - new Date(editingMessage.createdAt).getTime()) / 1000 / 60))} mins)
              </span>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
                Press ESC to cancel edit mode.
              </p>
            </div>
          </div>
          <button onClick={() => { setEditingMessage(null); setText(''); }} style={styles.replyPreviewCloseBtn}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Chat Footer / Input area */}
      <div style={styles.chatFooter}>
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={(e) => e.target.files && handleFileUpload(e.target.files[0])} 
          style={{ display: 'none' }}
        />
        <button 
          onClick={selectFile}
          style={styles.attachmentBtn} 
          title="Attach file"
          disabled={uploading}
        >
          <Paperclip size={20} />
        </button>

        <form onSubmit={handleSendMessage} style={styles.inputForm}>
          <input
            type="text"
            className="form-input"
            placeholder={uploading ? "Uploading attachment..." : (editingMessage ? "Edit your message..." : "Type a message...")}
            value={text}
            onChange={handleTextChange}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setEditingMessage(null);
                setReplyMessage(null);
                setText('');
              }
            }}
            disabled={uploading}
            style={styles.textInput}
          />
          <button 
            type="submit" 
            style={{
              ...styles.sendBtn,
              backgroundColor: text.trim() ? 'var(--accent-color)' : 'transparent',
              color: text.trim() ? 'white' : '#8696a0'
            }}
            disabled={!text.trim() || uploading}
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  chatArea: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: '#0b141a',
    position: 'relative',
  },
  dragOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(11, 20, 26, 0.9)',
    border: '2px dashed var(--accent-color)',
    zIndex: 200,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: '12px',
  },
  dragContent: {
    textAlign: 'center',
    pointerEvents: 'none',
  },
  chatHeader: {
    height: '60px',
    backgroundColor: '#202c33',
    padding: '0 16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid rgba(134, 150, 160, 0.15)',
    zIndex: 2,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  backBtn: {
    background: 'none',
    border: 'none',
    color: '#aebac1',
    cursor: 'pointer',
    padding: '4px',
    marginRight: '4px',
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: 'rgba(134, 150, 160, 0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recipientMeta: {
    display: 'flex',
    flexDirection: 'column',
  },
  recipientName: {
    fontSize: '0.94rem',
    fontWeight: '600',
    color: '#e9edef',
  },
  onlineText: {
    fontSize: '0.75rem',
    color: '#8696a0',
  },
  onlineDot: {
    display: 'inline-block',
    width: '7px',
    height: '7px',
    borderRadius: '50%',
    backgroundColor: '#00e676',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
  },
  headerIconBtn: {
    background: 'none',
    border: 'none',
    color: '#aebac1',
    cursor: 'pointer',
    padding: '6px',
  },
  chatBody: {
    flex: 1,
    padding: '20px 24px',
    overflowY: 'auto',
    background: 'radial-gradient(circle at top, rgba(0, 168, 132, 0.05) 0%, rgba(11, 20, 26, 0) 60%)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  emptyChat: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 'auto',
    maxWidth: '400px',
  },
  infoBadge: {
    padding: '6px 12px',
    backgroundColor: 'rgba(0, 168, 132, 0.15)',
    border: '1px solid rgba(0, 168, 132, 0.25)',
    borderRadius: '12px',
    fontSize: '0.8rem',
    color: '#00a884',
    fontWeight: '600',
  },
  dateSeparator: {
    display: 'flex',
    justifyContent: 'center',
    margin: '18px 0',
  },
  dateBadge: {
    padding: '6px 14px',
    backgroundColor: '#182229',
    color: '#8696a0',
    fontSize: '0.72rem',
    fontWeight: '600',
    borderRadius: '6px',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
    textTransform: 'uppercase',
  },
  messageRow: {
    display: 'flex',
    width: '100%',
    marginBottom: '8px',
  },
  bubble: {
    maxWidth: '65%',
    padding: '8px 12px 6px 12px',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    wordBreak: 'break-word',
  },
  replyPreviewHeader: {
    display: 'flex',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    padding: '6px 8px',
    borderRadius: '4px',
    marginBottom: '6px',
    fontSize: '0.8rem',
  },
  replyBar: {
    width: '3px',
    backgroundColor: 'var(--accent-color)',
    borderRadius: '2px',
    marginRight: '8px',
  },
  replyHeaderContent: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  replySender: {
    fontWeight: '600',
    color: 'var(--accent-color)',
    fontSize: '0.75rem',
  },
  replyText: {
    color: '#8696a0',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    overflow: 'hidden',
  },
  fileCard: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    padding: '10px 12px',
    borderRadius: '6px',
    gap: '12px',
    marginBottom: '6px',
    border: '1px solid rgba(255, 255, 255, 0.05)',
  },
  fileCardIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileCardMeta: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  fileCardName: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: '#e9edef',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    overflow: 'hidden',
  },
  fileCardSize: {
    fontSize: '0.72rem',
    color: '#8696a0',
    marginTop: '2px',
  },
  fileDownloadBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#8696a0',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '4px',
    transition: 'color 0.2s',
  },
  bubbleText: {
    fontSize: '0.92rem',
    lineHeight: '1.45',
    margin: 0,
    whiteSpace: 'pre-wrap',
  },
  bubbleFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: '4px',
    gap: '6px',
  },
  editedText: {
    fontSize: '0.68rem',
    fontStyle: 'italic',
    color: '#8696a0',
  },
  bubbleTime: {
    fontSize: '0.68rem',
    color: '#8696a0',
  },
  actionMenuLeft: {
    position: 'absolute',
    left: '-24px',
    top: '4px',
    zIndex: 10,
  },
  actionMenuRight: {
    position: 'absolute',
    right: '-24px',
    top: '4px',
    zIndex: 10,
  },
  menuTriggerBtn: {
    background: 'none',
    border: 'none',
    color: '#667781',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownMenu: {
    position: 'absolute',
    top: '20px',
    right: '0',
    backgroundColor: '#233138',
    border: '1px solid rgba(134, 150, 160, 0.15)',
    borderRadius: '6px',
    padding: '4px 0',
    minWidth: '100px',
    boxShadow: '0 4px 10px rgba(0, 0, 0, 0.3)',
    zIndex: 11,
  },
  dropdownItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    width: '100%',
    padding: '8px 12px',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#e9edef',
    fontSize: '0.78rem',
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  replyPreviewBar: {
    padding: '8px 16px',
    backgroundColor: '#1f2c34',
    borderLeft: '4px solid var(--accent-color)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid rgba(134, 150, 160, 0.12)',
  },
  replyPreviewBarLeft: {
    display: 'flex',
    alignItems: 'center',
  },
  replyPreviewTextContainer: {
    display: 'flex',
    flexDirection: 'column',
  },
  replyPreviewCloseBtn: {
    background: 'none',
    border: 'none',
    color: '#8696a0',
    cursor: 'pointer',
  },
  chatFooter: {
    minHeight: '60px',
    backgroundColor: '#202c33',
    padding: '10px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    zIndex: 2,
    borderTop: '1px solid rgba(134, 150, 160, 0.15)',
  },
  attachmentBtn: {
    background: 'none',
    border: 'none',
    color: '#8696a0',
    cursor: 'pointer',
    padding: '8px',
    borderRadius: '50%',
    transition: 'color 0.2s',
  },
  inputForm: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#2a3942',
    borderRadius: '8px',
    padding: '2px 8px',
  },
  textInput: {
    flex: 1,
    border: 'none',
    backgroundColor: 'transparent',
    padding: '10px 12px',
    color: '#e9edef',
    fontSize: '0.94rem',
    outline: 'none',
  },
  sendBtn: {
    border: 'none',
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s',
  }
};

export default ChatArea;
