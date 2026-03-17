"""
Setup script: installs dependencies, downloads models, initializes database.
Run: python setup.py
"""

import os
import subprocess
import sys
from pathlib import Path


def run(cmd, description):
    """Run a shell command with status output."""
    print(f"\n  [{description}]")
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"  FOUT: {result.stderr[:500]}")
        return False
    print(f"  OK")
    return True


def main():
    print("\n  Verzekeringsagent Setup")
    print("  " + "=" * 40)

    # 1. Install Python dependencies
    pip = sys.executable.replace("python.exe", "Scripts\\pip.exe") if os.name == "nt" else "pip"
    if not run(f'"{sys.executable}" -m pip install -r requirements.txt --quiet', "Pip dependencies installeren"):
        print("  Kon dependencies niet installeren. Check je Python installatie.")
        return

    # 2. Download spaCy Dutch model
    if not run(f'"{sys.executable}" -m spacy download nl_core_news_lg --quiet', "spaCy Nederlands model downloaden"):
        print("  Kon spaCy model niet downloaden.")
        return

    # 3. Create .env if it doesn't exist
    env_path = Path(".env")
    if not env_path.exists():
        print("\n  [.env bestand aanmaken]")
        from cryptography.fernet import Fernet
        key = Fernet.generate_key().decode()

        # Try to get existing Anthropic key from parent project
        anthropic_key = ""
        parent_env = Path("../.env.local")
        if parent_env.exists():
            for line in parent_env.read_text().splitlines():
                if line.startswith("ANTHROPIC_API_KEY="):
                    anthropic_key = line.split("=", 1)[1].strip()
                    break

        env_content = f"""# Claude API key
ANTHROPIC_API_KEY={anthropic_key or 'sk-ant-xxxxx'}

# Fernet encryption key (auto-generated)
FERNET_KEY={key}

# Database path
DATABASE_PATH=./data/verzekeringsagent.db

# Log level
LOG_LEVEL=INFO
"""
        env_path.write_text(env_content)
        print(f"  OK — Fernet key gegenereerd")
        if anthropic_key:
            print(f"  OK — Anthropic key overgenomen uit ../.env.local")
        else:
            print(f"  Let op: vul ANTHROPIC_API_KEY in in .env")
    else:
        print("\n  [.env bestaat al — overgeslagen]")

    # 4. Initialize database
    print("\n  [Database initialiseren]")
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from src.database import init_database
    init_database()
    print("  OK")

    # 5. Quick test
    print("\n  [Snelle test uitvoeren]")
    try:
        from src.pii_detector import detect_pii
        test_text = "Jan de Vries woont op Keizersgracht 123, 1015AA Amsterdam. Email: jan@test.nl"
        results = detect_pii(test_text)
        pii_types = [r["entity_type"] for r in results]
        print(f"  OK — {len(results)} PII-entiteiten gedetecteerd: {', '.join(set(pii_types))}")
    except Exception as e:
        print(f"  WAARSCHUWING: test gefaald: {e}")

    print(f"\n  {'='*40}")
    print(f"  Setup compleet!")
    print(f"\n  Gebruik:")
    print(f"    python main.py verwerk <bestand.pdf> --type polis_auto")
    print(f"    python main.py test")
    print()


if __name__ == "__main__":
    main()
