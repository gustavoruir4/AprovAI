import { useState, useEffect, useMemo, useRef } from 'react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'
import { QUESTIONS, AREAS, PROVAS } from '../lib/questions'
import styles from './Simulado.module.css'

const NUM_OPCOES = [10, 20, 45, 90]
const TEMPO_OPCOES = [15, 30, 60, 120]
const AREA_ORDER = ['Matemática', 'Ciências da Natureza', 'Ciências Humanas', 'Linguagens']

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function formatTime(totalSeconds) {
  const s = Math.max(0, totalSeconds)
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
}

const AREA_ICONS = {
  'Matemática': 'ti-math-symbols',
  'Ciências da Natureza': 'ti-flask',
  'Ciências Humanas': 'ti-books',
  'Linguagens': 'ti-language',
}

export default function Simulado() {
  const { user } = useAuth()
  const [areaFilter, setAreaFilter] = useState('Todas')
  const [provaFilter, setProvaFilter] = useState('Todas')
  const [numQuestoes, setNumQuestoes] = useState(20)
  const [tempoMin, setTempoMin] = useState(30)

  const [stage, setStage] = useState('setup') // setup | running | finished
  const [questoes, setQuestoes] = useState([])
  const [qIndex, setQIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [remaining, setRemaining] = useState(0)
  const [result, setResult] = useState(null)
  const timerRef = useRef(null)
  const finalizeRef = useRef(null)

  const q = questoes[qIndex] || null
  const total = questoes.length

  useEffect(() => {
    return () => clearInterval(timerRef.current)
  }, [])

  function startSimulado() {
    const pool = QUESTIONS.filter(q =>
      (areaFilter === 'Todas' || q.area === areaFilter) &&
      (provaFilter === 'Todas' || q.prova === provaFilter)
    )
    const selecionadas = shuffle(pool).slice(0, numQuestoes)
    setQuestoes(selecionadas)
    setAnswers({})
    setQIndex(0)
    setResult(null)
    setRemaining(tempoMin * 60)
    setStage('running')

    clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          finalizeRef.current?.()
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  function selectAnswer(letra) {
    if (!q) return
    setAnswers(prev => ({ ...prev, [q.id]: letra }))
  }

  function goTo(index) {
    setQIndex(index)
  }

  async function finalizeSimulado() {
    clearInterval(timerRef.current)

    const tempoUsado = tempoMin * 60 - remaining
    let acertos = 0, erros = 0, brancos = 0
    const byArea = {}
    const rowsToInsert = []

    questoes.forEach(item => {
      const resposta = answers[item.id]
      if (!byArea[item.area]) byArea[item.area] = { c: 0, t: 0 }
      byArea[item.area].t++

      if (!resposta) {
        brancos++
        return
      }
      const isCorrect = resposta === item.correta
      if (isCorrect) { acertos++; byArea[item.area].c++ }
      else erros++

      rowsToInsert.push({
        user_id: user?.id,
        question_id: item.id,
        area: item.area,
        assunto: item.assunto,
        prova: item.prova,
        ano: item.ano,
        correta: isCorrect,
        resposta_dada: resposta,
      })
    })

    if (user && rowsToInsert.length > 0) {
      await supabase.from('respostas').insert(rowsToInsert)
    }

    setResult({ acertos, erros, brancos, tempoUsado, byArea })
    setStage('finished')
  }

  finalizeRef.current = finalizeSimulado

  function novoSimulado() {
    setStage('setup')
    setQuestoes([])
    setAnswers({})
    setResult(null)
  }

  const respondidasCount = useMemo(() => Object.keys(answers).length, [answers])

  // ── Tela de configuração ──
  if (stage === 'setup') {
    return (
      <div className={styles.page}>
        <div className={styles.setupCard}>
          <div className={styles.setupHeader}>
            <span className={styles.setupIcon}><i className="ti ti-clock-play" aria-hidden="true"></i></span>
            <div>
              <h1 className={styles.setupTitle}>Simulado cronometrado</h1>
              <p className={styles.setupSub}>Configure e teste seu desempenho sob pressão de tempo</p>
            </div>
          </div>

          <div className={styles.setupGroup}>
            <span className={styles.setupLabel}>Área</span>
            <div className={styles.pills}>
              {AREAS.map(a => (
                <button key={a} className={`${styles.pill} ${areaFilter === a ? styles.pillActive : ''}`} onClick={() => setAreaFilter(a)}>
                  {a}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.setupGroup}>
            <span className={styles.setupLabel}>Prova</span>
            <div className={styles.pills}>
              {PROVAS.map(p => (
                <button key={p} className={`${styles.pill} ${provaFilter === p ? styles.pillActive : ''}`} onClick={() => setProvaFilter(p)}>
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.setupGroup}>
            <span className={styles.setupLabel}>Número de questões</span>
            <div className={styles.pills}>
              {NUM_OPCOES.map(n => (
                <button key={n} className={`${styles.pill} ${numQuestoes === n ? styles.pillActive : ''}`} onClick={() => setNumQuestoes(n)}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.setupGroup}>
            <span className={styles.setupLabel}>Tempo (minutos)</span>
            <div className={styles.pills}>
              {TEMPO_OPCOES.map(t => (
                <button key={t} className={`${styles.pill} ${tempoMin === t ? styles.pillActive : ''}`} onClick={() => setTempoMin(t)}>
                  {t} min
                </button>
              ))}
            </div>
          </div>

          <button className={styles.btnPrimary} onClick={startSimulado}>
            <i className="ti ti-player-play" aria-hidden="true"></i> Iniciar simulado
          </button>
        </div>
      </div>
    )
  }

  // ── Tela de resultado ──
  if (stage === 'finished' && result) {
    const pct = total > 0 ? Math.round((result.acertos / total) * 100) : 0
    const areasSorted = Object.entries(result.byArea).sort(
      (a, b) => AREA_ORDER.indexOf(a[0]) - AREA_ORDER.indexOf(b[0])
    )

    return (
      <div className={styles.finishWrap}>
        <div className={styles.finishCard}>
          <div className={styles.finishIcon}><i className="ti ti-certificate" aria-hidden="true"></i></div>
          <h2 className={styles.finishTitle}>Simulado finalizado!</h2>
          <p className={styles.finishSub}>Tempo utilizado: {formatTime(result.tempoUsado)}</p>

          <div className={styles.finishStats}>
            <div className={styles.finishStat}>
              <div className={styles.finishStatValue} style={{ color: 'var(--green-text)' }}>{result.acertos}</div>
              <div className={styles.finishStatLabel}>Acertos</div>
            </div>
            <div className={styles.finishDivider}></div>
            <div className={styles.finishStat}>
              <div className={styles.finishStatValue} style={{ color: 'var(--red-text)' }}>{result.erros}</div>
              <div className={styles.finishStatLabel}>Erros</div>
            </div>
            <div className={styles.finishDivider}></div>
            <div className={styles.finishStat}>
              <div className={styles.finishStatValue} style={{ color: 'var(--text-muted)' }}>{result.brancos}</div>
              <div className={styles.finishStatLabel}>Em branco</div>
            </div>
            <div className={styles.finishDivider}></div>
            <div className={styles.finishStat}>
              <div className={styles.finishStatValue} style={{ color: 'var(--purple-bright)' }}>{pct}%</div>
              <div className={styles.finishStatLabel}>Aproveitamento</div>
            </div>
          </div>

          {areasSorted.length > 0 && (
            <div className={styles.finishAreas}>
              {areasSorted.map(([area, { c, t }]) => {
                const p = Math.round((c / t) * 100)
                return (
                  <div className={styles.areaRow} key={area}>
                    <span className={styles.areaName}>{area}</span>
                    <div className={styles.areaTrack}>
                      <div className={styles.areaFill} data-area={area} style={{ width: p + '%' }}></div>
                    </div>
                    <span className={styles.areaPct}>{c}/{t}</span>
                  </div>
                )
              })}
            </div>
          )}

          <button className={styles.btnPrimary} onClick={novoSimulado}>
            <i className="ti ti-refresh" aria-hidden="true"></i> Novo simulado
          </button>
        </div>
      </div>
    )
  }

  // ── Tela de execução ──
  if (!q) return null

  const tempoBaixo = remaining <= 60

  return (
    <div className={styles.page}>
      <div className={styles.runHeader}>
        <div className={`${styles.timer} ${tempoBaixo ? styles.timerLow : ''}`}>
          <i className="ti ti-clock" aria-hidden="true"></i> {formatTime(remaining)}
        </div>
        <div className={styles.runCounter}>
          Questão <strong>{qIndex + 1}</strong> de {total} · {respondidasCount} respondidas
        </div>
        <button className={styles.btnFinalizar} onClick={() => {
          if (respondidasCount < total && !confirm('Existem questões não respondidas. Deseja finalizar o simulado mesmo assim?')) return
          finalizeSimulado()
        }}>
          <i className="ti ti-flag" aria-hidden="true"></i> Finalizar
        </button>
      </div>

      <div className={styles.navigator}>
        {questoes.map((item, i) => {
          let cls = styles.navItem
          if (i === qIndex) cls += ` ${styles.navCurrent}`
          else if (answers[item.id]) cls += ` ${styles.navAnswered}`
          return (
            <button key={item.id} className={cls} onClick={() => goTo(i)}>
              {i + 1}
            </button>
          )
        })}
      </div>

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

        <p className={styles.enunciado}>{q.enunciado}</p>

        <div className={styles.options}>
          {q.opcoes.map(op => (
            <button
              key={op.letra}
              className={`${styles.option} ${answers[q.id] === op.letra ? styles.optionSelected : ''}`}
              onClick={() => selectAnswer(op.letra)}
            >
              <span className={styles.letra}>{op.letra}</span>
              <span className={styles.opText}>{op.texto}</span>
            </button>
          ))}
        </div>

        <div className={styles.actions}>
          <button className={styles.btnSecondary} onClick={() => goTo(qIndex - 1)} disabled={qIndex === 0}>
            <i className="ti ti-arrow-left" aria-hidden="true"></i> Anterior
          </button>
          <button className={styles.btnPrimary} onClick={() => goTo(qIndex + 1)} disabled={qIndex === total - 1}>
            Próxima <i className="ti ti-arrow-right" aria-hidden="true"></i>
          </button>
        </div>
      </div>
    </div>
  )
}
