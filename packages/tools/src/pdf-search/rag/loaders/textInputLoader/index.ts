import { BaseDocumentLoader } from '@langchain/core/document_loaders/base';
import { Document as BaseDocument } from 'langchain/document';

interface TextInputMetadata {
  [key: string]: any;
}

export class TextInputLoader extends BaseDocumentLoader {
  private text: string;
  private metadata: TextInputMetadata;

  constructor(text: string, metadata: TextInputMetadata = {}) {
    super();
    this.text = text;
    this.metadata = metadata;
  }

  async load(): Promise<BaseDocument[]> {
    const document = new BaseDocument({
      pageContent: this.text,
      metadata: this.metadata,
    });
    return [document];
  }
}
