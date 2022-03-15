"""
Maakt een pagina met werkvoorraaditems die zijn gedefinieerd in config.json.

Een werkvoorraad bestaat uit hoofdstukken die elk een of meerdere items kunnen
bevatten. Een item bestaat uit een omschrijving, één of meerdere queries en
eventueel een instructie.

Queries kunnen direct zijn vastgelegd bij het item, maar het is ook mogelijk om
naar één of meerdere default queries te verwijzen die eveneens in config.json
zijn gedefinieerd. In dat geval bestaat de query instructie uit een <sleutel>
(gebruik vishaken om naar defaults te verwijzen).

Een sleutel kan naar één query in defaults verwijzen, maar evt. ook naar een
subset. In dat laatste geval worden alle onderliggende queries verenigd. Dit
maakt het bijv. mogelijk om zowel toegelaten masters als ingelote bachelors te
selecteren.
"""

import sys
import json
import random
from string import ascii_uppercase
from argparse import ArgumentParser
from datetime import datetime
from pathlib import Path
from jinja2 import Environment, FileSystemLoader

PATH = Path(__file__).parent.parent.absolute()


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
    Translate references to query defaults (<key>) into queries that
    moedertabel can execute:
    - Use key to look up query in config.json defaults
    - If key refers to set op queries then join them with ' or '
    - Regular queries will be returned unmodified
    """
    as_list = lambda i: [i] if isinstance(i, str) else i
    fetch = lambda q: fetch_queries(repo, q) if q.startswith('<') else [q]
    return [' or '.join(fetch(q)) for q in as_list(queries)]


class MaakRapportage:
    CONFIGFILE = PATH / 'config.json'
    LOADER = FileSystemLoader(searchpath='static')
    TEMPLATE = 'template.jinja'
    ENV = Environment(loader=LOADER)

    def __init__(self, collegejaar=None, outfile=None):
        self.config = json.loads(self.CONFIGFILE.read_text())
        self.collegejaar = collegejaar or self.config['collegejaar']
        self.outfile = Path(outfile) or Path(self.config['output'])
        self.queries = self.config['queries']
        self.defaults = self.config['defaults']
        self.data = []

    def add_results_to_item(self):
        """
        Add the results of the query to the item.
        Modifies in place.
        """
        pass

    def add_results(self):
        for items in self.queries.values():
            for item in items:
                self.add_results_to_item(item)

    def render(self):
        self.add_results()
        template = self.ENV.get_template(self.TEMPLATE)
        updated = datetime.now().strftime('%H:%M %d-%m-%Y')
        return template.render(
            updated=updated,
            collegejaar=self.collegejaar,
            data=self.queries,
        )

    def write(self):
        html = self.render()
        self.outfile.write_text(html, encoding='utf8')


class WithRandomData(MaakRapportage):
    NUMS = '0123456789'
    LETTERS = ascii_uppercase

    def add_results(self):
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
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.ops = self.config['ops']
        self.data = self.laad_moedertabel()

    def add_results_to_item(self, item):
        queries = translate_queries(item['query'], self.defaults)
        data = self.data.query(*queries)
        item['stu'] = data.snr(output='series').to_list()
        item['sin'] = data.snr(output='series', uniek=False).index.to_list()

    def laad_moedertabel(self):
        query = "inschrijvingstatus != 'G'"
        moedertabel = Moedertabel(
            'monitor',
            collegejaar=self.collegejaar,
            flush_cache=False,
        )
        moedertabel(*self.ops, query=query)
        return moedertabel


if __name__ == '__main__':
    parser = ArgumentParser(
        description='Maak werkvoorraad',
        epilog='',
    )
    parser.add_argument('--collegejaar', type=int)
    parser.add_argument('--random', action='store_true')
    parser.add_argument('--outfile', '-f')
    args = vars(parser.parse_args())

    kwargs = {k:v for k,v in args.items() if k != 'random'}
    if args['random']:
        werkvoorraad = WithRandomData(**kwargs)
    else:
        sys.path.insert(0, str(PATH.parent / 'moedertabel'))
        from moedertabel import Moedertabel
        werkvoorraad = FromMoedertabel(**kwargs)

    werkvoorraad.write()
