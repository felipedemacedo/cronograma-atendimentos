import { useState, useEffect } from 'react';
import { Plus, Home, MapPin, Edit2, Trash2, Users, UserCheck, CalendarDays, Clock, MonitorPlay, DollarSign } from 'lucide-react';
import api from './api';
import CalendarView from './CalendarView';
import FinanceView from './FinanceView';

function App() {
  const [activeTab, setActiveTab] = useState('calendar'); // 'residences', 'caregivers', 'schedules', 'calendar', 'finance'

  // Data states
  const [residences, setResidences] = useState([]);
  const [caregivers, setCaregivers] = useState([]);
  const [schedules, setSchedules] = useState([]);

  // Modals status
  const [isResidenceModalOpen, setIsResidenceModalOpen] = useState(false);
  const [isCaregiverModalOpen, setIsCaregiverModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isEditScheduleModalOpen, setIsEditScheduleModalOpen] = useState(false);

  // Seleção múltipla para lote
  const [selectedSchedules, setSelectedSchedules] = useState([]);

  // Form states
  const [currentResidence, setCurrentResidence] = useState(null);
  const [residenceFormData, setResidenceFormData] = useState({ nome: '', endereco: '', valor_hora: 10, adicional_noturno: false, percentual_noturno: 20, adicional_feriado: false, percentual_feriado: 20 });

  const [currentCaregiver, setCurrentCaregiver] = useState(null);
  const [caregiverFormData, setCaregiverFormData] = useState({ nome: '', residencia_ids: [], residencias_config: [], valor_hora: '', observacao: '', dias_disponiveis: [0,1,2,3,4,5,6], adicional_noturno: '', percentual_noturno: '', adicional_feriado: '', percentual_feriado: '', regime_clt: false });

  const WEEKDAYS = [
    { id: 0, label: 'Domingo' }, { id: 1, label: 'Segunda' },
    { id: 2, label: 'Terça' }, { id: 3, label: 'Quarta' },
    { id: 4, label: 'Quinta' }, { id: 5, label: 'Sexta' }, { id: 6, label: 'Sábado' }
  ];

  const [scheduleFormData, setScheduleFormData] = useState({
    residencia_id: '',
    cuidadora_id: '',
    month: '',
    type: 'impares', // impares, pares, especificos
    specificDays: '',
    hora_inicio: '19:00',
    hora_fim: '07:00'
  });

  const [editScheduleData, setEditScheduleData] = useState({
    id: '', data_inicio: '', hora_inicio: '', data_fim: '', hora_fim: ''
  });

  const currentEnvDate = new Date();
  const defaultMonth = `${currentEnvDate.getFullYear()}-${String(currentEnvDate.getMonth() + 1).padStart(2, '0')}`;
  const [viewMonth, setViewMonth] = useState(defaultMonth);
  const [viewResidencia, setViewResidencia] = useState('');

  // Fetch logic
  const fetchData = async () => {
    try {
      const [resRes, cgRes, schedRes] = await Promise.all([
        api.get('/residences'),
        api.get('/caregivers'),
        api.get('/schedules')
      ]);
      setResidences(resRes.data);
      setCaregivers(cgRes.data);
      setSchedules(schedRes.data);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, []);

  // --- Residence Handlers ---
  const handleOpenResidenceModal = (res = null) => {
    setCurrentResidence(res);
    setResidenceFormData(res ? { 
      nome: res.nome, 
      endereco: res.endereco || '', 
      valor_hora: res.valor_hora || 10, 
      adicional_noturno: res.adicional_noturno === 1,
      percentual_noturno: res.percentual_noturno || 20,
      adicional_feriado: res.adicional_feriado === 1,
      percentual_feriado: res.percentual_feriado || 20
    } : { nome: '', endereco: '', valor_hora: 10, adicional_noturno: false, percentual_noturno: 20, adicional_feriado: false, percentual_feriado: 20 });
    setIsResidenceModalOpen(true);
  };
  const handleResidenceSubmit = async (e) => {
    e.preventDefault();
    try {
      if (currentResidence) await api.put(`/residences/${currentResidence.id}`, residenceFormData);
      else await api.post('/residences', residenceFormData);
      setIsResidenceModalOpen(false);
      fetchData();
    } catch (err) { console.error('Erro:', err); }
  };
  const handleResidenceDelete = async (id) => {
    if (window.confirm('Tem certeza?')) {
      await api.delete(`/residences/${id}`);
      fetchData();
    }
  };

  // --- Caregiver Handlers ---
  const handleOpenCaregiverModal = (c = null) => {
    setCurrentCaregiver(c);
    setCaregiverFormData(c ? { 
      nome: c.nome, 
      residencia_ids: c.residencia_ids || [],
      residencias_config: c.residencias_config || [],
      valor_hora: c.valor_hora || '',
      observacao: c.observacao || '',
      dias_disponiveis: c.dias_disponiveis || [0,1,2,3,4,5,6],
      adicional_noturno: c.adicional_noturno !== null && c.adicional_noturno !== undefined ? String(c.adicional_noturno) : '',
      percentual_noturno: c.percentual_noturno || '',
      adicional_feriado: c.adicional_feriado !== null && c.adicional_feriado !== undefined ? String(c.adicional_feriado) : '',
      percentual_feriado: c.percentual_feriado || '',
      regime_clt: c.regime_clt || false
    } : { nome: '', residencia_ids: [], residencias_config: [], valor_hora: '', observacao: '', dias_disponiveis: [0,1,2,3,4,5,6], adicional_noturno: '', percentual_noturno: '', adicional_feriado: '', percentual_feriado: '', regime_clt: false });
    setIsCaregiverModalOpen(true);
  };
  const handleCaregiverSubmit = async (e) => {
    e.preventDefault();
    try {
      if (currentCaregiver) await api.put(`/caregivers/${currentCaregiver.id}`, caregiverFormData);
      else await api.post('/caregivers', caregiverFormData);
      setIsCaregiverModalOpen(false);
      fetchData();
    } catch (err) { console.error('Erro:', err); }
  };
  const handleCaregiverDelete = async (id) => {
    if (window.confirm('Tem certeza?')) {
      await api.delete(`/caregivers/${id}`);
      fetchData();
    }
  };

  // --- Schedule Generation Handlers ---
  const getNextDayStr = (dateStr) => {
    const d = new Date(dateStr + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    const { residencia_id, cuidadora_id, month, type, specificDays, hora_inicio, hora_fim } = scheduleFormData;
    if (!residencia_id || !cuidadora_id || !month) return alert("Preencha os campos obrigatórios");

    const [yearStr, monthStr] = month.split('-');
    const y = parseInt(yearStr);
    const m = parseInt(monthStr); // 1 to 12
    const daysInMonth = new Date(y, m, 0).getDate();

    let targetDays = [];
    if (type === 'impares') {
      for (let d = 1; d <= daysInMonth; d += 2) targetDays.push(d);
    } else if (type === 'pares') {
      for (let d = 2; d <= daysInMonth; d += 2) targetDays.push(d);
    } else if (type === 'especificos') {
      targetDays = specificDays.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n >= 1 && n <= daysInMonth);
    }

    const caregiver = caregivers.find(c => c.id === cuidadora_id);
    const availableDays = caregiver?.dias_disponiveis || [0,1,2,3,4,5,6];
    
    // Filtra para manter somente dias disponíveis
    if (availableDays.length < 7) {
      targetDays = targetDays.filter(day => {
        const date = new Date(y, m - 1, day);
        return availableDays.includes(date.getDay());
      });
    }

    if (targetDays.length === 0) return alert("Nenhum dia válido gerado! Verifique os dias inseridos ou a indisponibilidade do prestador nesta data.");

    const spansNextDay = hora_fim < hora_inicio; // ex: 19:00 as 07:00

    const batch = targetDays.map(day => {
      const dataInicioUnformatted = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return {
        residencia_id,
        cuidadora_id,
        data_inicio: dataInicioUnformatted,
        hora_inicio: hora_inicio,
        data_fim: spansNextDay ? getNextDayStr(dataInicioUnformatted) : dataInicioUnformatted,
        hora_fim: hora_fim
      };
    });

    try {
      await api.post('/schedules/batch', { schedules: batch });
      setIsScheduleModalOpen(false);
      fetchData();
    } catch (err) { console.error('Erro ao gerar:', err); }
  };

  const handleEditScheduleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/schedules/${editScheduleData.id}`, editScheduleData);
      setIsEditScheduleModalOpen(false);
      fetchData();
    } catch (err) { console.error('Erro:', err); }
  };

  const handleDeleteSchedule = async (id) => {
    if (window.confirm('Excluir este agendamento?')) {
      await api.delete(`/schedules/${id}`);
      fetchData();
      setSelectedSchedules(prev => prev.filter(s => s !== id));
    }
  };

  const handleBatchDelete = async () => {
    if (window.confirm(`Tem certeza que deseja excluir ${selectedSchedules.length} agendamentos?`)) {
      try {
        await api.delete('/schedules/batch', { data: { ids: selectedSchedules } });
        setSelectedSchedules([]);
        fetchData();
      } catch (err) {
        console.error('Erro ao excluir lote:', err);
      }
    }
  };

  const toggleScheduleSelection = (id) => {
    setSelectedSchedules(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  const toggleAllSchedules = () => {
    if (selectedSchedules.length === schedules.length) {
      setSelectedSchedules([]); // Deselecionar tudo
    } else {
      setSelectedSchedules(schedules.map(s => s.id)); // Selecionar todos os carregados
    }
  };

  // Helpers UI
  const formatDisplayDate = (dStr) => {
    const parts = dStr.split('-');
    if (parts.length !== 3) return dStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  return (
    <div className="container">
      <header className="header" style={{ marginBottom: '24px' }}>
        <div>
          <h1>Gestão de Atendimento</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>
            Gerencie as residências, prestadores de serviços e seus horários.
          </p>
        </div>
      </header>

      {/* Tabs */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '32px', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
        <button onClick={() => setActiveTab('residences')} className="btn-secondary" style={{ background: activeTab === 'residences' ? 'rgba(255,255,255,0.1)' : 'transparent', borderColor: activeTab === 'residences' ? 'var(--primary)' : 'var(--border)' }}>
          <Home size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} /> Residências
        </button>
        <button onClick={() => setActiveTab('caregivers')} className="btn-secondary" style={{ background: activeTab === 'caregivers' ? 'rgba(255,255,255,0.1)' : 'transparent', borderColor: activeTab === 'caregivers' ? 'var(--primary)' : 'var(--border)' }}>
          <Users size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} /> Prestadores de Serviço
        </button>
        <button onClick={() => setActiveTab('schedules')} className="btn-secondary" style={{ background: activeTab === 'schedules' ? 'rgba(255,255,255,0.1)' : 'transparent', borderColor: activeTab === 'schedules' ? 'var(--primary)' : 'var(--border)' }}>
          <CalendarDays size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} /> Atendimentos
        </button>
        <button onClick={() => setActiveTab('calendar')} className="btn-secondary" style={{ background: activeTab === 'calendar' ? 'rgba(255,255,255,0.1)' : 'transparent', borderColor: activeTab === 'calendar' ? 'var(--primary)' : 'var(--border)' }}>
          <MonitorPlay size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} /> Calendário
        </button>
        <button onClick={() => setActiveTab('finance')} className="btn-secondary" style={{ background: activeTab === 'finance' ? 'rgba(255,255,255,0.1)' : 'transparent', borderColor: activeTab === 'finance' ? 'var(--primary)' : 'var(--border)' }}>
          <DollarSign size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} /> Financeiro
        </button>
      </div>

      {activeTab === 'finance' ? (
        <FinanceView
          schedules={schedules}
          caregivers={caregivers}
          residences={residences}
          currentEnvDate={currentEnvDate}
        />
      ) : activeTab === 'calendar' ? (
        <CalendarView
          schedules={schedules}
          residences={residences}
          selectedMonth={viewMonth}
          setSelectedMonth={setViewMonth}
          selectedResidencia={viewResidencia}
          setSelectedResidencia={setViewResidencia}
          onEditSchedule={(s) => { setEditScheduleData(s); setIsEditScheduleModalOpen(true); }}
          onDeleteSchedule={handleDeleteSchedule}
        />
      ) : activeTab === 'schedules' ? (
        <>
          <div className="flex-between" style={{ marginBottom: '24px' }}>
            <h2 style={{ color: 'white' }}>Agenda de Atendimentos</h2>
            <div className="flex-gap">
              {selectedSchedules.length > 0 ? (
                <>
                  <button className="btn-secondary" onClick={() => setSelectedSchedules([])}>
                    Cancelar Seleção
                  </button>
                  <button className="btn-primary" style={{ background: 'var(--danger)' }} onClick={handleBatchDelete}>
                    <Trash2 size={20} /> Excluir ({selectedSchedules.length})
                  </button>
                </>
              ) : (
                <>
                  <button className="btn-secondary" onClick={toggleAllSchedules}>
                    Selecionar Todos
                  </button>
                  <button className="btn-primary" onClick={() => setIsScheduleModalOpen(true)}>
                    <Plus size={20} /> Gerar Lote
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))' }}>
            {schedules.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                <CalendarDays size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
                <h3>Nenhum agendamento encontrado</h3>
              </div>
            ) : (
              schedules.map(s => (
                <div key={s.id} onClick={() => toggleScheduleSelection(s.id)} className="card" style={{ padding: '20px', cursor: 'pointer', border: selectedSchedules.includes(s.id) ? '2px solid var(--primary)' : '1px solid var(--border)', transition: 'all 0.2s', background: selectedSchedules.includes(s.id) ? 'rgba(99, 102, 241, 0.05)' : 'var(--bg-card)' }}>
                  <div className="flex-between" style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <input
                        type="checkbox"
                        checked={selectedSchedules.includes(s.id)}
                        onChange={(e) => { e.stopPropagation(); toggleScheduleSelection(s.id); }}
                        style={{ width: '18px', height: '18px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                      />
                      <h3 style={{ fontSize: '1.2rem', color: 'white', margin: 0 }}>{s.cuidadora_nome}</h3>
                    </div>
                    <span style={{ fontSize: '0.8rem', background: 'rgba(99,102,241,0.2)', color: 'var(--primary)', padding: '4px 8px', borderRadius: '4px' }}>
                      <Home size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                      {s.residencia_nome}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '16px', color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px', background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px' }}>
                    <div>
                      <strong style={{ color: 'white', display: 'block', marginBottom: '4px' }}>Início</strong>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><CalendarDays size={14} /> {formatDisplayDate(s.data_inicio)}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}><Clock size={14} /> {s.hora_inicio}</div>
                    </div>
                    <div>
                      <strong style={{ color: 'white', display: 'block', marginBottom: '4px' }}>Término</strong>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><CalendarDays size={14} /> {formatDisplayDate(s.data_fim)}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}><Clock size={14} /> {s.hora_fim}</div>
                    </div>
                  </div>

                  <div className="flex-gap" style={{ justifyContent: 'flex-end', marginTop: 'auto' }}>
                    <button className="btn-icon" onClick={(e) => { e.stopPropagation(); setEditScheduleData(s); setIsEditScheduleModalOpen(true); }}>
                      <Edit2 size={18} />
                    </button>
                    <button className="btn-icon" style={{ borderColor: 'rgba(239, 68, 68, 0.3)', color: 'var(--danger)' }} onClick={(e) => { e.stopPropagation(); handleDeleteSchedule(s.id); }}>
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      ) : activeTab === 'residences' ? (
        <>
          <div className="flex-between" style={{ marginBottom: '24px' }}>
            <h2 style={{ color: 'white' }}>Residências</h2>
            <button className="btn-primary" onClick={() => handleOpenResidenceModal()}>
              <Plus size={20} /> Nova
            </button>
          </div>
          <div className="grid">
            {residences.map((res) => (
              <div key={res.id} className="card">
                <h3 style={{ fontSize: '1.25rem', color: 'white', marginBottom: '16px' }}><Home size={20} /> {res.nome}</h3>
                <p style={{ color: 'var(--text-muted)', marginBottom: '8px' }}><MapPin size={16} /> {res.endereco || 'Sem endereço'}</p>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px', marginBottom: '24px', fontSize: '0.85rem' }}>
                  <p><strong>Valor Base:</strong> R$ {parseFloat(res.valor_hora || 10).toFixed(2)} / hora</p>
                  <p><strong>Adc. Noturno:</strong> {res.adicional_noturno === 1 ? `Sim (+${res.percentual_noturno || 20}%)` : 'Não'}</p>
                  <p><strong>Adc. Feriado:</strong> {res.adicional_feriado === 1 ? `Sim (+${res.percentual_feriado || 20}%)` : 'Não'}</p>
                </div>
                <div className="flex-gap" style={{ justifyContent: 'flex-end' }}>
                  <button className="btn-icon" onClick={() => handleOpenResidenceModal(res)}><Edit2 size={18} /></button>
                  <button className="btn-icon" onClick={() => handleResidenceDelete(res.id)}><Trash2 size={18} color="var(--danger)" /></button>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="flex-between" style={{ marginBottom: '24px' }}>
            <h2 style={{ color: 'white' }}>Prestadores de Serviços</h2>
            <button className="btn-primary" onClick={() => handleOpenCaregiverModal()}>
              <Plus size={20} /> Nova
            </button>
          </div>
          <div className="grid">
            {caregivers.map(c => (
              <div key={c.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ flexGrow: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0, color: 'var(--primary)' }}>
                      {c.nome} {c.regime_clt ? <span style={{fontSize:'0.7rem', background:'var(--warning)', color:'#000', padding:'2px 6px', borderRadius:'12px', marginLeft:'8px', verticalAlign:'middle'}}>Fixo/CLT</span> : null}
                    </h3>
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <p style={{ fontSize: '0.9rem', marginBottom: '8px' }}>Atende em:</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {residences.filter(r => c.residencia_ids?.includes(r.id)).map(ar => (
                        <span key={ar.id} style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>{ar.nome}</span>
                      ))}
                    </div>
                  </div>
                </div>
                {c.dias_disponiveis && c.dias_disponiveis.length < 7 && (
                  <div style={{ marginBottom: '16px' }}>
                    <p style={{ fontSize: '0.9rem', marginBottom: '8px', color: 'var(--success)' }}>Dias Disponíveis:</p>
                    <p style={{ fontSize: '0.85rem' }}>{c.dias_disponiveis.map(d => WEEKDAYS.find(w=>w.id===d)?.label).join(', ')}</p>
                  </div>
                )}
                {c.observacao && (
                  <div style={{ marginBottom: '16px' }}>
                    <p style={{ fontSize: '0.9rem', marginBottom: '4px', color: 'var(--text-muted)' }}>Observação:</p>
                    <p style={{ fontSize: '0.85rem', fontStyle: 'italic', background: 'rgba(255,255,255,0.02)', padding: '8px', borderRadius: '4px' }}>"{c.observacao}"</p>
                  </div>
                )}
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px', marginBottom: '24px', fontSize: '0.85rem' }}>
                  <p><strong>Custo Específico:</strong> {c.valor_hora ? `R$ ${parseFloat(c.valor_hora).toFixed(2)} / hora` : 'Vinculado ao da Residência'}</p>
                  {c.adicional_noturno !== null && c.adicional_noturno !== undefined && (
                    <p style={{ marginTop: '4px' }}>
                      <strong>Adicional Noturno (Fixo):</strong> {c.adicional_noturno === 1 ? `Sim (+${c.percentual_noturno || 20}%)` : 'Não Aplicar'}
                    </p>
                  )}
                  {c.adicional_feriado !== null && c.adicional_feriado !== undefined && (
                    <p style={{ marginTop: '4px' }}>
                      <strong>Adicional Feriado (Fixo):</strong> {c.adicional_feriado === 1 ? `Sim (+${c.percentual_feriado || 20}%)` : 'Não Aplicar'}
                    </p>
                  )}
                </div>
                <div className="flex-gap" style={{ justifyContent: 'flex-end' }}>
                  <button className="btn-icon" onClick={() => handleOpenCaregiverModal(c)}><Edit2 size={18} /></button>
                  <button className="btn-icon" onClick={() => handleCaregiverDelete(c.id)}><Trash2 size={18} color="var(--danger)" /></button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* MODAL: RESIDENCE EDIT/CREATE */}
      {isResidenceModalOpen && (
        <div className="modal-overlay" onClick={() => setIsResidenceModalOpen(false)}>
          {/* ... UI igual ... */}
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 style={{ color: 'white', marginBottom: '24px' }}>{currentResidence ? 'Editar Residência' : 'Nova Residência'}</h2>
            <form onSubmit={handleResidenceSubmit}>
              <div className="form-group"><label>Nome*</label><input autoFocus required className="form-control" value={residenceFormData.nome} onChange={e => setResidenceFormData({ ...residenceFormData, nome: e.target.value })} /></div>
              <div className="form-group"><label>Endereço</label><input className="form-control" value={residenceFormData.endereco} onChange={e => setResidenceFormData({ ...residenceFormData, endereco: e.target.value })} /></div>
              <div className="form-group">
                <label>Valor Hora Padrão (R$)</label>
                <input type="number" step="0.01" className="form-control" value={residenceFormData.valor_hora} onChange={e => setResidenceFormData({ ...residenceFormData, valor_hora: e.target.value })} />
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="checkbox" checked={residenceFormData.adicional_noturno} onChange={e => setResidenceFormData({ ...residenceFormData, adicional_noturno: e.target.checked })} />
                  Aplicar Adicional Noturno (22h às 05h)?
                </label>
              </div>
              {residenceFormData.adicional_noturno && (
                <div className="form-group">
                  <label>Acréscimo do Adicional Noturno (%) *Mín. 20%</label>
                  <input type="number" min="20" step="0.1" required className="form-control" value={residenceFormData.percentual_noturno} onChange={e => setResidenceFormData({ ...residenceFormData, percentual_noturno: e.target.value })} />
                </div>
              )}
              <div className="form-group" style={{ marginBottom: '24px', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input type="checkbox" style={{ marginRight: '10px', width: '20px', height: '20px', accentColor: 'var(--primary)' }} checked={residenceFormData.adicional_feriado} onChange={e => setResidenceFormData({ ...residenceFormData, adicional_feriado: e.target.checked })} />
                  <div>
                    <strong>Aplicar Adicional em Feriados?</strong>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, marginTop: '4px', fontWeight: 'normal' }}>Acrescenta um valor extra por hora nos dias de feriado.</p>
                  </div>
                </label>
              </div>

              {residenceFormData.adicional_feriado && (
                <div className="form-group">
                  <label>Acréscimo do Adicional de Feriado (%) *Mín 20%</label>
                  <input type="number" step="0.1" min="20" required className="form-control" value={residenceFormData.percentual_feriado} onChange={e => setResidenceFormData({ ...residenceFormData, percentual_feriado: e.target.value })} />
                </div>
              )}
              
              <div className="flex-gap" style={{ justifyContent: 'flex-end', marginTop: '32px' }}><button type="button" className="btn-secondary" onClick={() => setIsResidenceModalOpen(false)}>Cancelar</button><button type="submit" className="btn-primary">Salvar</button></div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CAREGIVER EDIT/CREATE */}
      {isCaregiverModalOpen && (
        <div className="modal-overlay" onClick={() => setIsCaregiverModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 style={{ color: 'white', marginBottom: '24px' }}>{currentCaregiver ? 'Editar Prestador' : 'Novo Prestador de Serviço'}</h2>
            <form onSubmit={handleCaregiverSubmit}>
              <div className="form-group"><label>Nome*</label><input autoFocus required className="form-control" value={caregiverFormData.nome} onChange={e => setCaregiverFormData({ ...caregiverFormData, nome: e.target.value })} /></div>
              <div className="form-group" style={{ marginBottom: '24px', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input type="checkbox" style={{ marginRight: '10px', width: '20px', height: '20px', accentColor: 'var(--warning)' }} checked={caregiverFormData.regime_clt} onChange={e => setCaregiverFormData({ ...caregiverFormData, regime_clt: e.target.checked })} />
                  <div>
                    <strong>Regime de Contratação Fixa (CLT / Mensalista)</strong>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, marginTop: '4px', fontWeight: 'normal' }}>Marcador que exime o profissional dos cálculos na aba de Fechamento Financeiro, mas os mantém visualizáveis no calendário.</p>
                  </div>
                </label>
              </div>

              {!caregiverFormData.regime_clt && (
                <>
                  <div className="form-group">
                    <label>Valor Hora Específico (R$)</label>
                    <input type="number" step="0.01" className="form-control" placeholder="Deixe em branco para usar o da Residência" value={caregiverFormData.valor_hora} onChange={e => setCaregiverFormData({ ...caregiverFormData, valor_hora: e.target.value })} />
                  </div>

                  <div className="form-group">
                    <label>Adicional Noturno (Específico)</label>
                    <select className="form-control" value={caregiverFormData.adicional_noturno} onChange={e => setCaregiverFormData({ ...caregiverFormData, adicional_noturno: e.target.value })}>
                      <option value="">Usar Regras da Residência atendida</option>
                      <option value="1">Forçar Aplicação do Adicional</option>
                      <option value="0">Nunca Aplicar Adicional</option>
                    </select>
                  </div>

                  {caregiverFormData.adicional_noturno === '1' && (
                    <div className="form-group">
                      <label>Acréscimo do Adicional Noturno Específico (%) *Mín 20%</label>
                      <input type="number" step="0.1" min="20" required className="form-control" value={caregiverFormData.percentual_noturno} onChange={e => setCaregiverFormData({ ...caregiverFormData, percentual_noturno: e.target.value })} />
                    </div>
                  )}

                  <div className="form-group" style={{ marginTop: '16px' }}>
                    <label>Adicional em Feriados (Específico)</label>
                    <select className="form-control" value={caregiverFormData.adicional_feriado} onChange={e => setCaregiverFormData({ ...caregiverFormData, adicional_feriado: e.target.value })}>
                      <option value="">Usar Regras da Residência atendida</option>
                      <option value="1">Forçar Aplicação do Adicional Feriado</option>
                      <option value="0">Nunca Aplicar Adicional de Feriado</option>
                    </select>
                  </div>

                  {caregiverFormData.adicional_feriado === '1' && (
                    <div className="form-group">
                      <label>Acréscimo do Adicional Feriado Especifico (%) *Mín 20%</label>
                      <input type="number" step="0.1" min="20" required className="form-control" value={caregiverFormData.percentual_feriado} onChange={e => setCaregiverFormData({ ...caregiverFormData, percentual_feriado: e.target.value })} />
                    </div>
                  )}
                </>
              )}
              
              <div className="form-group">
                <label>Dias Disponíveis na Semana</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px' }}>
                  {WEEKDAYS.map(w => {
                    const isAvail = caregiverFormData.dias_disponiveis?.includes(w.id);
                    return (
                    <label key={w.id} style={{ color: 'white', display: 'flex', alignItems: 'center', fontSize: '0.85rem', background: isAvail ? 'rgba(16, 185, 129, 0.2)' : 'transparent', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                      <input type="checkbox" style={{ marginRight: '6px', accentColor: 'var(--success)' }} checked={isAvail} onChange={() => {
                        const dias = caregiverFormData.dias_disponiveis || [];
                        setCaregiverFormData({ ...caregiverFormData, dias_disponiveis: dias.includes(w.id) ? dias.filter(d => d !== w.id) : [...dias, w.id] });
                      }} />
                      {w.label}
                    </label>
                  )})}
                </div>
              </div>

              <div className="form-group">
                <label>Observação (Opcional)</label>
                <textarea className="form-control" placeholder="Ex: Informações gerais, contatos ou restrições..." value={caregiverFormData.observacao} onChange={e => setCaregiverFormData({ ...caregiverFormData, observacao: e.target.value })} style={{ minHeight: '80px', resize: 'vertical' }} />
              </div>

              <div className="form-group"><label>Atende nas Residências:</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {residences.map(res => {
                    const isChecked = caregiverFormData.residencia_ids?.includes(res.id);
                    const config = caregiverFormData.residencias_config?.find(c => c.id === res.id) || { id: res.id, valor_transporte: 9 };
                    return (
                      <div key={res.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: 'rgba(255,255,255,0.02)', padding: '8px', borderRadius: '4px' }}>
                        <label style={{ color: 'white', display: 'flex', alignItems: 'center' }}>
                          <input type="checkbox" style={{ marginRight: '8px' }} checked={isChecked} onChange={() => {
                            const ids = caregiverFormData.residencia_ids;
                            const configs = caregiverFormData.residencias_config || [];
                            if (isChecked) {
                              setCaregiverFormData({ 
                                ...caregiverFormData, 
                                residencia_ids: ids.filter(i => i !== res.id),
                                residencias_config: configs.filter(c => c.id !== res.id)
                              });
                            } else {
                              setCaregiverFormData({ 
                                ...caregiverFormData, 
                                residencia_ids: [...ids, res.id],
                                residencias_config: [...configs, { id: res.id, valor_transporte: 9 }]
                              });
                            }
                          }} />{res.nome}
                        </label>
                        {isChecked && (
                          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            Transporte (Ida e Volta) R$:
                            <input type="number" step="0.01" value={config.valor_transporte} onChange={(e) => {
                               const val = e.target.value;
                               const cfgs = caregiverFormData.residencias_config || [];
                               const exist = cfgs.find(c => c.id === res.id);
                               if (exist) {
                                 setCaregiverFormData({ ...caregiverFormData, residencias_config: cfgs.map(c => c.id === res.id ? { ...c, valor_transporte: val } : c) });
                               } else {
                                 setCaregiverFormData({ ...caregiverFormData, residencias_config: [...cfgs, { id: res.id, valor_transporte: val }] });
                               }
                            }} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'white', padding: '2px 4px', borderRadius: '4px', width: '70px' }} />
                          </label>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="flex-gap" style={{ justifyContent: 'flex-end', marginTop: '32px' }}><button type="button" className="btn-secondary" onClick={() => setIsCaregiverModalOpen(false)}>Cancelar</button><button type="submit" className="btn-primary">Salvar</button></div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SCHEDULE BATCH GENERATION */}
      {isScheduleModalOpen && (
        <div className="modal-overlay" onClick={() => setIsScheduleModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 style={{ color: 'white', marginBottom: '24px' }}>Gerar Agendamentos</h2>
            <form onSubmit={handleScheduleSubmit}>
              <div className="form-group">
                <label>Residência*</label>
                <select required className="form-control" value={scheduleFormData.residencia_id} onChange={e => setScheduleFormData({ ...scheduleFormData, residencia_id: e.target.value, cuidadora_id: '' })}>
                  <option value="">Selecione...</option>
                  {residences.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Prestador de Serviço*</label>
                <select required className="form-control" value={scheduleFormData.cuidadora_id} onChange={e => setScheduleFormData({ ...scheduleFormData, cuidadora_id: e.target.value })} disabled={!scheduleFormData.residencia_id}>
                  <option value="">Selecione...</option>
                  {caregivers.filter(c => c.residencia_ids.includes(scheduleFormData.residencia_id)).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label>Mês / Ano*</label>
                <input type="month" required className="form-control" value={scheduleFormData.month} onChange={e => setScheduleFormData({ ...scheduleFormData, month: e.target.value })} />
              </div>

              <div className="form-group">
                <label>Dias do Mês*</label>
                <select className="form-control" value={scheduleFormData.type} onChange={e => setScheduleFormData({ ...scheduleFormData, type: e.target.value })}>
                  <option value="impares">Todos os dias Ímpares</option>
                  <option value="pares">Todos os dias Pares</option>
                  <option value="especificos">Dias Específicos</option>
                </select>
              </div>

              {scheduleFormData.type === 'especificos' && (
                <div className="form-group">
                  <label>Quais dias? (separe por vírgula)</label>
                  <input required type="text" placeholder="Ex: 1, 3, 5, 20" className="form-control" value={scheduleFormData.specificDays} onChange={e => setScheduleFormData({ ...scheduleFormData, specificDays: e.target.value })} />
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label>Hora Início*</label>
                  <input required type="time" className="form-control" value={scheduleFormData.hora_inicio} onChange={e => setScheduleFormData({ ...scheduleFormData, hora_inicio: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Hora Término*</label>
                  <input required type="time" className="form-control" value={scheduleFormData.hora_fim} onChange={e => setScheduleFormData({ ...scheduleFormData, hora_fim: e.target.value })} />
                </div>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>*Se a hora de término for menor que a de início (ex: 19h as 07h), o sistema considerará o término no dia seguinte automaticamente.</p>

              <div className="flex-gap" style={{ justifyContent: 'flex-end', marginTop: '32px' }}><button type="button" className="btn-secondary" onClick={() => setIsScheduleModalOpen(false)}>Cancelar</button><button type="submit" className="btn-primary">Gerar Lote</button></div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT SINGLE SCHEDULE */}
      {isEditScheduleModalOpen && (
        <div className="modal-overlay" onClick={() => setIsEditScheduleModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 style={{ color: 'white', marginBottom: '24px' }}>
              Editar Plantão Específico <span style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>#{editScheduleData?.id?.substring(0, 8)}</span>
            </h2>
            <form onSubmit={handleEditScheduleSubmit}>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label>Prestador de Serviço*</label>
                <select 
                  required 
                  className="form-control" 
                  value={editScheduleData.cuidadora_id || ''} 
                  onChange={e => setEditScheduleData({ ...editScheduleData, cuidadora_id: e.target.value })}
                >
                  <option value="">Selecione...</option>
                  {caregivers.filter(c => c.residencia_ids?.includes(editScheduleData.residencia_id)).map(c => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label>Data Início*</label>
                  <input required type="date" className="form-control" value={editScheduleData.data_inicio} onChange={e => setEditScheduleData({ ...editScheduleData, data_inicio: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Hora Início*</label>
                  <input required type="time" className="form-control" value={editScheduleData.hora_inicio} onChange={e => setEditScheduleData({ ...editScheduleData, hora_inicio: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
                <div className="form-group">
                  <label>Data Fim*</label>
                  <input required type="date" className="form-control" value={editScheduleData.data_fim} onChange={e => setEditScheduleData({ ...editScheduleData, data_fim: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Hora Fim*</label>
                  <input required type="time" className="form-control" value={editScheduleData.hora_fim} onChange={e => setEditScheduleData({ ...editScheduleData, hora_fim: e.target.value })} />
                </div>
              </div>
              <div className="flex-gap" style={{ justifyContent: 'flex-end', marginTop: '32px' }}><button type="button" className="btn-secondary" onClick={() => setIsEditScheduleModalOpen(false)}>Cancelar</button><button type="submit" className="btn-primary">Salvar Edição</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
