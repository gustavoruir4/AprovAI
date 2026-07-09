import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './supabase'
import { useAuth } from './AuthContext'

export function usePagamentoGuard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    if (!user) {
      setChecking(false)
      return
    }

    let ativo = true
    setChecking(true)

    supabase
      .from('acessos')
      .select('status')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (!ativo) return
        if (!data || data.status !== 'pago') {
          navigate('/pagamento')
        }
        setChecking(false)
      })

    return () => { ativo = false }
  }, [user, navigate])

  return { checking }
}
