import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
    Flag, Trophy, ScrollText, Zap, Scale,
    Crown, ChevronDown, PartyPopper, Award,
} from 'lucide-react'
import AppLayout from '@/components/layout/AppLayout'
import PlayerLink from '@/components/common/PlayerLink'
import EditableContentImage from '@/components/common/EditableContentImage'
import PowerCard from '@/components/cards/PowerCard'
import TierMedallion from '@/components/community/badges/TierMedallion'
import ExtraMedallion from '@/components/community/badges/ExtraMedallion'
import { TIER_BADGE_IMAGES, EXTRA_BADGE_IMAGES } from '@/lib/playerBadges'
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
    { tier: 'LEGGENDA', code: 'leggenda', color: 'text-amber-600 dark:text-amber-400', desc: 'Ha vinto TUTTI i tornei conclusi di quel gioco a cui ha partecipato (100% di vittorie), oppure ha vinto almeno 3 tornei di quel gioco.' },
    { tier: 'CAMPIONE', code: 'campione', color: 'text-amber-600 dark:text-amber-400', desc: 'Ha vinto almeno un torneo concluso di quel gioco (ma non tutti).' },
    { tier: 'VETERANO', code: 'veterano', color: 'text-blue-600 dark:text-blue-400', desc: 'Non ha mai vinto, ma è arrivato sul podio (primi 3 posti) in almeno metà dei tornei conclusi giocati.' },
    { tier: 'OUTSIDER', code: 'outsider', color: 'text-violet-600 dark:text-violet-400', desc: 'Non ha mai vinto, ha fatto almeno un podio, ma meno spesso della metà dei tornei giocati.' },
    { tier: 'ESORDIENTE', code: 'esordiente', color: 'text-emerald-600 dark:text-emerald-400', desc: 'Ha giocato almeno un torneo concluso ma non è mai arrivato sul podio.' },
    { tier: 'SFIDANTE', code: 'sfidante', color: 'text-slate-500 dark:text-muted-foreground', desc: 'Non ha ancora giocato un torneo concluso di quel gioco (e quel gioco ha comunque almeno un torneo creato).' },
]

// Indicatori extra indipendenti dal tier — vedi lib/playerBadges.js
// EXTRA_BADGES, stesso concetto spiegato qui in linguaggio da regolamento.
const EXTRA_BADGES_FAQ = [
    { key: 'streak', title: 'Costanza', desc: 'Ha giocato almeno 3 tornei consecutivi dello stesso gioco, senza saltarne nemmeno uno.' },
    { key: 'improving', title: 'In crescita', desc: 'Il piazzamento medio nelle ultime 3 partecipazioni concluse è migliore rispetto alle 3 precedenti (serve avere almeno 6 tornei conclusi giocati).' },
    { key: 'consolation', title: 'Re della Consolazione', desc: 'Ha vinto almeno una volta la Finale di Consolazione (il bracket "minore" dei tornei a gironi, per chi non arriva in Finale principale).' },
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
    { key: 'amichevoli', label: 'Amichevoli', icon: PartyPopper },
    { key: 'badge', label: 'Badge', icon: Crown },
    { key: 'punti-campionato', label: 'Punti Campionato', icon: Award },
    {
        label: 'Schedina', icon: ScrollText, children: [
            { key: 'schedina-classic', label: 'Classifica Unica' },
            { key: 'schedina-gironi', label: 'Gironi' },
        ],
    },
    { key: 'card', label: 'Card', icon: Zap },
    { key: 'penalita', label: 'Penalità e Bonus', icon: Scale },
]

const SectionHeading = ({ children }) => (
    <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-foreground">{children}</h2>
)

const SubHeading = ({ children }) => (
    <h3 className="mt-8 mb-3 text-sm font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">{children}</h3>
)

// Chiavi valide cliccabili (esclude le voci-gruppo senza `key`, es. "Tornei"/"Schedina").
const VALID_SECTION_KEYS = new Set(
    SECTIONS.flatMap((item) => (item.children ? item.children.map((c) => c.key) : [item.key]))
)

