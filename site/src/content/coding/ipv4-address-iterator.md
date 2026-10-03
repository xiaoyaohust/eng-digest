---
title: "IPv4 Address Iterator: One 32-Bit Cursor"
description: "A lazy IPv4 iterator with Java and Python solutions, carry handling, the final-address boundary, and CIDR/IPv6 interview follow-ups."
date: 2026-10-02
difficulty: medium
patterns:
  - bit-manipulation
  - iterator
  - parsing
languages:
  - java
  - python
tags:
  - bit-manipulation
  - iteration
  - networking
featured: true
draft: false
practice:
  - question: "Why does the iterator need a value one past 255.255.255.255?"
    topic: "Boundary conditions"
    hint: "The final address still has to be returned before hasNext becomes false."
    answer: "After next returns 2^32 - 1, the cursor advances to 2^32. That out-of-range sentinel lets hasNext use one inclusive comparison and prevents the last address from being skipped."
  - question: "What does adding one to 10.20.30.255 produce?"
    topic: "Bit representation"
    hint: "The last octet is the lowest eight bits."
    answer: "10.20.31.0. The low byte overflows from 255 to 0 and carries into the next byte, just as ordinary integer addition does."
  - question: "For 192.168.1.10/30, where does a full CIDR-block iterator begin?"
    topic: "CIDR semantics"
    hint: "Clear the two host bits first."
    answer: "It begins at the network address 192.168.1.8 and ends at 192.168.1.11. A different contract could begin at the supplied .10 and stop at .11, so clarify which range is requested."
---

## Problem

Implement a forward-only iterator over IPv4 addresses. An address is written as four decimal octets, `A.B.C.D`, each between 0 and 255. The constructor receives `startIp`. The **first** call to `next()` returns that address, and each later call returns the next numeric IPv4 address. After returning `255.255.255.255`, `hasNext()` becomes false. The caller normally checks `hasNext()` before calling `next()`; our implementations also report exhaustion explicitly.

For example, starting at `255.255.255.253` produces `255.255.255.253`, `255.255.255.254`, and `255.255.255.255`, then stops. This is a **numeric address iterator**, not a list of usable host addresses: it includes values that may have special networking meanings. The base problem has no CIDR prefix, subnet exclusions, or IPv6 input.

The octet count and width are fixed by IPv4 itself, not by an example's numbers. [RFC 791 describes IPv4 addresses as four octets, or 32 bits](https://www.rfc-editor.org/rfc/rfc791.html).

## The key idea: increment one number

You could store four octets and write carry logic: increment `D`; if it exceeds 255, reset it to zero and increment `C`; repeat for `B` and `A`. That is `O(1)` because there are exactly four octets, but it gives the code several branches and an awkward final-address case.

Instead, interpret the dotted address as one unsigned 32-bit integer:

```text
value = A × 256³ + B × 256² + C × 256 + D
      = (A << 24) | (B << 16) | (C << 8) | D
```

Then moving to the next address is simply `value + 1`. The carry happens automatically. For `10.20.30.255`, the low eight bits change from `11111111` to `00000000`, and the next eight-bit group increases from 30 to 31. The next address is `10.20.31.0`. No octet-specific carry code is needed.

The iterator stores just `current`: the number that the next `next()` call must return. It formats `current` into four decimal octets, then increments it. The maximum legal value is `2³² - 1 = 4,294,967,295`. Once that value has been returned, `current` becomes `2³²`, an **exhausted sentinel**. Therefore `hasNext()` checks `current <= 2³² - 1`, not `<`.

Java's signed 32-bit `int` cannot represent the upper half of IPv4, so the Java cursor uses `long`. Python integers already support this range. Both implementations build the limit from IPv4's format constants rather than scattering unexplained numeric literals through the algorithm.

| Before `next()` | Returned address | Cursor afterward | `hasNext()` afterward |
| --- | --- | --- | --- |
| `2³² - 3` | `255.255.255.253` | `2³² - 2` | true |
| `2³² - 2` | `255.255.255.254` | `2³² - 1` | true |
| `2³² - 1` | `255.255.255.255` | `2³²` | false |

