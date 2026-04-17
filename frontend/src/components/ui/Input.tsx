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
}

export function Input({
  label,
  name,
  type = 'text',
  value,
  onChange,
  required,
  placeholder,
  autoFocus,
  autoComplete,
  hint,
}: InputProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-baseline ml-1">
        <label className="block text-[10px] uppercase tracking-[.2em] font-black text-ink-500">
          {label}
        </label>
        {hint && <span className="text-[9px] text-ink-700 font-bold uppercase">{hint}</span>}
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
        className="w-full bg-white/[.03] border border-white/[.10] rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-neon-cyan/40 placeholder:text-ink-800 transition-all font-medium"
      />
    </div>
  )
}
