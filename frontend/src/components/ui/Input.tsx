import { type ReactNode } from 'react'

interface InputProps {
  label: string
  name?: string
  type?: string
  value: string | number
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  required?: boolean
  placeholder?: string
  autoFocus?: boolean
  autoComplete?: string
  hint?: string
  className?: string
}

export function Input({
  label,
  name,
  type = 'text',
  value,
  onChange,
  required = false,
  placeholder,
  autoFocus = false,
  autoComplete,
  hint,
  className = '',
}: InputProps) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="block text-[11px] font-black uppercase tracking-[.2em] text-ink-400 ml-1">
          {label}
        </label>
        {hint && <span className="text-[9px] font-bold text-ink-600 uppercase tracking-widest">{hint}</span>}
      </div>
      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete={autoComplete}
        className={`w-full bg-white/[.03] border border-white/[.10] rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-neon-cyan/40 placeholder:text-ink-800 transition-all font-medium ${className}`}
      />
    </div>
  )
}

