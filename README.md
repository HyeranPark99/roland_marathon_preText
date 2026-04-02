# The Song of Roland — preText Demo

A browser-based literary demo built with [`@chenglou/pretext`](https://github.com/chenglou/pretext), rendering selected Durandal passages from *La Chanson de Roland*.

**Live:** https://roland-marathon-pretext.vercel.app/

---

## What it is

An interactive reading experience exploring what char-level text layout looks like when characters are individually positioned and physically simulated. Click the word **Durandal** to trigger a multi-phase ASCII art sequence. Drag anywhere to scatter the text.

---

## Features

- **preText layout engine** — line breaking and column flow computed in JS without DOM measurement
- **Char-level rendering** — every character is an absolutely-positioned `<span>`, enabling per-character physics
- **Repulsion drag** — characters scatter from the cursor and spring back on release
- **4-phase ASCII art** — static text → colored image ASCII → escape sequence → live video feed
- **Data readout panel** — cargo-manifest style display with live mouse coordinates
- **Durandal glitch effect** — proximity-triggered character scramble on the sword's name

---

## Tech

- [preText](https://github.com/chenglou/pretext) — text layout
- [Vite](https://vitejs.dev/) + TypeScript
- No framework, no runtime dependencies beyond preText and fonts

---

## Architecture

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for a detailed breakdown of the rendering pipeline, module structure, performance profile, and planned improvements.

---

## Running locally

```bash
npm install
npm run dev
```

---

## Disclaimer

This is a **fan project** made for creative and technical exploration purposes only.

- *La Chanson de Roland* is a medieval French epic poem (c. 11th century) and is in the public domain.
- The video footage, imagery, and any other media assets used in this demo are **not owned by me**.
- The in game screen is captured from the game MARATHON (Bungie, 2026).
- This project is **not affiliated with, endorsed by, or connected to** any rights holder.
- No commercial use is intended or implied.

---

## License

The source code is MIT licensed. Media assets retain their respective original rights.
