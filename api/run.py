"""Start the backend development server.

Usage:
    python run.py
    python run.py --host 0.0.0.0 --port 8080
"""

import argparse
import uvicorn


def main() -> None:
    parser = argparse.ArgumentParser(description="Start Spot On backend server")
    parser.add_argument("--host", default="127.0.0.1", help="Bind host (default: 127.0.0.1)")
    parser.add_argument("--port", type=int, default=8000, help="Bind port (default: 8000)")
    parser.add_argument("--no-reload", action="store_true", help="Disable auto-reload")
    args = parser.parse_args()

    uvicorn.run(
        "app.main:app",
        host=args.host,
        port=args.port,
        reload=not args.no_reload,
    )


if __name__ == "__main__":
    main()
