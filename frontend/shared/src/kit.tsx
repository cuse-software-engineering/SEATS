// The component kit of both apps: buttons, cards, fields, a data table, empty and loading states, a key-value list,
// a stepper. Plain elements with the classes of kit.css; nothing here knows the API.
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';
import { useId } from 'react';
import { describeError } from './query';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'link' | 'ghost';
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md';
  /** Full width, as the phone screens stack their actions. */
  block?: boolean;
  /** Disabled with a spinner while the call runs. */
  busy?: boolean;
}
export function Button({ variant = 'secondary', size = 'md', block, busy, className = '', children, disabled, type = 'button', ...rest }: ButtonProps) {
  return (
    <button type={type} className={`btn ${variant} ${size === 'sm' ? 'sm' : ''} ${block ? 'block' : ''} ${busy ? 'busy' : ''} ${className}`.replace(/\s+/g, ' ').trim()} disabled={disabled || busy} aria-busy={busy || undefined} {...rest}>
      {busy && <span className="spinner" aria-hidden="true" />}{children}
    </button>
  );
}

export function Card({ title, actions, soft, thick, className = '', children, ...rest }: { title?: ReactNode; actions?: ReactNode; soft?: boolean; thick?: boolean; className?: string; children: ReactNode } & Record<string, unknown>) {
  return (
    <section className={`card ${soft ? 'soft' : ''} ${thick ? 'thick' : ''} ${className}`.replace(/\s+/g, ' ').trim()} {...rest}>
      {(title || actions) && <header className="card-head">{title && <h2>{title}</h2>}{actions && <div className="card-actions">{actions}</div>}</header>}
      {children}
    </section>
  );
}

/** A labelled input (or select, or whatever `children` renders with the given id): the error under it, in words. */
export function Field({ label, error, hint, unit, inline, children, id: given }: { label: ReactNode; error?: string | null; hint?: ReactNode; unit?: ReactNode; inline?: boolean; id?: string; children: (id: string, invalid: boolean) => ReactNode }) {
  const own = useId();
  const id = given ?? own;
  return (
    <div className={`field ${inline ? 'inline' : ''} ${error ? 'invalid' : ''}`.replace(/\s+/g, ' ').trim()}>
      <label htmlFor={id}>{label}</label>
      <div className="field-control">{children(id, Boolean(error))}{unit && <span className="unit">{unit}</span>}</div>
      {error ? <div className="field-error" role="alert">{error}</div> : hint ? <div className="field-hint">{hint}</div> : null}
    </div>
  );
}
export const TextInput = ({ invalid, className = '', ...rest }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) => (
  <input className={`input ${invalid ? 'err' : ''} ${className}`.trim()} aria-invalid={invalid || undefined} {...rest} />
);
export const Select = ({ className = '', children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) => (
  <select className={`input ${className}`.trim()} {...rest}>{children}</select>
);
export function Checkbox({ label, error, className = '', ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode; error?: string | null }) {
  return (
    <>
      <label className={`check-line ${className}`.trim()}><input type="checkbox" aria-invalid={error ? true : undefined} {...rest} /><span>{label}</span></label>
      {error && <div className="field-error" role="alert">{error}</div>}
    </>
  );
}

/** − value +, with the accessible names "fewer" and "more". */
export function Stepper({ value, min = 1, max, onChange, disabled, testId }: { value: number; min?: number; max?: number; onChange: (v: number) => void; disabled?: boolean; testId?: string }) {
  return (
    <span className="stepper">
      <button type="button" onClick={() => onChange(value - 1)} disabled={disabled || value <= min} aria-label="fewer">−</button>
      <span className="v" data-testid={testId}>{value}</span>
      <button type="button" onClick={() => onChange(value + 1)} disabled={disabled || (max !== undefined && value >= max)} aria-label="more">+</button>
    </span>
  );
}

export interface Column<T> { key: string; header: ReactNode; cell: (row: T) => ReactNode; align?: 'left' | 'right'; width?: string }
export function DataTable<T>({ columns, rows, rowKey, onRowClick, selectedKey, empty, small, caption, testId }: { columns: Column<T>[]; rows: T[]; rowKey: (row: T) => string; onRowClick?: (row: T) => void; selectedKey?: string; empty?: ReactNode; small?: boolean; caption?: string; testId?: string }) {
  if (rows.length === 0 && empty) return <div className="empty">{empty}</div>;
  return (
    <table className={`table ${small ? 'small' : ''} ${onRowClick ? 'clickable' : ''}`.replace(/\s+/g, ' ').trim()} data-testid={testId}>
      {caption && <caption>{caption}</caption>}
      <thead><tr>{columns.map((c) => <th key={c.key} className={c.align === 'right' ? 'num' : undefined} style={c.width ? { width: c.width } : undefined}>{c.header}</th>)}</tr></thead>
      <tbody>
        {rows.map((row) => {
          const k = rowKey(row);
          return (
            <tr key={k} className={selectedKey === k ? 'sel' : undefined} onClick={onRowClick ? () => onRowClick(row) : undefined} aria-selected={selectedKey === k || undefined}>
              {columns.map((c) => <td key={c.key} className={c.align === 'right' ? 'num' : undefined}>{c.cell(row)}</td>)}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export const EmptyState = ({ title, hint, action }: { title: ReactNode; hint?: ReactNode; action?: ReactNode }) => (
  <div className="empty"><div className="b">{title}</div>{hint && <div className="muted">{hint}</div>}{action && <div className="empty-action">{action}</div>}</div>
);
export const Loading = ({ what = 'Loading' }: { what?: string }) => <div className="loading" role="status"><span className="spinner" aria-hidden="true" /> {what}…</div>;

/** A failed read, in words, with a retry. */
export function LoadError({ error, retry, what = 'load this' }: { error: unknown; retry?: () => void; what?: string }) {
  return (
    <div className="alert" role="alert">
      Could not {what}: {describeError(error)}.
      {retry && <button type="button" className="btn link" onClick={retry}>Try again</button>}
    </div>
  );
}

/** Key: value rows, as the tickets and summaries list them. */
export const KeyValue = ({ rows, testId }: { rows: [ReactNode, ReactNode][]; testId?: string }) => (
  <dl className="kv" data-testid={testId}>{rows.map(([k, v], i) => <div key={i} className="kv-row"><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
);

export const Divider = () => <hr className="hr" />;
export const Muted = ({ children, small }: { children: ReactNode; small?: boolean }) => <span className={small ? 'tiny' : 'muted'}>{children}</span>;
