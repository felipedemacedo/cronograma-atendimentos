import { useMemo, useState } from 'react';
import { Clipboard, FileText } from 'lucide-react';
import { calculateShiftFinancials, formatCurrency } from './financialCalculations';

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

  return `${getGreeting()} ${report.name}, para o mês de ${getMonthTitle(report.month)} temos:

${shiftLines}

somando um total de ${formatCurrency(report.laborTotal)} + ${formatCurrency(report.transportTotal)} (passagem ${formatCurrency(report.passengerTicketValue)}) = VALOR TOTAL DE ${formatCurrency(report.total)}

se não puder algum destes dias e horários ou se achar algo errado me avise que ajustamos ok

Vou adiantar ${formatCurrency(report.advance)} (25%) no início do mês e deixo o restante para o final do mês, tudo bem?`;
};

export default function ReportsView({ schedules, caregivers, holidays, currentEnvDate, onCopied, onCopyError }) {
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
      caregiverSchedules.forEach((schedule) => {
        if (!daysMap.has(schedule.data_inicio)) {
          const date = new Date(`${schedule.data_inicio}T12:00:00`);
          daysMap.set(schedule.data_inicio, {
            date: schedule.data_inicio,
            weekday: WEEKDAY_LABELS[date.getDay()],
            shifts: [],
          });
        }

        daysMap.get(schedule.data_inicio).shifts.push(getShiftLabel(schedule));
      });

      const passengerTicketValue = caregiverSchedules.length > 0
        ? (totals.transportTotal / caregiverSchedules.length) / 2
        : 0;

      return {
        id: caregiver.id,
        name: caregiver.nome,
        month: selectedMonth,
        days: Array.from(daysMap.values()),
        shiftsCount: caregiverSchedules.length,
        passengerTicketValue,
        advance: totals.total * 0.25,
        ...totals,
      };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [schedules, caregivers, selectedMonth, holidays]);

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
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '16px', gap: '12px' }}>
                <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>Clique para copiar</span>
                <span style={{ fontSize: '1.25rem', color: 'var(--success)', fontWeight: 'bold' }}>
                  {formatCurrency(report.total)}
                </span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
