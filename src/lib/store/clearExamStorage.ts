import { del } from 'idb-keyval'
import { useExamStore } from './examStore'

export async function clearExamStorage() {
  useExamStore.getState().clearExam()
  try {
    await del('exam-storage')
  } catch (error) {
    console.error('[EXAM_STORE] Failed to delete persisted exam storage:', error)
  }
}
