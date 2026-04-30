import { useMemo, useState } from 'react';
import { CreditCard, Plus, Trash2 } from 'lucide-react';
import { formatCurrency } from './financialCalculations';
import { getDebtInstallmentPlan } from './debtCalculations';

export default function DebtsView({ debts, caregivers, currentEnvDate, onAddDebt, onDeleteDebt }) {
  const defaultMonth = `${currentEnvDate.getFullYear()}-${String(currentEnvDate.getMonth() + 1).padStart(2, '0')}`;
  const [formData, setFormData] = useState({
    cuidadora_id: '',
    descricao: '',
    valor_original: '',
    forma_pagamento: 'avista',
    quantidade_parcelas: 1,
    percentual_juros: 0,
    mes_quitacao: defaultMonth,
  });

  const visibleDebts = useMemo(() => {
    const visibleCaregiverIds = new Set(caregivers.map(c => c.id));
    return debts.filter(debt => visibleCaregiverIds.has(debt.cuidadora_id));
  }, [debts, caregivers]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    await onAddDebt(formData);
    setFormData({
      cuidadora_id: '',
      descricao: '',
      valor_original: '',
      forma_pagamento: 'avista',
      quantidade_parcelas: 1,
      percentual_juros: 0,
      mes_quitacao: defaultMonth,
    });
  };

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: '24px', gap: '16px', flexWrap: 'wrap' }}>
        <h2 style={{ color: 'white' }}>Dívidas</h2>
      </div>

      <form className="card" onSubmit={handleSubmit} style={{ marginBottom: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <div className="form-group">
            <label htmlFor="debt-caregiver">Prestador*</label>
            <select
              id="debt-caregiver"
              className="form-control"
              required
              value={formData.cuidadora_id}
              onChange={e => setFormData({ ...formData, cuidadora_id: e.target.value })}
            >
              <option value="">Selecione...</option>
              {caregivers.map(caregiver => (
                <option key={caregiver.id} value={caregiver.id}>{caregiver.nome}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="debt-value">Valor da dívida*</label>
            <input
              id="debt-value"
              className="form-control"
              required
              type="number"
              min="0.01"
              step="0.01"
              value={formData.valor_original}
              onChange={e => setFormData({ ...formData, valor_original: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label htmlFor="debt-payment-type">Pagamento*</label>
            <select
              id="debt-payment-type"
              className="form-control"
              value={formData.forma_pagamento}
              onChange={e => setFormData({ ...formData, forma_pagamento: e.target.value, quantidade_parcelas: e.target.value === 'avista' ? 1 : formData.quantidade_parcelas })}
            >
              <option value="avista">À vista</option>
              <option value="parcelado">Parcelado</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="debt-installments">Parcelas</label>
            <input
              id="debt-installments"
              className="form-control"
              type="number"
              min="1"
              step="1"
              disabled={formData.forma_pagamento === 'avista'}
              value={formData.quantidade_parcelas}
              onChange={e => setFormData({ ...formData, quantidade_parcelas: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label htmlFor="debt-interest">Juros (%)</label>
            <input
              id="debt-interest"
              className="form-control"
              type="number"
              min="0"
              step="0.01"
              value={formData.percentual_juros}
              onChange={e => setFormData({ ...formData, percentual_juros: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label htmlFor="debt-target-month">Mês alvo de quitação*</label>
            <input
              id="debt-target-month"
              className="form-control"
              required
              type="month"
              value={formData.mes_quitacao}
              onChange={e => setFormData({ ...formData, mes_quitacao: e.target.value })}
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="debt-description">Descrição</label>
          <input
            id="debt-description"
            className="form-control"
            value={formData.descricao}
            onChange={e => setFormData({ ...formData, descricao: e.target.value })}
            placeholder="Ex: adiantamento, compra, ajuste combinado"
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="btn-primary">
            <Plus size={20} /> Cadastrar dívida
          </button>
        </div>
      </form>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
        {visibleDebts.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            <CreditCard size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
            <h3>Nenhuma dívida cadastrada.</h3>
          </div>
        ) : (
          visibleDebts.map((debt) => {
            const plan = getDebtInstallmentPlan(debt);
            return (
              <div key={debt.id} className="card">
                <div className="flex-between" style={{ marginBottom: '12px', gap: '12px' }}>
                  <div>
                    <h3 style={{ color: 'white', marginBottom: '6px' }}>{debt.cuidadora_nome}</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{debt.descricao || 'Dívida cadastrada'}</p>
                  </div>
                  <button type="button" className="btn-icon" onClick={() => onDeleteDebt(debt.id)} aria-label="Excluir dívida">
                    <Trash2 size={18} color="var(--danger)" />
                  </button>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', fontSize: '0.9rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', gap: '12px' }}>
                    <span>Valor original:</span>
                    <strong>{formatCurrency(Number(debt.valor_original) || 0)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', gap: '12px' }}>
                    <span>Total com juros:</span>
                    <strong>{formatCurrency(plan.total)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', gap: '12px' }}>
                    <span>Parcelamento:</span>
                    <strong>{plan.installments}x de {formatCurrency(plan.monthlyValue)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                    <span>Quita em:</span>
                    <strong>{debt.mes_quitacao}</strong>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
