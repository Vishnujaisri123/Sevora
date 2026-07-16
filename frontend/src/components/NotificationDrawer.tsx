import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, BellOff, MessageSquare, RefreshCw, FileText, UserPlus } from 'lucide-react';

interface Notification {
  _id: string;
  type: 'message' | 'status_change' | 'pdf_upload' | 'ticket_assignment';
  message: string;
  isRead: boolean;
  createdAt: string;
  ticketId?: {
    _id: string;
    clientName: string;
    templeName: string;
    status: string;
  };
}

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
  onMarkRead: (ids?: string[]) => void;
  onSelectTicket: (ticketId: string) => void;
}

const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkRead,
  onSelectTicket
}) => {
  
  const getIcon = (type: string) => {
    switch (type) {
      case 'message':
        return <MessageSquare size={16} style={{ color: '#34b7f1' }} />;
      case 'status_change':
        return <RefreshCw size={16} style={{ color: '#e9b10a' }} />;
      case 'pdf_upload':
        return <FileText size={16} style={{ color: '#00e676' }} />;
      case 'ticket_assignment':
        return <UserPlus size={16} style={{ color: '#a78bfa' }} />;
      default:
        return <FileText size={16} style={{ color: '#8696a0' }} />;
    }
  };

  const handleNotificationClick = (notif: Notification) => {
    if (!notif.isRead) {
      onMarkRead([notif._id]);
    }
    if (notif.ticketId?._id) {
      onSelectTicket(notif.ticketId._id);
    }
    onClose();
  };

  const formatTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch (e) {
      return '';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={styles.backdrop}
          />

          {/* Drawer Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            style={styles.drawer}
            className="glass-panel"
          >
            <div style={styles.header}>
              <h3 style={styles.title}>Notifications</h3>
              <div style={styles.headerActions}>
                {notifications.some(n => !n.isRead) && (
                  <button 
                    onClick={() => onMarkRead()} 
                    style={styles.markReadBtn}
                    title="Mark all as read"
                  >
                    <Check size={16} /> Mark all read
                  </button>
                )}
                <button onClick={onClose} style={styles.closeBtn}>
                  <X size={20} />
                </button>
              </div>
            </div>

            <div style={styles.body}>
              {notifications.length === 0 ? (
                <div style={styles.emptyState}>
                  <BellOff size={48} style={styles.emptyIcon} />
                  <p style={styles.emptyText}>No notifications yet</p>
                  <p style={styles.emptySubtext}>We'll notify you here when ticket updates occur.</p>
                </div>
              ) : (
                <div style={styles.list}>
                  {notifications.map((notif) => (
                    <div
                      key={notif._id}
                      onClick={() => handleNotificationClick(notif)}
                      style={{
                        ...styles.item,
                        backgroundColor: notif.isRead ? 'transparent' : 'rgba(0, 168, 132, 0.08)',
                        borderLeft: notif.isRead ? '3px solid transparent' : '3px solid var(--accent-color)'
                      }}
                    >
                      <div style={styles.itemHeader}>
                        <div style={styles.iconWrapper}>
                          {getIcon(notif.type)}
                        </div>
                        <span style={styles.itemTime}>{formatTime(notif.createdAt)}</span>
                      </div>
                      <p style={styles.itemMsg}>{notif.message}</p>
                      {notif.ticketId && (
                        <div style={styles.ticketTag}>
                          Client: {notif.ticketId.clientName} | {notif.ticketId.templeName}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  backdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
    zIndex: 999,
  },
  drawer: {
    position: 'fixed',
    top: 0,
    right: 0,
    bottom: 0,
    width: '380px',
    maxWidth: '100%',
    backgroundColor: '#111b21',
    borderLeft: '1px solid rgba(134, 150, 160, 0.15)',
    boxShadow: '-10px 0 30px rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
    borderRadius: '16px 0 0 16px',
  },
  header: {
    padding: '18px 20px',
    borderBottom: '1px solid rgba(134, 150, 160, 0.15)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#202c33',
    borderRadius: '16px 0 0 0',
  },
  title: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#e9edef',
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  markReadBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--accent-color)',
    fontSize: '0.8rem',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 8px',
    borderRadius: '4px',
    transition: 'background 0.2s',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#8696a0',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    overflowY: 'auto',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    padding: '40px 24px',
    textAlign: 'center',
  },
  emptyIcon: {
    color: '#3b4a54',
    marginBottom: '16px',
  },
  emptyText: {
    color: '#e9edef',
    fontSize: '1rem',
    fontWeight: '500',
    marginBottom: '6px',
  },
  emptySubtext: {
    color: '#8696a0',
    fontSize: '0.82rem',
    lineHeight: '1.4',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
  },
  item: {
    padding: '16px 20px',
    borderBottom: '1px solid rgba(134, 150, 160, 0.08)',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  itemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  iconWrapper: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    backgroundColor: 'rgba(32, 44, 51, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid rgba(255, 255, 255, 0.04)',
  },
  itemTime: {
    fontSize: '0.72rem',
    color: '#8696a0',
  },
  itemMsg: {
    fontSize: '0.88rem',
    color: '#e9edef',
    lineHeight: '1.4',
    wordBreak: 'break-word',
  },
  ticketTag: {
    display: 'inline-block',
    marginTop: '8px',
    padding: '3px 8px',
    borderRadius: '4px',
    backgroundColor: 'rgba(32, 44, 51, 0.8)',
    border: '1px solid rgba(255, 255, 255, 0.03)',
    color: '#8696a0',
    fontSize: '0.75rem',
  },
};

export default NotificationDrawer;
