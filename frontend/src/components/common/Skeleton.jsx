/**
 * Skeleton — un solo pattern di caricamento condiviso in tutta l'app.
 * Prima convivevano shimmer (in una dozzina di pagine) e un semplice testo
 * "Caricamento..." altrove (Players.jsx, Compare.jsx, CommunityUserPage.jsx,
 * CircuitStats.jsx, ProfileDashboard.jsx) — due idiom diverse per lo stesso
 * concetto. Questi primitivi non sostituiscono lo shimmer già esistente
 * dove già c'è (nessun motivo di toccarlo), coprono solo i punti rimasti
 * col semplice testo.
 */
export const SkeletonPulse = ({ className = '' }) => (
    <div className={`animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-700/50 ${className}`} />
)

export const SkeletonCardGrid = ({ count = 8, className = '' }) => (
    <div className={`grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 ${className}`}>
        {Array.from({ length: count }).map((_, i) => (
            <SkeletonPulse key={i} className="h-32" />
        ))}
    </div>
)

export const SkeletonRows = ({ count = 4, className = '' }) => (
    <div className={`space-y-2 ${className}`}>
        {Array.from({ length: count }).map((_, i) => (
            <SkeletonPulse key={i} className="h-14" />
        ))}
    </div>
)

export const SkeletonLine = ({ className = '' }) => (
    <SkeletonPulse className={`h-4 ${className}`} />
)
