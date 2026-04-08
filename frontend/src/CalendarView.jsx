import { useMemo } from 'react';

const COLORS = [
  '#f87171', '#fb923c', '#facc15', '#4ade80', '#2dd4bf', 
  '#38bdf8', '#818cf8', '#c084fc', '#f472b6', '#fb7185'
];

// Helper para obter cor consistente baseada no nome
const getColorForId = (name) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % COLORS.length;
  return COLORS[index];
};

const parseTime = (timeStr) => {
  const [h, m] = timeStr.split(':').map(Number);
  return h + m / 60;
};

const getDaysInMonth = (year, month) => new Date(year, month, 0).getDate();
const getDayOfWeek = (year, month, day) => {
  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  return days[new Date(year, month - 1, day).getDay()];
};

export default function CalendarView({ schedules, residences, selectedMonth, setSelectedMonth, selectedResidencia, setSelectedResidencia }) {
  const visualData = useMemo(() => {
    if (!selectedMonth || !selectedResidencia) return null;
    
    const [yearStr, monthStr] = selectedMonth.split('-');
    const year = parseInt(yearStr);
    const month = parseInt(monthStr);
    const daysCount = getDaysInMonth(year, month);

    // Filter schedules by residence
    const filteredSchedules = schedules.filter(s => s.residencia_id === selectedResidencia);

    // Transform into blocks that don't overflow days
    const blocks = [];
    filteredSchedules.forEach(s => {
      if (s.data_inicio === s.data_fim) {
        blocks.push({
          date: s.data_inicio,
          start: parseTime(s.hora_inicio),
          end: parseTime(s.hora_fim),
          name: s.cuidadora_nome,
          color: getColorForId(s.cuidadora_nome)
        });
      } else {
        // Spans midnight, split in two blocks
        blocks.push({
          date: s.data_inicio,
          start: parseTime(s.hora_inicio),
          end: 24,
          name: s.cuidadora_nome,
          color: getColorForId(s.cuidadora_nome)
        });
        blocks.push({
          date: s.data_fim,
          start: 0,
          end: parseTime(s.hora_fim),
          name: s.cuidadora_nome,
          color: getColorForId(s.cuidadora_nome)
        });
      }
    });

    // Group by day for the selected month
    const daysArray = [];
    const targetMonthPrefix = selectedMonth;

    for (let d = 1; d <= daysCount; d++) {
      const dateStr = `${targetMonthPrefix}-${String(d).padStart(2, '0')}`;
      
      const dayBlocks = blocks.filter(b => b.date === dateStr).sort((a,b) => a.start - b.start);
      
      // Calculate levels for overlapping
      const placedBlocks = [];
      let maxLevel = 0;

      dayBlocks.forEach(block => {
        let level = 0;
        while (true) {
          const overlap = placedBlocks.find(pb => pb.level === level && (
            (block.start >= pb.start && block.start < pb.end) || // start is inside
            (block.end > pb.start && block.end <= pb.end) ||     // end is inside
            (block.start <= pb.start && block.end >= pb.end)     // envelops completely
          ));
          if (!overlap) break;
          level++;
        }
        block.level = level;
        if (level > maxLevel) maxLevel = level;
        placedBlocks.push(block);
      });

      daysArray.push({
        dayNumber: d,
        dayOfWeek: getDayOfWeek(year, month, d),
        dateStr,
        blocks: placedBlocks,
        rowHeight: (maxLevel + 1) * 32 + 8 // 32px per block + padding margins
      });
    }

    return daysArray;

  }, [schedules, selectedMonth, selectedResidencia]);

  return (
    <div className="card" style={{ padding: '24px', overflowX: 'auto', background: 'var(--bg-dark)' }}>
      {/* Controls */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '24px', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
        <div style={{ flex: '1 1 200px' }}>
          <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Selecionar Mês/Ano</label>
          <input 
            type="month" 
            className="form-control" 
            style={{ width: '100%' }}
            value={selectedMonth} 
            onChange={e => setSelectedMonth(e.target.value)} 
          />
        </div>
        <div style={{ flex: '2 1 250px' }}>
          <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Filtrar por Residência</label>
          <select 
            className="form-control" 
            style={{ width: '100%' }}
            value={selectedResidencia} 
            onChange={e => setSelectedResidencia(e.target.value)}
          >
            <option value="">Selecione uma residência...</option>
            {residences.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}
          </select>
        </div>
      </div>

      {!selectedResidencia ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Selecione uma residência acima para visualizar o calendário de plantões.
        </div>
      ) : visualData ? (
        <div style={{ minWidth: '800px' }}>
          {/* Timeline Header */}
          <div style={{ display: 'flex', marginBottom: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '4px' }}>
            <div style={{ width: '60px', flexShrink: 0, fontWeight: 'bold', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Dia</div>
            <div style={{ flexGrow: 1, display: 'flex', position: 'relative' }}>
              {[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23].map(h => (
                <div key={h} style={{ flex: 1, textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', borderLeft: '1px solid rgba(255,255,255,0.05)' }}>
                  {String(h).padStart(2, '0')}:00
                </div>
              ))}
            </div>
          </div>

          {/* Timeline Rows */}
          {visualData.map((day) => {
            const isWeekend = day.dayOfWeek === 'Dom' || day.dayOfWeek === 'Sáb';
            
            return (
              <div key={day.dateStr} style={{ 
                display: 'flex', 
                borderBottom: '1px solid rgba(255,255,255,0.05)', 
                background: isWeekend ? 'rgba(255,255,255,0.02)' : 'transparent'
              }}>
                {/* Day Label */}
                <div style={{ 
                  width: '60px', 
                  flexShrink: 0, 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'center',
                  alignItems: 'center',
                  padding: '8px 0',
                  borderRight: '1px solid var(--border)',
                  color: isWeekend ? 'var(--primary)' : 'var(--text-main)',
                  fontWeight: isWeekend ? 'bold' : 'normal'
                }}>
                  <span style={{ fontSize: '0.8rem', textTransform: 'uppercase' }}>{day.dayOfWeek}</span>
                  <span style={{ fontSize: '1.2rem', fontWeight: 600 }}>{day.dayNumber}</span>
                </div>

                {/* Blocks Container */}
                <div style={{ 
                  flexGrow: 1, 
                  position: 'relative', 
                  height: day.rowHeight + 'px',
                  background: 'repeating-linear-gradient(90deg, transparent, transparent calc(100%/24 - 1px), rgba(255,255,255,0.03) calc(100%/24 - 1px), rgba(255,255,255,0.03) calc(100%/24))'
                }}>
                  {day.blocks.map((block, idx) => {
                    const widthPerc = ((block.end - block.start) / 24) * 100;
                    const leftPerc = (block.start / 24) * 100;
                    
                    return (
                      <div 
                        key={idx} 
                        style={{
                          position: 'absolute',
                          left: `${leftPerc}%`,
                          width: `${widthPerc}%`,
                          top: `${block.level * 32 + 4}px`,
                          height: '28px',
                          display: 'flex',
                          alignItems: 'center',
                          padding: '0 8px',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: '500',
                          color: '#000',
                          backgroundColor: block.color,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                          opacity: 0.9,
                          zIndex: 10
                        }}
                        title={`${block.name} (${String(Math.floor(block.start)).padStart(2,'0')}:00 - ${String(Math.floor(block.end)).padStart(2,'0')}:00)`}
                      >
                        {widthPerc > 5 && block.name}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
