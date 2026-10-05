"use client";
/* Native images preserve uploaded photo pixels for the print/PDF renderer. */
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import { UserRound } from "lucide-react";
import { flushSync } from "react-dom";
import { Button } from "./ui/button";
import "./acknowledgement.css";
import { closingDate, goldGrams } from "@/lib/acknowledgement";

const fields = [
  ["branch", "Branch Name", 55],
  ["center", "Center Name", 55],
  ["member", "Member Name", 55],
  ["grams", "Gold Grams", 24],
  ["booking", "Booking Amount", 24],
  ["frequency", "Type", 24],
  ["dues", "No. of Dues", 24],
  ["closing", "Closing Date", 24],
] as const;
type Values = Record<(typeof fields)[number][0] | "number" | "date", string>;
const empty: Values = {
  number: "1201",
  date: "",
  branch: "",
  center: "",
  member: "",
  grams: "",
  booking: "",
  frequency: "Weekly",
  dues: "",
  closing: "",
};

function displayDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? value.split("-").reverse().join(".")
    : value;
}
function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function AcknowledgementEditor() {
  const [draft, setValues] = useState<Values>(empty);
  const values = {
    ...draft,
    closing: closingDate(draft.date, draft.frequency, draft.dues),
  };
  const [rows, setRows] = useState<Values[]>([]);
  const [selected, setSelected] = useState(-1);
  const [startNumber, setStartNumber] = useState(1201);
  const [sheetStatus, setSheetStatus] = useState("No sheet loaded");
  const sheet = useRef<HTMLInputElement>(null);
  const batch = useRef<HTMLDivElement>(null);
  const [photo, setPhoto] = useState("");
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [scale, setScale] = useState(1);
  const stage = useRef<HTMLDivElement>(null);
  const slip = useRef<HTMLElement>(null);
  const gallery = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const photoVersion = useRef(0);
  useEffect(() => {
    const timer = setTimeout(
      () => setValues((v) => ({ ...v, date: v.date || today() })),
      0,
    );
    const observer = new ResizeObserver(([entry]) =>
      setScale(Math.min(1, entry.contentRect.width / 820)),
    );
    if (stage.current) observer.observe(stage.current);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, []);
  const edit = (key: keyof Values, label: string, max = 24) =>
    preview || key === "closing" ? (
      <span className="ack-value" id={`ack-${key}`} aria-label={label}>
        {displayDate(values[key]) || "\u00a0"}
      </span>
    ) : key === "frequency" ? (
      <>
        <div
          className="ack-frequency ack-screen-only"
          role="radiogroup"
          aria-label="Type"
        >
          {["Weekly", "Biweekly"].map((type) => (
            <label key={type}>
              <input
                type="radio"
                name="frequency"
                value={type}
                checked={values.frequency === type}
                onChange={() => {
                  setValues((v) => ({ ...v, frequency: type }));
                  if (selected >= 0)
                    setRows((current) =>
                      current.map((row, index) =>
                        index === selected ? { ...row, frequency: type } : row,
                      ),
                    );
                }}
              />
              {type}
            </label>
          ))}
        </div>
        <span className="ack-value ack-print-value">{values.frequency}</span>
      </>
    ) : (
      <>
        <input
          id={`ack-${key}`}
          aria-label={label}
          type={key === "date" ? "date" : key === "dues" ? "number" : "text"}
          min={key === "dues" ? 1 : undefined}
          step={key === "dues" ? 1 : undefined}
          onClick={(e) => {
            if (key === "date") {
              try {
                e.currentTarget.showPicker();
              } catch {
                /* Native control remains keyboard accessible. */
              }
            }
          }}
          autoComplete="off"
          maxLength={max}
          value={values[key]}
          placeholder=""
          onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
        />
        <span className="ack-value ack-print-value">
          {displayDate(values[key]) || "\u00a0"}
        </span>
      </>
    );

  function applyRow(index: number) {
    if (!rows[index]) return;
    setSelected(index);
    setValues({
      ...rows[index],
      number: String(startNumber + index),
    });
    photoVersion.current++;
    setPhoto("");
  }
  async function loadSheet(file?: File) {
    if (!file) return;
    if (
      file.size > 10 * 1024 * 1024 ||
      !file.name.toLowerCase().endsWith(".xlsx")
    ) {
      setSheetStatus("Choose an .xlsx file smaller than 10 MB.");
      return;
    }
    setSheetStatus("Reading sheet…");
    try {
      const { default: ExcelJS } = await import("exceljs");
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(await file.arrayBuffer());
      const grid: string[][] = [];
      workbook.worksheets[0]?.eachRow((row) => {
        const cells: string[] = [];
        row.eachCell({ includeEmpty: true }, (cell, col) => {
          cells[col - 1] =
            cell.value == null
              ? ""
              : cell.value instanceof Date
                ? cell.value.toISOString().slice(0, 10)
                : cell.text;
        });
        grid.push(cells);
      });
      const headerIndex = grid.findIndex((row) =>
        row.some((cell) => /MEMBER\s*NAME/i.test(cell)),
      );
      if (headerIndex < 0) throw new Error("Missing header");
      const headers = grid[headerIndex].map((v) =>
        v.toUpperCase().replace(/[^A-Z0-9]/g, " "),
      );
      const branch =
        grid
          .slice(0, headerIndex)
          .flat()
          .find(Boolean)
          ?.split(/[-–—]/)[0]
          .trim() || "";
      const column = (row: string[], pattern: RegExp) =>
        row[headers.findIndex((h) => pattern.test(h))]?.trim() || "";
      const dateValue = (value: string) => {
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
        const m = value.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2}|\d{4})$/);
        return m
          ? `${m[3].length === 2 ? "20" : ""}${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`
          : "";
      };
      const imported = grid
        .slice(headerIndex + 1)
        .map((row) => ({
          ...empty,
          branch: column(row, /BRANCH/) || branch,
          center: column(row, /CENT[ER]+/),
          member: column(row, /MEMBER\s*NAME/),
          grams: goldGrams(
            column(row, /SCHEME|GRAM/),
            headers.some((h) => /GOLD\s*SCHEME/.test(h)),
          ),
          booking: column(row, /BOOKING|^F\s*C$/),
          dues: column(row, /^WEEKS$|DUES/),
          frequency: /^biweekly$/i.test(column(row, /^TYPE$/))
            ? "Biweekly"
            : /^weekly$/i.test(column(row, /^TYPE$/))
              ? "Weekly"
              : !column(row, /^TYPE$/)
                ? values.frequency || "Weekly"
                : "",
          date: dateValue(column(row, /LOAN DATE|CREATION DATE/)),
        }))
        .filter((row) => row.member);
      if (!imported.length) throw new Error("No members");
      setRows(imported);
      setSelected(0);
      setValues({ ...imported[0], number: String(startNumber) });
      photoVersion.current++;
      setPhoto("");
      const review = imported.filter((row) => !row.grams).length;
      setSheetStatus(
        `${imported.length} members loaded · ${file.name}${review ? ` · ${review} member(s) need Gold Grams entered manually` : ""}`,
      );
    } catch {
      setSheetStatus(
        "Could not load sheet. Use a loan-plan .xlsx with a Member Name column.",
      );
    }
  }
  function printAll() {
    if (!rows.length || !slip.current || !batch.current) {
      window.print();
      return;
    }
    const keep = values;
    batch.current.replaceChildren();
    for (let i = 0; i < rows.length; i++) {
      flushSync(() =>
        setValues({
          ...(i === selected ? keep : rows[i]),
          number: String(startNumber + i),
        }),
      );
      const copy = slip.current.cloneNode(true) as HTMLElement;
      copy.style.transform = "none";
      copy
        .querySelectorAll("input, .ack-frequency")
        .forEach((input) => input.remove());
      copy
        .querySelectorAll(".ack-print-value")
        .forEach((el) => el.classList.remove("ack-print-value"));
      copy
        .querySelectorAll(".ack-photo img, .ack-photo-hint, .ack-photo-tools")
        .forEach((el) => el.remove());
      // A single uploaded photo must never be assigned to every member.
      if (i === selected && photo) {
        const img = document.createElement("img");
        img.src = photo;
        img.alt = "Member photo";
        copy.querySelector(".ack-photo")?.append(img);
      }
      batch.current.append(copy);
    }
    flushSync(() => setValues(keep));
    document.body.classList.add("ack-print-batch");
    const cleanup = () => {
      document.body.classList.remove("ack-print-batch");
      batch.current?.replaceChildren();
    };
    window.addEventListener("afterprint", cleanup, { once: true });
    window.print();
  }

  async function readPhoto(file?: File) {
    if (!file) return;
    const version = ++photoVersion.current;
    setMessage("");
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 10 * 1024 * 1024
    ) {
      setMessage("Choose a JPG, PNG or WebP image smaller than 10 MB.");
      return;
    }
    try {
      const img = new Image();
      img.src = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Image read failed"));
        reader.readAsDataURL(file);
      });
      await img.decode();
      const canvas = document.createElement("canvas");
      canvas.width = 720;
      canvas.height = 920;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Image unavailable");
      const ratio = Math.max(720 / img.width, 920 / img.height);
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, 720, 920);
      ctx.drawImage(
        img,
        (720 - img.width * ratio) / 2,
        (920 - img.height * ratio) / 2,
        img.width * ratio,
        img.height * ratio,
      );
      if (version === photoVersion.current)
        setPhoto(canvas.toDataURL("image/jpeg", 0.92));
    } catch {
      setMessage("This image could not be opened. Try a JPG or PNG photo.");
    }
  }

  async function download() {
    if (!slip.current) return;
    setBusy(true);
    setMessage("");
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      await Promise.all(
        Array.from(slip.current.querySelectorAll("img")).map((img) =>
          img.decode(),
        ),
      );
      const canvas = await html2canvas(slip.current, {
        scale: 3,
        backgroundColor: "#ffffff",
        width: 820,
        height: 560,
        onclone: (doc) => {
          const copy = doc.querySelector<HTMLElement>(".ack-slip")!;
          copy.style.transform = "none";
          copy.querySelectorAll(".ack-frequency").forEach((el) => {
            const text = doc.createElement("span");
            text.className = "ack-value";
            text.textContent = values.frequency;
            el.replaceWith(text);
          });
          copy.querySelectorAll<HTMLInputElement>("input").forEach((input) => {
            const text = doc.createElement("span");
            text.className = "ack-value";
            text.textContent = displayDate(input.value) || "\u00a0";
            input.replaceWith(text);
          });
          copy
            .querySelectorAll(
              ".ack-photo-hint, .ack-print-value, .ack-photo-tools",
            )
            .forEach((el) => el.remove());
          copy.classList.add("ack-export");
        },
      });
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a5",
        compress: true,
      });
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", 10, 9, 190, 129.76);
      const filename =
        `${values.number || "draft"}-${values.member || "member"}`
          .replace(/[^\p{L}\p{N}_-]+/gu, "-")
          .slice(0, 90);
      pdf.save(`JFS-gold-coin-${filename}.pdf`);
      setMessage("PDF downloaded. Print at actual size on A5 landscape paper.");
    } catch {
      setMessage(
        "PDF could not be generated. Please try again or use Print / Save as PDF.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="ack-toolbar ack-screen-only">
        <div className="ack-actions">
          <Button variant="outline" onClick={() => sheet.current?.click()}>
            Load Excel
          </Button>

          <Button variant="outline" onClick={() => gallery.current?.click()}>
            Add photo
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setValues({
                ...empty,
                number: String(Number(values.number || 1200) + 1),
                date: today(),
              });
              setSelected(-1);
              photoVersion.current++;
              setPhoto("");
            }}
          >
            Clear
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            Print 1
          </Button>
          <Button variant="outline" onClick={printAll}>
            Print all
          </Button>
          <Button disabled={busy} onClick={download}>
            {busy ? "Creating PDF…" : "Download PDF"}
          </Button>
        </div>
      </div>
      <div className="ack-strip ack-screen-only">
        <label htmlFor="ack-member-select">Member</label>
        <select
          id="ack-member-select"
          value={selected}
          onChange={(e) => applyRow(Number(e.target.value))}
        >
          <option value={-1}>
            {rows.length
              ? "Select a member…"
              : "Load an Excel file to pick a member"}
          </option>
          {rows.map((row, i) => (
            <option key={i} value={i}>
              {i + 1}. {row.member}
              {row.center ? ` — ${row.center}` : ""}
            </option>
          ))}
        </select>
        <div className="ack-member-nav">
          <button
            aria-label="Previous member"
            disabled={selected <= 0}
            onClick={() => applyRow(selected - 1)}
          >
            ‹
          </button>
          <button
            aria-label="Next member"
            disabled={!rows.length || selected >= rows.length - 1}
            onClick={() => applyRow(selected + 1)}
          >
            ›
          </button>
        </div>
        <label htmlFor="ack-start">Book start no.</label>
        <input
          id="ack-start"
          type="number"
          min={1}
          max={999999999}
          value={startNumber}
          onChange={(e) => {
            const n = Math.max(1, Math.min(999999999, Number(e.target.value)));
            setStartNumber(n);
            setValues((v) => ({
              ...v,
              number: String(n + Math.max(0, selected)),
            }));
          }}
        />
        <span className="ack-sheet-status">{sheetStatus}</span>
      </div>
      <input
        ref={sheet}
        hidden
        type="file"
        accept=".xlsx"
        aria-label="Upload Excel"
        onChange={(e) => {
          void loadSheet(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <input
        ref={gallery}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        aria-label="Upload member photo"
        hidden
        onChange={(e) => {
          void readPhoto(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <input
        ref={camera}
        type="file"
        accept="image/*"
        capture="user"
        aria-label="Take member photo"
        hidden
        onChange={(e) => {
          void readPhoto(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <p className="ack-status ack-screen-only" role="status">
        {message}
      </p>
      <div className={`ack-stage ${preview ? "is-preview" : ""}`} ref={stage}>
        <div
          className="ack-sizer"
          style={
            preview ? { width: 820 * scale, height: 560 * scale } : undefined
          }
        >
          <article
            ref={slip}
            className="ack-slip"
            aria-label="Gold coin acknowledgement"
            style={preview ? { transform: `scale(${scale})` } : undefined}
          >
            <header className="ack-head">
              <img
                className="ack-logo"
                src="/branding/jayant-logo.jpg"
                alt="Jayant Fin Services logo"
              />
              <div className="ack-titles">
                <h2>JAYANT FIN SERVICES</h2>
                <p>GOLD COIN ACKNOWLEDGEMENT</p>
              </div>
            </header>
            <div className="ack-rule" />
            <div className="ack-meta">
              <div className="ack-number">
                <b>No.</b>
                {edit("number", "Acknowledgement number")}
              </div>
              <div className="ack-date">
                <b>Date</b>
                {edit("date", "Creation Date")}
              </div>
            </div>
            <div className="ack-body">
              <img
                className="ack-watermark"
                src="/branding/jayant-logo.jpg"
                alt=""
              />
              <div>
                <button
                  type="button"
                  className="ack-photo"
                  aria-label="Choose member photo"
                  disabled={preview}
                  onClick={() => gallery.current?.click()}
                >
                  {photo ? (
                    <img src={photo} alt="Member photo" />
                  ) : (
                    <span className="ack-photo-hint">
                      ＋<br />
                      Add member photo
                    </span>
                  )}
                </button>
                <p className="ack-photo-caption">Member photo</p>
                {!preview && (
                  <div className="ack-photo-tools ack-screen-only">
                    <button onClick={() => gallery.current?.click()}>
                      Change
                    </button>
                    <button
                      onClick={() => {
                        photoVersion.current++;
                        setPhoto("");
                      }}
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
              <div className="ack-fields">
                {fields.map(([key, label, max]) => (
                  <div className="ack-row" key={key}>
                    <label htmlFor={preview ? undefined : `ack-${key}`}>
                      {label}
                    </label>
                    <span>:</span>
                    <div>{edit(key, label, max)}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="ack-signs">
              <div>
                <UserRound size={13} /> Member Signature
              </div>
              <div>
                <UserRound size={13} /> BM Signature
              </div>
            </div>
            <footer className="ack-foot">
              <span>Thank you for your trust and support.</span>
            </footer>
          </article>
        </div>
      </div>
      <div ref={batch} className="ack-batch" />
      <div className="ack-bottom ack-screen-only">
        <button onClick={() => setPreview(!preview)}>
          {preview ? "Edit slip" : "Preview"}
        </button>
        <button onClick={() => camera.current?.click()}>Take a photo</button>
        <span>
          Closing date = creation date + dues ×{" "}
          {values.frequency === "Biweekly" ? 14 : 7} days. Download before
          leaving; entries are not saved.
        </span>
      </div>
    </>
  );
}
