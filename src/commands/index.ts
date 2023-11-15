import { flatten } from 'lodash'
import configLocales from './configLocalePaths'
import configLanguages from './configLanguages'
import keyManipulations from './keyManipulations'
import extractText from './extractString'
import detectHardStrings from './detectHardStrings'
import help from './help'
import account from './account'
import refreshUsageReport from './refreshUsageReport'
import editor from './openEditor'
import review from './review'
import deepl from './deepl'
import gotoRange from './gotoRange'
import gotoNextUsage from './gotoNextUsage'
import batchHardStringsExtract from './extractStringBulk'
import batchDetectHardStrings from './detectHardStringsBulk'
import pullHardStringsFile from './pullHardStringsFile'
import { ExtensionModule } from '~/modules'

const m: ExtensionModule = (ctx) => {
  return flatten([
    account(ctx),
    configLocales(ctx),
    configLanguages(ctx),
    keyManipulations(ctx),
    extractText(ctx),
    detectHardStrings(ctx),
    batchDetectHardStrings(ctx),
    batchHardStringsExtract(ctx),
    pullHardStringsFile(ctx),
    help(ctx),
    refreshUsageReport(ctx),
    editor(ctx),
    review(ctx),
    deepl(ctx),
    gotoRange(ctx),
    gotoNextUsage(ctx),
  ])
}

export * from './commands'

export default m
