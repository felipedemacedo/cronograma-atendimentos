import { useMemo, useState } from 'react';
import { Clipboard, FileText } from 'lucide-react';
import { calculateShiftFinancials, formatCurrency } from './financialCalculations';
import { getDebtSummaryForMonth } from './debtCalculations';

const WEEKDAY_LABELS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];
const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const formatDateBr = (dateStr) => {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
};

const formatTime = (timeStr) => {
  const [hour, minute] = timeStr.split(':');
  const hourNumber = parseInt(hour, 10);
  if (minute === '00') return `${hourNumber}h`;
  return `${hourNumber}h${minute}`;
};

const getShiftLabel = (schedule) => {
  const range = `(${formatTime(schedule.hora_inicio)} às ${formatTime(schedule.hora_fim)})`;

  if (schedule.hora_inicio === '07:00' && schedule.hora_fim === '19:00') {
    return `DIA ${range}`;
  }

  if (schedule.hora_inicio === '19:00' && schedule.hora_fim === '07:00') {
    return `NOITE ${range}`;
  }

  return `PLANTÃO ${range}`;
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
};

const getMonthTitle = (selectedMonth) => {
  const [yearStr, monthStr] = selectedMonth.split('-');
  const monthIndex = parseInt(monthStr, 10) - 1;
  return `${MONTH_NAMES[monthIndex]}/${yearStr.slice(-2)}`;
};

const copyToClipboard = async (text) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
};

const buildReportText = (report) => {
  const shiftLines = report.days.length > 0
    ? report.days.map(day => `${day.weekday}, ${formatDateBr(day.date)}, ${day.shifts.join(' & ')}`).join('\n')
    : 'Nenhum plantão encontrado para este mês.';
  const debtText = report.debtDiscountTotal > 0
    ? `\n\nSobre a dívida combinada, o objetivo é ir quitando aos poucos de forma tranquila. O valor total combinado é de ${formatCurrency(report.totalDebtValue)}. Até este mês, considerando o desconto atual, já ficam abatidos ${formatCurrency(report.paidDebtThroughMonth)}. Neste mês do relatório será descontado ${formatCurrency(report.debtDiscountTotal)}, restando aproximadamente ${formatCurrency(report.remainingDebtTotal)} para quitar.`
    : '';

  return `${getGreeting()} ${report.name}, para o mês de ${getMonthTitle(report.month)} temos:

${shiftLines}

somando um total de ${formatCurrency(report.laborTotal)} + ${formatCurrency(report.transportTotal)} (passagem ${formatCurrency(report.passengerTicketValue)}) = VALOR TOTAL DE ${formatCurrency(report.total)}
${debtText}

se não puder algum destes dias e horários ou se achar algo errado me avise que ajustamos ok

Vou adiantar ${formatCurrency(report.advance)} (25%) no início do mês e deixo o restante para o final do mês, tudo bem?`;
};

