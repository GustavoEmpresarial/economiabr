'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function Header() {
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const [isSearchOpen, setIsSearchOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')

    // Close menus on escape key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsMenuOpen(false)
                setIsSearchOpen(false)
            }
        }
        window.addEventListener('keydown', handleEsc)
        return () => window.removeEventListener('keydown', handleEsc)
    }, [])

    // Prevent scrolling when menu is open
    useEffect(() => {
        if (isMenuOpen || isSearchOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = 'unset'
        }
    }, [isMenuOpen, isSearchOpen])

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        if (searchQuery.trim()) {
            // In a real app, logic to redirect to search results
            window.location.href = `/search?q=${encodeURIComponent(searchQuery)}`
            setIsSearchOpen(false)
        }
    }

    return (
        <>
            <header className="top-header">
                <div className="container header-content">
                    <div className="menu-trigger" onClick={() => setIsMenuOpen(true)}>
                        <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <path d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                        MENU
                    </div>

                    <div className="nav-links">
                        <Link href="/">ECONOMIA BR</Link>
                        <Link href="#" style={{ color: '#0081c2' }}>TECNOLOGIA</Link>
                        <Link href="/graficos" style={{ color: '#1b854a' }}>GRÁFICOS</Link>
                    </div>

                    <Link href="/" className="logo-container">ECONOMIA BR</Link>

                    <div className="search-icon-container" onClick={() => setIsSearchOpen(true)}>
                        <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <circle cx="11" cy="11" r="8" />
                            <path d="m21 21-4.3-4.3" />
                        </svg>
                    </div>
                </div>
            </header>

            {/* Sidebar Menu Drawer */}
            <div className={`sidebar-overlay ${isMenuOpen ? 'active' : ''}`} onClick={() => setIsMenuOpen(false)}>
                <div className={`sidebar-drawer ${isMenuOpen ? 'active' : ''}`} onClick={(e) => e.stopPropagation()}>
                    <div className="sidebar-header">
                        <span className="sidebar-logo">ECONOMIA BR</span>
                        <button className="close-btn" onClick={() => setIsMenuOpen(false)}>&times;</button>
                    </div>
                    <nav className="sidebar-nav">
                        <Link href="/" onClick={() => setIsMenuOpen(false)}>Home</Link>
                        <Link href="#" onClick={() => setIsMenuOpen(false)}>Economia</Link>
                        <Link href="#" onClick={() => setIsMenuOpen(false)}>Tecnologia</Link>
                        <Link href="/graficos" onClick={() => setIsMenuOpen(false)}>Gráficos</Link>
                        <Link href="#" onClick={() => setIsMenuOpen(false)}>Política</Link>
                        <Link href="#" onClick={() => setIsMenuOpen(false)}>Mundo</Link>
                    </nav>
                </div>
            </div>

            {/* Search Overlay */}
            <div className={`search-overlay ${isSearchOpen ? 'active' : ''}`} onClick={() => setIsSearchOpen(false)}>
                <div className="search-container" onClick={(e) => e.stopPropagation()}>
                    <form onSubmit={handleSearch} className="search-form">
                        <input
                            type="text"
                            placeholder="O que você está procurando?"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            autoFocus={isSearchOpen}
                        />
                        <button type="submit" className="search-submit">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                <circle cx="11" cy="11" r="8" />
                                <path d="m21 21-4.3-4.3" />
                            </svg>
                        </button>
                    </form>
                    <button className="search-close" onClick={() => setIsSearchOpen(false)}>FECHAR &times;</button>
                </div>
            </div>
        </>
    )
}
