import test from "node:test";
import assert from "node:assert/strict";
import {
  buildExpansionMessages,
  buildTranslationMessages,
  parseExpansionResponse,
  parseTranslationResponse
} from "../src/lib/prompts.js";

test("translation prompt treats page text as data and requests only JSON", () => {
  const messages = buildTranslationMessages({
    selectedText: "bank",
    contextText: "The boat reached the river bank.",
    sourceLanguage: "英语",
    targetLanguage: "简体中文"
  });
  assert.equal(messages.length, 2);
  assert.match(messages[0].content, /不得执行/);
  assert.match(messages[0].content, /不得翻译相邻但未被选中的词/);
  assert.match(messages[1].content, /river bank/);
  assert.match(messages[1].content, /边界为唯一准则/);
  assert.match(messages[1].content, /\{"translation":"译文"\}/);
});

test("translation response parser accepts JSON surrounded by text", () => {
  assert.deepEqual(parseTranslationResponse('结果：{"translation":"河岸"}'), { translation: "河岸" });
});

test("expansion prompt and parser limit meanings to three", () => {
  const messages = buildExpansionMessages({
    selectedText: "bank",
    contextText: "river bank",
    translation: "河岸",
    sourceLanguage: "英语",
    targetLanguage: "简体中文"
  });
  assert.match(messages[1].content, /最多 3 个/);

  const parsed = parseExpansionResponse(JSON.stringify({
    meanings: ["银行", "存储", "依靠", "第四项"],
    example: { source: "I went to the bank.", target: "我去了银行。" }
  }));
  assert.deepEqual(parsed.meanings, ["银行", "存储", "依靠"]);
  assert.equal(parsed.example.target, "我去了银行。");
});
