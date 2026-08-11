import { useEffect, useMemo, useState } from 'react'
import {
    Flag, Trophy, Swords, ScrollText, Zap,
    Crown, Star, Flame, Flag as FlagIcon,
} from 'lucide-react'
import AppLayout from '@/components/layout/AppLayout'
import PlayerLink from '@/components/common/PlayerLink'
import EditableContentImage from '@/components/common/EditableContentImage'
import { useAppData } from '@/context/AppDataContext'
import { contentImagesApi } from '@/services/apiClient'

// Trova il player con questo nickname (case-insensitive) e lo rende come
// PlayerLink se esiste, altrimenti come testo semplice — per il racconto
// de "La Lega", dove i nomi citati sono giocatori reali della lega.
const FounderName = ({ name, players }) => {
    const player = players.find((p) => p.nickname?.toLowerCase() === name.toLowerCase())
    if (!player) return <strong>{name}</strong>
    return (
        <PlayerLink playerId={player.id} className="font-black text-emerald-600 dark:text-emerald-400 hover:underline">
            {name}
        </PlayerLink>
    )
}

const BADGE_TIERS_FAQ = [
    { tier: 'LEGGENDA', Icon: Crown, color: 'text-amber-600 dark:text-amber-400', desc: 'Ha vinto TUTTI i tornei conclusi di quel gioco a cui ha partecipato (minimo 2 tornei giocati).' },
    { tier: 'CAMPIONE', Icon: Trophy, color: 'text-amber-600 dark:text-amber-400', desc: 'Ha vinto almeno un torneo concluso di quel gioco.' },
    { tier: 'VETERANO', Icon: Star, color: 'text-blue-600 dark:text-blue-400', desc: 'Non ha mai vinto, ma è arrivato sul podio (primi 3 posti) in almeno metà dei tornei conclusi giocati.' },
    { tier: 'OUTSIDER', Icon: Flame, color: 'text-violet-600 dark:text-violet-400', desc: 'Non ha mai vinto, ha fatto almeno un podio, ma meno spesso della metà dei tornei giocati.' },
    { tier: 'SFIDANTE', Icon: Swords, color: 'text-slate-500 dark:text-muted-foreground', desc: 'Ha giocato almeno un torneo concluso ma non è mai arrivato sul podio.' },
    { tier: 'ESORDIENTE', Icon: FlagIcon, color: 'text-emerald-600 dark:text-emerald-400', desc: 'Non ha ancora giocato un torneo concluso di quel gioco (e quel gioco ha comunque almeno un torneo creato).' },
]

const SECTIONS = [
    { key: 'lega', label: 'La Lega', icon: Flag },
    { key: 'tornei', label: 'Tornei', icon: Trophy },
    { key: 'badge', label: 'Badge', icon: Crown },
    { key: 'schedina', label: 'Schedina', icon: ScrollText },
    { key: 'card', label: 'Card', icon: Zap },
]

const SectionHeading = ({ children }) => (
    <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-foreground">{children}</h2>
)

const SubHeading = ({ children }) => (
    <h3 className="mt-8 mb-3 text-sm font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">{children}</h3>
)

