import { useEffect, useMemo, useState } from 'react'
import {
  episodes,
  evaluate,
  falseLeadLine,
  headline,
  heatLabel,
  stepLabel,
  suspectsFor,
  verdict,
} from './case.js'

const STORAGE_KEY = 'tretiy-sledovatel-v1'

function emptyState() {
  return {
    name: '',
    started: false,
    opened: {},
    reports: {},
    debriefSeen: false,
    screen: 'episode',
    current: 1,
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyState()
    return { ...emptyState(), ...JSON.parse(raw) }
  } catch {
    return emptyState()
  }
}

function canOpenEpisode(n, reports) {
  return n === 1 || Boolean(reports[n - 1])
}

export default function App() {
  const [state, setState] = useState(loadState)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  const filed = Object.keys(state.reports).length
  const caseReady = Boolean(state.reports[8])

  function patch(next) {
    setState((prev) => ({ ...prev, ...next }))
  }

  function reset() {
    if (window.confirm('Закрыть дело и стереть все рапорты на этом устройстве?')) {
      const fresh = emptyState()
      localStorage.removeItem(STORAGE_KEY)
      setState(fresh)
    }
  }

  return (
    <div className="desk">
      <header className="top">
        <div>
          <p className="eyebrow">Умай · дело без номера</p>
          <h1>Третий следователь</h1>
        </div>
        {state.started && (
          <button className="ghost" type="button" onClick={reset}>
            Закрыть дело
          </button>
        )}
      </header>

      {state.started ? (
        <Workspace
          state={state}
          patch={patch}
          filed={filed}
          caseReady={caseReady}
        />
      ) : (
        <Cover
          name={state.name}
          onName={(name) => patch({ name })}
          onStart={() => patch({ started: true, current: 1, screen: 'episode' })}
        />
      )}
    </div>
  )
}

function Cover({ name, onName, onStart }) {
  return (
    <main className="cover">
      <p className="kicker">После Фишера. Инквизитор</p>
      <h2>Вы третий в группе.</h2>
      <p className="lede">
        Белова и Терехов уже ведут дело. После каждой серии вы видите только то,
        что к этому вечеру лежит в материалах, и сдаёте свой рапорт. Кто был
        ближе к правде, дело скажет один раз, после восьмой серии.
      </p>
      <ol className="rules">
        <li>
          <b>01</b>
          <span>Открывайте папку, только если серию уже посмотрели.</span>
        </li>
        <li>
          <b>02</b>
          <span>Внутри улики на конец этой серии. Будущих серий здесь нет.</span>
        </li>
        <li>
          <b>03</b>
          <span>Ключ к делу лежит под замком, пока не сдан восьмой рапорт.</span>
        </li>
      </ol>
      <label className="name">
        Как подписать рапорт
        <input
          value={name}
          maxLength={40}
          autoComplete="off"
          placeholder="третий следователь"
          onChange={(event) => onName(event.target.value)}
        />
      </label>
      <div className="actions">
        <button className="ink" type="button" onClick={onStart}>
          Принять дело
        </button>
      </div>
      <p className="fine">
        Неофициальный спутник просмотра. Улики сжаты по ходу серий, решение
        спрятано до финала.
      </p>
    </main>
  )
}

function Workspace({ state, patch, filed, caseReady }) {
  const episode = episodes.find((item) => item.n === state.current)

  function openEpisode(n) {
    if (!canOpenEpisode(n, state.reports)) return
    patch({ screen: 'episode', current: n })
  }

  return (
    <div className="layout">
      <nav className="rail" aria-label="Серии">
        {episodes.map((item) => {
          const locked = !canOpenEpisode(item.n, state.reports)
          const done = Boolean(state.reports[item.n])
          const opened = Boolean(state.opened[item.n])
          const current = state.screen === 'episode' && state.current === item.n
          let status = 'закрыто'
          if (!locked && done) status = item.short
          else if (!locked && opened) status = 'ждёт рапорт'
          else if (!locked) status = 'опечатано'
          return (
            <button
              key={item.n}
              type="button"
              aria-current={current ? 'true' : undefined}
              disabled={locked}
              onClick={() => openEpisode(item.n)}
            >
              <strong>{String(item.n).padStart(2, '0')}</strong>
              <span>{status}</span>
            </button>
          )
        })}
        <button
          type="button"
          aria-current={state.screen === 'debrief' ? 'true' : undefined}
          disabled={!caseReady}
          onClick={() => patch({ screen: 'debrief', debriefSeen: true })}
        >
          <strong>Ключ</strong>
          <span>{caseReady ? 'вскрыть' : 'после 8 серии'}</span>
        </button>
      </nav>

      {state.screen === 'debrief' && caseReady ? (
        <Debrief reports={state.reports} name={state.name} />
      ) : (
        <Episode
          episode={episode}
          state={state}
          patch={patch}
          filed={filed}
        />
      )}
    </div>
  )
}

