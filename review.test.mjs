import test from "node:test";
import assert from "node:assert/strict";
import { blankReview, decodeReview, modelPrompt, resultText, sourceLines } from "./review.mjs";

test("page numbering matches visible nonempty source lines", () => {
  const lines = sourceLines("  brief\r\n\r\nDue Friday.\n");
  assert.deepEqual(lines, ["brief", "Due Friday."]);
  assert.ok(modelPrompt(lines).includes('{"line":2,"text":"Due Friday."}'));
});

test("only original text from the indexed lines appears in the export", () => {
  const reply = { ...blankReview(), payment: [2, 1, 2] };
  const review = decodeReview("\x60\x60\x60json\n" + JSON.stringify(reply) + "\n\x60\x60\x60", 2);
  assert.deepEqual(review.payment, [1, 2]);
  const output = resultText(review, ["€8 for the draft", "€9 upon acceptance"], "Manual review");
  assert.match(output, /\[2\] €9 upon acceptance/);
  assert.match(output, /Open question: What are the dates or hours/);
});

test("invalid or out-of-range model evidence never reaches the review", () => {
  for (const mismatch of [[0], [3], ["1"], [1.2], ["€80"], null]) {
    assert.throws(() => decodeReview(JSON.stringify({ ...blankReview(), payment: mismatch }), 2));
  }
  assert.throws(() => decodeReview('{"payment":[]}', 2));
  assert.throws(() => decodeReview("not json", 3));
});
