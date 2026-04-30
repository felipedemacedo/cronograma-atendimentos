export const monthToIndex = (month) => {
  const [year, monthNumber] = month.split('-').map(Number);
  return year * 12 + monthNumber;
};

export const indexToMonth = (monthIndex) => {
  const zeroBasedIndex = monthIndex - 1;
  const year = Math.floor(zeroBasedIndex / 12);
  const month = (zeroBasedIndex % 12) + 1;
  return `${year}-${String(month).padStart(2, '0')}`;
};

export const addMonths = (month, amount) => indexToMonth(monthToIndex(month) + amount);

export const getDebtTotalWithInterest = (debt) => {
  const baseValue = Number(debt.valor_original) || 0;
  const interestPercent = Number(debt.percentual_juros) || 0;
  return baseValue * (1 + (interestPercent / 100));
};

export const getDebtInstallmentPlan = (debt) => {
  const total = getDebtTotalWithInterest(debt);
  const installments = debt.forma_pagamento === 'parcelado'
    ? Math.max(1, Number(debt.quantidade_parcelas) || 1)
    : 1;
  const targetIndex = monthToIndex(debt.mes_quitacao);
  const startIndex = debt.mes_inicio_desconto
    ? monthToIndex(debt.mes_inicio_desconto)
    : targetIndex - installments + 1;
  const monthlyValue = total / installments;

  return {
    total,
    installments,
    targetIndex,
    startIndex,
    startMonth: indexToMonth(startIndex),
    monthlyValue,
  };
};

export const getDebtMonthStatus = (debt, selectedMonth) => {
  if (!debt?.mes_quitacao || !selectedMonth) {
    return {
      applies: false,
      deduction: 0,
      remainingAfterMonth: getDebtTotalWithInterest(debt || {}),
      paidThroughMonth: 0,
      installmentNumber: 0,
      installments: 0,
    };
  }

  const plan = getDebtInstallmentPlan(debt);
  const selectedIndex = monthToIndex(selectedMonth);
  const applies = selectedIndex >= plan.startIndex && selectedIndex <= plan.targetIndex;
  const paidInstallments = Math.min(
    plan.installments,
    Math.max(0, selectedIndex - plan.startIndex + 1)
  );

  return {
    applies,
    deduction: applies ? plan.monthlyValue : 0,
    remainingAfterMonth: Math.max(0, plan.total - (plan.monthlyValue * paidInstallments)),
    paidThroughMonth: Math.min(plan.total, plan.monthlyValue * paidInstallments),
    installmentNumber: applies ? paidInstallments : 0,
    installments: plan.installments,
    total: plan.total,
  };
};

export const getDebtSummaryForMonth = (debts, selectedMonth) => {
  const details = (debts || [])
    .map((debt) => ({
      ...debt,
      monthStatus: getDebtMonthStatus(debt, selectedMonth),
    }))
    .filter((debt) => debt.monthStatus.applies);

  return {
    details,
    deductionTotal: details.reduce((acc, debt) => acc + debt.monthStatus.deduction, 0),
    totalDebtValue: details.reduce((acc, debt) => acc + debt.monthStatus.total, 0),
    paidThroughMonth: details.reduce((acc, debt) => acc + debt.monthStatus.paidThroughMonth, 0),
    remainingAfterMonth: details.reduce((acc, debt) => acc + debt.monthStatus.remainingAfterMonth, 0),
  };
};
