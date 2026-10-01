import type { Branch, Semester } from '../types/referenceBooks'

// Presentation navigation supplied for the prototype, not an official branch list.
export const prototypeBranches: readonly Branch[] = [
  { id: 'cse', shortName: 'CSE', name: 'Computer Science & Engineering' },
  { id: 'ece', shortName: 'ECE', name: 'Electronics & Communication Engineering' },
  { id: 'eee', shortName: 'EEE', name: 'Electrical & Electronics Engineering' },
  { id: 'mechanical', shortName: 'ME', name: 'Mechanical Engineering' },
  { id: 'civil', shortName: 'CE', name: 'Civil Engineering' },
  { id: 'chemical', shortName: 'CHE', name: 'Chemical Engineering' },
]

export const prototypeSemesters: readonly Semester[] = [
  { id: 'semester-1', name: 'Semester 1', number: 1 },
  { id: 'semester-2', name: 'Semester 2', number: 2 },
]
