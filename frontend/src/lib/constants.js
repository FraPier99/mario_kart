export const COLORS = ['#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#14b8a6', '#a855f7', '#eab308']

export const CONFETTI_COLORS = ['#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#14b8a6', '#eab308', '#22c55e']

export const CELEBRATION_PHASE = {
  THANKYOU: 'thankyou',
  DERAPATA: 'derapata',
  BLUE_SHELL: 'blueShell',
  COUNTDOWN: 'countdown',
  WINNER_REVEAL: 'winnerReveal',
  WINNER: 'winner',
}

export const CELEBRATION_DURATION = {
  THANKYOU_MS: 5000,
  DERAPATA_MS: 4000,
  BLUE_SHELL_MS: 5500,
  COUNTDOWN_MS: 35000,
  WINNER_REVEAL_MS: 6000,
}

/**
 * TESTO CELEBRATIVO DI FINE TORNEO
 * ─────────────────────────────────
 * Modifica questa variabile per cambiare il messaggio mostrato
 * durante la fase di ringraziamento al termine del torneo,
 * senza toccare nessun'altro file di codice.
 *
 * Regole:
 *  - Tieni il testo su 2–4 frasi per la leggibilità dell'overlay.
 *  - Non è necessario alcun deploy se l'app è in hot-reload.
 *  - Per varianti per gioco specifico usa THANK_YOU_BY_GAME.
 */
export const THANK_YOU_MESSAGE =
  'Grazie a tutti i partecipanti per aver reso questo torneo un momento speciale. ' +
  'Hanno dato il meglio di sé in ogni gara, sfidandosi con spirito sportivo e passione. ' +
  'Ogni punto conquistato racconta impegno, velocità e la voglia di spingersi oltre. ' +
  'Ora è giunto il momento di svelare il nostro Campione...'

/**
 * TESTI CELEBRATIVI PER GIOCO
 * Mappa game_id → testo personalizzato.
 * Aggiunta di un nuovo gioco: inserire una nuova entry senza
 * modificare nessuna logica di rendering.
 */
export const THANK_YOU_BY_GAME = {
  /** Mario Kart DS — game_id=1 */
  1: THANK_YOU_MESSAGE,
  /** Mario Kart 8 Deluxe — game_id=2 */
  2:
    'Un torneo epico è giunto al termine. ' +
    'Trecento curve, mille emozioni, un solo vincitore. ' +
    'Il podio è pronto. Che abbia inizio la cerimonia!',
}

/**
 * Restituisce il testo celebrativo per il game_id dato,
 * con fallback al testo generico.
 */
export const getThankYouMessage = (gameId) =>
  THANK_YOU_BY_GAME[gameId] ?? THANK_YOU_MESSAGE

// ── Multi-game config ────────────────────────────────────────────
/**
 * CONFIGURAZIONE PER GIOCO
 * Estendi questo oggetto per ogni nuovo capitolo di Mario Kart.
 * I valori qui sostituiscono i default di punteggi.py lato BE.
 */
export const GAME_META = {
  1: { name: 'Mario Kart DS',       maxPlayers: 8,  icon: '🎮', color: '#f59e0b' },
  2: { name: 'Mario Kart 8 Deluxe', maxPlayers: 12, icon: '🚀', color: '#8b5cf6' },
}

export const getGameMeta = (gameId) =>
  GAME_META[gameId] ?? { name: `Game #${gameId}`, maxPlayers: 8, icon: '🎮', color: '#6b7280' }
