import { useEffect, useMemo, useState } from 'react'
import {
    Flag, Trophy, Swords, ScrollText, Zap,
    Crown, Star, Flame, Flag as FlagIcon, ChevronDown,
} from 'lucide-react'
import AppLayout from '@/components/layout/AppLayout'
import PlayerLink from '@/components/common/PlayerLink'
import EditableContentImage from '@/components/common/EditableContentImage'
import PowerCard from '@/components/cards/PowerCard'
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
    { tier: 'LEGGENDA', Icon: Crown, color: 'text-amber-600 dark:text-amber-400', desc: 'Ha vinto TUTTI i tornei conclusi di quel gioco a cui ha partecipato (100% di vittorie), oppure ha vinto almeno 3 tornei di quel gioco.' },
    { tier: 'CAMPIONE', Icon: Trophy, color: 'text-amber-600 dark:text-amber-400', desc: 'Ha vinto almeno un torneo concluso di quel gioco (ma non tutti).' },
    { tier: 'VETERANO', Icon: Star, color: 'text-blue-600 dark:text-blue-400', desc: 'Non ha mai vinto, ma è arrivato sul podio (primi 3 posti) in almeno metà dei tornei conclusi giocati.' },
    { tier: 'OUTSIDER', Icon: Flame, color: 'text-violet-600 dark:text-violet-400', desc: 'Non ha mai vinto, ha fatto almeno un podio, ma meno spesso della metà dei tornei giocati.' },
    { tier: 'SFIDANTE', Icon: Swords, color: 'text-slate-500 dark:text-muted-foreground', desc: 'Ha giocato almeno un torneo concluso ma non è mai arrivato sul podio.' },
    { tier: 'ESORDIENTE', Icon: FlagIcon, color: 'text-emerald-600 dark:text-emerald-400', desc: 'Non ha ancora giocato un torneo concluso di quel gioco (e quel gioco ha comunque almeno un torneo creato).' },
]