const Faq = () => {
    const { players } = useAppData()
    const [activeSection, setActiveSection] = useState('lega')
    const [images, setImages] = useState({})

    useEffect(() => {
        contentImagesApi.list()
            .then((res) => setImages(Object.fromEntries(res.data.map((row) => [row.key, row.image_url]))))
            .catch(() => {})
    }, [])

    const handleImageUploaded = (row) => {
        setImages((prev) => ({ ...prev, [row.key]: row.image_url }))
    }

    const foundersLine = useMemo(() => (
        <>
            <FounderName name="Gradino" players={players} />, <FounderName name="Josh" players={players} />, <FounderName name="Shiba" players={players} /> e <FounderName name="Vlad" players={players} />
        </>
    ), [players])

    return (
        <AppLayout>
            <section className="mx-auto max-w-7xl px-4 py-8 animate-fade-in">
                <div className="mb-8 text-center">
                    <p className="font-title text-[10px] tracking-wide text-emerald-600 dark:text-emerald-400">FAQ · Documentazione ufficiale</p>
                    <h1 className="mt-2 text-3xl font-black uppercase tracking-tight text-slate-900 dark:text-foreground md:text-4xl">Regole del gioco</h1>
                    <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-500 dark:text-muted-foreground">
                        Tutto quello che c'è da sapere sulla Lega: come funzionano tornei, badge, schedine e carte.
                    </p>
                </div>

                <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
                    {/* Sidebar */}
                    <nav className="lg:sticky lg:top-20 lg:self-start">
                        <div className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 dark:border-border bg-white dark:bg-card p-2 lg:flex-col lg:overflow-visible">
                            {SECTIONS.map(({ key, label, icon: Icon }) => (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => setActiveSection(key)}
                                    className={`flex shrink-0 items-center gap-2.5 rounded-xl px-4 py-3 text-left text-xs font-black uppercase tracking-widest transition ${
                                        activeSection === key
                                            ? 'bg-emerald-500 text-white shadow-md'
                                            : 'text-slate-600 dark:text-muted-foreground hover:bg-slate-100 dark:hover:bg-muted'
                                    }`}
                                >
                                    <Icon size={15} />
                                    {label}
                                </button>
                            ))}
                        </div>
                    </nav>

                    {/* Content pane */}
                    <div className="min-w-0 rounded-3xl border border-slate-200 dark:border-border bg-white dark:bg-card p-6 md:p-8">

                        {activeSection === 'lega' && (
                            <div>
                                <SectionHeading>La Lega</SectionHeading>

                                <EditableContentImage
                                    contentKey="faq_lega_founding"
                                    imageUrl={images.faq_lega_founding}
                                    onUploaded={handleImageUploaded}
                                    alt="La nascita della Lega"
                                    className="mt-5 h-56 w-full rounded-2xl md:h-72"
                                />

                                <div className="prose prose-slate dark:prose-invert mt-6 max-w-none text-sm leading-relaxed text-slate-700 dark:text-muted-foreground">
                                    <h3 className="mb-3 text-lg font-black text-slate-900 dark:text-foreground">Come è nata la Lega</h3>
                                    <p>Tutto ebbe inizio il <strong>16 marzo 2026</strong>.</p>
                                    <p>
                                        Quello che doveva essere semplicemente un torneo improvvisato all'ultimo momento
                                        diventò il primo capitolo della nostra storia. Al <strong>HOG di Curno</strong>,
                                        quattro giocatori — {foundersLine} — si sfidarono nel primo torneo di{' '}
                                        <strong>Mario Kart 8 Deluxe</strong>.
                                    </p>
                                    <p>
                                        Fu una battaglia intensa, combattuta fino all'ultima curva, che vide alla fine{' '}
                                        <FounderName name="Shiba" players={players} /> conquistare la vittoria,
                                        lasciando <FounderName name="Josh" players={players} /> tra lacrime, disperazione
                                        e una sola certezza: questa storia non poteva finire lì.
                                    </p>
                                    <p>Da quella sconfitta nacque la voglia di <strong>rivincita</strong>. I tornei dovevano essere rifatti.</p>
                                    <p>
                                        Nel frattempo, <FounderName name="Shiba" players={players} /> sarebbe partito per
                                        il Giappone, con un ritorno previsto per luglio. Fu proprio in quel periodo che{' '}
                                        <FounderName name="Josh" players={players} /> e <FounderName name="Gradino" players={players} />{' '}
                                        iniziarono a dare forma a un'idea più grande: non organizzare semplicemente un
                                        altro torneo, ma creare una vera <strong>lega per tutti gli appassionati di Mario Kart</strong>.
                                    </p>
                                    <p>Il gruppo iniziò ad allargarsi, arrivarono nuovi giocatori e, insieme alle sfide, nacque qualcosa di più grande.</p>
                                    <p className="font-black text-slate-900 dark:text-foreground">
                                        Da una serata improvvisata nacque una lega.<br />
                                        Da una sconfitta nacque la voglia di rivincita.<br />
                                        E da quella voglia nacque questa community.
                                    </p>
                                    <p className="mt-8 text-xs italic text-slate-400">© Francesco Pierucci — Tutti i diritti riservati.</p>
                                </div>
                            </div>
                        )}

                        {activeSection === 'tornei' && (
                            <div>
                                <SectionHeading>Tornei</SectionHeading>
                                <p className="mt-3 text-sm text-slate-600 dark:text-muted-foreground">
                                    Ogni torneo appartiene a un solo gioco e segue uno di due formati.
                                </p>

                                <SubHeading>Classifica Unica</SubHeading>
                                <div className="space-y-3 text-sm text-slate-700 dark:text-muted-foreground">
                                    <p><strong className="text-slate-900 dark:text-foreground">Struttura e partecipanti:</strong> tutti i partecipanti gareggiano insieme nello stesso insieme di gare; la classifica finale è la somma dei punti di tutte le gare.</p>
                                    <p><strong className="text-slate-900 dark:text-foreground">Svolgimento:</strong> massimo 20 gare per torneo. Ogni giocatore sceglie un numero di circuiti pari a gare/partecipanti (arrotondato per eccesso); i circuiti scelti si esauriscono, i rimanenti vengono sorteggiati tra quelli non ancora usati (pool resettato se si esauriscono tutti).</p>
                                    <p><strong className="text-slate-900 dark:text-foreground">Punteggio:</strong> dinamico in base al numero di partecipanti n: 1° = n+1, 2° = n-1, 3° = n-2, a scalare di 1 fino a 1 punto per l'ultimo (es. con 8 giocatori: 9,7,6,5,4,3,2,1).</p>
                                    <p><strong className="text-slate-900 dark:text-foreground">Spareggi (Duello):</strong> a parità su qualunque blocco di posizioni consecutive (non solo il podio, anche a 3+ giocatori in parità) si attiva un Duello — gare secche su piste scelte a caso, primo a 3 vittorie conquista la posizione. Le gare di duello non contano per la classifica/statistiche.</p>
                                    <p><strong className="text-slate-900 dark:text-foreground">Conclusione:</strong> mai automatica — risolti tutti i duelli aperti, un admin deve premere "Decreta Vincitore".</p>
                                </div>

                                <SubHeading>Torneo a Gironi</SubHeading>
                                <div className="space-y-3 text-sm text-slate-700 dark:text-muted-foreground">
                                    <p><strong className="text-slate-900 dark:text-foreground">Requisiti:</strong> almeno 8 partecipanti. I gironi vengono calcolati automaticamente: il minor numero possibile, massimo 4 giocatori a girone, scarto massimo di 1 tra gironi.</p>
                                    <p><strong className="text-slate-900 dark:text-foreground">Fase 1 — Gironi:</strong> ogni girone gioca gare indipendenti dagli altri, punteggio fisso per gara (1°=5, 2°=3, 3°=2, 4°=1). I circuiti sono indipendenti per girone e si resettano a ogni nuova fase.</p>
                                    <p><strong className="text-slate-900 dark:text-foreground">Qualificazione:</strong> i primi 2 di ogni girone avanzano. In caso di parità: prima vittorie di gara, poi podi, poi uno spareggio al meglio (primo a 2 vittorie).</p>
                                    <p><strong className="text-slate-900 dark:text-foreground">Fase 2:</strong> se i qualificati sono al massimo 4, si passa direttamente a Finale (podio) + Consolazione/"Finalina". Se sono più di 4, si generano prima le Semifinali (batterie da massimo 4); chi viene eliminato in semifinale si unisce ai 3°/4° dei gironi nella Finalina invece di restare senza piazzamento.</p>
                                    <p><strong className="text-slate-900 dark:text-foreground">Spareggi di Finale/Consolazione:</strong> stesso meccanismo del Duello (primo a 3 vittorie), ma la Finale e la Consolazione hanno spareggi completamente separati e indipendenti tra loro.</p>
                                    <p><strong className="text-slate-900 dark:text-foreground">Conclusione:</strong> come per la Classifica Unica, mai automatica.</p>
                                </div>

                                <SubHeading>Regole comuni</SubHeading>
                                <p className="text-sm text-slate-700 dark:text-muted-foreground">
                                    In entrambi i formati: massimo <strong>1 carta potere in totale</strong> per giocatore per torneo (non per fase), le carte non si possono usare nelle gare di spareggio/duello, e la schedina si chiude quando il torneo inizia (nessuna deadline automatica a tempo — decide l'admin).
                                </p>
                            </div>
                        )}

                        {activeSection === 'badge' && (
                            <div>
                                <SectionHeading>Badge</SectionHeading>
                                <p className="mt-3 text-sm text-slate-600 dark:text-muted-foreground">
                                    Ogni giocatore ha un badge di livello <strong>per ogni gioco</strong>, calcolato sui soli
                                    tornei conclusi a cui ha partecipato — si può essere Leggenda su un gioco ed Esordiente
                                    su un altro. Un gioco senza nessun torneo creato non produce alcun badge.
                                </p>
                                <div className="mt-5 space-y-3">
                                    {BADGE_TIERS_FAQ.map(({ tier, Icon, color, desc }) => (
                                        <div key={tier} className="flex items-start gap-3 rounded-2xl border border-slate-200 dark:border-border p-4">
                                            <Icon size={18} className={`mt-0.5 shrink-0 ${color}`} />
                                            <div>
                                                <p className={`text-sm font-black uppercase tracking-wide ${color}`}>{tier}</p>
                                                <p className="mt-1 text-sm text-slate-600 dark:text-muted-foreground">{desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeSection === 'schedina' && (
                            <div>
                                <SectionHeading>Schedina</SectionHeading>
                                <p className="mt-3 text-sm text-slate-600 dark:text-muted-foreground">
                                    Prima dell'inizio di un torneo, ogni partecipante può compilare <strong>una sola
                                    schedina</strong> con i propri pronostici. Si chiude quando il torneo inizia (o
                                    prima, se un admin la chiude manualmente) — nessuna deadline automatica a tempo.
                                    Ogni pronostico indovinato vale <strong>3 punti</strong>, uniforme su entrambi i formati.
                                </p>

                                <SubHeading>Schedina Classifica Unica</SubHeading>
                                <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700 dark:text-muted-foreground">
                                    <li><strong className="text-slate-900 dark:text-foreground">Classifica generale:</strong> ordine completo di arrivo — ogni posizione esatta vale 3 punti.</li>
                                    <li><strong className="text-slate-900 dark:text-foreground">Maggior Streak:</strong> chi farà più vittorie consecutive (valido solo dalle 2 vittorie in su).</li>
                                    <li><strong className="text-slate-900 dark:text-foreground">Il Duello:</strong> testa a testa tra due giocatori scelti dall'admin.</li>
                                    <li><strong className="text-slate-900 dark:text-foreground">Distanza 1°-2°:</strong> non assegna punti, è il criterio di spareggio — vince chi ci si è avvicinato di più al distacco reale tra 1° e 2° classificato.</li>
                                </ul>

                                <SubHeading>Schedina Gironi</SubHeading>
                                <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700 dark:text-muted-foreground">
                                    <li><strong className="text-slate-900 dark:text-foreground">Finalisti:</strong> chi accederà alla Fase 2 — ogni finalista indovinato vale 3 punti.</li>
                                    <li><strong className="text-slate-900 dark:text-foreground">Classifica Finale:</strong> ordine del podio finale.</li>
                                    <li><strong className="text-slate-900 dark:text-foreground">Vincitori Gironi:</strong> il 1° classificato di ogni girone.</li>
                                    <li><strong className="text-slate-900 dark:text-foreground">Il Duello:</strong> basato sui punti totali del torneo (può prevedere anche il pareggio).</li>
                                    <li><strong className="text-slate-900 dark:text-foreground">Distanza 1°-2° di Finale:</strong> stesso criterio di spareggio della Classifica Unica.</li>
                                </ul>

                                <SubHeading>Premi</SubHeading>
                                <p className="text-sm text-slate-700 dark:text-muted-foreground">
                                    Chi vince la schedina (e chi è in parità con lui) riceve una <strong>Carta Master</strong>;
                                    chi arriva ultimo nel torneo (e il penultimo, se i partecipanti sono almeno 7) riceve
                                    una <strong>Carta Guscio Blu</strong>. In caso di parità sui punti totali, vince chi si
                                    è avvicinato di più al vero distacco 1°-2° (criterio sopra); a parità anche su questo,
                                    vince chi ha inviato la schedina prima.
                                </p>
                            </div>
                        )}

                        {activeSection === 'card' && (
                            <div>
                                <SectionHeading>Card</SectionHeading>
                                <p className="mt-3 text-sm text-slate-600 dark:text-muted-foreground">
                                    Le carte potere sono premi che si vincono tramite la schedina (o che un admin può
                                    assegnare manualmente) e si possono giocare dal vivo durante un torneo.
                                </p>

                                <SubHeading>Tipi di carta</SubHeading>
                                <div className="space-y-3 text-sm text-slate-700 dark:text-muted-foreground">
                                    <p><strong className="text-slate-900 dark:text-foreground">Carta Master:</strong> assegnata a chi vince la schedina. Permette di bannare una pista o imporre un personaggio nel torneo successivo.</p>
                                    <p><strong className="text-slate-900 dark:text-foreground">Guscio Blu:</strong> assegnata a chi arriva ultimo (e penultimo, con 7+ partecipanti). Fissa una pista come invulnerabile al ban nel torneo successivo.</p>
                                </div>

                                <SubHeading>Come si usano</SubHeading>
                                <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700 dark:text-muted-foreground">
                                    <li><strong className="text-slate-900 dark:text-foreground">Un solo gioco alla volta:</strong> massimo 1 carta in totale per giocatore per torneo, indipendentemente dal tipo o dal formato del torneo.</li>
                                    <li><strong className="text-slate-900 dark:text-foreground">Stesso gioco:</strong> una carta vinta in un gioco (es. Mario Kart DS) non si può usare in un torneo di un altro gioco.</li>
                                    <li><strong className="text-slate-900 dark:text-foreground">Niente spareggi:</strong> le carte non si possono usare nelle gare di Duello/spareggio.</li>
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            </section>
        </AppLayout>
    )
}

export default Faq
