import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { LogOut, Bell, Shield, User, X } from 'lucide-react';

interface NavbarProps {
  unreadNotifications: number;
  onToggleNotifications: () => void;
  title?: string;
}

const Navbar: React.FC<NavbarProps> = ({ unreadNotifications, onToggleNotifications, title }) => {
  const { user, logout, updateUser } = useAuth();
  const [showEditModal, setShowEditModal] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUsername) {
      setEditError('Username/Name is required');
      return;
    }
    setEditLoading(true);
    setEditError(null);
    try {
      const res = await axios.put('/api/auth/profile', {
        username: editUsername,
        email: editEmail
      });
      updateUser(res.data.user, res.data.token);
      setShowEditModal(false);
      alert('Profile updated successfully');
    } catch (err: any) {
      console.error('Update profile error:', err);
      setEditError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <header style={styles.header}>
      <div style={styles.brand}>
        <span style={styles.logo}>🛕</span>
        <div style={styles.brandText}>
          <h2 style={styles.brandName}>{title || 'Temple Ticket Platform'}</h2>
          <span style={styles.systemStatus}>• Connected</span>
        </div>
      </div>

      <div style={styles.actions}>
        {/* Real-time Notifications Bell */}
        <button 
          onClick={onToggleNotifications} 
          style={styles.actionBtn} 
          title="Notifications"
        >
          <div style={styles.bellWrapper}>
            <Bell size={20} />
            {unreadNotifications > 0 && (
              <span style={styles.badge}>{unreadNotifications}</span>
            )}
          </div>
        </button>

        <div style={styles.divider} />

        {/* User profile details */}
        {user && (
          <div style={styles.profile}>
            {user.avatar ? (
              <img src={user.avatar} alt={user.username} style={styles.avatar} />
            ) : (
              <div style={styles.avatarFallback}>
                {user.role === 'admin' ? <Shield size={16} /> : <User size={16} />}
              </div>
            )}
            
            <div style={styles.userInfo}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={styles.username}>{user.username}</span>
                <button
                  onClick={() => {
                    setEditUsername(user.username);
                    setEditEmail(user.email || '');
                    setEditError(null);
                    setShowEditModal(true);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '2px',
                    cursor: 'pointer',
                    color: '#8696a0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '4px',
                    transition: 'color 0.2s'
                  }}
                  title="Edit Profile Name"
                >
                  <User size={13} style={{ opacity: 0.7 }} />
                </button>
              </div>
              <span className={`status-badge ${user.role === 'admin' ? 'status-generated' : 'status-confirmed'}`} style={styles.roleBadge}>
                {user.role}
              </span>
            </div>
          </div>
        )}

        <button onClick={logout} style={styles.logoutBtn} title="Sign Out">
          <LogOut size={18} />
          <span style={styles.logoutText}>Sign Out</span>
        </button>
      </div>

      {showEditModal && (
        <div style={modalStyles.overlay}>
          <div className="glass-panel" style={modalStyles.card}>
            <div style={modalStyles.header}>
              <h3 style={modalStyles.title}>Edit Profile Settings</h3>
              <button 
                onClick={() => setShowEditModal(false)}
                style={modalStyles.closeBtn}
              >
                <X size={18} />
              </button>
            </div>
            
            {editError && (
              <div style={modalStyles.errorBox}>
                {editError}
              </div>
            )}
            
            <form onSubmit={handleSaveProfile} style={modalStyles.form}>
              <div style={modalStyles.inputGroup}>
                <label className="form-label" style={{ color: '#e9edef', fontSize: '0.88rem' }}>Username / Name</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  disabled={editLoading}
                  required
                />
              </div>

              <div style={modalStyles.inputGroup}>
                <label className="form-label" style={{ color: '#e9edef', fontSize: '0.88rem' }}>Email Address</label>
                <input 
                  type="email" 
                  className="form-input" 
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  disabled={editLoading}
                />
              </div>

              <div style={modalStyles.actions}>
                <button 
                  type="button" 
                  className="btn-secondary"
                  onClick={() => setShowEditModal(false)}
                  disabled={editLoading}
                  style={{ marginRight: '8px' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary"
                  disabled={editLoading}
                >
                  {editLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  header: {
    height: '60px',
    backgroundColor: '#202c33',
    borderBottom: '1px solid rgba(134, 150, 160, 0.15)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 24px',
    zIndex: 10,
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.25)',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  logo: {
    fontSize: '24px',
  },
  brandText: {
    display: 'flex',
    flexDirection: 'column',
  },
  brandName: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.05rem',
    fontWeight: '600',
    color: '#e9edef',
  },
  systemStatus: {
    color: '#00e676',
    fontSize: '0.72rem',
    fontWeight: '500',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  actionBtn: {
    background: 'none',
    border: 'none',
    color: '#aebac1',
    cursor: 'pointer',
    padding: '8px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
  },
  bellWrapper: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: '-6px',
    right: '-6px',
    backgroundColor: '#00a884',
    color: 'white',
    fontSize: '0.65rem',
    fontWeight: '700',
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: '24px',
    width: '1px',
    backgroundColor: 'rgba(134, 150, 160, 0.15)',
  },
  profile: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  avatar: {
    width: '34px',
    height: '34px',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '1px solid rgba(134, 150, 160, 0.3)',
  },
  avatarFallback: {
    width: '34px',
    height: '34px',
    borderRadius: '50%',
    backgroundColor: 'rgba(134, 150, 160, 0.15)',
    color: '#aebac1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  username: {
    fontSize: '0.88rem',
    fontWeight: '500',
    color: '#e9edef',
  },
  roleBadge: {
    fontSize: '0.65rem',
    padding: '1px 6px',
    borderRadius: '8px',
    marginTop: '2px',
  },
  logoutBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: 'transparent',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#f87171',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '0.82rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  logoutText: {
    display: 'inline',
  },
};

const modalStyles: { [key: string]: React.CSSProperties } = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    zIndex: 9999,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '20px',
  },
  card: {
    width: '100%',
    maxWidth: '400px',
    padding: '24px',
    backgroundColor: '#111b21',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '12px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  title: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#e9edef',
    margin: 0,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#8696a0',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
  },
  errorBox: {
    padding: '10px 14px',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: '6px',
    color: '#ef4444',
    fontSize: '0.82rem',
    marginBottom: '16px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '8px',
  }
};

export default Navbar;
