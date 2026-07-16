import { useState, useMemo, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { usePagamentoGuard } from '../lib/usePagamentoGuard'
import { supabase } from '../lib/supabase'
import { QUESTIONS, AREAS, PROVAS } from '../lib/questions'
import styles from './Questoes.module.css'

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function capitalizar(texto) {
  if (!texto) return texto
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

function limparTexto(texto) {
  return texto
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*(.+?)\*\*/gs, '$1')
    .replace(/\*(.+?)\*/gs, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/^---+$/gm, '')
    .replace(/^===+$/gm, '')
    .replace(/^\|(.+)\|$/gm, (match, inner) => {
      const cols = inner.split('|').map(c => c.trim()).filter(c => c && !c.match(/^-+$/))
      if (cols.length === 0) return ''
      if (cols.length === 1) return cols[0]
      return '• ' + cols.join(' – ')
    })
    .replace(/^\|[-|:\s]+\|$/gm, '')
    .replace(/^[-–]\s+/gm, '• ')
    .replace(/^>\s*/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function ExplicacaoTexto({ texto, className }) {
  const ref = useRef(null)
  const limpo = limparTexto(texto)

  useEffect(() => {
    if (!ref.current) return
    const tryRender = () => {
      if (window.renderMathInElement) {
        window.renderMathInElement(ref.current, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false },
            { left: '\\(', right: '\\)', display: false },
            { left: '\\[', right: '\\]', display: true },
          ],
          throwOnError: false,
        })
      } else {
        setTimeout(tryRender, 100)
      }
    }
    tryRender()
  }, [limpo])

  const paragrafos = limpo.split('\n\n').filter(p => p.trim())

  return (
    <div className={className} ref={ref}>
      {paragrafos.map((p, i) => {
        const linhas = p.split('\n').filter(l => l.trim())
        if (linhas.length > 1) {
          return (
            <div key={i} style={{ marginBottom: i < paragrafos.length - 1 ? '0.85rem' : 0 }}>
              {linhas.map((linha, j) => (
                <p key={j} style={{ marginBottom: j < linhas.length - 1 ? '0.35rem' : 0 }}>{linha}</p>
              ))}
            </div>
          )
        }
        return (
          <p key={i} style={{ marginBottom: i < paragrafos.length - 1 ? '0.85rem' : 0 }}>{p}</p>
        )
      })}
    </div>
  )
}