// Struttura a due livelli: le voci con `children` sono un'etichetta di
// raggruppamento non cliccabile (come "LA COLLEZIONE" nell'immagine di
// riferimento), le sotto-voci sono le sezioni di contenuto vere e proprie.
const SECTIONS = [
    { key: 'lega', label: 'La Lega', icon: Flag },
    {
        label: 'Tornei', icon: Trophy, children: [
            { key: 'tornei-classic', label: 'Classifica Unica' },
            { key: 'tornei-gironi', label: 'Gironi' },
        ],
    },
    { key: 'badge', label: 'Badge', icon: Crown },
    {
        label: 'Schedina', icon: ScrollText, children: [
            { key: 'schedina-classic', label: 'Classifica Unica' },
            { key: 'schedina-gironi', label: 'Gironi' },
        ],
    },
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
    const [flippedCard, setFlippedCard] = useState(null)
    // Quali gruppi (Tornei/Schedina) sono espansi in sidebar — cliccando
    // sull'intestazione del gruppo si apre/chiude il relativo sottomenu.
    const [openGroups, setOpenGroups] = useState({})
    const toggleGroup = (label) => setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }))

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

                <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
                    {/* Sidebar — sempre verticale (anche su mobile): una lista a scorrimento
                        orizzontale con molte voci annidate era facile da non vedere fino in fondo. */}
                    <nav className="lg:sticky lg:top-20 lg:self-start">
                        <div className="flex flex-col gap-0.5 rounded-2xl border border-slate-200 dark:border-border bg-white dark:bg-card p-2">
                            {SECTIONS.map((item) => {
                                if (item.children) {
                                    const groupActive = item.children.some((c) => c.key === activeSection)
                                    const isOpen = openGroups[item.label] ?? groupActive
                                    return (
                                        <div key={item.label} className="pt-2 first:pt-0">
                                            <button
                                                type="button"
                                                onClick={() => toggleGroup(item.label)}
                                                className={`flex w-full items-center gap-2 rounded-xl px-4 py-1.5 text-[11px] font-black uppercase tracking-widest transition ${groupActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-muted-foreground hover:text-slate-600 dark:hover:text-foreground'}`}
                                            >
                                                <item.icon size={13} />
                                                <span className="flex-1 text-left">{item.label}</span>
                                                <ChevronDown size={13} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                                            </button>
                                            {isOpen && (
                                                <div className="ml-3 mt-0.5 space-y-0.5 border-l-2 border-slate-100 dark:border-border pl-3">
                                                    {item.children.map((sub) => (
                                                        <button
                                                            key={sub.key}
                                                            type="button"
                                                            onClick={() => setActiveSection(sub.key)}
                                                            className={`block w-full rounded-xl px-3 py-2 text-left text-xs font-bold uppercase tracking-wide transition ${
                                                                activeSection === sub.key
                                                                    ? 'bg-emerald-500 text-white shadow-md'
                                                                    : 'text-slate-600 dark:text-muted-foreground hover:bg-slate-100 dark:hover:bg-muted'
                                                            }`}
                                                        >
                                                            {sub.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )
                                }
                                return (
                                    <button
                                        key={item.key}
                                        type="button"
                                        onClick={() => setActiveSection(item.key)}
                                        className={`flex items-center gap-2.5 rounded-xl px-4 py-3 text-left text-xs font-black uppercase tracking-widest transition ${
                                            activeSection === item.key
                                                ? 'bg-emerald-500 text-white shadow-md'
                                                : 'text-slate-600 dark:text-muted-foreground hover:bg-slate-100 dark:hover:bg-muted'
                                        }`}
                                    >
                                        <item.icon size={15} />
                                        {item.label}
                                    </button>
                                )
                            })}
                        </div>
                    </nav>

                    {/* Content pane */}
                    <div className="min-w-0 rounded-3xl border border-slate-200 dark:border-border bg-white dark:bg-card p-6 md:p-8">

                        {activeSection === 'lega' && (
                            <div>
                                <SectionHeading>La Lega</SectionHeading>

                                {/* Due foto affiancate invece di una sola a piena larghezza: con
                                    object-cover un riquadro quadrato/verticale ritaglia molto meno
                                    di un banner panoramico, qualunque sia l'inquadratura originale. */}
                                <div className="mt-5 grid grid-cols-2 gap-3">
                                    <EditableContentImage
                                        contentKey="faq_lega_founding"
                                        imageUrl={images.faq_lega_founding}
                                        onUploaded={handleImageUploaded}
                                        alt="La nascita della Lega — foto 1"
                                        className="aspect-square h-auto w-full rounded-2xl md:aspect-4/3"
                                        fit="cover"
                                    />
                                    <EditableContentImage
                                        contentKey="faq_lega_founding_2"
                                        imageUrl={images.faq_lega_founding_2}
                                        onUploaded={handleImageUploaded}
                                        alt="La nascita della Lega — foto 2"
                                        className="aspect-square h-auto w-full rounded-2xl md:aspect-4/3"
                                        fit="cover"
                                    />
                                </div>

                                <div className="prose prose-slate dark:prose-invert mt-6 max-w-none text-sm leading-relaxed text-slate-700 dark:text-muted-foreground">
                                    <h3 className="mb-3 text-lg font-black text-slate-900 dark:text-foreground">L'inizio della rivalità</h3>
                                    <p><strong>16 marzo 2026.</strong></p>
                                    <p>Nessuno aveva pianificato davvero quello che sarebbe successo.</p>
                                    <p>
                                        Un torneo organizzato all'ultimo momento. <strong>Quattro giocatori. Quattro Nintendo DS.
                                        Una sola cosa in palio: la vittoria.</strong>
                                    </p>
                                    <p>
                                        Al <strong>HOG di Curno</strong> scendono in pista {foundersLine} per quello che sarebbe
                                        diventato, senza che nessuno lo sapesse ancora, <strong>il primo torneo della storia della Lega</strong>.
                                    </p>
                                    <p>Le gare si fanno sempre più intense. Ogni curva conta, ogni errore può costare la vittoria e la rivalità cresce giro dopo giro.</p>
                                    <p>Alla fine, però, c'è un solo vincitore:</p>
                                    <h3 className="text-lg font-black text-slate-900 dark:text-foreground">
                                        <FounderName name="Shiba" players={players} />.
                                    </h3>
                                    <p>E <FounderName name="Josh" players={players} />?</p>
                                    <p><strong>Josh è distrutto.</strong></p>
                                    <p>Lacrime. Disperazione. Rabbia.</p>
                                    <p>Ma soprattutto nasce una certezza:</p>
                                    <p><strong>questa storia non può finire qui.</strong></p>
                                    <p>
                                        La voglia di rivincita cresce. <FounderName name="Josh" players={players} /> vuole tornare
                                        in pista. Questa volta, però, con un solo obiettivo: battere <FounderName name="Shiba" players={players} />.
                                    </p>
                                    <p>Shiba, però, sta per partire per il Giappone e tornerà soltanto a luglio.</p>
                                    <p>Ed è proprio durante questa pausa che succede qualcosa.</p>
                                    <p>
                                        <FounderName name="Josh" players={players} /> e <FounderName name="Gradino" players={players} /> iniziano
                                        a parlare.
                                    </p>
                                    <p>Quello che era nato come un semplice torneo improvvisato comincia a trasformarsi in un'idea:</p>
                                    <blockquote>E se invece di organizzare semplicemente altre partite, creassimo una vera lega?</blockquote>
                                    <p>Una lega per chi ama Mario Kart. Con tornei, classifiche, rivalità, nuovi giocatori e una community.</p>
                                    <p>Il gruppo cresce. Arrivano nuovi giocatori. Le sfide aumentano.</p>
                                    <p>E, poco alla volta, nasce anche il sito.</p>
                                    <p>
                                        Quella che era iniziata come <strong>una sfida improvvisata tra quattro amici, quattro console
                                        e una serata al HOG</strong>, diventa qualcosa di molto più grande.
                                    </p>
                                    <p className="font-black text-slate-900 dark:text-foreground">
                                        Una sconfitta.<br />
                                        Una rivincita.<br />
                                        Un'idea.<br />
                                        Una lega.
                                    </p>
                                    <p>E tutto è iniziato il <strong>16 marzo 2026</strong>.</p>
                                </div>
                            </div>
                        )}

                        {activeSection === 'tornei-classic' && (
                            <div>
                                <SectionHeading>Tornei · Classifica Unica</SectionHeading>
                                <div className="mt-5 space-y-3 text-sm text-slate-700 dark:text-muted-foreground">
                                    <p><strong className="text-slate-900 dark:text-foreground">Struttura e partecipanti:</strong> tutti i partecipanti gareggiano insieme nello stesso insieme di gare; la classifica finale è la somma dei punti di tutte le gare.</p>
                                    <p><strong className="text-slate-900 dark:text-foreground">Svolgimento:</strong> massimo 20 gare per torneo. Ogni giocatore sceglie un numero di circuiti pari a gare/partecipanti (arrotondato per eccesso); i circuiti scelti si esauriscono, i rimanenti vengono sorteggiati tra quelli non ancora usati (pool resettato se si esauriscono tutti).</p>
                                    <p><strong className="text-slate-900 dark:text-foreground">Punteggio:</strong> dinamico in base al numero di partecipanti n: 1° = n+1, 2° = n-1, 3° = n-2, a scalare di 1 fino a 1 punto per l'ultimo (es. con 8 giocatori: 9,7,6,5,4,3,2,1).</p>
                                    <p><strong className="text-slate-900 dark:text-foreground">Spareggi (Duello):</strong> a parità su qualunque blocco di posizioni consecutive (non solo il podio, anche a 3+ giocatori in parità) si attiva un Duello — gare secche su piste scelte a caso, primo a 3 vittorie conquista la posizione. Le gare di duello non contano per la classifica/statistiche.</p>
                                    <p><strong className="text-slate-900 dark:text-foreground">Conclusione:</strong> mai automatica — risolti tutti i duelli aperti, un admin deve premere "Decreta Vincitore".</p>
                                </div>

                                <SubHeading>Regole comuni a entrambi i formati</SubHeading>
                                <p className="text-sm text-slate-700 dark:text-muted-foreground">
                                    Massimo <strong>1 carta potere in totale</strong> per giocatore per torneo (non per fase), le carte non si possono usare nelle gare di spareggio/duello, e la schedina si chiude quando il torneo inizia (nessuna deadline automatica a tempo — decide l'admin).
                                </p>
                            </div>
                        )}

                        {activeSection === 'tornei-gironi' && (
                            <div>
                                <SectionHeading>Tornei · Gironi</SectionHeading>
                                <div className="mt-5 space-y-3 text-sm text-slate-700 dark:text-muted-foreground">
                                    <p><strong className="text-slate-900 dark:text-foreground">Requisiti:</strong> almeno 8 partecipanti. I gironi vengono calcolati automaticamente: il minor numero possibile, massimo 4 giocatori a girone, scarto massimo di 1 tra gironi.</p>
                                    <p><strong className="text-slate-900 dark:text-foreground">Fase 1 — Gironi:</strong> ogni girone gioca gare indipendenti dagli altri, punteggio fisso per gara (1°=5, 2°=3, 3°=2, 4°=1). I circuiti sono indipendenti per girone e si resettano a ogni nuova fase.</p>
                                    <p><strong className="text-slate-900 dark:text-foreground">Qualificazione:</strong> i primi 2 di ogni girone avanzano. In caso di parità: prima vittorie di gara, poi podi, poi uno spareggio al meglio (primo a 2 vittorie).</p>
                                    <p><strong className="text-slate-900 dark:text-foreground">Fase 2:</strong> se i qualificati sono al massimo 4, si passa direttamente a Finale (podio) + Consolazione/"Finalina". Se sono più di 4, si generano prima le Semifinali (batterie da massimo 4); chi viene eliminato in semifinale si unisce ai 3°/4° dei gironi nella Finalina invece di restare senza piazzamento.</p>
                                    <p><strong className="text-slate-900 dark:text-foreground">Spareggi di Finale/Consolazione:</strong> stesso meccanismo del Duello (primo a 3 vittorie), ma la Finale e la Consolazione hanno spareggi completamente separati e indipendenti tra loro.</p>
                                    <p><strong className="text-slate-900 dark:text-foreground">Conclusione:</strong> come per la Classifica Unica, mai automatica.</p>
                                </div>

                                <SubHeading>Regole comuni a entrambi i formati</SubHeading>
                                <p className="text-sm text-slate-700 dark:text-muted-foreground">
                                    Massimo <strong>1 carta potere in totale</strong> per giocatore per torneo (non per fase), le carte non si possono usare nelle gare di spareggio/duello, e la schedina si chiude quando il torneo inizia (nessuna deadline automatica a tempo — decide l'admin).
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

                        {activeSection === 'schedina-classic' && (
                            <div>
                                <SectionHeading>Schedina · Classifica Unica</SectionHeading>
                                <p className="mt-3 text-sm text-slate-600 dark:text-muted-foreground">
                                    Prima dell'inizio di un torneo, ogni partecipante può compilare <strong>una sola
                                    schedina</strong> con i propri pronostici. Si chiude quando il torneo inizia (o
                                    prima, se un admin la chiude manualmente) — nessuna deadline automatica a tempo.
                                    Ogni pronostico indovinato vale <strong>3 punti</strong>.
                                </p>

                                <SubHeading>Pronostici</SubHeading>
                                <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700 dark:text-muted-foreground">
                                    <li><strong className="text-slate-900 dark:text-foreground">Classifica generale:</strong> ordine completo di arrivo — ogni posizione esatta vale 3 punti.</li>
                                    <li><strong className="text-slate-900 dark:text-foreground">Maggior Streak:</strong> chi farà più vittorie consecutive (valido solo dalle 2 vittorie in su).</li>
                                    <li><strong className="text-slate-900 dark:text-foreground">Il Duello:</strong> testa a testa tra due giocatori scelti dall'admin.</li>
                                    <li><strong className="text-slate-900 dark:text-foreground">Distanza 1°-2°:</strong> non assegna punti, è il criterio di spareggio — vince chi ci si è avvicinato di più al distacco reale tra 1° e 2° classificato.</li>
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

                        {activeSection === 'schedina-gironi' && (
                            <div>
                                <SectionHeading>Schedina · Gironi</SectionHeading>
                                <p className="mt-3 text-sm text-slate-600 dark:text-muted-foreground">
                                    Prima dell'inizio di un torneo, ogni partecipante può compilare <strong>una sola
                                    schedina</strong> con i propri pronostici. Si chiude quando il torneo inizia (o
                                    prima, se un admin la chiude manualmente) — nessuna deadline automatica a tempo.
                                    Ogni pronostico indovinato vale <strong>3 punti</strong>.
                                </p>

                                <SubHeading>Pronostici</SubHeading>
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

                                <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-2">
                                    <PowerCard type="master" mode="flip" flipped={flippedCard === 'master'} onFlip={() => setFlippedCard(flippedCard === 'master' ? null : 'master')} />
                                    <PowerCard type="guscio" mode="flip" flipped={flippedCard === 'guscio'} onFlip={() => setFlippedCard(flippedCard === 'guscio' ? null : 'guscio')} />
                                </div>

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
                                <p className="mt-5 text-center text-[10px] text-slate-400 dark:text-slate-500">Le carte vengono attivate dall'organizzatore nella pagina di gestione del torneo. Una volta consumate non sono più recuperabili.</p>
                            </div>
                        )}
                    </div>
                </div>
            </section>
        </AppLayout>
    )
}

export default Faq
