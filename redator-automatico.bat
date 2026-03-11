@echo off
REM Redator Automático - Windows Batch Script
REM Executa redator N vezes ao dia (ex: 2 vezes com 5 artigos = 10/dia)

setlocal enabledelayedexpansion

REM Configurações
set PROJECT_DIR=C:\Users\conta\OneDrive\Documentos\Antigravity\AutoBlog
set LOG_FILE=%PROJECT_DIR%\redator_logs.txt
set TIMES=2
set ARTICLES=5

REM Timestamp
for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set mydate=%%c-%%a-%%b)
for /f "tokens=1-2 delims=/:" %%a in ('time /t') do (set mytime=%%a:%%b)
set timestamp=%mydate% %mytime%

echo.
echo [%timestamp%] Iniciando redator automatico - %TIMES% x %ARTICLES% artigos
echo. >> %LOG_FILE%
echo [%timestamp%] =============================================== >> %LOG_FILE%
echo [%timestamp%] Iniciando redator automatico >> %LOG_FILE%

cd /d %PROJECT_DIR%

REM Executa N vezes
for /L %%i in (1,1,%TIMES%) do (
    for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set mydate=%%c-%%a-%%b)
    for /f "tokens=1-2 delims=/:" %%a in ('time /t') do (set mytime=%%a:%%b)
    set timestamp=!mydate! !mytime!
    
    echo [!timestamp!] Execucao %%i de %TIMES%... >> %LOG_FILE%
    call npm run redator -- --g1-financas --limite %ARTICLES% >> %LOG_FILE% 2>&1
    
    REM Se nao e a ultima, aguarda 5 minutos
    if not %%i==%TIMES% (
        echo [!timestamp!] Aguardando 5 minutos antes da proxima... >> %LOG_FILE%
        timeout /t 300 /nobreak
    )
)

for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set mydate=%%c-%%a-%%b)
for /f "tokens=1-2 delims=/:" %%a in ('time /t') do (set mytime=%%a:%%b)
set timestamp=%mydate% %mytime%

echo [%timestamp%] Ciclo concluido! Total: %TIMES% execucoes com %ARTICLES% artigos cada >> %LOG_FILE%
echo [%timestamp%] Concluido! >> %LOG_FILE%

endlocal
