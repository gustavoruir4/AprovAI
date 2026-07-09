import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/AuthContext'
import { usePagamentoGuard } from './lib/usePagamentoGuard'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Pagamento from './pages/Pagamento'
import PagamentoErro from './pages/PagamentoErro'
import Ativar from './pages/Ativar'
import Questoes from './pages/Questoes'
import Simulado from './pages/Simulado'
import Revisao from './pages/Revisao'
import Perfil from './pages/Perfil'
import Historico from './pages/Historico'
import Admin from './pages/Admin'
import Layout from './components/Layout'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  const { checking } = usePagamentoGuard()
  if (loading || (user && checking)) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', color:'#6b7280', fontSize:'14px' }}>Carregando...</div>
  return user ? children : <Navigate to="/login" />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/pagamento" element={<Pagamento />} />
      <Route path="/pagamento/erro" element={<PagamentoErro />} />
      <Route path="/ativar" element={<Ativar />} />
      <Route path="/app" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Navigate to="/app/questoes" />} />
        <Route path="questoes" element={<Questoes />} />
        <Route path="simulado" element={<Simulado />} />
        <Route path="revisao" element={<Revisao />} />
        <Route path="perfil" element={<Perfil />} />
        <Route path="historico" element={<Historico />} />
        <Route path="admin" element={<Admin />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
