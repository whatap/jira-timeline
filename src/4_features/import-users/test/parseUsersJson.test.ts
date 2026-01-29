import { describe, expect, it } from 'vitest';

import { parseUsersJson } from '../util/parseUsersJson';

describe('parseUsersJson', () => {
  describe('Export 형식 파싱', () => {
    it('should parse full export format with version', () => {
      const json = JSON.stringify({
        version: 1,
        exportedAt: '2024-01-29T12:00:00.000Z',
        users: [
          { id: 'abc123', displayName: '홍길동' },
          { id: 'def456', displayName: '김철수' },
        ],
      });

      const result = parseUsersJson(json);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.userIds).toEqual(['abc123', 'def456']);
      }
    });

    it('should parse simple object format with users array', () => {
      const json = JSON.stringify({
        users: [{ id: 'abc123' }, { id: 'def456' }],
      });

      const result = parseUsersJson(json);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.userIds).toEqual(['abc123', 'def456']);
      }
    });

    it('should parse users array with string IDs', () => {
      const json = JSON.stringify({
        users: ['abc123', 'def456'],
      });

      const result = parseUsersJson(json);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.userIds).toEqual(['abc123', 'def456']);
      }
    });
  });

  describe('배열 형식 파싱', () => {
    it('should parse plain string array', () => {
      const json = JSON.stringify(['abc123', 'def456', 'ghi789']);

      const result = parseUsersJson(json);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.userIds).toEqual(['abc123', 'def456', 'ghi789']);
      }
    });
  });

  describe('중복 및 공백 처리', () => {
    it('should remove duplicate IDs', () => {
      const json = JSON.stringify(['abc123', 'def456', 'abc123', 'def456']);

      const result = parseUsersJson(json);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.userIds).toEqual(['abc123', 'def456']);
      }
    });

    it('should trim whitespace from IDs', () => {
      const json = JSON.stringify(['  abc123  ', '  def456  ']);

      const result = parseUsersJson(json);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.userIds).toEqual(['abc123', 'def456']);
      }
    });

    it('should filter out empty strings', () => {
      const json = JSON.stringify(['abc123', '', '  ', 'def456']);

      const result = parseUsersJson(json);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.userIds).toEqual(['abc123', 'def456']);
      }
    });
  });

  describe('에러 케이스', () => {
    it('should return error for invalid JSON', () => {
      const result = parseUsersJson('not a json');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('올바른 JSON 형식이 아닙니다');
      }
    });

    it('should return error for unsupported format', () => {
      const json = JSON.stringify({ name: 'test' });

      const result = parseUsersJson(json);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('지원하지 않는 파일 형식입니다');
      }
    });

    it('should return error for empty users array', () => {
      const json = JSON.stringify({ users: [] });

      const result = parseUsersJson(json);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('유효한 사용자 ID가 없습니다');
      }
    });

    it('should return error for array of empty strings only', () => {
      const json = JSON.stringify(['', '  ', '   ']);

      const result = parseUsersJson(json);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('유효한 사용자 ID가 없습니다');
      }
    });

    it('should return error for number instead of string', () => {
      const json = JSON.stringify(12345);

      const result = parseUsersJson(json);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('지원하지 않는 파일 형식입니다');
      }
    });
  });
});
