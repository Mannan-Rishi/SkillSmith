import json
import os
import shutil
from pathlib import Path
from typing import List, Optional, Dict
from backend.models import Skill, SkillVersion, ExecutionRun, AppSettings

IS_VERCEL = bool(os.environ.get("VERCEL")) or bool(os.environ.get("VERCEL_ENV"))
BUNDLED_DATA_DIR = Path(__file__).resolve().parent.parent / "data"

# Mutable container so functions/methods can update the write path at runtime
_writable_paths = {}

if IS_VERCEL:
    # Serverless runtime: storage in /tmp is writable
    DATA_DIR = Path("/tmp/data")
    SKILLS_DIR = DATA_DIR / "skills"
    SETTINGS_FILE = DATA_DIR / "settings.json"
    SKILLS_DIR.mkdir(parents=True, exist_ok=True)

    # Copy bundled pre-built skills to /tmp on cold start if not present
    bundled_skills = BUNDLED_DATA_DIR / "skills"
    if bundled_skills.exists():
        for f in bundled_skills.glob("*.json"):
            dst = SKILLS_DIR / f.name
            if not dst.exists():
                try:
                    shutil.copy2(f, dst)
                except Exception:
                    pass

    bundled_settings = BUNDLED_DATA_DIR / "settings.json"
    if bundled_settings.exists() and not SETTINGS_FILE.exists():
        try:
            shutil.copy2(bundled_settings, SETTINGS_FILE)
        except Exception:
            pass
else:
    DATA_DIR = BUNDLED_DATA_DIR
    SKILLS_DIR = DATA_DIR / "skills"
    SETTINGS_FILE = DATA_DIR / "settings.json"
    SKILLS_DIR.mkdir(parents=True, exist_ok=True)

def get_app_settings() -> AppSettings:
    if SETTINGS_FILE.exists():
        try:
            with open(SETTINGS_FILE, "r", encoding="utf-8") as fp:
                data = json.load(fp)
                return AppSettings(**data)
        except Exception as e:
            print(f"Error loading settings: {e}")
    return AppSettings()

def save_app_settings(settings: AppSettings):
    try:
        with open(SETTINGS_FILE, "w", encoding="utf-8") as fp:
            fp.write(settings.model_dump_json(indent=2))
    except Exception as e:
        print(f"Warning: Could not persist settings to disk: {e}")

class SkillRegistry:
    def __init__(self):
        self._skills: Dict[str, Skill] = {}
        self.load_all()

    def load_all(self):
        self._skills.clear()
        
        # Load bundled skills first
        bundled_skills = BUNDLED_DATA_DIR / "skills"
        if bundled_skills.exists() and bundled_skills != SKILLS_DIR:
            for f in bundled_skills.glob("*.json"):
                try:
                    with open(f, "r", encoding="utf-8") as fp:
                        data = json.load(fp)
                        skill = Skill(**data)
                        self._skills[skill.id] = skill
                except Exception as e:
                    print(f"Error loading bundled skill {f}: {e}")

        # Load active/writable skills (overriding or supplementing bundled)
        if SKILLS_DIR.exists():
            for f in SKILLS_DIR.glob("*.json"):
                try:
                    with open(f, "r", encoding="utf-8") as fp:
                        data = json.load(fp)
                        skill = Skill(**data)
                        self._skills[skill.id] = skill
                except Exception as e:
                    print(f"Error loading skill file {f}: {e}")

    def _get_write_dir(self):
        """Return the writable skills directory, falling back to /tmp if needed."""
        if "skills_dir" in _writable_paths:
            return _writable_paths["skills_dir"]
        return SKILLS_DIR

    def save(self, skill: Skill):
        # Update in-memory cache first
        self._skills[skill.id] = skill
        write_dir = self._get_write_dir()
        primary_path = write_dir / f"{skill.id}.json"
        try:
            primary_path.parent.mkdir(parents=True, exist_ok=True)
            with open(primary_path, "w", encoding="utf-8") as fp:
                fp.write(skill.model_dump_json(indent=2))
        except OSError:
            # Read-only filesystem (e.g., /var/task on Vercel). Fallback to /tmp.
            fallback_dir = Path("/tmp/data/skills")
            fallback_dir.mkdir(parents=True, exist_ok=True)
            fallback_path = fallback_dir / f"{skill.id}.json"
            try:
                with open(fallback_path, "w", encoding="utf-8") as fp:
                    fp.write(skill.model_dump_json(indent=2))
                _writable_paths["skills_dir"] = fallback_dir
                print(f"Info: Fell back to writable path {fallback_path}")
            except Exception as e2:
                print(f"Error: Could not persist skill {skill.id} to any location: {e2}")
        except Exception as e:
            print(f"Warning: Could not write skill {skill.id} to disk: {e}")

    def get(self, skill_id: str) -> Optional[Skill]:
        return self._skills.get(skill_id)

    def list_all(self) -> List[Skill]:
        return sorted(list(self._skills.values()), key=lambda s: s.updated_at, reverse=True)

    def delete(self, skill_id: str) -> bool:
        if skill_id in self._skills:
            del self._skills[skill_id]
            write_dir = self._get_write_dir()
            file_path = write_dir / f"{skill_id}.json"
            if file_path.exists():
                try:
                    file_path.unlink()
                except Exception as e:
                    print(f"Warning: Could not unlink {file_path}: {e}")
            return True
        return False

registry = SkillRegistry()
