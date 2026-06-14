import type { PracticeSessionReport } from "./session-report-types";

function wrapText(text: string, maxWidth: number, fontSize: number): string[] {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let line = "";
  const approxCharWidth = fontSize * 0.45;

  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length * approxCharWidth > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

/** Generate and download a practice session PDF in the browser. */
export async function downloadPracticeReportPdf(report: PracticeSessionReport): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 16;
  const contentW = pageW - margin * 2;
  let y = margin;

  const ensureSpace = (needed: number) => {
    const pageH = doc.internal.pageSize.getHeight();
    if (y + needed > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const writeLines = (text: string, fontSize: number, color: [number, number, number], bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(fontSize);
    doc.setTextColor(color[0], color[1], color[2]);
    for (const line of wrapText(text, contentW, fontSize)) {
      ensureSpace(fontSize * 0.5 + 2);
      doc.text(line, margin, y);
      y += fontSize * 0.45 + 1.5;
    }
  };

  const dateStr = new Date(report.endedAt).toLocaleString("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const pct = report.total ? Math.round((report.score / report.total) * 100) : 0;

  writeLines("Deutsch Tutor — Übungsbericht", 16, [30, 30, 30], true);
  y += 2;
  writeLines(report.title, 13, [80, 80, 80]);
  writeLines(`${dateStr} · ${report.score} / ${report.total} richtig (${pct}%)`, 11, [100, 100, 100]);
  y += 4;

  const writeSection = (heading: string, filter: (item: PracticeSessionReport["items"][0]) => boolean) => {
    const sectionItems = report.items.filter(filter);
    if (!sectionItems.length) return;

    writeLines(heading, 12, [30, 30, 30], true);
    y += 1;

    sectionItems.forEach((item, idx) => {
      ensureSpace(28);
      const status = item.correct ? "✓ Richtig" : "✗ Nicht ganz";
      writeLines(`${idx + 1}. ${status}`, 10, item.correct ? [29, 158, 117] : [220, 38, 38], true);
      writeLines(item.prompt, 10, [40, 40, 40]);
      if (item.english) writeLines(`EN: ${item.english}`, 9, [90, 90, 90]);
      if (!item.correct && item.userAnswer) {
        writeLines(`Deine Antwort: ${item.userAnswer}`, 9, [120, 50, 50]);
      }
      writeLines(`Richtig: ${item.correctAnswer}`, 9, [50, 90, 50]);
      if (item.explanation) writeLines(item.explanation, 9, [100, 100, 100]);
      y += 3;
    });
    y += 2;
  };

  writeSection("Richtig beantwortet", i => i.correct);
  writeSection("Noch üben", i => !i.correct);

  if (!report.items.length) {
    writeLines("Keine Einzelantworten aufgezeichnet.", 10, [100, 100, 100]);
  }

  doc.save(`uebungsbericht-${report.type}-${report.id.slice(0, 8)}.pdf`);
}
