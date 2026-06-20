import { LocalizedMessage, TranslationKey } from './i18n/messages';
import { RhythmStatus, UserState } from './types';

const suggestionKeys: Record<RhythmStatus, TranslationKey> = {
  ahead: 'checkin.suggestion.ahead', stable: 'checkin.suggestion.stable',
  slightlyBehind: 'checkin.suggestion.slightlyBehind', behind: 'checkin.suggestion.behind',
  slipping: 'checkin.suggestion.slipping',
};

const suggestionFallbacks: Record<RhythmStatus, string> = {
  ahead: '你现在略微领先，保持节奏即可，不需要加码。', stable: '节奏稳定，继续按今天这种强度推进。',
  slightlyBehind: '略低于标准，不需要补债，明天滚动调整。', behind: '已经明显落后，但不要一次性追赶，先用保底任务把线接回来。',
  slipping: '系统正在滑坡，建议降强度不断线，优先恢复节奏。',
};

export function buildCheckInMessages(minimumComplete: boolean, rhythm: RhythmStatus, state: UserState): {
  summary: string;
  summaryMessage: LocalizedMessage;
  suggestion: string;
  suggestionMessages: LocalizedMessage[];
} {
  const summary = minimumComplete ? '保底任务已完成，今天没有断线。' : '保底任务未完成，但没关系，明天可以重新开始。';
  const summaryMessage: LocalizedMessage = { key: minimumComplete ? 'checkin.minimumCompleted' : 'checkin.minimumIncomplete' };
  const suggestionMessages: LocalizedMessage[] = [{ key: suggestionKeys[rhythm] }];
  let suggestion = suggestionFallbacks[rhythm];
  if (state === 'tired' || state === 'bad') {
    suggestionMessages.unshift({ key: 'checkin.suggestion.tired' });
    suggestion = `今天状态不好，系统已自动降强度。完成保底任务就算成功。 ${suggestion}`;
  }
  return { summary, summaryMessage, suggestion, suggestionMessages };
}
