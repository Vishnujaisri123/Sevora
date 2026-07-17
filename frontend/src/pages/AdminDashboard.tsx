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
  Trash2, Copy, IndianRupee, TrendingUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AvailabilityCalendar } from '../components/AvailabilityCalendar';

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
  const [statusFilter, setStatusFilter] = useState('Waiting for Admin');
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showNotifDrawer, setShowNotifDrawer] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'timeline' | 'files'>('info');

  // Status transition inputs
  const [newStatus, setNewStatus] = useState('');
  const [statusComment, setStatusComment] = useState('');
  const [statusLoading, setStatusLoading] = useState(false);

  // Edit Booking Dates states
  const [isEditingDates, setIsEditingDates] = useState(false);
  const [editBookersDate, setEditBookersDate] = useState('');
  const [editBookedDate, setEditBookedDate] = useState('');

  // Availability states
  const [showAvailability, setShowAvailability] = useState(false);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [availabilityData, setAvailabilityData] = useState<any[]>([]);
  const [slotsForSelectedDates, setSlotsForSelectedDates] = useState<{ [dateString: string]: Array<{ time: string, active: boolean }> }>({});
  const [customSlotTexts, setCustomSlotTexts] = useState<{ [dateString: string]: string }>({});

  // Fetch Availability Configurations
  const fetchAvailability = async () => {
    try {
      const res = await axios.get('/api/availability');
      setAvailabilityData(res.data.availability || []);
    } catch (err) {
      console.error('Error fetching availability:', err);
    }
  };

  // Sync slots for selected dates
  useEffect(() => {
    const updatedSlots = { ...slotsForSelectedDates };
    const DEFAULT_SLOTS = [
      { time: '06:00 AM - 07:00 AM', active: true },
      { time: '07:00 AM - 08:00 AM', active: true },
      { time: '08:00 AM - 09:00 AM', active: true },
      { time: '09:00 AM - 10:00 AM', active: true }
    ];

    selectedDates.forEach(date => {
      if (!updatedSlots[date]) {
        const existing = availabilityData.find(a => a.dateString === date);
        if (existing) {
          updatedSlots[date] = DEFAULT_SLOTS.map(dSlot => {
            const match = existing.slots.find((s: any) => s.time === dSlot.time);
            return {
              time: dSlot.time,
              active: match ? match.active : true
            };
          });
        } else {
          updatedSlots[date] = DEFAULT_SLOTS.map(s => ({ ...s }));
        }
      }
    });

    Object.keys(updatedSlots).forEach(key => {
      if (!selectedDates.includes(key)) {
        delete updatedSlots[key];
      }
    });

    setSlotsForSelectedDates(updatedSlots);
  }, [selectedDates, availabilityData]);

  // Batch Save availability
  const handleSaveAvailability = async () => {
    if (selectedDates.length === 0) return;
    const configs = selectedDates.map(date => ({
      dateString: date,
      slots: slotsForSelectedDates[date] || []
    }));

    try {
      await axios.post('/api/availability/save', { configs });
      showToast('Availability configurations saved successfully', 'success', 'Availability Saved');
      await fetchAvailability();
      setSelectedDates([]);
    } catch (err) {
      console.error('Error saving availability:', err);
      showToast('Failed to save availability', 'error', 'Error');
    }
  };

  // Delete/Clear single date availability configuration
  const handleClearAvailability = async (dateString: string) => {
    if (!window.confirm(`Are you sure you want to clear availability for ${dateString}?`)) return;
    try {
      await axios.delete(`/api/availability/${dateString}`);
      showToast(`Cleared availability for ${dateString}`, 'info', 'Availability Cleared');
      await fetchAvailability();
      setSelectedDates(prev => prev.filter(d => d !== dateString));
    } catch (err) {
      console.error('Error deleting availability:', err);
      showToast('Failed to clear availability', 'error', 'Error');
    }
  };

  // Toggle slot active state in edit
  const toggleSlotActive = (date: string, index: number) => {
    const updated = [...(slotsForSelectedDates[date] || [])];
    updated[index].active = !updated[index].active;
    setSlotsForSelectedDates(prev => ({ ...prev, [date]: updated }));
  };

  // Remove slot option in edit
  const removeSlotOption = (date: string, index: number) => {
    const updated = [...(slotsForSelectedDates[date] || [])];
    updated.splice(index, 1);
    setSlotsForSelectedDates(prev => ({ ...prev, [date]: updated }));
  };

  // Add custom slot in edit
  const addCustomSlot = (date: string) => {
    const text = customSlotTexts[date] || '';
    if (!text.trim()) return;
    const updated = [...(slotsForSelectedDates[date] || [])];
    if (updated.some(s => s.time === text.trim())) return;
    updated.push({ time: text.trim(), active: true });
    setSlotsForSelectedDates(prev => ({ ...prev, [date]: updated }));
    setCustomSlotTexts(prev => ({ ...prev, [date]: '' }));
  };

  // Duplicate slots configuration to all other selected dates
  const duplicateConfigToAll = (sourceDate: string) => {
    const sourceSlots = slotsForSelectedDates[sourceDate] || [];
    const updated = { ...slotsForSelectedDates };
    selectedDates.forEach(date => {
      updated[date] = sourceSlots.map(s => ({ ...s }));
    });
    setSlotsForSelectedDates(updated);
    showToast('Duplicated slots configuration to all selected dates', 'success', 'Slots Copied');
  };

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

  const fetchActiveTicketDetails = async (id: string) => {
    try {
      const res = await axios.get(`/api/tickets/${id}`);
      setTicketDetails(res.data.ticket);
      setTimeline(res.data.timeline);
      setPdfHistory(res.data.ticket.pdfHistory || []);
      setNewStatus(res.data.ticket.status);
      
      if (res.data.ticket.status !== 'Completed' && activeTab === 'files') {
        setActiveTab('info');
      }
    } catch (err) {
      console.error('Error fetching ticket details:', err);
    }
  };

  const toYYYYMMDD = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (e) {
      return '';
    }
  };

  const handleSaveDates = async () => {
    if (!ticketDetails) return;
    try {
      const res = await axios.put(`/api/tickets/${ticketDetails._id}`, {
        bookersDate: editBookersDate,
        bookedDate: editBookedDate
      });
      showToast('Booking dates updated successfully', 'success', 'Dates Updated');
      setTicketDetails(res.data);
      setIsEditingDates(false);
      fetchActiveTicketDetails(ticketDetails._id);
      fetchTickets();
    } catch (err) {
      console.error('Error updating booking dates:', err);
      showToast('Failed to update booking dates', 'error', 'Error');
    }
  };

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

  useEffect(() => {
    fetchTickets();
    fetchNotifications();
    fetchAvailability();
  }, []);

  useEffect(() => {
    if (selectedTicket) {
      fetchActiveTicketDetails(selectedTicket._id);
    }
  }, [selectedTicket]);

  // Automatically update ticket status to "Processing" when opened by Admin
  useEffect(() => {
    if (selectedTicket && selectedTicket.status === 'Waiting for Admin') {
      const autoTransitionToProcessing = async () => {
        try {
          await axios.put(`/api/tickets/${selectedTicket._id}/status`, {
            status: 'Processing',
            comment: 'Auto-transitioned to Processing upon ticket opening'
          });
          await fetchTickets(selectedTicket._id);
        } catch (err) {
          console.error('Error auto-updating status to Processing:', err);
        }
      };
      autoTransitionToProcessing();
    }
  }, [selectedTicket?._id, selectedTicket?.status]);

  // Automatically mark notifications read when selecting a ticket
  useEffect(() => {
    if (selectedTicket?._id && notifications.length > 0) {
      const ticketId = selectedTicket._id;
      const unreadIds = notifications
        .filter((n: any) => {
          const id = n.ticketId?._id || (typeof n.ticketId === 'string' ? n.ticketId : null);
          return !n.isRead && id === ticketId;
        })
        .map((n: any) => n._id);

      if (unreadIds.length > 0) {
        handleMarkNotificationsRead(unreadIds);
      }
    }
  }, [selectedTicket?._id, notifications]);

  // Socket triggers for real-time ticket updates
  useEffect(() => {
    if (socket) {
      socket.on('new_ticket_submitted', (data: any) => {
        fetchTickets();
        fetchNotifications();
        const cleanEmpName = cleanEmailToName(data.submittedBy);
        showToast(
          `New booking request by the client: ${data.clientName1 || data.clientName.split('&')[0].trim()}
employee Name : ${cleanEmpName}
client Names : ${data.clientName}
ticket Number : #${data.serialNumber}`, 
          'success', 
          'New Booking', 
          data.ticketId
        );
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
        const sender = data.senderId;
        const senderRole = sender?.role || data.senderRole;
        if (sender && sender._id !== user?.id && senderRole === 'employee') {
          const matchedTicket = tickets.find(t => t._id === data.ticketId);
          const clientName = matchedTicket ? `${matchedTicket.clientName1} & ${matchedTicket.clientName2}` : 'N/A';
          const msgText = data.messageType === 'file' 
            ? `Sent a file attachment: ${data.fileName || 'file'}`
            : data.content;

          const cleanSenderName = cleanEmailToName(sender.username);
          const formattedMessage = `💬 Message from ${cleanSenderName}
Message: "${msgText}"
Client: ${clientName}`;

          showToast(
            formattedMessage,
            'info',
            `💬 Message from ${cleanSenderName}`,
            data.ticketId
          );
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

      socket.on('availability_updated', () => {
        fetchAvailability();
      });
    }

    return () => {
      if (socket) {
        socket.off('new_ticket_submitted');
        socket.off('ticket_status_updated');
        socket.off('ticket_pdf_uploaded');
        socket.off('message_received');
        socket.off('ticket_deleted');
        socket.off('availability_updated');
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
      setShowAvailability(false);
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
      setShowAvailability(false);
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
        title="Admin Portal – Temple Bookings Desk"
        onToggleAvailability={() => {
          setShowAvailability(!showAvailability);
          setShowAnalytics(false);
          setSelectedTicket(null);
        }}
        showAvailability={showAvailability}
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
                onClick={() => { setShowAnalytics(!showAnalytics); setShowAvailability(false); setSelectedTicket(null); }} 
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
            {['Waiting for Admin', 'Processing', 'Completed', 'All'].map((f) => (
              <button
                key={f}
                onClick={() => { setStatusFilter(f); setShowAnalytics(false); setShowAvailability(false); }}
                style={{
                  ...styles.filterTab,
                  backgroundColor: statusFilter === f ? 'var(--accent-light)' : 'transparent',
                  color: statusFilter === f ? 'var(--accent-color)' : '#8696a0',
                  borderColor: statusFilter === f ? 'var(--accent-color)' : 'transparent'
                }}
              >
                {f.replace('Waiting for Admin', 'Requests')}
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
                    onClick={() => { setSelectedTicket(ticket); setShowAnalytics(false); setShowAvailability(false); }}
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
                        <span style={styles.convoName}>
                          {ticket.serialNumber && (
                            <span style={{ color: '#00e676', marginRight: '6px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                              #{ticket.serialNumber}
                            </span>
                          )}
                          {ticket.clientName1} & {ticket.clientName2}
                        </span>
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
                  <span style={styles.statLabel}>Total Money</span>
                  <h3 style={{ ...styles.statValue, color: '#00bcd4' }}>₹{stats.completed * 200}</h3>
                </div>
                <div className="glass-panel" style={styles.statBox}>
                  <span style={styles.statLabel}>Profit Breakdown</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '6px' }}>
                    <span style={{ fontSize: '0.85rem', color: '#e9edef', fontWeight: '500' }}>
                      Owner: <span style={{ color: '#ec407a', fontWeight: 'bold' }}>₹{stats.completed * 50}</span>
                    </span>
                    <span style={{ fontSize: '0.85rem', color: '#e9edef', fontWeight: '500' }}>
                      Doing: <span style={{ color: '#818cf8', fontWeight: 'bold' }}>₹{stats.completed * 20}</span>
                    </span>
                  </div>
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
          ) : showAvailability ? (
            /* TEMPLE AVAILABILITY MANAGEMENT PANEL */
            <div style={styles.availabilityPanel}>
              <div style={styles.analyticsHeader}>
                <div>
                  <h2 style={styles.analyticsTitle}>Temple Availability Management</h2>
                  <p style={{ color: '#8696a0', fontSize: '0.88rem', marginTop: '4px' }}>
                    Configure booking dates and time slots for employees.
                  </p>
                </div>
                <button onClick={() => setShowAvailability(false)} style={styles.closeAnalyticsBtn}>
                  <X size={20} />
                </button>
              </div>

              <div style={styles.availabilityGrid}>
                {/* Left Side: Calendar picker */}
                <div style={styles.calendarCol}>
                  <h3 style={styles.sectionHeading}>1. Select Booking Dates</h3>
                  <AvailabilityCalendar 
                    mode="multi"
                    selectedDates={selectedDates}
                    onChangeSelectedDates={setSelectedDates}
                    configuredDates={availabilityData.map(a => a.dateString)}
                  />
                </div>

                {/* Right Side: Slots config panel */}
                <div style={styles.slotsCol}>
                  <div style={styles.slotsColHeader}>
                    <h3 style={styles.sectionHeading}>2. Assign Time Slots</h3>
                    {selectedDates.length > 0 && (
                      <button 
                        onClick={handleSaveAvailability}
                        className="btn-primary"
                        style={{ padding: '8px 18px', fontSize: '0.88rem' }}
                      >
                        Save Configurations
                      </button>
                    )}
                  </div>

                  <div style={styles.selectedDatesList}>
                    {selectedDates.length === 0 ? (
                      <div style={styles.emptySlotsPrompt}>
                        <Calendar size={48} style={{ color: '#3b4a54', marginBottom: '12px' }} />
                        <p>No dates selected on the calendar.</p>
                        <span>Click one or more dates to start assigning slots.</span>
                      </div>
                    ) : (
                      selectedDates.map(date => {
                        const slots = slotsForSelectedDates[date] || [];
                        const customText = customSlotTexts[date] || '';
                        const dbConfig = availabilityData.find(a => a.dateString === date);
                        
                        return (
                          <div key={date} className="glass-panel" style={styles.dateConfigCard}>
                            <div style={styles.dateCardHeader}>
                              <div style={styles.dateCardTitle}>
                                <h4 style={styles.dateText}>
                                  {new Date(date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                                </h4>
                                {dbConfig && (
                                  <span style={styles.dbConfigBadge}>Active Config</span>
                                )}
                              </div>

                              <div style={styles.dateCardActions}>
                                <button 
                                  onClick={() => duplicateConfigToAll(date)}
                                  style={styles.cardActionBtn}
                                  title="Duplicate this configuration to all other selected dates"
                                >
                                  <Copy size={14} style={{ marginRight: '4px' }} /> Copy to All
                                </button>
                                {dbConfig && (
                                  <button 
                                    onClick={() => handleClearAvailability(date)}
                                    style={{ ...styles.cardActionBtn, color: '#ef4444' }}
                                    title="Delete/Clear configuration from Database"
                                  >
                                    <Trash2 size={14} /> Clear
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* List of slots with toggle active */}
                            <div style={styles.slotsGridList}>
                              {slots.map((s, idx) => (
                                <div key={idx} style={styles.slotOptionRow}>
                                  <label style={styles.slotCheckboxLabel}>
                                    <input 
                                      type="checkbox"
                                      checked={s.active}
                                      onChange={() => toggleSlotActive(date, idx)}
                                      style={styles.slotCheckbox}
                                    />
                                    <span style={{ 
                                      fontSize: '0.85rem', 
                                      color: s.active ? '#e9edef' : '#8696a0'
                                    }}>
                                      {s.time}
                                    </span>
                                  </label>
                                </div>
                              ))}
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
              serialNumber={selectedTicket.serialNumber}
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
                onClick={() => {
                  if (ticketDetails.status !== 'Completed') {
                    alert('Ticket status must be set to Completed before you can upload official ticket PDFs.');
                    return;
                  }
                  setActiveTab('files');
                }} 
                style={{
                  ...styles.detailTabBtn,
                  borderBottomColor: activeTab === 'files' ? 'var(--accent-color)' : 'transparent',
                  color: activeTab === 'files' ? 'var(--accent-color)' : '#8696a0',
                  opacity: ticketDetails.status !== 'Completed' ? 0.5 : 1,
                  cursor: ticketDetails.status !== 'Completed' ? 'not-allowed' : 'pointer'
                }}
                title={ticketDetails.status !== 'Completed' ? "Status must be Completed to upload PDF" : ""}
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <h4 style={{ ...styles.detailSectionTitle, margin: 0 }}>Darshan Details</h4>
                      {!isEditingDates ? (
                        <button
                          onClick={() => {
                            setEditBookersDate(toYYYYMMDD(ticketDetails.bookersDate));
                            setEditBookedDate(toYYYYMMDD(ticketDetails.bookedDate));
                            setIsEditingDates(true);
                          }}
                          style={styles.editDateBtn}
                        >
                          Edit
                        </button>
                      ) : (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={handleSaveDates} style={styles.saveDateBtn}>Save</button>
                          <button onClick={() => setIsEditingDates(false)} style={styles.cancelDateBtn}>Cancel</button>
                        </div>
                      )}
                    </div>
                    <div style={styles.infoGrid}>
                      <div style={styles.infoItem}>
                        <span style={styles.infoLabel}>Booker's Date</span>
                        {isEditingDates ? (
                          <input
                            type="date"
                            value={editBookersDate}
                            onChange={(e) => setEditBookersDate(e.target.value)}
                            style={styles.editDateInput}
                          />
                        ) : (
                          <span style={styles.infoValue}>{formatDate(ticketDetails.bookersDate)}</span>
                        )}
                      </div>
                      <div style={styles.infoItem}>
                        <span style={styles.infoLabel}>Booked Date</span>
                        {isEditingDates ? (
                          <input
                            type="date"
                            value={editBookedDate}
                            onChange={(e) => setEditBookedDate(e.target.value)}
                            style={styles.editDateInput}
                          />
                        ) : (
                          <span style={styles.infoValue}>{formatDate(ticketDetails.bookedDate)}</span>
                        )}
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
                        <span style={styles.infoLabel}>Serial Number</span>
                        <span style={styles.infoValue}>
                          <span style={{ color: '#00e676', fontWeight: 'bold' }}>
                            #{ticketDetails.serialNumber || 'N/A'}
                          </span>
                        </span>
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
                          }}
                        >
                          <option value="Waiting for Admin">Waiting for Admin</option>
                          <option value="Processing">Processing</option>
                          <option value="Completed">Completed</option>
                        </select>
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
        top: '24px',
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
              initial={{ opacity: 0, y: -50, scale: 0.9 }}
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
                    setShowAvailability(false);
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
              <p style={{ fontSize: '0.82rem', margin: 0, color: '#d1d7db', lineHeight: '1.4', whiteSpace: 'pre-line' }}>{toast.message}</p>
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
  editDateBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--accent-color)',
    fontSize: '0.78rem',
    fontWeight: '600',
    cursor: 'pointer',
    padding: '2px 6px',
    borderRadius: '4px',
    transition: 'background 0.2s',
  },
  saveDateBtn: {
    backgroundColor: 'var(--accent-color)',
    border: 'none',
    color: '#fff',
    fontSize: '0.75rem',
    fontWeight: '600',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: '4px',
  },
  cancelDateBtn: {
    backgroundColor: '#3b4a54',
    border: 'none',
    color: '#e9edef',
    fontSize: '0.75rem',
    fontWeight: '600',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: '4px',
  },
  editDateInput: {
    backgroundColor: '#2a3942',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '6px',
    color: '#e9edef',
    padding: '4px 8px',
    fontSize: '0.82rem',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
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
  deskHeader: {
    padding: '16px',
    borderBottom: '1px solid rgba(134, 150, 160, 0.15)',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    backgroundColor: '#0b141a',
  },
  deskTitle: {
    fontSize: '0.85rem',
    fontWeight: '700',
    color: '#8696a0',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  deskMenuBtn: {
    width: '100%',
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid rgba(134, 150, 160, 0.15)',
    fontSize: '0.88rem',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.2s ease',
    outline: 'none',
  },
  availabilityPanel: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    padding: '24px',
    overflowY: 'auto',
    backgroundColor: '#0b141a',
  },
  availabilityGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '24px',
    alignItems: 'start'
  },
  calendarCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  slotsCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  slotsColHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: '38px'
  },
  sectionHeading: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#e9edef',
    margin: 0
  },
  selectedDatesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    maxHeight: 'calc(100vh - 220px)',
    overflowY: 'auto',
    paddingRight: '4px'
  },
  emptySlotsPrompt: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 16px',
    backgroundColor: 'rgba(17, 27, 33, 0.3)',
    borderRadius: '12px',
    border: '1px dashed rgba(134, 150, 160, 0.15)',
    color: '#8696a0',
    textAlign: 'center'
  },
  dateConfigCard: {
    padding: '16px',
    backgroundColor: '#111b21',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  dateCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid rgba(134, 150, 160, 0.1)',
    paddingBottom: '8px'
  },
  dateCardTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  dateText: {
    fontSize: '0.94rem',
    fontWeight: '600',
    color: '#e9edef',
    margin: 0
  },
  dbConfigBadge: {
    fontSize: '0.68rem',
    backgroundColor: 'rgba(0, 168, 132, 0.12)',
    color: '#00a884',
    padding: '2px 8px',
    borderRadius: '8px',
    fontWeight: '600'
  },
  dateCardActions: {
    display: 'flex',
    gap: '8px'
  },
  cardActionBtn: {
    background: 'none',
    border: 'none',
    fontSize: '0.78rem',
    color: '#8696a0',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    transition: 'color 0.2s',
    padding: '2px 6px',
    borderRadius: '4px'
  },
  slotsGridList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    backgroundColor: 'rgba(17, 27, 33, 0.5)',
    padding: '10px',
    borderRadius: '8px',
    maxHeight: '160px',
    overflowY: 'auto'
  },
  slotOptionRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '4px 8px',
    backgroundColor: '#202c33',
    borderRadius: '6px'
  },
  slotCheckboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    cursor: 'pointer',
    userSelect: 'none' as const
  },
  slotCheckbox: {
    cursor: 'pointer',
    accentColor: '#00a884'
  },
  removeSlotBtn: {
    background: 'none',
    border: 'none',
    color: '#ef4444',
    cursor: 'pointer',
    opacity: 0.7,
    display: 'flex',
    alignItems: 'center',
    padding: '2px',
    transition: 'opacity 0.2s'
  },
  noSlotsText: {
    fontSize: '0.8rem',
    color: '#8696a0',
    textAlign: 'center',
    margin: '8px 0'
  },
  addSlotWrapper: {
    display: 'flex',
    gap: '8px'
  },
  addSlotInput: {
    flex: 1,
    padding: '6px 12px',
    fontSize: '0.85rem'
  },
  addSlotBtn: {
    padding: '6px 14px',
    fontSize: '0.82rem'
  }
};

export default AdminDashboard;
