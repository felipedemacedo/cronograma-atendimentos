export const getBrazilianHolidays = (year) => {
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
};
