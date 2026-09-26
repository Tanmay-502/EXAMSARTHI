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
  
  // Actions
  initializeExam: (sessionId: string, examId: string, questions: Question[]) => void
  setAnswer: (questionId: string, answerData: unknown) => void
  toggleMarkForReview: (questionId: string) => void
  setCurrentQuestionIndex: (index: number) => void
  submitExam: () => void
  clearExam: () => void
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

      initializeExam: (sessionId, examId, questions) => {
        set({
          sessionId,
          examId,
          questions,
          answers: {},
          currentQuestionIndex: 0,
          startTime: Date.now(),
          endTime: null,
          status: 'IN_PROGRESS',
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
                answer_data: currentAnswer?.answer_data || null,
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
    }
  )
)
