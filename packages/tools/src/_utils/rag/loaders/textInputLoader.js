import { BaseDocumentLoader } from '@langchain/core/document_loaders/base';
import { Document as BaseDocument } from 'langchain/document';

class TextInputLoader extends BaseDocumentLoader {
  constructor(text, metadata = {}) {
    super();
    this.text = text;
    this.metadata = metadata;
  }

  async load() {
    const document = new BaseDocument({
      pageContent: this.text,
      metadata: this.metadata,
    });
    return [document];
  }
}

export { TextInputLoader };
