import { useEffect, useState } from 'react';
import styles from './App.module.css';

type Draft = { series: number; reps: number; note: string };
const initial: Draft = { series: 1, reps: 3, note: 'Camila, baja despacio y mantén el mismo ritmo en las tres repeticiones.' };
const coach = 'https://i.pravatar.cc/160?img=12';
const client = 'https://i.pravatar.cc/200?img=47';
const storageKey = 'pulso-session-mock';

function Icon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    Inicio: 'm3 10 9-7 9 7v11h-7v-7h-4v7H3z',
    Clientes: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m18 0v-2a4 4 0 0 0-3-3.87M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8m8 0a4 4 0 0 1 0 8',
    Rutinas: 'M6 8v8m12-8v8M6 12h12M3 9v6m18-6v6M6 6H4v12h2zm14 0h-2v12h2z',
    Revisiones: 'M9 5H5v16h14V5h-4M9 3h6v4H9zm-1 11 3 3 5-6',
  };
  return <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] || paths.Inicio} /></svg>;
}

function Brand({ compact = false }: { compact?: boolean }) {
  return <div className={`${styles.brand} ${compact ? styles.compact : ''}`}><img src="/pulso-isotipo.svg" alt="" /><span>MYDAS PULSO</span></div>;
}

function Voice({ small = false }: { small?: boolean }) {
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      if (elapsed >= 11) { setPlaying(false); setElapsed(0); }
      else setElapsed(elapsed + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [playing, elapsed]);
  return <div className={`${styles.voice} ${small ? styles.smallVoice : ''}`}>
    {!small && <img src={coach} alt="Fabián, tu coach" className={styles.avatar} />}
    <button type="button" className={styles.play} aria-label={playing ? 'Pausar simulación de audio' : 'Simular reproducción de audio'} onClick={() => setPlaying(!playing)}>{playing ? 'Ⅱ' : '▶'}</button>
    <div className={styles.wave} aria-hidden="true">{Array.from({ length: 54 }, (_, i) => <i key={i} style={{ height: `${8 + ((i * 17 + i * i) % 30)}px`, background: playing && i < elapsed * 4.5 ? '#c6f64e' : undefined }} />)}</div>
    <span className={styles.duration}>0:{String(playing ? elapsed : 12).padStart(2, '0')}</span>
  </div>;
}

