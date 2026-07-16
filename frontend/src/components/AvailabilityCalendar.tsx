import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalIcon } from 'lucide-react';
import { getTeluguDateInfo, type TeluguDateInfo } from '../utils/teluguCalendar';

interface AvailabilityCalendarProps {
  mode: 'single' | 'multi';
  // Single mode (Employee)
  selectedDate?: string; // YYYY-MM-DD
  onChangeSelectedDate?: (date: string) => void;
  availableDates?: string[]; // Array of YYYY-MM-DD
  
  // Multi mode (Admin)
  selectedDates?: string[]; // Array of YYYY-MM-DD
  onChangeSelectedDates?: (dates: string[]) => void;
  configuredDates?: string[]; // Dates that already have slots configured
}

export const AvailabilityCalendar: React.FC<AvailabilityCalendarProps> = ({
  mode,
  selectedDate,
  onChangeSelectedDate,
  availableDates = [],
  selectedDates = [],
  onChangeSelectedDates,
  configuredDates = []
}) => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewYear, setViewYear] = useState<number>(currentDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(currentDate.getMonth());
  const [hoveredDateInfo, setHoveredDateInfo] = useState<{ date: string; info: TeluguDateInfo } | null>(null);

  // Sync state if viewed dates change
  useEffect(() => {
    setViewYear(currentDate.getFullYear());
    setViewMonth(currentDate.getMonth());
  }, [currentDate]);

  // Format date to local YYYY-MM-DD string timezone-safely
  const formatDateString = (year: number, month: number, day: number): string => {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  };

  const daysInMonth = (year: number, month: number): number => {
    return new Date(year, month + 1, 0).getDate();
  };

  const startDayOfWeek = (year: number, month: number): number => {
    return new Date(year, month, 1).getDay();
  };

  // Nav Handlers
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(prev => prev - 1);
    } else {
      setViewMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(prev => prev + 1);
    } else {
      setViewMonth(prev => prev + 1);
    }
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    if (mode === 'single' && onChangeSelectedDate) {
      onChangeSelectedDate(formatDateString(today.getFullYear(), today.getMonth(), today.getDate()));
    }
  };

  // Date Selection handler
  const handleDateClick = (dayStr: string) => {
    if (mode === 'single') {
      const isAvailable = availableDates.includes(dayStr);
      if (isAvailable && onChangeSelectedDate) {
        onChangeSelectedDate(dayStr);
      }
    } else {
      // Multi-select mode
      if (onChangeSelectedDates) {
        if (selectedDates.includes(dayStr)) {
          onChangeSelectedDates(selectedDates.filter(d => d !== dayStr));
        } else {
          onChangeSelectedDates([...selectedDates, dayStr]);
        }
      }
    }
  };

  // Get Telugu months overlapping in the current viewed month
  const getTeluguMonthsHeader = (): string => {
    try {
      const firstDay = new Date(viewYear, viewMonth, 1);
      const lastDay = new Date(viewYear, viewMonth, daysInMonth(viewYear, viewMonth));
      const firstInfo = getTeluguDateInfo(firstDay);
      const lastInfo = getTeluguDateInfo(lastDay);
      
      if (firstInfo.month === lastInfo.month) {
        return `${firstInfo.month} Masam`;
      }
      return `${firstInfo.month} - ${lastInfo.month} Masalu`;
    } catch (e) {
      return '';
    }
  };

  // Render Days
  const renderCalendarDays = () => {
    const totalDays = daysInMonth(viewYear, viewMonth);
    const startOffset = startDayOfWeek(viewYear, viewMonth);
    const todayStr = formatDateString(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
    
    const dayCells = [];

    // Empty cells for offset
    for (let i = 0; i < startOffset; i++) {
      dayCells.push(
        <div key={`offset-${i}`} style={styles.emptyDayCell} />
      );
    }

    // Actual day cells
    for (let day = 1; day <= totalDays; day++) {
      const dayStr = formatDateString(viewYear, viewMonth, day);
      const targetDate = new Date(viewYear, viewMonth, day);
      
      // Calculate Telugu Date Information
      const teluguInfo = getTeluguDateInfo(targetDate);
      const isToday = dayStr === todayStr;
      
      // Check states based on mode
      let isSelected = false;
      let isDisabled = false;
      let isAvailable = false;
      let hasSlots = false;

      if (mode === 'single') {
        isSelected = dayStr === selectedDate;
        isAvailable = availableDates.includes(dayStr);
        isDisabled = !isAvailable; // Only available dates are enabled
      } else {
        isSelected = selectedDates.includes(dayStr);
        hasSlots = configuredDates.includes(dayStr);
        // Admin mode enables all cells
        isDisabled = false;
      }

      // Generate Tooltip Text
      const tooltipText = `${teluguInfo.month} Masam | ${teluguInfo.paksha} Paksha | ${teluguInfo.tithi}`;

      dayCells.push(
        <div 
          key={`day-${day}`}
          onClick={() => !isDisabled && handleDateClick(dayStr)}
          onMouseEnter={() => setHoveredDateInfo({ date: dayStr, info: teluguInfo })}
          onMouseLeave={() => setHoveredDateInfo(null)}
          style={{
            ...styles.dayCell,
            ...(isToday ? styles.todayCell : {}),
            ...(isAvailable && mode === 'single' ? styles.availableCell : {}),
            ...(hasSlots && mode === 'multi' ? styles.hasSlotsCell : {}),
            ...(isSelected ? styles.selectedCell : {}),
            ...(isDisabled ? styles.disabledCell : {}),
          }}
          title={tooltipText}
        >
          <span style={styles.dateNumber}>{day}</span>
          
          {/* Lunar Event Highlights */}
          {teluguInfo.isPournami && (
            <span style={styles.moonIcon} title="Pournami (Full Moon)">🌕</span>
          )}
          {teluguInfo.isAmavasya && (
            <span style={styles.moonIcon} title="Amavasya (New Moon)">🌑</span>
          )}
          
          {/* Small dot indicating config exists (Admin mode) */}
          {hasSlots && mode === 'multi' && !isSelected && (
            <span style={styles.configDot} />
          )}
        </div>
      );
    }

    return dayCells;
  };

  // Generate Year dropdown options
  const yearsRange = [];
  const currentYear = new Date().getFullYear();
  for (let y = currentYear - 1; y <= currentYear + 3; y++) {
    yearsRange.push(y);
  }

  const monthsList = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="glass-panel" style={styles.container}>
      {/* Calendar Header Controls */}
      <div style={styles.header}>
        <div style={styles.monthSelection}>
          <select 
            value={viewMonth} 
            onChange={(e) => setViewMonth(parseInt(e.target.value))}
            style={styles.selectHeader}
          >
            {monthsList.map((m, idx) => (
              <option key={m} value={idx}>{m}</option>
            ))}
          </select>
          <select 
            value={viewYear} 
            onChange={(e) => setViewYear(parseInt(e.target.value))}
            style={styles.selectHeader}
          >
            {yearsRange.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <div style={styles.headerActions}>
          <button onClick={handleToday} style={styles.todayBtn} className="btn-secondary">
            Today
          </button>
          <button onClick={handlePrevMonth} style={styles.navBtn}>
            <ChevronLeft size={16} />
          </button>
          <button onClick={handleNextMonth} style={styles.navBtn}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Telugu Month Heading display */}
      <div style={styles.teluguMonthLabel}>
        <CalIcon size={14} style={{ marginRight: '6px', color: 'var(--accent-color)' }} />
        <span>Telugu Month: <strong>{getTeluguMonthsHeader()}</strong></span>
      </div>

      {/* Days of Week label row */}
      <div style={styles.daysOfWeekGrid}>
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
          <div key={day} style={styles.dayOfWeekHeader}>{day}</div>
        ))}
      </div>

      {/* Grid of actual Calendar Dates */}
      <div style={styles.calendarGrid}>
        {renderCalendarDays()}
      </div>

      {/* Hover Info bar */}
      <div style={styles.footerInfo}>
        {hoveredDateInfo ? (
          <div style={styles.hoverInfo}>
            <span style={{ fontSize: '1.2rem', marginRight: '6px' }}>
              {hoveredDateInfo.info.isPournami ? '🌕' : hoveredDateInfo.info.isAmavasya ? '🌑' : '🌙'}
            </span>
            <span style={styles.hoverText}>
              {hoveredDateInfo.info.month} Masam — {hoveredDateInfo.info.paksha} Paksha {hoveredDateInfo.info.tithi}
            </span>
          </div>
        ) : (
          <div style={styles.footerGuide}>
            {mode === 'single' 
              ? 'Select an enabled date (light green border) to view time slots.' 
              : 'Click multiple dates to select and configure time slots.'
            }
          </div>
        )}
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    padding: '16px',
    backgroundColor: '#111b21',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    width: '100%',
    boxSizing: 'border-box'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  monthSelection: {
    display: 'flex',
    gap: '8px'
  },
  selectHeader: {
    backgroundColor: '#202c33',
    color: '#e9edef',
    border: '1px solid rgba(134, 150, 160, 0.25)',
    padding: '6px 10px',
    borderRadius: '6px',
    fontSize: '0.88rem',
    fontWeight: '600',
    cursor: 'pointer',
    outline: 'none'
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  todayBtn: {
    padding: '6px 12px',
    fontSize: '0.82rem',
    cursor: 'pointer'
  },
  navBtn: {
    background: 'none',
    border: '1px solid rgba(134, 150, 160, 0.25)',
    backgroundColor: '#202c33',
    color: '#aebac1',
    cursor: 'pointer',
    padding: '6px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s'
  },
  teluguMonthLabel: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 168, 132, 0.08)',
    border: '1px solid rgba(0, 168, 132, 0.2)',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '0.82rem',
    color: '#00a884'
  },
  daysOfWeekGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    textAlign: 'center',
    gap: '6px'
  },
  dayOfWeekHeader: {
    fontSize: '0.78rem',
    fontWeight: '700',
    color: '#8696a0',
    padding: '4px 0'
  },
  calendarGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '6px'
  },
  emptyDayCell: {
    aspectRatio: '1',
    visibility: 'hidden'
  },
  dayCell: {
    aspectRatio: '1',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#202c33',
    border: '1px solid transparent',
    borderRadius: '8px',
    cursor: 'pointer',
    position: 'relative',
    transition: 'all 0.2s ease',
    padding: '4px'
  },
  dateNumber: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#e9edef'
  },
  todayCell: {
    borderColor: 'var(--accent-color)',
    backgroundColor: 'rgba(0, 168, 132, 0.05)'
  },
  availableCell: {
    border: '1px solid #00a884',
    backgroundColor: 'rgba(0, 168, 132, 0.15)'
  },
  hasSlotsCell: {
    border: '1px solid rgba(167, 139, 250, 0.4)',
    backgroundColor: 'rgba(167, 139, 250, 0.05)'
  },
  selectedCell: {
    backgroundColor: 'var(--accent-color) !important',
    borderColor: 'var(--accent-color)',
    transform: 'scale(1.05)',
    boxShadow: '0 2px 8px rgba(0, 168, 132, 0.3)'
  },
  disabledCell: {
    opacity: 0.25,
    cursor: 'not-allowed',
    backgroundColor: 'transparent',
    border: '1px dashed rgba(134, 150, 160, 0.1)'
  },
  moonIcon: {
    fontSize: '0.85rem',
    position: 'absolute',
    bottom: '2px',
    lineHeight: '1'
  },
  configDot: {
    width: '4px',
    height: '4px',
    borderRadius: '50%',
    backgroundColor: '#a78bfa',
    position: 'absolute',
    bottom: '4px'
  },
  footerInfo: {
    minHeight: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#222e35',
    borderRadius: '6px',
    padding: '4px 10px'
  },
  hoverInfo: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  hoverText: {
    fontSize: '0.8rem',
    fontWeight: '500',
    color: '#e9edef'
  },
  footerGuide: {
    fontSize: '0.78rem',
    color: '#8696a0',
    textAlign: 'center'
  }
};
