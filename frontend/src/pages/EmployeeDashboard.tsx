import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from '../components/Navbar';
import NotificationDrawer from '../components/NotificationDrawer';
import BookingForm from '../components/BookingForm';
import ChatArea from '../components/ChatArea';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { 
  Plus, MessageSquare, Edit2, Trash2, CheckCircle, Send, 
  Clock, Calendar, Users, FileText, CheckCheck, Eye,
  Smartphone, Coins
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const EmployeeDashboard: React.FC = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [tickets, setTickets] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState<number>(0);
  const [toasts, setToasts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');

  const showToast = (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info', title = 'Alert', ticketId?: string) => {
    const id = Date.now() + Math.random().toString(36).substr(2, 9);
    const newToast = { id, message, type, title, ticketId };
    setToasts(prev => [...prev, newToast]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 6000);
  };
  
  // Modals & Panels toggle
  const [showFormModal, setShowFormModal] = useState(false);
  const [formInitialData, setFormInitialData] = useState<any>(null);
  const [showChatDrawer, setShowChatDrawer] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [showNotifDrawer, setShowNotifDrawer] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);

  // Fetch Tickets
  const fetchTickets = async () => {
    try {
      const res = await axios.get('/api/tickets');
      setTickets(res.data);
    } catch (err) {
      console.error('Error fetching tickets:', err);
    }
  };

  // Fetch Notifications
  const fetchNotifications = async () => {
    try {
      const res = await axios.get('/api/notifications');
      setNotifications(res.data);
      setUnreadNotifications(res.data.filter((n: any) => !n.isRead).length);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      await Promise.all([fetchTickets(), fetchNotifications()]);
      setLoading(false);
    };
    initData();
  }, []);

  // Set up socket listeners for real-time status and notifications
  useEffect(() => {
    if (socket) {
      // Register this socket to user personal room
      socket.emit('join_ticket', { ticketId: user?.id });

      socket.on('notification_received', (data: any) => {
        fetchNotifications();
        showToast(data.message || 'New notification from Admin', 'info', 'Admin Notification', data.ticketId);
        if (Notification.permission === 'granted') {
          new Notification('Temple Ticket Alert', {
            body: data.message,
            icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🛕</text></svg>'
          });
        }
      });

      socket.on('ticket_status_updated', (data: any) => {
        fetchTickets();
        showToast(`Ticket status updated to "${data.status}"`, 'warning', 'Status Change', data.ticketId);
      });

      socket.on('ticket_pdf_uploaded', (data: any) => {
        fetchTickets();
        showToast('Ticket PDF has been uploaded by Admin!', 'success', 'PDF Ready', data.ticketId);
      });

      socket.on('ticket_deleted', (data: any) => {
        fetchTickets();
        showToast(data.message, 'error', 'Booking Deleted');
        if (selectedTicket && selectedTicket._id === data.ticketId) {
          setSelectedTicket(null);
        }
      });
    }

    // Request browser notification permissions on mount
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }

    return () => {
      if (socket) {
        socket.off('notification_received');
        socket.off('ticket_status_updated');
        socket.off('ticket_pdf_uploaded');
        socket.off('ticket_deleted');
      }
    };
  }, [socket, user, selectedTicket]);

  const handleCreateOrUpdate = async (formData: any) => {
    setFormLoading(true);
    try {
      if (formInitialData) {
        // Edit existing Draft
        await axios.put(`/api/tickets/${formInitialData._id}`, formData);
      } else {
        // Create new Draft
        await axios.post('/api/tickets', formData);
      }
      await fetchTickets();
      setShowFormModal(false);
      setFormInitialData(null);
    } catch (err) {
      console.error('Submit booking form error:', err);
      alert('Error saving booking. Check fields.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (ticketId: string) => {
    if (!window.confirm('Are you sure you want to delete this booking?')) return;
    try {
      await axios.delete(`/api/tickets/${ticketId}`);
      await fetchTickets();
    } catch (err) {
      console.error('Delete ticket error:', err);
    }
  };

  const handleConfirm = async (ticketId: string) => {
    try {
      await axios.post(`/api/tickets/${ticketId}/confirm`);
      await fetchTickets();
    } catch (err) {
      console.error('Confirm ticket error:', err);
    }
  };

  const handleSendToAdmin = async (ticketId: string) => {
    try {
      await axios.post(`/api/tickets/${ticketId}/send-to-admin`);
      await fetchTickets();
    } catch (err) {
      console.error('Send to admin error:', err);
    }
  };

  const handleUpdatePaymentStatus = async (ticketId: string, status: string) => {
    try {
      await axios.put(`/api/tickets/${ticketId}`, { paymentStatus: status });
      await fetchTickets();
    } catch (err: any) {
      console.error('Update payment status error:', err);
      alert(err.response?.data?.message || 'Failed to update payment status');
    }
  };

  const handleMarkNotificationsRead = async (ids?: string[]) => {
    try {
      await axios.post('/api/notifications/read', { notificationIds: ids });
      await fetchNotifications();
    } catch (err) {
      console.error('Mark read notifications error:', err);
    }
  };

  const handleSelectTicketFromNotification = (ticketId: string) => {
    const target = tickets.find(t => t._id === ticketId);
    if (target) {
      setSelectedTicket(target);
      setShowChatDrawer(true);
    } else {
      // Re-fetch tickets first in case it's new
      axios.get(`/api/tickets`).then(res => {
        setTickets(res.data);
        const refetched = res.data.find((t: any) => t._id === ticketId);
        if (refetched) {
          setSelectedTicket(refetched);
          setShowChatDrawer(true);
        }
      });
    }
  };

  // Metrics helper computations
  const getMetrics = () => {
    const total = tickets.length;
    const phonePePayments = tickets.filter(t => t.paymentStatus === 'Paid by PhonePe').length;
    const cashPayments = tickets.filter(t => t.paymentStatus === 'Paid by Cash').length;
    const completed = tickets.filter(t => t.status === 'Completed').length;

    return { total, phonePePayments, cashPayments, completed };
  };

  const metrics = getMetrics();

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // Determine recipient for the ChatArea (defaults to the assigned Admin or any admin)
  const getChatRecipient = (ticket: any) => {
    if (ticket.adminId) {
      return {
        id: ticket.adminId._id || ticket.adminId,
        name: ticket.adminId.username || 'Admin',
        role: 'admin' as const
      };
    }
    return {
      id: 'admins', // Fallback identifier to match backend room routing
      name: 'System Admin',
      role: 'admin' as const
    };
  };

  return (
    <div className="app-container">
      <Navbar 
        unreadNotifications={unreadNotifications} 
        onToggleNotifications={() => setShowNotifDrawer(true)} 
        title="Employee Portal - Ticket Bookings"
      />

      <div style={styles.dashboardContainer}>
        {/* Metrics Grid */}
        <div style={styles.metricsGrid}>
          <div className="glass-panel" style={styles.metricCard}>
            <div style={{ ...styles.metricIconContainer, backgroundColor: 'rgba(0, 168, 132, 0.15)' }}>
              <FileText size={22} style={{ color: '#00a884' }} />
            </div>
            <div style={styles.metricInfo}>
              <span style={styles.metricLabel}>Total Bookings</span>
              <h2 style={styles.metricValue}>{metrics.total}</h2>
            </div>
          </div>

          <div className="glass-panel" style={styles.metricCard}>
            <div style={{ ...styles.metricIconContainer, backgroundColor: 'rgba(167, 139, 250, 0.15)' }}>
              <Smartphone size={22} style={{ color: '#a78bfa' }} />
            </div>
            <div style={styles.metricInfo}>
              <span style={styles.metricLabel}>PhonePe Payments</span>
              <h2 style={styles.metricValue}>{metrics.phonePePayments}</h2>
            </div>
          </div>

          <div className="glass-panel" style={styles.metricCard}>
            <div style={{ ...styles.metricIconContainer, backgroundColor: 'rgba(233, 177, 10, 0.15)' }}>
              <Coins size={22} style={{ color: '#e9b10a' }} />
            </div>
            <div style={styles.metricInfo}>
              <span style={styles.metricLabel}>Cash Payments</span>
              <h2 style={styles.metricValue}>{metrics.cashPayments}</h2>
            </div>
          </div>

          <div className="glass-panel" style={styles.metricCard}>
            <div style={{ ...styles.metricIconContainer, backgroundColor: 'rgba(0, 230, 118, 0.15)' }}>
              <CheckCircle size={22} style={{ color: '#00e676' }} />
            </div>
            <div style={styles.metricInfo}>
              <span style={styles.metricLabel}>Completed</span>
              <h2 style={styles.metricValue}>{metrics.completed}</h2>
            </div>
          </div>
        </div>

        {/* Bookings Section */}
        <div className="glass-panel" style={styles.tableCard}>
          <div style={styles.tableHeader}>
            <div>
              <h3 style={styles.tableTitle}>Client Ticket Registry</h3>
              <p style={{ color: '#8696a0', fontSize: '0.82rem', marginTop: '4px' }}>
                Create and track the status of clients' official temple bookings.
              </p>
            </div>
            <button 
              onClick={() => { setFormInitialData(null); setShowFormModal(true); }}
              className="btn-primary"
            >
              <Plus size={18} /> New Booking
            </button>
          </div>

          {/* Tab Selector */}
          <div style={styles.tabsContainer}>
            <button
              onClick={() => setActiveTab('active')}
              style={{
                ...styles.tabBtn,
                borderBottomColor: activeTab === 'active' ? 'var(--accent-color)' : 'transparent',
                color: activeTab === 'active' ? 'var(--text-primary)' : '#8696a0'
              }}
            >
              Active Bookings ({
                tickets.filter(t => 
                  (t.status !== 'Completed' && t.status !== 'Cancelled' && t.status !== 'Rejected') ||
                  (t.status === 'Completed' && !t.paymentStatus.startsWith('Paid'))
                ).length
              })
            </button>
            <button
              onClick={() => setActiveTab('history')}
              style={{
                ...styles.tabBtn,
                borderBottomColor: activeTab === 'history' ? 'var(--accent-color)' : 'transparent',
                color: activeTab === 'history' ? 'var(--text-primary)' : '#8696a0'
              }}
            >
              History / Completed ({
                tickets.filter(t => 
                  (t.status === 'Completed' && t.paymentStatus.startsWith('Paid')) ||
                  t.status === 'Cancelled' ||
                  t.status === 'Rejected'
                ).length
              })
            </button>
          </div>

          <div style={styles.tableWrapper}>
            {loading ? (
              <div style={styles.loadingWrapper}>
                <div className="skeleton" style={{ height: '40px', marginBottom: '10px' }} />
                <div className="skeleton" style={{ height: '40px', marginBottom: '10px' }} />
                <div className="skeleton" style={{ height: '45px' }} />
              </div>
            ) : tickets.length === 0 ? (
              <div style={styles.emptyState}>
                <h4 style={{ color: '#e9edef', marginBottom: '6px' }}>No bookings created yet</h4>
                <p style={{ color: '#8696a0', fontSize: '0.88rem' }}>Click "New Booking" to register a client temple darshan.</p>
              </div>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr style={styles.trHead}>
                    <th style={styles.th}>Client Info</th>
                    <th style={styles.th}>Booking Dates</th>
                    <th style={styles.th}>Payment Status</th>
                    <th style={styles.th}>Booking Status</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets
                    .filter(t => activeTab === 'active'
                      ? (
                          (t.status !== 'Completed' && t.status !== 'Cancelled' && t.status !== 'Rejected') ||
                          (t.status === 'Completed' && !t.paymentStatus.startsWith('Paid'))
                        )
                      : (
                          (t.status === 'Completed' && t.paymentStatus.startsWith('Paid')) ||
                          t.status === 'Cancelled' ||
                          t.status === 'Rejected'
                        )
                    )
                    .map((ticket) => {
                      const showChat = ticket.status !== 'Draft' && ticket.status !== 'Confirmed';
                      const showEdit = false;
                      const showDelete = ticket.status === 'Draft' || ticket.status === 'Completed' || ticket.status === 'Cancelled' || ticket.status === 'Rejected';
                      const showConfirm = ticket.status === 'Draft';
                      const showSend = ticket.status === 'Confirmed';
                    
                    return (
                      <tr key={ticket._id} style={styles.trBody}>
                        <td style={styles.td}>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={styles.clientName}>{ticket.clientName1} & {ticket.clientName2}</span>
                            <span style={styles.clientPhone}>{ticket.mobileNumber || 'No Phone'}</span>
                            {ticket.gothram && (
                              <span style={{ fontSize: '0.74rem', color: 'var(--accent-color)', marginTop: '2px', fontWeight: '500' }}>
                                Gothram: {ticket.gothram}
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={styles.td}>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ color: '#e9edef', fontWeight: '500', fontSize: '0.88rem' }}>
                              Booked: {formatDate(ticket.bookedDate)}
                            </span>
                            <span style={styles.slotDetails}>
                              Slot: {ticket.timeSlot}
                            </span>
                            <span style={{ ...styles.slotDetails, fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                              Booker's Date: {formatDate(ticket.bookersDate)}
                            </span>
                          </div>
                        </td>
                        <td style={styles.td}>
                          <select
                            value={ticket.paymentStatus}
                            onChange={(e) => handleUpdatePaymentStatus(ticket._id, e.target.value)}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '6px',
                              backgroundColor: 'rgba(32, 44, 51, 0.9)',
                              border: '1px solid rgba(134, 150, 160, 0.25)',
                              color: ticket.paymentStatus.startsWith('Paid') ? '#00e676' :
                                     ticket.paymentStatus === 'Pending' ? '#e9b10a' :
                                     ticket.paymentStatus === 'Refunded' ? '#ef4444' : '#8696a0',
                              fontWeight: '600',
                              cursor: 'pointer',
                              outline: 'none',
                              fontSize: '0.8rem'
                            }}
                          >
                            {/* Keep existing Draft/Paid/Refunded values if ticket currently has them to prevent errors */}
                            {ticket.paymentStatus === 'Draft' && (
                              <option value="Draft" style={{ color: '#8696a0', backgroundColor: '#111b21' }}>Draft</option>
                            )}
                            <option value="Pending" style={{ color: '#e9b10a', backgroundColor: '#111b21' }}>Pending</option>
                            <option value="Paid by PhonePe" style={{ color: '#00e676', backgroundColor: '#111b21' }}>Paid by PhonePe</option>
                            <option value="Paid by Cash" style={{ color: '#00e676', backgroundColor: '#111b21' }}>Paid by Cash</option>
                            {ticket.paymentStatus === 'Paid' && (
                              <option value="Paid" style={{ color: '#00e676', backgroundColor: '#111b21' }}>Paid</option>
                            )}
                            {ticket.paymentStatus === 'Refunded' && (
                              <option value="Refunded" style={{ color: '#ef4444', backgroundColor: '#111b21' }}>Refunded</option>
                            )}
                          </select>
                        </td>
                        <td style={styles.td}>
                          <span className={`status-badge status-${ticket.status.toLowerCase().replace(/\s+/g, '')}`}>
                            {ticket.status}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <div style={styles.actionsCell}>
                            {showConfirm && (
                              <button 
                                onClick={() => handleConfirm(ticket._id)}
                                style={{ ...styles.actionIconBtn, color: '#34b7f1' }}
                                title="Confirm Booking Details"
                              >
                                <CheckCheck size={16} /> <span style={styles.btnLabel}>Confirm</span>
                              </button>
                            )}

                            {showSend && (
                              <button 
                                onClick={() => handleSendToAdmin(ticket._id)}
                                style={{ ...styles.actionIconBtn, color: '#00a884' }}
                                title="Send ticket to Admin for booking"
                              >
                                <Send size={16} /> <span style={styles.btnLabel}>Send to Admin</span>
                              </button>
                            )}

                            {showChat && (
                              <button 
                                onClick={() => { setSelectedTicket(ticket); setShowChatDrawer(true); }}
                                style={{ ...styles.actionIconBtn, color: '#a78bfa' }}
                                title="Open Dedicated Ticket Chat"
                              >
                                <MessageSquare size={16} /> <span style={styles.btnLabel}>Chat</span>
                              </button>
                            )}

                            {showEdit && (
                              <button 
                                onClick={() => { setFormInitialData(ticket); setShowFormModal(true); }}
                                style={{ ...styles.actionIconBtn, color: '#e9b10a' }}
                                title="Edit Draft"
                              >
                                <Edit2 size={16} />
                              </button>
                            )}

                            {showDelete && (
                              <button 
                                onClick={() => handleDelete(ticket._id)}
                                style={{ ...styles.actionIconBtn, color: '#ef4444' }}
                                title="Delete Draft"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}

                            {/* View details summary */}
                            {!showEdit && !showDelete && !showConfirm && !showSend && !showChat && (
                              <span style={{ color: '#8696a0', fontSize: '0.78rem', fontStyle: 'italic' }}>
                                Waiting processing
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Notifications Drawer */}
      <NotificationDrawer 
        isOpen={showNotifDrawer} 
        onClose={() => setShowNotifDrawer(false)} 
        notifications={notifications} 
        onMarkRead={handleMarkNotificationsRead}
        onSelectTicket={handleSelectTicketFromNotification}
      />

      {/* Create / Edit Form Modal */}
      <AnimatePresence>
        {showFormModal && (
          <div style={styles.modalOverlay}>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              style={styles.modalCard}
              className="glass-panel"
            >
              <BookingForm 
                initialData={formInitialData} 
                onSubmit={handleCreateOrUpdate} 
                onCancel={() => { setShowFormModal(false); setFormInitialData(null); }}
                onDelete={() => {
                  if (formInitialData) {
                    handleDelete(formInitialData._id);
                    setShowFormModal(false);
                    setFormInitialData(null);
                  }
                }}
                isLoading={formLoading}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Chat Area Slide-out Drawer */}
      <AnimatePresence>
        {showChatDrawer && selectedTicket && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowChatDrawer(false)}
              style={styles.drawerBackdrop}
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 190 }}
              style={styles.chatDrawer}
            >
              <ChatArea 
                ticketId={selectedTicket._id}
                recipientId={getChatRecipient(selectedTicket).id}
                recipientName={getChatRecipient(selectedTicket).name}
                recipientRole={getChatRecipient(selectedTicket).role}
                onClose={() => setShowChatDrawer(false)}
                ticketStatus={selectedTicket.status}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Toast Popup Notifications */}
      <div style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        maxWidth: '360px',
        width: '100%',
        pointerEvents: 'none'
      }}>
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
              layout
              style={{
                padding: '16px',
                borderRadius: '12px',
                backgroundColor: 'rgba(30, 42, 50, 0.95)',
                borderLeft: `5px solid ${
                  toast.type === 'success' ? '#00e676' :
                  toast.type === 'warning' ? '#e9b10a' :
                  toast.type === 'error' ? '#ef4444' : '#34b7f1'
                }`,
                boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
                backdropFilter: 'blur(8px)',
                color: '#e9edef',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                cursor: toast.ticketId ? 'pointer' : 'default',
                pointerEvents: 'auto',
                borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                borderRight: '1px solid rgba(255, 255, 255, 0.05)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
              }}
              onClick={() => {
                if (toast.ticketId) {
                  const matchedTicket = tickets.find(t => t._id === toast.ticketId);
                  if (matchedTicket) {
                    setSelectedTicket(matchedTicket);
                    setShowChatDrawer(true);
                  }
                }
                setToasts(prev => prev.filter(t => t.id !== toast.id));
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ 
                  fontWeight: '700', 
                  fontSize: '0.88rem',
                  color: 
                    toast.type === 'success' ? '#00e676' :
                    toast.type === 'warning' ? '#e9b10a' :
                    toast.type === 'error' ? '#ef4444' : '#34b7f1'
                }}>{toast.title}</span>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setToasts(prev => prev.filter(t => t.id !== toast.id));
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#8696a0',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    padding: '2px'
                  }}
                >
                  ✕
                </button>
              </div>
              <p style={{ fontSize: '0.82rem', margin: 0, color: '#d1d7db', lineHeight: '1.4' }}>{toast.message}</p>
              {toast.ticketId && (
                <span style={{ fontSize: '0.72rem', color: 'var(--accent-color)', textDecoration: 'underline', marginTop: '2px', fontWeight: '500' }}>
                  Click to view details
                </span>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  dashboardContainer: {
    padding: '24px',
    flex: 1,
    overflowY: 'auto',
    backgroundColor: '#0b141a',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '20px',
    marginBottom: '24px',
  },
  metricCard: {
    padding: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    border: '1px solid rgba(255, 255, 255, 0.05)',
  },
  metricIconContainer: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  metricLabel: {
    color: '#8696a0',
    fontSize: '0.8rem',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  metricValue: {
    fontSize: '1.75rem',
    fontWeight: '700',
    color: '#e9edef',
    marginTop: '4px',
  },
  tableCard: {
    border: '1px solid rgba(255, 255, 255, 0.05)',
    padding: '24px',
  },
  tableHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '12px',
  },
  tableTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.2rem',
    fontWeight: '600',
    color: '#e9edef',
  },
  tableWrapper: {
    overflowX: 'auto',
  },
  loadingWrapper: {
    padding: '20px 0',
  },
  emptyState: {
    padding: '48px 0',
    textAlign: 'center',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
  },
  trHead: {
    borderBottom: '2px solid rgba(134, 150, 160, 0.15)',
  },
  th: {
    padding: '12px 16px',
    color: '#8696a0',
    fontSize: '0.8rem',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  trBody: {
    borderBottom: '1px solid rgba(134, 150, 160, 0.08)',
    transition: 'background 0.2s',
  },
  td: {
    padding: '16px',
    verticalAlign: 'middle',
  },
  clientName: {
    fontSize: '0.94rem',
    fontWeight: '600',
    color: '#e9edef',
  },
  clientPhone: {
    fontSize: '0.8rem',
    color: '#8696a0',
    marginTop: '3px',
  },
  templeName: {
    fontSize: '0.92rem',
    fontWeight: '500',
    color: '#e9edef',
  },
  slotDetails: {
    fontSize: '0.8rem',
    color: '#8696a0',
    marginTop: '3px',
  },
  membersTag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px',
    backgroundColor: '#202c33',
    borderRadius: '6px',
    fontSize: '0.82rem',
    color: '#e9edef',
  },
  actionsCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  actionIconBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '6px 8px',
    borderRadius: '4px',
    fontSize: '0.8rem',
    fontWeight: '600',
    transition: 'background 0.2s',
  },
  btnLabel: {
    display: 'inline',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 1000,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '20px',
  },
  modalCard: {
    width: '100%',
    maxWidth: '680px',
    padding: '30px',
    maxHeight: '90vh',
    overflowY: 'auto',
    backgroundColor: '#111b21',
    border: '1px solid rgba(255, 255, 255, 0.08)',
  },
  drawerBackdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 999,
  },
  chatDrawer: {
    position: 'fixed',
    top: 0,
    right: 0,
    bottom: 0,
    width: '500px',
    maxWidth: '100%',
    backgroundColor: '#0b141a',
    borderLeft: '1px solid rgba(134, 150, 160, 0.15)',
    boxShadow: '-10px 0 30px rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
  },
  tabsContainer: {
    display: 'flex',
    gap: '24px',
    padding: '0 24px',
    borderBottom: '1px solid rgba(134, 150, 160, 0.1)'
  },
  tabBtn: {
    background: 'none',
    border: 'none',
    borderBottom: '2px solid transparent',
    padding: '12px 4px',
    cursor: 'pointer',
    fontSize: '0.88rem',
    fontWeight: '600',
    transition: 'all 0.25s ease'
  },
};

export default EmployeeDashboard;
