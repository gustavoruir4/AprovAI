import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../lib/AuthContext'
import { useTheme } from '../lib/ThemeContext'
import styles from './Layout.module.css'

const ADMIN_EMAIL = 'gustavoruir4@gmail.com'

const NAV_PRIMARY = [
  { to: '/app/questoes', icon: 'ti-clipboard-list', label: 'Questões' },
  { to: '/app/simulado', icon: 'ti-clock-play', label: 'Simulado' },
  { to: '/app/revisao', icon: 'ti-refresh-dot', label: 'Revisão' },
  { to: '/app/perfil', icon: 'ti-chart-bar', label: 'Desempenho' },
]

export default function Layout() {
  const { user, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  const nome = user?.user_metadata?.nome || user?.email?.split('@')[0] || 'Aluno'
  const isAdmin = user?.email === ADMIN_EMAIL

  const [menuOpen, setMenuOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const menuRef = useRef(null)

  // fecha o dropdown do usuário ao clicar fora
  useEffect(() => {
    function onClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  const navClass = ({ isActive }) =>
    isActive ? `${styles.navItem} ${styles.active}` : styles.navItem

  return (
    <div className={styles.wrap}>
      {/* backdrop do menu mobile */}
      {mobileOpen && <div className={styles.backdrop} onClick={() => setMobileOpen(false)} />}

      <aside className={`${styles.sidebar} ${mobileOpen ? styles.sidebarOpen : ''}`}>
        <Link to="/app/questoes" className={styles.logo} onClick={() => setMobileOpen(false)}>
          <span className={styles.logoMark}>
            <i className="ti ti-school" aria-hidden="true"></i>
          </span>
          <span className={styles.logoText}>
            <span className={styles.logoAprov}>Aprov</span><span className={styles.logoAI}>AI</span>
          </span>
        </Link>

        <nav className={styles.nav}>
          {NAV_PRIMARY.map((item) => (
            <NavLink key={item.to} to={item.to} className={navClass} onClick={() => setMobileOpen(false)}>
              <i className={`ti ${item.icon}`} aria-hidden="true"></i>
              <span>{item.label}</span>
            </NavLink>
          ))}

          <div className={styles.navDivider} />

          <NavLink to="/app/historico" className={navClass} onClick={() => setMobileOpen(false)}>
            <i className="ti ti-history" aria-hidden="true"></i>
            <span>Histórico</span>
          </NavLink>
          {isAdmin && (
            <NavLink to="/app/admin" className={navClass} onClick={() => setMobileOpen(false)}>
              <i className="ti ti-settings" aria-hidden="true"></i>
              <span>Admin</span>
            </NavLink>
          )}
        </nav>

        {/* rodapé da sidebar: tema + usuário */}
        <div className={styles.sidebarFooter}>
          <button
            className={styles.themeBtn}
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
            aria-label="Alternar tema"
          >
            <i className={theme === 'dark' ? 'ti ti-sun' : 'ti ti-moon'} aria-hidden="true"></i>
            <span>{theme === 'dark' ? 'Modo claro' : 'Modo escuro'}</span>
          </button>

          <div className={styles.userWrap} ref={menuRef}>
            <button className={styles.user} onClick={() => setMenuOpen((v) => !v)}>
              <span className={styles.avatar}>{nome[0]?.toUpperCase()}</span>
              <span className={styles.userName}>{nome}</span>
              <i className="ti ti-chevron-up" aria-hidden="true" style={{ marginLeft: 'auto', fontSize: 15, transform: menuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}></i>
            </button>
            {menuOpen && (
              <div className={styles.userMenu}>
                <button className={styles.userMenuItem} onClick={handleSignOut}>
                  <i className="ti ti-logout" aria-hidden="true"></i> Sair
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* topbar mobile (só aparece no celular) */}
      <header className={styles.mobileBar}>
        <button className={styles.hamburger} onClick={() => setMobileOpen(true)} aria-label="Abrir menu">
          <i className="ti ti-menu-2" aria-hidden="true"></i>
        </button>
        <Link to="/app/questoes" className={styles.mobileLogo}>
          <span className={styles.logoAprov}>Aprov</span><span className={styles.logoAI}>AI</span>
        </Link>
        <span className={styles.avatar}>{nome[0]?.toUpperCase()}</span>
      </header>

      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}