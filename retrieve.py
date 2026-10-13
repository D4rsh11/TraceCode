"""
retrieve.py

Given a natural-language question, embeds it with the same model used in
embed_store.py and searches ChromaDB for the most semantically similar
code chunks.
"""

import chromadb
from sentence_transformers import SentenceTransformer

DB_DIR = "chroma_db"
COLLECTION_NAME = "code_chunks"
EMBEDDING_MODEL = "all-MiniLM-L6-v2"

_model = None


def _get_model():
    """Load the embedding model once and reuse it."""
    global _model

    if _model is None:
        _model = SentenceTransformer(EMBEDDING_MODEL)

    return _model


def _get_collection():
    """
    Get the current ChromaDB collection.

    Fetching the collection by name avoids retaining a stale collection
    object if the collection was deleted and recreated during indexing.
    """
    client = chromadb.PersistentClient(path=DB_DIR)

    return client.get_collection(name=COLLECTION_NAME)


def retrieve(query: str, top_k: int = 5):
    """
    Retrieve the most semantically relevant code chunks.

    Args:
        query: Natural-language question about the repository.
        top_k: Maximum number of chunks to retrieve.

    Returns:
        A list of dictionaries containing document, metadata, and distance.
    """
    if not query or not query.strip():
        raise ValueError("Query cannot be empty.")

    if top_k < 1:
        raise ValueError("top_k must be at least 1.")

    model = _get_model()
    collection = _get_collection()

    query_embedding = model.encode([query]).tolist()

    # Avoid requesting more results than the collection contains.
    collection_count = collection.count()

    if collection_count == 0:
        return []

    results = collection.query(
        query_embeddings=query_embedding,
        n_results=min(top_k, collection_count),
        include=["documents", "metadatas", "distances"],
    )

    hits = []

    for i, document_id in enumerate(results["ids"][0]):
        hits.append({
            "document": results["documents"][0][i],
            "metadata": results["metadatas"][0][i],
            "distance": results["distances"][0][i],
        })

    return hits


if __name__ == "__main__":
    query = input("Ask a question about the codebase: ")

    try:
        hits = retrieve(query)

        print(f"\\nTop {len(hits)} relevant chunks:\\n")

        for hit in hits:
            metadata = hit["metadata"] or {}

            file_name = metadata.get("file", "unknown")
            start_line = metadata.get("start_line", "?")
            end_line = metadata.get("end_line", "?")
            chunk_type = metadata.get("type", "unknown")
            name = metadata.get("name", "unknown")

            print(
                f"- {file_name}:{start_line}-{end_line} "
                f"({chunk_type} {name}) "
                f"distance={hit['distance']:.4f}"
            )

            print(hit["document"])
            print()

    except Exception as exc:
        print(f"Retrieval failed: {exc}")