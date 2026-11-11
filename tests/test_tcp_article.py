"""Exercise the published TCP framing code with real sockets and controlled reads."""

from collections import deque
from pathlib import Path
import re
import socket
import types

import pytest


ARTICLE = (Path(__file__).resolve().parents[1]
           / "site/src/content/field-notes/tcp-reliable-bytes-congestion-and-failure.md")
TEXT = ARTICLE.read_text()
SOURCE = re.search(r"```python\n(.*?)\n```", TEXT, re.DOTALL).group(1)
MODULE = types.ModuleType("tcp_article")
exec(compile(SOURCE, str(ARTICLE), "exec"), MODULE.__dict__)


class FragmentedSocket:
    def __init__(self, chunks, initial_timeout=17.0):
        self.chunks = deque(chunks)
        self.timeout = initial_timeout
        self.timeouts = []
        self.requests = []

    def gettimeout(self):
        return self.timeout

    def settimeout(self, value):
        self.timeouts.append(value)
        self.timeout = value

    def recv(self, size):
        self.requests.append(size)
        if not self.chunks:
            return b""
        data = self.chunks.popleft()
        if len(data) > size:
            self.chunks.appendleft(data[size:])
        return data[:size]


def frame(payload):
    return len(payload).to_bytes(4, "big") + payload


def test_real_loopback_example_matches_published_output(capsys):
    MODULE.main()
    assert capsys.readouterr().out.strip() == re.search(r"```text\n(.*?)\n```", TEXT, re.DOTALL).group(1)


@pytest.mark.parametrize("fragment_size", [1, 2, 3, 5, 1000])
def test_two_records_with_arbitrary_fragmentation_and_original_timeout(fragment_size):
    payloads = [b"hello", b"TCP"]
    wire = b"".join(map(frame, payloads))
    peer = FragmentedSocket([wire[i:i + fragment_size] for i in range(0, len(wire), fragment_size)])
    assert [MODULE.read_frame(peer, 1024, 2.0) for _ in payloads] == payloads
    assert not peer.chunks
    assert peer.timeout == 17.0


@pytest.mark.parametrize("payload", [b"", b"a", b"\x00\xff\n", "星".encode("utf-8"), b"x" * 4096])
def test_generic_binary_and_empty_records(payload):
    peer = FragmentedSocket([frame(payload)])
    assert MODULE.read_frame(peer, len(payload), 2.0) == payload
    assert peer.timeout == 17.0


@pytest.mark.parametrize("wire", [b"", b"\x00", b"\x00\x00\x00", frame(b"abc")[:-1]])
def test_truncated_header_or_payload_is_never_a_complete_record(wire):
    peer = FragmentedSocket([wire] if wire else [])
    with pytest.raises(EOFError, match="before the frame was complete"):
        MODULE.read_frame(peer, 1024, 2.0)
    assert peer.timeout == 17.0


def test_oversized_unsigned_length_is_rejected_before_payload_reads():
    peer = FragmentedSocket([(2 ** 32 - 1).to_bytes(4, "big"), b"unread payload"])
    with pytest.raises(ValueError, match="size limit"):
        MODULE.read_frame(peer, 1024, 2.0)
    assert peer.requests == [4]
    assert list(peer.chunks) == [b"unread payload"]
    assert peer.timeout == 17.0


def test_one_deadline_covers_header_and_body_even_when_bytes_keep_arriving(monkeypatch):
    ticks = iter([10.0, 10.2, 10.7, 11.1])
    monkeypatch.setattr(MODULE.time, "monotonic", lambda: next(ticks))
    peer = FragmentedSocket([b"\x00\x00", b"\x00\x03", b"abc"])
    with pytest.raises(TimeoutError, match="Frame deadline expired"):
        MODULE.read_frame(peer, 1024, 1.0)
    assert peer.timeouts[:2] == pytest.approx([0.8, 0.3])
    assert list(peer.chunks) == [b"abc"]
    assert peer.timeout == 17.0


def test_transport_error_restores_the_original_socket_timeout():
    class BrokenSocket(FragmentedSocket):
        def recv(self, size):
            raise ConnectionResetError("Injected reset")

    peer = BrokenSocket([])
    with pytest.raises(ConnectionResetError, match="Injected reset"):
        MODULE.read_frame(peer, 1024, 1.0)
    assert peer.timeout == 17.0


@pytest.mark.parametrize("limit,timeout", [(-1, 1), (1.5, 1), (0, 0), (2, -1),
                                              (2, float("inf")), (2, float("nan"))])
def test_invalid_configuration_fails_before_reading(limit, timeout):
    peer = FragmentedSocket([])
    with pytest.raises(ValueError):
        MODULE.read_frame(peer, limit, timeout)
    assert not peer.requests
    assert not peer.timeouts


def test_example_closes_all_socket_descriptors(monkeypatch, capsys):
    real_socket = socket.socket
    opened = []

    def tracked(*args, **kwargs):
        item = real_socket(*args, **kwargs)
        opened.append(item)
        return item

    monkeypatch.setattr(socket, "socket", tracked)
    MODULE.main()
    capsys.readouterr()
    assert len(opened) == 3
    assert all(item.fileno() == -1 for item in opened)
