// Saluto in base all'ora del giorno, al posto di un fisso "Bentornato".
export const getTimeGreeting = (date = new Date()) => {
    const hour = date.getHours()
    if (hour >= 5 && hour < 12) return 'Buongiorno'
    if (hour >= 12 && hour < 18) return 'Buon pomeriggio'
    if (hour >= 18 && hour < 23) return 'Buonasera'
    return 'Buonanotte'
}
