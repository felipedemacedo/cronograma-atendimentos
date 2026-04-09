const request = require('supertest');
const app = require('./server');
const db = require('./database');

describe('API Principais Funcionalidades', () => {
  let residenciaId;
  let cuidadoraId;

  beforeAll(async () => {
    await db.ready;
  });

  afterAll(async () => {
    await db.close();
  });

  it('Deve criar uma Residencia', async () => {
    const res = await request(app).post('/api/residences').send({
      nome: 'Residencia Teste',
      endereco: 'Rua Teste, 123',
      valor_hora: 12.5,
      adicional_noturno: true,
      percentual_noturno: 30,
    });

    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.nome).toEqual('Residencia Teste');
    residenciaId = res.body.id;
  });

  it('Deve criar uma Cuidadora com regras especificas', async () => {
    const res = await request(app).post('/api/caregivers').send({
      nome: 'Cuidadora Clara',
      residencia_ids: [residenciaId],
      residencias_config: [{ id: residenciaId, valor_transporte: 10 }],
      valor_hora: 15,
      observacao: 'Boa cuidadora',
      dias_disponiveis: [1, 2, 3, 4, 5],
      adicional_noturno: 0,
    });

    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.nome).toEqual('Cuidadora Clara');
    cuidadoraId = res.body.id;
  });

  it('Pode realizar agendamento em lote e persisti-los no BD', async () => {
    const res = await request(app).post('/api/schedules/batch').send({
      schedules: [
        {
          residencia_id: residenciaId,
          cuidadora_id: cuidadoraId,
          data_inicio: '2024-02-05',
          hora_inicio: '08:00',
          data_fim: '2024-02-05',
          hora_fim: '18:00',
        },
        {
          residencia_id: residenciaId,
          cuidadora_id: cuidadoraId,
          data_inicio: '2024-02-06',
          hora_inicio: '08:00',
          data_fim: '2024-02-06',
          hora_fim: '18:00',
        },
      ],
    });

    expect(res.statusCode).toEqual(201);
  });

  it('Deve listar os agendamentos com o transporte dinamico mapeado', async () => {
    const res = await request(app).get('/api/schedules');

    expect(res.statusCode).toEqual(200);
    const newSchedule = res.body.find((schedule) => schedule.cuidadora_id === cuidadoraId);
    expect(newSchedule).toBeDefined();
    expect(newSchedule.valor_transporte).toEqual(10);
  });
});
