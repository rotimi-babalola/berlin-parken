import assert from "node:assert/strict";
import test from "node:test";
import { AREAS, getArea, getAreaCopy } from "../src/lib/areas.ts";
import { isInBerlin } from "../src/lib/results-url.ts";

test("area guides have unique stable slugs and Berlin search centers", () => {
  const slugs = new Set<string>();

  for (const area of AREAS) {
    assert.match(area.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.ok(!slugs.has(area.slug), `duplicate area slug: ${area.slug}`);
    slugs.add(area.slug);

    assert.ok(
      isInBerlin(area.center.latitude, area.center.longitude),
      `${area.slug} center must be in Berlin`,
    );
    assert.ok(area.radiusMeters >= 100 && area.radiusMeters <= 1000);
    assert.ok(area.sources.length > 0);
    for (const source of area.sources) assert.match(source.href, /^https:\/\//);
  }
});

test("area guides carry complete localized page copy", () => {
  for (const area of AREAS) {
    for (const locale of ["en", "de"] as const) {
      const copy = getAreaCopy(area, locale);
      for (const value of [
        copy.h1,
        copy.metaTitle,
        copy.metaDescription,
        copy.lede,
        copy.supplyTitle,
        copy.supplyBody,
        copy.rulesTitle,
        copy.whereTitle,
        copy.whereBody,
        copy.caveat,
        copy.sourcesTitle,
        copy.sourceNote,
        copy.eyebrow,
        copy.name,
        copy.short,
        copy.searchCta,
        copy.otherSearch,
      ])
        assert.ok(value.trim().length > 0, `${area.slug}.${locale} copy empty`);

      assert.ok(copy.sources.length > 0);
      for (const source of copy.sources) {
        assert.ok(source.label.trim().length > 0);
        assert.match(source.href, /^https:\/\//);
      }

      assert.ok(copy.rules.length > 0);
      for (const rule of copy.rules) {
        assert.ok(rule.term.trim().length > 0);
        assert.ok(rule.detail.trim().length > 0);
      }
    }
  }
});

test("area guides resolve by slug only", () => {
  for (const area of AREAS) assert.equal(getArea(area.slug), area);
  assert.equal(getArea("not-a-real-area"), undefined);
});
