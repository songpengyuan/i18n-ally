import { commands, TextDocument, Uri, window, workspace } from 'vscode'
import { notNullish } from '@antfu/utils'
import fs from 'fs-extra'
import { DetectHardStrings } from './detectHardStrings'
import { ExtensionModule } from '~/modules'
import { Commands } from '~/commands'
import { extractHardStrings, generateKeyFromText } from '~/core/Extract'
import { Config, Global } from '~/core'
import { parseHardString } from '~/extraction/parseHardString'
import { DetectionResultToExtraction } from '~/editor/extract'
import { Log } from '~/utils'
import { gitignoredGlob } from '~/utils/glob'
import { ActionSource, Telemetry, TelemetryKey } from '~/core/Telemetry'

export async function BatchHardStringExtraction(args: any, ctx: any) {
  const documents: (TextDocument | undefined)[] = []
  let actionSource: ActionSource

  Log.info(ctx)
  const GLOBAL_STATE_LOGIN_USER_NAME = 'LOGIN_USER_NAME'

  const username = ctx.globalState.get(GLOBAL_STATE_LOGIN_USER_NAME)
  if (!username) {
    Log.error('需要先登录在使用')
    commands.executeCommand('okki-i18n.login').then(
      () => {
        Log.info('触发登录命令执行成功')
      },
      () => {
        Log.info('触发登录命令失败')
      },
    )
    return
  }

  // call from file explorer context
  if (args.length >= 2 && Array.isArray(args[1])) {
    actionSource = ActionSource.ContextMenu
    const map = new Map<string, Uri>()

    for (const uri of args[1]) {
      // folder, scan glob
      if (fs.lstatSync(uri.fsPath).isDirectory()) {
        const files = await gitignoredGlob('**/*.*', uri.fsPath)

        files.forEach((f) => {
          if (!map.has(f)) map.set(f, Uri.file(f))
        })
      }
      // file, append to the map
      else {
        map.set(uri.fsPath, uri)
      }
    }

    const files = [...map.values()]

    documents.push(
      ...(await Promise.all(files.map(i => workspace.openTextDocument(i)))),
    )
  }
  // call from command pattale
  else {
    actionSource = ActionSource.CommandPattele
    documents.push(window.activeTextEditor?.document)
  }

  Telemetry.track(TelemetryKey.ExtractStringBulk, {
    source: actionSource,
    files: documents.length,
  })

  Log.info('📤 Bulk extracting')
  Log.info(documents.map(i => `  ${i?.uri.fsPath}`).join('\n'))
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
  for (const document of documents) {
    if (!document) continue

    try {
      const result = await DetectHardStrings(document, false)
      Log.info(`📤 Extracting [${result?.length || 0}] ${document.uri.fsPath}`)
      if (!result) continue

      const usedKeys: string[] = []

      const processedResults = await Promise.all(
        result.map(async(i) => {
          const isReplaceLoading = Config.ctx.globalState.get(
            'isReplaceLoading',
          )
          if (!isReplaceLoading) {
            Log.warn('操作被人为停止了')
            return
          }
          const options = DetectionResultToExtraction(i, document)

          if (options.rawText && !options.text) {
            const result = parseHardString(
              options.rawText,
              options.document.languageId,
              options.isDynamic,
            )
            options.text = result?.text || ''
            options.args = result?.args
          }

          const { rawText, text, range, args } = options
          const filepath = document.uri.fsPath
          const keypath = await generateKeyFromText(
            rawText || text,
            filepath,
            true,
            usedKeys,
          )
          const templates = Global.interpretRefactorTemplates(
            keypath,
            args,
            document,
            i,
          ).filter(Boolean)

          if (!templates.length) {
            Log.warn(
              `No refactor template found for "${keypath}" in "${filepath}"`,
            )
            return undefined
          }

          usedKeys.push(keypath)

          Log.info(`🥦 Repalce: ${text} ---> ${templates[0]}  ${filepath}`, 1)
          return {
            range,
            replaceTo: templates[0],
            keypath,
            message: text,
            locale: Config.displayLanguage,
          }
        }),
      )

      const filteredResults = processedResults.filter(notNullish)
      await extractHardStrings(document, filteredResults, true)
      Config.ctx.globalState.update('isReplaceLoading', false)
    }
    catch (e) {
      Config.ctx.globalState.update('isReplaceLoading', false)
      Log.error(`Failed to extract ${document.fileName}`)
      Log.error(e, false)
    }
    await window.showInformationMessage(
      '翻译当前文件(Beta)完成',
    )
  }
}

const m: ExtensionModule = (ctx) => {
  return [
    commands.registerCommand(
      Commands.extract_hard_strings_batch,
      async(...args: any[]) => {
        BatchHardStringExtraction(args || [], ctx)
      },
    ),
  ]
}

export default m
