# Werkvoorraad
[VOORBEELD](https://uu-asc.github.io/csa-werkvoorraad/)

Script om een handzaam en overzichtelijk dashboard met werkvoorraad te genereren. Alleen de items met resultaten worden getoond (maar alle items zijn met een druk op de knop raadpleegbaar).

Items kunnen worden toegevoegd via 'config.json'. Een item bestaat uit:
- Omschrijving
- Eén of meerdere queries
- Optioneel een instructie

Per item worden de gedefinieerde queries uitgevoerd op de `moedertabel`. De resultaten worden opgenomen als een kopieerbare lijst met studentnummers en sinh_ids.

## Config
Het configuratiebestand 'config.json' bevat de volgende elementen:
- **collegejaar** : collegejaar waarop werkvoorraad betrekking heeft
- **outfile** : naam en (evt. relatieve) pad waar output moet worden opgeslagen
- **queries** : de toe te voegen items onderverdeeld in hoofdstukken
- **ops** : de operaties waarmee de moedertabel moet worden opgebouwd
- **defaults** : default queries waarnaar verwezen kan worden in de item definitie

## Queries
Het is mogelijk om meerdere queries op te geven bij een item. In dat geval komt een record alleen dan in de output voor als het record aan alle queries voldoet. De queries worden iaw met `and` uitgevoerd. Het resultaat vormt een *intersectie* van de opgegeven queries.

In de queries verwijs je naar defaults op basis van een sleutel. De defaults kunnen geneste queries bevatten. Neem het volgende voorbeeld:

```json
"kansrijk": {
    "herinschrijving": "soort == 'herinschrijving'",
    "master": "soort in ['master', 'selma'] and (toelatingsbeschikking == 'Ja.'",
    "premaster": "soort in ['premaster', 'educatief'] and toelatingsbeschikking == 'Ja.'",
    "bachelor": {
        "matching": {
            "regulier": "soort == 'bachelor' and k_studiekeuzecheck == 'GROEN'",
            "geen_skc": "soort == 'bachelor' and statusbesluit_ooa.isna()"
        },
        "fixus": "soort == 'fixus' and plaatsingsbewijs == 'Status plaatsing is Geaccepteerd.'",
        "selectie": {
            "ppeb": "soort == 'selectie' and opleiding == 'PPEB' and statusbesluit_ooa == 'T'",
            "b&ob": "soort == 'selectie' and opleiding == 'B&OB' and k_toelatingsbeschikking == 'GROEN'",
            "ucu": "soort == 'selectie' and opleiding == 'LASB-UC' and statusbesluit_ooa in ['S', 'T']"
        }
    }
}
```

Je kunt naar één van de queries verwijzen door de volledige sleutel op te geven, bijv. `<kansrijk|bachelor|selectie|ucu>` verwijst naar:

```json
"ucu": "soort == 'selectie' and opleiding == 'LASB-UC' and statusbesluit_ooa in ['S', 'T']"
```

Je kunt echter ook naar een hele tak van queries verwijzen, bijv. `<kansrijk|bachelor>`. In dat geval zullen alle queries die in de tak kansrijk > bachelor vallen met een `or` verbonden worden. Het resultaat is in dat geval een *vereniging* van de opgegeven queries.

## Executie
De `werkvoorraad` module kan als script worden uitgevoerd:

`python werkvoorraad.py`

Daarnaast kunnen de volgende optionele argumenten worden opgegeven die de waarden in config.json overschrijven:
- collegejaar
- outfile

Verder kun je voor testdoeleinden met de flag `--random` een werkvoorraad maken met fake data (zie [voorbeeld](https://uu-asc.github.io/csa-werkvoorraad/)).
