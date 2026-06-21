## Frontend - PROGETTO_KART

Questo progetto usa React + Vite per l'interfaccia. Qui le note rapide specifiche per PROGETTO_KART.

Prerequisiti
- Node.js 16+ e `npm` o `yarn`.

Installazione e avvio

```bash
cd frontend
npm install
npm run dev
# oppure
# yarn
# yarn dev
```

File e punti di interesse
- `frontend/src/main.jsx` — entry React + router
- `frontend/src/pages/TournamentDetail.jsx` — pagina torneo (overlay, podio, spareggio)
- `frontend/src/components/tournaments/WinnerFinalizeCard.jsx` — finalizzazione vincitore + modale pareggi (rilevamento pareggi per punti, scelta risolvi duelli / decreta vincitore)
- `frontend/src/components/tournaments/PodiumDuelCard.jsx` — sezione "Duelli spareggio" (rileva pareggi da standings, genera gare primo a 3 vittorie)
- `frontend/src/index.css` — keyframes e token di animazione (modifica qui per rifinire il podio)
- `frontend/src/services/apiClient.js` — wrapper per chiamate API al backend

Note utili
- Le animazioni globali e i token sono centralizzati in `index.css` per facilità di tuning.
- Per verifiche visive preferisci aprire la pagina torneo con DevTools chiusi (HMR + performance migliori).

---

# Info Vite (template)

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/vite-plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh.
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Faster Refresh.

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information about integrating TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.