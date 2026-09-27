import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { get, set, del } from 'idb-keyval'

// Custom storage for idb-keyval
const storage = {
  getItem: async (name: string): Promise<string | null> => {
    return (await get(name)) || null
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await set(name, value)
  },
  removeItem: async (name: string): Promise<void> => {
    await del(name)
  },
}

export type Question = {
  id: string
  exam_id: string
  question_text: string
  question_type: 'MCQ' | 'SUBJECTIVE'
  options?: string[]
  correct_answer?: unknown
  marks: number
  audio_url_en?: string
  audio_url_hi?: string
  image_url?: string
  image_alt_text?: string
  order_num: number
}

export type Answer = {
  question_id: string
  answer_data: unknown
  time_taken_seconds: number
  is_marked_for_review: boolean
}

interface ExamState {
  sessionId: string | null
  examId: string | null
  questions: Question[]
  answers: Record<string, Answer>
  currentQuestionIndex: number
  startTime: number | null
  endTime: number | null
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'SUBMITTED'
  hasHydrated: boolean
  
  // Actions
  initializeExam: (sessionId: string, examId: string, questions: Question[], startedAt?: number) => void
  setAnswer: (questionId: string, answerData: unknown) => void
  toggleMarkForReview: (questionId: string) => void
  setCurrentQuestionIndex: (index: number) => void
  submitExam: () => void
  clearExam: () => void
  setHasHydrated: (value: boolean) => void
}

export const useExamStore = create<ExamState>()(
  persist(
    (set) => ({
      sessionId: null,
      examId: null,
      questions: [],
      answers: {},
      currentQuestionIndex: 0,
      startTime: null,
      endTime: null,
      status: 'NOT_STARTED',
      hasHydrated: false,

      initializeExam: (sessionId, examId, questions, startedAt) => {
        set((state) => {
          const isResuming =
            state.sessionId === sessionId &&
            state.examId === examId &&
            state.status === 'IN_PROGRESS';

          const normalizedStartedAt =
            typeof startedAt === 'number' && Number.isFinite(startedAt)
              ? startedAt
              : Date.now();

          return {
            sessionId,
            examId,
            questions,
            answers: isResuming ? state.answers : {},
            currentQuestionIndex: isResuming
              ? Math.min(state.currentQuestionIndex, Math.max(0, questions.length - 1))
              : 0,
            startTime: isResuming ? state.startTime : normalizedStartedAt,
            endTime: null,
            status: 'IN_PROGRESS',
          };
        })
      },

      setAnswer: (questionId, answerData) => {
        set((state) => {
          const currentAnswer = state.answers[questionId]
          return {
            answers: {
              ...state.answers,
              [questionId]: {
                question_id: questionId,
                answer_data: answerData,
                time_taken_seconds: currentAnswer ? currentAnswer.time_taken_seconds : 0,
                is_marked_for_review: currentAnswer ? currentAnswer.is_marked_for_review : false,
              },
            },
          }
        })
      },

      toggleMarkForReview: (questionId) => {
        set((state) => {
          const currentAnswer = state.answers[questionId]
          return {
            answers: {
              ...state.answers,
              [questionId]: {
                question_id: questionId,
                answer_data: currentAnswer?.answer_data ?? null,
                time_taken_seconds: currentAnswer ? currentAnswer.time_taken_seconds : 0,
                is_marked_for_review: !currentAnswer?.is_marked_for_review,
              },
            },
          }
        })
      },

      setCurrentQuestionIndex: (index) => {
        set({ currentQuestionIndex: index })
      },

      submitExam: () => {
        set({ status: 'SUBMITTED', endTime: Date.now() })
      },

      setHasHydrated: (value) => set({ hasHydrated: value }),

      clearExam: () => {
        set({
          sessionId: null,
          examId: null,
          questions: [],
          answers: {},
          currentQuestionIndex: 0,
          startTime: null,
          endTime: null,
          status: 'NOT_STARTED',
        })
      },
    }),
    {
      name: 'exam-storage', // name of the item in the storage (must be unique)
      storage: createJSONStorage(() => storage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated?.(true);
      },
    }
  )
)
