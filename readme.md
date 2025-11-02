# Werkvoorraad

Deze repository bevat tooling voor het maken van een zogenaamde "werkvoorraad". Een werkvoorraad is een overzichtelijk dashboard waarin openstaand werk getoond wordt.

De werkvoorraad bestaat uit *items* en *hoofdstukken*. Een item toont openstaand werk als een kopieerbare lijst identifiers, met een beschrijvend label en informatie over de onderliggende query. Hoofdstukken groeperen items en andere hoofdstukken, zodat er structuur wordt aangebracht in het openstaande werk. Aan items kan naar behoefte aanvullende informatie worden toegevoegd, zoals instructies of toelichtingen.

De volgende tooling is onderdeel van deze repository:

- Custom web components voor het tonen van de werkvoorraad items
- Script voor het converteren van json specificaties naar een werkvoorraad
- Template voor een werkvoorraad

Zie hier een [voorbeeld werkvoorraad](https://uu-asc.github.io/csa-werkvoorraad/) gemaakt van onzin gegevens.

## Gebruik

### Navigatie en zoeken
Je kunt de werkvoorraad doorzoeken met het zoekveld (te vinden in het control panel dat te openen is via het tandwiel ⚙). De zoekfunctie filtert hoofdstukken/items op basis van hun label. Met `Escape` kun je het zoekveld legen. Je zoekterm wordt bewaard tussen sessies.

### Items selecteren en kopiëren
Klik binnen een item op een button om de waarden behorend bij de in het label genoemde identifier naar je klembord te kopiëren. Rechtsbovenin verschijnt kort "gekopieerd!" ter bevestiging. Voor items met veel resultaten (>500) worden automatisch batches aangemaakt zodat je deze  in kleinere porties kunt kopiëren. Batch buttons worden (tijdens de sessie) doorgestreept nadat je erop geklikt hebt.

### Filteren op tags
Items kunnen worden getagd met metadata (bv. type, prioriteit, categorie). In het control panel kun je filteren op deze tags:

- **Klik** op een tag om items met die tag te tonen
- **Shift+klik** op een tag om *alleen* items met die tag te tonen
- Klik op de cirkel naast "Alles" om alle tags voor die categorie te selecteren/deselecteren
- Als geen enkele tag geselecteerd is, worden alle items getoond
- Je kunt meerdere tags binnen en tussen categorieën combineren
- Tag filters worden bewaard tussen sessies

Items zonder tags verschijnen alleen als je expliciet filtert op "(geen)".

### Weergave opties
- **Toon lege items**: Toon ook items zonder resultaten (indien je wilt  zien welke queries zijn uitgevoerd maar geen resultaten opleverden)
- **Zen**: Verberg counts in hoofdstuk headers voor een rustiger overzicht
- **Toon/Verberg alles**: Klap alle hoofdstukken in/uit
- **Shift+klik op hoofdstuk**: Klap dat hoofdstuk én alle onderliggende hoofdstukken in/uit
- **Dark mode**: Schakel tussen licht en donker thema (volgt je systeem voorkeur)

De instellingen voor filters, zoektermen en of individuele hoofdstukken open/dicht staan worden bewaard tussen sessies.

### Query details
Items kunnen worden uitgeklapt om extra details te tonen (zoals instructies, toelichtingen of andere metadata). Klik op de **Ｑ** button bij een item om de onderliggende SQL query en metadata te bekijken. Je kunt individuele metadata waarden naar je klembord kopiëren door erop te klikken. De volledige SQL query kopieer je met de ⧉ button rechtsbovenin.

## Specificatie

Met json definieer je de items die in de werkvoorraad getoond moeten worden. De specificatie bestaat uit *hoofdstukken* en *items*. 

### Items
Een item bevat informatie over openstaand werk. In de specificatie ziet een item er als volgt uit:
```json
{
    "label": "Controleer ontbrekende gegevens",
    "data": {
        "query": "missing_data.sql",
        "where": ["status = 'open'", "priority > 1"]
    },
    "tags": {
        "type": "controle",
        "prioriteit": "hoog"
    },
    "instructie": "Check de volgende records..."
}
```

Een item heeft minimaal een `label` dat het item beschrijft en een `data` object. Het `data` object wordt in het [werkvoorraad script](./src/python/werkvoorraad/werkvoorraad.py) doorgestuurd naar een functie die de data ophaalt. Deze functie dien je zelf aan te leveren. Van belang is hier dat de argumenten in `data` de functie in staat stellen om de benodigde gegevens uit de database op te halen en te retourneren als een `dict[str, list]`. De sleutels in de output verwijzen naar de naam van de identifier en de lijst bevat de identifiers die door de gebruiker moeten worden bekeken/afgehandeld.

#### Tags (optioneel)
Met het `tags` object kun je metadata aan items toevoegen waarmee gefilterd kan worden. Tags zijn handig om items te categoriseren (type werk, prioriteit, verantwoordelijke, etc.). Een tag kan een enkele waarde hebben of een lijst van waarden:
```json
"tags": {
    "type": "controle",
    "prioriteit": ["hoog", "urgent"],
    "status": "open"
}
```

Items zonder tags, of items waarbij een specifieke tag-categorie ontbreekt, zijn nog steeds filterbaar via de "(geen)" optie in het control panel.

#### Aanvullende velden (optioneel)
Aan een item kunnen aanvullende velden worden toegevoegd (zoals `instructie`, `toelichting`, `opmerking`, etc.). Deze velden worden standaard verborgen maar zijn zichtbaar wanneer je een item uitklapt. Dit houdt de werkvoorraad overzichtelijk terwijl gedetailleerde informatie toch beschikbaar blijft.

### Hoofdstukken
Een hoofdstuk is een container voor items. Een hoofdstuk kan ook weer andere hoofdstukken bevatten. Met hoofdstukken kun je iaw structuur aanbrengen in de werkvoorraad. In de specificatie ziet een hoofdstuk er als volgt uit:
```json
{
    "id": "data_kwaliteit",
    "label": "Data kwaliteit",
    "items": [
        {...},
        {...}
    ]
}
```

Net als een item bevat een hoofdstuk minimaal een `label` dat het hoofdstuk beschrijft. Daarnaast moet bij een hoofdstuk ook een (in de context van de werkvoorraad) uniek `id` worden vastgelegd. Het `id` is nodig zodat de werkvoorraad voor een gebruiker kan bijhouden welke hoofdstukken zijn opengeklapt. Tot slot bevat een hoofdstuk `items`: een lijst van hoofdstukken en/of items. In tegenstelling tot een item kunnen er geen aanvullende eigenschappen bij een hoofdstuk worden vastgelegd (preciezer gezegd: dit kan wel maar deze eigenschappen worden genegeerd).

Zie hier de [specificatie](demo_specificatie.json) waarmee de bovenstaande voorbeeld werkvoorraad is gemaakt.