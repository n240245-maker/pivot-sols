import { getInitials } from '../../lib/studentDisplay'

export function InitialsAvatar({ name, large = false }: { name: string; large?: boolean }) {
  return <span className={`pivot-avatar${large ? ' pivot-avatar-large' : ''}`} aria-hidden="true">{getInitials(name)}</span>
}
