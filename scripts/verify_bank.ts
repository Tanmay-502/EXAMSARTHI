import fs from 'node:fs/promises'
import path from 'node:path'
import { validateExamFile, type ExamQuestion, type ExamFile } from './examDataSchema'

const DATA_DIR = path.resolve(process.cwd(), 'data/exams')
const EXPECTED_FILES = new Set([
  'general_awareness_reasoning_mock.json',
  'quantitative_aptitude_english_mock.json',
  'practice_bank.json',
])

const normalize = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9./-]+/g, '')

function asNumber(value: string): number | null {
  const match = value.replace(/,/g, '').match(/-?\d+(?:\.\d+)?/)
  return match ? Number(match[0]) : null
}

function gcd(a: number, b: number): number {
  let x = Math.abs(Math.trunc(a))
  let y = Math.abs(Math.trunc(b))
  while (y !== 0) {
    const next = x % y
    x = y
    y = next
  }
  return x
}

function assertAnswerMatches(question: ExamQuestion, expected: string | number): void {
  const actual = question.options[question.correct_answer_index]
  if (typeof expected === 'number') {
    const actualNumber = asNumber(actual)
    if (actualNumber === null || Math.abs(actualNumber - expected) > 1e-9) {
      throw new Error(`Answer mismatch: "${question.content_text}" expected ${expected}, got "${actual}"`)
    }
    return
  }

  if (normalize(actual) !== normalize(expected)) {
    throw new Error(`Answer mismatch: "${question.content_text}" expected "${expected}", got "${actual}"`)
  }
}

function verifyQuestion(question: ExamQuestion): void {
  const verification = question.verification
  if (!verification) {
    if (question.subject === 'Mathematics' || question.subject === 'Quantitative Aptitude') {
      throw new Error(`Arithmetic question lacks a machine-checkable verification block: "${question.content_text}"`)
    }
    return
  }

  let expected: string | number

  switch (verification.kind) {
    case 'expression': {
      const result = Function(`"use strict"; return (${verification.expression})`)()
      if (typeof result !== 'number' || !Number.isFinite(result)) {
        throw new Error(`Expression did not produce a finite number: "${question.content_text}"`)
      }
      expected = result
      break
    }
    case 'fraction':
      expected = `${verification.numerator}/${verification.denominator}`
      break
    case 'hcf':
      expected = gcd(verification.a, verification.b)
      break
    case 'quadratic_roots': {
      const discriminant = verification.b ** 2 - 4 * verification.a * verification.c
      if (discriminant < 0) throw new Error(`Quadratic verification has no real roots: "${question.content_text}"`)
      const root1 = (-verification.b + Math.sqrt(discriminant)) / (2 * verification.a)
      const root2 = (-verification.b - Math.sqrt(discriminant)) / (2 * verification.a)
      expected = verification.select === 'max' ? Math.max(root1, root2) : Math.min(root1, root2)
      break
    }
    case 'sequence': {
      const terms = verification.terms
      const last = terms[terms.length - 1]
      if (verification.rule === 'add') {
        if (verification.step === undefined) throw new Error('Sequence add rule requires step')
        expected = last + verification.step
      } else if (verification.rule === 'increasing_even_difference') {
        if (verification.nextDifference === undefined) throw new Error('Sequence rule requires nextDifference')
        expected = last + verification.nextDifference
      } else {
        expected = (Math.sqrt(last) + 1) ** 2
      }
      break
    }
    case 'letter_sequence': {
      const last = verification.letters[verification.letters.length - 1]
      expected = String.fromCharCode(last.charCodeAt(0) + verification.step)
      break
    }
    case 'letter_shift':
      expected = verification.input
        .split('')
        .map(char => String.fromCharCode(char.charCodeAt(0) + verification.shift))
        .join('')
      break
    case 'bar_chart_max': {
      if (
        verification.expected_index !== question.correct_answer_index ||
        verification.expected_index >= verification.values.length
      ) {
        throw new Error(`Bar-chart answer mismatch: "${question.content_text}"`)
      }
      const max = Math.max(...verification.values)
      if (verification.values.indexOf(max) !== verification.expected_index) {
        throw new Error(`Bar-chart verification metadata is inconsistent: "${question.content_text}"`)
      }
      return
    }
    case 'direction': {
      let x = 0
      let y = 0
      for (const [direction, distance] of verification.moves) {
        if (direction === 'N') y += distance
        if (direction === 'S') y -= distance
        if (direction === 'E') x += distance
        if (direction === 'W') x -= distance
      }
      const key = `${y > 0 ? 'N' : y < 0 ? 'S' : ''}${x > 0 ? 'E' : x < 0 ? 'W' : ''}`
      const labels: Record<string, string> = {
        N: 'North',
        S: 'South',
        E: 'East',
        W: 'West',
        NE: 'North-East',
        NW: 'North-West',
        SE: 'South-East',
        SW: 'South-West',
      }
      expected = labels[key]
      break
    }
    case 'direction_distance':
      let x = 0
      let y = 0
      for (const [direction, distance] of verification.moves) {
        if (direction === 'N') y += distance
        if (direction === 'S') y -= distance
        if (direction === 'E') x += distance
        if (direction === 'W') x -= distance
      }
      const direction = x > 0 ? 'east' : x < 0 ? 'west' : y > 0 ? 'north' : 'south'
      const distance = Math.sqrt(x ** 2 + y ** 2)
      const actual = question.options[question.correct_answer_index].toLowerCase()
      if (!actual.includes(String(verification.distance)) || !actual.includes(direction)) {
        throw new Error(`Direction answer mismatch: "${question.content_text}"`)
      }
      if (Math.abs(distance - verification.distance) > 1e-9 || direction[0].toUpperCase() !== verification.direction) {
        throw new Error(`Direction verification metadata is inconsistent: "${question.content_text}"`)
      }
      return
    case 'weekday_offset': {
      const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      const startIndex = weekdays.indexOf(verification.start)
      expected = weekdays[(startIndex + verification.days) % 7]
      break
    }
    case 'clock_angle': {
      const minuteAngle = verification.minute * 6
      const hourAngle = (verification.hour % 12) * 30 + verification.minute * 0.5
      const raw = Math.abs(hourAngle - minuteAngle)
      expected = Math.min(raw, 360 - raw)
      break
    }
  }

  assertAnswerMatches(question, expected)
}

