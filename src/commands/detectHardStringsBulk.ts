import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { commands, window, workspace } from 'vscode'
import { DetectHardStrings } from './detectHardStrings'
import { ExtensionModule } from '~/modules'
import { Commands } from '~/commands'
import { Log } from '~/utils/Log'

const getSacnResFilePath = () => {
  const rootPath = workspace?.workspaceFolders?.[0].uri.fsPath || ''
  return path.join(rootPath || '', 'chineseTextData.txt')
}

async function findChineseTextInFile(filePath: string) {
  try {
    const document = await workspace.openTextDocument(filePath)
    const reslut = await DetectHardStrings(document)
    const sacnFilePath = getSacnResFilePath()
    const rootPath = workspace?.workspaceFolders?.[0].uri.fsPath || ''

    if (reslut && reslut.length) {
      fs.appendFileSync(
        sacnFilePath,
        filePath.replace(`${rootPath}/`, ''),
        'utf-8',
      )
      fs.appendFileSync(sacnFilePath, '\n', 'utf-8') // 每次写入之前添加换行符
      reslut.forEach((item: any) => {
        let line
        const { document, start, end, text } = item || {}
        try {
          const startLine = document.positionAt(start).line + 1
          const endLine = document.positionAt(end).line + 1
          line = startLine !== undefined ? String(startLine) : ''
          if (endLine !== undefined && startLine !== endLine)
            line += `-${endLine}`
        }
        catch (e) {}
        fs.appendFileSync(sacnFilePath, `   [${line}:] ${text.trim()}`, 'utf-8')
        fs.appendFileSync(sacnFilePath, '\n', 'utf-8') // 每次写入之前添加换行符
      })
    }
  }
  catch (e) {
    Log.info(`findChineseTextInFile Error: ${filePath}`, 1)
  }
}

async function findChineseTextInFolder(folderPath: string) {
  const files = fs.readdirSync(folderPath)
  for (const file of files) {
    const filePath = path.join(folderPath, file)
    if (fs.statSync(filePath).isFile()) {
      const extname = path.extname(file)
      if (['.vue', '.ts', '.js'].includes(extname))
        await findChineseTextInFile(filePath)
    }
    else {
      if (['node_modules'].includes(file)) Log.info(`Folder 忽略: ${file}`, 2)
      else await findChineseTextInFolder(filePath)
    }
  }
}

export async function DetectHardStringsBulk(uri: any) {
  Log.info('DetectHardStringsBulk start:')

  const sacnFilePath = getSacnResFilePath()
  // 处理选中文件或文件夹的情况
  if (uri && fs.existsSync(uri.fsPath)) {
    fs.writeFileSync(sacnFilePath, `Scan File Path:${uri.fsPath} \n`, 'utf-8')
    fs.appendFileSync(sacnFilePath, 'Status: Scanning...\n \n', 'utf-8')
    Log.info(`扫描文件路径: ${uri.fsPath}`)
    fs.appendFileSync(
      sacnFilePath,
      '========================================== \n\n',
      'utf-8',
    ) // 每次写入之前添加换行符
    const doc = await workspace.openTextDocument(sacnFilePath)
    await window.showTextDocument(doc)
    if (fs.statSync(uri.fsPath).isDirectory())
      await findChineseTextInFolder(uri.fsPath)
    else await findChineseTextInFile(uri.fsPath)

    // 读取原始文件内容
    const originalContent = fs.readFileSync(sacnFilePath, 'utf-8')
    // 将新的内容插入到第二行
    const lines = originalContent.split(os.EOL)
    lines[1] = 'Status: Scan Done'
    const updatedContent = lines.join(os.EOL)

    // 将更新后的内容写入文件
    fs.writeFileSync(sacnFilePath, updatedContent, 'utf-8')
    Log.info('扫描完成')
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
