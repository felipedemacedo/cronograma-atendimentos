import { useState, useEffect } from 'react';
import { Plus, Home, MapPin, Edit2, Trash2, Users, UserCheck, CalendarDays, Clock, MonitorPlay } from 'lucide-react';
import api from './api';
import CalendarView from './CalendarView';

function App() {
  const [activeTab, setActiveTab] = useState('calendar'); // 'residences', 'caregivers', 'schedules', 'calendar'
  
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
  const [residenceFormData, setResidenceFormData] = useState({ nome: '', endereco: '' });

  const [currentCaregiver, setCurrentCaregiver] = useState(null);
  const [caregiverFormData, setCaregiverFormData] = useState({ nome: '', residencia_ids: [] });

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
  const handleOpenResidenceModal = (r = null) => {
    setCurrentResidence(r);
    setResidenceFormData(r ? { nome: r.nome, endereco: r.endereco || '' } : { nome: '', endereco: '' });
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
    setCaregiverFormData(c ? { nome: c.nome, residencia_ids: c.residencia_ids || [] } : { nome: '', residencia_ids: [] });
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

    if (targetDays.length === 0) return alert("Nenhum dia válido recebido");

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
    if(parts.length !== 3) return dStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  return (
    <div className="container">
      <header className="header" style={{ marginBottom: '24px' }}>
        <div>
          <h1>Gestão de Atendimento</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>
            Gerencie as residências, cuidadoras e seus horários.
          </p>
        </div>
      </header>

      {/* Tabs */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '32px', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
        <button onClick={() => setActiveTab('residences')} className="btn-secondary" style={{ background: activeTab === 'residences' ? 'rgba(255,255,255,0.1)' : 'transparent', borderColor: activeTab === 'residences' ? 'var(--primary)' : 'var(--border)' }}>
          <Home size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }}/> Residências
        </button>
        <button onClick={() => setActiveTab('caregivers')} className="btn-secondary" style={{ background: activeTab === 'caregivers' ? 'rgba(255,255,255,0.1)' : 'transparent', borderColor: activeTab === 'caregivers' ? 'var(--primary)' : 'var(--border)' }}>
          <Users size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }}/> Cuidadoras
        </button>
        <button onClick={() => setActiveTab('schedules')} className="btn-secondary" style={{ background: activeTab === 'schedules' ? 'rgba(255,255,255,0.1)' : 'transparent', borderColor: activeTab === 'schedules' ? 'var(--primary)' : 'var(--border)' }}>
          <CalendarDays size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }}/> Cronograma
        </button>
        <button onClick={() => setActiveTab('calendar')} className="btn-secondary" style={{ background: activeTab === 'calendar' ? 'rgba(255,255,255,0.1)' : 'transparent', borderColor: activeTab === 'calendar' ? 'var(--primary)' : 'var(--border)' }}>
          <MonitorPlay size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }}/> Visualização Geral
        </button>
      </div>

      {activeTab === 'calendar' ? (
        <CalendarView 
          schedules={schedules} 
          residences={residences} 
          selectedMonth={viewMonth}
          setSelectedMonth={setViewMonth}
          selectedResidencia={viewResidencia}
          setSelectedResidencia={setViewResidencia}
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
                      <Home size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }}/>
                      {s.residencia_nome}
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '16px', color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px', background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px' }}>
                    <div>
                      <strong style={{ color: 'white', display: 'block', marginBottom: '4px' }}>Início</strong>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><CalendarDays size={14}/> {formatDisplayDate(s.data_inicio)}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}><Clock size={14}/> {s.hora_inicio}</div>
                    </div>
                    <div>
                      <strong style={{ color: 'white', display: 'block', marginBottom: '4px' }}>Término</strong>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><CalendarDays size={14}/> {formatDisplayDate(s.data_fim)}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}><Clock size={14}/> {s.hora_fim}</div>
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
                <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}><MapPin size={16} /> {res.endereco || 'Sem endereço'}</p>
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
            <h2 style={{ color: 'white' }}>Cuidadoras</h2>
            <button className="btn-primary" onClick={() => handleOpenCaregiverModal()}>
              <Plus size={20} /> Nova
            </button>
          </div>
          <div className="grid">
            {caregivers.map((c) => (
              <div key={c.id} className="card">
                <h3 style={{ fontSize: '1.25rem', color: 'white', marginBottom: '16px' }}><UserCheck size={20} color="var(--success)" /> {c.nome}</h3>
                <div style={{ marginBottom: '24px' }}>
                  <p style={{ fontSize: '0.9rem', marginBottom: '8px' }}>Atende em:</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {residences.filter(r => c.residencia_ids?.includes(r.id)).map(ar => (
                      <span key={ar.id} style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>{ar.nome}</span>
                    ))}
                  </div>
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
        <div className="modal-overlay" onClick={handleCloseResidenceModal}>
           {/* ... UI igual ... */}
           <div className="modal-content" onClick={e=>e.stopPropagation()}>
             <h2 style={{color:'white', marginBottom:'24px'}}>{currentResidence?'Editar Residência':'Nova Residência'}</h2>
             <form onSubmit={handleResidenceSubmit}>
               <div className="form-group"><label>Nome*</label><input required className="form-control" value={residenceFormData.nome} onChange={e=>setResidenceFormData({...residenceFormData, nome:e.target.value})}/></div>
               <div className="form-group"><label>Endereço</label><input className="form-control" value={residenceFormData.endereco} onChange={e=>setResidenceFormData({...residenceFormData, endereco:e.target.value})}/></div>
               <div className="flex-gap" style={{justifyContent:'flex-end', marginTop:'32px'}}><button type="button" className="btn-secondary" onClick={handleCloseResidenceModal}>Cancelar</button><button type="submit" className="btn-primary">Salvar</button></div>
             </form>
           </div>
        </div>
      )}

      {/* MODAL: CAREGIVER EDIT/CREATE */}
      {isCaregiverModalOpen && (
        <div className="modal-overlay" onClick={handleCloseCaregiverModal}>
           <div className="modal-content" onClick={e=>e.stopPropagation()}>
             <h2 style={{color:'white', marginBottom:'24px'}}>{currentCaregiver?'Editar Cuidadora':'Nova Cuidadora'}</h2>
             <form onSubmit={handleCaregiverSubmit}>
               <div className="form-group"><label>Nome*</label><input required className="form-control" value={caregiverFormData.nome} onChange={e=>setCaregiverFormData({...caregiverFormData, nome:e.target.value})}/></div>
               <div className="form-group"><label>Atende nas Residências:</label>
                  <div style={{display:'flex', flexDirection:'column', gap:'8px'}}>
                    {residences.map(res => (
                      <label key={res.id} style={{color:'white'}}><input type="checkbox" style={{marginRight:'8px'}} checked={caregiverFormData.residencia_ids?.includes(res.id)} onChange={() => {
                        const ids = caregiverFormData.residencia_ids;
                        setCaregiverFormData({...caregiverFormData, residencia_ids: ids.includes(res.id) ? ids.filter(i=>i!==res.id) : [...ids, res.id]});
                      }}/>{res.nome}</label>
                    ))}
                  </div>
               </div>
               <div className="flex-gap" style={{justifyContent:'flex-end', marginTop:'32px'}}><button type="button" className="btn-secondary" onClick={handleCloseCaregiverModal}>Cancelar</button><button type="submit" className="btn-primary">Salvar</button></div>
             </form>
           </div>
        </div>
      )}

      {/* MODAL: SCHEDULE BATCH GENERATION */}
      {isScheduleModalOpen && (
        <div className="modal-overlay" onClick={() => setIsScheduleModalOpen(false)}>
           <div className="modal-content" onClick={e=>e.stopPropagation()}>
             <h2 style={{color:'white', marginBottom:'24px'}}>Gerar Agendamentos</h2>
             <form onSubmit={handleScheduleSubmit}>
               <div className="form-group">
                 <label>Residência*</label>
                 <select required className="form-control" value={scheduleFormData.residencia_id} onChange={e=>setScheduleFormData({...scheduleFormData, residencia_id:e.target.value, cuidadora_id: ''})}>
                   <option value="">Selecione...</option>
                   {residences.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}
                 </select>
               </div>
               <div className="form-group">
                 <label>Cuidadora*</label>
                 <select required className="form-control" value={scheduleFormData.cuidadora_id} onChange={e=>setScheduleFormData({...scheduleFormData, cuidadora_id:e.target.value})} disabled={!scheduleFormData.residencia_id}>
                   <option value="">Selecione...</option>
                   {caregivers.filter(c => c.residencia_ids.includes(scheduleFormData.residencia_id)).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                 </select>
               </div>
               
               <div className="form-group">
                 <label>Mês / Ano*</label>
                 <input type="month" required className="form-control" value={scheduleFormData.month} onChange={e=>setScheduleFormData({...scheduleFormData, month:e.target.value})}/>
               </div>

               <div className="form-group">
                 <label>Dias do Mês*</label>
                 <select className="form-control" value={scheduleFormData.type} onChange={e=>setScheduleFormData({...scheduleFormData, type:e.target.value})}>
                   <option value="impares">Todos os dias Ímpares</option>
                   <option value="pares">Todos os dias Pares</option>
                   <option value="especificos">Dias Específicos</option>
                 </select>
               </div>

               {scheduleFormData.type === 'especificos' && (
                 <div className="form-group">
                   <label>Quais dias? (separe por vírgula)</label>
                   <input required type="text" placeholder="Ex: 1, 3, 5, 20" className="form-control" value={scheduleFormData.specificDays} onChange={e=>setScheduleFormData({...scheduleFormData, specificDays:e.target.value})}/>
                 </div>
               )}

               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                 <div className="form-group">
                   <label>Hora Início*</label>
                   <input required type="time" className="form-control" value={scheduleFormData.hora_inicio} onChange={e=>setScheduleFormData({...scheduleFormData, hora_inicio:e.target.value})}/>
                 </div>
                 <div className="form-group">
                   <label>Hora Término*</label>
                   <input required type="time" className="form-control" value={scheduleFormData.hora_fim} onChange={e=>setScheduleFormData({...scheduleFormData, hora_fim:e.target.value})}/>
                 </div>
               </div>
               <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>*Se a hora de término for menor que a de início (ex: 19h as 07h), o sistema considerará o término no dia seguinte automaticamente.</p>

               <div className="flex-gap" style={{justifyContent:'flex-end', marginTop:'32px'}}><button type="button" className="btn-secondary" onClick={()=>setIsScheduleModalOpen(false)}>Cancelar</button><button type="submit" className="btn-primary">Gerar Lote</button></div>
             </form>
           </div>
        </div>
      )}

      {/* MODAL: EDIT SINGLE SCHEDULE */}
      {isEditScheduleModalOpen && (
        <div className="modal-overlay" onClick={() => setIsEditScheduleModalOpen(false)}>
           <div className="modal-content" onClick={e=>e.stopPropagation()}>
             <h2 style={{color:'white', marginBottom:'24px'}}>Editar Plantão Específico</h2>
             <form onSubmit={handleEditScheduleSubmit}>
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label>Data Início*</label>
                    <input required type="date" className="form-control" value={editScheduleData.data_inicio} onChange={e=>setEditScheduleData({...editScheduleData, data_inicio:e.target.value})}/>
                  </div>
                  <div className="form-group">
                    <label>Hora Início*</label>
                    <input required type="time" className="form-control" value={editScheduleData.hora_inicio} onChange={e=>setEditScheduleData({...editScheduleData, hora_inicio:e.target.value})}/>
                  </div>
               </div>
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
                  <div className="form-group">
                    <label>Data Fim*</label>
                    <input required type="date" className="form-control" value={editScheduleData.data_fim} onChange={e=>setEditScheduleData({...editScheduleData, data_fim:e.target.value})}/>
                  </div>
                  <div className="form-group">
                    <label>Hora Fim*</label>
                    <input required type="time" className="form-control" value={editScheduleData.hora_fim} onChange={e=>setEditScheduleData({...editScheduleData, hora_fim:e.target.value})}/>
                  </div>
               </div>
               <div className="flex-gap" style={{justifyContent:'flex-end', marginTop:'32px'}}><button type="button" className="btn-secondary" onClick={()=>setIsEditScheduleModalOpen(false)}>Cancelar</button><button type="submit" className="btn-primary">Salvar Edição</button></div>
             </form>
           </div>
        </div>
      )}
    </div>
  );
}

export default App;
