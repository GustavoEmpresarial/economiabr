# Redator Automático - PowerShell Script
# Execute 2x ao dia: 08:00 (5 artigos) e 15:00 (5 artigos) = 10 artigos/dia

$ProjectDir = "C:\Users\conta\OneDrive\Documentos\Antigravity\AutoBlog"
$LogFile = "$ProjectDir\redator_logs.txt"
$NumTimes = 2
$Articles = 5

# Timestamp
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

# Log header
"`n[$timestamp] ===============================================" | Add-Content $LogFile
"[$timestamp] Iniciando redator automático - $NumTimes execuções x $Articles artigos" | Add-Content $LogFile

# Trocar diretório
Set-Location $ProjectDir

# Executar N vezes
for ($i = 1; $i -le $NumTimes; $i++) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "[$timestamp] Execução $i de $NumTimes..." | Add-Content $LogFile
    
    # Rodar redator
    & npm run redator -- --g1-financas --limite $Articles 2>&1 | Add-Content $LogFile
    
    # Se não é a última execução, aguardar 5 minutos
    if ($i -lt $NumTimes) {
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        "[$timestamp] Aguardando 5 minutos antes da próxima execução..." | Add-Content $LogFile
        Start-Sleep -Seconds 300
    }
}

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
"[$timestamp] Ciclo concluído! Total: $NumTimes execuções x $Articles artigos = $(${NumTimes}*${Articles}) artigos" | Add-Content $LogFile