function Episode({ episode, state, patch, filed }) {
  const opened = Boolean(state.opened[episode.n])
  const report = state.reports[episode.n]
  const lockedForm = state.debriefSeen
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    setEditing(false)
  }, [episode.n])

  function markWatched() {
    patch({ opened: { ...state.opened, [episode.n]: true } })
  }

  if (!opened) {
    return (
      <main className="sheet">
        <section className="seal">
          <p className="kicker">Папка опечатана</p>
          <h2>Серия <span className="num">{episode.n}</span></h2>
          <p className="lede">
            Здесь улики на конец этой серии. Дальше по сюжету из папки ничего
            не достать, но саму серию лучше уже посмотреть.
          </p>
          <div className="actions">
            <button className="ink" type="button" onClick={markWatched}>
              Серия просмотрена
            </button>
          </div>
          <p className="fine">Рапортов в деле: {filed} из 8.</p>
        </section>
      </main>
    )
  }

  return (
    <main className="sheet">
      <div className="sheet-head">
        <div>
          <p className="series-no">Серия {String(episode.n).padStart(2, '0')} · конец вечера</p>
          <h2>{episode.title}</h2>
        </div>
        {report && <div className="stamp">Рапорт принят</div>}
      </div>
      <p className="intro">{episode.intro}</p>
      <div className="clues">
        {episode.clues.map((clue, index) => (
          <p className="clue" key={clue}>
            <span>{String(index + 1).padStart(2, '0')}</span>
            {clue}
          </p>
        ))}
      </div>
      {report && !editing ? (
        <Filed
          episode={episode}
          report={report}
          name={state.name}
          canEdit={!lockedForm}
          onEdit={() => setEditing(true)}
        />
      ) : (
        <ReportForm
          key={`${episode.n}-${editing ? 'edit' : 'new'}`}
          episode={episode}
          initial={report}
          locked={lockedForm}
          onSubmit={(next) => {
            setEditing(false)
            patch({
              reports: { ...state.reports, [episode.n]: next },
            })
          }}
        />
      )}
    </main>
  )
}

function ReportForm({ episode, initial, locked, onSubmit }) {
  const people = useMemo(() => suspectsFor(episode.n), [episode.n])
  const [suspectId, setSuspectId] = useState(initial?.suspectId ?? '')
  const [theoryId, setTheoryId] = useState(initial?.theoryId ?? '')
  const [stepId, setStepId] = useState(initial?.stepId ?? '')
  const [note, setNote] = useState(initial?.note ?? '')
  const ready = suspectId && theoryId && stepId && !locked

  return (
    <form
      className="block"
      onSubmit={(event) => {
        event.preventDefault()
        if (!ready) return
        onSubmit({
          suspectId,
          theoryId,
          stepId,
          note: note.trim(),
          at: new Date().toISOString(),
        })
      }}
    >
      <h3>Рапорт</h3>
      <p className="hint">Одна главная версия. Завтра группа пойдёт туда, куда вы отправите.</p>

      <fieldset>
        <legend>Кого ставите во главе</legend>
        {people.map((person) => (
          <label key={person.id} className={suspectId === person.id ? 'pick on' : 'pick'}>
            <input
              type="radio"
              name="suspect"
              value={person.id}
              checked={suspectId === person.id}
              onChange={() => setSuspectId(person.id)}
            />
            <strong>{person.name}</strong>
            <em>{person.role}</em>
          </label>
        ))}
      </fieldset>

      <fieldset>
        <legend>Главная версия</legend>
        {episode.theories.map((theory) => (
          <label key={theory.id} className={theoryId === theory.id ? 'pick on' : 'pick'}>
            <input
              type="radio"
              name="theory"
              value={theory.id}
              checked={theoryId === theory.id}
              onChange={() => setTheoryId(theory.id)}
            />
            <strong>{theory.label}</strong>
          </label>
        ))}
      </fieldset>

      <fieldset>
        <legend>Что делать завтра</legend>
        {episode.steps.map((step) => (
          <label key={step.id} className={stepId === step.id ? 'pick on' : 'pick'}>
            <input
              type="radio"
              name="step"
              value={step.id}
              checked={stepId === step.id}
              onChange={() => setStepId(step.id)}
            />
            <strong>{step.label}</strong>
          </label>
        ))}
      </fieldset>

      <label className="note">
        Заметка в дело, если версия не умещается в пункты
        <textarea
          rows={3}
          maxLength={280}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </label>

      <div className="actions">
        <button className="ink" type="submit" disabled={!ready}>
          {initial ? 'Переписать рапорт' : 'Сдать рапорт'}
        </button>
        {locked && <span className="fine">Ключ уже вскрыт, рапорты не правятся.</span>}
      </div>
    </form>
  )
}

