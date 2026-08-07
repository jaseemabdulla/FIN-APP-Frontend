import React, { useState, useEffect, useRef } from 'react';

const Autocomplete = ({ value, onChange, suggestions, placeholder, required = false, className = "" }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const containerRef = useRef(null);
    const query = value ? value.toLowerCase().trim() : '';
    const filtered = value
        ? suggestions.filter(item => 
            item.toLowerCase().includes(query) && item.toLowerCase() !== query
          )
        : suggestions;

    const [prevValue, setPrevValue] = useState(value);
    const [prevSuggestions, setPrevSuggestions] = useState(suggestions);
    if (value !== prevValue || suggestions !== prevSuggestions) {
        setPrevValue(value);
        setPrevSuggestions(suggestions);
        setActiveIndex(-1);
    }

    // Handle click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleKeyDown = (e) => {
        if (!isOpen) {
            if (e.key === 'ArrowDown') {
                setIsOpen(true);
            }
            return;
        }

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex(prev => (prev + 1 < filtered.length ? prev + 1 : prev));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex(prev => (prev - 1 >= 0 ? prev - 1 : -1));
        } else if (e.key === 'Enter') {
            if (activeIndex >= 0 && activeIndex < filtered.length) {
                e.preventDefault();
                selectSuggestion(filtered[activeIndex]);
            }
        } else if (e.key === 'Escape') {
            setIsOpen(false);
        }
    };

    const selectSuggestion = (name) => {
        onChange(name);
        setIsOpen(false);
    };

    const inputClasses = className || "w-full bg-card-dark border border-border-main rounded-xl px-4 py-3 text-text-main placeholder-text-muted transition-all font-sans outline-none focus:border-primary";

    return (
        <div ref={containerRef} className="relative w-full">
            <input
                type="text"
                value={value}
                onChange={(e) => {
                    onChange(e.target.value);
                    setIsOpen(true);
                }}
                onFocus={() => setIsOpen(true)}
                onKeyDown={handleKeyDown}
                required={required}
                className={inputClasses}
                placeholder={placeholder}
                autoComplete="off"
            />
            
            {isOpen && filtered.length > 0 && (
                <ul className="absolute z-50 w-full mt-1.5 bg-card-dark border border-border-main rounded-xl shadow-2xl max-h-60 overflow-y-auto divide-y divide-border-main">
                    {filtered.map((item, index) => (
                        <li
                            key={item}
                            onClick={() => selectSuggestion(item)}
                            onMouseEnter={() => setActiveIndex(index)}
                            className={`px-4 py-2.5 text-sm cursor-pointer transition-colors ${
                                index === activeIndex ? 'bg-primary/10 text-primary font-semibold' : 'text-text-main hover:bg-bg-dark/40'
                            }`}
                        >
                            {item}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default Autocomplete;
