import os
import shutil
import subprocess
import json
from urllib.parse import urlparse

from embed_store import build_index
from ingest import ingest_repo


def validate_github_url(url):
    """Check whether the URL points to GitHub."""
    parsed = urlparse(url)

    return (
        parsed.scheme in ("http", "https")
        and parsed.netloc.lower() == "github.com"
    )


def clone_repository(url, destination="target_repo"):
    """
    Clone a public GitHub repository into the destination directory.

    Returns:
        str: Path to the cloned repository.
    """

    if not validate_github_url(url):
        raise ValueError(
            "Invalid GitHub URL. Please provide a URL like "
            "https://github.com/user/repository"
        )

    if os.path.exists(destination):
        print(f"Removing existing repository: {destination}")
        shutil.rmtree(destination)

    print(f"Cloning repository: {url}")

    try:
        subprocess.run(
            [
                "git",
                "clone",
                "--depth",
                "1",
                url,
                destination,
            ],
            check=True,
        )

    except FileNotFoundError:
        raise RuntimeError(
            "Git is not installed or could not be found in PATH."
        )

    except subprocess.CalledProcessError:
        raise RuntimeError(
            "Failed to clone the repository. "
            "Make sure the repository is public and the URL is correct."
        )

    return destination


def clone_and_ingest(url, destination="target_repo"):
    """
    Clone a GitHub repository, ingest its code,
    and build the ChromaDB vector index.
    """

    repo_path = clone_repository(url, destination)

    print(f"\nRepository cloned successfully to: {repo_path}")

    print("\nIndexing repository...")

    chunks = ingest_repo(repo_path)

    with open("chunks.json", "w", encoding="utf-8") as f:
        json.dump(chunks, f, indent=2)

    print(
        f"\nDone. Extracted {len(chunks)} chunks into chunks.json"
    )

    print("\nBuilding vector index...")

    build_index()

    print("\nRepository is ready for questions.")

    return repo_path


if __name__ == "__main__":
    url = input("Enter GitHub repository URL: ").strip()

    try:
        clone_and_ingest(repo_url.strip())

    except (ValueError, RuntimeError, FileNotFoundError) as e:
        print(f"\nError: {e}")