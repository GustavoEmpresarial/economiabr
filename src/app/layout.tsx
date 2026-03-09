import './globals.css'
import type { Metadata } from 'next'
import Header from '@/components/Header'

export const metadata: Metadata = {
  title: 'AutoBlog BR | Notícias em Tempo Real',
  description: 'Portal de notícias com atualização automática em tempo real.',
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
            <p>&copy; {new Date().getFullYear()} AutoBlog BR - Portal de Notícias.</p>
          </div>
        </footer>
      </body>
    </html>
  )
}
