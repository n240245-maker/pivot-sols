import { useState } from 'react'
import type { InputHTMLAttributes } from 'react'
import { Eye, EyeOff } from 'lucide-react'

interface InputGroupProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string
  label: string
  error?: string
  hint?: string
}
export function InputGroup({ id, label, error, hint, type = 'text', ...props }: InputGroupProps) {
  const [visible, setVisible] = useState(false)
  const password = type === 'password'
  return (
    <div className="input-group">
      <label htmlFor={id}>{label}</label>
      <div className="input-wrap">
        <input {...props} id={id} type={password && visible ? 'text' : type} className={password ? 'has-toggle' : undefined} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined} />
        {password && <button type="button" className="password-toggle" aria-label={visible ? 'Hide password' : 'Show password'} aria-pressed={visible} onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button>}
      </div>
      {error ? <p id={`${id}-error`} className="field-error">{error}</p> : hint ? <p id={`${id}-hint`} className="field-hint">{hint}</p> : null}
    </div>
  )
}
