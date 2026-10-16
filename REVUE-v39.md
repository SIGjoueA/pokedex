# Revue des points « À vérifier » (audit v33) pour la v39
Recherche web uniquement, aucun changement de code. Date : 16/10/2026.

## 1. Disponibilité GO (Bulbapedia, wiki Fandom GO, RotomLabs, Bulbapedia « Event Pokémon (GO) »)
- Toxizap : sorti le 16/11/2024 → **sorti**.
- Théffroi : sorti le 03/12/2024 → **sorti**.
- Larvadar : sorti le 26/03/2025 → **sorti** (go-overrides a « 850 »: 2026-10-05, à corriger en date réelle / null).
- Embrochet : sorti le 18/08/2026 → **sorti** (Barracuda Ultra Unlock Water Festival).
- Flotillon : sorti le 12/05/2026 → **sorti**.
- Grondogue : sorti le 08/09/2026 → **sorti** ; Dogrino (évolution) → **sorti**.
- Motisma Hélice : sorti le 29/05/2025 (GO Fest Osaka) → **sorti, correct**.
- Meloetta Danse, Prismillon Fantaisie (et Pokéball), Ultra-Necrozma, Darumacho Transe (et Transe de Galar) : **non sortis** → marquer indisponibles (+ retirer la dorure HOME).
- Pikachu à casquette de Sacha (8) : **incertain**. Bulbapedia liste beaucoup de Pikachu à chapeau (Meloetta, Hilbert, équipes…), mais je n'ai pas de confirmation fiable pour les 8 casquettes de Sacha → laisser indisponibles.

## 2. Barons Légendes Arceus (Serebii)
Zarbi, Spiritomb, starters (Brindibou, Héricendre, Moustillon) : **jamais Barons → erreur confirmée**, les exclure. Bébés : très probablement aucun Baron, **à confirmer** espèce par espèce sur la liste Serebii avant d'exclure.

## 3. RF/VF Switch (Game8, Serebii, TechRadar)
**Erreur confirmée** : le Pokédex National se débloque (Maître + 60 Pokémon + Île 1) et les Îles Sevii 4-7 offrent des Pokémon hors Kanto (Johto/Hoenn), plus Ho-Oh, Lugia (Mystiticket) et Deoxys (Aurora Ticket, inclus sur Switch). Le National n'est pas complétable (pas d'échange avec RSE/Colosseum/XD). Mew et Jirachi : **non obtenables**. Correction : ajouter les Pokémon Sevii / événements comme « hors dex » (liste à reprendre de la version GBA, moins ce qui exigeait un échange).

## 4. Isolarmure
Le Pokédex de l'Isolarmure compte **210** entrées → compter 210. Identifier l'entrée en trop dans nos données (probablement Zarude) et l'afficher hors compteur avec la mention « non requis ». À confirmer en regardant les données.

## 5. Méga-gemmes (Poképédia « Méga-Gemme »)
Noms FR officiels disponibles pour toutes les Mégas Z-A et Méga-Dimension, ex. : Raichuïte X / Raichuïte Y, Mélodelfite, Empiflorite, Starossite, Dracolossite, Méganiumite, Roitiflamite, Aligatueurite, Floettite, Draïeulite, Airmurite, Brutalibrite, Golgopathite, Momartikite, Ohmassacrite, Lugulabrite, Néméliosite, Minotaupite, Kravarekite, Hexadronite, Goupelinite, Blindépiquite, Amphinolite, Baggaïdite, Sepiatrocite, Brutapodite, Zygardite, Heatranite, Absolite Z, Carchacrokite Z, Lucarite Z, Crabominablite, Darkraïte, Éokite, Étouraptorite, Floréclatite, Glaivodite, Golemastokite, Magearnite, Mistigrixite, Nigirigonite, Sarmuraïte, Scovilainite, Zeraorite. → **Erreur confirmée**, compléter mega-stones.json depuis cette page.
Primo : afficher **Orbe Bleu** (Kyogre) et **Orbe Rouge** (Groudon) dans les jeux principaux ; GO garde « Énergie Primo » (v38).

## 6. Lieux
- Minidraco RB, Casino de Céladopole : prix du Coin Jeux (échange de jetons) → **erreur confirmée**, méthode « Échange de jetons ».
- « Cave Connecterre », « Lavandia Sea (Intérieur) » : **incertain**, pas vérifié ici ; à reprendre sur la page du lieu Poképédia.

## 7. Chromatiques
- Z-A : Raichu d'Alola et Ramoloss de Galar reçus en mission sont bloqués, mais ils peuvent être chromatiques à l'état sauvage dans les Zones Sauvages Hyperespace (Méga-Dimension) ; Flagadoss de Galar s'obtient par évolution → **erreur confirmée** (GameRant, Serebii, Destructoid). Correction : « chromatique possible (Méga-Dimension) ».
- RF/VF Switch : Mew et Jirachi ne sont **pas obtenables** (ce n'est pas un blocage du chromatique) → les marquer indisponibles. Deoxys (Aurora Ticket) : statut du chromatique **incertain**.

## 8. GO → HOME
Règle Bulbapedia : les Fabuleux ne peuvent pas être transférés de GO vers HOME, **sauf Meltan et Melmetal**. → Ajouter la marque GO à Meltan/Melmetal (et Melmetal Gigamax reste non transférable).

## 9. Noms de formes (Poképédia, choix de Yann)
- Sancoki / Tritosor : « Orient » → **Mer Orient** (et « Mer Occident »).
- Xerneas : « Paisible » → **Mode Paisible** (et « Mode Déchaîné »).
- Darumacho : « Transe » → **Mode Transe** (et « Mode Normal », aussi pour Galar).
