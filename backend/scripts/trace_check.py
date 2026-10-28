"""Trace one check through the real model: prints exactly what goes to Claude, the raw
reply, and what the API saves and returns. Costs one check (about R0.005).

    uv run python -m scripts.trace_check "Hi Ma, it's me. This is my new number..."

It runs the same ai.run_check the API uses, only watching the Claude call on the way past.
"""

import json
import sys

from app import ai


def main():
    text = " ".join(sys.argv[1:]) or "Hi Ma, it's me. My phone fell in the water so this is my new number. Can you send R2,500 urgently?"
    real_client = ai._client

    def watched_client():
        client = real_client()
        parse = client.messages.parse

        def traced_parse(**request):
            shown = {**request, "system": f"<SYSTEM_PROMPT from ai.py, {len(ai.SYSTEM_PROMPT)} characters>", "output_format": "ScamVerdict"}
            print("== 1. Request to Claude\n" + json.dumps(shown, indent=2))
            response = parse(**request)
            print("\n== 2. Raw reply from Claude\n" + response.model_dump_json(indent=2, exclude={"parsed_output"}))
            return response

        client.messages.parse = traced_parse
        return client

    ai._client = watched_client
    result = ai.run_check("message", text, None)
    print("\n== 3. What the API saves and sends to the app\n" + json.dumps(result, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
