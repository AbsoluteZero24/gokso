import React from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Calendar } from 'lucide-react';
import './DatePicker.css';

const CustomDatePicker = ({ 
    selected, 
    onChange, 
    label, 
    placeholder = 'Pilih tanggal...', 
    required = false 
}) => {
    const labelStyle = { 
        display: 'block', 
        fontSize: '0.75rem', 
        fontWeight: 800, 
        marginBottom: '0.625rem', 
        color: '#64748b', 
        textTransform: 'uppercase',
        letterSpacing: '0.025em'
    };

    return (
        <div className="custom-datepicker-container">
            {label && (
                <label style={labelStyle}>{label} {required && <span style={{ color: '#ef4444' }}>*</span>}</label>
            )}
            <div className="datepicker-wrapper">
                <DatePicker
                    selected={selected ? new Date(selected) : null}
                    onChange={(date) => {
                        if (date) {
                            const offset = date.getTimezoneOffset();
                            date = new Date(date.getTime() - (offset * 60 * 1000));
                            onChange(date.toISOString().split('T')[0]);
                        } else {
                            onChange("");
                        }
                    }}
                    dateFormat="dd/MM/yyyy"
                    placeholderText={placeholder}
                    className="premium-date-input"
                    required={required}
                    autoComplete="off"
                    showPopperArrow={false}
                    popperPlacement="bottom-start"
                />
                <Calendar size={18} className="calendar-icon" />
            </div>
        </div>
    );
};

export default CustomDatePicker;
