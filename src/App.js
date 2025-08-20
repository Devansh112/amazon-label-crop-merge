import "./App.css";
import React, { useState } from "react";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf";
pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";

function App() {
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState("");
  const [file, setFile] = useState(null); // store selected file

  const handleFileSelect = (e) => {
    setFile(e.target.files[0]);
  };

  const processPdf = async () => {
    if (!file) {
      setStatus("❌ Please select a file first");
      return;
    }

    setProcessing(true);
    setStatus("Reading PDF...");

    try {
      const fileBuffer = await file.arrayBuffer();
      const pdfJsBuffer = fileBuffer.slice(0);
      const pdfLibBuffer = fileBuffer.slice(0);

      const pdf = await pdfjsLib.getDocument({ data: pdfJsBuffer }).promise;
      const pdfDoc = await PDFDocument.load(pdfLibBuffer);
      const newPdf = await PDFDocument.create();
      const font = await newPdf.embedFont(StandardFonts.Helvetica);
      let description = [];

      for (let i = 2; i < pdf.numPages + 1; i += 2) {
        const invoicePage = await pdf.getPage(i);
        const content = await invoicePage.getTextContent();
        const text = content.items.map((it) => it.str).join(" ");
        description.push(
          (
            text.match(/Gardening\s*Bee[\s\S]*?\(\s*[A-Z0-9-]+\s*\)/gi) || []
          ).map((m) => m.trim())
        );
      }

      for (let i = 1; i < pdf.numPages + 1; i += 2) {
        const [labelPage] = await newPdf.copyPages(pdfDoc, [i - 1]);
        newPdf.addPage(labelPage);
      }

      for (let j = 0; j < description.length; j++) {
        const page = newPdf.getPage(j);

        if (description[j].length > 1) {
          for (let k = 0; k < description[j].length; k++) {
            const { width } = page.getSize();
            page.drawText(`ITEM ${k + 1} : \n${description[j][k]}`, {
              x: 50,
              y: 200 - k * 25,
              size: 12,
              font,
              color: rgb(0, 0, 0),
              maxWidth: width - 100,
              lineHeight: 8,
            });
          }
        } else {
          const { width } = page.getSize();
          page.drawText(`ITEM : \n${description[j]}`, {
            x: 50,
            y: 200,
            size: 15,
            font,
            color: rgb(0, 0, 0),
            maxWidth: width - 100,
            lineHeight: 12,
          });
        }
      }

      const pdfBytes = await newPdf.save();
      download(pdfBytes, "processed.pdf", "application/pdf");
      setStatus("✅ Done! Download should begin.");
    } catch (err) {
      console.error(err);
      setStatus("❌ Error processing PDF");
    }

    setProcessing(false);
  };

  const download = (data, filename, type) => {
    const blob = new Blob([data], { type });
    const link = document.createElement("a");
    const url = window.URL.createObjectURL(blob);
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Amazon Invoice Processor</h2>
      <input type="file" accept="application/pdf" onChange={handleFileSelect} />
      <button onClick={processPdf} disabled={processing || !file}>
        {processing ? "Processing..." : "Process PDF"}
      </button>
      {status && <p>{status}</p>}
    </div>
  );
}

export default App;
