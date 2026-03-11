#!/usr/bin/env node
/**
 * Redator Automático - Publica N artigos X vezes ao dia
 * 
 * Uso:
 *   node redator/scheduler.js --times 2 --articles 5 --mode g1-financas
 * 
 * Vai rodar 2 vezes: de manhã (5 artigos) e à tarde (5 artigos)
 */

const dotenv = require("dotenv");
const { spawn } = require("child_process");
const path = require("path");

dotenv.config();

function getArgValue(flag, defaultValue) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1 || idx >= process.argv.length - 1) {
    return defaultValue;
  }
  return process.argv[idx + 1];
}

function getArgs() {
  const times = Number(getArgValue("--times", "2"));
  const articles = Number(getArgValue("--articles", "5"));
  const mode = getArgValue("--mode", "g1-financas");
  const delay = Number(getArgValue("--delay", "0"));

  return { times, articles, mode, delay };
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runRedator(iteration, total, articlesPerRun, mode) {
  return new Promise((resolve, reject) => {
    console.log(
      `\n[${new Date().toISOString()}] Execução ${iteration}/${total} - ${articlesPerRun} artigos (${mode})...`
    );

    const args = ["redator/cli.js", `--${mode}`, "--limite", String(articlesPerRun)];
    const child = spawn("node", args, {
      cwd: process.cwd(),
      stdio: "inherit",
    });

    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Redator falhou com código ${code}`));
      } else {
        console.log(`[${new Date().toISOString()}] Execução ${iteration} concluída com sucesso.`);
        resolve();
      }
    });

    child.on("error", (err) => {
      reject(err);
    });
  });
}

async function main() {
  const { times, articles, mode, delay } = getArgs();

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║         REDATOR AUTOMÁTICO - MODO CONTÍNUO                  ║
╚══════════════════════════════════════════════════════════════╝

Configuração:
  • Execuções: ${times}
  • Artigos por execução: ${articles}
  • Modo: ${mode}
  • Atraso inicial: ${delay}ms

Começando...
`);

  if (delay > 0) {
    console.log(`Aguardando ${delay}ms antes de iniciar...`);
    await sleep(delay);
  }

  for (let i = 1; i <= times; i++) {
    try {
      await runRedator(i, times, articles, mode);
    } catch (error) {
      console.error(`Erro na execução ${i}:`, error.message);
      process.exit(1);
    }

    if (i < times) {
      const intervalBetweenRuns = 5 * 60 * 1000; // 5 minutos
      console.log(
        `\nAguardando 5 minutos antes da próxima execução (volta em ${new Date(Date.now() + intervalBetweenRuns).toLocaleTimeString()})...`
      );
      await sleep(intervalBetweenRuns);
    }
  }

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                 CICLO COMPLETADO COM SUCESSO                ║
║          Total: ${times} execuções × ${articles} artigos = ${times * articles} artigos           ║
╚══════════════════════════════════════════════════════════════╝
`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Erro fatal:", err);
  process.exit(1);
});
