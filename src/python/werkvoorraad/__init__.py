from .werkvoorraad import *

from pathlib import Path
from typing import Callable

from stopwatch import Stopwatch

from werkvoorraad import werkvoorraad, fake_spec


#region Werkvoorrad
class Werkvoorraad:
    DEFAULTS: dict = {}

    def __init__(
        self,
        data_getter: Callable,
        sql_getter: Callable,
        path_to_spec: Path|str,
        filename: str,
        query_kwargs: dict,
        outpath: Path|str,
        tpl_kwargs: dict|None = None,
        transformers: dict[str, Callable]|None = None,
        test_with_fake_data: bool = False,
        enable_monitoring: bool = False,
        monitor_path: str = 'monitoring',
        name: str = 'werkvoorraad',
    ) -> None:
        self.name = name
        self.test_with_fake_data = test_with_fake_data

        self.data_getter = data_getter
        self.sql_getter = sql_getter
        self.transformers = transformers

        self.enable_monitoring = enable_monitoring
        self.monitor_path = monitor_path

        self.spec = werkvoorraad.load_spec_from_json(path_to_spec)
        self.outpath = Path(outpath) / filename

        self.query_kwargs = query_kwargs
        self.tpl_kwargs = self.DEFAULTS | (tpl_kwargs or {})

        self.stopwatch = Stopwatch(
            name = self.__class__.__name__,
            duration_formatter = 'min_sec_ms',
        )

    @property
    def data_getter(self):
        return self._data_getter

    @data_getter.setter
    def data_getter(self, value):
        if self.test_with_fake_data:
            print("Testing with fake data!")
            self._data_getter = fake_spec.fake_data
        else:
            self._data_getter = value

    def create(self, **kwargs) -> None:
        self.stopwatch.start()
        self.query_kwargs |= kwargs.pop('query_kwargs', {})
        self.tpl_kwargs |= kwargs.pop('tpl_kwargs', {})
        processed_spec = werkvoorraad.make_werkvoorraad(
            self.data_getter,
            self.sql_getter,
            spec = self.spec,
            outpath = self.outpath,
            query_kwargs = self.query_kwargs,
            tpl_kwargs = self.tpl_kwargs,
            transformers = self.transformers,
            enable_monitoring = self.enable_monitoring,
            monitor_path = self.monitor_path,
            **kwargs,
        )
        print(self.outpath.resolve())
        self.stopwatch.stop()
        return processed_spec
