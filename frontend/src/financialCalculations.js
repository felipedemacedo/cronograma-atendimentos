export const calculateShiftFinancials = (schedule, holidays = []) => {
  const baseRate = schedule.cuidadora_valor_hora || schedule.residencia_valor_hora || 10;
  let isNightBonus = schedule.residencia_adicional_noturno === 1;
  let bonusPct = schedule.residencia_percentual_noturno || 20;

  if (schedule.cuidadora_adicional_noturno !== null && schedule.cuidadora_adicional_noturno !== undefined) {
    isNightBonus = schedule.cuidadora_adicional_noturno === 1;
    if (isNightBonus) bonusPct = schedule.cuidadora_percentual_noturno || 20;
  }

  let isHolidayBonus = schedule.residencia_adicional_feriado === 1;
  let holBonusPct = schedule.residencia_percentual_feriado || 20;

  if (schedule.cuidadora_adicional_feriado !== null && schedule.cuidadora_adicional_feriado !== undefined) {
    isHolidayBonus = schedule.cuidadora_adicional_feriado === 1;
    if (isHolidayBonus) holBonusPct = schedule.cuidadora_percentual_feriado || 20;
  }

  const isShiftHoliday = holidays.some(h => h.data === schedule.data_inicio || h.data === schedule.data_inicio.substring(5));
  const holidayMultiplier = (isShiftHoliday && isHolidayBonus) ? (holBonusPct / 100) : 0;

  const start = new Date(`${schedule.data_inicio}T${schedule.hora_inicio}:00`);
  const end = new Date(`${schedule.data_fim}T${schedule.hora_fim}:00`);

  let normalMinutes = 0;
  let nightMinutes = 0;

  let current = new Date(start);
  while (current < end) {
    const hour = current.getHours();
    if (hour >= 22 || hour < 5) nightMinutes += 1;
    else normalMinutes += 1;
    current.setMinutes(current.getMinutes() + 1);
  }

  const normalHours = normalMinutes / 60;
  const nightHours = nightMinutes / 60;

  let laborCost = normalHours * baseRate * (1 + holidayMultiplier);
  if (isNightBonus) {
    laborCost += nightHours * (baseRate * (1 + (bonusPct / 100) + holidayMultiplier));
  } else {
    laborCost += nightHours * baseRate * (1 + holidayMultiplier);
  }

  const transportCost = parseFloat(
    schedule.valor_transporte !== null && schedule.valor_transporte !== undefined ? schedule.valor_transporte : 9
  );

  return {
    laborCost,
    normalHours,
    nightHours,
    transportCost,
    totalCost: laborCost + transportCost,
  };
};

export const formatCurrency = (value) => (
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
);
