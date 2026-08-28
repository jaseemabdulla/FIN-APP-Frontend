import React, { useState } from 'react';

const PasswordInput = ({ 
    name, 
    value, 
    onChange, 
    placeholder = 'Enter password', 
    className = '', 
    required = false,
    id,
    leftIcon,
    ...props 
}) => {
    const [showPassword, setShowPassword] = useState(false);

    const toggleShowPassword = () => {
        setShowPassword(prev => !prev);
    };

    return (
        <div className="relative w-full">
            {leftIcon && (
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none z-10 flex items-center justify-center">
                    {leftIcon}
                </span>
            )}
            <input 
                type={showPassword ? 'text' : 'password'}
                name={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className={`w-full bg-bg-dark border border-border-main rounded-xl py-3.5 pr-12 text-text-main placeholder-text-muted focus:outline-none transition-all ${leftIcon ? 'pl-11' : 'pl-4'} ${className}`}
                required={required}
                id={id}
                {...props}
            />
            <button
                type="button"
                onClick={toggleShowPassword}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main transition-colors p-1.5 rounded-lg focus:outline-none cursor-pointer flex items-center justify-center select-none"
                title={showPassword ? 'Hide password' : 'Show password'}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
                {showPassword ? (
                    // Eye off / slash icon
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    </svg>
                ) : (
                    // Eye icon
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                )}
            </button>
        </div>
    );
};

export default PasswordInput;
