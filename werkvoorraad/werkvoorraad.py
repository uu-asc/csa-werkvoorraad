"""
Maakt een pagina met werkvoorraaditems die zijn gedefinieerd in config.json.

Een werkvoorraad bestaat uit hoofdstukken die elk een of meerdere items kunnen
bevatten. Een item bestaat uit een omschrijving, één of meerdere queries en
eventueel een instructie.

Queries kunnen direct zijn vastgelegd bij het item, maar het is ook mogelijk om
naar één of meerdere queries te verwijzen die onder "abstractions" zijn
gedefenieerd in config.json. Deze "abstractions" fungeren als een soort
bouwstenen waarmee je gemakkelijk een complexere query kunt opbouwen. Verwijzen
naar een bouwsteen gebeurt met een <sleutel> (gebruik vishaken om naar
een bouwsteen te verwijzen).

Een sleutel kan naar één specifieke query in "abstractions" verwijzen, maar
evt. ook naar een subset van queries. In dat laatste geval worden alle
onderliggende queries verenigd. Dit maakt het bijv. mogelijk om met één
instructie zowel toegelaten masters als ingelote bachelors te selecteren.
"""

import os
import sys
import json
import random
from argparse import ArgumentParser
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from string import ascii_uppercase
from jinja2 import Environment, FileSystemLoader

PATH = Path(__file__).parent.parent.resolve()


def fetch_queries(repo, ref=None, sep='|'):
    """
    Recursively fetch all queries from `repo`.
    Subset of `repo` may be retrieved by supplying (nested) key `ref`.

    Parameters
    ==========
    repo : dict
        (Nested) repository of queries.
    ref : str
        (Nested) key for accessing subset of `repo`.
    sep : str
        Seperator to split `ref` with.

    Returns
    =======
    list
    """
    def fetch_all(repo):
        for value in repo.values():
            if isinstance(value, dict):
                for inner_value in fetch_all(value):
                    yield inner_value
            else:
                yield value

    if ref is not None:
        keys = ref.strip('<>').split(sep)
        for key in keys:
            repo = repo[key]

    return list(fetch_all(repo)) if isinstance(repo, dict) else [repo]


def translate_queries(queries, repo):
    """
    Translate references to query abstractions (<key>) into queries that
    moedertabel can execute:
    - Use key to look up query in config.json abstractions
    - If key refers to set op queries then join them with ' or '
    - Regular queries will be returned unmodified
    """
    as_list = lambda i: [i] if isinstance(i, str) else i
    fetch = lambda q: fetch_queries(repo, q) if q.startswith('<') else [q]
    return [' or '.join(fetch(q)) for q in as_list(queries)]


class MaakRapportage:
    CONFIGFILE = PATH / 'config.json'
    LOADER = FileSystemLoader(searchpath=PATH / 'static')
    TEMPLATE = 'template.jinja'
    ENV = Environment(loader=LOADER)

    def __init__(self, outfile=None):
        self.config = json.loads(self.CONFIGFILE.read_text(encoding='utf8'))
        self.outfile = Path(outfile or self.config['output'])
        self.queries = self.config['queries']
        self.abstractions = self.config['abstractions']
        self.data = []
        self.metadata = {}

    def add_results_to_item(self):
        """
        Add the results of the query to the item.
        Modifies in place.
        """
        pass

    def process_queries(self):
        """
        Run all queries and add results to respective items.
        Modifies in place.
        """
        for items in self.queries.values():
            for item in items:
                self.add_results_to_item(item)

    def render(self, **kwargs):
        template = self.ENV.get_template(self.TEMPLATE)
        updated = datetime.now().strftime('%H:%M %d-%m-%Y')
        return template.render(
            updated=updated,
            data=self.queries,
            metadata=self.metadata,
            abstractions=self.abstractions,
            **kwargs
        )

    def write(self, **kwargs):
        html = self.render(**kwargs)
        self.outfile.write_text(html, encoding='utf8')


