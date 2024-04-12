# Werkvoorraad

Deze repository bevat tooling voor het making van een zogenaamde "werkvoorraad". Een werkvoorraad is een overzichtelijk dashboard waarin openstaand werk getoond wordt. Openstaand werk, wordt in de basis getoond als een kopieerbare lijst ids. Elk item heeft standaard een label en bevat informatie over de query op basis waarvan het item is gegenereerd. Daarnaast kan naar behoefte aanvullende informatie worden toegevoegd aan items. De volgende tooling is onderdeel van deze repository:

- Custom web components voor het tonen van de werkvoorraad items
- Script voor het converteren van json specifcaties naar een werkvoorraaad
- Template voor een werkvoorraad

Zie hier een [VOORBEELD WERKVOORRAAD](https://uu-asc.github.io/csa-werkvoorraad/) gemaakt van onzin gegevens.

## Specificatie
Met json definieer je de items die in de werkvoorraad getoond moeten worden. De specificatie bestaat uit *hoofdstukken* en *items*. Een item bevat informatie over openstaand werk. In de specificatie ziet een item er als volgt uit:

```json
{
    "label": "..."
    "data": {<...>},
    <...>
}
```

Een *item* heeft dus ten minste een `label` dat het item beschrijft en een `data` object. Het `data` object wordt in het [werkvoorraad script](./werkvoorraad/werkvoorraad.py) doorgestuurd naar een functie die de data ophaalt. Deze functie dien je zelf aan te leveren. Van belang is hier dat de argumenten in `data` de functie in staat stellen om de benodigde gegevens uit de database op te halen en te retourneren als een `dict[str, list]`. De sleutels in de output verwijzen naar de naam van de identifier en de lijst bevat de identifiers die door de gebruiker moeten worden bekeken/afgehandeld. Aan het item kunnen overige velden worden toegevoegd. Deze worden ook in de werkvoorraad getoond. Zo is het mogelijk om bv. een `instructie` of `toelichting` veld toe te voegen aan de output.

Een *hoofdstuk* is een container voor items. Een hoofdstuk kan ook weer andere hoofdstukken bevatten. Met hoofstukken kun je iaw structuur aanbrengen in de werkvoorraad. In de specificatie ziet een hoofdstuk er als volgt uit:

```json
{
    "id": "...",
    "label": "...",
    "items": [
        <...>
    ]
}
```

Net als een item bevat een hoofdstuk ten minste een label dat het item beschrijft. Daarnaast moet bij een hoofdstuk ook een (in de context van de werkvoorraad) uniek `id` worden vastgelegd (het `id` is nodig zodat de werkvoorraad voor een gebruiker kan bijhouden welke hoofdstukken zijn opengeklapt). Tot slot bevat een hoofdstuk `items`: een lijst van hoofdstukken/items. In tegenstelling tot een item kunnen er geen aanvullende eigenschappen bij een hoofdstuk worden vastgelegd (preciezer gezegd: dit kan wel maar deze eigenschappen worden genegeerd).

Zie hier de [SPECIFICATIE](demo_specificatie.json) waarmee de bovenstaande voorbeeld werkvoorraad is gemaakt.
