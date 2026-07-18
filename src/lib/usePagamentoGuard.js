import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './supabase'
import { useAuth } from './AuthContext'

const TRIAL_LIMITE = 20

/**
 * Decide se o usuário pode entrar no app.
 * Regra: tem acesso se for PAGO ou se estiver em TRIAL válido (< 20 questões).
 * Expõe também o estado do trial para o app limitar as questões.
 */
export function usePagamentoGuard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)
  const [acesso, setAcesso] = useState({ tipo: null, usadas: 0, restantes: 0 })

  useEffect(() => {
    if (!user) {
      setChecking(false)
      return
    }
    let ativo = true
    setChecking(true)

    async function verificar() {
      // 1) É pago?  (linha em acessos com status pago vinculada ao user_id)
      const { data: pago } = await supabase
        .from('acessos')
        .select('status, user_id')
        .eq('user_id', user.id)
        .eq('status', 'pago')
        .maybeSingle()

      if (!ativo) return

      if (pago) {
        setAcesso({ tipo: 'pago', usadas: 0, restantes: Infinity })
        setChecking(false)
        return
      }

      // 2) Não é pago. Está em trial?
      const { data: trial } = await supabase
        .from('testes_gratis')
        .select('questoes_usadas')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!ativo) return

      if (trial) {
        const usadas = trial.questoes_usadas ?? 0
        const restantes = Math.max(0, TRIAL_LIMITE - usadas)
        setAcesso({ tipo: 'trial', usadas, restantes })
        // Trial pode entrar no app mesmo com 0 restantes: a tela de
        // "esgotado" é mostrada dentro de Questoes, com CTA de compra.
        setChecking(false)
        return
      }

      // 3) Nem pago, nem trial: manda pro pagamento.
      setAcesso({ tipo: null, usadas: 0, restantes: 0 })
      navigate('/pagamento')
      setChecking(false)
    }

    verificar()
    return () => { ativo = false }
    // Depende só do id (não do objeto `user` inteiro): o Supabase troca a
    // referência de `user` a cada refresh de token (inclusive ao voltar de
    // uma aba em segundo plano), e recriar esse efeito nesses casos reabria
    // "checking", desmontando toda a árvore de páginas privadas e zerando
    // o estado local delas (ex.: progresso do quiz em Questoes.jsx).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, navigate])

  return { checking, acesso, TRIAL_LIMITE }
}
