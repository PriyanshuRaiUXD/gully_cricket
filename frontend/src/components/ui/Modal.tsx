import { type ReactNode, useEffect } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg'
}

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  const sizeClasses = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg' }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-950/70 backdrop-blur-md" onClick={onClose} />
      <div className={`relative glass-strong rounded-3xl shadow-2xl w-full ${sizeClasses[size]} max-h-[90vh] flex flex-col animate-rise`}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/[.08]">
          <h2 className="text-lg font-display font-bold text-white tracking-tight">{title}</h2>
          <button
            onClick={onClose}
            className="text-ink-400 hover:text-white transition rounded-xl p-2 hover:bg-white/[.05]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-6 custom-scrollbar">{children}</div>
      </div>
    </div>
  )
}
