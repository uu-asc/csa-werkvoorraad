import copy
import json

from datetime import datetime
from pathlib import Path
from string import Template
from typing import Any, Callable

import pandas as pd
from markdown import markdown
from jinja2 import Environment, FileSystemLoader


type Spec = list[dict[str, Any]] | dict[str, Any]
type ItemTransformer = Callable[..., str]


PATH = Path(__file__).parent.parent.resolve()
LOADER = FileSystemLoader(searchpath=PATH / 'templates')
ENV = Environment(
    loader=LOADER,
    trim_blocks = True,
    lstrip_blocks = True,
)


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


# MARK: PROCES SPEC
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
        item = json.loads(f.read_text(encoding='utf8'))
        werkvoorraad.append(item)
    return werkvoorraad


def process_spec(
    spec: Spec,
    data_getter: Callable,
    transformers: dict[str, ItemTransformer]|None = None,
    **kwargs
) -> Spec:
    """
    Process a specification using transformers and optional keyword arguments. Reads the path to sql from the "data" keys and executes them. Any other items within "data" are passed along as keyword arguments. Transforms any items based on the `transformers` dictionary.

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

    def transform_items(spec):
        for key, transformer in transformers.items():
            if key in spec:
                item = spec[key]
                spec[key] = transformer(item)

    match new_spec:
        case list():
            return [
                process_spec(item, data_getter, transformers, **kwargs)
                for item in new_spec
            ]
        case dict():
            # get data and then merge results into `spec`
            if result := new_spec.get('data'):
                result['data'] = data_getter(**result, **kwargs)
                new_spec = new_spec | result

            transform_items(new_spec)

            return {
                key: process_spec(value, data_getter, transformers, **kwargs)
                for key, value in new_spec.items()
            }
        case _:
            return new_spec

def spec_to_tabular(processed_spec, timestamp=None):
    """
    Convert a processed spec to a tabular format suitable for monitoring.
    Only captures data from endpoints with actual data values.

    Parameters:
    - processed_spec: The processed specification with all data
    - timestamp: Optional timestamp, defaults to current time if None

    Returns:
    - A list of dictionaries, each representing a row in the table
    """
    import datetime

    if timestamp is None:
        timestamp = datetime.datetime.now().isoformat()

    rows = []

    def traverse_spec(spec, path=''):
        if isinstance(spec, list):
            for item in spec:
                traverse_spec(item, path)
        elif isinstance(spec, dict):
            if 'id' in spec and 'label' in spec and 'items' in spec:
                current_id = spec['id']
                current_path = f'{path}.{current_id}' if path else current_id

                for item in spec['items']:
                    traverse_spec(item, current_path)

            elif 'label' in spec and 'data' in spec and isinstance(spec['data'], dict):
                current_label = spec['label']

                counts = {}
                has_data = False

                for id_type, values in spec['data'].items():
                    if isinstance(values, list):
                        counts[id_type] = len(values)
                        has_data = True

                if has_data:
                    row = {
                        'timestamp': timestamp,
                        'path': path,  # Use the chapter path
                        'label': current_label
                    }
                    row.update(counts)
                    rows.append(row)

            else:
                for value in spec.values():
                    traverse_spec(value, path)

    traverse_spec(processed_spec)
    return rows


# MARK: SQL STATEMENTS
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


# MARK: TRANSFORMERS
def wrap_criteria_in_blockquotes(criteria: list[str]) -> str:
    tpl = Template("""<blockquote style="background: var(--background-color); padding: .25em; border-radius: 3px;"><code>${criterium}</code></blockquote>""")
    blockquoted = [tpl.substitute(criterium=crit) for crit in criteria]
    as_string = ''.join(blockquoted)
    wrapped = f'<div style="display: grid; gap: .25em;">{as_string}</div>'
    return wrapped


def wrap_item_in_code_tags(item: str) -> str:
    wrapped = f"<code>{item}</code>"
    return wrapped


def as_query_link(item: str) -> str:
    wrapped = f'<code class="query link">{item}</code>'
    return wrapped


def as_markdown_to_html(item: str) -> str:
    replacements = {'\\n': '\n', '\\t': '\t', '\\r': '\r'}
    for old, new in replacements.items():
        item = item.replace(old, new)
    md = markdown(item)
    return md


# MARK: WERKVOORRAAD
def make_werkvoorraad(
    data_getter: Callable,
    sql_getter: Callable,
    spec: list[dict[str, Any]],
    outpath: Path|str,
    query_kwargs: dict|None = None,
    template: str = 'werkvoorraad.jinja.html',
    tpl_kwargs: dict|None = None,
    tabs: dict| None = None,
    transformers: dict[str, Callable]|None = None,
    enable_monitoring: bool = True,
    monitor_path: str = 'monitoring',
    name: str = 'werkvoorraad',
) -> Spec:
    query_kwargs = {} if query_kwargs is None else query_kwargs
    tpl_kwargs = {} if tpl_kwargs is None else tpl_kwargs
    transformers = {} if transformers is None else transformers

    processed_spec = process_spec(
        spec,
        data_getter = data_getter,
        transformers = transformers,
        **query_kwargs
    )
    if enable_monitoring:
        check_and_create_daily_monitoring(
            processed_spec,
            name = name,
            monitor_path = monitor_path,
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
    Path(outpath).expanduser().write_text(html, encoding='utf8')
    return processed_spec


def store_monitoring_data(
    tabular_data: list[dict],
    name: str = 'werkvoorraad',
    monitor_path: Path | str = 'monitoring'
):
    """
    Store tabular monitoring data in a parquet file.

    Parameters:
    - tabular_data: List of dictionaries with monitoring data
    - base_dir: Directory where monitoring files should be stored

    Returns:
    - Path to the created file
    """

    monitor_path = Path(monitor_path)
    monitor_path.mkdir(exist_ok=True)

    df = pd.DataFrame(tabular_data)

    today = datetime.now().strftime('%Y%m%d')
    filename = f"{name}_metrics_{today}.parquet"
    file_path = monitor_path / filename

    # Save to parquet
    df.to_parquet(file_path, index=False)

    return file_path


def check_and_create_daily_monitoring(
    spec,
    name: str = 'werkvoorraad',
    monitor_path: Path | str = 'monitoring',
):
    """
    Check if monitoring data for today exists, and create it if not.

    Parameters:
    - spec: The processed specification
    - base_dir: Directory where monitoring files are stored

    Returns:
    - Path to the file if created, None if already exists
    """

    # Get today's date for filename
    today = datetime.now().strftime('%Y%m%d')
    filename = f"{name}_metrics_{today}.parquet"
    file_path = Path(monitor_path) / filename

    # Check if file already exists
    if file_path.exists():
        return None  # File already exists, do nothing

    # File doesn't exist, create the monitoring data
    tabular_data = spec_to_tabular(spec)
    return store_monitoring_data(
        tabular_data,
        name = name,
        monitor_path = monitor_path,
    )
