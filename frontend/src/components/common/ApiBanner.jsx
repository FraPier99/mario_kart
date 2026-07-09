const toneClasses = {
    error: 'border-red-300 bg-red-50 text-red-900 dark:border-red-700 dark:bg-red-950 dark:text-red-200',
    info: 'border-slate-300 dark:border-border bg-slate-50 dark:bg-muted text-slate-700 dark:text-muted-foreground',
}

const ApiBanner = ({ title, message, tone = 'error', action }) => {
    if (!message) {
        return null
    }

    return (
        <div
            className={`rounded-xl border-2 px-5 py-4 ${toneClasses[tone]}`}
            style={{ boxShadow: 'var(--circuit-shadow-sm)' }}
        >
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <div className="font-title text-[11px] tracking-wide">{title}</div>
                    <p className="mt-1.5 text-sm leading-relaxed">{message}</p>
                </div>
                {action}
            </div>
        </div>
    )
}

export default ApiBanner
