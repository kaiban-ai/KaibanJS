import { BaseDocumentLoader } from '@langchain/core/document_loaders/base';
import { Document as BaseDocument } from 'langchain/document';

interface PDFMetadata {
  [key: string]: any;
}

interface PDFTextItem {
  str?: string;
  [key: string]: any;
}

interface PDFPage {
  getTextContent(): Promise<{ items: PDFTextItem[] }>;
}

interface PDFDocument {
  numPages: number;
  getPage(pageNum: number): Promise<PDFPage>;
}

interface PDFDocumentProxy {
  promise: Promise<PDFDocument>;
}

interface PDFLib {
  getDocument(data: Uint8Array): PDFDocumentProxy;
  GlobalWorkerOptions: {
    workerSrc: string;
  };
}

export class BrowserPDFLoader extends BaseDocumentLoader {
  private file: string | File;
  private metadata: PDFMetadata;

  constructor(file: string | File, metadata: PDFMetadata = {}) {
    super();
    this.file = file;
    this.metadata = metadata;
  }

  async load(): Promise<BaseDocument[]> {
    if (!this.file) {
      console.log('No file selected.');
      return [];
    }

    if (typeof this.file === 'string') {
      const response = await fetch(this.file);
      const blob = await response.blob();
      this.file = new File([blob], 'file.pdf', { type: 'application/pdf' });
    }

    try {
      const { getDocument, GlobalWorkerOptions } = (await import(
        'pdfjs-dist'
      )) as PDFLib;
      GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.8.69/pdf.worker.min.mjs';

      const fileReader = new FileReader();

      const fileReaderPromise = new Promise<Uint8Array>((resolve, reject) => {
        fileReader.onload = () => {
          resolve(new Uint8Array(fileReader.result as ArrayBuffer));
        };
        fileReader.onerror = (error) => {
          reject(error);
        };
      });

      fileReader.readAsArrayBuffer(this.file as File);

      const typedArray = await fileReaderPromise;
      const pdf = await getDocument(typedArray).promise;
      const pagesContent: string[] = [];

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item) => ('str' in item ? item.str : ''))
          .join(' ');
        pagesContent.push(pageText);
      }

      const documents = pagesContent.map(
        (content, index) =>
          new BaseDocument({
            pageContent: content,
            metadata: { ...this.metadata, page: index + 1 },
          })
      );

      return documents;
    } catch (_error) {
      throw new Error('Error loading PDF.');
    }
  }
}
