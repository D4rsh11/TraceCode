"""
ingest.py

Walks a target code repository, parses each Python file with the `ast`
module, and extracts chunks at function/class granularity.

Each chunk carries metadata:
- file path
- exact start/end line numbers
- function/class name
- source code

This allows the final answers to cite precise locations.
"""

import ast
import os
import json


OUTPUT_FILE = "chunks.json"


def get_source_segment(source_lines, node):
    """Extract the exact source text for a given AST node."""
    start = node.lineno - 1
    end = node.end_lineno

    return "\n".join(source_lines[start:end])


def chunk_file(filepath, target_dir):
    """Parse one Python file and return a list of chunk dictionaries."""

    with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
        source = f.read()

    try:
        tree = ast.parse(source)
    except SyntaxError:
        print(f"  Skipping (syntax error): {filepath}")
        return []

    source_lines = source.splitlines()
    chunks = []

    # Store the path relative to the repository being indexed.
    rel_path = os.path.relpath(filepath, target_dir).replace("\\", "/")

    # Module-level chunk:
    # Captures imports, constants, and other top-level code that
    # isn't inside a function or class.
    top_level_lines = []

    for node in tree.body:
        if not isinstance(
            node,
            (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef),
        ):
            segment = get_source_segment(source_lines, node)
            top_level_lines.append(segment)

    if top_level_lines:
        chunks.append(
            {
                "file": rel_path,
                "name": "(module level)",
                "type": "module",
                "start_line": 1,
                "end_line": len(source_lines),
                "code": "\n".join(top_level_lines),
            }
        )

    # Extract functions, async functions, and classes.
    for node in ast.walk(tree):
        if isinstance(
            node,
            (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef),
        ):
            kind = "class" if isinstance(node, ast.ClassDef) else "function"

            code = get_source_segment(source_lines, node)

            chunks.append(
                {
                    "file": rel_path,
                    "name": node.name,
                    "type": kind,
                    "start_line": node.lineno,
                    "end_line": node.end_lineno,
                    "code": code,
                }
            )

    return chunks


def ingest_repo(target_dir):
    """Walk the repository and collect chunks from every Python file."""

    if not os.path.isdir(target_dir):
        raise FileNotFoundError(
            f"Repository directory not found: '{target_dir}'"
        )

    all_chunks = []

    for root, dirs, files in os.walk(target_dir):

        # Skip hidden folders, virtual environments,
        # Python cache directories, and node_modules.
        dirs[:] = [
            d
            for d in dirs
            if not d.startswith(".")
            and d not in ("venv", "__pycache__", "node_modules")
        ]

        for filename in files:
            if filename.endswith(".py"):
                filepath = os.path.join(root, filename)

                print(f"Parsing: {filepath}")

                all_chunks.extend(
                    chunk_file(filepath, target_dir)
                )

    return all_chunks


if __name__ == "__main__":

    target_dir = input(
        "Enter the path to the repository you want to index: "
    ).strip()

    if not target_dir:
        print("Error: Repository path cannot be empty.")
        raise SystemExit(1)

    try:
        chunks = ingest_repo(target_dir)

    except FileNotFoundError as e:
        print(f"Error: {e}")
        raise SystemExit(1)

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(chunks, f, indent=2)

    print(
        f"\nDone. Extracted {len(chunks)} chunks "
        f"into {OUTPUT_FILE}"
    )