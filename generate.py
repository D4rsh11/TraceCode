"""
generate.py

Takes a question, retrieves relevant code chunks (via retrieve.py), and
asks OpenRouter to answer using ONLY that retrieved context, citing exact
file/line locations for every claim.
"""

import os
import time

from dotenv import load_dotenv
from openai import (
    APIConnectionError,
    APITimeoutError,
    InternalServerError,
    OpenAI,
    RateLimitError,
)

from retrieve import retrieve

load_dotenv()

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
MODEL_NAME = os.getenv("OPENROUTER_MODEL", "openai/gpt-4o-mini")
print(f"TraceCode model configured: {MODEL_NAME}")

MAX_RETRIES = 3
INITIAL_RETRY_DELAY = 2


def get_client() -> OpenAI:
    """Create an OpenRouter client using the API key from the root .env."""

    api_key = os.getenv("OPENROUTER_API_KEY")

    if not api_key:
        raise RuntimeError(
            "OPENROUTER_API_KEY is missing. "
            "Add it to your project's root .env file."
        )

    return OpenAI(
        base_url=OPENROUTER_BASE_URL,
        api_key=api_key,
        max_retries=0,
        timeout=60.0,
    )


def build_prompt(question: str, hits: list) -> str:
    """Build a prompt containing only the retrieved code context."""

    context_blocks = []

    for h in hits:
        m = h["metadata"]
        location = f"{m['file']} (lines {m['start_line']}-{m['end_line']})"
        context_blocks.append(f"### {location}\n{h['document']}")

    context = "\n\n".join(context_blocks)

    prompt = f"""You are a codebase assistant. Answer the question using ONLY the
code context provided below. Do not use outside knowledge or assume anything
not shown in the context.

For every claim you make, cite the exact file and line range it came from,
in the format (file:line_start-line_end).

If the context does not contain enough information to answer the question,
say so clearly instead of guessing.

--- CODE CONTEXT ---
{context}
--- END CONTEXT ---

Question: {question}

Answer:"""

    return prompt


def answer_question(question: str, top_k: int = 10) -> dict:
    """Retrieve relevant chunks and generate an answer using OpenRouter."""

    hits = retrieve(question, top_k=top_k)
    prompt = build_prompt(question, hits)
    client = get_client()

    response = None

    for attempt in range(MAX_RETRIES):
        try:
            response = client.chat.completions.create(
                model=MODEL_NAME,
                messages=[
                    {
                        "role": "user",
                        "content": prompt,
                    }
                ],
                temperature=0.2,
            )
            print(f"TraceCode model returned: {response.model}")
            break

        except RateLimitError:
            if attempt == MAX_RETRIES - 1:
                raise

            wait = INITIAL_RETRY_DELAY * (2 ** attempt)
            print(
                f"OpenRouter rate limit reached. "
                f"Retrying in {wait} seconds..."
            )
            time.sleep(wait)

        except (
            InternalServerError,
            APIConnectionError,
            APITimeoutError,
        ):
            if attempt == MAX_RETRIES - 1:
                raise

            wait = INITIAL_RETRY_DELAY * (2 ** attempt)
            print(
                f"OpenRouter request failed temporarily. "
                f"Retrying in {wait} seconds..."
            )
            time.sleep(wait)

    if response is None:
        raise RuntimeError("OpenRouter did not return a response.")

    answer = response.choices[0].message.content

    if not answer:
        answer = "The model returned an empty response."

    return {
        "answer": answer,
        "sources": [
            {
                "file": h["metadata"]["file"],
                "start_line": h["metadata"]["start_line"],
                "end_line": h["metadata"]["end_line"],
                "name": h["metadata"]["name"],
                "type": h["metadata"]["type"],
            }
            for h in hits
        ],
    }


if __name__ == "__main__":
    question = input("Ask a question about the codebase: ")
    result = answer_question(question)

    print("\n--- ANSWER ---")
    print(result["answer"])

    print("\n--- SOURCES USED ---")
    for source in result["sources"]:
        print(
            f"- {source['file']}:{source['start_line']}-"
            f"{source['end_line']} "
            f"({source['type']} {source['name']})"
        )
