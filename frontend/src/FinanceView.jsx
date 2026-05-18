import React, { useMemo, useState } from 'react';
import { DollarSign, Filter, Save } from 'lucide-react';
import { calculateShiftFinancials, formatCurrency } from './financialCalculations';
import { getDebtSummaryForMonth } from './debtCalculations';

export default function FinanceView({ schedules, residences, debts, advances = [], holidays, currentEnvDate, onSaveAdvance }) {
  const [selectedMonth, setSelectedMonth] = useState(`${currentEnvDate.getFullYear()}-${String(currentEnvDate.getMonth() + 1).padStart(2, '0')}`);
  const [selectedResidence, setSelectedResidence] = useState('');
  const [advanceDrafts, setAdvanceDrafts] = useState({});
  
  // Calculate Finances
  const reportData = useMemo(() => {
    if (!schedules) return [];
    
    const [yStr, mStr] = selectedMonth.split('-');
    let reportSchedules = schedules.filter(s => s.data_inicio.startsWith(`${yStr}-${mStr}`) && s.cuidadora_regime_clt !== 1);
    
    if (selectedResidence) {
      reportSchedules = reportSchedules.filter(s => s.residencia_id === selectedResidence);
    }

    const caregiverTotals = {};

    reportSchedules.forEach(s => {
      if (!caregiverTotals[s.cuidadora_id]) {
        caregiverTotals[s.cuidadora_id] = {
          id: s.cuidadora_id,
          nome: s.cuidadora_nome,
          totalCost: 0,
          transportTotal: 0,
          debtDiscountTotal: 0,
          normalHoursTotal: 0,
          nightHoursTotal: 0,
          shiftsCount: 0
        };
      }

      const shiftFinancials = calculateShiftFinancials(s, holidays);

      caregiverTotals[s.cuidadora_id].totalCost += shiftFinancials.totalCost;
      caregiverTotals[s.cuidadora_id].transportTotal += shiftFinancials.transportCost;
      caregiverTotals[s.cuidadora_id].normalHoursTotal += shiftFinancials.normalHours;
      caregiverTotals[s.cuidadora_id].nightHoursTotal += shiftFinancials.nightHours;
      caregiverTotals[s.cuidadora_id].shiftsCount += 1;
    });

    Object.values(caregiverTotals).forEach((caregiverTotal) => {
      const debtSummary = getDebtSummaryForMonth(
        debts.filter(debt => debt.cuidadora_id === caregiverTotal.id),
        selectedMonth
      );
      const advance = advances.find(item => item.cuidadora_id === caregiverTotal.id && item.mes === selectedMonth);

      caregiverTotal.debtDiscountTotal = debtSummary.deductionTotal;
      caregiverTotal.baseNetTotal = Math.max(0, caregiverTotal.totalCost - debtSummary.deductionTotal);
      caregiverTotal.advanceTotal = Number(advance?.valor) || 0;
      caregiverTotal.netTotal = Math.max(0, caregiverTotal.baseNetTotal - caregiverTotal.advanceTotal);
    });

    return Object.values(caregiverTotals).sort((a, b) => b.netTotal - a.netTotal);

  }, [schedules, selectedMonth, selectedResidence, holidays, debts, advances]);

  const overallTotal = reportData.reduce((acc, curr) => acc + curr.netTotal, 0);
  const overallAdvance = reportData.reduce((acc, curr) => acc + curr.advanceTotal, 0);
  const overallBaseNetTotal = reportData.reduce((acc, curr) => acc + curr.baseNetTotal, 0);

  const getSuggestedAdvance = (caregiver) => (caregiver.baseNetTotal * 0.25).toFixed(2);

  const getAdvanceDraft = (caregiver) => {
    const savedValue = caregiver.advanceTotal || 0;
    const draft = advanceDrafts[caregiver.id];

    if (draft?.month === selectedMonth && draft?.savedValue === savedValue) {
      return draft;
    }

    return {
      checked: savedValue > 0,
      value: savedValue > 0 ? String(savedValue) : '',
      month: selectedMonth,
      savedValue,
    };
  };

  const handleAdvanceToggle = (caregiver) => {
    setAdvanceDrafts(prev => {
      const current = getAdvanceDraft(caregiver);
      const shouldCheck = !current.checked;

      return {
        ...prev,
        [caregiver.id]: {
          checked: shouldCheck,
          value: shouldCheck ? (current.value || getSuggestedAdvance(caregiver)) : '0',
          month: selectedMonth,
          savedValue: caregiver.advanceTotal || 0,
        },
      };
    });
  };

  const handleAdvanceChange = (caregiver, value) => {
    setAdvanceDrafts(prev => ({
      ...prev,
      [caregiver.id]: {
        ...getAdvanceDraft(caregiver),
        checked: true,
        value,
        month: selectedMonth,
        savedValue: caregiver.advanceTotal || 0,
      },
    }));
  };

  const handleAdvanceSave = async (caregiver) => {
    const draft = getAdvanceDraft(caregiver);
    const normalizedValue = Number(String(draft.value || '0').replace(',', '.'));
    const value = draft.checked && Number.isFinite(normalizedValue) ? Math.max(0, normalizedValue) : 0;

    await onSaveAdvance({
      cuidadora_id: caregiver.id,
      mes: selectedMonth,
      valor: value,
    });
  };

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: '24px' }}>
        <h2 style={{ color: 'white' }}>Relatório Financeiro</h2>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
            <Filter size={16} /> Residência:
            <select 
              className="form-control" 
              value={selectedResidence} 
              onChange={e => setSelectedResidence(e.target.value)}
              style={{ width: '200px' }}
            >
              <option value="">Todas as Residências</option>
              {residences.map(r => (
                <option key={r.id} value={r.id}>{r.nome}</option>
              ))}
            </select>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
            Mês:
            <input 
              type="month" 
              className="form-control" 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{ width: '150px' }}
            />
          </label>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '32px', textAlign: 'center', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(16, 185, 129, 0.1))', padding: '32px' }}>
        <h3 style={{ color: 'var(--text-muted)', marginBottom: '8px', fontSize: '1rem' }}>Total Líquido Previsto no Mês</h3>
        <p style={{ fontSize: '3rem', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>
          {formatCurrency(overallBaseNetTotal)}
        </p>
        {overallAdvance > 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', color: 'var(--text-muted)', fontSize: '1rem' }}>
            <span>Já pago neste mês: <strong style={{ color: 'var(--danger)' }}>{formatCurrency(overallAdvance)}</strong></span>
            <span>Restante a Pagar: <strong style={{ color: 'var(--success)' }}>{formatCurrency(overallTotal)}</strong></span>
          </div>
        )}
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
        {reportData.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            <DollarSign size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
            <h3>Nenhum plantão agendado para o mês selecionado.</h3>
          </div>
        ) : (
          reportData.map(c => {
            const advanceDraft = getAdvanceDraft(c);

            return (
            <div key={c.id} className="card">
              <h3 style={{ fontSize: '1.2rem', color: 'white', marginBottom: '8px' }}>{c.nome}</h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: '16px', fontSize: '0.9rem' }}>{c.shiftsCount} plantões no mês</p>
              
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.9rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span>Horas Normais:</span>
                  <span style={{ color: 'white', fontWeight: '500' }}>{c.normalHoursTotal.toFixed(1)}h</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span>Horas Noturnas:</span>
                  <span style={{ color: 'white', fontWeight: '500' }}>{c.nightHoursTotal.toFixed(1)}h</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Transporte Pago:</span>
                  <span style={{ color: 'white', fontWeight: '500' }}>
                    {formatCurrency(c.transportTotal)}
                  </span>
                </div>
                {c.debtDiscountTotal > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                    <span>Desconto de Dívidas:</span>
                    <span style={{ color: 'var(--danger)', fontWeight: '500' }}>- {formatCurrency(c.debtDiscountTotal)}</span>
                  </div>
                )}
                {c.advanceTotal > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                    <span>Adiantamento Pago:</span>
                    <span style={{ color: 'var(--danger)', fontWeight: '500' }}>- {formatCurrency(c.advanceTotal)}</span>
                  </div>
                )}
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '14px', marginBottom: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-main)', fontWeight: '600', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={advanceDraft.checked}
                    onChange={() => handleAdvanceToggle(c)}
                  />
                  Valor antecipado pago
                </label>

                {advanceDraft.checked && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px', alignItems: 'end', marginTop: '12px' }}>
                    <label style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      Valor do adiantamento
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="form-control"
                        value={advanceDraft.value || ''}
                        onChange={(event) => handleAdvanceChange(c, event.target.value)}
                        style={{ width: '100%', marginTop: '6px' }}
                      />
                    </label>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => handleAdvanceSave(c)}
                      disabled={!onSaveAdvance}
                      title="Salvar adiantamento"
                      style={{ height: '45px', paddingInline: '14px' }}
                    >
                      <Save size={16} />
                      Salvar
                    </button>
                  </div>
                )}
                {!advanceDraft.checked && c.advanceTotal > 0 && (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => handleAdvanceSave(c)}
                    disabled={!onSaveAdvance}
                    style={{ marginTop: '12px', width: '100%' }}
                  >
                    Salvar sem adiantamento
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>Líquido a Pagar</span>
                <span style={{ fontSize: '1.4rem', color: 'var(--success)', fontWeight: 'bold' }}>
                  {formatCurrency(c.netTotal)}
                </span>
              </div>
            </div>
            );
          })
        )}
      </div>

    </div>
  );
}
