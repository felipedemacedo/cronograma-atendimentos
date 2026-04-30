chcp 65001 > nul

@echo off
REM Deploy de produção para CronogramaCuidadoras usando Vercel
REM 1) Instala dependências do backend
REM 2) Instala dependências do frontend
REM 3) Gera build de produção do frontend
REM 4) Faz upload do frontend para Vercel
REM 5) Faz upload do backend para Vercel (como funções serverless, se configurado)

cd /d "%~dp0backend"
if errorlevel 1 (
  echo Erro ao mudar para diretório backend
  goto end
)
echo Diretório alterado para backend.
echo Instalando dependências do backend...
call npm install
if errorlevel 1 (
  echo Erro ao instalar dependências do backend
  goto end
)
echo Dependências do backend instaladas com sucesso.

echo Instalando dependências do frontend...
cd /d "%~dp0frontend"
if errorlevel 1 (
  echo Erro ao mudar para diretório frontend
  goto end
)
echo Diretório alterado para frontend.
call npm install
if errorlevel 1 (
  echo Erro ao instalar dependências do frontend
  goto end
)
echo Dependências do frontend instaladas com sucesso.

echo Construindo frontend para produção...
call npm run build
if errorlevel 1 (
  echo Erro ao construir frontend
  goto end
)
echo Build do frontend concluído.

echo Fazendo upload do frontend para Vercel...
call vercel --prod
if errorlevel 1 (
  echo Erro ao fazer upload do frontend para Vercel
  goto end
)
echo Upload do frontend para Vercel concluído.

echo Fazendo upload do backend para Vercel...
cd /d "%~dp0backend"
if errorlevel 1 (
  echo Erro ao mudar para diretório backend
  goto end
)
echo Diretório alterado para backend.
call vercel --prod
if errorlevel 1 (
  echo Erro ao fazer upload do backend para Vercel
  goto end
)
echo Upload do backend para Vercel concluído.

echo.
echo Deploy para Vercel concluído com sucesso.
goto end

:end
echo.
echo Pressione qualquer tecla para fechar.
pause >nul
