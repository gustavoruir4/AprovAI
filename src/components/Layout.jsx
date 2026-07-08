import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { useTheme } from '../lib/ThemeContext'
import styles from './Layout.module.css'

const ADMIN_EMAIL = 'gustavoruir4@gmail.com'

export default function Layout() {
  const { user, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const nome = user?.user_metadata?.nome || user?.email?.split('@')[0] || 'Aluno'
  const isAdmin = user?.email === ADMIN_EMAIL

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className={styles.wrap}>
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <div className={styles.logo}>
            <span className={styles.logoMark}>
              <i className="ti ti-school" aria-hidden="true"></i>
            </span>
            Estuda<span className={styles.logoAccent}>ENEM</span>
          </div>

          <div className={styles.tabs}>
            <NavLink to="/app/questoes" className={({ isActive }) => isActive ? `${styles.tab} ${styles.active}` : styles.tab}>
              <i className="ti ti-clipboard-list" aria-hidden="true"></i>
              <span>Questões</span>
            </NavLink>
            <NavLink to="/app/simulado" className={({ isActive }) => isActive ? `${styles.tab} ${styles.active}` : styles.tab}>
              <i className="ti ti-clock-play" aria-hidden="true"></i>
              <span>Simulado</span>
            </NavLink>
            <NavLink to="/app/revisao" className={({ isActive }) => isActive ? `${styles.tab} ${styles.active}` : styles.tab}>
              <i className="ti ti-refresh-dot" aria-hidden="true"></i>
              <span>Revisão</span>
            </NavLink>
            <NavLink to="/app/perfil" className={({ isActive }) => isActive ? `${styles.tab} ${styles.active}` : styles.tab}>
              <i className="ti ti-chart-bar" aria-hidden="true"></i>
              <span>Desempenho</span>
            </NavLink>
            <NavLink to="/app/historico" className={({ isActive }) => isActive ? `${styles.tab} ${styles.active}` : styles.tab}>
              <i className="ti ti-history" aria-hidden="true"></i>
              <span>Histórico</span>
            </NavLink>
            {isAdmin && (
              <NavLink to="/app/admin" className={({ isActive }) => isActive ? `${styles.tab} ${styles.active}` : styles.tab}>
                <i className="ti ti-settings" aria-hidden="true"></i>
                <span>Admin</span>
              </NavLink>
            )}
          </div>

          <div className={styles.right}>
            <button
              className={styles.themeBtn}
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
              aria-label="Alternar tema"
            >
              <i className={theme === 'dark' ? 'ti ti-sun' : 'ti ti-moon'} aria-hidden="true"></i>
            </button>
            <div className={styles.user}>
              <span className={styles.avatar}>{nome[0]?.toUpperCase()}</span>
              <span className={styles.userName}>{nome}</span>
            </div>
            <button className={styles.signOut} onClick={handleSignOut} title="Sair">
              <i className="ti ti-logout" aria-hidden="true"></i>
            </button>
          </div>
        </div>
      </nav>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}