const Faq = () => {
    const { players } = useAppData()
    const [searchParams] = useSearchParams()
    const requestedSection = searchParams.get('section')
    const [activeSection, setActiveSection] = useState(
        VALID_SECTION_KEYS.has(requestedSection) ? requestedSection : 'lega'
    )
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
                                                <span className="flex-1 text-left uppercase">{item.label}</span>
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
                                    <p><strong className="text-slate-900 dark:text-foreground">Svolgimento:</strong> massimo 20 gare per torneo.</p>
                                    <p><strong className="text-slate-900 dark:text-foreground">Selezione circuiti — dipende dal gioco:</strong></p>
                                    <ul className="list-disc space-y-1.5 pl-5">
                                        <li><strong className="text-slate-900 dark:text-foreground">Mario Kart DS:</strong> ogni giocatore sceglie un numero di circuiti pari a gare/partecipanti (arrotondato per eccesso); i circuiti scelti si esauriscono, i rimanenti vengono sorteggiati tra quelli non ancora usati (pool resettato se si esauriscono tutti).</li>
                                        <li><strong className="text-slate-900 dark:text-foreground">Mario Kart 8 Deluxe:</strong> la pista è sempre sorteggiata automaticamente ad ogni gara — nessuna scelta manuale. L'unico modo per scegliere deliberatamente una pista è la Carta Master, effetto "Annulla pista" (vedi <strong>Card</strong>).</li>
                                    </ul>
                                    <p><strong className="text-slate-900 dark:text-foreground">Punteggio della singola gara:</strong> dinamico in base al numero di partecipanti n: 1° = n+1, 2° = n-1, 3° = n-2, a scalare di 1 fino a 1 punto per l'ultimo (es. con 8 giocatori: 9,7,6,5,4,3,2,1). Determina il vincitore <em>di questo torneo</em> — diverso dai <strong>Punti Campionato</strong>, fissi per posizione finale, che valgono per la classifica generale (vedi sezione dedicata).</p>
                                    <p><strong className="text-slate-900 dark:text-foreground">Spareggi (Duello):</strong> a parità su qualunque blocco di posizioni consecutive (non solo il podio, anche a 3+ giocatori in parità) si attiva un Duello — gare secche su piste scelte a caso, primo a 3 vittorie conquista la posizione. Le gare di duello non contano per la classifica/statistiche.</p>
                                    <p><strong className="text-slate-900 dark:text-foreground">Conclusione:</strong> mai automatica — risolti tutti i duelli aperti, un admin deve premere "Decreta Vincitore".</p>
                                </div>

                                <SubHeading>Regole comuni a entrambi i formati</SubHeading>
                                <p className="text-sm text-slate-700 dark:text-muted-foreground">
                                    Ogni carta ha un numero di usi proprio (Carta Master 1 uso in entrambi i formati; Guscio Blu fino a 3 in Classifica Unica, <strong className="text-slate-900 dark:text-foreground">1 solo uso</strong> nei tornei a Gironi — vedi la sezione <strong>Card</strong>), le carte non si possono usare nelle gare di spareggio/duello (il Guscio Blu, in più, nemmeno nelle Semifinali dei tornei a gironi), e la schedina si chiude quando il torneo inizia (nessuna deadline automatica a tempo — decide l'admin).
                                </p>
                            </div>
                        )}

                        {activeSection === 'tornei-gironi' && (
                            <div>
                                <SectionHeading>Tornei · Gironi</SectionHeading>
                                <div className="mt-5 space-y-3 text-sm text-slate-700 dark:text-muted-foreground">
                                    <p><strong className="text-slate-900 dark:text-foreground">Requisiti:</strong> almeno 8 partecipanti. I gironi vengono calcolati automaticamente: il minor numero possibile, massimo 4 giocatori a girone, scarto massimo di 1 tra gironi. Esempi: 8 → 4+4, 9 → 3+3+3, 10 → 4+3+3, 11 → 4+4+3, 12 → 4+4+4.</p>
                                    <p><strong className="text-slate-900 dark:text-foreground">Fase 1 — Gironi:</strong> ogni girone gioca gare indipendenti dagli altri. Punteggio dinamico in base ai piloti effettivamente in gara in quel girone: 4 piloti → 1°=5, 2°=3, 3°=2, 4°=1; 3 piloti (girone da 3) → 1°=4, 2°=2, 3°=1. Le piste sono sempre sorteggiate automaticamente (nessuna scelta manuale — l'unica eccezione è la Carta Master, vedi <strong>Card</strong>); i circuiti sono indipendenti per girone e si resettano a ogni nuova fase. Valori di riferimento per il numero di gare (organizzativi, non un tetto): 8 per girone/semifinale, 12 in Finale/Finalina.</p>
                                    <p><strong className="text-slate-900 dark:text-foreground">Qualificazione:</strong> i primi 2 di ogni girone avanzano — <em>vale identico per un girone da 3 o da 4</em>, cambia solo il punteggio delle gare, non chi si qualifica. In caso di parità: prima vittorie di gara, poi podi, poi uno spareggio al meglio (primo a 2 vittorie, piste random).</p>
                                    <p><strong className="text-slate-900 dark:text-foreground">Fase 2:</strong> se i qualificati sono al massimo 4, si passa direttamente a Finale (podio) + Consolazione/"Finalina". Se sono più di 4, si generano prima le Semifinali (batterie da massimo 4); chi viene eliminato in semifinale si unisce ai 3°/4° dei gironi nella Finalina invece di restare senza piazzamento.</p>
                                    <p className="rounded-xl bg-slate-50 dark:bg-muted px-3 py-2.5">
                                        <strong className="text-slate-900 dark:text-foreground">Esempio con gironi da 3:</strong> 9 giocatori → 3 gironi da 3 → 2 qualificati ciascuno = 6 qualificati (&gt; 4) → si passa dalle Semifinali, 2 batterie da 3 → la Finale prende i migliori 4, gli altri 2 eliminati in semifinale si uniscono ai 3 esclusi dai gironi → Finalina da 5.<br />
                                        <strong className="text-slate-900 dark:text-foreground">Esempio con gironi misti:</strong> 10 giocatori → 1 girone da 4 + 2 gironi da 3 → sempre 2 qualificati per girone = 6 qualificati totali, stessa dinamica di sopra (Semifinali, poi Finale + Finalina da 5).
                                    </p>
                                    <p><strong className="text-slate-900 dark:text-foreground">Spareggi di Finale/Consolazione:</strong> stesso meccanismo del Duello (primo a 3 vittorie), ma la Finale e la Consolazione hanno spareggi completamente separati e indipendenti tra loro.</p>
                                    <p><strong className="text-slate-900 dark:text-foreground">Statistiche:</strong> solo le gare di Girone e della Finale principale (Final 4) contano per placement index, podi, vittorie di gara e classifica generale/per-gioco. Le Semifinali e la Finalina/Consolazione <em>non</em> contribuiscono a nessuna statistica aggregata — sono fasi con campi più piccoli che altrimenti la gonfierebbero rispetto a chi ha raggiunto la Finale vera.</p>
                                    <p><strong className="text-slate-900 dark:text-foreground">Conclusione:</strong> come per la Classifica Unica, mai automatica.</p>
                                </div>

                                <SubHeading>Regole comuni a entrambi i formati</SubHeading>
                                <p className="text-sm text-slate-700 dark:text-muted-foreground">
                                    Ogni carta ha un numero di usi proprio (Carta Master 1 uso; Guscio Blu <strong className="text-slate-900 dark:text-foreground">1 solo uso</strong> nei tornei a Gironi, fino a 3 in Classifica Unica — vedi la sezione <strong>Card</strong>), le carte non si possono usare nelle gare di spareggio/duello (il Guscio Blu, in più, nemmeno nelle Semifinali), e la schedina si chiude quando il torneo inizia (nessuna deadline automatica a tempo — decide l'admin).
                                </p>
                            </div>
                        )}

                        {activeSection === 'amichevoli' && (
                            <div>
                                <SectionHeading>Amichevoli</SectionHeading>
                                <p className="mt-3 text-sm text-slate-600 dark:text-muted-foreground">
                                    Un torneo può essere marcato come <strong className="text-slate-900 dark:text-foreground">amichevole</strong> —
                                    in stile "fight club": si gioca per divertimento, senza niente in palio. Un modo in più
                                    per far girare il sito anche fuori dai tornei ufficiali.
                                </p>
                                <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700 dark:text-muted-foreground">
                                    <li>Nessuna <strong className="text-slate-900 dark:text-foreground">Card</strong>, nessuna <strong className="text-slate-900 dark:text-foreground">Schedina</strong>.</li>
                                    <li>Non conta per <strong className="text-slate-900 dark:text-foreground">Badge</strong>, classifiche o statistiche aggregate.</li>
                                    <li>Nessuna notifica di chiusura a tutti i partecipanti.</li>
                                    <li>Nessun vincitore ufficiale da decretare: il torneo si chiude semplicemente segnandolo come concluso — restano comunque gare e classifica in tempo reale come in un torneo normale.</li>
                                    <li>Funziona sia in Classifica Unica che a Gironi, con lo stesso numero minimo di partecipanti già previsto per ciascun formato.</li>
                                    <li>Non compare nello Storico Tornei pubblico per chi non è amministratore — resta visibile solo a chi lo gestisce.</li>
                                </ul>
                                <p className="mt-5 text-center text-[10px] text-slate-400">Per ora un torneo amichevole può essere creato solo dagli amministratori.</p>
                            </div>
                        )}

                        {activeSection === 'punti-campionato' && (
                            <div>
                                <SectionHeading>Punti Campionato</SectionHeading>
                                <p className="mt-3 text-sm text-slate-600 dark:text-muted-foreground">
                                    Due sistemi di punteggio coesistono, per due scopi diversi.
                                </p>

                                <SubHeading>Punti-gara vs Punti Campionato</SubHeading>
                                <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700 dark:text-muted-foreground">
                                    <li><strong className="text-slate-900 dark:text-foreground">Punti-gara</strong> (sezioni Tornei): variabili in base al numero di partecipanti alla gara, sommati determinano il vincitore/podio <em>ufficiale di quel singolo torneo</em>.</li>
                                    <li><strong className="text-slate-900 dark:text-foreground">Punti Campionato</strong>: fissi in base alla <em>posizione finale</em> raggiunta nel torneo, sempre gli stessi indipendentemente da quanti partecipanti c'erano — pensati per confrontare tornei di dimensioni diverse e sommarli nel tempo in un'unica classifica generale.</li>
                                </ul>

                                <SubHeading>Come si calcolano</SubHeading>
                                <p className="text-sm text-slate-700 dark:text-muted-foreground">
                                    Alla conclusione di un torneo non amichevole, ogni giocatore riceve punti campionato in base solo alla propria posizione finale — un 1° posto vale sempre <strong className="text-slate-900 dark:text-foreground">25 punti</strong>, sia in un torneo da 4 giocatori sia in uno da 12.
                                </p>
                                <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
                                    {[['1°', 25], ['2°', 19], ['3°', 15], ['4°', 11], ['5°', 9], ['6°', 7], ['7°', 6], ['8°', 5], ['9°', 4], ['10°', 3], ['11°', 2], ['12°', 1]].map(([pos, pts]) => (
                                        <div key={pos} className="rounded-xl border border-slate-200 dark:border-border px-2 py-2 text-center">
                                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{pos}</p>
                                            <p className="text-sm font-black text-violet-600 dark:text-violet-400">{pts} pt</p>
                                        </div>
                                    ))}
                                </div>
                                <p className="mt-3 text-sm text-slate-700 dark:text-muted-foreground">
                                    Un giocatore ritirato non riceve punti campionato per quel torneo; le posizioni dei restanti si comprimono senza lasciare "buchi" in classifica.
                                </p>

                                <SubHeading>Dove si vedono</SubHeading>
                                <p className="text-sm text-slate-700 dark:text-muted-foreground">
                                    Sono il <strong className="text-slate-900 dark:text-foreground">criterio principale</strong> della classifica generale (pagina Classifiche), seguiti da tornei vinti, Placement Index (media dei piazzamenti normalizzata), percentuale podi e gare giocate come ulteriori spareggi a parità.
                                </p>
                            </div>
                        )}

                        {activeSection === 'badge' && (
                            <div>
                                <SectionHeading>Badge</SectionHeading>
                                <p className="mt-3 text-sm text-slate-600 dark:text-muted-foreground">
                                    Ogni giocatore ha un badge di livello <strong>per ogni gioco</strong>, calcolato sui soli
                                    tornei conclusi a cui ha partecipato — si può essere Leggenda su un gioco e Sfidante
                                    su un altro. Un gioco senza nessun torneo creato non produce alcun badge.
                                </p>
                                <div className="mt-5 space-y-3">
                                    {BADGE_TIERS_FAQ.map(({ tier, code, color, desc }) => (
                                        <div key={tier} className="flex items-start gap-3 rounded-2xl border border-slate-200 dark:border-border p-4">
                                            {TIER_BADGE_IMAGES[code] ? (
                                                <img src={TIER_BADGE_IMAGES[code]} alt={`Badge ${tier}`} className="h-10 w-10 shrink-0 object-contain" />
                                            ) : (
                                                <TierMedallion tier={code} size={40} />
                                            )}
                                            <div>
                                                <p className={`text-sm font-black uppercase tracking-wide ${color}`}>{tier}</p>
                                                <p className="mt-1 text-sm text-slate-600 dark:text-muted-foreground">{desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <SubHeading>Riconoscimenti extra</SubHeading>
                                <p className="text-sm text-slate-600 dark:text-muted-foreground">
                                    Oltre al livello, si possono ottenere fino a tre indicatori aggiuntivi — non
                                    sostituiscono il badge di livello, si affiancano: premiano la costanza e i
                                    miglioramenti, non solo le vittorie.
                                </p>
                                <div className="mt-4 space-y-3">
                                    {EXTRA_BADGES_FAQ.map(({ key, title, desc }) => (
                                        <div key={key} className="flex items-start gap-3 rounded-2xl border border-slate-200 dark:border-border p-4">
                                            {EXTRA_BADGE_IMAGES[key] ? (
                                                <img src={EXTRA_BADGE_IMAGES[key]} alt={`Badge ${title}`} className="h-10 w-10 shrink-0 object-contain" />
                                            ) : (
                                                <ExtraMedallion type={key} size={40} />
                                            )}
                                            <div>
                                                <p className="text-sm font-black uppercase tracking-wide text-slate-700 dark:text-foreground">{title}</p>
                                                <p className="mt-1 text-sm text-slate-600 dark:text-muted-foreground">{desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <p className="mt-4 text-sm text-slate-600 dark:text-muted-foreground">
                                    Chi salta 3 tornei di fila dello stesso gioco riceve inoltre un promemoria
                                    di rientro (una tantum, non si ripete ad ogni torneo successivo) — un
                                    invito, non un obbligo.
                                </p>
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

                                <SubHeading>Carta Master — 1 uso, quattro effetti a scelta</SubHeading>
                                <p className="text-sm text-slate-700 dark:text-muted-foreground">Assegnata a chi vince la schedina (e ai pari merito). Chi la possiede sceglie <strong>uno</strong> dei quattro effetti al momento dell'uso:</p>
                                <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700 dark:text-muted-foreground">
                                    <li><strong className="text-slate-900 dark:text-foreground">Annulla pista:</strong> invalida la pista scelta da un avversario per la sua prossima gara e la sostituisce con quella scelta dal possessore della carta. Nei tornei dove la pista è sempre a sorteggio (Mario Kart 8 Deluxe in Classifica Unica, e qualunque torneo a Gironi — vedi le sezioni Tornei), questo effetto diventa l'unico modo per scegliere deliberatamente una pista: il possessore la sceglie lui stesso al posto del sorteggio automatico.</li>
                                    <li><strong className="text-slate-900 dark:text-foreground">Impone personaggio e/o setup:</strong> obbliga un avversario a usare, per una gara, il personaggio e/o il setup (kart, ruote, e su Mario Kart 8 Deluxe anche l'aliante — componente che Mario Kart DS non ha) scelto dal possessore della carta. La scelta effettiva si concorda e applica dal vivo tra i giocatori; il sistema ne registra solo l'uso.</li>
                                    <li><strong className="text-slate-900 dark:text-foreground">Immunità dal Guscio Blu:</strong> rende chi la usa immune agli effetti di un Guscio Blu avversario per una gara (nessun bersaglio: protegge chi la attiva).</li>
                                    <li><strong className="text-slate-900 dark:text-foreground">Gara extra:</strong> aggiunge una gara a fine torneo (nessun bersaglio).</li>
                                </ul>
                                <p className="text-sm text-slate-700 dark:text-muted-foreground">I primi due effetti possono essere dichiarati dall'admin anche prima che la gara che devono influenzare esista: restano "in sospeso" e vengono applicati automaticamente alla prossima gara che coinvolge il bersaglio scelto.</p>

                                <SubHeading>Guscio Blu — usi variabili per formato</SubHeading>
                                <p className="text-sm text-slate-700 dark:text-muted-foreground">Assegnata a chi arriva ultimo (e al penultimo, con 7+ partecipanti). Un solo effetto: <strong className="text-slate-900 dark:text-foreground">tutti i giocatori tranne chi la usa restano fermi per un giro</strong> — chi la usa parte con un giro pieno di vantaggio, gli altri partono quando il primo inizia il secondo giro (regola di gioco dal vivo: il tracker registra soltanto l'uso).</p>
                                <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700 dark:text-muted-foreground">
                                    <li>Può essere attivata <strong className="text-slate-900 dark:text-foreground">fino a 3 volte</strong> nello stesso torneo a <strong className="text-slate-900 dark:text-foreground">Classifica Unica</strong>.</li>
                                    <li>Nei tornei <strong className="text-slate-900 dark:text-foreground">a Gironi</strong>, solo <strong className="text-slate-900 dark:text-foreground">1 volta</strong>: il campo ridotto per girone/batteria rende l'effetto proporzionalmente più forte.</li>
                                </ul>
                                <p className="text-sm text-slate-700 dark:text-muted-foreground">Una volta usata la prima volta, gli usi restanti restano vincolati a quel torneo e non si possono risparmiare per uno successivo. <strong className="text-slate-900 dark:text-foreground">Non è utilizzabile nelle gare di Semifinale</strong> (oltre agli spareggi, vietati per ogni carta — vedi sotto): la Carta Master resta invece utilizzabile in Semifinale.</p>

                                <SubHeading>Limiti generali</SubHeading>
                                <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700 dark:text-muted-foreground">
                                    <li><strong className="text-slate-900 dark:text-foreground">Stesso gioco:</strong> una carta vinta in un gioco (es. Mario Kart DS) non si può usare in un torneo di un altro gioco.</li>
                                    <li><strong className="text-slate-900 dark:text-foreground">Niente spareggi:</strong> le carte non si possono usare nelle gare di Duello/spareggio.</li>
                                    <li><strong className="text-slate-900 dark:text-foreground">Guscio Blu, niente Semifinali:</strong> in più rispetto al punto sopra, non è utilizzabile nelle gare di Semifinale dei tornei a Gironi.</li>
                                </ul>
                                <p className="mt-5 text-center text-[10px] text-slate-400">Le carte vengono attivate dall'organizzatore nella pagina di gestione del torneo. Una volta esauriti tutti gli usi non sono più recuperabili.</p>
                            </div>
                        )}

                        {activeSection === 'penalita' && (
                            <div>
                                <SectionHeading>Penalità e Bonus</SectionHeading>
                                <p className="mt-3 text-sm text-slate-600 dark:text-muted-foreground">
                                    Regolamento delle penalità e dei bonus applicabili ai partecipanti in caso di
                                    ritardi, assenze, abbandoni anticipati, comportamenti non conformi allo spirito
                                    della competizione, o contributi all'organizzazione. Le penalità/bonus vengono
                                    applicate come rettifiche punti, visibili nella classifica del torneo interessato
                                    con il motivo dell'assegnazione.
                                </p>

                                <SubHeading>1. Ritardo</SubHeading>
                                <p className="text-sm text-slate-700 dark:text-muted-foreground">
                                    Chi arriva in ritardo al torneo <strong className="text-slate-900 dark:text-foreground">senza una motivazione valida</strong> riceve
                                    una penalità di <strong className="text-rose-600 dark:text-rose-400">-5 punti</strong>, applicata direttamente alla classifica del torneo in questione.
                                </p>

                                <SubHeading>2. Assenza ingiustificata</SubHeading>
                                <p className="text-sm text-slate-700 dark:text-muted-foreground">
                                    Chi <strong className="text-slate-900 dark:text-foreground">non si presenta al torneo senza una motivazione valida</strong> viene escluso dal <strong className="text-slate-900 dark:text-foreground">torneo successivo</strong>.
                                    In caso di recidiva il provvedimento si aggrava: al <strong className="text-slate-900 dark:text-foreground">terzo</strong> provvedimento di esclusione per assenza ingiustificata scatta il <strong className="text-rose-600 dark:text-rose-400">ban dalla Lega</strong>.
                                </p>

                                <SubHeading>3. Abbandono anticipato</SubHeading>
                                <p className="text-sm text-slate-700 dark:text-muted-foreground">
                                    Chi <strong className="text-slate-900 dark:text-foreground">abbandona il torneo prima della sua conclusione senza una motivazione valida</strong> riceve un <strong className="text-slate-900 dark:text-foreground">richiamo ufficiale</strong>.
                                    Al <strong className="text-slate-900 dark:text-foreground">terzo</strong> richiamo per abbandono anticipato ingiustificato scatta il <strong className="text-rose-600 dark:text-rose-400">ban dalla Lega</strong>.
                                </p>

                                <SubHeading>4. Comportamenti offensivi o antisportivi</SubHeading>
                                <p className="text-sm text-slate-700 dark:text-muted-foreground">
                                    Qualsiasi comportamento offensivo, provocatorio o gravemente antisportivo verso uno o più partecipanti comporta <strong className="text-rose-600 dark:text-rose-400">-20 punti</strong>.
                                    Nei casi ritenuti particolarmente gravi o eccessivi, l'organizzazione può disporre anche l'<strong className="text-slate-900 dark:text-foreground">esclusione immediata dal torneo in corso</strong> più un <strong className="text-slate-900 dark:text-foreground">richiamo ufficiale</strong>, fino a provvedimenti più severi — incluso il <strong className="text-rose-600 dark:text-rose-400">ban dalla Lega</strong> — nei casi più gravi.
                                </p>

                                <SubHeading>5. Bonus Fair Play</SubHeading>
                                <p className="text-sm text-slate-700 dark:text-muted-foreground">
                                    Chi durante il torneo dimostra un comportamento particolarmente corretto, rispettoso e sportivo può ricevere <strong className="text-emerald-600 dark:text-emerald-400">+5 punti</strong>, assegnati esclusivamente quando l'organizzazione lo ritiene meritevole.
                                </p>

                                <SubHeading>6. Bonus per aiuto nell'organizzazione</SubHeading>
                                <p className="text-sm text-slate-700 dark:text-muted-foreground">
                                    Chi fornisce un aiuto concreto nell'organizzazione o nella gestione del torneo può ricevere <strong className="text-emerald-600 dark:text-emerald-400">+2 punti</strong>, in base al contributo effettivamente fornito.
                                </p>

                                <SubHeading>7. Motivazioni valide</SubHeading>
                                <p className="text-sm text-slate-700 dark:text-muted-foreground">
                                    Per "motivazione valida" si intendono circostanze personali, familiari, lavorative, di salute o altre situazioni impreviste che rendano ragionevolmente impossibile rispettare gli impegni presi. La validità viene valutata dall'organizzazione della Lega.
                                </p>

                                <SubHeading>8. Recidività e provvedimenti disciplinari</SubHeading>
                                <p className="text-sm text-slate-700 dark:text-muted-foreground">
                                    Penalità e richiami vengono registrati nello storico disciplinare di ciascun partecipante e la recidività viene considerata nell'applicazione dei provvedimenti. Per situazioni non espressamente disciplinate, l'organizzazione può valutare il comportamento e adottare un provvedimento proporzionato alla gravità del caso.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </section>
        </AppLayout>
    )
}

export default Faq
