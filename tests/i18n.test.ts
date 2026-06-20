import { beforeEach, describe, expect, it } from 'vitest';
import { messages, resolveLocalizedMessage, translate } from '../src/i18n/messages';
import { getSettings, importDataJSON, saveSettings } from '../src/storage';

const values = new Map<string, string>();

beforeEach(() => {
  values.clear();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    },
  });
});

describe('translation catalog', () => {
  it('contains Chinese and English text for every message key', () => {
    for (const message of Object.values(messages)) {
      expect(message.zh.trim()).not.toBe('');
      expect(message.en.trim()).not.toBe('');
    }
  });

  it('interpolates numbers and locale-aware lists', () => {
    expect(translate('zh', 'plan.mainGoalReason', { goalNames: ['数学', '英语'] })).toBe(
      '今日主线目标：数学和英语。按正常节奏推进。',
    );
    expect(translate('en', 'plan.mainGoalReason', { goalNames: ['Math', 'English'] })).toBe(
      'Today’s main goals: Math and English. Keep a steady pace.',
    );
    expect(translate('en', 'review.lowCompletionSuggestion', { count: 3 })).toContain('3');
  });

  it('resolves localized metadata and falls back for legacy records', () => {
    expect(
      resolveLocalizedMessage('en', { key: 'plan.noActiveGoals' }, '旧版中文内容'),
    ).toBe('No active study goals. Create a study goal first.');
    expect(resolveLocalizedMessage('en', undefined, '用户自填内容')).toBe('用户自填内容');
  });
});

describe('language preference', () => {
  it('defaults to Chinese and persists an explicit English selection', () => {
    expect(getSettings().language ?? 'zh').toBe('zh');
    saveSettings({ language: 'en' });
    expect(getSettings().language).toBe('en');
  });
});

describe('localized import errors', () => {
  it('returns stable error codes instead of user-facing text', () => {
    expect(importDataJSON('null')).toEqual({ success: false, errorCode: 'invalidFormat' });
    expect(importDataJSON('{}')).toEqual({ success: false, errorCode: 'missingFields' });
    const result = importDataJSON('{');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errorCode).toBe('jsonParse');
  });
});
