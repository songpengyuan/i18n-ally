import { TextDocument, window } from 'vscode'
import axios from 'axios'
// import { Config, Global } from '../extension'
import { Config } from '../extension'
import { ExtractInfo } from './types'
import { CurrentFile } from './CurrentFile'
import { Log } from '~/utils'

// export const i18nReplaceAPI = "https://ezreal.dev.xiaoman.cn/api/i18ns/vscode";

export async function generateKeyFromText(
  text: string,
  filepath?: string,
  reuseExisting = false,
  usedKeys: Array<string> = [],
): Promise<string> {
  const i18nReplaceApi
    = Config.i18nReplaceApi || 'http://localhost:9010/api/i18ns/vscode' || ''

  const GLOBAL_STATE_LOGIN_USER_NAME = 'LOGIN_USER_NAME'

  const username = Config.ctx.globalState.get(GLOBAL_STATE_LOGIN_USER_NAME)

  if (!username) {
    Log.error('请登录后重试')
    return ''
  }

  if (!i18nReplaceApi) {
    Log.error('没有获取到 i18nReplaceApi')
    return ''
  }
  let textKey: string | undefined
  const data = {
    'zh-CN': text,
    'zh-TW': '',
    'en': '',
    'desc': `vscode: ${filepath}`,
    'platform': ['galio'],
    'app': ['galio'],
    'version': '0.0.1',
    'username': username,
  }

  try {
    const response = await axios.post(i18nReplaceApi, data)
    const { app = [], key = '' } = response.data.data || {}
    textKey = app.includes('galio') ? `${key}` : `${app?.[0]}.${key}`
  }
  catch (e) {
    Log.error(e)
  }
  return textKey || ''
}

export async function extractHardStrings(
  document: TextDocument,
  extracts: ExtractInfo[],
  saveFile = false,
) {
  if (!extracts.length) return

  const editor = await window.showTextDocument(document)
  const filepath = document.uri.fsPath
  const sourceLanguage = Config.sourceLanguage

  extracts.sort((a, b) => b.range.start.compareTo(a.range.start))

  // replace
  await editor.edit((editBuilder) => {
    for (const extract of extracts)
      editBuilder.replace(extract.range, extract.replaceTo)
  })

  // save keys
  await CurrentFile.loader.write(
    extracts
      .filter(i => i.keypath != null && i.message != null)
      .map(e => ({
        textFromPath: filepath,
        filepath: undefined,
        keypath: e.keypath!,
        value: e.message!,
        locale: e.locale || sourceLanguage,
      })),
  )

  if (saveFile) await document.save()

  CurrentFile.invalidate()
}
