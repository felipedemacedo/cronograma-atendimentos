# Cronograma Cuidadoras

Sistema web para gerenciamento de residencias, cuidadoras, plantões, feriados, fechamento financeiro e controle de acesso por perfil.

## Visão Geral

O projeto foi dividido em duas partes:

- `frontend`: interface web em React com Vite
- `backend`: API REST em Node.js com Express e banco SQLite

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
- SQLite
- CORS

### Testes

- Jest
- Supertest

## Banco de Dados

O sistema utiliza SQLite e cria automaticamente as tabelas principais na inicialização:

- `residencias`
- `cuidadoras`
- `cuidadora_residencia`
- `agendamentos`
- `feriados`
- `usuarios`

Também é criado um usuário administrador padrão quando o banco está vazio.

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

## Próximas Melhorias Recomendadas

- Fortalecer autenticação e armazenamento de senha
- Implementar autorização também no backend
- Melhorar cobertura de testes
- Separar melhor a lógica de negócio do componente principal do frontend
- Criar documentação operacional para usuários finais