class WithRandomData(MaakRapportage):
    NUMS = '0123456789'
    LETTERS = ascii_uppercase

    def __init__(self, collegejaar=None, outfile=None):
        super().__init__(**kwargs)
        path = (PATH / 'ex.datamodel.json')
        self.metadata = json.loads(path.read_text(encoding='utf8'))

    def process_queries(self):
        for items in self.queries.values():
            skip_chapter = random.random() > .8
            for item in items:
                skip_item = random.random() < .7
                skip = skip_chapter or skip_item
                self.add_results_to_item(item, skip)

    def add_results_to_item(self, item, skip):
        def fake_sin():
            part1 = self.fake_result(self.LETTERS, 3)
            part2 = self.fake_result(self.NUMS, 5)
            return part1 + part2

        sin = []
        stu = []
        if not skip:
            n = round(random.paretovariate(1))
            for _ in range(n):
                sin.append(fake_sin())
                stu.append(self.fake_result(self.NUMS, 6))
        item['stu'] = stu
        item['sin'] = sin

    @staticmethod
    def fake_result(elems, length):
        return ''.join(random.choices(elems, k=length))


class FromMoedertabel(MaakRapportage):
    def __init__(self, collegejaar, **kwargs):
        super().__init__(**kwargs)
        self.collegejaar = collegejaar or self.config['collegejaar']
        self.ops = self.config['ops']
        self.data = self.laad_moedertabel()
        self.metadata = self.laad_metadata()

    def add_results_to_item(self, item):
        queries = translate_queries(item['query'], self.abstractions)
        data = self.data.query(*queries)
        item['stu'] = data.snr(output='series').to_list()
        item['sin'] = data.snr(output='series', uniek=False).index.to_list()

    def laad_moedertabel(self, collapse=True):
        path_to_moeder = str(PATH.parent / 'moedertabel')
        sys.path.insert(0, path_to_moeder)
        from moedertabel import Moedertabel
        query = "inschrijvingstatus != 'G'"
        moedertabel = Moedertabel(
            'monitor',
            collegejaar=self.collegejaar,
            flush_cache=False,
        )
        moedertabel(*self.ops, query=query, collapse=collapse)
        return moedertabel

    def render(self):
        super().render(collegejaar=self.collegejaar)

    def laad_metadata(self):
        datamodel = defaultdict(dict)
        dtypes = {
            "datetime64[ns]": "date",
            "object": "str",
            "category": "cat",
            "float64": "float",
            "int64": "int",
            "boolean": "bool",
        }
        raw = self.data.metadata.raw
        for op, info in raw.items():
            info = info.get('toegevoegde velden', {})
            if not info:
                continue
            for col, oms in info.items():
                name = col.split(':')[0].strip()
                s = self.data.data[name]
                info = dict(
                    oms = oms,
                    dtype = dtypes.get(s.dtype.name, s.dtype.name),
                    hasnans = s.hasnans,
                )
                if info['dtype'] == 'cat':
                    info['cats'] = list(
                        s
                        .cat.remove_unused_categories()
                        .cat.categories
                    )
                datamodel[op].update({name: info})
        return datamodel


class FromFeather(MaakRapportage):
    def __init__(self, path, **kwargs):
        super().__init__(**kwargs)
        self.data = self.laad_feather(path)

    def add_results_to_item(self, item):
        queries = translate_queries(item['query'], self.abstractions)
        combined = ' and '.join([f"({q})" for q in queries])
        data = self.data.query(combined)
        item['stu'] = data.studentnummer.to_list()

    def laad_feather(self, path):
        import pandas as pd
        return pd.read_feather(path)


if __name__ == '__main__':
    os.chdir(PATH)
    parser = ArgumentParser(description='Maak werkvoorraad')
    parser.add_argument('--path')
    parser.add_argument('--random', action='store_true')
    parser.add_argument('--outfile', '-f')
    args = vars(parser.parse_args())

    kwargs = {k:v for k,v in args.items() if k != 'random'}
    if args['random']:
        werkvoorraad = WithRandomData(**kwargs)
    else:
        werkvoorraad = FromFeather(**kwargs)
    werkvoorraad.process_queries()
    werkvoorraad.write()
