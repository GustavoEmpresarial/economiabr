import './globals.css'
import type { Metadata } from 'next'
import Header from '@/components/Header'

export const metadata: Metadata = {
  title: 'Economia BR | Notícias em Tempo Real',
  description: 'Fique por dentro das últimas notícias da economia brasileira.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body>
        <Header />
        <main>
          {children}
        </main>
        <footer style={{ padding: '4rem 0', borderTop: '1px solid #2a2a2a', marginTop: '4rem', textAlign: 'center', color: '#a0a0a0' }}>
          <div className="container">
            <p>&copy; {new Date().getFullYear()} Economia BR - Portal de Notícias.</p>
          </div>
        </footer>
      </body>
    </html>
  )
}
