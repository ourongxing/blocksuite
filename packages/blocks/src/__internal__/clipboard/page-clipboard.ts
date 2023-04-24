import type { Page } from '@blocksuite/store';
import { assertExists } from '@blocksuite/store';

import { getService } from '../../__internal__/service.js';
import { deleteModelsByRange } from '../../page-block/index.js';
import { getCurrentBlockRange } from '../utils/index.js';
import type { Clipboard } from './type.js';
import {
  clipboardData2Blocks,
  copyBlocks,
  normalizePasteBlocks,
} from './utils/commons.js';

// TODO: getCurrentBlockRange can not get embed block when selection is native, so clipboard can not copy embed block

export class PageClipboard implements Clipboard {
  _page!: Page;

  init(page: Page) {
    this._page = page;
    document.body.addEventListener('cut', this._onCut);
    document.body.addEventListener('copy', this._onCopy);
    document.body.addEventListener('paste', this._onPaste);
  }

  dispose() {
    document.body.removeEventListener('cut', this._onCut);
    document.body.removeEventListener('copy', this._onCopy);
    document.body.removeEventListener('paste', this._onPaste);
  }

  private _onPaste = async (e: ClipboardEvent) => {
    const range = getCurrentBlockRange(this._page);
    if (!e.clipboardData || !range) {
      return;
    }
    e.preventDefault();

    const blocks = await clipboardData2Blocks(this._page, e.clipboardData);
    const normalizedBlocks = normalizePasteBlocks(this._page, blocks);

    if (!normalizedBlocks.length) {
      return;
    }
    this._page.captureSync();

    deleteModelsByRange(this._page, range);

    const focusedBlockModel = range?.models[0];
    assertExists(focusedBlockModel);
    const service = getService(focusedBlockModel.flavour);
    assertExists(range);
    await service.json2Block(focusedBlockModel, normalizedBlocks, range);

    this._page.captureSync();
  };

  private _onCopy = (
    e: ClipboardEvent,
    range = getCurrentBlockRange(this._page)
  ) => {
    if (!range) {
      return;
    }
    e.preventDefault();
    this._page.captureSync();

    copyBlocks(range);

    this._page.captureSync();
  };

  private _onCut = (e: ClipboardEvent) => {
    const range = getCurrentBlockRange(this._page);
    if (!range) {
      return;
    }
    e.preventDefault();
    this._onCopy(e, range);
    deleteModelsByRange(this._page, range);
  };
}
