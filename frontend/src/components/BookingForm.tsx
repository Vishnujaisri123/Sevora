import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { X, Calendar, User, Phone, Clock, Trash2 } from 'lucide-react';

interface BookingFormData {
  clientName1: string;
  clientName2: string;
  gothram?: string;
  mobileNumber?: string;
  bookersDate: string;
  bookedDate: string;
  timeSlot: string;
  paymentStatus?: 'Draft' | 'Pending' | 'Paid' | 'Refunded';
}

interface BookingFormProps {
  initialData?: any;
  onSubmit: (data: BookingFormData) => void;
  onCancel: () => void;
  onDelete?: () => void;
  isLoading?: boolean;
}

const BookingForm: React.FC<BookingFormProps> = ({ initialData, onSubmit, onCancel, onDelete, isLoading }) => {
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<BookingFormData>({
    defaultValues: {
      clientName1: '',
      clientName2: '',
      gothram: '',
      mobileNumber: '',
      bookersDate: '',
      bookedDate: '',
      timeSlot: '06:00 AM - 07:00 AM',
      paymentStatus: 'Draft'
    }
  });

  useEffect(() => {
    if (initialData) {
      // Set values if editing
      setValue('clientName1', initialData.clientName1);
      setValue('clientName2', initialData.clientName2);
      setValue('gothram', initialData.gothram || '');
      setValue('mobileNumber', initialData.mobileNumber || '');
      
      // Format date strings for HTML date inputs: YYYY-MM-DD
      if (initialData.bookersDate) {
        const d = new Date(initialData.bookersDate);
        setValue('bookersDate', d.toISOString().split('T')[0]);
      }
      if (initialData.bookedDate) {
        const d = new Date(initialData.bookedDate);
        setValue('bookedDate', d.toISOString().split('T')[0]);
      }
      
      setValue('timeSlot', initialData.timeSlot);
      setValue('paymentStatus', initialData.paymentStatus || 'Draft');
    }
  }, [initialData, setValue]);

  // Styling override for larger form labels
  const labelStyle = {
    fontSize: '0.94rem',
    fontWeight: '600',
    color: '#e9edef',
    textTransform: 'none' as const, // override uppercase for cleaner look
    letterSpacing: 'normal'
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>{initialData ? 'Edit Booking' : 'New Ticket Booking'}</h3>
        <button type="button" onClick={onCancel} style={styles.closeBtn}>
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} style={styles.form}>
        {/* Client Names Section */}
        <div style={styles.row}>
          <div style={styles.field}>
            <label className="form-label" htmlFor="clientName1" style={labelStyle}>Primary Client Name *</label>
            <div style={styles.inputWrapper}>
              <User size={16} style={styles.inputIcon} />
              <input
                id="clientName1"
                type="text"
                className="form-input"
                placeholder="First client full name"
                style={{ paddingLeft: '38px' }}
                {...register('clientName1', { required: 'Primary client name is required' })}
              />
            </div>
            {errors.clientName1 && <span style={styles.errorText}>{errors.clientName1.message}</span>}
          </div>

          <div style={styles.field}>
            <label className="form-label" htmlFor="clientName2" style={labelStyle}>Secondary Client Name *</label>
            <div style={styles.inputWrapper}>
              <User size={16} style={styles.inputIcon} />
              <input
                id="clientName2"
                type="text"
                className="form-input"
                placeholder="Second client full name"
                style={{ paddingLeft: '38px' }}
                {...register('clientName2', { required: 'Secondary client name is required' })}
              />
            </div>
            {errors.clientName2 && <span style={styles.errorText}>{errors.clientName2.message}</span>}
          </div>
        </div>

        {/* Gothram & Optional Mobile Number */}
        <div style={styles.row}>
          <div style={styles.field}>
            <label className="form-label" htmlFor="gothram" style={labelStyle}>Gothram</label>
            <div style={styles.inputWrapper}>
              <span style={styles.inputIcon}><h4 style={{ fontSize: '14px', margin: 0 }}>📜</h4></span>
              <input
                id="gothram"
                type="text"
                className="form-input"
                placeholder="Family Gothram"
                style={{ paddingLeft: '38px' }}
                {...register('gothram')}
              />
            </div>
          </div>

          <div style={styles.field}>
            <label className="form-label" htmlFor="mobileNumber" style={labelStyle}>Mobile Number (Optional)</label>
            <div style={styles.inputWrapper}>
              <Phone size={16} style={styles.inputIcon} />
              <input
                id="mobileNumber"
                type="tel"
                className="form-input"
                placeholder="e.g. +91 9876543210"
                style={{ paddingLeft: '38px' }}
                {...register('mobileNumber', { 
                  pattern: { value: /^[+]?[0-9\s-]{10,15}$/, message: 'Invalid phone format' }
                })}
              />
            </div>
            {errors.mobileNumber && <span style={styles.errorText}>{errors.mobileNumber.message}</span>}
          </div>
        </div>

        {/* Booker's Date & Booked Date */}
        <div style={styles.row}>
          <div style={styles.field}>
            <label className="form-label" htmlFor="bookersDate" style={labelStyle}>Booker's Date *</label>
            <div style={styles.inputWrapper}>
              <input
                id="bookersDate"
                type="date"
                className="form-input"
                {...register('bookersDate', { 
                  required: "Booker's Date is required",
                  onChange: (e) => {
                    setValue('bookedDate', e.target.value);
                  }
                })}
              />
            </div>
            {errors.bookersDate && <span style={styles.errorText}>{errors.bookersDate.message}</span>}
          </div>

          <div style={styles.field}>
            <label className="form-label" htmlFor="bookedDate" style={labelStyle}>Booked Date *</label>
            <div style={styles.inputWrapper}>
              <input
                id="bookedDate"
                type="date"
                className="form-input"
                {...register('bookedDate', { required: 'Booked Date is required' })}
              />
            </div>
            {errors.bookedDate && <span style={styles.errorText}>{errors.bookedDate.message}</span>}
          </div>
        </div>

        {/* Time Selection Slot */}
        <div style={styles.field}>
          <label className="form-label" htmlFor="timeSlot" style={labelStyle}>Time Selection Slots *</label>
          <div style={styles.inputWrapper}>
            <Clock size={16} style={styles.inputIcon} />
            <select
              id="timeSlot"
              className="form-select"
              style={{ paddingLeft: '38px' }}
              {...register('timeSlot')}
            >
              <option value="06:00 AM - 07:00 AM">06:00 AM - 07:00 AM</option>
              <option value="07:00 AM - 08:00 AM">07:00 AM - 08:00 AM</option>
              <option value="08:00 AM - 09:00 AM">08:00 AM - 09:00 AM</option>
              <option value="09:00 AM - 10:00 AM">09:00 AM - 10:00 AM</option>
            </select>
          </div>
        </div>

        {initialData && (
          <div style={styles.field}>
            <label className="form-label" htmlFor="paymentStatus" style={labelStyle}>Payment Status</label>
            <select id="paymentStatus" className="form-select" {...register('paymentStatus')}>
              <option value="Draft">Draft</option>
              <option value="Pending">Pending</option>
              <option value="Paid">Paid</option>
              <option value="Refunded">Refunded</option>
            </select>
          </div>
        )}

        <div style={styles.footer}>
          {initialData && onDelete && (
            <button 
              type="button" 
              onClick={onDelete} 
              className="btn-danger"
              disabled={isLoading}
              style={{ marginRight: 'auto', padding: '10px 18px', fontSize: '0.88rem' }}
            >
              <Trash2 size={16} style={{ marginRight: '6px' }} /> Delete Ticket
            </button>
          )}
          
          <button 
            type="button" 
            onClick={onCancel} 
            className="btn-secondary"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="btn-primary"
            disabled={isLoading}
          >
            {isLoading ? 'Saving...' : (initialData ? 'Save Changes' : 'Create Booking')}
          </button>
        </div>
      </form>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    width: '100%',
  },
  header: {
    paddingBottom: '16px',
    borderBottom: '1px solid rgba(134, 150, 160, 0.15)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#e9edef',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#8696a0',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    paddingTop: '20px',
  },
  row: {
    display: 'flex',
    gap: '16px',
  },
  field: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: '14px',
    color: '#8696a0',
  },
  errorText: {
    color: '#ef4444',
    fontSize: '0.78rem',
    marginTop: '4px',
    fontWeight: '500',
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '10px',
    paddingTop: '16px',
    borderTop: '1px solid rgba(134, 150, 160, 0.15)',
  },
};

export default BookingForm;
