import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { parse } from "yaml";

const english = readFileSync(new URL("../src/content/system-design/end-to-end-encrypted-messaging.md", import.meta.url), "utf8");
const chinese = readFileSync(new URL("../src/content/translations/system-design/end-to-end-encrypted-messaging.md", import.meta.url), "utf8");
const metadata = (text: string) => parse(text.match(/^---\n([\s\S]*?)\n---/)![1]);
const body = (text: string) => text.replace(/^---\n[\s\S]*?\n---\n/, "");
const blocks = (text: string, language: string) => [...text.matchAll(new RegExp("```" + language + "\\n([\\s\\S]*?)\\n```", "g"))].map(match => match[1]);
const outline = (text: string) => body(text).split("\n").flatMap(line => {
  if (/^## /.test(line)) return ["heading"];
  if (/^```/.test(line)) return [line];
  if (/^<div class="table-scroll"/.test(line)) return ["table"];
  if (/^\*(?:Figure|图) /.test(line)) return ["caption"];
  return [];
});
const diagramStructure = (source: string) => source.split("\n").map(line => line
  .replace(/"[^"]*"/g, '"label"')
  .replace(/(participant \w+) as .*/, "$1")
  .replace(/(:).*/, "$1")).join("\n");

describe("bilingual encrypted messaging publication", () => {
  it("publishes an English System Design article with the matching Chinese translation", () => {
    const en = metadata(english), zh = metadata(chinese);
    assert.equal(en.title, "Design an End-to-End Encrypted Messaging Platform");
    assert.equal(en.topic, "Real-Time Systems");
    assert.equal(String(en.date), "2026-11-16");
    assert.equal(en.draft, false);
    assert.equal(en.featured, true);
    assert.deepEqual(en.level, ["senior", "staff", "principal"]);
    assert.ok(en.socialTitle.length < 65 && en.socialDescription.length < 145);
    assert.equal(zh.title, "设计端到端加密聊天平台");
    assert.equal(zh.lang, "zh-CN");
    assert.equal(zh.draft, false);
    assert.doesNotMatch(english, /[\u3400-\u9fff]/);
  });

  it("keeps chapters, code, diagrams, tables, and reference placement aligned across languages", () => {
    assert.deepEqual(outline(chinese), outline(english));
    assert.equal((english.match(/^## /gm) ?? []).length, 16);
    for (const text of [english, chinese]) {
      assert.equal(blocks(text, "mermaid").length, 5);
      assert.equal((text.match(/class="table-scroll"/g) ?? []).length, 5);
      assert.equal((text.match(/tabindex="0"/g) ?? []).length, 5);
      assert.equal((text.match(/role="region" aria-label="[^"]+"/g) ?? []).length, 5);
      for (let number = 1; number <= 15; number++) assert.match(text, new RegExp(`^## ${number}\\. `, "m"));
    }
    assert.deepEqual(blocks(chinese, "mermaid").map(diagramStructure), blocks(english, "mermaid").map(diagramStructure));
    assert.deepEqual(blocks(chinese, "json").map(text => JSON.parse(text)), blocks(english, "json").map(text => JSON.parse(text)));
    assert.deepEqual(blocks(chinese, "text"), blocks(english, "text"));
    const links = (text: string) => [...text.matchAll(/^\- \[[^\]]+\]\((https:[^)]+)\)/gm)].map(match => match[1]);
    assert.equal(links(english).length, 7);
    assert.deepEqual(links(chinese), links(english));
  });

  it("keeps illustrative scale and fanout arithmetic consistent", () => {
    const sends = 2e9 * 50, deliveries = sends * 2.5;
    assert.equal(sends, 100e9);
    assert.equal(deliveries, 250e9);
    assert.equal(Number((sends / 86400 / 1e6).toFixed(2)), 1.16);
    assert.equal(Number((sends / 86400 * 5 / 1e6).toFixed(2)), 5.79);
    assert.equal(Number((deliveries / 86400 * 5 / 1e6).toFixed(2)), 14.47);
    assert.equal(500e6 / 100_000, 5000);
    assert.equal(500e6 * 10_000 / 1e12, 5);
    assert.equal(sends * 1000 * 30 / 1e15, 3);
    assert.equal(5e9 * 300_000 / 1e15, 1.5);
    assert.equal(1000 * 1.5 * 50 / 1000, 75);
    for (const phrase of ["planning assumptions", "14.47 million/s", "75 KB", "not an upper bound", "different encrypted envelopes per device"])
      assert.ok(english.includes(phrase), phrase);
    const send = JSON.parse(blocks(english, "json")[0]);
    const accepted = JSON.parse(blocks(english, "json")[1]);
    assert.equal(send.client_message_id, accepted.client_message_id);
    assert.equal(send.conversation_id, accepted.conversation_id);
    assert.equal(send.membership_version, send.group_key_epoch);
  });

  it("preserves acceptance, deduplication, cursor, authorization, retention, and disaster boundaries", () => {
    const protocol = blocks(english, "text")[0];
    const steps = ["authenticate", "route", "process the next", "resolve an existing receipt", "reject a conflicting", "validate current", "stage event", "commit those outputs", "publish SERVER_ACCEPTED", "materialize"];
    let previous = -1;
    for (const step of steps) {
      const index = protocol.indexOf(step);
      assert.ok(index > previous, step);
      previous = index;
    }
    for (const phrase of [
      "read_committed", "fence an old worker", "do not atomically commit arbitrary",
      "ID_CONFLICT", "RESULT_EXPIRED", "reuse the original bytes", "resolve the existing receipt",
      "same conversation partition", "fixed input partition", "does not imply six missing messages",
      "An epoch field by itself does not fence anything", "immutable target manifest",
      "cannot ACK through 503", "SYNC_RANGE_EXPIRED", "completion barrier", "membership interval",
      "Device-list validation covers the recipient accounts", "invalidation barrier", "fail closed",
      "cannot prove that an authorized client used a fresh secret", "cannot erase private keys",
      "reconcile that reservation and the event log", "incomplete fanout plan can still create references",
      "cannot buffer a database outage indefinitely", "does not restore that suffix",
      "accepted events, dedup receipts, membership state, fanout progress, and inbox heads",
    ]) assert.ok(english.includes(phrase), phrase);
    for (const phrase of ["同一个会话分区", "ID_CONFLICT", "RESULT_EXPIRED", "不能 ACK 到 503", "SYNC_RANGE_EXPIRED", "完成屏障", "设备列表验证覆盖接收者账号", "失效屏障", "预约和事件日志", "零引用计数", "无法恢复这部分数据"])
      assert.ok(chinese.includes(phrase), phrase);
  });
});
