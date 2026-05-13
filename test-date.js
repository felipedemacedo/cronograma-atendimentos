const s = { data_inicio: '2026-05-15', data_fim: '2026-05-18' };
const [sy, sm, sd] = s.data_inicio.split('-').map(Number);
const [ey, em, ed] = s.data_fim.split('-').map(Number);
const startDT = new Date(sy, sm - 1, sd);
const endDT = new Date(ey, em - 1, ed);
const diffTime = endDT - startDT;
const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
console.log('diffDays:', diffDays);
for (let i = 1; i < diffDays; i++) {
   const intermediateDate = new Date(sy, sm - 1, sd + i);
   const yyyy = intermediateDate.getFullYear();
   const mm = String(intermediateDate.getMonth() + 1).padStart(2, '0');
   const dd = String(intermediateDate.getDate()).padStart(2, '0');
   const dateStr = `${yyyy}-${mm}-${dd}`;
   console.log(dateStr);
}
