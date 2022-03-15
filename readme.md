# Werkvoorraad
[voorbeeld](https://uu-asc.github.io/csa-werkvoorraad/)

Script om een dashboard met werkvoorraad te genereren. Items kunnen worden toegevoegd via 'config.json'. Een item bestaat uit:
- Omschrijving
- Één of meerdere queries
- Optioneel een instructie

Per item worden de gedefinieerde queries uitgevoerd op de `moedertabel`. De resultaten worden opgenomen als een kopieerbare lijst met studentnummers en sinh_ids.
