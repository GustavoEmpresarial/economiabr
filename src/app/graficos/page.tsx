'use client'

import { useState } from 'react'

export default function GraphicsPage() {
    const [searchTerm, setSearchTerm] = useState('')

    return (
        <div className="container graficos-page">
            <header className="page-header" style={{ padding: '3rem 0', textAlign: 'center' }}>
                <h1 style={{ fontSize: '3rem', fontWeight: '900', marginBottom: '1rem' }}>SALA DE GRÁFICOS</h1>
                <p style={{ color: '#a0a0a0', marginBottom: '2rem' }}>Acompanhe os mercados em tempo real com nossas ferramentas interativas.</p>

                <div className="search-box" style={{ maxWidth: '600px', margin: '0 auto', position: 'relative' }}>
                    <input
                        type="text"
                        placeholder="Pesquise por símbolo (ex: PETR4, VALE3, BTCUSD)..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '1.2rem 2rem',
                            borderRadius: '50px',
                            border: '2px solid #2a2a2a',
                            background: '#1a1a1a',
                            color: '#fff',
                            fontSize: '1.2rem',
                            outline: 'none',
                            transition: 'border-color 0.2s'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#c4170c'}
                        onBlur={(e) => e.target.style.borderColor = '#2a2a2a'}
                    />
                </div>
            </header>

            <div className="charts-grid" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))',
                gap: '2rem',
                paddingBottom: '4rem'
            }}>
                {/* TradingView Widget 1 - Main Index */}
                <div className="chart-card" style={{ background: '#121212', borderRadius: '12px', overflow: 'hidden', height: '500px', border: '1px solid #2a2a2a' }}>
                    <iframe
                        src={`https://s.tradingview.com/widgetembed/?frameElementId=tradingview_1&symbol=BMFBOVESPA%3AIBOV&interval=D&hidesidetoolbar=1&symboledit=1&saveimage=1&toolbarbg=f1f3f6&studies=%5B%5D&theme=dark&style=1&timezone=Etc%2FUTC&studies_overrides=%7B%7D&overrides=%7B%7D&enabled_features=%5B%5D&disabled_features=%5B%5D&locale=pt&utm_source=localhost&utm_medium=widget&utm_campaign=chart&utm_term=BMFBOVESPA%3AIBOV`}
                        style={{ width: '100%', height: '100%', border: 'none' }}
                    />
                </div>

                {/* TradingView Widget 2 - Dollar */}
                <div className="chart-card" style={{ background: '#121212', borderRadius: '12px', overflow: 'hidden', height: '500px', border: '1px solid #2a2a2a' }}>
                    <iframe
                        src={`https://s.tradingview.com/widgetembed/?frameElementId=tradingview_2&symbol=FX_IDC%3AUSDBRL&interval=D&hidesidetoolbar=1&symboledit=1&saveimage=1&toolbarbg=f1f3f6&studies=%5B%5D&theme=dark&style=1&timezone=Etc%2FUTC&studies_overrides=%7B%7D&overrides=%7B%7D&enabled_features=%5B%5D&disabled_features=%5B%5D&locale=pt&utm_source=localhost&utm_medium=widget&utm_campaign=chart&utm_term=FX_IDC%3AUSDBRL`}
                        style={{ width: '100%', height: '100%', border: 'none' }}
                    />
                </div>

                {/* TradingView Widget 3 - Petrobras */}
                <div className="chart-card" style={{ background: '#121212', borderRadius: '12px', overflow: 'hidden', height: '500px', border: '1px solid #2a2a2a' }}>
                    <iframe
                        src={`https://s.tradingview.com/widgetembed/?frameElementId=tradingview_3&symbol=BMFBOVESPA%3APETR4&interval=D&hidesidetoolbar=1&symboledit=1&saveimage=1&toolbarbg=f1f3f6&studies=%5B%5D&theme=dark&style=1&timezone=Etc%2FUTC&studies_overrides=%7B%7D&overrides=%7B%7D&enabled_features=%5B%5D&disabled_features=%5B%5D&locale=pt&utm_source=localhost&utm_medium=widget&utm_campaign=chart&utm_term=BMFBOVESPA%3APETR4`}
                        style={{ width: '100%', height: '100%', border: 'none' }}
                    />
                </div>

                {/* TradingView Widget 4 - Bitcoin */}
                <div className="chart-card" style={{ background: '#121212', borderRadius: '12px', overflow: 'hidden', height: '500px', border: '1px solid #2a2a2a' }}>
                    <iframe
                        src={`https://s.tradingview.com/widgetembed/?frameElementId=tradingview_4&symbol=BINANCE%3ABTCUSDT&interval=D&hidesidetoolbar=1&symboledit=1&saveimage=1&toolbarbg=f1f3f6&studies=%5B%5D&theme=dark&style=1&timezone=Etc%2FUTC&studies_overrides=%7B%7D&overrides=%7B%7D&enabled_features=%5B%5D&disabled_features=%5B%5D&locale=pt&utm_source=localhost&utm_medium=widget&utm_campaign=chart&utm_term=BINANCE%3ABTCUSDT`}
                        style={{ width: '100%', height: '100%', border: 'none' }}
                    />
                </div>
            </div>
        </div>
    )
}