## Java solution

Save this complete program as `IPv4Iterator.java`. The class has one cursor field and three core operations: constructor, `hasNext`, and `next`. Parsing stays in the constructor, and formatting stays in `next`, so the implementation does not split the main idea across many helpers. It parses octets as decimal digits and normalizes leading zeros on output; if a particular API requires *canonical input only*, add a leading-zero check.

```java
import java.util.NoSuchElementException;

public class IPv4Iterator {
    private static final int OCTETS = 4;
    private static final int BITS_PER_OCTET = 8;
    private static final int MAX_OCTET = (1 << BITS_PER_OCTET) - 1;
    private static final long MAX_IP = (1L << (OCTETS * BITS_PER_OCTET)) - 1;

    private long current;

    public IPv4Iterator(String startIp) {
        if (startIp == null) {
            throw new IllegalArgumentException("IPv4 address cannot be null");
        }

        // Parse exactly four decimal octets into one unsigned 32-bit value.
        String[] parts = startIp.split("\\.", -1);
        if (parts.length != OCTETS) {
            throw new IllegalArgumentException("Invalid IPv4 address: " + startIp);
        }
        for (String part : parts) {
            if (part.isEmpty()) {
                throw new IllegalArgumentException("Invalid IPv4 address: " + startIp);
            }
            int octet = 0;
            for (int i = 0; i < part.length(); i++) {
                char digit = part.charAt(i);
                if (digit < '0' || digit > '9') {
                    throw new IllegalArgumentException("Invalid IPv4 address: " + startIp);
                }
                octet = octet * 10 + (digit - '0');
                if (octet > MAX_OCTET) {
                    throw new IllegalArgumentException("Invalid IPv4 address: " + startIp);
                }
            }
            current = (current << BITS_PER_OCTET) | octet;
        }
    }

    public boolean hasNext() {
        return current <= MAX_IP;
    }

    public String next() {
        if (!hasNext()) {
            throw new NoSuchElementException("No IPv4 addresses remain");
        }

        // Format the current value, then advance the cursor once.
        long value = current;
        StringBuilder result = new StringBuilder();
        for (int position = OCTETS - 1; position >= 0; position--) {
            if (position != OCTETS - 1) result.append('.');
            result.append((value >>> (position * BITS_PER_OCTET)) & MAX_OCTET);
        }
        current++;
        return result.toString();
    }

    public static void main(String[] args) {
        // Test 1: The first result is the input; ordinary increments change only the last octet.
        IPv4Iterator normal = new IPv4Iterator("192.168.1.10");
        System.out.println(normal.next()); // 192.168.1.10
        System.out.println(normal.next()); // 192.168.1.11

        // Test 2: Crossing 255 carries into the preceding octet.
        IPv4Iterator carry = new IPv4Iterator("10.20.30.254");
        System.out.println(carry.next()); // 10.20.30.254
        System.out.println(carry.next()); // 10.20.30.255
        System.out.println(carry.next()); // 10.20.31.0

        // Test 3: Consecutive 255 octets produce a multi-octet carry.
        IPv4Iterator multiCarry = new IPv4Iterator("10.20.255.255");
        System.out.println(multiCarry.next()); // 10.20.255.255
        System.out.println(multiCarry.next()); // 10.21.0.0

        // Test 4: The last IPv4 address is returned exactly once.
        IPv4Iterator nearEnd = new IPv4Iterator("255.255.255.253");
        while (nearEnd.hasNext()) System.out.println(nearEnd.next());
        System.out.println(nearEnd.hasNext()); // false

        // Test 5: Starting at the maximum still allows one result.
        IPv4Iterator maximum = new IPv4Iterator("255.255.255.255");
        System.out.println(maximum.hasNext()); // true
        System.out.println(maximum.next());    // 255.255.255.255
        System.out.println(maximum.hasNext()); // false

        // Test 6: The minimum address is included, even though it has a special network use.
        IPv4Iterator minimum = new IPv4Iterator("0.0.0.0");
        System.out.println(minimum.next()); // 0.0.0.0
    }
}
```

