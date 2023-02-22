import os
import json
from argparse import ArgumentParser

from werkvoorraad import PATH, MaakRapportage, translate_queries

import sys
print(sys.path)


class VisaWerkvoorraad(MaakRapportage):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        from query.result import QueryResult as QR
        self.queryresults = [
            QR.read_feather(path=p)
            for p in QR.list_queries('visa').values()
        ]
        self.data = self.laad_dataset()

    def add_results_to_item(self, item):
        queries = translate_queries(item['query'], self.abstractions)
        combined = ' and '.join([f"({q})" for q in queries])
        data = self.data.query(combined)
        item['stu'] = data.studentnummer.drop_duplicates().to_list()

    def laad_dataset(self):
        import pandas as pd

        def fill_bools(df):
            getbools = lambda qr: qr.frame.select_dtypes(bool).columns.to_list()
            boolean_cols = sum(
                (getbools(qr) for qr in self.queryresults),
                start=[]
            )
            return df.fillna({col:False for col in boolean_cols})

        return (
            pd.concat(
                [qr.frame for qr in self.queryresults],
                keys=[qr.name for qr in self.queryresults],
                names=['situatie', ''],
            )
            .pipe(fill_bools)
            .reset_index(level=0)
            .reset_index(drop=True)
            .astype({'situatie': 'category'})
        )

    def render(self, **kwargs):
        return super().render(
            queryresults=self.queryresults,
            **kwargs,
        )


def maak_src_table(werkvoorraad):
    to_repl = {True: 'exchange', False: 'regulier'}
    return (
        werkvoorraad.data
        .query("situatie == 'vvr_studie_niet_afgemeld'")
        .drop(columns='afloopdatum')
        .astype({'croho': 'string'})
        .assign(soort=lambda df: df.croho.isna().replace(to_repl))
        .rename(columns={'afloopdatum_verblijfsdocument': 'afloopdatum'})
        .pivot_table(
            index='afloopdatum',
            columns='soort',
            aggfunc='size',
        )
        .reset_index()
    )


def maak_kalender(src, embed_options):
    import altair as alt

    alt.renderers.set_embed_options(**embed_options)

    input_dropdown = alt.binding_select(
        options=[None,'regulier','exchange'],
        labels=['alle', 'regulier', 'exchange'],
        name='soort',
    )
    selection = alt.selection_single(fields=['soort'], bind=input_dropdown)

    chart = (
        alt.Chart(
            src,
            title='Aantal VVR met afloopdatum in jaar/maand'
        )
        .transform_fold(
            as_=['soort', 'aantal'],
            fold=['regulier', 'exchange'],
        )
        .transform_filter("datum.aantal > 0")
        .mark_rect()
        .encode(
            x=alt.X(
                'year(afloopdatum):T',
                axis=alt.Axis(
                    tickCount='year',
                ),
                title='maand',
            ),
            y=alt.X(
                'month(afloopdatum):T',
                scale=alt.Scale(reverse=True),
                title='jaar'),
            color=alt.Color(
                'sum(aantal):Q',
                scale=alt.Scale(type='log'),
                title='aantal',
            ),
            tooltip=[
                alt.Tooltip('year(afloopdatum):T', title='jaar'),
                alt.Tooltip('month(afloopdatum):T', title='maand'),
                alt.Tooltip('sum(aantal):Q', title='aantal'),
            ]
        )
        .transform_filter(selection)
        .add_selection(selection)
    )
    chart.usermeta = {'embedOptions': embed_options}
    return chart


def maak_datamodel(werkvoorraad):
    import pandas as pd

    def get_inhoud(col):
        s = werkvoorraad.data[col]
        if s.dtype == 'category':
            return s.cat.categories.to_list()
        if s.dtype == 'datetime64[ns]':
            return f"[{s.min().date()}...{s.max().date()}]"
        if s.dtype == 'string':
            return f"[{s.min()}...{s.max()}]"
        if s.dtype == 'bool':
            return s.sum()
        else:
            return ""

    return (
        pd.DataFrame.from_dict(
            {
                'dtypes': werkvoorraad.data.dtypes,
                'hasnan': [
                    werkvoorraad.data[col].hasnans
                    for col in werkvoorraad.data.columns
                ],
                'inhoud': [get_inhoud(col) for col in werkvoorraad.data.columns]
            },
        )
        .rename_axis('veld')
        .reset_index()
    )


if __name__ == '__main__':
    os.chdir(PATH)
    parser = ArgumentParser(description='Maak werkvoorraad')
    parser.add_argument('--path')
    parser.add_argument('--outfile', '-f')
    args = vars(parser.parse_args())

    kwargs = {k:v for k,v in args.items() if k != 'random'}

    path = PATH / "settings.altair.embed.json"
    embed_options = json.loads(path.read_text())

    # werkvoorraad = VisaWerkvoorraad(**kwargs)
    werkvoorraad = VisaWerkvoorraad()
    werkvoorraad.process_queries()

    src = maak_src_table(werkvoorraad)
    chart = maak_kalender(src, embed_options)

    werkvoorraad.write(
        spec = chart.to_json(indent=None),
        datamodel = maak_datamodel(werkvoorraad),
    )