function Filed({ episode, report, name, canEdit, onEdit }) {
  const person = suspectsFor(episode.n).find((item) => item.id === report.suspectId)
  const theory = episode.theories.find((item) => item.id === report.theoryId)
  const step = episode.steps.find((item) => item.id === report.stepId)
  const sign = name.trim() || 'третий следователь'

  return (
    <section className="filed">
      <h3>Сдано</h3>
      <p>
        <strong>Во главе.</strong> {person?.name ?? 'не указано'}
      </p>
      <p>
        <strong>Версия.</strong> {theory?.label}
      </p>
      <p>
        <strong>Завтра.</strong> {step?.label}
      </p>
      {report.note && (
        <p>
          <strong>Заметка.</strong> {report.note}
        </p>
      )}
      <p className="fine">Подпись: {sign}</p>
      {episode.n < 8 ? (
        <p className="fine">Серия {episode.n + 1} опечатана. Откройте её в списке, когда досмотрите.</p>
      ) : (
        <p className="fine">Восьмой рапорт сдан. Ключ к делу можно вскрыть.</p>
      )}
      {canEdit && (
        <button className="textish" type="button" onClick={onEdit}>
          Переписать
        </button>
      )}
    </section>
  )
}

function Debrief({ reports, name }) {
  const result = evaluate(reports)
  const sign = name.trim() || 'третий следователь'

  return (
    <main className="sheet verdict">
      <p className="kicker">Ключ к делу · {sign}</p>
      <h2>{headline(result)}</h2>
      <p className="lede">{falseLeadLine(result.falseLeads)}</p>
      <p className="intro">{verdict}</p>
      <ul className="stats">
        <li>Горячих версий: {result.hotCount} из {result.filed}</li>
        <li>Подозреваемый совпал: {result.hitCount} из {result.filed}</li>
        <li>Ложных следов: {result.falseLeads.length}</li>
      </ul>
      <div className="rows">
        {result.rows.map((row) => (
          <article className="row" key={row.n}>
            <header>
              <strong>
                {String(row.n).padStart(2, '0')} · {row.short}
              </strong>
              {row.missing ? (
                <span className="tag cold">нет рапорта</span>
              ) : (
                <span className={`tag ${row.heat}`}>{heatLabel(row.heat)}</span>
              )}
            </header>
            {row.missing ? (
              <p className="miss">Папка пустая.</p>
            ) : (
              <>
                <p>
                  {row.suspect?.name ?? 'Без имени'}
                  {row.suspectHit ? ' · лицо совпало' : ' · лицо мимо'}
                </p>
                <p>{row.theory?.label}</p>
                <p className="why">{row.theory?.why}</p>
                <p className="fine">{stepLabel(row.step?.quality)}</p>
                {row.report.note && <p className="fine">Ваша заметка: {row.report.note}</p>}
              </>
            )}
          </article>
        ))}
      </div>
    </main>
  )
}
