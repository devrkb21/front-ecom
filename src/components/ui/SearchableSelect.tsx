'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

export interface SearchableSelectProps {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  id?: string;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  disabled = false,
  error = false,
  id,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const listboxId = id ? `${id}-listbox` : undefined;

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Keep the highlighted option in range whenever the filtered list or open state changes.
  useEffect(() => {
    if (!isOpen) {
      setHighlightedIndex(-1);
      return;
    }
    setHighlightedIndex((prev) => {
      if (filteredOptions.length === 0) return -1;
      const selectedIdx = filteredOptions.findIndex((opt) => opt.value === value);
      if (prev >= 0 && prev < filteredOptions.length) return prev;
      return selectedIdx >= 0 ? selectedIdx : 0;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, searchTerm]);

  const closeDropdown = () => {
    setIsOpen(false);
    setSearchTerm('');
    setHighlightedIndex(-1);
  };

  const selectOption = (option: { value: string; label: string }) => {
    onChange(option.value);
    closeDropdown();
    triggerRef.current?.focus();
  };

  const handleTriggerKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;

    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
          selectOption(filteredOptions[highlightedIndex]);
        }
        break;
      case 'Escape':
        if (isOpen) {
          event.preventDefault();
          closeDropdown();
        }
        break;
      case 'ArrowDown':
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else if (filteredOptions.length > 0) {
          setHighlightedIndex((prev) => (prev + 1) % filteredOptions.length);
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else if (filteredOptions.length > 0) {
          setHighlightedIndex((prev) => (prev <= 0 ? filteredOptions.length - 1 : prev - 1));
        }
        break;
      case 'Tab':
        if (isOpen) {
          closeDropdown();
        }
        break;
      default:
        break;
    }
  };

  const activeOptionId =
    isOpen && listboxId && highlightedIndex >= 0 && filteredOptions[highlightedIndex]
      ? `${listboxId}-option-${highlightedIndex}`
      : undefined;

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div
        id={id}
        ref={triggerRef}
        role="combobox"
        tabIndex={disabled ? -1 : 0}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        aria-activedescendant={activeOptionId}
        aria-disabled={disabled}
        className={`flex w-full items-center justify-between rounded-md border px-4 py-3 text-sm transition-all duration-300 ${
          disabled
            ? 'cursor-not-allowed border-gray-300 bg-gray-100 text-gray-500'
            : 'cursor-pointer bg-white ' +
              (error
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                : isOpen
                  ? 'border-accent-500 ring-1 ring-accent-500'
                  : 'border-gray-300 hover:border-gray-400')
        }`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleTriggerKeyDown}
      >
        <span className={selectedOption ? 'text-gray-900' : 'text-gray-500'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="sticky top-0 z-10 bg-white px-2 pb-2 pt-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-8 text-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    closeDropdown();
                    triggerRef.current?.focus();
                  } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    if (filteredOptions.length > 0) {
                      setHighlightedIndex((prev) => (prev + 1) % filteredOptions.length);
                    }
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    if (filteredOptions.length > 0) {
                      setHighlightedIndex((prev) => (prev <= 0 ? filteredOptions.length - 1 : prev - 1));
                    }
                  } else if (e.key === 'Enter') {
                    e.preventDefault();
                    if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
                      selectOption(filteredOptions[highlightedIndex]);
                    }
                  }
                }}
                autoFocus
              />
              {searchTerm && (
                <X
                  className="absolute right-2.5 top-2.5 h-4 w-4 cursor-pointer text-gray-400 hover:text-gray-600"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    setSearchTerm('');
                  }}
                />
              )}
            </div>
          </div>
          <div id={listboxId} role="listbox" aria-label={placeholder}>
            {filteredOptions.length === 0 ? (
              <div className="relative cursor-default select-none px-4 py-2 text-sm text-gray-700">
                No results found.
              </div>
            ) : (
              filteredOptions.map((option, index) => (
                <div
                  key={option.value}
                  id={listboxId ? `${listboxId}-option-${index}` : undefined}
                  role="option"
                  aria-selected={option.value === value}
                  className={`relative cursor-pointer select-none py-2 pl-4 pr-9 text-sm hover:bg-accent-50 ${
                    option.value === value
                      ? 'bg-accent-50 font-medium text-accent-900'
                      : 'text-gray-900'
                  } ${index === highlightedIndex ? 'bg-accent-100' : ''}`}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onClick={() => selectOption(option)}
                >
                  {option.label}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
