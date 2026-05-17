#!/usr/bin/env bash
# Quitter le script en cas d'erreur
set -o errexit

echo "--- Installation des dépendances ---"
pip install -r backend/requirements.txt

echo "--- Application des migrations ---"
python backend/manage.py migrate

echo "--- Création du Superuser (si inexistant) ---"
# L'option --noinput force Django à lire les variables d'environnement configurées à l'étape 1
python backend/manage.py createsuperuser --noinput || echo "Le superutilisateur existe déjà ou une erreur est survenue."