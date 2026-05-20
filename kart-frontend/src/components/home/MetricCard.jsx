const toneClasses = {
    emerald: 'from-emerald-400 via-emerald-600 to-emerald-900 border-emerald-400/30 shadow-[0_10px_25px_-5px_rgba(16,185,129,0.3)]',
    red: 'from-red-400 via-red-600 to-red-900 border-red-400/30 shadow-[0_10px_25px_-5px_rgba(239,68,68,0.3)]',
    slate: 'from-slate-700 via-slate-900 to-zinc-950 border-slate-700/50 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.2)]',
}

const MetricCard = ({ icon, value, label, tone = 'emerald' }) => {
    return (
        <div className={`relative overflow-hidden flex flex-col gap-4 items-center justify-center p-6 rounded-2xl bg-gradient-to-br text-white border transition-all duration-300 hover:scale-105 group ${toneClasses[tone]}`}>
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none mix-blend-overlay" />
            {icon}
            <h2 className="text-4xl font-black tracking-wider text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.35)]">
                {value}
            </h2>
            <p className="text-xs font-black uppercase tracking-widest text-white/90 group-hover:text-white transition-colors text-center">
                {label}
            </p>
        </div>
    )
}

export default MetricCard
