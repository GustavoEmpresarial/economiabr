#!/usr/bin/env pwsh
# AutoBlog Redator - Script PowerShell interativo
param(
    [string]$Mode = "menu",
    [int]$Limite = 0,
    [string]$Tema = ""
)

Push-Location $PSScriptRoot

function Show-Menu {
    Clear-Host
    Write-Host "╔════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║     AutoBlog Redator              ║" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "1) Gerar posts do G1 Finanças"
    Write-Host "2) Gerar com tema livre"
    Write-Host "3) Linha de comando personalizada"
    Write-Host "4) Sair"
    Write-Host ""
    Write-Host -NoNewline "Escolha uma opção (1-4): " -ForegroundColor Yellow
}

function Get-G1Posts {
    Write-Host ""
    Write-Host "Quantos posts deseja gerar? (1-10, padrão 3)" -ForegroundColor Yellow
    Write-Host -NoNewline "> "
    $input = Read-Host
    
    $limit = if ([int]::TryParse($input, [ref]$null) -and $input -gt 0 -and $input -le 10) { $input } else { 3 }
    
    Write-Host ""
    Write-Host "Gerando $limit posts do G1 Economia..." -ForegroundColor Green
    Write-Host ""
    
    npm run redator -- --g1-financas --limite $limit
}

function Get-FreeTheme {
    Write-Host ""
    Write-Host "Digite o tema do artigo:" -ForegroundColor Yellow
    Write-Host -NoNewline "> "
    $tema = Read-Host
    
    if ([string]::IsNullOrWhiteSpace($tema)) {
        Write-Host "Erro: tema não pode estar vazio" -ForegroundColor Red
        return
    }
    
    Write-Host ""
    Write-Host "Gerando artigo sobre: '$tema'" -ForegroundColor Green
    Write-Host ""
    
    npm run redator -- --tema $tema
}

function Get-Custom {
    Write-Host ""
    Write-Host "Digite o comando completo (deixe vazio para cancelar):" -ForegroundColor Yellow
    Write-Host "Exemplo: --g1-financas --limite 5" -ForegroundColor Gray
    Write-Host -NoNewline "> "
    $cmd = Read-Host
    
    if ([string]::IsNullOrWhiteSpace($cmd)) {
        Write-Host "Cancelado" -ForegroundColor Yellow
        return
    }
    
    Write-Host ""
    Write-Host "Executando: npm run redator -- $cmd" -ForegroundColor Green
    Write-Host ""
    
    Invoke-Expression "npm run redator -- $cmd"
}

function Pause-Menu {
    Write-Host ""
    Write-Host -NoNewline "Pressione qualquer tecla para continuar..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}

# Modo direto (sem menu)
if ($Mode -eq "menu") {
    while ($true) {
        Show-Menu
        $choice = Read-Host
        
        switch ($choice) {
            "1" { Get-G1Posts; Pause-Menu }
            "2" { Get-FreeTheme; Pause-Menu }
            "3" { Get-Custom; Pause-Menu }
            "4" { Write-Host "Até logo!" -ForegroundColor Cyan; exit }
            default { Write-Host "Opção inválida" -ForegroundColor Red; Pause-Menu }
        }
    }
}
elseif ($Mode -eq "g1" -and $Limite -gt 0) {
    npm run redator -- --g1-financas --limite $Limite
}
elseif ($Mode -eq "tema" -and $Tema -ne "") {
    npm run redator -- --tema $Tema
}

Pop-Location
