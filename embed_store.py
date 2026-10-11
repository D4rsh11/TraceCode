"""
embed_store.py

Loads chunks.json (produced by ingest.py), embeds each chunk using a
local sentence-transformers model (no API cost), and stores them in
a persistent ChromaDB collection for semantic search.
"""

import json
import chromadb
from sentence_transformers import SentenceTransformer


CHUNKS_FILE = "chunks.json"
DB_DIR = "chroma_db"
COLLECTION_NAME = "code_chunks"
EMBEDDING_MODEL = "all-MiniLM-L6-v2"


def load_chunks(path=CHUNKS_FILE):
    """Load code chunks from the JSON file."""

    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def build_document_text(chunk):
    """
    Build the text that will be embedded.

    File path, chunk type, name, and source code are included
    so the embedding contains useful structural context.
    """

    return (
        f"File: {chunk['file']}\n"
        f"{chunk['type']} {chunk['name']}\n\n"
        f"{chunk['code']}"
    )


def build_index(
    chunks_file=CHUNKS_FILE,
    db_dir=DB_DIR,
    collection_name=COLLECTION_NAME,
):
    """
    Build a ChromaDB vector index from chunks.json.

    This function can be called directly from another module,
    such as github_repo.py.
    """

    print("Loading chunks...")

    chunks = load_chunks(chunks_file)

    if not chunks:
        raise ValueError("No chunks found. Nothing to index.")

    print(f"Loaded {len(chunks)} chunks.")

    print(
        f"Loading embedding model '{EMBEDDING_MODEL}' "
        "(first run downloads it)..."
    )

    model = SentenceTransformer(EMBEDDING_MODEL)

    print("Embedding chunks...")

    documents = [
        build_document_text(chunk)
        for chunk in chunks
    ]

    embeddings = model.encode(
        documents,
        show_progress_bar=True,
    ).tolist()

    print("Connecting to ChromaDB...")

    client = chromadb.PersistentClient(path=db_dir)

    # Delete the old collection so re-indexing does not create duplicates.
    try:
        client.delete_collection(collection_name)
        print("Removed existing ChromaDB collection.")
    except Exception:
        pass

    collection = client.create_collection(collection_name)

    ids = [
        f"chunk_{i}"
        for i in range(len(chunks))
    ]

    metadatas = [
        {
            "file": chunk["file"],
            "name": chunk["name"],
            "type": chunk["type"],
            "start_line": chunk["start_line"],
            "end_line": chunk["end_line"],
        }
        for chunk in chunks
    ]

    print("Storing embeddings in ChromaDB...")

    collection.add(
        ids=ids,
        embeddings=embeddings,
        documents=documents,
        metadatas=metadatas,
    )

    print(
        f"\nDone. Stored {len(chunks)} chunks "
        f"in ChromaDB collection '{collection_name}' "
        f"at ./{db_dir}"
    )

    return collection


if __name__ == "__main__":
    build_index()