export default function ReportsView({ schedules, caregivers, debts, holidays, currentEnvDate, onCopied, onCopyError }) {
  const [selectedMonth, setSelectedMonth] = useState(`${currentEnvDate.getFullYear()}-${String(currentEnvDate.getMonth() + 1).padStart(2, '0')}`);

  const reports = useMemo(() => {
    const monthSchedules = schedules.filter(schedule => schedule.data_inicio.startsWith(selectedMonth));

    return caregivers.map((caregiver) => {
      const caregiverSchedules = monthSchedules
        .filter(schedule => schedule.cuidadora_id === caregiver.id)
        .sort((a, b) => `${a.data_inicio} ${a.hora_inicio}`.localeCompare(`${b.data_inicio} ${b.hora_inicio}`));

      const totals = caregiverSchedules.reduce((acc, schedule) => {
        const shiftFinancials = calculateShiftFinancials(schedule, holidays);
        return {
          laborTotal: acc.laborTotal + shiftFinancials.laborCost,
          transportTotal: acc.transportTotal + shiftFinancials.transportCost,
          total: acc.total + shiftFinancials.totalCost,
        };
      }, { laborTotal: 0, transportTotal: 0, total: 0 });

      const daysMap = new Map();

      const addShiftToDay = (dateStr, label) => {
        if (!daysMap.has(dateStr)) {
          const [y, m, d] = dateStr.split('-').map(Number);
          const date = new Date(y, m - 1, d);
          daysMap.set(dateStr, {
            date: dateStr,
            weekday: WEEKDAY_LABELS[date.getDay()],
            shifts: [],
          });
        }
        daysMap.get(dateStr).shifts.push(label);
      };

      caregiverSchedules.forEach((schedule) => {
        const [sy, sm, sd] = schedule.data_inicio.split('-').map(Number);
        const [ey, em, ed] = schedule.data_fim.split('-').map(Number);
        const startDT = new Date(sy, sm - 1, sd);
        const endDT = new Date(ey, em - 1, ed);
        const diffDays = Math.round((endDT - startDT) / (1000 * 60 * 60 * 24));

        if (diffDays <= 1) {
          addShiftToDay(schedule.data_inicio, getShiftLabel(schedule));
        } else {
          // Multi-day shift (spans across multiple midnights)
          addShiftToDay(schedule.data_inicio, `PLANTÃO (${formatTime(schedule.hora_inicio)} às 24h)`);
          
          for (let i = 1; i < diffDays; i++) {
             const intermediateDate = new Date(sy, sm - 1, sd + i);
             const yyyy = intermediateDate.getFullYear();
             const mm = String(intermediateDate.getMonth() + 1).padStart(2, '0');
             const dd = String(intermediateDate.getDate()).padStart(2, '0');
             addShiftToDay(`${yyyy}-${mm}-${dd}`, `PLANTÃO (24h)`);
          }

          if (schedule.hora_fim !== '00:00') {
             addShiftToDay(schedule.data_fim, `PLANTÃO (0h às ${formatTime(schedule.hora_fim)})`);
          }
        }
      });

      const passengerTicketValue = caregiverSchedules.length > 0
        ? (totals.transportTotal / caregiverSchedules.length) / 2
        : 0;
      const debtSummary = totals.total > 0
        ? getDebtSummaryForMonth(
          debts.filter(debt => debt.cuidadora_id === caregiver.id),
          selectedMonth
        )
        : { deductionTotal: 0, remainingAfterMonth: 0, totalDebtValue: 0, paidThroughMonth: 0 };
      const netTotal = Math.max(0, totals.total - debtSummary.deductionTotal);

      return {
        id: caregiver.id,
        name: caregiver.nome,
        month: selectedMonth,
        days: Array.from(daysMap.values()),
        shiftsCount: caregiverSchedules.length,
        passengerTicketValue,
        debtDiscountTotal: debtSummary.deductionTotal,
        remainingDebtTotal: debtSummary.remainingAfterMonth,
        totalDebtValue: debtSummary.totalDebtValue,
        paidDebtThroughMonth: debtSummary.paidThroughMonth,
        netTotal,
        advance: netTotal * 0.25,
        ...totals,
      };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [schedules, caregivers, debts, selectedMonth, holidays]);

  const handleCopyReport = async (report) => {
    try {
      await copyToClipboard(buildReportText(report));
      onCopied(`Relatório de ${report.name} copiado.`);
    } catch (error) {
      console.error('Erro ao copiar relatorio:', error);
      onCopyError('Não foi possível copiar o relatório.');
    }
  };

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: '24px', gap: '16px', flexWrap: 'wrap' }}>
        <h2 style={{ color: 'white' }}>Relatórios</h2>
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

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
        {reports.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            <FileText size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
            <h3>Nenhuma funcionária visível para o usuário logado.</h3>
          </div>
        ) : (
          reports.map(report => (
            <button
              key={report.id}
              type="button"
              className="card report-card"
              onClick={() => handleCopyReport(report)}
              aria-label={`Copiar relatório de ${report.name}`}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div style={{ textAlign: 'left' }}>
                  <h3 style={{ fontSize: '1.2rem', color: 'white', marginBottom: '8px' }}>{report.name}</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{report.shiftsCount} plantões no mês</p>
                </div>
                <Clipboard size={20} style={{ color: 'var(--primary)', flexShrink: 0 }} />
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.9rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', gap: '12px' }}>
                  <span>Valor dos plantões:</span>
                  <span style={{ color: 'white', fontWeight: '500' }}>{formatCurrency(report.laborTotal)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', gap: '12px' }}>
                  <span>Transporte:</span>
                  <span style={{ color: 'white', fontWeight: '500' }}>{formatCurrency(report.transportTotal)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                  <span>Adiantamento 25%:</span>
                  <span style={{ color: 'white', fontWeight: '500' }}>{formatCurrency(report.advance)}</span>
                </div>
                {report.debtDiscountTotal > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', gap: '12px' }}>
                    <span>Desconto dívida:</span>
                    <span style={{ color: 'var(--danger)', fontWeight: '500' }}>- {formatCurrency(report.debtDiscountTotal)}</span>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '16px', gap: '12px' }}>
                <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>Clique para copiar</span>
                <span style={{ fontSize: '1.25rem', color: 'var(--success)', fontWeight: 'bold' }}>
                  {formatCurrency(report.netTotal)}
                </span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
