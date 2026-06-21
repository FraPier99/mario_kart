import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileText, Users, Swords, Trophy, Medal, GraduationCap, Shuffle, Gauge, LayoutGrid, Timer, Ban, Dice1 } from 'lucide-react'
import AppLayout from '@/components/layout/AppLayout'
import { useAppData } from '@/context/AppDataContext'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { getProfileTheme } from '@/lib/profileTheme'

const Regolamento = () => {
    const [formatSubTab, setFormatSubTab] = useState('unica')
    const { dark } = useTheme()
    const { charactersById } = useAppData()
    const { user } = useAuth()
    const theme = useMemo(() => getProfileTheme(user, charactersById, dark), [user, charactersById, dark])

    return (
        <AppLayout>
            <section className="mx-auto max-w-7xl px-4 py-8 animate-fade-in">
                {/* HEADER */}
                <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <p className={`text-xs font-black uppercase tracking-[0.35em] ${theme.tailwind.text}`}>REGOLAMENTO</p>
                        <h1 className="mt-2 text-3xl font-black uppercase tracking-tight text-slate-900 dark:text-foreground md:text-4xl">Regolamento Torneo</h1>
                        <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-muted-foreground uppercase">
                            Regole complete per tornei a Classifica Unica e a Gironi
                        </p>
                    </div>
                    <Link
                        to="/schedina"
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-700 transition hover:border-slate-300 dark:border-border dark:bg-card dark:text-foreground"
                    >
                        Vai a Schedina
                    </Link>
                </div>

                {/* SEZIONE FORMAT TORNEO */}
                <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl dark:border-border dark:bg-card">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <p className={`text-xs font-black uppercase tracking-[0.35em] ${theme.tailwind.text}`}>Formato torneo</p>
                            <h2 className="mt-2 font-title text-2xl uppercase tracking-tight text-slate-900 dark:text-foreground">Struttura e regole</h2>
                        </div>
                        <div className="inline-flex rounded-xl bg-slate-100 dark:bg-muted p-0.5">
                            <button type="button" onClick={() => setFormatSubTab('unica')} className={`rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition ${formatSubTab === 'unica' ? 'bg-white text-slate-900 shadow-sm dark:bg-card dark:text-foreground' : 'text-slate-500 dark:text-muted-foreground hover:text-slate-700'}`}>
                                Classifica Unica
                            </button>
                            <button type="button" onClick={() => setFormatSubTab('gironi')} className={`rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition ${formatSubTab === 'gironi' ? 'bg-white text-slate-900 shadow-sm dark:bg-card dark:text-foreground' : 'text-slate-500 dark:text-muted-foreground hover:text-slate-700'}`}>
                                Gironi
                            </button>
                        </div>
                    </div>

                    {formatSubTab === 'gironi' ? (
                        <>
                            {/* Panoramica Gironi */}
                            <div className="mt-5 rounded-3xl border border-sky-200 dark:border-sky-500/30 bg-sky-50/50 dark:bg-sky-500/5 p-4">
                                <div className="flex items-center gap-2 text-sky-700 dark:text-sky-300">
                                    <Users size={18} />
                                    <p className="text-sm font-black uppercase tracking-[0.3em]">Panoramica</p>
                                </div>
                                <p className="mt-2 text-sm text-slate-600 dark:text-muted-foreground">
                                    I tornei a Gironi richiedono <strong>almeno 8 partecipanti</strong>.
                                    I giocatori vengono divisi in gironi da <strong>massimo 4</strong> (bilanciati automaticamente).
                                    In caso di gironi da 3, il 4° posto non esiste: il punteggio per gara è 1° = 5 pt, 2° = 3 pt, 3° = 2 pt. Anche in questo caso i primi <strong>2 avanzano</strong>.
                                    I primi <strong>2 di ogni girone avanzano</strong> alla fase successiva.
                                </p>
                            </div>

                            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                                {[
                                    { icon: <LayoutGrid size={16} />, title: 'Fase 1 — Gironi', body: <>I partecipanti vengono divisi in gironi bilanciati (max 4 per girone, scarto max 1 tra gironi). Ogni girone gioca le proprie gare indipendentemente dagli altri. Il numero di gare per fase viene deciso insieme all'inizio. Punteggio per gara: 1° = 5 pt, 2° = 3 pt, 3° = 2 pt, 4° = 1 pt. Con gironi da 3: 1° = 5 pt, 2° = 3 pt, 3° = 2 pt (i primi 2 avanzano comunque).</> },
                                    { icon: <Medal size={16} />, title: 'Qualificazione', body: 'I primi 2 classificati di ciascun girone avanzano. A parità nel girone si contano prima le vittorie di gara, poi i podi. Se la parità persiste al confine qualificazione/eliminazione, si gioca uno Spareggio al meglio (primo a 2 vittorie) su piste casuali tra i soli giocatori in parità. Le gare di spareggio non assegnano punti alla classifica del girone.' },
                                    { icon: <Swords size={16} />, title: 'Fase 2 — Finale', body: 'Se i qualificati (top 2 per gruppo) sono al massimo 4, si passa direttamente alla Finale (gruppo "top" per il podio) più una Consolazione (gruppo "bottom"). Se i qualificati sono più di 4, vengono generate Semifinali prima della Finale. La classifica riparte da zero in ogni fase.' },
                                    { icon: <Dice1 size={16} />, title: 'Circuiti', body: 'I circuiti sono indipendenti per ogni girone: lo stesso circuito può essere usato in gironi diversi. A ogni nuova fase i circuiti vengono resettati e ri-disponibili. Per i duelli e spareggi, i circuiti vengono sorteggiati random tra quelli disponibili per quel girone/fase.' },
                                    { icon: <Timer size={16} />, title: 'Numero gare', body: 'Il numero di gare per fase non è fisso: viene deciso insieme all\'inizio del torneo in base al formato e al numero di partecipanti. Le gare vengono create manualmente dal Superadmin in base all\'andamento del torneo.' },
                                    { icon: <Ban size={16} />, title: 'Carte Potere', body: <>Le <Link to="/carte" className="underline underline-offset-2 hover:text-amber-600 dark:hover:text-amber-400 font-bold">Carte Potere</Link> possono essere usate dal vivo. Nei tornei a gironi si può giocare al massimo <strong>1 carta in totale</strong> per giocatore per torneo (non 1 per fase). Le carte vinte in un gioco non si possono usare in un altro gioco.</> },
                                ].map(({ icon, title, body }) => (
                                    <div key={title} className={`rounded-3xl border p-4 ${theme.tailwind.borderSoft}`} style={{ background: `linear-gradient(135deg, ${theme.accentSoft}, transparent)` }}>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-sky-600 dark:text-sky-400">{icon}</span>
                                            <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-500">{title}</p>
                                        </div>
                                        <p className="text-[10px] text-slate-500 dark:text-muted-foreground leading-relaxed">{body}</p>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Panoramica Classifica Unica */}
                            <div className="mt-5 rounded-3xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-500/5 p-4">
                                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                                    <Trophy size={18} />
                                    <p className="text-sm font-black uppercase tracking-[0.3em]">Panoramica</p>
                                </div>
                                <p className="mt-2 text-sm text-slate-600 dark:text-muted-foreground">
                                    Tutti i partecipanti competono in <strong>un'unica classifica</strong>. I punti sono cumulativi gara dopo gara.
                                    Vince il torneo chi totalizza più punti al termine di tutte le gare in programma.
                                </p>
                            </div>

                            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                                {[
                                    { icon: <Gauge size={16} />, title: 'Punteggio', body: 'I punti per ogni gara sono dinamici in base al numero di partecipanti (n): 1° = n+1 pt, 2° = n-1 pt, 3° = n-2 pt, a scendere fino a 1 pt per l\'ultimo. Esempio con 8 player: 9, 7, 6, 5, 4, 3, 2, 1. Con 4 player: 5, 3, 2, 1.' },
                                    { icon: <LayoutGrid size={16} />, title: 'Numero gare', body: 'Max 20 gare per torneo. Ogni partecipante sceglie n_gare / n_partecipanti circuiti (es: 7 player × 3 scelte = 21 gare). Se il conto è dispari si decide insieme se aggiungere gare extra.' },
                                    { icon: <Dice1 size={16} />, title: 'Selezione circuiti', body: 'Ogni giocatore sceglie i propri circuiti tra quelli disponibili. I circuiti scelti si esauriscono. I rimanenti vengono sorteggiati random tra i non utilizzati. Se tutti i circuiti sono stati usati, il pool viene resettato.' },
                                    { icon: <Swords size={16} />, title: 'Spareggio — Duello', body: 'A parità di punti in qualsiasi posizione della classifica (1°/2°, 3°/4° o più) si attiva un Duello: serie di spareggi al meglio di 3 vittorie (first-to-3) tra i soli giocatori in parità. Ogni gara si corre su una pista casuale tra quelle non ancora usate. Chi arriva prima a 3 vittorie conquista la posizione. Le gare di spareggio non assegnano punti in classifica. Se i circuiti finiscono, si resetta il pool.' },
                                    { icon: <Timer size={16} />, title: 'Chiusura schedine', body: <>La schedina si compila fino a quando il torneo non inizia. Non esiste una deadline automatica: l'admin decide quando chiudere le schedine, previo avviso ai partecipanti.</> },
                                    { icon: <Ban size={16} />, title: 'Carte Potere', body: <>Le <Link to="/carte" className="underline underline-offset-2 hover:text-amber-600 dark:hover:text-amber-400 font-bold">Carte Potere</Link> accumulate possono essere usate dal vivo durante il torneo. Nella Classifica Unica vale lo stesso limite: al massimo <strong>1 carta in totale</strong> per giocatore per torneo.</> },
                                ].map(({ icon, title, body }) => (
                                    <div key={title} className={`rounded-3xl border p-4 ${theme.tailwind.borderSoft}`} style={{ background: `linear-gradient(135deg, ${theme.accentSoft}, transparent)` }}>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-emerald-600 dark:text-emerald-400">{icon}</span>
                                            <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-500">{title}</p>
                                        </div>
                                        <p className="text-[10px] text-slate-500 dark:text-muted-foreground leading-relaxed">{body}</p>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    <div className="mt-5 rounded-3xl bg-slate-50 p-4 dark:bg-muted">
                        <div className="flex items-center gap-2 text-slate-900 dark:text-foreground">
                            <FileText size={16} className={theme.tailwind.text} />
                            <p className="text-sm font-black uppercase tracking-[0.3em]">Regole pratiche</p>
                        </div>
                        {formatSubTab === 'gironi' ? (
                            <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-muted-foreground">
                                <li>• Minimo <strong>8 partecipanti</strong> per attivare il formato a gironi.</li>
                                <li>• Gironi bilanciati automaticamente: max 4 per girone, i primi 2 di ogni girone avanzano.</li>
                                <li>• Con gironi da 3: il 4° posto non esiste, il punteggio per gara è 1° = 5 pt, 2° = 3 pt, 3° = 2 pt. I primi 2 avanzano comunque.</li>
                                <li>• Punteggio per gara: 1° = 5 pt, 2° = 3 pt, 3° = 2 pt, 4° = 1 pt (fisso, indipendentemente dai partecipanti).</li>
                                <li>• A parità nel girone: vittorie → podi → spareggio al meglio (primo a 2 vittorie, piste casuali, niente punti in classifica).</li>
                                <li>• Se qualificati (top 2 per gruppo) &gt; 4: si generano Semifinali prima della Finale.</li>
                                <li>• Circuiti indipendenti per girone; a ogni fase vengono resettati.</li>
                                <li>• Le <Link to="/carte" className="underline underline-offset-2 hover:text-amber-600 dark:hover:text-amber-400 font-bold">Carte Potere</Link> nei gironi: max <strong>1 carta in totale</strong> per giocatore per torneo.</li>
                                <li>• <strong>Chiusura schedine</strong>: non esiste una deadline automatica. L'admin decide quando chiudere le schedine, previo avviso ai partecipanti.</li>
                            </ul>
                        ) : (
                            <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-muted-foreground">
                                <li>• Tutti i partecipanti in un'unica classifica. Punti cumulativi gara dopo gara.</li>
                                <li>• Punteggio dinamico: 1° = n+1 pt, poi a scalare di 1 fino a 1 pt per l'ultimo.</li>
                                <li>• Max <strong>20 gare</strong> per torneo. Ogni player sceglie n_gare / n_partecipanti circuiti.</li>
                                <li>• Circuiti scelti si esauriscono; i rimanenti sorteggiati random tra non utilizzati. Se finiscono → reset.</li>
                                <li>• A parità di punti in qualsiasi posizione → <strong>Duello al meglio dei 3</strong> (first-to-3) tra i soli giocatori in parità. Le gare di spareggio <strong>non assegnano punti</strong> in classifica. Stessa logica di selezione circuiti.</li>
                                <li>• Le <Link to="/carte" className="underline underline-offset-2 hover:text-amber-600 dark:hover:text-amber-400 font-bold">Carte Potere</Link> in Classifica Unica: max <strong>1 carta in totale</strong> per giocatore per torneo.</li>
                                <li>• <strong>Chiusura schedine</strong>: non esiste una deadline automatica. L'admin decide quando chiudere le schedine, previo avviso ai partecipanti.</li>
                            </ul>
                        )}
                    </div>
                </div>
            </section>
        </AppLayout>
    )
}

export default Regolamento
