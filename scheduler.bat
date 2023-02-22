@echo off
cls
echo csa-werkvoorraad
echo ================
echo ...
set drive=%~dp0
call conda activate moedertabel
echo conda environment: %CONDA_DEFAULT_ENV%
echo.
set PYTHONPATH=%PYTHONPATH%;%drive%/../../../../05. CSA/70. Python/osiris_query
set "scheduler=%drive%werkvoorraad/visa.py"
call python "%scheduler%"
call conda deactivate
echo.
timeout 15
