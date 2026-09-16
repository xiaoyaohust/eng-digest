---
title: "Sample: Staff System Design Interview Notes"
description: "A placeholder interview write-up showing the recommended format for this section — not a real interview experience."
date: 2026-09-15
company: "Example Corp"
level: "Staff"
rounds:
  - system-design
tags:
  - sample
  - system-design
  - staff
draft: false
sample: true
---

# Overview

This is a **sample** interview experience article included to demonstrate the recommended
format for this section. Replace it with a real write-up, or use it as a template for your
own — just remove `sample: true` from the frontmatter once the content reflects an actual
interview.

# Process

- **Rounds:** one 45-minute system design round (as an example).
- **Format:** whiteboard/collaborative doc, interviewer-driven follow-ups.

# The Question (paraphrased)

"Design a notification service that can deliver push, email, and SMS notifications to
millions of users, with delivery guarantees and user preference controls."

# What Went Well

- Starting with clarifying questions (delivery guarantees? which channels? scale?) before
  drawing anything.
- Explicitly calling out the tradeoff between at-least-once delivery and idempotent consumers
  before the interviewer asked about it.

# What Could Have Gone Better

- Spent too long on the data model before sketching the high-level architecture — worth
  timeboxing each section out loud so the interviewer can redirect early if needed.

# Lessons for Next Time

- State assumptions and capacity numbers early, even rough ones — it signals structured
  thinking and gives the interviewer something to correct if it's off.
- Leave explicit time at the end for the "how would this change at 10x scale" follow-up,
  which came up in this format.

# Sample Follow-up Questions Asked

- How do you avoid duplicate notifications on retry?
- How would you support per-user rate limiting on notification volume?
- How would you prioritize urgent notifications over bulk/marketing ones?
