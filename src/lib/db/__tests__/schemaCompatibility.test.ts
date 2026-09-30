import { test, describe } from 'node:test';
import * as assert from 'node:assert';
import { isMissingColumnError } from '../schemaCompatibility';

describe('Database schema compatibility helpers', () => {
  test('detects PostgREST missing-column errors', () => {
    assert.equal(isMissingColumnError({ message: 'column exam_sessions.is_practice does not exist' }), true);
    assert.equal(isMissingColumnError({ message: 'Could not find the kind column of exams in the schema cache' }), true);
    assert.equal(isMissingColumnError({ code: 'PGRST204', message: 'Column not found' }), true);
  });

  test('does not hide unrelated database errors', () => {
    assert.equal(isMissingColumnError({ message: 'permission denied for table exam_sessions' }), false);
    assert.equal(isMissingColumnError({ message: 'duplicate key value violates unique constraint' }), false);
  });
});
