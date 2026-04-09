import React, { useState, useMemo } from 'react';
import { DollarSign, Filter } from 'lucide-react';

export default function FinanceView({ schedules, caregivers, residences, holidays, currentEnvDate }) {
  const [selectedMonth, setSelectedMonth] = useState(`${currentEnvDate.getFullYear()}-${String(currentEnvDate.getMonth() + 1).padStart(2, '0')}`);
  
  // Calculate Finances
  const reportData = useMemo(() => {
    if (!schedules) return [];
    
    const [yStr, mStr] = selectedMonth.split('-');
    const reportSchedules = schedules.filter(s => s.data_inicio.startsWith(`${yStr}-${mStr}`) && s.cuidadora_regime_clt !== 1);

    const caregiverTotals = {};

    reportSchedules.forEach(s => {
      if (!caregiverTotals[s.cuidadora_id]) {
        caregiverTotals[s.cuidadora_id] = {
          id: s.cuidadora_id,
          nome: s.cuidadora_nome,
          totalCost: 0,
          transportTotal: 0,
          normalHoursTotal: 0,
          nightHoursTotal: 0,
          shiftsCount: 0
        };
      }

      const baseRate = s.cuidadora_valor_hora || s.residencia_valor_hora || 10;
      let isNightBonus = s.residencia_adicional_noturno === 1;
      let bonusPct = s.residencia_percentual_noturno || 20;

      if (s.cuidadora_adicional_noturno !== null && s.cuidadora_adicional_noturno !== undefined) {
        isNightBonus = s.cuidadora_adicional_noturno === 1;
        if (isNightBonus) bonusPct = s.cuidadora_percentual_noturno || 20;
      }

      let isHolidayBonus = s.residencia_adicional_feriado === 1;
      let holBonusPct = s.residencia_percentual_feriado || 20;

      if (s.cuidadora_adicional_feriado !== null && s.cuidadora_adicional_feriado !== undefined) {
        isHolidayBonus = s.cuidadora_adicional_feriado === 1;
        if (isHolidayBonus) holBonusPct = s.cuidadora_percentual_feriado || 20;
      }

      const year = parseInt(s.data_inicio.split('-')[0], 10);
      const isShiftHoliday = holidays.some(h => h.data === s.data_inicio);
      const holidayMultiplier = (isShiftHoliday && isHolidayBonus) ? (holBonusPct / 100) : 0;

      const start = new Date(`${s.data_inicio}T${s.hora_inicio}:00`);
      const end = new Date(`${s.data_fim}T${s.hora_fim}:00`);
      
      let normalMinutes = 0;
      let nightMinutes = 0;

      let current = new Date(start);
      while(current < end) {
        const h = current.getHours();
        if (h >= 22 || h < 5) nightMinutes++;
        else normalMinutes++;
        current.setMinutes(current.getMinutes() + 1);
      }

      const normalHours = normalMinutes / 60;
      const nightHours = nightMinutes / 60;
      
      let shiftCost = normalHours * baseRate * (1 + holidayMultiplier);
      if (isNightBonus) {
        shiftCost += nightHours * (baseRate * (1 + (bonusPct / 100) + holidayMultiplier));
      } else {
        shiftCost += nightHours * baseRate * (1 + holidayMultiplier);
      }
      
      const transportCost = parseFloat(s.valor_transporte !== null && s.valor_transporte !== undefined ? s.valor_transporte : 9);
      shiftCost += transportCost;

      caregiverTotals[s.cuidadora_id].totalCost += shiftCost;
      caregiverTotals[s.cuidadora_id].transportTotal += transportCost;
      caregiverTotals[s.cuidadora_id].normalHoursTotal += normalHours;
      caregiverTotals[s.cuidadora_id].nightHoursTotal += nightHours;
      caregiverTotals[s.cuidadora_id].shiftsCount += 1;
    });

    return Object.values(caregiverTotals).sort((a, b) => b.totalCost - a.totalCost);

  }, [schedules, selectedMonth]);

  const overallTotal = reportData.reduce((acc, curr) => acc + curr.totalCost, 0);

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: '24px' }}>
        <h2 style={{ color: 'white' }}>Relatório Financeiro</h2>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
            <Filter size={16} /> Mês:
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
        <h3 style={{ color: 'var(--text-muted)', marginBottom: '8px', fontSize: '1rem' }}>Custo Total Previsto no Mês</h3>
        <p style={{ fontSize: '3rem', fontWeight: 'bold', color: 'white' }}>
          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(overallTotal)}
        </p>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
        {reportData.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            <DollarSign size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
            <h3>Nenhum plantão agendado para o mês selecionado.</h3>
          </div>
        ) : (
          reportData.map(c => (
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
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(c.transportTotal)}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>Total a Pagar</span>
                <span style={{ fontSize: '1.4rem', color: 'var(--success)', fontWeight: 'bold' }}>
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(c.totalCost)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
}
