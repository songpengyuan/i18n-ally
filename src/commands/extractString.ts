import { relative } from 'path'
import {
  commands,
  window,
  // QuickPickItem,
  Range,
  TextDocument,
  // TextEditor,
} from 'vscode'
import { trim } from 'lodash'
// import { overrideConfirm } from './overrideConfirm'
import { Commands } from './commands'
// import { keypathValidate, Log, promptTemplates } from '~/utils'
import { Log } from '~/utils'
import { ExtensionModule } from '~/modules'
import {
  extractHardStrings,
  generateKeyFromText,
  Config,
  CurrentFile,
  DetectionResult,
  Telemetry,
  TelemetryKey,
} from '~/core'
import i18n from '~/i18n'

import { parseHardString } from '~/extraction/parseHardString'

// interface QuickPickItemWithKey extends QuickPickItem {
//   keypath: string
//   type: 'tree' | 'node' | 'new' | 'existed'
// }

export interface ExtractTextOptions {
  text: string
  rawText?: string
  args?: string[]
  range: Range
  isDynamic?: boolean
  document: TextDocument
  isInsert?: boolean
}

async function ExtractOrInsertCommnad(
  options?: ExtractTextOptions,
  detection?: DetectionResult,
) {
  Log.warn('ExtractOrInsertCommnad start')
  Telemetry.track(TelemetryKey.ExtractString)

  if (Config.readonly) {
    Log.warn(i18n.t('errors.write_in_readonly_mode'), true)
    return
  }

  if (!options) {
    // execute from command palette, get from active document
    const editor = window.activeTextEditor
    const currentDoc = editor?.document
    if (!editor || !currentDoc) return

    options = {
      text: '',
      rawText: trim(currentDoc.getText(editor.selection), '\'"` '),
      range: editor.selection,
      document: currentDoc,
      isInsert: editor.selection.start.isEqual(editor.selection.end),
    }
  }

  const locale = Config.sourceLanguage
  // const loader = CurrentFile.loader

  if (options.rawText && !options.text) {
    const result = parseHardString(
      options.rawText,
      options.document?.languageId,
      options.isDynamic,
    )
    options.text = result?.text || ''
    options.args = result?.args
  }

  // const { text, rawText, range,  document,args, isInsert } = options
  const { text, rawText, range, document } = options
  const filepath = document.uri.fsPath

  const isReplaceLoading = Config.ctx.globalState.get('isReplaceLoading')
  Log.info(`isReplaceLoading: ${isReplaceLoading} --${typeof isReplaceLoading}`)
  if (isReplaceLoading) {
    const msgButton = '取消'
    const result = await window.showErrorMessage(
      '翻译当前文件处理中，请稍后再试',
      msgButton,
    )
    if (result === msgButton)
      Config.ctx.globalState.update('isReplaceLoading', false)

    Log.info('翻译当前文件处理中，请稍后再试', 1)
    return
  }
  Config.ctx.globalState.update('isReplaceLoading', true)

  const key = await generateKeyFromText(rawText || text, filepath)
  const writeKeypath = CurrentFile.loader.rewriteKeys(key, 'write', { locale })

  Config.ctx.globalState.update('isReplaceLoading', false)

  window
    .showQuickPick(
      [`{{ $t('${key}') }}`, `i18n.t('${key}')`, `$t('${key}')`, `${key}`],
      {
        placeHolder: '选择要替换的内容',
      },
    )
    .then((replacer) => {
      if (replacer) {
        // extractHardStrings()
        extractHardStrings(document, [
          {
            range,
            replaceTo: replacer,
            keypath: writeKeypath,
            message: text,
            locale,
          },
        ])
      }
    })
  Config.ctx.globalState.update('isReplaceLoading', false)
}

function ExtractIngore(text: string, document?: TextDocument) {
  if (document) {
    const path = relative(Config.root, document.uri.fsPath)
    const obj = Config.extractIgnoredByFiles
    if (!obj[path]) obj[path] = []
    obj[path].push(text)
    Config.extractIgnoredByFiles = obj
  }
  else {
    Config.extractIgnored = [...Config.extractIgnored, text]
  }

  CurrentFile.detectHardStrings(true)
}

const m: ExtensionModule = () => {
  return [
    commands.registerCommand(Commands.extract_text, ExtractOrInsertCommnad),
    commands.registerCommand(Commands.extract_ignore, ExtractIngore),
    commands.registerCommand(Commands.extract_enable_auto_detect, () => {
      Config.extractAutoDetect = true
    }),
    commands.registerCommand(Commands.extract_disable_auto_detect, () => {
      Config.extractAutoDetect = false
    }),
  ]
}

export default m
