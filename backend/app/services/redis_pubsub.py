import asyncio
import json
import uuid
from collections.abc import Awaitable, Callable
from typing import Any

from redis.asyncio import Redis
from redis.exceptions import RedisError

from app.core.config import settings

BOARD_EVENTS_CHANNEL = "collabboard:board-events"

BoardEventHandler = Callable[[uuid.UUID, dict[str, Any]], Awaitable[None]]

redis_client = Redis.from_url(settings.redis_url, decode_responses=True)


async def publish_board_event(
    board_id: uuid.UUID,
    message: dict[str, Any],
) -> bool:
    payload = {
        "board_id": str(board_id),
        "message": message,
    }

    try:
        await redis_client.publish(
            BOARD_EVENTS_CHANNEL,
            json.dumps(payload, default=str),
        )
        return True
    except RedisError:
        return False


async def listen_for_board_events(handler: BoardEventHandler) -> None:
    while True:
        pubsub = redis_client.pubsub()

        try:
            await pubsub.subscribe(BOARD_EVENTS_CHANNEL)

            async for raw_message in pubsub.listen():
                if raw_message.get("type") != "message":
                    continue

                data = raw_message.get("data")
                if not isinstance(data, str):
                    continue

                try:
                    payload = json.loads(data)
                    board_id = uuid.UUID(str(payload.get("board_id")))
                    message = payload.get("message")
                except (json.JSONDecodeError, TypeError, ValueError):
                    continue

                if not isinstance(message, dict):
                    continue

                await handler(board_id, message)
        except asyncio.CancelledError:
            raise
        except RedisError:
            await asyncio.sleep(2)
        finally:
            await pubsub.unsubscribe(BOARD_EVENTS_CHANNEL)
            await pubsub.aclose()


async def close_redis_connection() -> None:
    await redis_client.aclose()
