import React, { useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n/I18nProvider';
import { TranslationKey } from '../i18n/messages';
import { getActiveCycle, getGoals, getPlanForDate } from '../storage';
import { todayStr } from '../types';
import Icon from './Icon';

export default function HelpMenu() {
  const { t, resolveMessage } = useI18n();
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (open) dialog.current?.showModal(); }, [open]);
  const close = () => { dialog.current?.close(); setOpen(false); trigger.current?.focus(); };
  const cycle = open ? getActiveCycle() : undefined;
  const plan = cycle ? getPlanForDate(cycle.id, todayStr()) : undefined;
  const goals = cycle ? getGoals(cycle.id) : [];
  return <>
    <button ref={trigger} className="help-trigger" type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-label={t('ui.help')}>
      <Icon name="help"/><span>{t('ui.help')}</span><Icon name="chevron"/>
    </button>
    <dialog ref={dialog} className="help-dialog" aria-labelledby="help-title" onClose={() => { setOpen(false); trigger.current?.focus(); }} onClick={event => { if (event.target === event.currentTarget) close(); }}>
      <div className="help-dialog-inner">
        <header className="help-header"><h2 id="help-title">{t('ui.help')}</h2><button className="icon-button" type="button" onClick={close} aria-label={t('ui.closeHelp')}><Icon name="close"/></button></header>
        <p>{t('app.reminder')}</p>
        {plan && <details className="help-section" open><summary>{t('ui.planDetails')}<Icon name="chevron"/></summary><div>
          <p>{plan.date} · {t(`plan.mode.${plan.mode}` as TranslationKey)}</p>
          {plan.generatedReason && <p>{resolveMessage(plan.generatedReasonMessage, plan.generatedReason)}</p>}
          {plan.mainGoalIds.length > 0 && <p>{t('today.mainGoal')}：{plan.mainGoalIds.map(id => goals.find(goal => goal.id === id)?.name).filter(Boolean).join(' · ')}</p>}
          {plan.tasks.map(task => <div className="help-task" key={task.id}><strong>{resolveMessage(task.titleMessage, task.title)}</strong>{task.description && <p>{resolveMessage(task.descriptionMessage, task.description)}</p>}<p>{goals.find(goal => goal.id === task.goalId)?.name} · {t('today.target', {amount: task.targetAmount, unit: task.unitName})}</p></div>)}
          <p>{t('today.closeHint')}</p>
        </div></details>}
        <details className="help-section" open={!plan}><summary>{t('dashboard.instructions')}<Icon name="chevron"/></summary><ol>{[1,2,3,4,5,6,7].map(n => <li key={n}>{t(`dashboard.instruction${n}` as TranslationKey)}</li>)}</ol></details>
        <details className="help-section"><summary>{t('settings.coreIdea')}<Icon name="chevron"/></summary><ul>{[1,2,3,4,5,6,7,8,9].map(n => <li key={n}>{t(`settings.core${n}` as TranslationKey)}</li>)}</ul></details>
        <details className="help-section"><summary>{t('settings.dailyFlow')}<Icon name="chevron"/></summary><ol>{[1,2,3,4,5].map(n => <li key={n}>{t(`settings.flow${n}` as TranslationKey)}</li>)}</ol></details>
      </div>
    </dialog>
  </>;
}
