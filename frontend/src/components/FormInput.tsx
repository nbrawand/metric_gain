/**
 * Reusable form input component
 */

import React from 'react';

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function FormInput({ label, error, className = '', ...props }: FormInputProps) {
  return (
    <div className="mb-4">
      <label className="block text-gray-300 text-sm font-medium mb-2" htmlFor={props.id}>
        {label}
      </label>
      <input
        className={`
          w-full px-4 py-3 bg-gray-800 border rounded-lg
          text-white placeholder-gray-500
          focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent
          ${error ? 'border-red-500' : 'border-gray-700'}
          ${className}
        `}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
}
