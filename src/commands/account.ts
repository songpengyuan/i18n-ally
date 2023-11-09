import vscode, { commands } from 'vscode'
import axios from 'axios'
import { Config } from '../extension'
import { ExtensionModule } from '~/modules'
import { Commands } from '~/commands'
import { Log } from '~/utils/Log'
const GLOBAL_STATE_LOGIN_USER_NAME = 'LOGIN_USER_NAME'

class TapdLogin {
  private loginApi = 'https://ezreal.dev.xiaoman.cn/api/auth/login'
  private username = ''
  private password = ''
  private context: vscode.ExtensionContext

  constructor(context: vscode.ExtensionContext) {
    this.context = context
  }

  private handleLogin() {
    const params = {
      username: this.username.trim() || '',
      password: this.password.trim() || '',
    }

    Log.info(
      `login: username/password: ${params.username}/${'*'.repeat(
        params.password.length,
      )}`,
      1,
    )
    Log.info(`login: loginApi: ${this.loginApi}`, 1)
    axios
      .post(this.loginApi, params)
      .then((res: any) => {
        if (res.data && res.data.data && res.data.data.accessToken) {
          const { globalState } = this.context
          globalState.update(GLOBAL_STATE_LOGIN_USER_NAME, params.username)
          Log.info(`✅登录成功: ${params.username}`, 1)
          vscode.window.showInformationMessage(
            `✅ ${params.username} 登录成功 `,
          )
        }
        else {
          Log.error(res.data.message || '🔔 登录失败')
        }
      })
      .catch((err) => {
        Log.error(err)
      })
  }

  private createUsernameInput() {
    const inputBox = vscode.window.createInputBox()
    inputBox.title = '使用小满账号登录(小满邮箱@前的名字)'
    inputBox.placeholder = '请输入账号'

    inputBox.onDidAccept(() => {
      if (!inputBox.value) return
      this.username = inputBox.value
      inputBox.hide()
      Log.info(`username: ${this.username}`, 1)
      this.createPasswordInput()
    })
    inputBox.show()
  }

  private createPasswordInput() {
    const inputBox = vscode.window.createInputBox()
    inputBox.title = '使用EZ账号登录'
    inputBox.placeholder = '请输入密码'
    inputBox.password = true

    inputBox.onDidAccept(() => {
      if (!inputBox.value) return
      this.password = inputBox.value.trim()
      inputBox.hide()
      this.handleLogin()
    })
    inputBox.show()
  }

  public init() {
    const { globalState } = this.context

    const username: string = globalState.get(GLOBAL_STATE_LOGIN_USER_NAME) || ''
    if (username) {
      this.logout(username)
      return
    }

    this.createUsernameInput()

    globalState.update(GLOBAL_STATE_LOGIN_USER_NAME, '')
  }

  public async logout(username: string) {
    const result = await vscode.window.showInformationMessage(
      `确定退出登录 ${username}吗？`,
      '确定',
      '取消',
    )
    if (result === '确定') {
      this.context.globalState.update(GLOBAL_STATE_LOGIN_USER_NAME, '')
      vscode.window.showInformationMessage(`🔔  已退出登录 ${username}`)
    }
  }
}

export default <ExtensionModule> function(ctx) {
  return [
    commands.registerCommand(Commands.login, async() => {
      Log.info('登录: ')
      Log.info(`Config-loginApi: ${Config.loginApi}`, 1)
      const tapdLogin = new TapdLogin(ctx)
      tapdLogin.init()
    }),
  ]
}
