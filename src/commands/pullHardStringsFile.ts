import { commands, window } from 'vscode'
import { ExtensionModule } from '~/modules'
import { Commands } from '~/commands'
import { Log } from '~/utils/Log'

export const PullHardStringsFile = () => {
  Log.info('开始拉取文件。。。。')
  try {
    const scriptPath = 'scripts/i18n/download-i18n.js' // 脚本文件路径
    const terminal = window.createTerminal()
    const command = `node ${scriptPath}`

    terminal.sendText(command)
    terminal.show()
  }
  catch (e) {
    Log.error('执行拉取命令失败')
  }
}

export default <ExtensionModule> function m() {
  return [
    commands.registerCommand(
      Commands.pull_hard_strings_file,
      PullHardStringsFile,
    ),
  ]
}
