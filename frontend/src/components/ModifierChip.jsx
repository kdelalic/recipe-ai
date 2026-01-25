import { useState, useEffect, useRef } from 'react';
import { HiX } from 'react-icons/hi';
import '../styles/ModifierChip.css';

function ModifierChip({ label, value, options, onChange, defaultValue = 'standard' }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const isSelected = value !== defaultValue;
  const currentLabel = isSelected 
    ? options.find(opt => opt.value === value)?.label || label
    : label;

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (optionValue) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  const clearSelection = (e) => {
    e.stopPropagation();
    onChange(defaultValue);
  };

  return (
    <div className="modifier-chip-container" ref={dropdownRef}>
      <button 
        type="button"
        className={`modifier-chip ${isSelected ? 'selected' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{currentLabel}</span>
        {isSelected && (
          <span className="clear-icon" onClick={clearSelection}>
            <HiX size={10} />
          </span>
        )}
      </button>

      {isOpen && (
        <div className="modifier-dropdown">
          {options.map((option) => (
            <button
              type="button"
              key={option.value}
              className={`dropdown-item ${value === option.value ? 'active' : ''}`}
              onClick={() => handleSelect(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default ModifierChip;
