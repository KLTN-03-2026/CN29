import React, { useEffect, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { ChevronDown, Download, FileDown, Save } from 'lucide-react';
import Preview from './Preview';
import SectionList from './SectionList';
import { useCVStore } from '../store/useCVStore';
import { SECTION_OPTIONS, type SectionType } from '../types/cv';

const downloadJsonFile = (filename: string, payload: unknown) => {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(url);
};

const CVEditor: React.FC = () => {
  const [sectionMenuOpen, setSectionMenuOpen] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const previewCaptureRef = useRef<HTMLDivElement>(null);
  const sectionMenuRef = useRef<HTMLDivElement>(null);

  const addSection = useCVStore((state) => state.addSection);
  const saveToLocalStorage = useCVStore((state) => state.saveToLocalStorage);
  const loadFromLocalStorage = useCVStore((state) => state.loadFromLocalStorage);
  const getCVData = useCVStore((state) => state.getCVData);

  useEffect(() => {
    loadFromLocalStorage();
  }, [loadFromLocalStorage]);

  useEffect(() => {
    if (!sectionMenuOpen) return undefined;

    const onClickOutside = (event: MouseEvent) => {
      if (!sectionMenuRef.current) return;
      if (sectionMenuRef.current.contains(event.target as Node)) return;
      setSectionMenuOpen(false);
    };

    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [sectionMenuOpen]);

  const handleAddSection = (type: SectionType) => {
    addSection(type);
    setSectionMenuOpen(false);
  };

  const handleSaveCv = () => {
    const payload = getCVData();
    saveToLocalStorage();
    downloadJsonFile('cv-data.json', payload);
  };

  const handleExportPdf = async () => {
    const target = previewCaptureRef.current?.querySelector('#cv-preview-paper') as HTMLElement | null;
    if (!target || isExportingPdf) return;

    setIsExportingPdf(true);

    try {
      const canvas = await html2canvas(target, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });

      const imageData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const imageWidth = pageWidth;
      const imageHeight = (canvas.height * imageWidth) / canvas.width;

      let heightLeft = imageHeight;
      let position = 0;

      pdf.addImage(imageData, 'PNG', 0, position, imageWidth, imageHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imageHeight;
        pdf.addPage();
        pdf.addImage(imageData, 'PNG', 0, position, imageWidth, imageHeight);
        heightLeft -= pageHeight;
      }

      pdf.save('cv-preview.pdf');
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-5 md:px-6">
      <div className="mx-auto max-w-[1680px]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div>
            <h1 className="text-lg font-bold text-slate-800 md:text-xl">CV / Resume Editor - TopCV Style</h1>
            <p className="text-sm text-slate-500">Live preview bên trái, điều khiển section bên phải.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative" ref={sectionMenuRef}>
              <button
                type="button"
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 text-sm font-semibold text-blue-600 transition hover:bg-blue-100"
                onClick={() => setSectionMenuOpen((prev) => !prev)}
              >
                + Thêm
                <ChevronDown size={16} className={sectionMenuOpen ? 'rotate-180 transition' : 'transition'} />
              </button>

              {sectionMenuOpen && (
                <div className="absolute right-0 z-20 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
                  {SECTION_OPTIONS.map((option) => (
                    <button
                      key={option.type}
                      type="button"
                      className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                      onClick={() => handleAddSection(option.type)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 text-sm font-semibold text-green-700 transition hover:bg-green-100"
              onClick={handleSaveCv}
            >
              <Save size={16} />
              Lưu CV
            </button>

            <button
              type="button"
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
              onClick={handleExportPdf}
              disabled={isExportingPdf}
            >
              {isExportingPdf ? <Download size={16} className="animate-pulse" /> : <FileDown size={16} />}
              {isExportingPdf ? 'Đang xuất PDF...' : 'Xuất PDF'}
            </button>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[3fr_2fr]">
          <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="mb-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-blue-600">
              Live Preview (A4)
            </div>
            <Preview containerRef={previewCaptureRef} />
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
              Danh sách section
            </div>
            <div className="max-h-[calc(100vh-190px)] overflow-y-auto pr-1">
              <SectionList />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default CVEditor;
