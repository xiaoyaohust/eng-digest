"""Run the published loopback experiment with real sockets and verify cleanup."""

import ast
from pathlib import Path
import re
import socket
import types

import pytest


ARTICLE = (Path(__file__).resolve().parents[1]
           / "site/src/content/field-notes/ports-sockets-connections-and-capacity.md")
SOURCE = re.search(r"```python\n(.*?)\n```", ARTICLE.read_text(), re.DOTALL).group(1)
MODULE = types.ModuleType("ports_article")
exec(compile(SOURCE, str(ARTICLE), "exec"), MODULE.__dict__)


@pytest.mark.parametrize("count", [1, 2, 4])
def test_loopback_connections_share_listener_endpoint(count, capsys):
    MODULE.main(count)
    lines = capsys.readouterr().out.splitlines()
    assert len(lines) == count + 1
    listener = ast.literal_eval(lines[0].removeprefix("Listener: "))
    assert listener[0] == "127.0.0.1"
    assert 0 < listener[1] <= 65535
    peers = set()
    for index, line in enumerate(lines[1:], start=1):
        match = re.fullmatch(r"Connection (\d+): local=(\([^)]*\)), remote=(\([^)]*\))", line)
        assert match
        assert int(match[1]) == index
        assert ast.literal_eval(match[2]) == listener
        peer = ast.literal_eval(match[3])
        assert peer[0] == "127.0.0.1"
        assert 0 < peer[1] <= 65535
        peers.add(peer)
    assert len(peers) == count


def test_all_socket_descriptors_are_closed(monkeypatch, capsys):
    real_socket = socket.socket
    opened = []

    def tracked_socket(*args, **kwargs):
        item = real_socket(*args, **kwargs)
        opened.append(item)
        return item

    monkeypatch.setattr(socket, "socket", tracked_socket)
    MODULE.main(3)
    capsys.readouterr()
    assert len(opened) == 7  # One listener, three clients, three accepted sockets.
    assert all(item.fileno() == -1 for item in opened)


def test_partial_setup_failure_closes_already_open_sockets(monkeypatch):
    real_socket = socket.socket
    opened = []

    def fail_during_setup(*args, **kwargs):
        if len(opened) == 2:
            raise OSError("Injected socket creation failure")
        item = real_socket(*args, **kwargs)
        opened.append(item)
        return item

    monkeypatch.setattr(socket, "socket", fail_during_setup)
    with pytest.raises(OSError, match="Injected socket creation failure"):
        MODULE.main(3)
    assert len(opened) == 2
    assert all(item.fileno() == -1 for item in opened)


@pytest.mark.parametrize("count", [0, -1])
def test_nonpositive_connection_count_is_rejected(count):
    with pytest.raises(ValueError, match="must be positive"):
        MODULE.main(count)
