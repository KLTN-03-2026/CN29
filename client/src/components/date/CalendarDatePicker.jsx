import React, { useEffect, useMemo, useRef, useState } from 'react';
import './CalendarDatePicker.css';

const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const pad2 = (value) => String(value).padStart(2, '0');

const toDateOnly = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const parseIsoDate = (value) => {
  const text = String(value || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;

  const [yearRaw, monthRaw, dayRaw] = text.split('-');
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }

  if (month < 1 || month > 12) return null;

  const maxDay = new Date(year, month, 0).getDate();
  if (day < 1 || day > maxDay) return null;

  return new Date(year, month - 1, day);
};

const normalizeBoundDate = (value) => {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return toDateOnly(value);
  }
  return parseIsoDate(value);
};

const toIsoDate = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());
  return `${year}-${month}-${day}`;
};

const formatDisplayDate = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()}`;
};

const formatMonthTitle = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric'
  });
};

const isInRange = (date, minDate, maxDate) => {
  const target = toDateOnly(date).getTime();
  if (minDate && target < minDate.getTime()) return false;
  if (maxDate && target > maxDate.getTime()) return false;
  return true;
};

const isSameDay = (a, b) => {
  if (!(a instanceof Date) || !(b instanceof Date)) return false;
  return (
    a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
  );
};

const buildCalendarCells = (viewDate) => {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const offset = firstDay.getDay();

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(year, month, 1 - offset + index);
    return {
      date,
      inCurrentMonth: date.getMonth() === month
    };
  });
};

const moveMonth = (date, amount) => new Date(date.getFullYear(), date.getMonth() + amount, 1);

const moveYear = (date, amount) => new Date(date.getFullYear() + amount, date.getMonth(), 1);

const getViewAnchorDate = (selectedDate) => {
  const source = selectedDate || new Date();
  return new Date(source.getFullYear(), source.getMonth(), 1);
};

const CalendarDatePicker = ({
  value,
  onChange,
  placeholder = 'Chọn ngày',
  disabled = false,
  minDate,
  maxDate,
  id,
  inputClassName = '',
  wrapperClassName = '',
  menuClassName = '',
  showTodayAction = true,
  ariaLabel
}) => {
  const rootRef = useRef(null);
  const selectedDate = useMemo(() => parseIsoDate(value), [value]);
  const minDateBound = useMemo(() => normalizeBoundDate(minDate), [minDate]);
  const maxDateBound = useMemo(() => normalizeBoundDate(maxDate), [maxDate]);
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => getViewAnchorDate(selectedDate));

  const today = useMemo(() => toDateOnly(new Date()), []);

  useEffect(() => {
    if (isOpen) return;
    setViewDate(getViewAnchorDate(selectedDate));
  }, [selectedDate, isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const onDocumentClick = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const onDocumentKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', onDocumentClick);
    document.addEventListener('touchstart', onDocumentClick, true);
    document.addEventListener('keydown', onDocumentKeyDown);

    return () => {
      document.removeEventListener('mousedown', onDocumentClick);
      document.removeEventListener('touchstart', onDocumentClick, true);
      document.removeEventListener('keydown', onDocumentKeyDown);
    };
  }, [isOpen]);

  const cells = useMemo(() => buildCalendarCells(viewDate), [viewDate]);

  const triggerLabel = selectedDate ? formatDisplayDate(selectedDate) : placeholder;

  const selectDate = (date) => {
    if (!isInRange(date, minDateBound, maxDateBound)) return;
    onChange?.(toIsoDate(date));
    setIsOpen(false);
  };

  const setToday = () => {
    if (!isInRange(today, minDateBound, maxDateBound)) return;
    onChange?.(toIsoDate(today));
    setViewDate(getViewAnchorDate(today));
    setIsOpen(false);
  };

  const canSelectToday = isInRange(today, minDateBound, maxDateBound);

  return (
    <div ref={rootRef} className={`calendar-date-picker ${wrapperClassName}`.trim()}>
      <button
        type="button"
        id={id}
        className={[
          'calendar-date-picker__trigger',
          inputClassName,
          !selectedDate ? 'is-placeholder' : ''
        ].filter(Boolean).join(' ')}
        onClick={() => {
          if (disabled) return;
          setIsOpen((prev) => !prev);
        }}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={ariaLabel || placeholder}
        disabled={disabled}
      >
        <span>{triggerLabel}</span>
        <i className="bi bi-calendar3" aria-hidden="true"></i>
      </button>

      {isOpen ? (
        <div className={['calendar-date-picker__menu', menuClassName].filter(Boolean).join(' ')} role="dialog" aria-modal="false">
          <div className="calendar-date-picker__header">
            <div className="calendar-date-picker__nav-group">
              <button
                type="button"
                className="calendar-date-picker__nav-btn"
                onClick={() => setViewDate((prev) => moveYear(prev, -1))}
                aria-label="Năm trước"
              >
                <i className="bi bi-chevron-double-left"></i>
              </button>
              <button
                type="button"
                className="calendar-date-picker__nav-btn"
                onClick={() => setViewDate((prev) => moveMonth(prev, -1))}
                aria-label="Tháng trước"
              >
                <i className="bi bi-chevron-left"></i>
              </button>
            </div>

            <div className="calendar-date-picker__title">{formatMonthTitle(viewDate)}</div>

            <div className="calendar-date-picker__nav-group">
              <button
                type="button"
                className="calendar-date-picker__nav-btn"
                onClick={() => setViewDate((prev) => moveMonth(prev, 1))}
                aria-label="Tháng sau"
              >
                <i className="bi bi-chevron-right"></i>
              </button>
              <button
                type="button"
                className="calendar-date-picker__nav-btn"
                onClick={() => setViewDate((prev) => moveYear(prev, 1))}
                aria-label="Năm sau"
              >
                <i className="bi bi-chevron-double-right"></i>
              </button>
            </div>
          </div>

          <div className="calendar-date-picker__weekdays" aria-hidden="true">
            {WEEKDAY_LABELS.map((label) => (
              <div key={label} className="calendar-date-picker__weekday">{label}</div>
            ))}
          </div>

          <div className="calendar-date-picker__grid">
            {cells.map(({ date, inCurrentMonth }) => {
              const disabledDate = !isInRange(date, minDateBound, maxDateBound);
              const selected = selectedDate ? isSameDay(date, selectedDate) : false;
              const todayCell = isSameDay(date, today);

              return (
                <button
                  key={toIsoDate(date)}
                  type="button"
                  className={[
                    'calendar-date-picker__cell',
                    inCurrentMonth ? '' : 'is-outside',
                    selected ? 'is-selected' : '',
                    todayCell ? 'is-today' : ''
                  ].filter(Boolean).join(' ')}
                  onClick={() => selectDate(date)}
                  disabled={disabledDate}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          {showTodayAction ? (
            <div className="calendar-date-picker__footer">
              <button
                type="button"
                className="calendar-date-picker__today-btn"
                onClick={setToday}
                disabled={!canSelectToday}
              >
                Today
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export default CalendarDatePicker;
