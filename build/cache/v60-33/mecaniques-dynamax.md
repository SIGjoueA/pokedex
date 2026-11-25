# Mécaniques des raids Dynamax et de l’Aventure Dynamax (sources, v60.33)

Sources privilégiées : Bulbapedia (Max Raid Battle, Dynamax Adventure), Pokémon.com (conseils de raid), Serebii, datamines / analyses Sibuna_Switch citées par Bulbapedia. Les guides Game8 servent uniquement à vérifier le haut de quelques classements.

## Raid Dynamax (Épée / Bouclier, dens des Terres Sauvages, Isolarmure, Couronneige)

Confirmé :

- Quatre dresseurs (joueurs ou PNJ). Un Pokémon par dresseur.
- Défaite si le combat atteint 10 tours, ou si 4 K.O. ont lieu au total (même Pokémon compris).
- Après un K.O., le dresseur passe le tour suivant à encourager (effet aléatoire, non chiffré ici), puis le Pokémon revient avec tous ses PV.
- Un seul Pokémon de l’équipe peut être Dynamax à la fois, pendant 3 tours. L’hôte reçoit l’énergie au tour 1 ; si on ne l’utilise pas, elle passe au suivant. Dans notre modèle (un attaquant de référence), l’attaquant se Dynamax au tour 1 et reste Dynamax 3 tours, puis attaque en taille normale.
- Le boss est Dynamax pendant tout le combat. 5★ : niveau typique 55–60, multiplicateur de PV 3,0× (Bulbapedia). Nous prenons le niveau 60 et 3,0×.
- À partir de 3★, barrière de 2 à 8 segments selon la « puissance défensive » du boss (donnée exacte par boss rarement publiée). 3–4★ : une barrière. 5★ : deux barrières, parfois la première dès le début du combat.
- Pendant la barrière : dégâts fortement réduits, effets secondaires largement bloqués, capacités de statut échouent. Une attaque infligeant des dégâts retire 1 segment ; une capacité Dynamax / Gigamax ou une capacité K.O. en un coup en retire 2. Les coups multiples ne retirent un segment que sur le premier coup.
- Quand la barrière tombe : Défense et Défense spéciale du boss −2, plus une part des dégâts « retenus ».
- Onde de choc (avant la première attaque du tour, avec une chance) : soigne le statut du boss, annule ses baisses de stats (ses bonus restent), remet à zéro toutes les stats des joueurs, et peut ignorer certains talents (liste de Brise Moule).

Retenu pour le classement 5★ :

- 10 tours, 4 K.O. = échec. Un tour d’encouragement puis retour à PV max (les encouragements ne sont pas chiffrés).
- Attaquant Dynamax aux tours 1–3 (niveau Dynamax 10), capacités Max ou G-Max ; ensuite capacités normales.
- Deux barrières de 4 segments (valeur générique au milieu de 2–8, incertitude notée) : la première à 60 % des PV, la seconde à 30 % des PV. Pendant la barrière, dégâts ×0,20 (réduction « sévère », chiffre exact non établi — hypothèse documentée) et compteur de segments. Après rupture : −2 Déf / −2 Déf. Spé.
- Une annulation des boosts du joueur à chaque apparition de barrière (l’onde de choc n’a pas de probabilité publiée stable ; on la cadencer ainsi plutôt que de tirer au hasard).
- Deux listes : attaque directe, et avec une accumulation (un boost), uniquement hors barrière et après la dernière annulation prévue.
- PNJ et encouragements : en note seulement.
- Score : dégâts infligés² / dégâts encaissés, comme en ÉV. Plancher de dégâts encaissés 3 % des PV.

Écarté :

- 1★ et 2★ (et 3–4★) : hors classement, trop peu d’enjeu comparé aux 5★.
- Chiffrage des encouragements et des PNJ.
- Nombre exact de segments par boss (2–8, rarement dataminé de façon exploitable pour tout l’index).
- Probabilité tour par tour de l’onde de choc.
- Multiplicateur exact des dégâts sous barrière (hypothèse ×0,20).

## Aventure Dynamax (légendaires, Grand Antre Dynamax, Couronneige)

Confirmé (Bulbapedia, Gamer Guides, concordances communautaires typées données) :

- Suite de raids dans l’Antre Dynamax : trois combats « normaux » puis le légendaire (ou Ultra-Chimère après l’indice). Location : Pokémon de prêt au départ, puis éventuellement un Pokémon capturé en chemin. On ne vient pas avec son équipe de boîte.
- Les PV des Pokémon de l’équipe se conservent d’un combat à l’autre (sauf baies / échange).
- 4 vies partagées sur toute l’aventure. 10 tours par combat, ou 0 vie restante = échec de l’aventure.
- Pas de barrière, ni sur les rencontres intermédiaires, ni sur le légendaire. Les capacités de statut et les baisses de stats fonctionnent, mais le boss peut occasionnellement les annuler.
- Les Pokémon intermédiaires n’attaquent qu’une fois par tour. Le légendaire attaque deux fois par tour sous 50 % des PV (« attaques de plus en plus désespérées »).
- Taux de capture 100 %. Un seul exemplaire de chaque légendaire par sauvegarde.

Retenu pour le classement des légendaires :

- Pas de barrière (les tours ne sont pas « perdus » à casser un bouclier).
- 10 tours, 4 K.O. sur ce combat (hypothèse de départ : on arrive au légendaire avec les 4 vies ; une note indique que des K.O. précédents peuvent déjà les avoir entamées).
- Le légendaire attaque deux fois sous 50 % des PV. Niveau 70. Multiplicateur de PV : 3,0× en l’absence d’une valeur distincte publiée (même ordre que les 5★ de dens).
- Attaquant Dynamax aux tours 1–3, puis normal. Deux listes (directe / accumulation), l’accumulation n’étant pas bloquée par une barrière ; une annulation générique à 50 % des PV (le boss « peut » neutraliser les effets).
- Le classement est un référentiel de types et de Pokémon d’Épée / Bouclier (prêt ou capturés dans l’antre), pas un import de la boîte du joueur.

Écarté :

- Les 226 rencontres intermédiaires de l’expédition (niveau 65) : le périmètre demandé est celui des légendaires.
- Simulation des trois combats précédents (PV restants, vies déjà perdues, objets du randonneur).
- PNJ et encouragements chiffrés.

## Raids Téracristal 5★ (rappel, même méthode que la v60.32)

- Chrono 7 min 30, Orbe Téra (3 attaques), deux listes, script générique.
- Niveau du boss 75 (déjà indiqué dans l’appli). Multiplicateur de PV retenu : 15× (les 6★ sont à 20× / niveau 90).
- Multiplicateurs de bouclier (Bulbapedia / wikiwiki teraraid) :
  - Paldea 5★ : 20 / 35 / 75 (comme Paldea 6★) ;
  - Septentria 5★ : 30 / 60 / 90 ;
  - Terra-Dôme 5★ : 20 / 35 / 75 (comme Paldea, pas comme les 6★ du dôme).
- Durabilité du bouclier : 25 % des PV max (générique, non listée par boss).
- Seuils génériques : bouclier à 60 % des PV ou 50–55 % du chrono ; une annulation des boosts à 60 % du chrono.
- **Munja** : écarté des classements Dynamax / Aventure. Ses 1 PV rendent le plancher de 3 % inopérant et gonfleraient artificiellement le score (dégâts² / dégâts encaissés).
