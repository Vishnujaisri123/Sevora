import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { X, User, Phone, Clock, Trash2, Calendar as CalIcon } from 'lucide-react';
import { AvailabilityCalendar } from './AvailabilityCalendar';

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
  activeAvailability?: any[]; // Dynamic slots metadata
}

const BookingForm: React.FC<BookingFormProps> = ({ 
  initialData, 
  onSubmit, 
  onCancel, 
  onDelete, 
  isLoading,
  activeAvailability = []
}) => {
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<BookingFormData>({
    defaultValues: {
      clientName1: '',
      clientName2: '',
      gothram: '',
      mobileNumber: '',
      bookersDate: '',
      bookedDate: '',
      timeSlot: '',
      paymentStatus: 'Draft'
    }
  });

  const [selectedDateVal, setSelectedDateVal] = useState<string>('');
  const [showCalendarPicker, setShowCalendarPicker] = useState<boolean>(false);



  useEffect(() => {
    if (initialData) {
      // Set values if editing
      setValue('clientName1', initialData.clientName1);
      setValue('clientName2', initialData.clientName2);
      setValue('gothram', initialData.gothram || '');
      setValue('mobileNumber', initialData.mobileNumber || '');
      
      // Format date strings for hidden inputs: YYYY-MM-DD
      if (initialData.bookersDate) {
        const d = new Date(initialData.bookersDate);
        const dateStr = d.toISOString().split('T')[0];
        setSelectedDateVal(dateStr);
        setValue('bookersDate', dateStr);
        setValue('bookedDate', dateStr);
      }
      
      setValue('paymentStatus', initialData.paymentStatus || 'Draft');
    }
  }, [initialData, setValue]);

  // Extract list of dates that are configured with slots
  const enabledDates = activeAvailability.map((a: any) => a.dateString);
  
  // Find slots for current selected date
  const selectedConfig = activeAvailability.find((a: any) => a.dateString === selectedDateVal);
  const availableSlots = selectedConfig ? selectedConfig.slots.filter((s: any) => s.active) : [];

  // Update form's selected slot when date changes
  useEffect(() => {
    if (selectedDateVal) {
      if (availableSlots.length > 0) {
        // Preserves existing time slot value if still valid, otherwise falls back to the first available
        const currentSlot = initialData?.timeSlot;
        const isStillAvailable = availableSlots.some((s: any) => s.time === currentSlot);
        setValue('timeSlot', isStillAvailable ? currentSlot : availableSlots[0].time);
      } else {
        setValue('timeSlot', '');
      }
    }
  }, [selectedDateVal, activeAvailability, setValue]);

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

        {/* Interactive Availability Calendar */}
        <div style={styles.field}>
          <label className="form-label" style={labelStyle}>Booking Date *</label>
          
          {enabledDates.length === 0 ? (
            <div style={styles.noDatesAlert}>
              ⚠️ No booking dates are currently available.
            </div>
          ) : (
            <>
              <div 
                style={styles.clickableField} 
                onClick={() => setShowCalendarPicker(!showCalendarPicker)}
              >
                <CalIcon size={16} style={styles.inputIcon} />
                <input
                  type="text"
                  readOnly
                  className="form-input"
                  style={{ paddingLeft: '38px', cursor: 'pointer' }}
                  value={selectedDateVal ? `${new Date(selectedDateVal).toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}` : 'Click to select booking date'}
                  placeholder="Click to select booking date"
                />
              </div>

              {/* Collapsible Calendar Picker */}
              {showCalendarPicker && (
                <div style={styles.calendarDropdownContainer}>
                  <AvailabilityCalendar 
                    mode="single"
                    selectedDate={selectedDateVal}
                    onChangeSelectedDate={(date) => {
                      setSelectedDateVal(date);
                      setValue('bookersDate', date, { shouldValidate: true });
                      setValue('bookedDate', date, { shouldValidate: true });
                      setShowCalendarPicker(false); // Close calendar picker on select
                    }}
                    availableDates={enabledDates}
                  />
                </div>
              )}
            </>
          )}

          {/* Hidden inputs to preserve standard react-hook-form bindings */}
          <input type="hidden" {...register('bookersDate', { required: 'Booking Date is required' })} />
          <input type="hidden" {...register('bookedDate', { required: 'Booking Date is required' })} />
          {errors.bookersDate && <span style={styles.errorText}>{errors.bookersDate.message}</span>}
        </div>



        {/* Time Selection Slot with availability filters */}
        <div style={styles.field}>
          <label className="form-label" htmlFor="timeSlot" style={labelStyle}>Time Selection Slots *</label>
          <div style={styles.inputWrapper}>
            <Clock size={16} style={styles.inputIcon} />
            
            {!selectedDateVal ? (
              <div style={styles.slotWarning}>
                Please select an available date on the calendar above.
              </div>
            ) : availableSlots.length === 0 ? (
              <div style={{ ...styles.slotWarning, color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)' }}>
                ⚠️ No time slots are available for the selected date.
              </div>
            ) : (
              <select
                id="timeSlot"
                className="form-select"
                style={{ paddingLeft: '38px' }}
                {...register('timeSlot', { required: 'Time slot selection is required' })}
              >
                {availableSlots.map((s: any) => (
                  <option key={s._id || s.time} value={s.time}>{s.time}</option>
                ))}
              </select>
            )}
          </div>
          {errors.timeSlot && <span style={styles.errorText}>{errors.timeSlot.message}</span>}
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
  clickableField: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer'
  },
  calendarDropdownContainer: {
    marginTop: '8px',
    backgroundColor: '#111b21',
    border: '1px solid rgba(134, 150, 160, 0.2)',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
    overflow: 'hidden',
    zIndex: 10
  },
  noDatesAlert: {
    width: '100%',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    padding: '12px 14px',
    borderRadius: '6px',
    fontSize: '0.88rem',
    color: '#ef4444',
    textAlign: 'center',
    fontWeight: '500'
  },
  selectedDateDetails: {
    backgroundColor: 'rgba(0, 168, 132, 0.04)',
    border: '1px solid rgba(0, 168, 132, 0.12)',
    borderRadius: '8px',
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginTop: '6px'
  },
  detailTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '0.9rem',
    fontWeight: '700',
    color: '#e9edef',
    borderBottom: '1px solid rgba(0, 168, 132, 0.1)',
    paddingBottom: '6px'
  },
  detailGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px 16px'
  },
  detailItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px'
  },
  detailLabel: {
    fontSize: '0.72rem',
    color: '#8696a0',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  detailVal: {
    fontSize: '0.85rem',
    color: '#e9edef',
    fontWeight: '600'
  },
  slotWarning: {
    width: '100%',
    backgroundColor: '#202c33',
    border: '1px solid rgba(134, 150, 160, 0.15)',
    padding: '10px 14px',
    borderRadius: '6px',
    fontSize: '0.88rem',
    color: '#8696a0',
    textAlign: 'center'
  }
};

export default BookingForm;