export function App() {
  const [draft, setDraft] = useState<Draft>(() => {
    try { const value = JSON.parse(localStorage.getItem(storageKey) || 'null'); return value && Number.isInteger(value.series) && Number.isInteger(value.reps) && typeof value.note === 'string' ? value : initial; } catch { return initial; }
  });
  const [tab, setTab] = useState('Plan');
  const [section, setSection] = useState('Clientes');
  const [published, setPublished] = useState(false);
  const [message, setMessage] = useState('');
  const [guide, setGuide] = useState(false);
  const update = (value: Partial<Draft>) => { setDraft({ ...draft, ...value }); setPublished(false); setMessage(''); };
  const save = (publish: boolean) => {
    if (!draft.note.trim()) { setMessage('Añade una indicación personal antes de continuar.'); return; }
    try { localStorage.setItem(storageKey, JSON.stringify(draft)); setPublished(publish); setMessage(publish ? 'Ejercicio publicado en esta demo. No se envió a ningún cliente.' : 'Borrador guardado en este navegador.'); } catch { setMessage('No se pudo guardar en este navegador.'); }
  };
  return <div className={styles.shell}>
    <a className={styles.skip} href="#contenido">Saltar al contenido</a>
    <aside className={styles.sidebar}>
      <Brand />
      <nav className={styles.nav} aria-label="Principal">{['Inicio', 'Clientes', 'Rutinas', 'Revisiones'].map(item => <button key={item} className={section === item ? styles.activeNav : ''} aria-current={section === item ? 'page' : undefined} onClick={() => setSection(item)}><Icon name={item} /><span>{item}</span></button>)}</nav>
      <div className={styles.account}><div className={styles.onlineAvatar}><img src={coach} alt="" /><i /></div><div><strong>Fabián</strong><span>Coach</span></div><span className={styles.chevron}>⌄</span></div>
    </aside>
    <main id="contenido" className={styles.main}>
      <div className={styles.topline}><div className={styles.breadcrumb}>Clientes <span>/</span> <strong>Camila Torres</strong></div><span className={styles.demo}>DEMO INTERACTIVA</span></div>
      {section !== 'Clientes' ? <section className={styles.empty}><Icon name={section} /><h1>{section}</h1><p>Esta demo muestra la edición del plan de Camila Torres.</p><button onClick={() => setSection('Clientes')}>Abrir ficha de Camila →</button></section> : <>
        <header className={styles.profile}><img src={client} alt="Camila Torres" /><div><h1>Camila Torres</h1><p>Objetivo · Mejorar su técnica</p></div></header>
        <nav className={styles.tabs} aria-label="Ficha de Camila">{['Resumen', 'Entrevista', 'Plan', 'Progreso'].map(item => <button key={item} className={tab === item ? styles.activeTab : ''} aria-current={tab === item ? 'page' : undefined} onClick={() => setTab(item)}>{item}</button>)}</nav>
        {tab === 'Plan' ? <>
          <div className={styles.heading}><h2>Editar próxima sesión</h2><span className={`${styles.badge} ${published ? styles.published : ''}`}>{published ? 'Publicado · demo' : 'Borrador'}</span></div>
          <div className={styles.editorGrid}>
            <section className={styles.card} aria-label="Editor de ejercicio">
              <h3><i className={styles.slash} />Sentadilla sin carga</h3>
              <div className={styles.fields}>
                <label>Series<select value={draft.series} onChange={event => update({ series: Number(event.target.value) })}>{[1, 2, 3, 4, 5, 6].map(n => <option key={n}>{n}</option>)}</select></label>
                <label>Repeticiones<select value={draft.reps} onChange={event => update({ reps: Number(event.target.value) })}>{Array.from({ length: 20 }, (_, i) => i + 1).map(n => <option key={n}>{n}</option>)}</select></label>
                <div className={styles.focus}><span aria-hidden="true">◎</span><div><small>Foco</small><strong>Ritmo de bajada</strong></div></div>
              </div>
              <label className={styles.note}>Indicación personal<textarea value={draft.note} onChange={event => update({ note: event.target.value })} rows={3} maxLength={500} /></label>
              <Voice />
              <p className={styles.audioHint}>Nota de voz de ejemplo · reproducción visual sin audio</p>
            </section>
            <section className={`${styles.card} ${styles.preview}`} aria-label="Vista previa móvil">
              <h3><i className={styles.slash} />Vista previa móvil</h3>
              <div className={styles.phone}><Brand compact /><h4>Sentadilla sin carga</h4><p className={styles.prescription}>{draft.series} {draft.series === 1 ? 'serie' : 'series'} · {draft.reps} {draft.reps === 1 ? 'repetición' : 'repeticiones'}</p>
                <div className={styles.coachNote}><div className={styles.coachTitle}><img src={coach} alt="" /><strong>De tu coach</strong></div><p>{draft.note || 'Tu indicación personal aparecerá aquí.'}</p><Voice small /></div>
                <button className={styles.assistant} onClick={() => setGuide(!guide)} aria-expanded={guide}><img src="/pulso-isotipo.svg" alt="" /><span><strong>Asistente Pulso</strong><span>Guía de grabación</span></span><b>›</b></button>
                {guide && <p className={styles.guide}>Coloca el móvil a la altura de tu cadera, encuadra todo el cuerpo y graba de perfil en un espacio iluminado.</p>}
              </div>
            </section>
          </div>
          <div className={styles.actions}><p role="status">{message}</p><button className={styles.secondary} onClick={() => save(false)}>Guardar borrador</button><button className={styles.primary} onClick={() => save(true)}>Publicar ejercicio</button></div>
        </> : <section className={styles.empty}><h2>{tab}</h2><p>{tab === 'Resumen' ? 'Camila trabaja en mejorar la técnica y el control de su sentadilla. Su próxima sesión está lista para editar.' : tab === 'Entrevista' ? 'Objetivo: mejorar su técnica. Experiencia: principiante. Prioridad del coach: controlar el ritmo de bajada.' : 'El seguimiento de Camila aparecerá aquí después de completar su primera sesión.'}</p><button onClick={() => setTab('Plan')}>Ver plan de entrenamiento →</button></section>}
      </>}
    </main>
  </div>;
}
