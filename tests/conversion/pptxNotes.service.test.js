import { jest } from "@jest/globals";
import fs from "fs/promises";
import os from "os";
import path from "path";
import JSZip from "jszip";

const mockPrisma = {
  slide: {
    findMany: jest.fn(),
  },
};

const mockUpdateScriptText = jest.fn();

jest.unstable_mockModule("../../src/db.config.js", () => ({
  prisma: mockPrisma,
}));

jest.unstable_mockModule("../../src/repositories/script.repository.js", () => ({
  updateScriptText: mockUpdateScriptText,
}));

const { applyNotesToProjectSlides, extractSlideNotesFromPptxPath } = await import(
  "../../src/services/conversion/pptxNotes.service.js"
);

const NOTES_REL_TYPE =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesSlide";

const RELS_XML_WITH_NOTES = (target) => `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="${NOTES_REL_TYPE}" Target="${target}" />
</Relationships>`;

const RELS_XML_WITHOUT_NOTES = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship
    Id="rId2"
    Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout"
    Target="../slideLayouts/slideLayout1.xml"
  />
</Relationships>`;

const NOTES_XML_WITH_PARAGRAPHS = `<?xml version="1.0" encoding="UTF-8"?>
<p:notes xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:sp>
        <p:txBody>
          <a:p><a:r><a:t>first paragraph</a:t></a:r></a:p>
          <a:p><a:r><a:t>second paragraph</a:t></a:r></a:p>
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
</p:notes>`;

const NOTES_XML_WITH_SLIDE_NUMBER_PLACEHOLDER = `<?xml version="1.0" encoding="UTF-8"?>
<p:notes xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="2" name="Body Placeholder" />
          <p:cNvSpPr />
          <p:nvPr><p:ph type="body" idx="1" /></p:nvPr>
        </p:nvSpPr>
        <p:txBody>
          <a:p><a:r><a:t>출시 브레이크가 있습니다.</a:t></a:r></a:p>
          <a:p><a:r><a:t>테스트 요건이 필요합니다.</a:t></a:r></a:p>
        </p:txBody>
      </p:sp>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="3" name="Slide Number Placeholder" />
          <p:cNvSpPr />
          <p:nvPr><p:ph type="sldNum" idx="10" /></p:nvPr>
        </p:nvSpPr>
        <p:txBody>
          <a:p>
            <a:fld id="{11111111-1111-1111-1111-111111111111}" type="slidenum">
              <a:rPr lang="en-US" />
              <a:t>3</a:t>
            </a:fld>
          </a:p>
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
</p:notes>`;

const EMPTY_NOTES_XML = `<?xml version="1.0" encoding="UTF-8"?>
<p:notes xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:sp>
        <p:txBody>
          <a:p><a:r><a:t>   </a:t></a:r></a:p>
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
</p:notes>`;

async function createTempPptx(buildZip) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "pptx-notes-test-"));
  const pptxPath = path.join(dir, "sample.pptx");
  const zip = new JSZip();

  await buildZip(zip);

  const buffer = await zip.generateAsync({ type: "nodebuffer" });
  await fs.writeFile(pptxPath, buffer);
  return { dir, pptxPath };
}

describe("pptxNotes.service", () => {
  beforeEach(() => {
    mockPrisma.slide.findMany.mockReset();
    mockUpdateScriptText.mockReset();
  });

  test("extractSlideNotesFromPptxPath parses notes by slide number with relative target", async () => {
    const { dir, pptxPath } = await createTempPptx(async (zip) => {
      zip.file("ppt/slides/slide1.xml", "<p:sld />");
      zip.file("ppt/slides/slide2.xml", "<p:sld />");
      zip.file("ppt/slides/slide3.xml", "<p:sld />");

      zip.file("ppt/slides/_rels/slide1.xml.rels", RELS_XML_WITH_NOTES("../notesSlides/notesSlide1.xml"));
      zip.file("ppt/slides/_rels/slide2.xml.rels", RELS_XML_WITHOUT_NOTES);
      zip.file("ppt/slides/_rels/slide3.xml.rels", RELS_XML_WITH_NOTES("../notesSlides/notesSlide3.xml"));

      zip.file("ppt/notesSlides/notesSlide1.xml", NOTES_XML_WITH_PARAGRAPHS);
      zip.file("ppt/notesSlides/notesSlide3.xml", EMPTY_NOTES_XML);
    });

    try {
      const notesMap = await extractSlideNotesFromPptxPath(pptxPath);

      expect(notesMap.get(1)).toBe("first paragraph\nsecond paragraph");
      expect(notesMap.has(2)).toBe(false);
      expect(notesMap.has(3)).toBe(false);
      expect(notesMap.size).toBe(1);
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  test("extractSlideNotesFromPptxPath excludes slide number placeholder text", async () => {
    const { dir, pptxPath } = await createTempPptx(async (zip) => {
      zip.file("ppt/slides/slide3.xml", "<p:sld />");
      zip.file("ppt/slides/_rels/slide3.xml.rels", RELS_XML_WITH_NOTES("../notesSlides/notesSlide3.xml"));
      zip.file("ppt/notesSlides/notesSlide3.xml", NOTES_XML_WITH_SLIDE_NUMBER_PLACEHOLDER);
    });

    try {
      const notesMap = await extractSlideNotesFromPptxPath(pptxPath);
      expect(notesMap.get(3)).toBe("출시 브레이크가 있습니다.\n테스트 요건이 필요합니다.");
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  test("extractSlideNotesFromPptxPath skips slides when rels are missing", async () => {
    const { dir, pptxPath } = await createTempPptx(async (zip) => {
      zip.file("ppt/slides/slide1.xml", "<p:sld />");
      zip.file("ppt/notesSlides/notesSlide1.xml", NOTES_XML_WITH_PARAGRAPHS);
    });

    try {
      const notesMap = await extractSlideNotesFromPptxPath(pptxPath);
      expect(notesMap.size).toBe(0);
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  test("applyNotesToProjectSlides applies only empty scripts and reports summary", async () => {
    mockPrisma.slide.findMany.mockResolvedValue([
      { id: 11n, slideNum: 1n, script: null },
      { id: 12n, slideNum: 2n, script: { scriptText: "already written" } },
      { id: 13n, slideNum: 3n, script: { scriptText: "   " } },
    ]);
    mockUpdateScriptText.mockResolvedValue({});

    const result = await applyNotesToProjectSlides({
      projectId: 100n,
      notesMap: new Map([
        [1, "hello"],
        [2, "should be skipped"],
        [3, "world"],
        [9, "unmatched"],
      ]),
    });

    expect(mockPrisma.slide.findMany).toHaveBeenCalledWith({
      where: {
        projectId: 100n,
        isDeleted: false,
      },
      select: {
        id: true,
        slideNum: true,
        script: {
          select: {
            scriptText: true,
          },
        },
      },
    });
    expect(mockUpdateScriptText).toHaveBeenCalledTimes(2);
    expect(mockUpdateScriptText).toHaveBeenNthCalledWith(1, 11n, "hello", 5, 1);
    expect(mockUpdateScriptText).toHaveBeenNthCalledWith(2, 13n, "world", 5, 1);
    expect(result).toEqual({
      appliedCount: 2,
      skippedExistingCount: 1,
      unmatchedCount: 1,
    });
  });

  test("applyNotesToProjectSlides returns zero summary for empty notes map", async () => {
    const result = await applyNotesToProjectSlides({
      projectId: 1n,
      notesMap: new Map(),
    });

    expect(mockPrisma.slide.findMany).not.toHaveBeenCalled();
    expect(mockUpdateScriptText).not.toHaveBeenCalled();
    expect(result).toEqual({
      appliedCount: 0,
      skippedExistingCount: 0,
      unmatchedCount: 0,
    });
  });
});