async function getExplanation(question) {
  const { data: cached } = await supabase
    .from('explicacoes')
    .select('explicacao')
    .eq('question_id', question.id)
    .single()

  if (cached?.explicacao) return cached.explicacao

  const opcaoCorreta = question.opcoes.find(o => o.letra === question.correta)

  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/explicacao`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        question_id: question.id,
        enunciado: question.enunciado,
        correta: question.correta,
        opcao_correta_texto: opcaoCorreta?.texto || '',
      })
    }
  )

  const data = await res.json()
  const explicacao = data.explicacao || ''

  if (explicacao) {
    await supabase.from('explicacoes').insert({ question_id: question.id, explicacao })
  }

  return explicacao
}

const AREA_ICONS = {
  'Matemática': 'ti-math-symbols',
  'Ciências da Natureza': 'ti-flask',
  'Ciências Humanas': 'ti-books',
  'Linguagens': 'ti-language',
}

export default function Questoes() {
  const { user } = useAuth()
  const { acesso } = usePagamentoGuard()
  const isTrial = acesso.tipo === 'trial'

  const [areaFilter, setAreaFilter] = useState('Todas')
  const [provaFilter, setProvaFilter] = useState('Todas')
  const [qIndex, setQIndex] = useState(0)
  const [selected, setSelected] = useState(null)
  const [answered, setAnswered] = useState(false)
  const [aiText, setAiText] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [respondidas, setRespondidas] = useState(new Set())
  const [finished, setFinished] = useState(false)
  const [sessionStats, setSessionStats] = useState({ acertos: 0, erros: 0 })

  const [trialUsadas, setTrialUsadas] = useState(acesso.usadas || 0)
  const [trialEsgotado, setTrialEsgotado] = useState(false)

  useEffect(() => {
    if (acesso.tipo === 'trial') {
      setTrialUsadas(acesso.usadas || 0)
      if ((acesso.usadas || 0) >= 20) setTrialEsgotado(true)
    }
  }, [acesso.tipo, acesso.usadas])

  const filteredQs = useMemo(() => {
    const qs = QUESTIONS.filter(q =>
      (areaFilter === 'Todas' || q.area === areaFilter) &&
      (provaFilter === 'Todas' || q.prova === provaFilter)
    )
    return shuffle(qs)
  }, [areaFilter, provaFilter])

  const q = filteredQs[qIndex] || null
  const total = filteredQs.length
  const feitas = respondidas.size

  async function handleAnswer() {
    if (!selected || !q) return

    if (isTrial) {
      if (trialEsgotado || trialUsadas >= 20) {
        setTrialEsgotado(true)
        return
      }
      const { data: novoTotal, error } = await supabase.rpc('usar_questao_trial')
      if (!error && typeof novoTotal === 'number') {
        setTrialUsadas(novoTotal)
        if (novoTotal >= 20) {
          setTrialEsgotado(true)
        }
      }
    }

    const isCorrect = selected === q.correta
    setAnswered(true)
    setRespondidas(prev => new Set([...prev, q.id]))
    setSessionStats(prev => ({
      acertos: prev.acertos + (isCorrect ? 1 : 0),
      erros: prev.erros + (isCorrect ? 0 : 1),
    }))

    if (user) {
      await supabase.from('respostas').insert({
        user_id: user.id,
        question_id: q.id,
        area: q.area,
        assunto: q.assunto,
        prova: q.prova,
        ano: q.ano,
        correta: isCorrect,
        resposta_dada: selected,
      })
    }

    setAiLoading(true)
    try {
      const text = await getExplanation(q)
      setAiText(text || 'Não foi possível gerar a explicação.')
    } catch {
      setAiText('Não foi possível gerar a explicação. Tente novamente.')
    }
    setAiLoading(false)
  }

  function nextQuestion() {
    if (isTrial && trialUsadas >= 20) {
      setTrialEsgotado(true)
      return
    }

    const novasRespondidas = new Set([...respondidas, q.id])
    const proxIndex = filteredQs.findIndex(x => !novasRespondidas.has(x.id))

    setSelected(null)
    setAnswered(false)
    setAiText('')
    setAiLoading(false)

    if (proxIndex === -1) {
      setFinished(true)
      return
    }
    setQIndex(proxIndex)
  }

  function resetSession() {
    setRespondidas(new Set())
    setQIndex(0)
    setSelected(null)
    setAnswered(false)
    setAiText('')
    setFinished(false)
    setSessionStats({ acertos: 0, erros: 0 })
  }

  function handleFilterArea(a) {
    setAreaFilter(a)
    resetSession()
  }

  function handleFilterProva(p) {
    setProvaFilter(p)
    resetSession()
  }

  if (isTrial && trialEsgotado && !answered) {
    return (
      <div className={styles.finishWrap}>
        <div className={styles.finishCard}>
          <div className={styles.finishIcon}>
            <i className="ti ti-lock" aria-hidden="true"></i>
          </div>
          <h2 className={styles.finishTitle}>Você usou suas 20 questões grátis!</h2>
          <p className={styles.finishSub}>
            Esperamos que tenha gostado. Para continuar estudando sem limites,
            garanta o acesso vitalício.
          </p>

          <div className={styles.finishStats}>
            <div className={styles.finishStat}>
              <div className={styles.finishStatValue} style={{ color: 'var(--purple-bright)' }}>∞</div>
              <div className={styles.finishStatLabel}>Questões</div>
            </div>
            <div className={styles.finishDivider}></div>
            <div className={styles.finishStat}>
              <div className={styles.finishStatValue} style={{ color: 'var(--green-text)' }}>R$39,90</div>
              <div className={styles.finishStatLabel}>Uma vez só</div>
            </div>
            <div className={styles.finishDivider}></div>
            <div className={styles.finishStat}>
              <div className={styles.finishStatValue} style={{ color: 'var(--purple-bright)' }}>IA</div>
              <div className={styles.finishStatLabel}>Ilimitada</div>
            </div>
          </div>

          <p className={styles.finishMsg}>Acesso vitalício, sem mensalidade. Passou ou não passou, o app continua seu.</p>

          <Link to="/pagamento" className={styles.btnPrimary}>
            <i className="ti ti-rocket" aria-hidden="true"></i> Garantir acesso vitalício
          </Link>
        </div>
      </div>
    )
  }

  if (finished) {
    const pct = total > 0 ? Math.round((sessionStats.acertos / total) * 100) : 0
    return (
      <div className={styles.finishWrap}>
        <div className={styles.finishCard}>
          <div className={styles.finishIcon}>
            <i className="ti ti-confetti" aria-hidden="true"></i>
          </div>
          <h2 className={styles.finishTitle}>Você completou todas as questões!</h2>
          <p className={styles.finishSub}>Veja seu desempenho nessa rodada</p>

          <div className={styles.finishStats}>
            <div className={styles.finishStat}>
              <div className={styles.finishStatValue} style={{ color: 'var(--green-text)' }}>{sessionStats.acertos}</div>
              <div className={styles.finishStatLabel}>Acertos</div>
            </div>
            <div className={styles.finishDivider}></div>
            <div className={styles.finishStat}>
              <div className={styles.finishStatValue} style={{ color: 'var(--red-text)' }}>{sessionStats.erros}</div>
              <div className={styles.finishStatLabel}>Erros</div>
            </div>
            <div className={styles.finishDivider}></div>
            <div className={styles.finishStat}>
              <div className={styles.finishStatValue} style={{ color: 'var(--purple-bright)' }}>{pct}%</div>
              <div className={styles.finishStatLabel}>Aproveitamento</div>
            </div>
          </div>

          {pct >= 70 && <p className={styles.finishMsg}>Excelente desempenho! Continue assim 🚀</p>}
          {pct >= 50 && pct < 70 && <p className={styles.finishMsg}>Bom resultado! Revise os temas que errou 📚</p>}
          {pct < 50 && <p className={styles.finishMsg}>Não desanime! Revise os conteúdos e tente de novo 💪</p>}

          <button className={styles.btnPrimary} onClick={resetSession}>
            <i className="ti ti-refresh" aria-hidden="true"></i> Reiniciar questões
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      {isTrial && (
        <div className={styles.trialBanner}>
          <i className="ti ti-gift" aria-hidden="true"></i>
          <span>
            Teste grátis: <strong>{Math.max(0, 20 - trialUsadas)}</strong> de 20 questões restantes
          </span>
          <Link to="/pagamento" className={styles.trialUpgrade}>Liberar tudo por R$39,90</Link>
        </div>
      )}

      <div className={styles.filtersBlock}>
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Área</span>
          <div className={styles.pills}>
            {AREAS.map(a => (
              <button
                key={a}
                className={`${styles.pill} ${areaFilter === a ? styles.pillActive : ''}`}
                onClick={() => handleFilterArea(a)}
              >
                {a}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Prova</span>
          <div className={styles.pills}>
            {PROVAS.map(p => (
              <button
                key={p}
                className={`${styles.pill} ${provaFilter === p ? styles.pillActive : ''}`}
                onClick={() => handleFilterProva(p)}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {total > 0 && (
        <div className={styles.progressWrap}>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${(feitas / total) * 100}%` }}></div>
          </div>
          <span className={styles.progressText}>
            <strong>{feitas}</strong> de {total} respondidas
          </span>
        </div>
      )}

      {!q ? (
        <div className={styles.empty}>
          <i className="ti ti-mood-empty" aria-hidden="true"></i>
          <p>Nenhuma questão encontrada com esses filtros.</p>
        </div>
      ) : (
        <div className={styles.card}>
          <div className={styles.meta}>
            <span className={`${styles.badge} ${styles.badgeProva}`}>
              <i className="ti ti-calendar" aria-hidden="true"></i> {q.prova} {q.ano}
            </span>
            <span className={styles.badgeArea} data-area={q.area}>
              <i className={`ti ${AREA_ICONS[q.area] || 'ti-book'}`} aria-hidden="true"></i> {q.area}
            </span>
            <span className={styles.badgeAssunto}>{q.assunto}</span>
          </div>

          <p className={styles.enunciado}>{capitalizar(q.enunciado)}</p>

          <div className={styles.options}>
            {q.opcoes.map(op => {
              let cls = styles.option
              if (answered) {
                if (op.letra === q.correta) cls += ` ${styles.optionCorrect}`
                else if (op.letra === selected) cls += ` ${styles.optionWrong}`
              } else if (op.letra === selected) {
                cls += ` ${styles.optionSelected}`
              }
              return (
                <button
                  key={op.letra}
                  className={cls}
                  onClick={() => !answered && setSelected(op.letra)}
                  disabled={answered}
                >
                  <span className={styles.letra}>{op.letra}</span>
                  <span className={styles.opText}>{capitalizar(op.texto)}</span>
                  {answered && op.letra === q.correta && (
                    <i className={`ti ti-check ${styles.opIcon}`} style={{ color: 'var(--green-text)' }} aria-hidden="true"></i>
                  )}
                  {answered && op.letra === selected && op.letra !== q.correta && (
                    <i className={`ti ti-x ${styles.opIcon}`} style={{ color: 'var(--red-text)' }} aria-hidden="true"></i>
                  )}
                </button>
              )
            })}
          </div>

          {answered && (
            <div className={styles.explicacaoBox}>
              <div className={styles.explicacaoHeader}>
                <i className="ti ti-sparkles" aria-hidden="true"></i>
                <span>Explicação da IA</span>
                {selected === q.correta ? (
                  <span className={`${styles.resultTag} ${styles.resultOk}`}>
                    <i className="ti ti-circle-check" aria-hidden="true"></i> Você acertou
                  </span>
                ) : (
                  <span className={`${styles.resultTag} ${styles.resultErr}`}>
                    <i className="ti ti-circle-x" aria-hidden="true"></i> Você errou
                  </span>
                )}
              </div>
              {aiLoading ? (
                <div className={styles.dots}>
                  Carregando explicação<span>.</span><span>.</span><span>.</span>
                </div>
              ) : (
                <ExplicacaoTexto texto={aiText} className={styles.aiText} />
              )}
            </div>
          )}

          <div className={styles.actions}>
            {!answered ? (
              <button className={styles.btnPrimary} onClick={handleAnswer} disabled={!selected}>
                Confirmar resposta
              </button>
            ) : (
              <button className={styles.btnPrimary} onClick={nextQuestion}>
                {isTrial && trialUsadas >= 20 ? (
                  <>Ver planos <i className="ti ti-arrow-right" aria-hidden="true"></i></>
                ) : (
                  <>Próxima questão <i className="ti ti-arrow-right" aria-hidden="true"></i></>
                )}
              </button>
            )}
            <span className={styles.counter}>{feitas} / {total}</span>
          </div>
        </div>
      )}
    </div>
  )
}