`split("\\.", -1)` preserves an empty final octet, so `1.2.3.` is rejected. The nested digit loop also rejects signs, spaces, non-ASCII digits, and octets above 255; checking the range during accumulation prevents an arbitrarily long octet from overflowing `int`. The right shifts in `next()` extract one fixed eight-bit group at a time. A `long` stays nonnegative here, but `>>>` makes the unsigned-bit interpretation explicit.

## Python solution

This version exposes `has_next()` and `next()` to mirror the requested API. `StopIteration` is the Python exhaustion signal. Save it as `ipv4_iterator.py` and run it directly to see the tests.

```python
class IPv4Iterator:
    OCTETS = 4
    BITS_PER_OCTET = 8
    MAX_OCTET = (1 << BITS_PER_OCTET) - 1
    MAX_IP = (1 << (OCTETS * BITS_PER_OCTET)) - 1

    def __init__(self, start_ip: str):
        if not isinstance(start_ip, str):
            raise ValueError("IPv4 address must be a string")

        # Parse exactly four decimal octets into one integer.
        parts = start_ip.split(".")
        if len(parts) != self.OCTETS:
            raise ValueError(f"Invalid IPv4 address: {start_ip}")
        self.current = 0
        for part in parts:
            if not part:
                raise ValueError(f"Invalid IPv4 address: {start_ip}")
            octet = 0
            for digit in part:
                if not ("0" <= digit <= "9"):
                    raise ValueError(f"Invalid IPv4 address: {start_ip}")
                octet = octet * 10 + (ord(digit) - ord("0"))
                if octet > self.MAX_OCTET:
                    raise ValueError(f"Invalid IPv4 address: {start_ip}")
            self.current = (self.current << self.BITS_PER_OCTET) | octet

    def has_next(self) -> bool:
        return self.current <= self.MAX_IP

    def next(self) -> str:
        if not self.has_next():
            raise StopIteration("No IPv4 addresses remain")

        # Emit four octets from most significant to least significant.
        value = self.current
        address = ".".join(
            str((value >> (position * self.BITS_PER_OCTET)) & self.MAX_OCTET)
            for position in range(self.OCTETS - 1, -1, -1)
        )
        self.current += 1
        return address


if __name__ == "__main__":
    # Test 1: The first result is the input; the last octet increments normally.
    normal = IPv4Iterator("192.168.1.10")
    print(normal.next())  # 192.168.1.10
    print(normal.next())  # 192.168.1.11

    # Test 2: Crossing 255 carries into the preceding octet.
    carry = IPv4Iterator("10.20.30.254")
    print(carry.next())  # 10.20.30.254
    print(carry.next())  # 10.20.30.255
    print(carry.next())  # 10.20.31.0

    # Test 3: Consecutive 255 octets produce a multi-octet carry.
    multi_carry = IPv4Iterator("10.20.255.255")
    print(multi_carry.next())  # 10.20.255.255
    print(multi_carry.next())  # 10.21.0.0

    # Test 4: The final address is emitted once, and then the iterator stops.
    near_end = IPv4Iterator("255.255.255.253")
    while near_end.has_next():
        print(near_end.next())
    print(near_end.has_next())  # False

    # Test 5: Starting at the maximum allows exactly one result.
    maximum = IPv4Iterator("255.255.255.255")
    print(maximum.has_next())  # True
    print(maximum.next())  # 255.255.255.255
    print(maximum.has_next())  # False

    # Test 6: The minimum numeric address is included.
    minimum = IPv4Iterator("0.0.0.0")
    print(minimum.next())  # 0.0.0.0
```

Both programs keep the same invariant: **`current` is the next address to emit**. This avoids an extra “have I started?” flag and makes the first-call requirement automatic.

