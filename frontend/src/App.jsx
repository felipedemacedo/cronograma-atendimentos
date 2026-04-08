import { useState, useEffect } from 'react';
import { Plus, Home, MapPin, Edit2, Trash2, Users, UserCheck } from 'lucide-react';
import api from './api';

function App() {
  const [activeTab, setActiveTab] = useState('residences'); // 'residences' ou 'caregivers'
  
  // States para Residências
  const [residences, setResidences] = useState([]);
  const [currentResidence, setCurrentResidence] = useState(null);
  const [isResidenceModalOpen, setIsResidenceModalOpen] = useState(false);
  const [residenceFormData, setResidenceFormData] = useState({ nome: '', endereco: '' });

  // States para Cuidadoras
  const [caregivers, setCaregivers] = useState([]);
  const [currentCaregiver, setCurrentCaregiver] = useState(null);
  const [isCaregiverModalOpen, setIsCaregiverModalOpen] = useState(false);
  const [caregiverFormData, setCaregiverFormData] = useState({ nome: '', residencia_ids: [] });

  const fetchResidences = async () => {
    try {
      const response = await api.get('/residences');
      setResidences(response.data);
    } catch (error) {
      console.error('Erro ao buscar residências:', error);
    }
  };

  const fetchCaregivers = async () => {
    try {
      const response = await api.get('/caregivers');
      setCaregivers(response.data);
    } catch (error) {
      console.error('Erro ao buscar cuidadoras:', error);
    }
  };

  useEffect(() => {
    // Busca inicial
    fetchResidences();
    fetchCaregivers();

    // Sincronização em "tempo real" (Polling a cada 2 segundos)
    // Isso garante que se você adicionar pelo celular, apareça no PC na hora.
    const interval = setInterval(() => {
      fetchResidences();
      fetchCaregivers();
    }, 2000);

    // Limpa o intervalo quando o componente for desmontado
    return () => clearInterval(interval);
  }, []);

  // --- Funções de Residência ---
  const handleOpenResidenceModal = (residence = null) => {
    if (residence) {
      setCurrentResidence(residence);
      setResidenceFormData({ nome: residence.nome, endereco: residence.endereco || '' });
    } else {
      setCurrentResidence(null);
      setResidenceFormData({ nome: '', endereco: '' });
    }
    setIsResidenceModalOpen(true);
  };

  const handleCloseResidenceModal = () => setIsResidenceModalOpen(false);

  const handleResidenceSubmit = async (e) => {
    e.preventDefault();
    try {
      if (currentResidence) {
        await api.put(`/residences/${currentResidence.id}`, residenceFormData);
      } else {
        await api.post('/residences', residenceFormData);
      }
      fetchResidences();
      handleCloseResidenceModal();
    } catch (error) {
      console.error('Erro ao salvar residência:', error);
    }
  };

  const handleResidenceDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta residência?')) {
      try {
        await api.delete(`/residences/${id}`);
        fetchResidences();
      } catch (error) {
        console.error('Erro ao excluir residência:', error);
      }
    }
  };


  // --- Funções de Cuidadora ---
  const handleOpenCaregiverModal = (caregiver = null) => {
    if (caregiver) {
      setCurrentCaregiver(caregiver);
      setCaregiverFormData({ nome: caregiver.nome, residencia_ids: caregiver.residencia_ids || [] });
    } else {
      setCurrentCaregiver(null);
      setCaregiverFormData({ nome: '', residencia_ids: [] });
    }
    setIsCaregiverModalOpen(true);
  };

  const handleCloseCaregiverModal = () => setIsCaregiverModalOpen(false);

  const handleCaregiverSubmit = async (e) => {
    e.preventDefault();
    try {
      if (currentCaregiver) {
        await api.put(`/caregivers/${currentCaregiver.id}`, caregiverFormData);
      } else {
        await api.post('/caregivers', caregiverFormData);
      }
      fetchCaregivers();
      handleCloseCaregiverModal();
    } catch (error) {
      console.error('Erro ao salvar cuidadora:', error);
    }
  };

  const handleCaregiverDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta cuidadora?')) {
      try {
        await api.delete(`/caregivers/${id}`);
        fetchCaregivers();
      } catch (error) {
        console.error('Erro ao excluir cuidadora:', error);
      }
    }
  };

  const toggleResidenciaSelection = (resId) => {
    setCaregiverFormData(prev => {
      const ids = prev.residencia_ids;
      if (ids.includes(resId)) {
        return { ...prev, residencia_ids: ids.filter(i => i !== resId) };
      } else {
        return { ...prev, residencia_ids: [...ids, resId] };
      }
    });
  };

  return (
    <div className="container">
      <header className="header" style={{ marginBottom: '24px' }}>
        <div>
          <h1>Gestão de Atendimento</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>
            Gerencie as residências e as cuidadoras cadastradas.
          </p>
        </div>
      </header>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '32px', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
        <button 
          onClick={() => setActiveTab('residences')}
          className="btn-secondary"
          style={{ 
            background: activeTab === 'residences' ? 'rgba(255,255,255,0.1)' : 'transparent',
            borderColor: activeTab === 'residences' ? 'var(--primary)' : 'var(--border)'
          }}
        >
          <Home size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }}/> Residências
        </button>
        <button 
          onClick={() => setActiveTab('caregivers')}
          className="btn-secondary"
          style={{ 
            background: activeTab === 'caregivers' ? 'rgba(255,255,255,0.1)' : 'transparent',
            borderColor: activeTab === 'caregivers' ? 'var(--primary)' : 'var(--border)'
          }}
        >
          <Users size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }}/> Cuidadoras
        </button>
      </div>

      <div className="flex-between" style={{ marginBottom: '24px' }}>
        <h2 style={{ color: 'white' }}>
          {activeTab === 'residences' ? 'Residências' : 'Cuidadoras'}
        </h2>
        <button 
          className="btn-primary" 
          onClick={activeTab === 'residences' ? () => handleOpenResidenceModal() : () => handleOpenCaregiverModal()}
        >
          <Plus size={20} />
          {activeTab === 'residences' ? 'Nova Residência' : 'Nova Cuidadora'}
        </button>
      </div>

      <main className="grid">
        {/* Render for Residences */}
        {activeTab === 'residences' && (
          residences.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              <Home size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
              <h3>Nenhuma residência cadastrada</h3>
            </div>
          ) : (
            residences.map((res) => (
              <div key={res.id} className="card">
                <div className="flex-between" style={{ marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '1.25rem', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Home size={20} color="var(--primary)" />
                    {res.nome}
                  </h3>
                </div>
                {res.endereco ? (
                  <p style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', marginBottom: '24px' }}>
                    <MapPin size={16} />{res.endereco}
                  </p>
                ) : (
                  <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.85rem', fontStyle: 'italic', marginBottom: '24px' }}>
                    Sem endereço
                  </p>
                )}
                <div className="flex-gap" style={{ justifyContent: 'flex-end', marginTop: 'auto' }}>
                  <button className="btn-icon" onClick={() => handleOpenResidenceModal(res)}>
                    <Edit2 size={18} />
                  </button>
                  <button className="btn-icon" style={{ borderColor: 'rgba(239, 68, 68, 0.3)', color: 'var(--danger)' }} onClick={() => handleResidenceDelete(res.id)}>
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))
          )
        )}

        {/* Render for Caregivers */}
        {activeTab === 'caregivers' && (
          caregivers.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              <Users size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
              <h3>Nenhuma cuidadora cadastrada</h3>
            </div>
          ) : (
            caregivers.map((cuidadora) => {
              const assignedResidences = residences.filter(r => cuidadora.residencia_ids?.includes(r.id));
              return (
                <div key={cuidadora.id} className="card">
                  <div className="flex-between" style={{ marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '1.25rem', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <UserCheck size={20} color="var(--success)" />
                      {cuidadora.nome}
                    </h3>
                  </div>
                  <div style={{ marginBottom: '24px' }}>
                    <p style={{ color: 'var(--text-main)', fontSize: '0.9rem', marginBottom: '8px', fontWeight: 500 }}>
                      Presta atendimento em:
                    </p>
                    {assignedResidences.length === 0 ? (
                      <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.3)' }}>Nenhuma residência</span>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {assignedResidences.map(ar => (
                          <span key={ar.id} style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                            {ar.nome}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex-gap" style={{ justifyContent: 'flex-end', marginTop: 'auto' }}>
                    <button className="btn-icon" onClick={() => handleOpenCaregiverModal(cuidadora)}>
                      <Edit2 size={18} />
                    </button>
                    <button className="btn-icon" style={{ borderColor: 'rgba(239, 68, 68, 0.3)', color: 'var(--danger)' }} onClick={() => handleCaregiverDelete(cuidadora.id)}>
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              )
            })
          )
        )}
      </main>

      {/* Residence Modal */}
      {isResidenceModalOpen && (
        <div className="modal-overlay" onClick={handleCloseResidenceModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginBottom: '24px', color: 'white' }}>
              {currentResidence ? 'Editar Residência' : 'Nova Residência'}
            </h2>
            <form onSubmit={handleResidenceSubmit}>
              <div className="form-group">
                <label>Nome da Residência*</label>
                <input
                  type="text"
                  className="form-control"
                  value={residenceFormData.nome}
                  onChange={e => setResidenceFormData({...residenceFormData, nome: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Endereço (Opcional)</label>
                <input
                  type="text"
                  className="form-control"
                  value={residenceFormData.endereco}
                  onChange={e => setResidenceFormData({...residenceFormData, endereco: e.target.value})}
                />
              </div>
              <div className="flex-gap" style={{ justifyContent: 'flex-end', marginTop: '32px' }}>
                <button type="button" className="btn-secondary" onClick={handleCloseResidenceModal}>Cancelar</button>
                <button type="submit" className="btn-primary">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Caregiver Modal */}
      {isCaregiverModalOpen && (
        <div className="modal-overlay" onClick={handleCloseCaregiverModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginBottom: '24px', color: 'white' }}>
              {currentCaregiver ? 'Editar Cuidadora' : 'Nova Cuidadora'}
            </h2>
            <form onSubmit={handleCaregiverSubmit}>
              <div className="form-group">
                <label>Nome da Cuidadora*</label>
                <input
                  type="text"
                  className="form-control"
                  value={caregiverFormData.nome}
                  onChange={e => setCaregiverFormData({...caregiverFormData, nome: e.target.value})}
                  required
                />
              </div>
              
              <div className="form-group" style={{ marginTop: '20px' }}>
                <label>Atende nas Residências:</label>
                {residences.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Cadastre uma residência primeiro.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '150px', overflowY: 'auto', padding: '8px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                    {residences.map(res => (
                      <label key={res.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'white' }}>
                        <input 
                          type="checkbox" 
                          checked={caregiverFormData.residencia_ids?.includes(res.id)}
                          onChange={() => toggleResidenciaSelection(res.id)}
                          style={{ accentColor: 'var(--primary)', width: '16px', height: '16px' }}
                        />
                        {res.nome}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex-gap" style={{ justifyContent: 'flex-end', marginTop: '32px' }}>
                <button type="button" className="btn-secondary" onClick={handleCloseCaregiverModal}>Cancelar</button>
                <button type="submit" className="btn-primary">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
