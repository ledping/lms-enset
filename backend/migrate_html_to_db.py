# migrate_html_to_db.py
import os
import re
import django

# 1. Configurer Django AVANT tout import de modèles
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

# 2. Importer les modèles (APRÈS django.setup())
from apps.evaluations.models import CC, Question, Choix
from apps.accounts.models import Enseignant


# ── Parseur JavaScript → Python ───────────────────────────────────────────────
def parse_js_array(js_text):
    """
    Convertit un tableau JavaScript en liste Python.
    Gère les clés sans guillemets : { question: "..." }
    et les apostrophes simples : { question: 'texte' }
    """
    import json

    # Étape 1 : Supprimer les commentaires JS // ...
    js_text = re.sub(r'//[^\n]*', '', js_text)

    # Étape 2 : Ajouter des guillemets autour des clés sans guillemets
    # Ex: "question:" → '"question":'
    js_text = re.sub(r'(\b\w+\b)\s*:', r'"\1":', js_text)

    # Étape 3 : Remplacer les apostrophes simples par des guillemets doubles
    # Attention à ne pas casser les apostrophes dans le texte français
    # On fait ça proprement en remplaçant ' par " seulement en début/fin de valeur
    js_text = re.sub(r"'([^']*)'", r'"\1"', js_text)

    # Étape 4 : Supprimer les virgules en trop avant } ou ]
    js_text = re.sub(r',\s*([}\]])', r'\1', js_text)

    # Étape 5 : Parser le JSON résultant
    return json.loads(js_text)


def extraire_questions(html_content):
    """
    Extrait le tableau questionsBase du contenu HTML.
    Retourne une liste de dicts {question, options, correct}.
    """
    # Trouver le bloc questionsBase = [ ... ];
    match = re.search(
        r'const\s+questionsBase\s*=\s*(\[[\s\S]*?\]);',
        html_content
    )
    if not match:
        return None

    js_array = match.group(1)

    try:
        return parse_js_array(js_array)
    except Exception as e:
        # Si ça échoue encore, essayer une extraction question par question
        return extraire_questions_regex(html_content)


def extraire_questions_regex(html_content):
    """
    Méthode alternative : extrait les questions une par une avec des regex.
    Plus robuste pour les formats HTML non standard.
    """
    questions = []

    # Trouver chaque bloc { question: "...", options: [...], correct: N }
    blocs = re.findall(
        r'\{\s*question\s*:\s*["\'](.+?)["\'][\s\S]*?'
        r'options\s*:\s*\[([\s\S]*?)\][\s\S]*?'
        r'correct\s*:\s*(\d+)\s*\}',
        html_content
    )

    for enonce, options_raw, correct_str in blocs:
        # Extraire les options du tableau
        options = re.findall(r'["\']([^"\']+)["\']', options_raw)
        if not options:
            continue
        questions.append({
            'question': enonce.strip(),
            'options':  options,
            'correct':  int(correct_str),
        })

    return questions if questions else None


# ── Configuration ─────────────────────────────────────────────────────────────

CC_METADATA = {
    'CC SYS1.html':                {'titre': 'Systèmes Logiques — Cours 1',     'duree': 20},
    'CC SYS2.html':                {'titre': 'Systèmes Logiques — Cours 2',     'duree': 20},
    'CC SYSB.html':                {'titre': 'Systèmes Logiques — Bases',       'duree': 15},
    'CC CIRCUITS1.html':           {'titre': 'Circuits Électriques — Chap. 1',  'duree': 25},
    'CC EG1.html':                 {'titre': 'Électronique Générale — Chap. 1', 'duree': 25},
    'CC module Electronique.html': {'titre': 'CC Module Électronique',          'duree': 30},
}

# Chemin vers vos fichiers HTML
# (le dossier cc-evaluation/ est au même niveau que backend/)
HTML_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'cc-evaluation')


# ── Migration ─────────────────────────────────────────────────────────────────

def main():
    # Vérifier qu'un enseignant existe en base
    enseignant = Enseignant.objects.first()
    if not enseignant:
        print("[ERREUR] Aucun enseignant en base !")
        print("         → Allez sur http://localhost:8000/admin")
        print("         → Créez un User avec role=enseignant")
        print("         → Créez un Enseignant lié à ce User")
        return

    print(f"Enseignant trouvé : {enseignant.prenom} {enseignant.nom}")
    print(f"Dossier HTML      : {HTML_DIR}\n")

    total_cc = 0
    total_questions = 0

    for filename, meta in CC_METADATA.items():
        filepath = os.path.join(HTML_DIR, filename)

        # Vérifier que le fichier existe
        if not os.path.exists(filepath):
            print(f"[SKIP] Fichier introuvable : {filename}")
            print(f"       Chemin cherché : {filepath}")
            continue

        # Lire le fichier HTML
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()

        # Extraire les questions
        questions_data = extraire_questions(content)

        if not questions_data:
            print(f"[SKIP] Aucune question trouvée dans : {filename}")
            continue

        # Vérifier si ce CC existe déjà (éviter les doublons)
        if CC.objects.filter(titre=meta['titre']).exists():
            print(f"[EXISTE DÉJÀ] {meta['titre']} — ignoré")
            continue

        # Créer le CC en base de données
        cc = CC.objects.create(
            titre=meta['titre'],
            enseignant=enseignant,
            duree_minutes=meta['duree'],
            est_actif=True,
            melange_questions=True,
        )

        # Créer les questions et les choix
        nb_questions = 0
        for i, q_data in enumerate(questions_data):
            enonce = q_data.get('question', '').strip()
            options = q_data.get('options', [])
            correct_index = int(q_data.get('correct', 0))

            if not enonce or not options:
                continue

            question = Question.objects.create(
                cc=cc,
                enonce=enonce,
                points=1.0,
                ordre=i,
            )

            for j, option_texte in enumerate(options):
                Choix.objects.create(
                    question=question,
                    texte=option_texte.strip(),
                    est_correct=(j == correct_index),
                )

            nb_questions += 1

        total_cc += 1
        total_questions += nb_questions
        print(f"[OK] {filename}")
        print(f"     → CC #{cc.id} : \"{cc.titre}\" ({nb_questions} questions, {meta['duree']} min)")

    print(f"\n{'='*50}")
    print(f"Migration terminée : {total_cc} CC créés, {total_questions} questions importées.")


if __name__ == '__main__':
    main()