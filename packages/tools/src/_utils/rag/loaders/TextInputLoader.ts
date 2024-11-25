import { BaseDocumentLoader } from '@langchain/core/document_loaders/base';
import { Document } from 'langchain/document';

interface Metadata {
  [key: string]: any;
}

class TextInputLoader extends BaseDocumentLoader {
  private text: string;
  private metadata: Metadata;

  constructor(text: string, metadata: Metadata = {}) {
    super();
    this.text = text;
    this.metadata = metadata;
  }

  async load(): Promise<Document[]> {
    const document = new Document({
      pageContent: this.text,
      metadata: this.metadata,
    });
    return [document];
  }
}

export { TextInputLoader };
