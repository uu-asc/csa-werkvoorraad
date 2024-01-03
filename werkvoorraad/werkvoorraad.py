import copy
import json

from datetime import datetime
from pathlib import Path
from string import Template
from typing import Any, Callable

from jinja2 import Environment, FileSystemLoader


type Spec = list[dict[str, Any]]
type ItemTransformer = Callable[..., str]


PATH = Path(__file__).parent.parent.resolve()
LOADER = FileSystemLoader(searchpath=PATH / 'templates')
ENV = Environment(loader=LOADER)


class Ts:
    @property
    def timestamp(self):
        return f"{self.now:%d-%m-%Y %H:%M}"

    @property
    def datum(self):
        return f"{self.now:%d-%m-%Y}"

    @property
    def ymd(self):
        return f"{self.now:%Y%m%d}"

    @property
    def daymonth(self):
        return f"{self.now:%d %B}"

    @property
    def now(self):
        return datetime.now()


TS = Ts()


# PROCES SPEC
def load_spec_from_json(path: Path|str) -> Spec:
    """
    Load specifications from JSON files in specified path.

    Parameters:
    - path (Path|str): The path to the directory containing JSON files.

    Returns:
    - list[dict]: A specification.
    """
    werkvoorraad = []
    for f in Path(path).glob('*.json'):
        item = json.loads(f.read_text())
        werkvoorraad.append(item)
    return werkvoorraad


def process_spec(
    spec: Spec,
    data_getter: Callable,
    transformers: dict[str, ItemTransformer]|None = None,
    **kwargs
) -> Spec:
    """
    Process a specification using transformers and optional keyword arguments. Reads the path to sql from the "data" keys and executes them. Transforms any items based on the `transformers` dictionary.

    Parameters:
    - spec (Spec): The input specification to be processed.
    - transformers (dict[ItemTransformer]|None):
        Optional dict of transformers to apply.
        - The key should refer to an item in the spec to be transformed.
        - The value is a function to be applied to the item.
    - **kwargs: Additional keyword arguments for processing.

    Returns:
    - Spec: Processed specification.
    """
    new_spec = copy.deepcopy(spec)
    transformers = {} if transformers is None else transformers

    match new_spec:
        case list():
            return [
                process_spec(item, data_getter, transformers, **kwargs)
                for item in new_spec
            ]
        case dict():
            if data := new_spec.get('data'):
                for key, transformer in transformers.items():
                    if key in data:
                        new_spec[key] = transformer(data[key])
                result = data_getter(**data, **kwargs)
                new_spec['data'] = result
            return {
                key: process_spec(value, data_getter, transformers, **kwargs)
                for key, value in new_spec.items()
            }
        case _:
            return new_spec


# SQL STATEMENTS
def gather_sql_from_spec(spec: Spec, sql_getter: Callable, **kwargs) -> dict:
    paths = extract_query_paths_from_spec(spec)
    return gather_sql(paths, sql_getter, **kwargs)


def extract_query_paths_from_spec(spec: Spec) -> set[str]:
    """
    Extract SQL query paths from the given specification.

    Parameters:
    - spec (Spec): The input specification.

    Returns:
    - set: A set containing paths to SQL queries found in the specification.
    """
    paths = set()
    if isinstance(spec, list):
        for item in spec:
            queries = extract_query_paths_from_spec(item)
            paths.update(queries)
    elif isinstance(spec, dict):
        if query := spec.get('query'):
            paths.add(query)
        for value in spec.values():
            queries = extract_query_paths_from_spec(value)
            paths.update(queries)
    return paths


def gather_sql(paths: set[str], sql_getter: Callable, **kwargs) -> dict:
    """
    Gather SQL statements from files specified in the provided set of paths.

    Parameters:
    - paths (set[str]): A set of file paths containing SQL statements.
    - **kwargs: Additional keyword arguments to be passed to osiris.get_sql().

    Returns:
    - dict[str, str]: A dict mapping file stem to SQL query. Sorted by key.
    """
    statements = {}
    sorter = lambda i: (-i.count('/'), *i.split('/'))

    for path in sorted(paths, key=sorter):
        key = path.replace('/', ' / ')
        query = sql_getter(path, **kwargs)
        statements[key] = query

    return statements


# TRANSFORMERS
def wrap_criteria_in_blockquotes(criteria: list[str]) -> str:
    tpl = Template("""
    <blockquote
        style="
            background: var(--background-color);
            padding: .25em;
            border-radius: 3px;
        ">
        <code>${criterium}</code>
    </blockquote>
    """)
    blockquoted = [tpl.substitute(criterium=crit) for crit in criteria]
    as_string = ''.join(blockquoted)
    wrapped = f'<div style="display: grid; gap: .25em;">{as_string}</div>'
    return wrapped


def wrap_item_in_code_tags(item: str) -> str:
    wrapped = f"<code>{item}</code>"
    return wrapped


# WERKVOORRAAD
def make_werkvoorraad(
    data_getter: Callable,
    sql_getter: Callable,
    path_to_spec: Path|str,
    outpath: Path|str,
    query_kwargs: dict|None = None,
    template: str = 'werkvoorraad.jinja.html',
    tpl_kwargs: dict|None = None,
    tabs: dict| None = None,
) -> None:
    query_kwargs = {} if query_kwargs is None else query_kwargs
    tpl_kwargs = {} if tpl_kwargs is None else tpl_kwargs

    transformers = {
        'query': wrap_item_in_code_tags,
        'where': wrap_criteria_in_blockquotes,
    }

    spec = load_spec_from_json(path_to_spec)
    processed_spec = process_spec(
        spec,
        data_getter = data_getter,
        transformers = transformers,
        **query_kwargs
    )
    queries = gather_sql_from_spec(spec, sql_getter, **query_kwargs)

    tpl = ENV.get_template(template)
    html = tpl.render(
        spec = processed_spec,
        queries = queries,
        ts = TS,
        tabs = tabs,
        **tpl_kwargs,
    )
    Path(outpath).expanduser().write_text(html)
