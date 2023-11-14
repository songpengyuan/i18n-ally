// import { relative } from 'path'
import * as fs from 'fs'
import * as path from 'path'
import { commands, window, workspace } from 'vscode'
import { DetectHardStrings } from './detectHardStrings'
import { ExtensionModule } from '~/modules'
import { Commands } from '~/commands'
import { Log } from '~/utils/Log'

const getSacnFilePath = () => {
  const rootPath = workspace?.workspaceFolders?.[0].uri.fsPath || ''
  return path.join(rootPath || '', 'chineseTextData.txt')
}

async function findChineseTextInFile(filePath: string) {
  try {
    const document = await workspace.openTextDocument(filePath)
    const reslut = await DetectHardStrings(document)
    const sacnFilePath = getSacnFilePath()
    const rootPath = workspace?.workspaceFolders?.[0].uri.fsPath || ''

    if (reslut && reslut.length) {
      fs.appendFileSync(sacnFilePath, filePath.replace(rootPath, ''), 'utf-8')
      fs.appendFileSync(sacnFilePath, '\n', 'utf-8') // 每次写入之前添加换行符
      reslut.forEach((item: any) => {
        let line
        const { document, start, end, text } = item || {}
        try {
          const startLine = document?.lineAt?.(start)?.lineNumber
          const endLine = document?.lineAt?.(end)?.lineNumber
          line = startLine || endLine || ''
        }
        catch (e) {}
        fs.appendFileSync(
          sacnFilePath,
          `   [${line ? line + 1 : ''}:] ${text.trim()}`,
          'utf-8',
        )
        fs.appendFileSync(sacnFilePath, '\n', 'utf-8') // 每次写入之前添加换行符
      })
    }
  }
  catch (e) {
    Log.error(e)
  }
}

function findChineseTextInFolder(folderPath: string) {
  const files = fs.readdirSync(folderPath)
  files.forEach((file) => {
    const filePath = path.join(folderPath, file)
    if (fs.statSync(filePath).isFile()) {
      if (path.extname(file) === '.vue') findChineseTextInFile(filePath)
    }
    else {
      Log.info(`Folder: ${file}`, 1)
      findChineseTextInFolder(filePath)
    }
  })
}

export async function DetectHardStringsBulk(uri: any) {
  const sacnFilePath = getSacnFilePath()
  // 处理选中文件或文件夹的情况
  if (uri && fs.existsSync(uri.fsPath)) {
    fs.writeFileSync(sacnFilePath, `【扫描文件路径】${uri.fsPath}`, 'utf-8')
    fs.appendFileSync(sacnFilePath, '\n', 'utf-8') // 每次写入之前添加换行符
    fs.appendFileSync(sacnFilePath, '\n', 'utf-8') // 每次写入之前添加换行符
    fs.appendFileSync(sacnFilePath, '\n', 'utf-8') // 每次写入之前添加换行符
    const doc = await workspace.openTextDocument(sacnFilePath)
    await window.showTextDocument(doc)
    if (fs.statSync(uri.fsPath).isDirectory())
      findChineseTextInFolder(uri.fsPath)
    else findChineseTextInFile(uri.fsPath)
  }
  else {
    window.showErrorMessage('Invalid file or directory')
  }
}

export default <ExtensionModule> function m() {
  return [
    commands.registerCommand(
      Commands.detect_hard_strings_batch,
      DetectHardStringsBulk,
    ),
  ]
}
