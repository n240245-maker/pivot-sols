import type { ReferenceCatalog } from '../types/referenceBooks'

// Books and labs share only the non-authoritative curriculum preference.
type BranchCatalog = Pick<ReferenceCatalog, 'demo' | 'curricula'>

type PreferenceStorage = Pick<Storage, 'getItem' | 'setItem'>
export const BRANCH_PREFERENCE_KEY = 'pivot-sols-selected-branch'
export const DEMO_BRANCH_PREFERENCE_KEY = 'pivot-sols-demo-branch'
function browserStorage(): PreferenceStorage | undefined {
  try { return typeof window === 'undefined' ? undefined : window.localStorage } catch { return undefined }
}
export function getSelectedBranch(data: BranchCatalog, storage: PreferenceStorage | undefined = browserStorage()): string | undefined {
  try {
    const value = storage?.getItem(data.demo ? DEMO_BRANCH_PREFERENCE_KEY : BRANCH_PREFERENCE_KEY)
    return data.curricula.some(c => c.level === 'E1' && c.branch && c.id === value) ? value ?? undefined : undefined
  } catch { return undefined }
}
export function setSelectedBranch(data: BranchCatalog, id: string, storage: PreferenceStorage | undefined = browserStorage()): boolean {
  if (!data.curricula.some(c => c.level === 'E1' && c.branch && c.id === id)) return false
  try { if (!storage) return false; storage.setItem(data.demo ? DEMO_BRANCH_PREFERENCE_KEY : BRANCH_PREFERENCE_KEY, id); return true } catch { return false }
}
