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
  const wrapperRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div
        id={id}
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
          {filteredOptions.length === 0 ? (
            <div className="relative cursor-default select-none px-4 py-2 text-sm text-gray-700">
              No results found.
            </div>
          ) : (
            filteredOptions.map((option) => (
              <div
                key={option.value}
                className={`relative cursor-pointer select-none py-2 pl-4 pr-9 text-sm hover:bg-accent-50 ${
                  option.value === value
                    ? 'bg-accent-50 font-medium text-accent-900'
                    : 'text-gray-900'
                }`}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                  setSearchTerm('');
                }}
              >
                {option.label}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
