"""Homework 9 backend (Flask).

Routes
  /                     home page
  /game/                Homework 6 game (copied unchanged)
  /portfolio/           Homework 8 portfolio (copied unchanged)
  /api/                 Tug-of-War Arena page
  /api/pokemon/<name>   JSON for one Pokemon (server-side cached PokeAPI call)
  /api/names            JSON list of all Pokemon names (for the search box)
"""
import os
import time

import requests
from flask import Flask, jsonify, redirect, request, send_from_directory

BASE = os.path.dirname(os.path.abspath(__file__))
POKEAPI = "https://pokeapi.co/api/v2"
CACHE_SECONDS = 600  # remember PokeAPI answers for 10 minutes (bonus point)

app = Flask(__name__, static_folder=None)
_cache = {}  # key -> (timestamp, data)

# Small "back to home" pill added while the game and portfolio pages are served,
# so the original Homework 6 and 8 files never have to be edited.
HOME_PILL = (
    "<style>#hw9-home{position:fixed;left:14px;bottom:14px;z-index:99999;"
    "font:700 14px/1 system-ui,sans-serif;color:#F3EEFF;background:#2C2266;"
    "border:2px solid #FFD84D;border-radius:999px;padding:10px 16px;"
    "text-decoration:none;box-shadow:0 4px 0 #FFD84D}"
    "#hw9-home:hover{transform:translateY(2px);box-shadow:0 2px 0 #FFD84D}</style>"
    '<a id="hw9-home" href="/">Back to home</a>'
)


def cached(key, producer):
    """Return a fresh cached value, or call producer() and remember its result."""
    hit = _cache.get(key)
    if hit and time.time() - hit[0] < CACHE_SECONDS:
        return hit[1]
    data = producer()
    _cache[key] = (time.time(), data)
    return data


def serve_folder(folder, filename, inject=False):
    path = os.path.join(BASE, folder)
    if inject and filename.endswith(".html"):
        with open(os.path.join(path, filename), encoding="utf-8") as f:
            html = f.read()
        return html.replace("</body>", HOME_PILL + "</body>", 1)
    return send_from_directory(path, filename)


# ---------- pages ----------
@app.route("/")
def home():
    return serve_folder("home", "index.html")


@app.route("/home-files/<path:filename>")
def home_files(filename):
    return serve_folder("home", filename)


@app.route("/game")
def game_redirect():
    return redirect("/game/")  # trailing slash keeps relative file paths working


@app.route("/game/", defaults={"filename": "index.html"})
@app.route("/game/<path:filename>")
def game(filename):
    return serve_folder("game", filename, inject=True)


@app.route("/portfolio")
def portfolio_redirect():
    return redirect("/portfolio/")


@app.route("/portfolio/", defaults={"filename": "index.html"})
@app.route("/portfolio/<path:filename>")
def portfolio(filename):
    return serve_folder("portfolio", filename, inject=True)


@app.route("/api")
def api_redirect():
    return redirect("/api/")


@app.route("/api/", defaults={"filename": "index.html"})
@app.route("/api/assets/<path:filename>")
def api_page(filename):
    return serve_folder("api", filename)


# ---------- data (PokeAPI proxy) ----------
def fetch_pokemon(name):
    r = requests.get(f"{POKEAPI}/pokemon/{name}", timeout=8,
                     headers={"User-Agent": "heuser-homework-9"})
    if r.status_code == 404:
        return None
    r.raise_for_status()
    d = r.json()
    sprites = d.get("sprites") or {}
    art = (((sprites.get("other") or {}).get("official-artwork") or {}).get("front_default")
           or sprites.get("front_default") or "")
    return {
        "id": d["id"],
        "name": d["name"],
        "image": art,
        "types": [t["type"]["name"] for t in d.get("types", [])],
        "height": d.get("height", 0) / 10,  # metres
        "weight": d.get("weight", 0) / 10,  # kilograms
        "stats": {s["stat"]["name"]: s["base_stat"] for s in d.get("stats", [])},
    }


@app.route("/api/pokemon/<name>")
def pokemon(name):
    name = name.strip().lower()
    if not name or not name.replace("-", "").isalnum():
        return jsonify(error="That doesn't look like a Pokémon name."), 400
    try:
        data = cached(f"p:{name}", lambda: fetch_pokemon(name))
    except (requests.RequestException, ValueError, KeyError):
        return jsonify(error="The Pokédex didn't answer. Check your connection and try again."), 502
    if data is None:
        _cache.pop(f"p:{name}", None)
        return jsonify(error=f'No Pokémon called "{name}". Check the spelling or pick one from the list.'), 404
    return jsonify(data)


@app.route("/api/names")
def names():
    def producer():
        r = requests.get(f"{POKEAPI}/pokemon?limit=1025", timeout=8)
        r.raise_for_status()
        return [p["name"] for p in r.json()["results"]]
    try:
        return jsonify(cached("names", producer))
    except requests.RequestException:
        return jsonify([])


# ---------- errors ----------
@app.errorhandler(404)
def not_found(_e):
    if request.path.startswith("/api/"):
        return jsonify(error="Nothing here."), 404
    return serve_folder("home", "404.html"), 404


if __name__ == "__main__":
    # Render gives the port in $PORT and needs the server on all addresses.
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))
