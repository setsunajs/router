import minimist from "minimist"
import chalk from "chalk"
import { build as _build } from "esbuild"
import { rm } from "node:fs/promises"
import { execa } from "execa"
import { Extractor, ExtractorConfig } from "@microsoft/api-extractor"
import { print, success, resolve } from "./helper.js"

const { mod = "prod" } = minimist(process.argv.slice(2))
const PROD = mod === "prod"

async function build() {
  print("pre build...")
  await rm(resolve("./dist"), {
    recursive: true,
    force: true
  })
  success("pre build success")

  print("start code build...")
  const formats = ["esm", "iife", "cjs"]
  const working = []

  formats.forEach(format => {
    working.push(_build(createConfig({ format, prod: false })))
  })

  if (PROD) {
    formats.forEach(format => {
      working.push(_build(createConfig({ format, prod: true })))
    })
  }

  await Promise.all(working)
  success("code build success")

  print("start type build...")
  await buildType()
  success("type build success")
}

function createConfig({ format, prod }) {
  return {
    outfile: `./dist/router${resolveFormatExt({ format, prod })}`,
    entryPoints: [resolve("./src/main.ts")],
    bundle: true,
    platform: "browser",
    allowOverwrite: true,
    charset: "utf8",
    incremental: false,
    format,
    minify: prod,
    target: "es2017",
    treeShaking: true,
    external: ["setsuna", "@setsunajs/observable"]
  }
}

function resolveFormatExt({ format, prod }) {
  let ext = "_.js"

  if (format === "cjs") {
    ext = "_.cjs"
  }

  if (format === "iife") {
    ext = ".global_.js"
  }

  return ext.replace("_", prod ? ".prod" : "")
}

async function buildType() {
  const temp = resolve("./dist/temp")
  await execa("tsc", ["-p", "./tsconfig.prod.json"], {
    stdio: "inherit"
  })

  const extractorConfig = ExtractorConfig.loadFileAndPrepare(
    resolve("./api-extractor.json")
  )
  const extractorResult = Extractor.invoke(extractorConfig, {
    localBuild: true,
    showVerboseMessages: true
  })
  if (!extractorResult.succeeded) {
    throw "merge router.d.ts failed"
  }

  await rm(temp, { force: true, recursive: true })
}

build()
  .catch(err => {
    console.log()
    console.log()
    console.clear()
    console.log(chalk.red(`build failed: \n\n`), err)
    console.log()
  })
  .finally(() => process.exit(0))
