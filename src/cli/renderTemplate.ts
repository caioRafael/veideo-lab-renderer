import path from 'node:path'
import type { Template, TemplateInput } from '../interfaces/template'
import { loadTemplate, loadTemplateInput } from '../template/loadTemplate'
import { TemplateResolver } from '../template/TemplateResolver'
import { unusedTemplateVariables } from '../template/validateTemplate'
import { parseTemplateArgs } from './parseTemplateArgs'
import { runRender } from './runRender'

async function main(): Promise<void> {
  const cli = parseTemplateArgs(process.argv.slice(2))
  const templatePath = path.resolve(cli.templatePath)
  const template = loadTemplate(templatePath)
  const input = loadCliTemplateInput(cli)
  const composition = new TemplateResolver().resolve(template, input)

  if (cli.level !== 'quiet') {
    console.log(`Template: ${template.name}`)
  }

  if (cli.level !== 'quiet') {
    for (const warning of unusedVariableWarnings(template)) {
      console.warn(warning)
    }
  }

  await runRender({
    composition,
    label: `${template.name} (${path.basename(templatePath)})`,
    level: cli.level,
  })
}

function loadCliTemplateInput(
  cli: ReturnType<typeof parseTemplateArgs>,
): TemplateInput {
  const fileInput =
    cli.inputPath === undefined
      ? { variables: {} }
      : loadTemplateInput(path.resolve(cli.inputPath))

  return {
    variables: {
      ...fileInput.variables,
      ...cli.variables,
    },
  }
}

function unusedVariableWarnings(template: Template): string[] {
  return unusedTemplateVariables(template).map(
    (name) => `Warning: template variable "${name}" is declared but never used`,
  )
}

try {
  await main()
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
}
