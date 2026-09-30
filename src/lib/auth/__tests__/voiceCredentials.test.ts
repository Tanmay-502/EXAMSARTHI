import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getSafeVoiceNextPath,
  normalizeVoicePassword,
  normalizeVoiceUserId,
  verifyVoiceCredentials,
} from '../voiceCredentials'

test('voice credentials normalize spoken user ids', () => {
  assert.equal(normalizeVoiceUserId('My user id is Tan May zero nine'), 'tanmay09')
})

test('voice credentials normalize spoken numeric passwords', () => {
  assert.equal(normalizeVoicePassword('My password is one two three four five'), '12345')
})

test('built-in demo credential is verified server-side', () => {
  assert.equal(verifyVoiceCredentials('tanmay09', '12345')?.displayName, 'Tanmay')
  assert.equal(verifyVoiceCredentials('tanmay09', '99999'), null)
})

test('voice next paths stay local', () => {
  assert.equal(getSafeVoiceNextPath('/practice?count=10'), '/practice?count=10')
  assert.equal(getSafeVoiceNextPath('https://evil.example/phish'), '/dashboard')
})
