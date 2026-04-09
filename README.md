# Cronograma Cuidadoras

Sistema web para gerenciamento de residencias, cuidadoras, plantões, feriados, fechamento financeiro e controle de acesso por perfil.

## Visão Geral

O projeto foi dividido em duas partes:

- `frontend`: interface web em React com Vite
- `backend`: API REST em Node.js com Express e banco PostgreSQL

O objetivo do sistema é centralizar a operação de atendimento residencial, permitindo cadastrar residencias e profissionais, gerar escalas de plantão, visualizar o calendário e acompanhar os custos mensais.

## Funcionalidades

### 1. Gestão de Residências

- Cadastro de residências com nome e endereço
- Definição de valor hora padrão
- Configuração de adicional noturno
- Configuração de adicional de feriado
- Edição e exclusão de residências

### 2. Gestão de Cuidadoras / Prestadores

- Cadastro de prestadores de serviço
- Associação de cada profissional a uma ou mais residências
- Configuração de valor hora específico por profissional
- Configuração de dias disponíveis da semana
- Registro de observações gerais
- Definição de regime CLT / mensalista
- Configuração individual de adicional noturno e adicional de feriado
- Configuração de valor de transporte por residência atendida

### 3. Geração e Controle de Plantões

- Criação de agendamentos em lote
- Geração por dias ímpares
- Geração por dias pares
- Geração por dias específicos do mês
- Tratamento de plantões que atravessam a madrugada
- Edição de plantões individuais
- Exclusão individual ou em lote
- Filtro por mês, residência e cuidadora

### 4. Calendário Operacional

- Visualização mensal dos plantões por residência
- Exibição em linha do tempo por hora
- Identificação visual dos plantões por profissional
- Separação visual de finais de semana
- Destaque para feriados cadastrados
- Modo de visualização restrito por cuidadora via parâmetro na URL

### 5. Fechamento Financeiro

- Cálculo de custo mensal por profissional
- Soma de horas normais
- Soma de horas noturnas
- Aplicação de adicional noturno
- Aplicação de adicional em feriados
- Inclusão do valor de transporte
- Exclusão de profissionais CLT do cálculo financeiro
- Filtro por mês e por residência

### 6. Gestão de Feriados

- Cadastro de feriados com nome e data
- Suporte a feriados anuais recorrentes
- Exclusão de feriados
- Uso dos feriados nos cálculos financeiros e na visualização do calendário

### 7. Controle de Usuários e Perfis

- Login por usuário e senha
- Cadastro de novos usuários
- Edição e exclusão de usuários
- Perfis de acesso diferentes:
- `admin_geral`
- `admin_residencia`
- `usuario_visualizador`
- Restrição de visualização por residência
- Restrição de visualização por cuidadora para usuários visualizadores

## Perfis de Acesso

### Administrador Geral

- Acesso completo ao sistema
- Pode gerenciar usuários, residências, cuidadoras, feriados, plantões e financeiro

### Administrador de Residência

- Acesso às residências permitidas
- Pode gerenciar profissionais e plantões dentro do escopo autorizado

### Usuário Visualizador

- Acesso restrito ao calendário
- Visualização limitada às residências e cuidadoras liberadas para o usuário

## Estrutura do Projeto

```text
CronogramaCuidadoras/
|-- backend/
|   |-- server.js
|   |-- database.js
|   |-- server.test.js
|   `-- package.json
|-- frontend/
|   |-- src/
|   |   |-- App.jsx
|   |   |-- CalendarView.jsx
|   |   |-- FinanceView.jsx
|   |   |-- HolidaysView.jsx
|   |   |-- LoginView.jsx
|   |   `-- UsersView.jsx
|   |-- vite.config.js
|   `-- package.json
|-- .gitignore
`-- README.md
```

## Tecnologias Utilizadas

### Frontend

- React
- Vite
- Axios
- Lucide React

### Backend

- Node.js
- Express
- PostgreSQL
- Neon
- CORS

### Testes

- Jest
- Supertest

## Banco de Dados

O backend agora utiliza PostgreSQL, com compatibilidade preparada para Neon e deploy na Vercel. Em ambiente de teste automatizado, o projeto usa um banco Postgres em memoria para manter os testes rapidos.

As tabelas principais sao criadas automaticamente na inicializacao:

- `residencias`
- `cuidadoras`
- `cuidadora_residencia`
- `agendamentos`
- `feriados`
- `usuarios`

Tambem e criado um usuario administrador padrao quando o banco esta vazio.

## Fluxo Básico de Uso

1. Cadastrar as residências
2. Cadastrar as cuidadoras e vincular às residências
3. Configurar feriados, se necessário
4. Gerar os plantões do mês
5. Acompanhar o calendário operacional
6. Consultar o fechamento financeiro
7. Criar usuários com permissões específicas conforme a operação

## Observações Importantes

- O frontend consome a API do backend via rotas `/api`
- O sistema usa atualização periódica dos dados na interface
- Os cálculos financeiros consideram regras da residência, da cuidadora e dos feriados cadastrados
- Existe suporte a links de acesso restrito para visualização de calendário por cuidadora

## Deploy na Vercel

### O que pode subir na Vercel

O frontend em React + Vite pode ser publicado normalmente na Vercel.

### O que exige atencao

Para o backend funcionar corretamente na Vercel, e necessario configurar uma base PostgreSQL externa, como Neon.

### Backend na Vercel com Neon

O projeto foi preparado para:

- publicar o frontend na Vercel
- publicar o backend na Vercel
- conectar o backend a um banco Neon via `DATABASE_URL`

Arquivo de exemplo do backend:

```env
DATABASE_URL=postgres://user:password@ep-example.us-east-1.aws.neon.tech/neondb?sslmode=require
```

Existe um exemplo em:

- `backend/.env.example`

### Estrategia recomendada

- Publicar o `frontend` na Vercel
- Publicar o `backend` na Vercel
- Configurar `DATABASE_URL` no backend
- Configurar a URL publica do backend na variavel `VITE_API_URL` do frontend

### Variavel de ambiente do frontend

Arquivo de exemplo:

```env
VITE_API_URL=https://seu-backend.exemplo.com/api
```

Existe um exemplo em:

- `frontend/.env.example`

### Como publicar o frontend na Vercel

1. Criar um novo projeto na Vercel
2. Importar este repositório
3. Definir `frontend` como `Root Directory`
4. Confirmar os comandos:
- Build Command: `npm run build`
- Output Directory: `dist`
5. Adicionar a variável `VITE_API_URL`
6. Fazer o deploy

### Como publicar o backend na Vercel

1. Criar um novo projeto na Vercel apontando para `backend`
2. Adicionar a variavel `DATABASE_URL`
3. Fazer o deploy

### Fluxo final de deploy

1. Subir o backend na Vercel com `DATABASE_URL`
2. Copiar a URL publica do backend
3. Subir o frontend na Vercel com `VITE_API_URL`

## Próximas Melhorias Recomendadas

- Fortalecer autenticação e armazenamento de senha
- Implementar autorização também no backend
- Melhorar cobertura de testes
- Separar melhor a lógica de negócio do componente principal do frontend
- Criar documentação operacional para usuários finais
