import React, { useState } from 'react';
import { Calendar, Plus, Trash2 } from 'lucide-react';

export default function HolidaysView({ holidays, onAddHoliday, onDeleteHoliday }) {
  const [data, setData] = useState('');
  const [nome, setNome] = useState('');
  const [recorrente, setRecorrente] = useState(true);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (data && nome) {
      const finalData = recorrente ? data.substring(5) : data;
      onAddHoliday({ data: finalData, nome });
      setData('');
      setNome('');
    }
  };

  const getDayMonthDesc = (dateStr) => {
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    if (parts.length === 2) return `${parts[1]}/${parts[0]} (Todo ano)`;
    return dateStr;
  };

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: '24px' }}>
        <h2 style={{ color: 'white' }}>Gerenciar Feriados</h2>
      </div>

      <div className="card" style={{ marginBottom: '32px' }}>
        <h3 style={{ color: 'var(--text-muted)', marginBottom: '16px', fontSize: '1rem' }}>Adicionar Novo Feriado</h3>
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
            <label>Data</label>
            <input 
              type="date" 
              required 
              className="form-control" 
              value={data} 
              onChange={e => setData(e.target.value)} 
            />
          </div>
          <div className="form-group" style={{ flex: 2, marginBottom: 0 }}>
            <label>Nome do Feriado</label>
            <input 
              type="text" 
              required 
              placeholder="Ex: Sexta-Feira Santa"
              className="form-control" 
              value={nome} 
              onChange={e => setNome(e.target.value)} 
            />
          </div>
          <div className="form-group" style={{ marginBottom: '10px' }}>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '8px' }}>
              <input 
                type="checkbox" 
                checked={recorrente} 
                onChange={e => setRecorrente(e.target.checked)} 
                style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
              />
              Repetir todo ano
            </label>
          </div>
          <button type="submit" className="btn-primary" style={{ padding: '12px 24px', height: '42px' }}>
            <Plus size={20} /> Adicionar
          </button>
        </form>
      </div>

      <div className="grid">
        {holidays.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            <Calendar size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
            <h3>Nenhum feriado cadastrado.</h3>
            <p>Adicione acima os feriados que influenciarão nos cálculos financeiros.</p>
          </div>
        ) : (
          holidays.map(h => (
            <div key={h.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--danger)', display: 'block', marginBottom: '8px' }}>
                  {getDayMonthDesc(h.data)}
                </span>
                <span style={{ color: 'white', fontSize: '1rem' }}>{h.nome}</span>
              </div>
              <button 
                className="btn-icon" 
                onClick={() => {
                  if (window.confirm(`Tem certeza que deseja apagar o feriado ${h.nome}?`)) {
                    onDeleteHoliday(h.id);
                  }
                }}
              >
                <Trash2 size={20} color="var(--danger)" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
