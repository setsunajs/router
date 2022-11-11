import semver from "semver"
import minimist from "minimist"
import { print, success, error, resolvePackage, resolve } from "./helper.js"
import inquirer from "inquirer"
import chalk from "chalk"
import { execa } from "execa"
import { writeFile } from "fs/promises"

const { tag } = minimist(process.argv.slice(2))

async function release() {
  console.clear()

  print("check npm logged...")
  await execa("npm", ["whoami"]).catch(() => {
    throw "please login npm."
  })
  success("npm logged in")

  const packages = await resolvePackage()
  const { version } = packages
  const preId = semver.prerelease(version)
  const versionIncType = ["patch", "minor", "major"].concat(
    preId ? ["prepatch", "preminor", "premajor", "prerelease"] : []
  )

  const { release } = await inquirer.prompt([
    {
      type: "list",
      name: "release",
      message: chalk.yellow(
        `Select the version to publish version (current version (${version}))`
      ),
      choices: versionIncType
        .map(
          type =>
            `${type}--(${semver.inc(version, type, preId && preId.join("."))})`
        )
        .concat("custom")
    }
  ])

  let useVersion = ""
  if (release === "custom") {
    const res = await inquirer.prompt([
      {
        type: "input",
        name: "version",
        message: chalk.yellow("Please enter the version number")
      }
    ])
    useVersion = res.version
  } else {
    useVersion = release.match(/[a-z--]+\((.*?)\)/)[1]
  }

  if (!semver.valid(useVersion)) {
    throw `release version(${useVersion}) is invalid`
  }

  success(`release version ${useVersion}`)

  await invokBuild()

  print(`writing new version(${useVersion})...`)
  packages.version = useVersion
  await writeFile(
    resolve("./package.json"),
    JSON.stringify(packages, null, 2),
    "utf-8"
  )
  success("write success")

  print("publishing...")
  // await execa("npm", [
  //   "publish",
  //   "--access",
  //   "public",
  //   ...[preId ? ["--tag", preId[0]] : []]
  // ])
  success("publish success")

  print("git commit...")
  // await execa("git", "add", ".")
  // await execa("git", "commit", "-m", `release version ${useVersion}`)
  success("git commit success")
}

async function invokBuild() {
  return execa("node", [resolve("./scripts/build.js"), "--mod", "prod"], {
    stdio: "inherit"
  })
}

release()
  .catch(err => {
    console.clear()
    error("scripts release failed")
    error(err)
  })
  .finally(() => process.exit(0))