async function loadFiles(): Promise<ExamFile[]> {
  const entries = await fs.readdir(DATA_DIR)
  const jsonFiles = entries.filter(name => name.endsWith('.json')).sort()
  const unknown = jsonFiles.filter(name => !EXPECTED_FILES.has(name))
  if (unknown.length > 0) throw new Error(`Unexpected JSON content files: ${unknown.join(', ')}`)

  for (const expected of EXPECTED_FILES) {
    if (!jsonFiles.includes(expected)) throw new Error(`Missing required data file: ${expected}`)
  }

  return Promise.all(jsonFiles.map(async name => {
    const filePath = path.join(DATA_DIR, name)
    const raw = JSON.parse(await fs.readFile(filePath, 'utf8'))
    return validateExamFile(raw, name)
  }))
}

async function main() {
  const files = await loadFiles()

  const timed = files.filter(file => file.kind === 'exam')
  const practice = files.find(file => file.kind === 'practice_bank')

  if (timed.length !== 2) throw new Error(`Expected exactly two timed exams, found ${timed.length}`)
  if (!practice) throw new Error('Practice bank is missing')

  const expectedTimed = new Map([
    ['General Awareness & Reasoning Mock', 25],
    ['Quantitative Aptitude & English Mock', 25],
  ])
  for (const file of timed) {
    if (expectedTimed.get(file.title) !== file.questions.length) {
      throw new Error(`Unexpected timed-exam shape for "${file.title}"`)
    }
    if (file.questions.some(question => question.source !== 'ExamSaarthi original, SSC/banking pattern')) {
      throw new Error(`Timed exam "${file.title}" contains a non-original source label`)
    }
    if (file.duration_minutes < 30 || file.duration_minutes > 40) {
      throw new Error(`Timed exam "${file.title}" must be 30-40 minutes`)
    }
  }

  if (practice.questions.length !== 120) throw new Error(`Practice bank must contain 120 questions, found ${practice.questions.length}`)
  if (practice.questions.some(question => question.source !== 'ExamSaarthi original, SSC/banking pattern')) {
    throw new Error('Practice bank contains a non-original source label')
  }

  const subjects = [...new Set(practice.questions.map(question => question.subject))]
  const expectedSubjects = ['Mathematics', 'Reasoning', 'General Knowledge', 'Science', 'Computer Science/DBMS', 'History & Polity']
  if (JSON.stringify(subjects.sort()) !== JSON.stringify([...expectedSubjects].sort())) {
    throw new Error(`Unexpected practice subjects: ${subjects.join(', ')}`)
  }

  for (const subject of expectedSubjects) {
    for (const difficulty of ['easy', 'medium', 'hard'] as const) {
      const count = practice.questions.filter(question => question.subject === subject && question.difficulty === difficulty).length
      if (count < 5) throw new Error(`Coverage is below five for ${subject}/${difficulty}`)
    }
  }

  let diagramCount = 0
  for (const file of files) {
    for (const question of file.questions) {
      if (question.verified !== false) throw new Error(`New content must default verified=false: "${question.content_text}"`)
      if (question.translation_reviewed !== false) throw new Error(`New content must start translation_reviewed=false: "${question.content_text}"`)
      if (question.exam_year !== null) throw new Error(`Original content must not claim an exam year: "${question.content_text}"`)
      verifyQuestion(question)
      if (question.image_url) {
        diagramCount += 1
        if (!question.image_url.startsWith('/diagrams/')) {
          throw new Error(`Diagram question does not use a local diagram URL: "${question.content_text}"`)
        }
        if (!question.image_alt_text) throw new Error(`Diagram question lacks alt text: "${question.content_text}"`)
        const svgPath = path.join(process.cwd(), 'public', question.image_url.replace(/^\//, ''))
        await fs.access(svgPath)
      }
    }
  }
  if (diagramCount < 6) throw new Error(`At least six diagram questions are required; found ${diagramCount}`)

  console.log(`Data verification passed: ${files.reduce((sum, file) => sum + file.questions.length, 0)} questions, ${diagramCount} diagram questions, ${subjects.length} practice subjects.`)
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
