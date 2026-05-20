const toneClasses = {
    error: 'border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-200',
    info: 'border-slate-200 dark:border-border bg-slate-50 dark:bg-muted text-slate-700 dark:text-muted-foreground',
}

const ApiBanner = ({ title, message, tone = 'error', action }) => {
    if (!message) {
        return null
    }

    return (
        <div className={`rounded-3xl border px-5 py-4 shadow-sm ${toneClasses[tone]}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <div className="text-sm font-black uppercase tracking-widest">{title}</div>
                    <p className="mt-1 text-sm leading-relaxed">{message}</p>
                </div>
                {action}
            </div>
        </div>
    )
}

export default ApiBanner
