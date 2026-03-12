@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"

if "%1"=="" (
    echo.
    echo === AutoBlog Redator ===
    echo.
    echo Uso:
    echo   redator.bat 3              -- Gera 3 posts do G1 Economia
    echo   redator.bat 5              -- Gera 5 posts do G1 Economia
    echo   redator.bat --tema "texto" -- Gera 1 post com tema livre
    echo.
    echo Exemplo: redator.bat 2
    echo.
    goto :eof
)

if /i "%1"=="--tema" (
    if "%2"=="" (
        echo Erro: tema nao fornecido
        echo Uso: redator.bat --tema "seu tema"
        exit /b 1
    )
    echo.
    echo Gerando artigo com tema: %2
    echo.
    call npm run redator -- --tema %2
) else (
    echo.
    echo Gerando %1 posts do G1 Economia...
    echo.
    call npm run redator -- --g1-financas --limite %1
)

echo.
echo Redator finalizado!