## Complexity and why it is optimal

For a valid IPv4 address, construction takes `O(1)` time because there are four octets and at most 15 input characters. If arbitrary invalid strings are included in the analysis, parsing takes `O(L)` for input length `L`. `hasNext()`/`has_next()` takes `O(1)` time. Each `next()` takes `O(1)` time: it extracts four fixed-width octets and creates a string of at most 15 characters. The iterator keeps `O(1)` state and uses `O(1)` temporary space per result. Returning `R` addresses takes `O(R)` total time, which is optimal because all `R` strings must be produced.

Lazy iteration matters. Starting at `0.0.0.0` describes **2³² addresses**; putting them all in a list would be enormous. The cursor allocates only the current output, never the full remaining range.

## Follow-up 1: limit the iterator to a CIDR block

A CIDR prefix such as `192.168.1.10/30` fixes the first 30 bits, leaving two host bits. The **whole block** has `2^(32 - 30) = 4` numeric addresses: `192.168.1.8` through `192.168.1.11`. [RFC 4632 defines CIDR prefixes as a specified number of significant address bits](https://www.rfc-editor.org/rfc/rfc4632.html).

First clarify the interview contract. A *full-block iterator* starts at the network address `.8`; a *start-to-block-end iterator* starts at the supplied `.10` and ends at `.11`. Both are reasonable APIs, but they answer different questions. For the full block, the core cursor methods need no change—only constructor bounds do:

```text
hostBits = ADDRESS_BITS - prefixLength
mask    = (MAX_IP << hostBits) & MAX_IP
network = ip & mask
last    = network | (MAX_IP ^ mask)

current      = network          // full block
endInclusive = last

// Or set current = ip for the start-to-block-end variant.
```

The mask has ones in the prefix and zeros in the host portion. `MAX_IP ^ mask` does the reverse: ones exactly where host bits may vary. OR-ing it with `network` yields the last address in that block. Here `ADDRESS_BITS` is IPv4's fixed width of 32; `prefixLength` is the input. The final `& MAX_IP` keeps a Java `long` mask within its low 32 bits, including at `/0`. Avoid an `int` expression such as `1 << 32`, whose shift count does not mean what this formula requires in Java.

The generic prefix length is an **input variable** in `[0, 32]`, not a hard-coded `/24` or `/30`. `/0` covers the entire IPv4 space and is still lazy; `/32` contains one address. A `/31` contains two numeric addresses. Do not automatically discard the first and last when asked to iterate an *address range*: [RFC 3021 specifically permits both addresses as endpoints on IPv4 point-to-point links](https://www.rfc-editor.org/rfc/rfc3021.html). “Usable host addresses” is a separate contract requiring a policy for `/31`, `/32`, and special-use ranges.

## Follow-up 2: extend the idea to IPv6

The abstraction is still an integer cursor and an inclusive upper bound, but IPv6 addresses are **128 bits**. A Java `long` is no longer enough; a straightforward interview implementation uses `BigInteger`, and a Python implementation can keep using `int`. Java must interpret address bytes as unsigned: `new BigInteger(1, bytes)`, not `new BigInteger(bytes)`, because an address with its top bit set would otherwise be read as negative. Format back to a fixed 16-byte width before converting it to an IPv6 literal.

For IPv6 CIDR, replace 32 with the protocol width (128) and use the same `network = ip & mask` and `last = network | hostMask` formulas. The maximum is `2^128 - 1`. The last value is **not a broadcast address**: [IPv6 has no broadcast addresses](https://www.rfc-editor.org/rfc/rfc4291.html). A `/128` has one address; a `/0` is too large to exhaust in practice, which is another reason to keep the iterator lazy. If parsing Java IPv6 literals, avoid treating a hostname-resolving API as a strict literal parser for untrusted input.

The common failure in all versions is the same: losing the inclusive final address or wrapping the cursor before it can represent “done.” Model the cursor as a value wide enough for **one past the largest legal address**, and the rest of the iterator stays simple.
