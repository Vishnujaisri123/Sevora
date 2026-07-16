import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from '../components/Navbar';
import NotificationDrawer from '../components/NotificationDrawer';
import ChatArea from '../components/ChatArea';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { 
  Search, Filter, Calendar, Users, Shield, Clock, FileText, 
  Upload, Download, Plus, RefreshCw, BarChart2, Check, DownloadCloud,
  CheckCheck, MessageSquare, AlertCircle, X, ChevronRight, FileUp,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [tickets, setTickets] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState<number>(0);
  const [toasts, setToasts] = useState<any[]>([]);
  
  const showToast = (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info', title = 'Alert', ticketId?: string) => {
    const id = Date.now() + Math.random().toString(36).substr(2, 9);
    const newToast = { id, message, type, title, ticketId };
    setToasts(prev => [...prev, newToast]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 6000);
  };
  
  // Active conversation / panels
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [ticketDetails, setTicketDetails] = useState<any>(null); // Details of active ticket
  const [timeline, setTimeline] = useState<any[]>([]);
  const [pdfHistory, setPdfHistory] = useState<any[]>([]);
  
  // Search, Filters & Analytics toggle
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showNotifDrawer, setShowNotifDrawer] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'timeline' | 'files'>('info');

  // Status transition inputs
  const [newStatus, setNewStatus] = useState('');
  const [statusComment, setStatusComment] = useState('');
  const [statusLoading, setStatusLoading] = useState(false);

  // File upload inputs
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  // Fetch Tickets
  const fetchTickets = async (selectIdAfterFetch?: string) => {
    try {
      const res = await axios.get('/api/tickets');
      setTickets(res.data);
      if (selectIdAfterFetch) {
        const updated = res.data.find((t: any) => t._id === selectIdAfterFetch);
        if (updated) {
          setSelectedTicket(updated);
        }
      }
    } catch (err) {
      console.error('Error fetching tickets:', err);
    }
  };

  const handleDeleteTicket = async (e: React.MouseEvent, ticketId: string) => {
    e.stopPropagation(); // prevent selecting the ticket
    if (!window.confirm('Are you sure you want to delete this booking? This will remove all chats, files, and logs associated with it.')) return;
    try {
      await axios.delete(`/api/tickets/${ticketId}`);
      setTickets(prev => prev.filter(t => t._id !== ticketId));
      if (selectedTicket && selectedTicket._id === ticketId) {
        setSelectedTicket(null);
        setTicketDetails(null);
      }
    } catch (err) {
      console.error('Delete ticket error:', err);
      alert('Failed to delete ticket');
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

  // Fetch Active Ticket Details (Metadata + Timeline)
  const fetchActiveTicketDetails = async (id: string) => {
    try {
      const res = await axios.get(`/api/tickets/${id}`);
      setTicketDetails(res.data.ticket);
      setTimeline(res.data.timeline);
      setPdfHistory(res.data.ticket.pdfHistory || []);
      setNewStatus(res.data.ticket.status);
    } catch (err) {
      console.error('Error fetching ticket details:', err);
    }
  };

  useEffect(() => {
    fetchTickets();
    fetchNotifications();
  }, []);

  useEffect(() => {
    if (selectedTicket) {
      fetchActiveTicketDetails(selectedTicket._id);
    }
  }, [selectedTicket]);

  // Socket triggers for real-time ticket updates
  useEffect(() => {
    if (socket) {
      socket.on('new_ticket_submitted', (data: any) => {
        fetchTickets();
        fetchNotifications();
        showToast(`New booking submitted by ${data.employeeName || 'Employee'}`, 'success', 'New Booking', data.ticketId);
      });

      socket.on('ticket_status_updated', (data: any) => {
        fetchTickets();
        if (selectedTicket && selectedTicket._id === data.ticketId) {
          fetchActiveTicketDetails(selectedTicket._id);
        }
      });

      socket.on('ticket_pdf_uploaded', (data: any) => {
        fetchTickets();
        if (selectedTicket && selectedTicket._id === data.ticketId) {
          fetchActiveTicketDetails(selectedTicket._id);
        }
      });

      socket.on('message_received', (data: any) => {
        fetchTickets();
        if (selectedTicket && selectedTicket._id === data.ticketId) {
          fetchActiveTicketDetails(selectedTicket._id);
        }
        const msg = data.message;
        if (msg && msg.senderId !== user?.id && msg.senderRole === 'employee') {
          showToast(msg.message.text || 'Sent an attachment', 'info', `Message from ${msg.senderName}`, data.ticketId);
        }
      });

      socket.on('ticket_deleted', (data: any) => {
        fetchTickets();
        showToast(data.message, 'error', 'Booking Deleted');
        if (selectedTicket && selectedTicket._id === data.ticketId) {
          setSelectedTicket(null);
          setTicketDetails(null);
        }
      });
    }

    return () => {
      if (socket) {
        socket.off('new_ticket_submitted');
        socket.off('ticket_status_updated');
        socket.off('ticket_pdf_uploaded');
        socket.off('message_received');
        socket.off('ticket_deleted');
      }
    };
  }, [socket, selectedTicket, user]);

  // Handle Admin Status Transition change
  const handleStatusChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !newStatus) return;

    setStatusLoading(true);
    try {
      await axios.put(`/api/tickets/${selectedTicket._id}/status`, {
        status: newStatus,
        comment: statusComment
      });
      setStatusComment('');
      await fetchTickets(selectedTicket._id);
      
      if (newStatus === 'Completed') {
        setActiveTab('files');
      }

      alert(`Ticket status updated to "${newStatus}"`);
    } catch (err) {
      console.error('Status transition error:', err);
      alert('Failed to update status');
    } finally {
      setStatusLoading(false);
    }
  };

  // Handle PDF Official Ticket Upload
  const handlePdfUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !pdfFile) return;

    setPdfLoading(true);
    const formData = new FormData();
    formData.append('pdf', pdfFile);

    try {
      await axios.post(`/api/tickets/${selectedTicket._id}/upload-pdf`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setPdfFile(null);
      await fetchTickets(selectedTicket._id);
      
      // Redirect back to chat and info view
      setShowAnalytics(false);
      setActiveTab('info');

      alert('Official ticket PDF uploaded and dispatched.');
    } catch (err) {
      console.error('PDF upload error:', err);
      alert('Upload failed. Only PDFs under 10MB are accepted.');
    } finally {
      setPdfLoading(false);
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

  // Handle notification click: selects ticket conversation
  const handleSelectTicketFromNotification = (ticketId: string) => {
    const target = tickets.find(t => t._id === ticketId);
    if (target) {
      setSelectedTicket(target);
      setShowAnalytics(false);
    }
  };

  // Search & Filter computation
  const filteredTickets = tickets.filter(t => {
    // Status filter
    if (statusFilter !== 'All' && t.status !== statusFilter) {
      return false;
    }
    // Search query matches clientName1, clientName2, or phone
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        (t.clientName1 && t.clientName1.toLowerCase().includes(q)) ||
        (t.clientName2 && t.clientName2.toLowerCase().includes(q)) ||
        (t.mobileNumber && t.mobileNumber.includes(q))
      );
    }
    return true;
  });

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Export tickets register directly as CSV download
  const handleExportCSV = () => {
    if (tickets.length === 0) return;
    
    const headers = ['Primary Client Name', 'Secondary Client Name', 'Gothram', 'Mobile Number', "Booker's Date", 'Booked Date', 'Time Slot', 'Payment Status', 'Booking Status', 'Assigned Employee', 'Created At'];
    const rows = tickets.map(t => [
      `"${t.clientName1 || ''}"`,
      `"${t.clientName2 || ''}"`,
      `"${t.gothram || ''}"`,
      `"${t.mobileNumber || ''}"`,
      `"${formatDate(t.bookersDate)}"`,
      `"${formatDate(t.bookedDate)}"`,
      `"${t.timeSlot || ''}"`,
      `"${t.paymentStatus || ''}"`,
      `"${t.status || ''}"`,
      `"${t.employeeId?.username || ''}"`,
      `"${new Date(t.createdAt).toDateString()}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `temple_bookings_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Compute analytics numbers
  const getAnalytics = () => {
    const total = tickets.length;
    const waiting = tickets.filter(t => t.status === 'Waiting for Admin').length;
    const processing = tickets.filter(t => t.status === 'Processing').length;
    const completed = tickets.filter(t => t.status === 'Completed').length;
    const cancelled = tickets.filter(t => t.status === 'Cancelled').length;
    const phonePe = tickets.filter(t => t.paymentStatus === 'Paid by PhonePe').length;
    const cash = tickets.filter(t => t.paymentStatus === 'Paid by Cash').length;

    // Group bookings by time slot
    const slotCount: { [key: string]: number } = {};
    tickets.forEach(t => {
      if (t.timeSlot) {
        slotCount[t.timeSlot] = (slotCount[t.timeSlot] || 0) + 1;
      }
    });

    // Group by Employee performance
    const employeeCount: { [key: string]: number } = {};
    tickets.forEach(t => {
      const emp = t.employeeId?.username || 'System';
      employeeCount[emp] = (employeeCount[emp] || 0) + 1;
    });

    return { total, waiting, processing, completed, cancelled, phonePe, cash, slotCount, employeeCount };
  };

  const stats = getAnalytics();

  return (
    <div className="app-container">
      <Navbar 
        unreadNotifications={unreadNotifications} 
        onToggleNotifications={() => setShowNotifDrawer(true)} 
        title="Admin Portal - Temple Bookings Desk"
      />

      <div className="main-content">
        {/* ==========================================
            LEFT SIDEBAR (WhatsApp Conversations List)
            ========================================== */}
        <div className="whatsapp-sidebar">
          {/* Sidebar Header controls */}
          <div style={styles.sidebarHeader}>
            <div style={styles.sidebarActions}>
              <h3 style={styles.sidebarTitle}>Conversations</h3>
              <button 
                onClick={() => setShowAnalytics(!showAnalytics)} 
                style={{
                  ...styles.sidebarActionBtn,
                  color: showAnalytics ? 'var(--accent-hover)' : '#aebac1'
                }}
                title={showAnalytics ? "Close Analytics" : "View Dashboard Analytics"}
              >
                <BarChart2 size={20} />
              </button>
            </div>
            
            {/* Search Bar */}
            <div style={styles.searchContainer}>
              <Search size={18} style={styles.searchIcon} />
              <input
                type="text"
                className="form-input"
                placeholder="Search name, phone or temple..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={styles.searchInput}
              />
            </div>
          </div>

          {/* Status filter tabs */}
          <div style={styles.filtersBar}>
            {['All', 'Waiting for Admin', 'Processing', 'Ticket Generated', 'Completed', 'Draft', 'Cancelled'].map((f) => (
              <button
                key={f}
                onClick={() => { setStatusFilter(f); setShowAnalytics(false); }}
                style={{
                  ...styles.filterTab,
                  backgroundColor: statusFilter === f ? 'var(--accent-light)' : 'transparent',
                  color: statusFilter === f ? 'var(--accent-color)' : '#8696a0',
                  borderColor: statusFilter === f ? 'var(--accent-color)' : 'transparent'
                }}
              >
                {f.replace('Waiting for Admin', 'Requests').replace('Ticket Generated', 'Generated')}
              </button>
            ))}
          </div>

          {/* Conversations Scroll area */}
          <div style={styles.conversationsList}>
            {filteredTickets.length === 0 ? (
              <div style={styles.emptySidebar}>
                <AlertCircle size={32} style={{ color: '#3b4a54', marginBottom: '8px' }} />
                <span style={{ color: '#8696a0', fontSize: '0.82rem' }}>No conversations match filters</span>
              </div>
            ) : (
              filteredTickets.map((ticket) => {
                const isActive = selectedTicket && selectedTicket._id === ticket._id;
                
                return (
                  <div
                    key={ticket._id}
                    onClick={() => { setSelectedTicket(ticket); setShowAnalytics(false); }}
                    style={{
                      ...styles.convoItem,
                      backgroundColor: isActive ? '#2a3942' : 'transparent',
                    }}
                  >
                    <div style={styles.convoAvatar}>
                      <span style={{ fontSize: '18px' }}>🛕</span>
                    </div>
                    
                    <div style={styles.convoContent}>
                      <div style={styles.convoRow}>
                        <span style={styles.convoName}>{ticket.clientName1} & {ticket.clientName2}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={styles.convoTime}>
                            {new Date(ticket.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <button
                            onClick={(e) => handleDeleteTicket(e, ticket._id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#ef4444',
                              cursor: 'pointer',
                              padding: '2px',
                              display: 'flex',
                              alignItems: 'center',
                              borderRadius: '4px',
                            }}
                            title="Delete Booking"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                      
                      <div style={styles.convoRow}>
                        <span style={styles.convoTemple}>Booked: {formatDate(ticket.bookedDate)}</span>
                        <span className={`status-badge status-${ticket.status.toLowerCase().replace(/\s+/g, '')}`} style={{ fontSize: '0.62rem', padding: '1px 6px' }}>
                          {ticket.status}
                        </span>
                      </div>

                      <div style={styles.convoRow} className="convo-preview">
                        <span style={styles.latestMsgPreview}>
                          Gothram: {ticket.gothram || 'N/A'} | Slot: {ticket.timeSlot}
                        </span>
                        {ticket.status === 'Waiting for Admin' && (
                          <span style={styles.waitingDot} title="Action required" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ==========================================
            CENTER PANEL (Chat Window or Analytics Panel)
            ========================================== */}
        <div className="whatsapp-chat-area">
          {showAnalytics ? (
            /* EXECUTIVE ANALYTICS DASHBOARD */
            <div style={styles.analyticsPanel}>
              <div style={styles.analyticsHeader}>
                <div>
                  <h2 style={styles.analyticsTitle}>Analytics & Performance</h2>
                  <p style={{ color: '#8696a0', fontSize: '0.88rem', marginTop: '4px' }}>
                    Real-time metrics of registrations, bookings, and operator activities.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button onClick={handleExportCSV} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                    <DownloadCloud size={16} /> Export CSV
                  </button>
                  <button onClick={() => setShowAnalytics(false)} style={styles.closeAnalyticsBtn}>
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Stats row */}
              <div style={styles.statsRow}>
                <div className="glass-panel" style={styles.statBox}>
                  <span style={styles.statLabel}>Total Bookings</span>
                  <h3 style={{ ...styles.statValue, color: '#e9edef' }}>{stats.total}</h3>
                </div>
                <div className="glass-panel" style={styles.statBox}>
                  <span style={styles.statLabel}>Processing</span>
                  <h3 style={{ ...styles.statValue, color: 'var(--status-processing)' }}>{stats.processing}</h3>
                </div>
                <div className="glass-panel" style={styles.statBox}>
                  <span style={styles.statLabel}>Completed Bookings</span>
                  <h3 style={{ ...styles.statValue, color: 'var(--status-completed)' }}>{stats.completed}</h3>
                </div>
                <div className="glass-panel" style={styles.statBox}>
                  <span style={styles.statLabel}>PhonePe Payments</span>
                  <h3 style={{ ...styles.statValue, color: '#a78bfa' }}>{stats.phonePe}</h3>
                </div>
                <div className="glass-panel" style={styles.statBox}>
                  <span style={styles.statLabel}>Cash Payments</span>
                  <h3 style={{ ...styles.statValue, color: '#e9b10a' }}>{stats.cash}</h3>
                </div>
              </div>

              {/* Graphs / Tables split */}
              <div style={styles.chartsSplit}>
                <div className="glass-panel" style={styles.chartCard}>
                  <h4 style={styles.chartTitle}>Bookings by Time Slot</h4>
                  <div style={styles.chartList}>
                    {Object.keys(stats.slotCount).length === 0 ? (
                      <p style={{ color: '#8696a0', fontSize: '0.85rem' }}>No bookings recorded yet.</p>
                    ) : (
                      Object.keys(stats.slotCount).map(slot => {
                        const count = stats.slotCount[slot];
                        const percentage = Math.round((count / stats.total) * 100);
                        return (
                          <div key={slot} style={styles.chartBarRow}>
                            <div style={styles.chartBarLabel}>
                              <span>{slot}</span>
                              <span>{count} ({percentage}%)</span>
                            </div>
                            <div style={styles.barContainer}>
                              <div style={{ ...styles.barFill, width: `${percentage}%`, backgroundColor: '#34b7f1' }} />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="glass-panel" style={styles.chartCard}>
                  <h4 style={styles.chartTitle}>Employee Activity Rankings</h4>
                  <div style={styles.chartList}>
                    {Object.keys(stats.employeeCount).length === 0 ? (
                      <p style={{ color: '#8696a0', fontSize: '0.85rem' }}>No employee records found.</p>
                    ) : (
                      Object.keys(stats.employeeCount).map(emp => {
                        const count = stats.employeeCount[emp];
                        const percentage = Math.round((count / stats.total) * 100);
                        return (
                          <div key={emp} style={styles.chartBarRow}>
                            <div style={styles.chartBarLabel}>
                              <span>{emp}</span>
                              <span>{count} bookings</span>
                            </div>
                            <div style={styles.barContainer}>
                              <div style={{ ...styles.barFill, width: `${percentage}%`, backgroundColor: '#a78bfa' }} />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : selectedTicket ? (
            /* REAL-TIME ACTIVE CHATROOM */
            <ChatArea
              ticketId={selectedTicket._id}
              recipientId={selectedTicket.employeeId?._id || selectedTicket.employeeId}
              recipientName={selectedTicket.employeeId?.username || 'Employee'}
              recipientRole="employee"
              ticketStatus={selectedTicket.status}
            />
          ) : (
            /* EMPTY CHAT SCREEN */
            <div style={styles.emptyChatCenter}>
              <div style={styles.emptyBrand}>
                <span style={{ fontSize: '64px', marginBottom: '16px' }}>🛕</span>
                <h1 style={styles.emptyTitle}>Temple Ticket Desk</h1>
                <p style={styles.emptySubtitle}>
                  Select a client ticket conversation from the left sidebar to start managing the booking workflow and chatting.
                </p>
                <div style={styles.emptyBadge}>
                  <Shield size={14} /> Admin Secure Connection
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ==========================================
            RIGHT SIDEBAR (Permanent Ticket Details / Timeline / Upload PDF)
            ========================================== */}
        {selectedTicket && ticketDetails && (
          <div className="whatsapp-detail-panel">
            {/* Panel Tabs */}
            <div style={styles.detailTabs}>
              <button 
                onClick={() => setActiveTab('info')} 
                style={{
                  ...styles.detailTabBtn,
                  borderBottomColor: activeTab === 'info' ? 'var(--accent-color)' : 'transparent',
                  color: activeTab === 'info' ? 'var(--accent-color)' : '#8696a0'
                }}
              >
                Booking Details
              </button>
              <button 
                onClick={() => setActiveTab('timeline')} 
                style={{
                  ...styles.detailTabBtn,
                  borderBottomColor: activeTab === 'timeline' ? 'var(--accent-color)' : 'transparent',
                  color: activeTab === 'timeline' ? 'var(--accent-color)' : '#8696a0'
                }}
              >
                Audit Timeline
              </button>
              <button 
                onClick={() => setActiveTab('files')} 
                style={{
                  ...styles.detailTabBtn,
                  borderBottomColor: activeTab === 'files' ? 'var(--accent-color)' : 'transparent',
                  color: activeTab === 'files' ? 'var(--accent-color)' : '#8696a0'
                }}
              >
                Ticket PDFs ({pdfHistory.length})
              </button>
            </div>

            <div style={styles.detailBody}>
              {/* TAB 1: BOOKING INFO */}
              {activeTab === 'info' && (
                <div style={styles.infoTab}>
                  <div style={styles.infoSection}>
                    <h4 style={styles.detailSectionTitle}>Client Details</h4>
                    <div style={styles.infoGrid}>
                      <div style={styles.infoItem}>
                        <span style={styles.infoLabel}>Primary Client</span>
                        <span style={styles.infoValue}>{ticketDetails.clientName1}</span>
                      </div>
                      <div style={styles.infoItem}>
                        <span style={styles.infoLabel}>Secondary Client</span>
                        <span style={styles.infoValue}>{ticketDetails.clientName2}</span>
                      </div>
                      <div style={styles.infoItem}>
                        <span style={styles.infoLabel}>Gothram</span>
                        <span style={styles.infoValue}>{ticketDetails.gothram || 'Not specified'}</span>
                      </div>
                      <div style={styles.infoItem}>
                        <span style={styles.infoLabel}>Mobile</span>
                        <span style={styles.infoValue}>{ticketDetails.mobileNumber || 'Not specified'}</span>
                      </div>
                    </div>
                  </div>

                  <div style={styles.infoSection}>
                    <h4 style={styles.detailSectionTitle}>Darshan Details</h4>
                    <div style={styles.infoGrid}>
                      <div style={styles.infoItem}>
                        <span style={styles.infoLabel}>Booker's Date</span>
                        <span style={styles.infoValue}>{formatDate(ticketDetails.bookersDate)}</span>
                      </div>
                      <div style={styles.infoItem}>
                        <span style={styles.infoLabel}>Booked Date</span>
                        <span style={styles.infoValue}>{formatDate(ticketDetails.bookedDate)}</span>
                      </div>
                      <div style={{ ...styles.infoItem, gridColumn: 'span 2' }}>
                        <span style={styles.infoLabel}>Time Slot</span>
                        <span style={styles.infoValue}>{ticketDetails.timeSlot}</span>
                      </div>
                    </div>
                  </div>

                  <div style={styles.infoSection}>
                    <h4 style={styles.detailSectionTitle}>Platform Meta</h4>
                    <div style={styles.infoGrid}>
                      <div style={styles.infoItem}>
                        <span style={styles.infoLabel}>Agent</span>
                        <span style={styles.infoValue}>@{ticketDetails.employeeId?.username}</span>
                      </div>
                      <div style={styles.infoItem}>
                        <span style={styles.infoLabel}>Payment</span>
                        <span className={`status-badge ${ticketDetails.paymentStatus?.startsWith('Paid') ? 'status-completed' : 'status-waiting'}`} style={{ marginTop: '4px' }}>
                          {ticketDetails.paymentStatus}
                        </span>
                      </div>
                    </div>
                  </div>



                  {/* Workflow State Triggers */}
                  <div style={styles.workflowSection}>
                    <h4 style={styles.detailSectionTitle}>Status Control</h4>
                    
                    <form onSubmit={handleStatusChangeSubmit} style={styles.statusForm}>
                      <div style={{ marginBottom: '12px' }}>
                        <select
                          className="form-select"
                          value={newStatus}
                          onChange={(e) => {
                            const val = e.target.value;
                            setNewStatus(val);
                            if (val === 'Completed') {
                              setActiveTab('files');
                            }
                          }}
                        >
                          <option value="Waiting for Admin">Waiting for Admin</option>
                          <option value="Processing">Processing</option>
                          <option value="Completed">Completed</option>
                        </select>
                      </div>

                      <div style={{ marginBottom: '12px' }}>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Optional audit comment..."
                          value={statusComment}
                          onChange={(e) => setStatusComment(e.target.value)}
                        />
                      </div>

                      <button 
                        type="submit" 
                        className="btn-primary" 
                        style={{ width: '100%', padding: '10px' }}
                        disabled={statusLoading}
                      >
                        {statusLoading ? 'Updating...' : 'Update Status'}
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {/* TAB 2: AUDIT TIMELINE */}
              {activeTab === 'timeline' && (
                <div style={styles.timelineTab}>
                  <h4 style={styles.detailSectionTitle}>Workflow Log</h4>
                  
                  <div style={styles.timelineContainer}>
                    {timeline.length === 0 ? (
                      <p style={{ color: '#8696a0', fontSize: '0.82rem' }}>No activity records found.</p>
                    ) : (
                      timeline.map((log, index) => (
                        <div key={log._id} style={styles.timelineItem}>
                          <div style={styles.timelineDot} />
                          <div style={styles.timelineContent}>
                            <div style={styles.timelineMeta}>
                              <span style={styles.timelineUser}>@{log.userId?.username}</span>
                              <span style={styles.timelineTime}>{formatDateTime(log.createdAt)}</span>
                            </div>
                            <span style={styles.timelineAction}>{log.action}</span>
                            {log.statusBefore && log.statusAfter && (
                              <div style={styles.timelineStateTransition}>
                                <span style={{ color: '#8696a0' }}>{log.statusBefore}</span>
                                <ChevronRight size={12} style={{ color: '#8696a0', margin: '0 4px' }} />
                                <span style={{ color: 'var(--accent-color)', fontWeight: '600' }}>{log.statusAfter}</span>
                              </div>
                            )}
                            {log.comment && <p style={styles.timelineComment}>"{log.comment}"</p>}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: TICKET PDF UPLOADS */}
              {activeTab === 'files' && (
                <div style={styles.filesTab}>
                  {/* Upload Form area */}
                  <div style={styles.uploadArea}>
                    <h4 style={styles.detailSectionTitle}>Upload Official Ticket</h4>
                    <p style={{ color: '#8696a0', fontSize: '0.78rem', marginBottom: '12px' }}>
                      Once confirmed and booked at the temple, upload the official PDF. It will immediately alert the employee.
                    </p>
                    
                    <form onSubmit={handlePdfUploadSubmit} style={styles.uploadForm}>
                      <div style={styles.fileInputWrapper}>
                        <input
                          type="file"
                          accept=".pdf"
                          id="pdfUploadInput"
                          style={{ display: 'none' }}
                          onChange={(e) => e.target.files && setPdfFile(e.target.files[0])}
                        />
                        <label htmlFor="pdfUploadInput" style={styles.fileInputLabel}>
                          <FileUp size={20} style={{ color: 'var(--accent-color)', marginBottom: '6px' }} />
                          <span style={{ fontSize: '0.85rem' }}>
                            {pdfFile ? pdfFile.name : 'Select PDF File'}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: '#667781', marginTop: '2px' }}>
                            Max 10MB
                          </span>
                        </label>
                      </div>
                      
                      {pdfFile && (
                        <div style={styles.uploadFormActions}>
                          <button 
                            type="button" 
                            onClick={() => setPdfFile(null)} 
                            className="btn-secondary"
                            style={{ padding: '8px', flex: 1 }}
                          >
                            Clear
                          </button>
                          <button 
                            type="submit" 
                            className="btn-primary"
                            style={{ padding: '8px', flex: 1 }}
                            disabled={pdfLoading}
                          >
                            {pdfLoading ? 'Uploading...' : 'Upload'}
                          </button>
                        </div>
                      )}
                    </form>
                  </div>

                  {/* PDF History List */}
                  <div style={{ marginTop: '20px' }}>
                    <h4 style={styles.detailSectionTitle}>PDF Version Audit</h4>
                    
                    {pdfHistory.length === 0 ? (
                      <div style={styles.emptyPdfState}>
                        <span style={{ fontSize: '24px' }}>📁</span>
                        <p style={{ color: '#8696a0', fontSize: '0.8rem', marginTop: '8px' }}>
                          No official tickets uploaded yet
                        </p>
                      </div>
                    ) : (
                      <div style={styles.pdfList}>
                        {pdfHistory.map((pdf, index) => (
                          <div key={pdf._id || index} style={styles.pdfItem}>
                            <div style={styles.pdfMeta}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={styles.pdfVersion}>Version {pdf.version}</span>
                                <span style={styles.pdfDate}>{formatDateTime(pdf.uploadedAt)}</span>
                              </div>
                              <span style={styles.pdfName}>{pdf.fileName}</span>
                              <span style={styles.pdfSize}>{formatFileSize(pdf.fileSize)} | uploaded by @{pdf.uploadedBy?.username}</span>
                            </div>
                            <a 
                              href={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${pdf.pdfPath}`}
                              download={pdf.fileName}
                              target="_blank"
                              rel="noreferrer"
                              style={styles.pdfDownloadBtn}
                              title="Download PDF"
                            >
                              <Download size={14} /> Download
                            </a>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Notifications Drawer */}
      <NotificationDrawer 
        isOpen={showNotifDrawer} 
        onClose={() => setShowNotifDrawer(false)} 
        notifications={notifications} 
        onMarkRead={handleMarkNotificationsRead}
        onSelectTicket={handleSelectTicketFromNotification}
      />

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
                    setShowAnalytics(false);
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
  sidebarHeader: {
    padding: '12px 16px',
    backgroundColor: '#202c33',
    borderBottom: '1px solid rgba(134, 150, 160, 0.08)',
  },
  sidebarActions: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
  },
  sidebarTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.15rem',
    fontWeight: '600',
    color: '#e9edef',
  },
  sidebarActionBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '6px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  searchIcon: {
    position: 'absolute',
    left: '12px',
    color: '#8696a0',
  },
  searchInput: {
    paddingLeft: '38px',
    paddingTop: '8px',
    paddingBottom: '8px',
    fontSize: '0.88rem',
    backgroundColor: '#2a3942',
    border: 'none',
  },
  filtersBar: {
    display: 'flex',
    padding: '8px 12px',
    gap: '6px',
    overflowX: 'auto',
    borderBottom: '1px solid rgba(134, 150, 160, 0.15)',
    backgroundColor: '#111b21',
  },
  filterTab: {
    padding: '4px 10px',
    fontSize: '0.72rem',
    fontWeight: '600',
    borderRadius: '12px',
    border: '1px solid transparent',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.2s',
  },
  conversationsList: {
    flex: 1,
    overflowY: 'auto',
    backgroundColor: '#111b21',
  },
  emptySidebar: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 16px',
    textAlign: 'center',
  },
  convoItem: {
    display: 'flex',
    padding: '12px 16px',
    gap: '12px',
    borderBottom: '1px solid rgba(134, 150, 160, 0.08)',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  convoAvatar: {
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    backgroundColor: '#202c33',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid rgba(255, 255, 255, 0.04)',
  },
  convoContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  convoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '4px',
  },
  convoName: {
    fontSize: '0.94rem',
    fontWeight: '600',
    color: '#e9edef',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    overflow: 'hidden',
  },
  convoTime: {
    fontSize: '0.72rem',
    color: '#8696a0',
  },
  convoTemple: {
    fontSize: '0.8rem',
    color: '#8696a0',
  },
  latestMsgPreview: {
    fontSize: '0.78rem',
    color: '#667781',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    overflow: 'hidden',
    maxWidth: '85%',
  },
  waitingDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#e9b10a',
  },
  emptyChatCenter: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    padding: '40px',
    background: 'radial-gradient(circle at center, rgba(0, 168, 132, 0.04) 0%, rgba(11, 20, 26, 0) 70%)',
  },
  emptyBrand: {
    textAlign: 'center',
    maxWidth: '460px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  emptyTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.8rem',
    fontWeight: '600',
    color: '#e9edef',
    marginBottom: '10px',
  },
  emptySubtitle: {
    fontSize: '0.88rem',
    color: '#8696a0',
    lineHeight: '1.5',
    marginBottom: '20px',
  },
  emptyBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 14px',
    backgroundColor: 'rgba(32, 44, 51, 0.7)',
    borderRadius: '20px',
    fontSize: '0.78rem',
    color: '#667781',
    border: '1px solid rgba(255, 255, 255, 0.05)',
  },
  detailTabs: {
    display: 'flex',
    borderBottom: '1px solid rgba(134, 150, 160, 0.15)',
    backgroundColor: '#202c33',
    position: 'sticky',
    top: 0,
    zIndex: 5,
  },
  detailTabBtn: {
    flex: 1,
    padding: '12px 6px',
    fontSize: '0.8rem',
    fontWeight: '600',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '3px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  detailBody: {
    padding: '20px',
  },
  detailSectionTitle: {
    fontSize: '0.8rem',
    fontWeight: '600',
    color: 'var(--accent-color)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '12px',
  },
  infoSection: {
    marginBottom: '24px',
    paddingBottom: '16px',
    borderBottom: '1px solid rgba(134, 150, 160, 0.08)',
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  },
  infoItem: {
    display: 'flex',
    flexDirection: 'column',
  },
  infoLabel: {
    fontSize: '0.75rem',
    color: '#8696a0',
    marginBottom: '2px',
  },
  infoValue: {
    fontSize: '0.88rem',
    fontWeight: '500',
    color: '#e9edef',
  },
  notesBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    padding: '10px 12px',
    borderRadius: '6px',
    border: '1px solid rgba(255, 255, 255, 0.03)',
    color: '#cbd5e1',
    fontSize: '0.82rem',
    lineHeight: '1.45',
    margin: 0,
  },
  workflowSection: {
    marginTop: '12px',
  },
  statusForm: {
    display: 'flex',
    flexDirection: 'column',
    marginTop: '8px',
  },
  timelineTab: {
    display: 'flex',
    flexDirection: 'column',
  },
  timelineContainer: {
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    paddingLeft: '16px',
    borderLeft: '2px solid rgba(134, 150, 160, 0.15)',
    marginTop: '10px',
    gap: '24px',
  },
  timelineItem: {
    position: 'relative',
  },
  timelineDot: {
    position: 'absolute',
    left: '-22px',
    top: '4px',
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    backgroundColor: 'var(--accent-color)',
    border: '2px solid #111b21',
  },
  timelineContent: {
    display: 'flex',
    flexDirection: 'column',
  },
  timelineMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '4px',
  },
  timelineUser: {
    fontSize: '0.78rem',
    fontWeight: '600',
    color: '#34b7f1',
  },
  timelineTime: {
    fontSize: '0.68rem',
    color: '#8696a0',
  },
  timelineAction: {
    fontSize: '0.85rem',
    color: '#e9edef',
    fontWeight: '500',
  },
  timelineStateTransition: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '0.75rem',
    marginTop: '4px',
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    padding: '2px 8px',
    borderRadius: '4px',
    width: 'fit-content',
  },
  timelineComment: {
    fontSize: '0.78rem',
    color: '#94a3b8',
    fontStyle: 'italic',
    marginTop: '6px',
    marginBottom: 0,
  },
  filesTab: {
    display: 'flex',
    flexDirection: 'column',
  },
  uploadArea: {
    backgroundColor: 'rgba(0, 168, 132, 0.05)',
    border: '1px dashed rgba(0, 168, 132, 0.3)',
    borderRadius: '8px',
    padding: '16px',
  },
  uploadForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  fileInputWrapper: {
    width: '100%',
  },
  fileInputLabel: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px 10px',
    backgroundColor: 'rgba(17, 27, 33, 0.6)',
    border: '1px solid rgba(134, 150, 160, 0.15)',
    borderRadius: '6px',
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'all 0.2s',
  },
  uploadFormActions: {
    display: 'flex',
    gap: '8px',
  },
  emptyPdfState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '30px 10px',
    backgroundColor: 'rgba(17, 27, 33, 0.3)',
    borderRadius: '6px',
    border: '1px solid rgba(134, 150, 160, 0.08)',
  },
  pdfList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginTop: '10px',
  },
  pdfItem: {
    backgroundColor: 'rgba(17, 27, 33, 0.6)',
    border: '1px solid rgba(134, 150, 160, 0.15)',
    borderRadius: '6px',
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  pdfMeta: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  pdfVersion: {
    fontSize: '0.72rem',
    fontWeight: '600',
    color: '#00a884',
    backgroundColor: 'rgba(0, 168, 132, 0.12)',
    padding: '1px 6px',
    borderRadius: '4px',
  },
  pdfDate: {
    fontSize: '0.68rem',
    color: '#8696a0',
  },
  pdfName: {
    fontSize: '0.82rem',
    fontWeight: '600',
    color: '#e9edef',
    wordBreak: 'break-all',
    marginTop: '4px',
  },
  pdfSize: {
    fontSize: '0.72rem',
    color: '#8696a0',
  },
  pdfDownloadBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    backgroundColor: 'rgba(52, 183, 241, 0.15)',
    color: '#34b7f1',
    border: 'none',
    borderRadius: '4px',
    padding: '6px',
    fontSize: '0.75rem',
    fontWeight: '600',
    textDecoration: 'none',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  analyticsPanel: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    padding: '24px',
    overflowY: 'auto',
    backgroundColor: '#0b141a',
  },
  analyticsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid rgba(134, 150, 160, 0.15)',
    paddingBottom: '18px',
    marginBottom: '24px',
  },
  analyticsTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.5rem',
    color: '#e9edef',
    fontWeight: '700',
  },
  closeAnalyticsBtn: {
    background: 'none',
    border: 'none',
    color: '#8696a0',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
  },
  statsRow: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap',
    marginBottom: '24px',
  },
  statBox: {
    flex: '1 1 180px',
    padding: '16px',
    border: '1px solid rgba(255, 255, 255, 0.05)',
  },
  statLabel: {
    fontSize: '0.75rem',
    color: '#8696a0',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  statValue: {
    fontSize: '1.5rem',
    fontWeight: '700',
    marginTop: '6px',
  },
  chartsSplit: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '20px',
  },
  chartCard: {
    padding: '20px',
    border: '1px solid rgba(255, 255, 255, 0.05)',
  },
  chartTitle: {
    fontSize: '0.94rem',
    fontWeight: '600',
    color: '#e9edef',
    marginBottom: '16px',
    fontFamily: 'var(--font-display)',
  },
  chartList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  chartBarRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  chartBarLabel: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.8rem',
    color: '#cbd5e1',
  },
  barContainer: {
    height: '6px',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: '3px',
  },
};

export default AdminDashboard;
