# Homework 9 – Hamza's Playroom (Flask on Vercel)

## Vercel settings
- Framework: Flask (auto-detected)
- Root Directory: CS_CRP/Homework_9
- Build/Start commands: leave empty (Vercel finds app.py and requirements.txt)
- Environment variables: none needed (PokeAPI has no key)
- Note: the page folder is called apipage (not api) because Vercel reserves a root folder named api. It is still served at /api.

## Files
- app.py: Flask server. Routes /, /game, /portfolio, /api, caches PokeAPI answers for 10 minutes, themed 404.
- requirements.txt: Flask (framework), gunicorn (production server), requests (calls PokeAPI).
- .gitignore: keeps keys, venv and cache folders out of GitHub.
- home/: home page (index.html, home.css, home.js) and 404.html.
- game/: unchanged copy of Homework 6. portfolio/: unchanged copy of Homework 8.
- apipage/ (served at /api): Tug-of-War Stat Arena (index.html, arena.css, arena.js).

## Run locally
pip install -r requirements.txt
python app.py   (open http://localhost:5000)
