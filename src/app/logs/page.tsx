import { db } from '@/lib/db'
import styles from './page.module.css'

interface Log {
    id: string
    level: string
    message: string
    botName: string
    createdAt: string
}

function formatDate(dateString: string) {
    return new Date(dateString).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    })
}

export const dynamic = 'force-dynamic'

export default async function LogsPage() {
    const logs = db.prepare(`
        SELECT * FROM "Log" 
        ORDER BY createdAt DESC 
        LIMIT 100
    `).all() as Log[]

    return (
        <main>
            <div className={styles.container}>
                <div className={styles.header}>
                    <h1 className={styles.title}>🤖 Bot Logs</h1>
                    <span className={styles.liveIndicator}>
                        <span className={styles.pulse}></span>
                        Live
                    </span>
                </div>

                <div className={styles.logsBoard}>
                    <div className={styles.logsHeader}>
                        <span>Bot</span>
                        <span>Nível</span>
                        <span>Mensagem</span>
                        <span>Horário</span>
                    </div>

                    <div className={styles.logList}>
                        {logs.length === 0 ? (
                            <p className={styles.emptyState}>
                                Nenhum log ainda. O bot ainda não enviou nenhuma mensagem.
                            </p>
                        ) : (
                            logs.map((log) => (
                                <div key={log.id} className={styles.logRow}>
                                    <span className={styles.botName}>{log.botName}</span>
                                    <span className={`${styles.level} ${styles[`level${log.level}`]}`}>
                                        {log.level}
                                    </span>
                                    <span className={styles.message}>{log.message}</span>
                                    <span className={styles.timestamp}>{formatDate(log.createdAt)}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </main>
    )
}
