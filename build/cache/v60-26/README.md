# Cache v60.26 — historique des œufs Pokémon GO

Sources téléchargées une fois (24/11/2026) et versionnées. Rien n’est inventé à partir de ces fichiers.

| Fichier | Source |
| --- | --- |
| `leekduck-eggs.html` | [Leek Duck — Eggs](https://leekduck.com/eggs/) (pool de la saison en cours, Twilight Trails, maj. 14/09/2026) |
| `leekduck-event-forever-forward.html` | [Leek Duck — Forever Forward](https://leekduck.com/events/season-23-forever-forward/) (liste d’éclosions de début de saison, la page précise qu’elle n’est pas exhaustive) |
| `scrapedduck-eggs.json` | [ScrapedDuck](https://raw.githubusercontent.com/bigfoott/ScrapedDuck/data/eggs.json) (pool actuel uniquement ; la branche `data` est écrasée toutes les 10 min, pas d’historique) |
| `serebii-previouseggs.html` | [Serebii — Previous Egg Pokémon](https://www.serebii.net/pokemongo/previouseggs.shtml) (archives par saison ou par période) |
| `serebii-eggs.html` | [Serebii — Pokémon Eggs](https://www.serebii.net/pokemongo/eggs.shtml) (encore titrée Forever Forward le 24/11/2026) |
| `serebii-seasons.html` | [Serebii — Seasons](https://www.serebii.net/pokemongo/seasons.shtml) (liste des saisons, pas les pools) |
| `bulbapedia-Season_GO.json` | [Bulbapedia — Season (GO)](https://bulbapedia.bulbagarden.net/wiki/Season_(GO)) (dates ; tables « Hatchable Pokémon » = extraits, pas des pools complets) |
| `bulbapedia-List_of_Eggs_in_Pokemon_GO.json` | [Bulbapedia — List of Eggs in Pokémon GO](https://bulbapedia.bulbagarden.net/wiki/List_of_Eggs_in_Pokémon_GO) (liste courante, page signalée comme obsolète ; non utilisée comme pool) |
| `pokepedia-evenements-20XX.json` | [Poképédia — listes d’événements](https://www.pokepedia.fr/Liste_des_%C3%A9v%C3%A9nements_de_Pok%C3%A9mon_GO_(2026)) (noms français des saisons, CC BY-NC-SA 3.0 FR) |
| `report.json` | Rapport du script `build/fix-v60-26.mjs` (contrôles, écarts, non reliés) |

Les URL `https://leekduck.com/eggs/?season=…` renvoient le pool actuel, pas un historique : elles n’ont pas été conservées.
