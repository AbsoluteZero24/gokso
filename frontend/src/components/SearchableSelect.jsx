import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, ChevronDown, Check, X } from 'lucide-react';

const SearchableSelect = ({
    options = [],
    value = '',
    onChange,
    placeholder = 'Select option...',
    label,
    required = false,
    disabled = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, openUp: false });
    const dropdownRef = useRef(null);
    const triggerRef = useRef(null);

    const filteredOptions = options.filter(option =>
        (typeof option === 'string' ? option : option.label)
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
    );

    const selectedOption = options.find(opt =>
        (typeof opt === 'string' ? opt : opt.value) === value
    );

    const displayValue = selectedOption
        ? (typeof selectedOption === 'string' ? selectedOption : selectedOption.label)
        : '';

    // Update position when opening or scrolling/resizing
    const updatePosition = () => {
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const dropdownHeight = 350; // Max estimated height
            const openUp = spaceBelow < dropdownHeight && rect.top > dropdownHeight;
            
            setCoords({
                top: openUp ? rect.top + window.scrollY - 8 : rect.bottom + window.scrollY + 8,
                left: rect.left + window.scrollX,
                width: rect.width,
                openUp
            });
        }
    };

    useEffect(() => {
        if (isOpen) {
            updatePosition();
            window.addEventListener('scroll', updatePosition, true);
            window.addEventListener('resize', updatePosition);
        }
        return () => {
            window.removeEventListener('scroll', updatePosition, true);
            window.removeEventListener('resize', updatePosition);
        };
    }, [isOpen]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target) && 
                triggerRef.current && !triggerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (opt) => {
        const val = typeof opt === 'string' ? opt : opt.value;
        if (onChange) {
            onChange(val, opt);
        }
        setIsOpen(false);
        setSearchTerm('');
    };

    const dropdownMenu = (
        <div 
            ref={dropdownRef}
            style={{
                position: 'absolute',
                top: coords.top,
                left: coords.left,
                width: coords.width,
                transform: coords.openUp ? 'translateY(-100%)' : 'none',
                background: 'white',
                borderRadius: '16px',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                border: '1px solid var(--border)',
                zIndex: 9999,
                padding: '0.5rem',
                pointerEvents: 'auto',
                animation: coords.openUp ? 'none' : 'slideDown 0.2s ease-out'
            }}
            onClick={(e) => e.stopPropagation()}
        >
            <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
                <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                    autoFocus
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                        width: '100%',
                        padding: '0.625rem 1rem 0.625rem 2.25rem',
                        borderRadius: '10px',
                        border: '1px solid #e2e8f0',
                        fontSize: '0.875rem',
                        outline: 'none',
                        background: '#f8fafc'
                    }}
                />
                {searchTerm && (
                    <X
                        size={14}
                        color="#94a3b8"
                        onClick={() => setSearchTerm('')}
                        style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer' }}
                    />
                )}
            </div>

            <div style={{ maxHeight: '250px', overflowY: 'auto', paddingRight: '4px' }} className="custom-scrollbar">
                {filteredOptions.length > 0 ? (
                    filteredOptions.map((opt, idx) => {
                        const val = typeof opt === 'string' ? opt : opt.value;
                        const lbl = typeof opt === 'string' ? opt : opt.label;
                        const isSelected = val === value;

                        return (
                            <div
                                key={idx}
                                onClick={() => handleSelect(opt)}
                                style={{
                                    padding: '0.625rem 1rem',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    background: isSelected ? 'rgba(30, 89, 197, 0.05)' : 'transparent',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '0.5rem',
                                    transition: 'all 0.1s',
                                    marginBottom: '2px'
                                }}
                                onMouseOver={(e) => !isSelected && (e.currentTarget.style.background = '#f1f5f9')}
                                onMouseOut={(e) => !isSelected && (e.currentTarget.style.background = 'transparent')}
                            >
                                <span style={{
                                    fontSize: '0.875rem',
                                    fontWeight: isSelected ? 700 : 500,
                                    color: isSelected ? 'var(--primary)' : '#475569'
                                }}>
                                    {lbl}
                                </span>
                                {isSelected && <Check size={16} color="var(--primary)" />}
                            </div>
                        );
                    })
                ) : (
                    <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>
                        No results found
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="searchable-select-wrapper" style={{ width: '100%' }}>
            {label && (
                <label style={{
                    display: 'block',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: 'var(--text-light)',
                    marginBottom: '0.5rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.025em'
                }}>
                    {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
                </label>
            )}

            <div
                ref={triggerRef}
                onClick={() => !disabled && setIsOpen(!isOpen)}
                style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '12px',
                    border: isOpen ? '1px solid var(--primary)' : '1px solid var(--border)',
                    background: disabled ? '#f8fafc' : 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: isOpen ? '0 0 0 4px rgba(30, 89, 197, 0.1)' : 'none',
                    minHeight: '45px'
                }}
            >
                <span style={{
                    color: displayValue ? 'var(--text-main)' : '#94a3b8',
                    fontSize: '0.875rem',
                    fontWeight: displayValue ? 600 : 400,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                }}>
                    {displayValue || placeholder}
                </span>
                <ChevronDown
                    size={18}
                    color="#94a3b8"
                    style={{
                        transform: isOpen ? 'rotate(180deg)' : 'none',
                        transition: 'transform 0.2s',
                        flexShrink: 0
                    }}
                />
            </div>

            {isOpen && createPortal(dropdownMenu, document.body)}
        </div>
    );
};

export default SearchableSelect;
