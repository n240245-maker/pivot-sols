export function getGreeting(date = new Date()): string {
  const hour = date.getHours()
  if (hour >= 5 && hour < 12) return 'Good morning'
  if (hour >= 12 && hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export function getDisplayName(name: string): string {
  return name.trim().split(/\s+/)[0] || 'Student'
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return parts.slice(0, 2).map((part) => Array.from(part)[0]).join('').toLocaleUpperCase() || 'S'
}
