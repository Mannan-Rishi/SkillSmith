import json
from pathlib import Path
from typing import List, Optional, Dict
from backend.models import Skill, SkillVersion, ExecutionRun, AppSettings

SKILLS_DIR = Path(__file__).resolve().parent.parent / "data" / "skills"
SKILLS_DIR.mkdir(parents=True, exist_ok=True)

SETTINGS_FILE = Path(__file__).resolve().parent.parent / "data" / "settings.json"

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
    with open(SETTINGS_FILE, "w", encoding="utf-8") as fp:
        fp.write(settings.model_dump_json(indent=2))

class SkillRegistry:
    def __init__(self):
        self._skills: Dict[str, Skill] = {}
        self.load_all()

    def load_all(self):
        self._skills.clear()
        for f in SKILLS_DIR.glob("*.json"):
            try:
                with open(f, "r", encoding="utf-8") as fp:
                    data = json.load(fp)
                    skill = Skill(**data)
                    self._skills[skill.id] = skill
            except Exception as e:
                print(f"Error loading skill file {f}: {e}")

    def save(self, skill: Skill):
        self._skills[skill.id] = skill
        file_path = SKILLS_DIR / f"{skill.id}.json"
        with open(file_path, "w", encoding="utf-8") as fp:
            fp.write(skill.model_dump_json(indent=2))

    def get(self, skill_id: str) -> Optional[Skill]:
        return self._skills.get(skill_id)

    def list_all(self) -> List[Skill]:
        return sorted(list(self._skills.values()), key=lambda s: s.updated_at, reverse=True)

    def delete(self, skill_id: str) -> bool:
        if skill_id in self._skills:
            del self._skills[skill_id]
            file_path = SKILLS_DIR / f"{skill_id}.json"
            if file_path.exists():
                file_path.unlink()
            return True
        return False

registry = SkillRegistry()
