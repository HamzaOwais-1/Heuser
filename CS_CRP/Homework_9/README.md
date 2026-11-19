# Homework 9 – Hamza's Playroom (Flask on Render)

## Render settings
- Language: Python 3
- Branch: main
- Root Directory: CS_CRP/Homework_9
- Build Command: pip install -r requirements.txt
- Start Command: gunicorn app:app --bind 0.0.0.0:$PORT
- Instance Type: Free
- Environment variables: none needed (PokeAPI has no key)

## Files
- app.py: Flask server. Routes /, /game, /portfolio, /api, caches PokeAPI answers for 10 minutes, themed 404.
- requirements.txt: Flask (framework), gunicorn (production server), requests (calls PokeAPI).
- .gitignore: keeps keys, venv and cache folders out of GitHub.
- home/: home page (index.html, home.css, home.js) and 404.html.
- game/: unchanged copy of Homework 6. portfolio/: unchanged copy of Homework 8.
- api/: Tug-of-War Stat Arena (index.html, arena.css, arena.js).

## Run locally
pip install -r requirements.txt
python app.py   (open http://localhost:5000)
