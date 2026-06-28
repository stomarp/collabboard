from pathlib import Path

BIDI_CODEPOINTS = (
    set(range(0x202A, 0x202F))
    | set(range(0x2066, 0x206A))
    | {0xFEFF}
)

TEXT_EXTENSIONS = {
    ".py",
    ".md",
    ".yml",
    ".yaml",
    ".txt",
    ".json",
    ".ts",
    ".tsx",
    ".mjs",
    ".css",
    ".env",
    ".example",
}

TEXT_FILENAMES = {"Dockerfile", ".dockerignore", ".gitignore"}

SKIP_DIRS = {".git", "node_modules", ".next", "__pycache__", ".venv", "venv"}


def should_clean(path: Path) -> bool:
    if not path.is_file():
        return False

    if any(part in SKIP_DIRS for part in path.parts):
        return False

    return path.suffix in TEXT_EXTENSIONS or path.name in TEXT_FILENAMES


def clean_file(path: Path) -> bool:
    original = path.read_text(encoding="utf-8", errors="ignore")
    cleaned = original.replace("\r\n", "\n").replace("\r", "\n")
    cleaned = "".join(ch for ch in cleaned if ord(ch) not in BIDI_CODEPOINTS)

    lines = cleaned.split("\n")
    cleaned = "\n".join(line.rstrip() for line in lines)

    if cleaned and not cleaned.endswith("\n"):
        cleaned += "\n"

    if cleaned != original:
        path.write_text(cleaned, encoding="utf-8", newline="\n")
        return True

    return False


def main() -> None:
    changed = []

    for path in Path(".").rglob("*"):
        if should_clean(path) and clean_file(path):
            changed.append(str(path))

    if changed:
        print("Cleaned text files:")
        for item in changed:
            print(f"- {item}")
    else:
        print("No text cleanup needed.")


if __name__ == "__main__":
    main()
