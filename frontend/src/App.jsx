import { useState, useEffect, useRef, useCallback, useMemo, startTransition } from 'react';
import { Plus, Home, MapPin, Edit2, Trash2, Users, UserCheck, CalendarDays, Clock, MonitorPlay, DollarSign, CalendarHeart, Calendar, FileText } from 'lucide-react';
import api from './api';
import CalendarView from './CalendarView';
import FinanceView from './FinanceView';
import HolidaysView from './HolidaysView';
import LoginView from './LoginView';
import ReportsView from './ReportsView';
import UsersView from './UsersView';
import { normalizeMessage } from './messageUtils';

function App() {
  const INITIAL_SCHEDULE_BATCH = 24;
  const SCHEDULE_BATCH_STEP = 18;

  const [currentUser, setCurrentUser] = useState(() => {
    const stored = localStorage.getItem('session');
    if (stored) {
      try {
        const session = JSON.parse(stored);
        if (Date.now() - session.timestamp < 60 * 60 * 1000) return session.user;
      } catch {
        localStorage.removeItem('session');
      }
    }
    return null;
  });

  const [caregiverMode, setCaregiverMode] = useState(null);
  const [activeTab, setActiveTab] = useState('calendar'); // 'residences', 'caregivers', 'schedules', 'calendar', 'finance', 'reports', 'holidays', 'users'

  // Data states
  const [residences, setResidences] = useState([]);
  const [caregivers, setCaregivers] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [holidays, setHolidays] = useState([]);

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
    type: 'impares', // impares, pares, sem_concorrencia, especificos
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

  const [filterSchedMonth, setFilterSchedMonth] = useState(defaultMonth);
  const [filterSchedResidencia, setFilterSchedResidencia] = useState('');
  const [filterSchedCaregiver, setFilterSchedCaregiver] = useState('');

  const [loadedCount, setLoadedCount] = useState(INITIAL_SCHEDULE_BATCH);
  const [isSchedulesIncrementLoading, setIsSchedulesIncrementLoading] = useState(false);
  const [uiNotice, setUiNotice] = useState(null);

  const handleSetFilterSchedResidencia = (val) => {
    setFilterSchedResidencia(val);
    if (val && !filterSchedMonth) {
      setFilterSchedMonth(defaultMonth);
    }
  };

  const showNotice = useCallback((message, type = 'info') => {
    setUiNotice({
      id: Date.now(),
      message: normalizeMessage(message, 'Ocorreu um erro inesperado.'),
      type,
    });
  }, []);

  const alert = useCallback((message) => {
    showNotice(message, 'error');
  }, [showNotice]);

  const isSameArray = (prev, next) => {
    if (prev === next) return true;
    if (!Array.isArray(prev) || !Array.isArray(next)) return false;
    if (prev.length !== next.length) return false;
    return prev.every((item, index) => JSON.stringify(item) === JSON.stringify(next[index]));
  };

  const isFetchingRef = useRef(false);

  // Fetch logic
  const fetchData = async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      const [resRes, cgRes, schedRes, holRes] = await Promise.all([
        api.get('/residences'),
        api.get('/caregivers'),
        api.get('/schedules'),
        api.get('/holidays')
      ]);

      setResidences(prev => isSameArray(prev, resRes.data) ? prev : resRes.data);
      setCaregivers(prev => isSameArray(prev, cgRes.data) ? prev : cgRes.data);
      setSchedules(prev => isSameArray(prev, schedRes.data) ? prev : schedRes.data);
      setHolidays(prev => isSameArray(prev, holRes.data) ? prev : holRes.data);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    } finally {
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setLoadedCount(INITIAL_SCHEDULE_BATCH);
    setIsSchedulesIncrementLoading(false);
  }, [filterSchedMonth, filterSchedResidencia, filterSchedCaregiver]);

  useEffect(() => {
    if (!uiNotice) return undefined;

    const timeoutId = window.setTimeout(() => {
      setUiNotice(null);
    }, 4200);

    return () => window.clearTimeout(timeoutId);
  }, [uiNotice]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const careId = urlParams.get('caregiver_id');
    if (careId && caregivers.length > 0) {
      const found = caregivers.find(c => c.id === careId);
      if (found) {
        setCaregiverMode(found);
        setActiveTab('calendar');
      }
    }
  }, [caregivers]);

  useEffect(() => {
    if (currentUser?.role === 'usuario_visualizador' && !viewResidencia && residences.length > 0) {
      const allowedResidences = residences.filter(r => currentUser.residencia_ids?.includes(r.id));
      if (allowedResidences.length > 0) {
        setViewResidencia(allowedResidences[0].id);
      }
    }
  }, [currentUser, residences, viewResidencia]);

  const handleLogin = (user) => {
    localStorage.setItem('session', JSON.stringify({ user, timestamp: Date.now() }));
    setCurrentUser(user);
    setActiveTab('calendar'); // reset tab on fresh login
  };

  const handleLogout = () => {
    localStorage.removeItem('session');
    setCurrentUser(null);
  };

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

  const schedulesOverlap = (firstSchedule, secondSchedule) => {
    const firstStart = new Date(`${firstSchedule.data_inicio}T${firstSchedule.hora_inicio}:00`);
    const firstEnd = new Date(`${firstSchedule.data_fim}T${firstSchedule.hora_fim}:00`);
    const secondStart = new Date(`${secondSchedule.data_inicio}T${secondSchedule.hora_inicio}:00`);
    const secondEnd = new Date(`${secondSchedule.data_fim}T${secondSchedule.hora_fim}:00`);

    return firstStart < secondEnd && firstEnd > secondStart;
  };

  const buildScheduleCandidate = (day, year, month, formData) => {
    const dataInicioUnformatted = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const spansNextDay = formData.hora_fim <= formData.hora_inicio; // ex: 19:00 as 07:00 ou 07:00 as 07:00

    return {
      residencia_id: formData.residencia_id,
      cuidadora_id: formData.cuidadora_id,
      data_inicio: dataInicioUnformatted,
      hora_inicio: formData.hora_inicio,
      data_fim: spansNextDay ? getNextDayStr(dataInicioUnformatted) : dataInicioUnformatted,
      hora_fim: formData.hora_fim
    };
  };

  const hasResidenceScheduleCompetition = (candidate) => (
    schedules.some(schedule => (
      schedule.residencia_id === candidate.residencia_id &&
      schedulesOverlap(candidate, schedule)
    ))
  );

  const getApiErrorMessage = (error, fallbackMessage) => (
    normalizeMessage(error?.response?.data?.error || error?.response?.data || error?.message, fallbackMessage)
  );

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    const { residencia_id, cuidadora_id, month, type, specificDays } = scheduleFormData;
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
    } else if (type === 'sem_concorrencia') {
      for (let d = 1; d <= daysInMonth; d += 1) targetDays.push(d);
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

    let batch = targetDays.map(day => buildScheduleCandidate(day, y, m, scheduleFormData));

    if (type === 'sem_concorrencia') {
      batch = batch.filter(candidate => !hasResidenceScheduleCompetition(candidate));
    }

    if (batch.length === 0) return alert("Nenhum dia sem concorrência encontrado para o mês, horário e prestador selecionados.");

    try {
      await api.post('/schedules/batch', { schedules: batch });
      setIsScheduleModalOpen(false);
      showNotice('Atendimentos gerados com sucesso.', 'success');
      fetchData();
    } catch (err) {
      console.error('Erro ao gerar:', err);
      alert(getApiErrorMessage(err, 'Nao foi possivel gerar os atendimentos.'));
    }
  };

  const handleEditScheduleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/schedules/${editScheduleData.id}`, editScheduleData);
      setIsEditScheduleModalOpen(false);
      showNotice('Atendimento atualizado com sucesso.', 'success');
      fetchData();
    } catch (err) {
      console.error('Erro:', err);
      alert(getApiErrorMessage(err, 'Nao foi possivel salvar a edicao do atendimento.'));
    }
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

  // --- Holidays Handlers ---
  const handleAddHoliday = async (hol) => {
    try {
      await api.post('/holidays', hol);
      fetchData();
    } catch (err) { console.error('Erro:', err); }
  };
  const handleDeleteHoliday = async (id) => {
    try {
      await api.delete(`/holidays/${id}`);
      fetchData();
    } catch (err) { console.error('Erro:', err); }
  };

  // Helpers UI
  const formatDisplayDate = (dStr) => {
    const parts = dStr.split('-');
    if (parts.length !== 3) return dStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const filteredSchedulesList = useMemo(() => (
    schedules.filter(s => {
      if (filterSchedMonth && !s.data_inicio.startsWith(filterSchedMonth)) return false;
      if (filterSchedResidencia && s.residencia_id !== filterSchedResidencia) return false;
      if (filterSchedCaregiver && s.cuidadora_id !== filterSchedCaregiver) return false;
      return true;
    })
  ), [schedules, filterSchedMonth, filterSchedResidencia, filterSchedCaregiver]);

  const displayedSchedules = useMemo(
    () => filteredSchedulesList.slice(0, loadedCount),
    [filteredSchedulesList, loadedCount]
  );

  const selectedScheduleIds = useMemo(
    () => new Set(selectedSchedules),
    [selectedSchedules]
  );

  const lastItemRef = useRef(null);
  const pendingLoadRef = useRef(null);

  const loadMore = useCallback(() => {
    if (pendingLoadRef.current || loadedCount >= filteredSchedulesList.length) {
      return;
    }

    setIsSchedulesIncrementLoading(true);
    pendingLoadRef.current = window.requestAnimationFrame(() => {
      pendingLoadRef.current = null;
      startTransition(() => {
        setLoadedCount(prev => Math.min(prev + SCHEDULE_BATCH_STEP, filteredSchedulesList.length));
      });
    });
  }, [filteredSchedulesList.length, loadedCount]);

  useEffect(() => {
    if (!isSchedulesIncrementLoading) {
      return;
    }

    if (displayedSchedules.length >= loadedCount || displayedSchedules.length >= filteredSchedulesList.length) {
      const timeoutId = window.setTimeout(() => {
        setIsSchedulesIncrementLoading(false);
      }, 120);

      return () => window.clearTimeout(timeoutId);
    }
  }, [displayedSchedules.length, filteredSchedulesList.length, isSchedulesIncrementLoading, loadedCount]);

  useEffect(() => {
    if (activeTab !== 'schedules' || displayedSchedules.length === 0 || displayedSchedules.length >= filteredSchedulesList.length) {
      return;
    }

    const node = lastItemRef.current;
    if (!node) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          observer.unobserve(entries[0].target);
          loadMore();
        }
      },
      {
        rootMargin: '0px 0px 160px 0px',
        threshold: 0
      }
    );

    observer.observe(node);

    // Revalida após a aba montar para não depender de outra interação do usuário.
    const timeoutId = window.setTimeout(() => {
      const rect = node.getBoundingClientRect();
      if (rect.top < window.innerHeight + 160 && displayedSchedules.length < filteredSchedulesList.length) {
        loadMore();
      }
    }, 100);

    return () => {
      if (pendingLoadRef.current) {
        window.cancelAnimationFrame(pendingLoadRef.current);
        pendingLoadRef.current = null;
      }
      window.clearTimeout(timeoutId);
      observer.unobserve(node);
      observer.disconnect();
    };
  }, [activeTab, displayedSchedules.length, filteredSchedulesList.length, loadMore]);

  if (!currentUser && !caregiverMode && !new URLSearchParams(window.location.search).get('caregiver_id')) {
    return <LoginView onLogin={handleLogin} />;
  }

  const isGeral = currentUser?.role === 'admin_geral';
  const isAdminResidencial = currentUser?.role === 'admin_residencia';
  const isVisualizador = currentUser?.role === 'usuario_visualizador';

  const userResidences = caregiverMode 
    ? residences.filter(r => caregiverMode.residencia_ids?.includes(r.id))
    : (!isGeral && currentUser)
      ? residences.filter(r => currentUser.residencia_ids?.includes(r.id))
      : residences;

  const userCaregivers = caregiverMode
    ? caregivers.filter(c => c.id === caregiverMode.id)
    : isVisualizador
      ? caregivers.filter(c => currentUser.cuidadora_ids?.includes(c.id))
      : isAdminResidencial
        ? caregivers.filter(c => c.residencia_ids?.some(r => userResidences.some(ur => ur.id === r)))
        : caregivers;

  // Apply visibility restrictions to schedules natively for the calendar tab
  const userSchedules = schedules.filter(s => {
    if (caregiverMode && s.cuidadora_id !== caregiverMode.id) return false;
    if (isVisualizador) {
      if (!currentUser.residencia_ids?.includes(s.residencia_id)) return false;
      if (!currentUser.cuidadora_ids?.includes(s.cuidadora_id)) return false;
    }
    if (isAdminResidencial) {
      if (!currentUser.residencia_ids?.includes(s.residencia_id)) return false;
    }
    return true;
  });

  const canEditSchedules = isGeral || isAdminResidencial;

  return (
    <div className="container">
      {uiNotice && (
        <div
          key={uiNotice.id}
          className={`floating-notice floating-notice--${uiNotice.type}`}
          role="status"
          aria-live="polite"
        >
          <span>{uiNotice.message}</span>
          <button
            type="button"
            className="floating-notice__close"
            onClick={() => setUiNotice(null)}
            aria-label="Fechar aviso"
          >
            x
          </button>
        </div>
      )}
      <header className="header" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Gestão de Atendimento</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>
            {caregiverMode ? `Acesso Restrito: ${caregiverMode.nome}` : 'Gerencie as residências, prestadores de serviços e seus horários.'}
          </p>
        </div>
        {currentUser && (
          <div style={{ textAlign: 'right' }}>
            <span style={{ color: 'white', marginRight: '16px' }}>Olá, <strong>{currentUser.username}</strong></span>
            <button className="btn-secondary" onClick={handleLogout}>Sair</button>
          </div>
        )}
      </header>

      {/* Tabs */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '32px', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
        {caregiverMode ? (
          <button className="btn-secondary active" style={{ borderColor: 'var(--primary)', background: 'rgba(255,255,255,0.1)' }}>
            <MonitorPlay size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} /> Meu Calendário
          </button>
        ) : (
          <>
            <button onClick={() => setActiveTab('calendar')} className="btn-secondary" style={{ background: activeTab === 'calendar' ? 'rgba(255,255,255,0.1)' : 'transparent', borderColor: activeTab === 'calendar' ? 'var(--primary)' : 'var(--border)' }}>
              <MonitorPlay size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} /> Calendário
            </button>
            <button onClick={() => setActiveTab('reports')} className="btn-secondary" style={{ background: activeTab === 'reports' ? 'rgba(255,255,255,0.1)' : 'transparent', borderColor: activeTab === 'reports' ? 'var(--primary)' : 'var(--border)' }}>
              <FileText size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} /> Relatórios
            </button>
            {!isVisualizador && (
              <>
                <button onClick={() => setActiveTab('schedules')} className="btn-secondary" style={{ background: activeTab === 'schedules' ? 'rgba(255,255,255,0.1)' : 'transparent', borderColor: activeTab === 'schedules' ? 'var(--primary)' : 'var(--border)' }}>
                  <CalendarDays size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} /> Atendimentos
                </button>
                <button onClick={() => setActiveTab('finance')} className="btn-secondary" style={{ background: activeTab === 'finance' ? 'rgba(255,255,255,0.1)' : 'transparent', borderColor: activeTab === 'finance' ? 'var(--primary)' : 'var(--border)' }}>
                  <DollarSign size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} /> Financeiro
                </button>
              </>
            )}
            {!isVisualizador && (
              <>
                <button onClick={() => setActiveTab('residences')} className="btn-secondary" style={{ background: activeTab === 'residences' ? 'rgba(255,255,255,0.1)' : 'transparent', borderColor: activeTab === 'residences' ? 'var(--primary)' : 'var(--border)' }}>
                  <Home size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} /> Residências
                </button>
                <button onClick={() => setActiveTab('caregivers')} className="btn-secondary" style={{ background: activeTab === 'caregivers' ? 'rgba(255,255,255,0.1)' : 'transparent', borderColor: activeTab === 'caregivers' ? 'var(--primary)' : 'var(--border)' }}>
                  <Users size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} /> Prestadores de Serviço
                </button>
                <button onClick={() => setActiveTab('holidays')} className="btn-secondary" style={{ background: activeTab === 'holidays' ? 'rgba(255,255,255,0.1)' : 'transparent', borderColor: activeTab === 'holidays' ? 'var(--primary)' : 'var(--border)' }}>
                  <CalendarHeart size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} /> Feriados
                </button>
                <button onClick={() => setActiveTab('users')} className="btn-secondary" style={{ background: activeTab === 'users' ? 'rgba(255,255,255,0.1)' : 'transparent', borderColor: activeTab === 'users' ? 'var(--primary)' : 'var(--border)' }}>
                  <UserCheck size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} /> Usuários VIP
                </button>
              </>
            )}
          </>
        )}
      </div>

      {caregiverMode ? (
        <CalendarView
          schedules={userSchedules}
          residences={userResidences}
          holidays={holidays}
          selectedMonth={viewMonth}
          setSelectedMonth={setViewMonth}
          selectedResidencia={viewResidencia}
          setSelectedResidencia={setViewResidencia}
          onEditSchedule={() => {}}
          onDeleteSchedule={() => {}}
        />
      ) : activeTab === 'reports' ? (
        <ReportsView
          schedules={userSchedules}
          caregivers={userCaregivers}
          holidays={holidays}
          currentEnvDate={currentEnvDate}
          onCopied={(message) => showNotice(message, 'success')}
          onCopyError={(message) => showNotice(message, 'error')}
        />
      ) : activeTab === 'finance' && !isVisualizador ? (
        <FinanceView
          schedules={userSchedules}
          residences={userResidences}
          holidays={holidays}
          currentEnvDate={currentEnvDate}
        />
      ) : activeTab === 'holidays' && !isVisualizador ? (
        <HolidaysView 
          holidays={holidays}
          onAddHoliday={handleAddHoliday}
          onDeleteHoliday={handleDeleteHoliday}
        />
      ) : activeTab === 'calendar' ? (
        <CalendarView
          schedules={userSchedules}
          residences={userResidences}
          holidays={holidays}
          selectedMonth={viewMonth}
          setSelectedMonth={setViewMonth}
          selectedResidencia={viewResidencia}
          setSelectedResidencia={setViewResidencia}
          onEditSchedule={canEditSchedules ? (s) => { setEditScheduleData(s); setIsEditScheduleModalOpen(true); } : undefined}
          onDeleteSchedule={canEditSchedules ? handleDeleteSchedule : undefined}
        />
      ) : activeTab === 'schedules' && !isVisualizador ? (
        <>
          {isSchedulesIncrementLoading && (
            <div className="incremental-loader" aria-live="polite" aria-label="Carregando mais atendimentos">
              <div className="incremental-loader__spinner" />
            </div>
          )}
          <div className="flex-between" style={{ marginBottom: '16px' }}>
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

          <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: '200px' }}>
              <label htmlFor="filter-sched-month">Filtro: Mês</label>
              <input 
                type="month" 
                id="filter-sched-month"
                name="filterSchedMonth"
                className="form-control" 
                value={filterSchedMonth} 
                onChange={(e) => setFilterSchedMonth(e.target.value)} 
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: '200px' }}>
              <label htmlFor="filter-sched-residencia">Filtro: Residência</label>
              <select 
                id="filter-sched-residencia"
                name="filterSchedResidencia"
                className="form-control" 
                value={filterSchedResidencia} 
                onChange={(e) => handleSetFilterSchedResidencia(e.target.value)}
              >
                <option value="">Todas</option>
                {userResidences.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: '200px' }}>
              <label htmlFor="filter-sched-caregiver">Filtro: Prestador</label>
              <select 
                id="filter-sched-caregiver"
                name="filterSchedCaregiver"
                className="form-control" 
                value={filterSchedCaregiver} 
                onChange={(e) => setFilterSchedCaregiver(e.target.value)}
              >
                <option value="">Todos</option>
                {caregivers.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
          </div>

          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))' }}>
            {displayedSchedules.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                <CalendarDays size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
                <h3>Nenhum agendamento encontrado</h3>
              </div>
            ) : (
              displayedSchedules.map((s, index) => (
                <div 
                  key={s.id} 
                  ref={index === displayedSchedules.length - 1 ? lastItemRef : null}
                  onClick={() => toggleScheduleSelection(s.id)} 
                  className="card" 
                  style={{ padding: '20px', cursor: 'pointer', border: selectedScheduleIds.has(s.id) ? '2px solid var(--primary)' : '1px solid var(--border)', transition: 'all 0.2s', background: selectedScheduleIds.has(s.id) ? 'rgba(99, 102, 241, 0.05)' : 'var(--bg-card)' }}
                >
                  <div className="flex-between" style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <input
                        type="checkbox"
                        checked={selectedScheduleIds.has(s.id)}
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
      ) : activeTab === 'residences' && !isVisualizador ? (        <>
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
      ) : activeTab === 'caregivers' && !isVisualizador ? (
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
                  <button className="btn-icon" onClick={() => {
                    const link = `${window.location.origin}/?caregiver_id=${c.id}`;
                    navigator.clipboard.writeText(link);
                    showNotice(`Link copiado: ${link}`, 'success');
                  }} title="Copiar link de acesso para o Prestador de Serviço"><MonitorPlay size={18} color="var(--success)" /></button>
                  <button className="btn-icon" onClick={() => handleOpenCaregiverModal(c)}><Edit2 size={18} /></button>
                  <button className="btn-icon" onClick={() => handleCaregiverDelete(c.id)}><Trash2 size={18} color="var(--danger)" /></button>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : activeTab === 'users' && !isVisualizador ? (
        <UsersView 
          residences={userResidences}
          caregivers={userCaregivers}
          currentUser={currentUser}
        />
      ) : null}

      {/* MODAL: RESIDENCE EDIT/CREATE */}
      {isResidenceModalOpen && (
        <div className="modal-overlay" onClick={() => setIsResidenceModalOpen(false)}>
          {/* ... UI igual ... */}
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 style={{ color: 'white', marginBottom: '24px' }}>{currentResidence ? 'Editar Residência' : 'Nova Residência'}</h2>
            <form onSubmit={handleResidenceSubmit}>
              <div className="form-group"><label htmlFor="residence-name">Nome*</label><input id="residence-name" name="residenceName" autoFocus required className="form-control" value={residenceFormData.nome} onChange={e => setResidenceFormData({ ...residenceFormData, nome: e.target.value })} /></div>
              <div className="form-group"><label htmlFor="residence-endereco">Endereço</label><input id="residence-endereco" name="residenceEndereco" className="form-control" value={residenceFormData.endereco} onChange={e => setResidenceFormData({ ...residenceFormData, endereco: e.target.value })} /></div>
              <div className="form-group">
                <label htmlFor="residence-valor-hora">Valor Hora Padrão (R$)</label>
                <input id="residence-valor-hora" name="residenceValorHora" type="number" step="0.01" className="form-control" value={residenceFormData.valor_hora} onChange={e => setResidenceFormData({ ...residenceFormData, valor_hora: e.target.value })} />
              </div>
              <div className="form-group" style={{ marginBottom: '24px', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input id="residence-adicional-noturno" name="residenceAdicionalNoturno" type="checkbox" style={{ marginRight: '10px', width: '20px', height: '20px', accentColor: 'var(--primary)' }} checked={residenceFormData.adicional_noturno} onChange={e => setResidenceFormData({ ...residenceFormData, adicional_noturno: e.target.checked })} />
                  <div>
                    <strong>Aplicar Adicional Noturno (22h às 05h)?</strong>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, marginTop: '4px', fontWeight: 'normal' }}>Acrescenta um valor extra por hora durante a madrugada.</p>
                  </div>
                </label>
              </div>
              {residenceFormData.adicional_noturno && (
                <div className="form-group">
                  <label htmlFor="residence-percentual-noturno">Acréscimo do Adicional Noturno (%) *Mín. 20%</label>
                  <input id="residence-percentual-noturno" name="residencePercentualNoturno" type="number" min="20" step="0.1" required className="form-control" value={residenceFormData.percentual_noturno} onChange={e => setResidenceFormData({ ...residenceFormData, percentual_noturno: e.target.value })} />
                </div>
              )}
              <div className="form-group" style={{ marginBottom: '24px', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input id="residence-adicional-feriado" name="residenceAdicionalFeriado" type="checkbox" style={{ marginRight: '10px', width: '20px', height: '20px', accentColor: 'var(--primary)' }} checked={residenceFormData.adicional_feriado} onChange={e => setResidenceFormData({ ...residenceFormData, adicional_feriado: e.target.checked })} />
                  <div>
                    <strong>Aplicar Adicional em Feriados?</strong>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, marginTop: '4px', fontWeight: 'normal' }}>Acrescenta um valor extra por hora nos dias de feriado.</p>
                  </div>
                </label>
              </div>

              {residenceFormData.adicional_feriado && (
                <div className="form-group">
                  <label htmlFor="residence-percentual-feriado">Acréscimo do Adicional de Feriado (%) *Mín 20%</label>
                  <input id="residence-percentual-feriado" name="residencePercentualFeriado" type="number" step="0.1" min="20" required className="form-control" value={residenceFormData.percentual_feriado} onChange={e => setResidenceFormData({ ...residenceFormData, percentual_feriado: e.target.value })} />
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
              <div className="form-group"><label htmlFor="caregiver-name">Nome*</label><input id="caregiver-name" name="caregiverName" autoFocus required className="form-control" value={caregiverFormData.nome} onChange={e => setCaregiverFormData({ ...caregiverFormData, nome: e.target.value })} /></div>
              <div className="form-group" style={{ marginBottom: '24px', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input type="checkbox" name="caregiverRegimeClt" style={{ marginRight: '10px', width: '20px', height: '20px', accentColor: 'var(--warning)' }} checked={caregiverFormData.regime_clt} onChange={e => setCaregiverFormData({ ...caregiverFormData, regime_clt: e.target.checked })} />
                  <div>
                    <strong>Regime de Contratação Fixa (CLT / Mensalista)</strong>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, marginTop: '4px', fontWeight: 'normal' }}>Marcador que exime o profissional dos cálculos na aba de Fechamento Financeiro, mas os mantém visualizáveis no calendário.</p>
                  </div>
                </label>
              </div>

              {!caregiverFormData.regime_clt && (
                <>
                  <div className="form-group">
                    <label htmlFor="caregiver-valor-hora">Valor Hora Específico (R$)</label>
                    <input id="caregiver-valor-hora" name="caregiverValorHora" type="number" step="0.01" className="form-control" placeholder="Deixe em branco para usar o da Residência" value={caregiverFormData.valor_hora} onChange={e => setCaregiverFormData({ ...caregiverFormData, valor_hora: e.target.value })} />
                  </div>

                  <div className="form-group">
                    <label htmlFor="caregiver-adicional-noturno">Adicional Noturno (Específico)</label>
                    <select id="caregiver-adicional-noturno" name="caregiverAdicionalNoturno" className="form-control" value={caregiverFormData.adicional_noturno} onChange={e => setCaregiverFormData({ ...caregiverFormData, adicional_noturno: e.target.value })}>
                      <option value="">Usar Regras da Residência atendida</option>
                      <option value="1">Forçar Aplicação do Adicional</option>
                      <option value="0">Nunca Aplicar Adicional</option>
                    </select>
                  </div>

                  {caregiverFormData.adicional_noturno === '1' && (
                    <div className="form-group">
                      <label htmlFor="caregiver-percentual-noturno">Acréscimo do Adicional Noturno Específico (%) *Mín 20%</label>
                      <input id="caregiver-percentual-noturno" name="caregiverPercentualNoturno" type="number" step="0.1" min="20" required className="form-control" value={caregiverFormData.percentual_noturno} onChange={e => setCaregiverFormData({ ...caregiverFormData, percentual_noturno: e.target.value })} />
                    </div>
                  )}

                  <div className="form-group" style={{ marginTop: '16px' }}>
                    <label htmlFor="caregiver-adicional-feriado">Adicional em Feriados (Específico)</label>
                    <select id="caregiver-adicional-feriado" name="caregiverAdicionalFeriado" className="form-control" value={caregiverFormData.adicional_feriado} onChange={e => setCaregiverFormData({ ...caregiverFormData, adicional_feriado: e.target.value })}>
                      <option value="">Usar Regras da Residência atendida</option>
                      <option value="1">Forçar Aplicação do Adicional Feriado</option>
                      <option value="0">Nunca Aplicar Adicional de Feriado</option>
                    </select>
                  </div>

                  {caregiverFormData.adicional_feriado === '1' && (
                    <div className="form-group">
                      <label htmlFor="caregiver-percentual-feriado">Acréscimo do Adicional Feriado Especifico (%) *Mín 20%</label>
                      <input id="caregiver-percentual-feriado" name="caregiverPercentualFeriado" type="number" step="0.1" min="20" required className="form-control" value={caregiverFormData.percentual_feriado} onChange={e => setCaregiverFormData({ ...caregiverFormData, percentual_feriado: e.target.value })} />
                    </div>
                  )}
                </>
              )}
              
              <div className="form-group">
                <div style={{ color: 'white', marginBottom: '8px' }}>Dias Disponíveis na Semana</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px' }}>
                  {WEEKDAYS.map(w => {
                    const isAvail = caregiverFormData.dias_disponiveis?.includes(w.id);
                    return (
                    <label key={w.id} style={{ color: 'white', display: 'flex', alignItems: 'center', fontSize: '0.85rem', background: isAvail ? 'rgba(16, 185, 129, 0.2)' : 'transparent', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                      <input id={`caregiver-day-${w.id}`} name={`caregiverDay_${w.id}`} type="checkbox" style={{ marginRight: '6px', accentColor: 'var(--success)' }} checked={isAvail} onChange={() => {
                        const dias = caregiverFormData.dias_disponiveis || [];
                        setCaregiverFormData({ ...caregiverFormData, dias_disponiveis: dias.includes(w.id) ? dias.filter(d => d !== w.id) : [...dias, w.id] });
                      }} />
                      {w.label}
                    </label>
                  )})}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="caregiver-observacao">Observação (Opcional)</label>
                <textarea id="caregiver-observacao" name="caregiverObservacao" className="form-control" placeholder="Ex: Informações gerais, contatos ou restrições..." value={caregiverFormData.observacao} onChange={e => setCaregiverFormData({ ...caregiverFormData, observacao: e.target.value })} style={{ minHeight: '80px', resize: 'vertical' }} />
              </div>

              <div className="form-group"><div style={{ color: 'white', marginBottom: '8px' }}>Atende nas Residências:</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {residences.map(res => {
                    const isChecked = caregiverFormData.residencia_ids?.includes(res.id);
                    const config = caregiverFormData.residencias_config?.find(c => c.id === res.id) || { id: res.id, valor_transporte: 9 };
                    return (
                      <div key={res.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: 'rgba(255,255,255,0.02)', padding: '8px', borderRadius: '4px' }}>
                        <label style={{ color: 'white', display: 'flex', alignItems: 'center' }}>
                          <input id={`caregiver-residencia-${res.id}`} name={`caregiverResidencia_${res.id}`} type="checkbox" style={{ marginRight: '8px' }} checked={isChecked} onChange={() => {
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
                          <label htmlFor={`caregiver-transporte-${res.id}`} style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            Transporte (Ida e Volta) R$:
                            <input id={`caregiver-transporte-${res.id}`} name={`caregiverTransporte_${res.id}`} type="number" step="0.01" value={config.valor_transporte} onChange={(e) => {
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
                <label htmlFor="schedule-residencia">Residência*</label>
                <select id="schedule-residencia" name="scheduleResidencia" required className="form-control" value={scheduleFormData.residencia_id} onChange={e => setScheduleFormData({ ...scheduleFormData, residencia_id: e.target.value, cuidadora_id: '' })}>
                  <option value="">Selecione...</option>
                  {userResidences.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="schedule-cuidadora">Prestador de Serviço*</label>
                <select id="schedule-cuidadora" name="scheduleCuidadora" required className="form-control" value={scheduleFormData.cuidadora_id} onChange={e => setScheduleFormData({ ...scheduleFormData, cuidadora_id: e.target.value })} disabled={!scheduleFormData.residencia_id}>
                  <option value="">Selecione...</option>
                  {caregivers.filter(c => c.residencia_ids.includes(scheduleFormData.residencia_id)).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="schedule-month">Mês / Ano*</label>
                <input id="schedule-month" name="scheduleMonth" type="month" required className="form-control" value={scheduleFormData.month} onChange={e => setScheduleFormData({ ...scheduleFormData, month: e.target.value })} />
              </div>

              <div className="form-group">
                <label htmlFor="schedule-type">Dias do Mês*</label>
                <select id="schedule-type" name="scheduleType" className="form-control" value={scheduleFormData.type} onChange={e => setScheduleFormData({ ...scheduleFormData, type: e.target.value })}>
                  <option value="impares">Todos os dias Ímpares</option>
                  <option value="pares">Todos os dias Pares</option>
                  <option value="sem_concorrencia">Todas as datas sem concorrência</option>
                  <option value="especificos">Dias Específicos</option>
                </select>
              </div>

              {scheduleFormData.type === 'especificos' && (
                <div className="form-group">
                  <label htmlFor="schedule-specific-days">Quais dias? (separe por vírgula)</label>
                  <input id="schedule-specific-days" name="scheduleSpecificDays" required type="text" placeholder="Ex: 1, 3, 5, 20" className="form-control" value={scheduleFormData.specificDays} onChange={e => setScheduleFormData({ ...scheduleFormData, specificDays: e.target.value })} />
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label htmlFor="schedule-hora-inicio">Hora Início*</label>
                  <input id="schedule-hora-inicio" name="scheduleHoraInicio" required type="time" className="form-control" value={scheduleFormData.hora_inicio} onChange={e => setScheduleFormData({ ...scheduleFormData, hora_inicio: e.target.value })} />
                </div>
                <div className="form-group">
                  <label htmlFor="schedule-hora-fim">Hora Término*</label>
                  <input id="schedule-hora-fim" name="scheduleHoraFim" required type="time" className="form-control" value={scheduleFormData.hora_fim} onChange={e => setScheduleFormData({ ...scheduleFormData, hora_fim: e.target.value })} />
                </div>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>*Se a hora de término for menor ou igual à de início (ex: 19h as 07h), o sistema considerará o término no dia seguinte automaticamente.</p>

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
                <label htmlFor="edit-schedule-cuidadora">Prestador de Serviço*</label>
                <select 
                  id="edit-schedule-cuidadora"
                  name="editScheduleCuidadora"
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
                  <label htmlFor="edit-schedule-data-inicio">Data Início*</label>
                  <input id="edit-schedule-data-inicio" name="editScheduleDataInicio" required type="date" className="form-control" value={editScheduleData.data_inicio} onChange={e => setEditScheduleData({ ...editScheduleData, data_inicio: e.target.value })} />
                </div>
                <div className="form-group">
                  <label htmlFor="edit-schedule-hora-inicio">Hora Início*</label>
                  <input id="edit-schedule-hora-inicio" name="editScheduleHoraInicio" required type="time" className="form-control" value={editScheduleData.hora_inicio} onChange={e => setEditScheduleData({ ...editScheduleData, hora_inicio: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
                <div className="form-group">
                  <label htmlFor="edit-schedule-data-fim">Data Fim*</label>
                  <input id="edit-schedule-data-fim" name="editScheduleDataFim" required type="date" className="form-control" value={editScheduleData.data_fim} onChange={e => setEditScheduleData({ ...editScheduleData, data_fim: e.target.value })} />
                </div>
                <div className="form-group">
                  <label htmlFor="edit-schedule-hora-fim">Hora Fim*</label>
                  <input id="edit-schedule-hora-fim" name="editScheduleHoraFim" required type="time" className="form-control" value={editScheduleData.hora_fim} onChange={e => setEditScheduleData({ ...editScheduleData, hora_fim: e.target.value })} />
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
