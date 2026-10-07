"""Exercise the public meeting lifecycle against a running Zoom-clone API."""

from __future__ import annotations

import argparse
import sys
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default="http://localhost:8000")
    args = parser.parse_args()
    base_url = args.base_url.rstrip("/")

    def run_step(name: str, action: Any) -> Any:
        try:
            result = action()
            print(f"PASS: {name}")
            return result
        except Exception as exc:  # Network and assertion failures should be visible to callers.
            print(f"FAIL: {name}: {exc}", file=sys.stderr)
            raise

    def verify(name: str, condition: bool, failure: str) -> None:
        if not condition:
            print(f"FAIL: {name}: {failure}", file=sys.stderr)
            raise AssertionError(failure)
        print(f"PASS: {name}")

    def request(
        client: httpx.Client,
        method: str,
        path: str,
        **kwargs: Any,
    ) -> httpx.Response:
        response = client.request(method, f"{base_url}{path}", **kwargs)
        if response.is_error:
            raise AssertionError(f"{method} {path} returned {response.status_code}: {response.text}")
        return response

    def check_health(client: httpx.Client) -> str:
        health = request(client, "GET", "/api/health").json()
        if health.get("status") != "ok":
            raise AssertionError(f"Unexpected health response: {health}")
        return str(health["status"])

    try:
        with httpx.Client(timeout=15.0) as client:
            run_step(
                "health check",
                lambda: check_health(client),
            )
            instant = run_step(
                "create instant meeting",
                lambda: request(
                    client,
                    "POST",
                    "/api/meetings/instant",
                    json={"title": "API smoke test"},
                ).json(),
            )
            code = instant["meeting_code"]
            verify(
                "meeting ID and invite link",
                len(code) == 11 and code.isdigit() and code in instant["invite_link"],
                "Instant meeting returned an invalid code or invite link",
            )

            scheduled_start = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
            scheduled = run_step(
                "schedule a future meeting",
                lambda: request(
                    client,
                    "POST",
                    "/api/meetings/schedule",
                    json={
                        "title": "API smoke scheduled",
                        "description": "Created by smoke_test.py",
                        "start_time": scheduled_start,
                        "duration_minutes": 30,
                        "timezone": "UTC",
                    },
                ).json(),
            )
            upcoming = run_step(
                "list scheduled meeting",
                lambda: request(client, "GET", "/api/meetings?type=upcoming").json(),
            )
            verify(
                "upcoming list contains scheduled meeting",
                any(item["meeting_code"] == scheduled["meeting_code"] for item in upcoming),
                "Scheduled meeting is absent from the upcoming list",
            )

            validation = run_step(
                "validate instant meeting",
                lambda: request(client, "GET", f"/api/meetings/{code}/validate").json(),
            )
            verify("meeting validation", validation["exists"], "Created meeting did not validate")

            host_participants = run_step(
                "list host participant",
                lambda: request(client, "GET", f"/api/meetings/{code}/participants").json(),
            )
            host_id = next(item["id"] for item in host_participants if item["role"] == "host")
            headers = {"X-Participant-Id": str(host_id)}

            guests = []
            for name in ("Smoke Guest One", "Smoke Guest Two"):
                guests.append(
                    run_step(
                        f"join as {name}",
                        lambda name=name: request(
                            client,
                            "POST",
                            f"/api/meetings/{code}/join",
                            json={"display_name": name, "passcode": instant["passcode"]},
                        ).json(),
                    )
                )

            sent = run_step(
                "send meeting chat message",
                lambda: request(
                    client,
                    "POST",
                    f"/api/meetings/{code}/chat",
                    headers=headers,
                    json={"content": "Smoke test message"},
                ).json(),
            )
            chat = run_step(
                "poll chat after message ID",
                lambda: request(
                    client,
                    "GET",
                    f"/api/meetings/{code}/chat",
                    params={"after_id": sent["id"] - 1},
                ).json(),
            )
            verify(
                "chat poll contains sent message",
                any(item["id"] == sent["id"] for item in chat),
                "Chat poll omitted the sent message",
            )

            muted = run_step(
                "host mutes participants",
                lambda: request(
                    client,
                    "POST",
                    f"/api/meetings/{code}/mute-all",
                    headers=headers,
                ).json(),
            )
            verify(
                "all guests are muted",
                all(item["is_muted"] for item in muted if item["role"] != "host"),
                "At least one guest remained unmuted",
            )

            removed = run_step(
                "host removes second guest",
                lambda: request(
                    client,
                    "DELETE",
                    f"/api/meetings/{code}/participants/{guests[1]['id']}",
                    headers=headers,
                ).json(),
            )
            verify("guest removed", removed["is_removed"], "Removed guest is not marked removed")

            ended = run_step(
                "host ends meeting",
                lambda: request(
                    client,
                    "POST",
                    f"/api/meetings/{code}/end",
                    headers=headers,
                ).json(),
            )
            verify("meeting ended", ended["status"] == "ended", "Meeting did not enter ended state")
    except Exception:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
