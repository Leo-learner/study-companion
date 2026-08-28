import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getActiveCycle, getCheckIns, getPlans } from '../storage';
import { useI18n } from '../i18n/I18nProvider';
import Icon from '../components/Icon';
import CheckInResult from '../components/CheckInResult';

/** 历史里点进来的收工详情，复用当天收工后的同一块反馈。 */
export default function CheckInView() {
  const { t } = useI18n();
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const cycle = getActiveCycle();

  if (!cycle) {
    return (
      <div className="empty">
        <div className="empty-mark"><Icon name="book" size={30} /></div>
        <button className="btn btn-primary btn-lg" onClick={() => navigate('/')}>{t('common.backHome')}</button>
      </div>
    );
  }

  const checkIn = getCheckIns(cycle.id).find((item) => item.planId === planId);
  const plan = getPlans(cycle.id).find((item) => item.id === planId);

  if (!checkIn || !plan) {
    return (
      <div className="empty">
        <div className="empty-mark"><Icon name="history" size={30} /></div>
        <h1 className="h2">{t('checkin.notFound')}</h1>
        <button className="btn btn-primary btn-lg" onClick={() => navigate('/history')}>{t('checkin.backHistory')}</button>
      </div>
    );
  }

  return <CheckInResult checkIn={checkIn} plan={plan} cycle={cycle} />;
}
