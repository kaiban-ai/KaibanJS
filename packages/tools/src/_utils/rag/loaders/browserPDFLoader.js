import { BaseDocumentLoader } from '@langchain/core/document_loaders/base';
import { Document as BaseDocument } from 'langchain/document';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';

GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.8.69/pdf.worker.min.mjs';

class BrowserPDFLoader extends BaseDocumentLoader {
  constructor(file, metadata = {}) {
    super();
    this.file = file;
    this.metadata = metadata;
  }

  async load() {
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
      const fileReader = new FileReader();

      const fileReaderPromise = new Promise((resolve, reject) => {
        fileReader.onload = () => {
          resolve(new Uint8Array(fileReader.result));
        };
        fileReader.onerror = (error) => {
          reject(error);
        };
      });

      fileReader.readAsArrayBuffer(this.file);

      const typedArray = await fileReaderPromise;
      const pdf = await getDocument(typedArray).promise;
      const pagesContent = [];

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
    } catch {
      // console.log('Error loading PDF:', error);
      throw new Error('Error loading PDF.');
    }
  }
}

export { BrowserPDFLoader };
