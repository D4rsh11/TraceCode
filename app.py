
"""
app.py

Flask API backend for TraceCode.

Next.js frontend communicates with this API to:

1. Index a public GitHub repository
2. Ask questions about the indexed codebase
3. Check backend health

The actual RAG pipeline remains in:
- github_repo.py
- ingest.py
- embed_store.py
- retrieve.py
- generate.py
"""

from flask import Flask, request, jsonify
from flask_cors import CORS

from github_repo import clone_and_ingest
from generate import answer_question


# --------------------------------------------------
# Flask application
# --------------------------------------------------

app = Flask(__name__)

# Allow requests from the Next.js frontend
CORS(app)


# --------------------------------------------------
# Health check
# --------------------------------------------------

@app.route("/api/health", methods=["GET"])
def health():
    """Check whether the TraceCode backend is running."""

    return jsonify({
        "success": True,
        "status": "ok",
        "message": "TraceCode backend is running"
    }), 200


# --------------------------------------------------
# Index GitHub repository
# --------------------------------------------------

@app.route("/api/index", methods=["POST"])
def index_repository():
    """
    Clone and index a public GitHub repository.

    Expected JSON:
    {
        "url": "https://github.com/username/repository"
    }
    """

    data = request.get_json(silent=True)

    if not data:
        return jsonify({
            "success": False,
            "error": "Request body is required"
        }), 400

    repo_url = data.get("url", "").strip()

    if not repo_url:
        return jsonify({
            "success": False,
            "error": "GitHub repository URL is required"
        }), 400

    try:
        print(f"Starting repository indexing: {repo_url}", flush=True)

        # Clone GitHub repository, parse files, create chunks,
        # generate embeddings, and store them in ChromaDB.
        repo_path = clone_and_ingest(repo_url)

        print(f"Repository indexed successfully: {repo_url}", flush=True)

        return jsonify({
            "success": True,
            "message": "Repository indexed successfully",
            "repository": repo_url,
            "path": str(repo_path)
        }), 200

    except ValueError as e:
        print(f"Invalid repository request: {e}", flush=True)

        return jsonify({
            "success": False,
            "error": str(e)
        }), 400

    except Exception as e:
        # Log the actual exception in the backend terminal
        # while returning a generic error to the frontend.
        app.logger.exception("Repository indexing failed")

        return jsonify({
            "success": False,
            "error": "Failed to index repository",
            "details": str(e)
        }), 500


# --------------------------------------------------
# Ask question about repository
# --------------------------------------------------

@app.route("/api/query", methods=["POST"])
def query_repository():
    """
    Ask a question about the indexed repository.

    Expected JSON:
    {
        "question": "How does authentication work?"
    }
    """

    data = request.get_json(silent=True)

    if not data:
        return jsonify({
            "success": False,
            "error": "Request body is required"
        }), 400

    question = data.get("question", "").strip()

    if not question:
        return jsonify({
            "success": False,
            "error": "Question is required"
        }), 400

    try:
        print("Processing repository question...", flush=True)

        result = answer_question(question)

        return jsonify({
            "success": True,
            "answer": result.get("answer", ""),
            "sources": result.get("sources", [])
        }), 200

    except Exception:
        app.logger.exception("Failed to generate answer")

        return jsonify({
            "success": False,
            "error": "Failed to generate answer"
        }), 500


# --------------------------------------------------
# Run Flask server
# --------------------------------------------------

if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True,
        use_reloader=False
    )
