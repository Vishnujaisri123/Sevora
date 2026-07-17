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
    clientName1?: string;
    clientName2?: string;
    clientName?: string;
    templeName: string;
    status: string;
  };
  senderName?: string;
  clientName?: string;
  fileName?: string;
  bodyText?: string;
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
  const visibleNotifications = notifications.filter(n => !n.isRead);
  
  const cleanEmailToName = (str: string) => {
    if (!str) return '';
    let name = str.includes('@') ? str.split('@')[0] : str;
    name = name.replace(/[._-]/g, ' ');
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
      .trim();
  };

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
    const id = notif.ticketId?._id || (typeof notif.ticketId === 'string' ? notif.ticketId : undefined);
    if (id) {
      onSelectTicket(id);
    }
    onClose();
  };

  const groupNotificationsByDate = (notifs: Notification[]) => {
    const today: Notification[] = [];
    const yesterday: Notification[] = [];
    const earlier: Notification[] = [];

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);

    notifs.forEach(n => {
      const date = new Date(n.createdAt);
      if (date >= startOfToday) {
        today.push(n);
      } else if (date >= startOfYesterday) {
        yesterday.push(n);
      } else {
        earlier.push(n);
      }
    });

    return { today, yesterday, earlier };
  };

  const renderNotificationCardContent = (notif: Notification) => {
    const { type, senderName, clientName, fileName, bodyText, isRead } = notif;
    const timeString = new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Helpers to clean up legacy notification messages
    const cleanLegacyMessage = (msg: string) => {
      if (!msg) return '';
      // Check if it's the legacy pattern: ... sent a message regarding client ...: "..."
      const match = msg.match(/sent a message regarding client.*:\s*"(.*)"$/s);
      if (match) {
        return match[1];
      }
      // Also check for legacy employee message format
      if (msg.startsWith('message from employee')) {
        return msg.replace(/^message from employee\s+\S+\s+/i, '');
      }
      // Also check for legacy file attachment pattern
      if (msg.includes('sent a file attachment for client') || msg.includes('[File Attachment]')) {
        return '[File Attachment]';
      }
      return msg;
    };

    const extractLegacySender = (msg: string) => {
      if (!msg) return 'Sender';
      const match = msg.match(/^(.*?)\s+sent a message/);
      if (match) return match[1];
      const employeeMatch = msg.match(/^message from employee\s+(\S+)/i);
      if (employeeMatch) return employeeMatch[1];
      const fileMatch = msg.match(/^(.*?)\s+sent a file/);
      if (fileMatch) return fileMatch[1];
      return 'Sender';
    };

    const extractLegacyClient = (msg: string) => {
      const resolvedClient = notif.ticketId ? (notif.ticketId.clientName1 && notif.ticketId.clientName2 ? `${notif.ticketId.clientName1} & ${notif.ticketId.clientName2}` : notif.ticketId.clientName) : null;
      if (resolvedClient) return resolvedClient;
      const match = msg.match(/regarding client\s+(.*?)(?::\s*"|\s*$)/);
      if (match) return match[1];
      return 'N/A';
    };

    // Resolve details using helper extraction for legacy notifications (and clean email usernames)
    const resolvedSender = cleanEmailToName(senderName || extractLegacySender(notif.message));
    const resolvedClient = clientName || extractLegacyClient(notif.message);
    const resolvedBodyText = bodyText || cleanLegacyMessage(notif.message);

    if (type === 'ticket_assignment') {
      return (
        <div style={styles.cardContent}>
          <div style={styles.cardHeaderRow}>
            <span style={styles.cardTitle}>📋 New Booking Request</span>
          </div>
          <div style={styles.cardBody}>
            <div><span style={styles.cardLabel}>Employee Name :</span> <span style={styles.cardValue}>{resolvedSender}</span></div>
            <div><span style={styles.cardLabel}>Client Name   :</span> <span style={styles.cardValue}>{resolvedClient}</span></div>
            <div><span style={styles.cardLabel}>Time          :</span> <span style={styles.cardValue}>{timeString}</span></div>
            <div style={styles.cardStatusRow}>
              <span style={styles.cardLabel}>Status        :</span>{' '}
              <span style={isRead ? styles.statusRead : styles.statusUnread}>
                {isRead ? '✓ Read' : '● Unread'}
              </span>
            </div>
          </div>
        </div>
      );
    }

    if (type === 'message') {
      return (
        <div style={styles.cardContent}>
          <div style={styles.cardHeaderRow}>
            <span style={styles.cardTitle}>💬 Message from {resolvedSender}</span>
          </div>
          <div style={styles.cardBody}>
            <div><span style={styles.cardLabel}>Message :</span> <span style={styles.cardValue}>"{resolvedBodyText}"</span></div>
            <div><span style={styles.cardLabel}>Client  :</span> <span style={styles.cardValue}>{resolvedClient}</span></div>
            <div><span style={styles.cardLabel}>Time    :</span> <span style={styles.cardValue}>{timeString}</span></div>
            <div style={styles.cardStatusRow}>
              <span style={styles.cardLabel}>Status  :</span>{' '}
              <span style={isRead ? styles.statusRead : styles.statusUnread}>
                {isRead ? '✓ Read' : '● Unread'}
              </span>
            </div>
          </div>
        </div>
      );
    }

    if (type === 'pdf_upload') {
      return (
        <div style={styles.cardContent}>
          <div style={styles.cardHeaderRow}>
            <span style={styles.cardTitle}>📄 Ticket PDF Received</span>
          </div>
          <div style={styles.cardBody}>
            <div><span style={styles.cardLabel}>From          :</span> <span style={styles.cardValue}>{resolvedSender}</span></div>
            <div><span style={styles.cardLabel}>PDF Belongs To:</span> <span style={styles.cardValue}>{resolvedClient}</span></div>
            <div><span style={styles.cardLabel}>File Name     :</span> <span style={styles.cardValue}>{fileName || 'Tirumala_Ticket.pdf'}</span></div>
            <div><span style={styles.cardLabel}>Time          :</span> <span style={styles.cardValue}>{timeString}</span></div>
            <div style={styles.cardStatusRow}>
              <span style={styles.cardLabel}>Status        :</span>{' '}
              <span style={isRead ? styles.statusRead : styles.statusUnread}>
                {isRead ? '✓ Read' : '● Unread'}
              </span>
            </div>
          </div>
        </div>
      );
    }

    // Default Fallback
    return (
      <div style={styles.cardContent}>
        <div style={styles.cardBody}>
          <p style={{ margin: 0, fontSize: '0.88rem', color: '#e9edef' }}>{resolvedBodyText}</p>
          <div style={styles.cardStatusRow}>
            <span style={styles.cardLabel}>Status        :</span>{' '}
            <span style={isRead ? styles.statusRead : styles.statusUnread}>
              {isRead ? '✓ Read' : '● Unread'}
            </span>
          </div>
        </div>
      </div>
    );
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
                {visibleNotifications.length > 0 && (
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
              {visibleNotifications.length === 0 ? (
                <div style={styles.emptyState}>
                  <BellOff size={48} style={styles.emptyIcon} />
                  <p style={styles.emptyText}>No notifications yet</p>
                  <p style={styles.emptySubtext}>We'll notify you here when ticket updates occur.</p>
                </div>
              ) : (
                <div style={styles.list}>
                  {Object.entries(groupNotificationsByDate(visibleNotifications)).map(([groupName, groupList]) => {
                    if (groupList.length === 0) return null;
                    return (
                      <div key={groupName} style={{ marginBottom: '8px' }}>
                        <div style={styles.groupHeader}>
                          {groupName === 'today' ? 'Today' : groupName === 'yesterday' ? 'Yesterday' : 'Earlier'}
                        </div>
                        {groupList.map((notif) => (
                          <div
                            key={notif._id}
                            onClick={() => handleNotificationClick(notif)}
                            style={{
                              ...styles.item,
                              backgroundColor: notif.isRead ? 'rgba(32, 44, 51, 0.3)' : 'rgba(0, 168, 132, 0.08)',
                              borderLeft: notif.isRead ? '3px solid transparent' : '3px solid var(--accent-color)'
                            }}
                          >
                            <div style={styles.itemHeader}>
                              <div style={styles.iconWrapper}>
                                {getIcon(notif.type)}
                              </div>
                            </div>
                            {renderNotificationCardContent(notif)}
                          </div>
                        ))}
                      </div>
                    );
                  })}
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
  groupHeader: {
    padding: '8px 20px',
    backgroundColor: '#202c33',
    color: '#8696a0',
    fontSize: '0.78rem',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.8px',
    borderBottom: '1px solid rgba(134, 150, 160, 0.1)',
  },
  cardContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  cardHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2px',
  },
  cardTitle: {
    fontWeight: '700',
    fontSize: '0.88rem',
    color: '#e9edef',
  },
  cardBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    fontSize: '0.82rem',
    color: '#d1d7db',
    lineHeight: '1.4',
    whiteSpace: 'pre-line',
  },
  cardLabel: {
    color: '#8696a0',
    fontWeight: '500',
    marginRight: '4px',
  },
  cardValue: {
    color: '#e9edef',
    fontWeight: '600',
  },
  cardStatusRow: {
    marginTop: '2px',
  },
  statusRead: {
    color: '#00e676',
    fontWeight: 'bold',
  },
  statusUnread: {
    color: '#ef4444',
    fontWeight: 'bold',
  },
};

export default NotificationDrawer;
