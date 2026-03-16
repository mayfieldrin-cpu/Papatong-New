import clsx from 'clsx'
import type { ButtonHTMLAttributes, InputHTMLAttributes, TextareaHTMLAttributes } from 'react'

// ── Button ────────────────────────────────────────
type BtnVariant = 'default' | 'primary' | 'ghost' | 'danger'
interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant
  size?: 'xs' | 'sm' | 'md'
}
export function Btn({ variant = 'default', size = 'md', className, children, ...props }: BtnProps) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center rounded border font-sans transition-all cursor-pointer',
        'disabled:opacity-30 disabled:cursor-not-allowed',
        size === 'xs' && 'px-2 py-[2px] text-[11px]',
        size === 'sm' && 'px-2.5 py-1 text-[12px]',
        size === 'md' && 'px-4 py-[7px] text-[13px]',
        variant === 'default' && 'bg-transparent border-border-default text-text-primary hover:bg-surface2 active:scale-[0.98]',
        variant === 'primary' && 'bg-text-primary border-text-primary text-bg hover:opacity-80 active:scale-[0.98]',
        variant === 'ghost'   && 'bg-transparent border-transparent text-text-secondary hover:text-text-primary hover:bg-surface2',
        variant === 'danger'  && 'bg-transparent border-transparent text-text-secondary hover:text-red hover:bg-red/10',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

// ── Icon button ───────────────────────────────────
export function IconBtn({ className, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={clsx(
        'p-1 rounded border-none bg-transparent text-text-hint hover:text-text-primary hover:bg-surface2 transition-colors cursor-pointer text-[14px]',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

// ── Input ─────────────────────────────────────────
export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={clsx(
        'w-full bg-surface border border-border-default text-text-primary rounded px-2.5 py-[7px] text-[13px]',
        'placeholder:text-text-hint focus:border-border-strong focus:outline-none transition-colors',
        className
      )}
      {...props}
    />
  )
}

// ── Textarea ──────────────────────────────────────
export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={clsx(
        'w-full bg-surface border border-border-default text-text-primary rounded px-2.5 py-2 text-[13px]',
        'placeholder:text-text-hint focus:border-border-strong focus:outline-none transition-colors resize-vertical min-h-[90px] leading-relaxed',
        className
      )}
      {...props}
    />
  )
}

// ── Select ────────────────────────────────────────
export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={clsx(
        'bg-surface border border-border-default text-text-primary rounded px-2.5 py-[7px] text-[13px]',
        'focus:border-border-strong focus:outline-none transition-colors cursor-pointer',
        className
      )}
      {...props}
    />
  )
}

// ── Label ─────────────────────────────────────────
export function Label({ className, children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={clsx('block text-[11px] font-medium tracking-wide text-text-secondary mb-1.5', className)} {...props}>
      {children}
    </label>
  )
}

// ── Section title ─────────────────────────────────
export function SectionTitle({ className, children }: { className?: string, children: React.ReactNode }) {
  return (
    <div className={clsx('font-mono text-[10px] font-medium tracking-[0.08em] uppercase text-text-hint', className)}>
      {children}
    </div>
  )
}

// ── Badge ─────────────────────────────────────────
export function Badge({ color, bg, children, className }: {
  color: string, bg: string, children: React.ReactNode, className?: string
}) {
  return (
    <span
      className={clsx('inline-flex items-center gap-1 text-[10px] font-medium px-2 py-[2px] rounded-full', className)}
      style={{ background: bg, color }}
    >
      {children}
    </span>
  )
}

// ── Divider dot ───────────────────────────────────
export function Dot({ color, size = 5 }: { color: string, size?: number }) {
  return (
    <span
      className="rounded-full flex-shrink-0 inline-block"
      style={{ width: size, height: size, background: color }}
    />
  )
}

// ── Toggle ────────────────────────────────────────
export function Toggle({ checked, onChange }: { checked: boolean, onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={clsx(
        'relative w-9 h-5 rounded-full transition-colors cursor-pointer border-none',
        checked ? 'bg-text-primary' : 'bg-border-default'
      )}
    >
      <span
        className={clsx(
          'absolute top-[3px] left-[3px] w-[14px] h-[14px] rounded-full bg-white transition-transform',
          checked && 'translate-x-4'
        )}
      />
    </button>
  )
}

// ── Confidence badge ──────────────────────────────
import { confInfo } from '@/lib/palette'
export function ConfBadge({ level }: { level: number }) {
  const conf = confInfo(level)
  return (
    <span
      className="text-[10px] font-medium px-1.5 py-[1px] rounded-full"
      style={{ background: conf.bg, color: conf.color }}
    >
      {conf.label}
    </span>
  )
}

// ── Loading dots ──────────────────────────────────
export function LoadingDots() {
  return (
    <span className="inline-flex gap-1 items-center">
      <span className="pulse-dot" />
      <span className="pulse-dot" />
      <span className="pulse-dot" />
    </span>
  )
}

// ── Back button ───────────────────────────────────
export function BackBtn({ onClick, label = 'Back' }: { onClick: () => void, label?: string }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 text-[13px] text-text-secondary hover:text-text-primary transition-colors bg-transparent border-none cursor-pointer mb-6"
    >
      ← {label}
    </button>
  )
}

// ── Card ──────────────────────────────────────────
export function Card({ className, children, onClick }: {
  className?: string, children: React.ReactNode, onClick?: () => void
}) {
  return (
    <div
      className={clsx(
        'bg-surface border border-border-subtle rounded-lg p-3.5',
        onClick && 'cursor-pointer hover:border-border-default transition-colors',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

// ── Empty state ───────────────────────────────────
export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-center py-10 text-[13px] text-text-hint italic">
      {children}
    </div>
  )
}
