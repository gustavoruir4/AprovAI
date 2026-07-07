import { useState, useMemo, useEffect, useRef } from 'react'
import { useAuth } from '../lib/AuthContext'
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

function limparTexto(texto) {
  return texto
    // Remove títulos markdown
    .replace(/#{1,6}\s+/g, '')
    // Remove negrito e itálico
    .replace(/\*\*(.+?)\*\*/gs, '$1')
    .replace(/\*(.+?)\*/gs, '$1')
    // Remove código inline
    .replace(/`(.+?)`/g, '$1')
    // Remove linhas de separação
    .replace(/^---+$/gm, '')
    .replace(/^===+$/gm, '')
    // Converte linhas de tabela com | em bullets
    .replace(/^\|(.+)\|$/gm, (match, inner) => {
      const cols = inner.split('|').map(c => c.trim()).filter(c => c && !c.match(/^-+$/))
      if (cols.length === 0) return ''
      if (cols.length === 1) return cols[0]
      return '• ' + cols.join(' – ')
    })
    // Remove linhas separadoras de tabela
    .replace(/^\|[-|:\s]+\|$/gm, '')
    // Converte - item em • item
    .replace(/^[-–]\s+/gm, '• ')
    // Remove > citações
    .replace(/^>\s*/gm, '')
    // Remove linhas em branco excessivas
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
            { left: '\(', right: '\)', display: false },
            { left: '\[', right: '\]', display: true },
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

export default function Questoes() {
  const { user } = useAuth()
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
    setQIndex(0)
    setSelected(null)
    setAnswered(false)
    setAiText('')
    setFinished(false)
    setRespondidas(new Set())
    setSessionStats({ acertos: 0, erros: 0 })
  }

  function handleFilterProva(p) {
    setProvaFilter(p)
    setQIndex(0)
    setSelected(null)
    setAnswered(false)
    setAiText('')
    setFinished(false)
    setRespondidas(new Set())
    setSessionStats({ acertos: 0, erros: 0 })
  }

  if (finished) {
    const pct = total > 0 ? Math.round((sessionStats.acertos / total) * 100) : 0
    return (
      <div>
        <div className={styles.finishCard}>
          <div className={styles.finishIcon}>🎉</div>
          <h2 className={styles.finishTitle}>Você completou todas as questões!</h2>
          <p className={styles.finishSub}>Veja seu desempenho nessa rodada:</p>
          <div className={styles.finishStats}>
            <div className={styles.finishStat}>
              <div className={styles.finishStatValue} style={{color:'#1D9E75'}}>{sessionStats.acertos}</div>
              <div className={styles.finishStatLabel}>Acertos</div>
            </div>
            <div className={styles.finishStat}>
              <div className={styles.finishStatValue} style={{color:'#E24B4A'}}>{sessionStats.erros}</div>
              <div className={styles.finishStatLabel}>Erros</div>
            </div>
            <div className={styles.finishStat}>
              <div className={styles.finishStatValue} style={{color: pct >= 60 ? '#1D9E75' : '#E24B4A'}}>{pct}%</div>
              <div className={styles.finishStatLabel}>Aproveitamento</div>
            </div>
          </div>
          {pct >= 70 && <p className={styles.finishMsg}>Excelente desempenho! Continue assim! 🚀</p>}
          {pct >= 50 && pct < 70 && <p className={styles.finishMsg}>Bom resultado! Revise os temas que errou. 📚</p>}
          {pct < 50 && <p className={styles.finishMsg}>Não desanime! Revise os conteúdos e tente novamente. 💪</p>}
          <button className={styles.btn} onClick={resetSession}>Reiniciar questões</button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className={styles.filters}>
        {AREAS.map(a => (
          <button key={a} className={`${styles.pill} ${areaFilter === a ? styles.pillActive : ''}`} onClick={() => handleFilterArea(a)}>{a}</button>
        ))}
      </div>
      <div className={styles.filters} style={{ marginTop: '8px' }}>
        {PROVAS.map(p => (
          <button key={p} className={`${styles.pill} ${provaFilter === p ? styles.pillActive : ''}`} onClick={() => handleFilterProva(p)}>{p}</button>
        ))}
      </div>

      {total > 0 && (
        <div className={styles.progressWrap}>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{width: `${(feitas/total)*100}%`}}></div>
          </div>
          <span className={styles.progressText}>{feitas} de {total} questões respondidas</span>
        </div>
      )}

      {!q ? (
        <div className={styles.empty}>
          <i className="ti ti-mood-empty" style={{fontSize:'2.5rem',color:'#d1d5db'}} aria-hidden="true"></i>
          <p>Nenhuma questão encontrada com esses filtros.</p>
        </div>
      ) : (
        <div className={styles.card}>
          <div className={styles.meta}>
            <span className={`${styles.badge} ${styles.badgeBlue}`}>{q.prova} {q.ano}</span>
            <span className={`${styles.badge} ${styles.badgeGray}`}>{q.area}</span>
            <span className={`${styles.badge} ${styles.badgeGreen}`}>{q.assunto}</span>
          </div>

          <p className={styles.enunciado}>{q.enunciado}</p>

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
                <button key={op.letra} className={cls} onClick={() => !answered && setSelected(op.letra)} disabled={answered}>
                  <span className={styles.letra}>{op.letra}</span>
                  <span>{op.texto}</span>
                  {answered && op.letra === q.correta && <i className="ti ti-check" style={{marginLeft:'auto',color:'#1D9E75'}} aria-hidden="true"></i>}
                  {answered && op.letra === selected && op.letra !== q.correta && <i className="ti ti-x" style={{marginLeft:'auto',color:'#E24B4A'}} aria-hidden="true"></i>}
                </button>
              )
            })}
          </div>

          {answered && (
            <>
              {selected === q.correta && (
                <div className={styles.successBanner}>
                  <i className="ti ti-circle-check" aria-hidden="true"></i> Correto! Boa resposta.
                </div>
              )}
              <div className={selected === q.correta ? styles.aiBoxGreen : styles.aiBox}>
                <div className={styles.aiHeader}>
                  <i className="ti ti-sparkles" aria-hidden="true"></i> Explicação da IA
                </div>
                {aiLoading ? (
                  <div className={styles.dots}>
                    Carregando explicação<span>.</span><span>.</span><span>.</span>
                  </div>
                ) : (
                  <ExplicacaoTexto texto={aiText} className={styles.aiText} />
                )}
              </div>
            </>
          )}

          <div className={styles.actions}>
            {!answered ? (
              <button className={styles.btn} onClick={handleAnswer} disabled={!selected}>Confirmar resposta</button>
            ) : (
              <button className={styles.btn} onClick={nextQuestion}>Próxima questão →</button>
            )}
            <span className={styles.counter}>{feitas} / {total}</span>
          </div>
        </div>
      )}
    </div>
  )
}
