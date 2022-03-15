@echo off
cls
echo csa-werkvoorraad
echo ================
echo ...
set drive=%~dp0
call conda activate moedertabel
echo conda environment: %CONDA_DEFAULT_ENV%
echo.
set "scheduler=%drive%werkvoorraad/werkvoorraad.py"
call python "%scheduler%"
echo.
timeout 15
