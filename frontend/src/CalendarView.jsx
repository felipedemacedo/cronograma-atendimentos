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

const getBrazilianHolidays = (year) => {
  const feriados = {};
  
  const fixos = [
    { m: 1, d: 1, nome: "Ano Novo" },     { m: 4, d: 21, nome: "Tiradentes" },
    { m: 5, d: 1, nome: "Trabalho" },     { m: 9, d: 7, nome: "Independência" },
    { m: 10, d: 12, nome: "Aparecida" },  { m: 11, d: 2, nome: "Finados" },
    { m: 11, d: 15, nome: "República" },{ m: 12, d: 25, nome: "Natal" }
  ];
  
  fixos.forEach(f => {
    feriados[`${year}-${String(f.m).padStart(2,'0')}-${String(f.d).padStart(2,'0')}`] = f.nome;
  });

  const a = year % 19; const b = Math.floor(year/100); const c = year % 100;
  const d = Math.floor(b/4); const e = b % 4; const f = Math.floor((b+8)/25);
  const g = Math.floor((b-f+1)/3); const h = (19*a + b - d - g + 15) % 30;
  const i = Math.floor(c/4); const k = c % 4; const l = (32 + 2*e + 2*i - h - k) % 7;
  const m = Math.floor((a + 11*h + 22*l)/451);
  const month = Math.floor((h + l - 7*m + 114)/31);
  const day = ((h + l - 7*m + 114) % 31) + 1;

  const pascoaDate = new Date(year, month - 1, day);
  feriados[`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`] = "Páscoa";

  const sextaSanta = new Date(pascoaDate); sextaSanta.setDate(pascoaDate.getDate() - 2);
  feriados[`${year}-${String(sextaSanta.getMonth()+1).padStart(2,'0')}-${String(sextaSanta.getDate()).padStart(2,'0')}`] = "Sexta Santa";
  
  const carnaval = new Date(pascoaDate); carnaval.setDate(pascoaDate.getDate() - 47);
  feriados[`${year}-${String(carnaval.getMonth()+1).padStart(2,'0')}-${String(carnaval.getDate()).padStart(2,'0')}`] = "Carnaval";

  const corpus = new Date(pascoaDate); corpus.setDate(pascoaDate.getDate() + 60);
  feriados[`${year}-${String(corpus.getMonth()+1).padStart(2,'0')}-${String(corpus.getDate()).padStart(2,'0')}`] = "Corpus Christi";

  return feriados;
}

export default function CalendarView({ schedules, residences, selectedMonth, setSelectedMonth, selectedResidencia, setSelectedResidencia, onEditSchedule, onDeleteSchedule }) {
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
          color: getColorForId(s.cuidadora_nome),
          original: s
        });
      } else {
        // Spans midnight, split in two blocks
        blocks.push({
          date: s.data_inicio,
          start: parseTime(s.hora_inicio),
          end: 24,
          name: s.cuidadora_nome,
          color: getColorForId(s.cuidadora_nome),
          original: s
        });
        blocks.push({
          date: s.data_fim,
          start: 0,
          end: parseTime(s.hora_fim),
          name: s.cuidadora_nome,
          color: getColorForId(s.cuidadora_nome),
          original: s
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
        feriadoNome: getBrazilianHolidays(year)[dateStr] || null,
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
            const isFeriado = !!day.feriadoNome;
            
            return (
              <div key={day.dateStr} style={{ 
                display: 'flex', 
                borderBottom: '1px solid rgba(255,255,255,0.05)', 
                background: isFeriado ? 'rgba(239, 68, 68, 0.05)' : (isWeekend ? 'rgba(255,255,255,0.02)' : 'transparent')
              }}>
                {/* Day Label */}
                <div style={{ 
                  width: '60px', 
                  flexShrink: 0, 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'flex-start',
                  paddingTop: '8px',
                  alignItems: 'center',
                  borderRight: '1px solid var(--border)',
                  color: isFeriado ? 'var(--danger)' : (isWeekend ? 'var(--primary)' : 'var(--text-main)'),
                  fontWeight: (isWeekend || isFeriado) ? 'bold' : 'normal'
                }}>
                  <span style={{ fontSize: '0.8rem', textTransform: 'uppercase' }}>{day.dayOfWeek}</span>
                  <span style={{ fontSize: '1.2rem', fontWeight: 600 }}>{day.dayNumber}</span>
                  {isFeriado && (
                    <span style={{ fontSize: '0.55rem', color: 'var(--danger)', marginTop: '4px', textAlign: 'center', padding: '0 2px', lineHeight: '1' }}>{day.feriadoNome}</span>
                  )}
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
                          zIndex: 10,
                          cursor: 'pointer'
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onEditSchedule) onEditSchedule(block.original);
                        }}
                        title={`${block.name} (${String(Math.floor(block.start)).padStart(2,'0')}:00 - ${String(Math.floor(block.end)).padStart(2,'0')}:00) - Clique para editar`}
                      >
                        <span style={{flexGrow: 1, overflow: 'hidden', textOverflow: 'ellipsis', marginRight: '16px'}}>
                          {widthPerc > 5 && block.name}
                        </span>
                        
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onDeleteSchedule) onDeleteSchedule(block.original.id);
                          }}
                          style={{
                            position: 'absolute',
                            right: '4px',
                            width: '16px',
                            height: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'rgba(0,0,0,0.2)',
                            borderRadius: '50%',
                            color: 'white',
                            lineHeight: '1',
                            fontSize: '10px',
                            cursor: 'pointer'
                          }}
                          title="Excluir Plantão"
                        >
                          ✕
                        </div>
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
